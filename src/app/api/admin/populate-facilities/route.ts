/**
 * POST /api/admin/populate-facilities
 * ------------------------------------
 * Uses Google Places API (New) to search for hospitals/clinics
 * in a given city+state and upserts them into the facilities table.
 *
 * Request body:
 *   { city: string; state: string }
 *
 * Returns:
 *   { created: number; skipped: number; facilities: Array }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaceResult {
  id: string; // Google Place ID
  displayName?: { text: string };
  formattedAddress?: string;
  websiteUri?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
}

interface PopulateBody {
  city: string;
  state: string;
  max_results?: number;
}

// ---------------------------------------------------------------------------
// Google Places Text Search (New API)
// ---------------------------------------------------------------------------

async function searchPlaces(
  apiKey: string,
  query: string,
  pageToken?: string
): Promise<{ places: PlaceResult[]; nextPageToken?: string }> {
  const body: Record<string, unknown> = {
    textQuery: query,
    languageCode: "en",
    // Only return hospitals / medical facilities
    includedType: "hospital",
    pageSize: 20,
  };
  if (pageToken) {
    body.pageToken = pageToken;
  }

  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.location,places.types,nextPageToken",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    places: data.places ?? [],
    nextPageToken: data.nextPageToken,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract city from Google's formattedAddress (usually "Name, City, ST ZIP, US") */
function parseCity(address: string): string {
  // Typical format: "123 Main St, Springfield, IL 62701, USA"
  const parts = address.split(",").map((s) => s.trim());
  // City is usually the second-to-last part before "ST ZIP"
  if (parts.length >= 3) {
    return parts[parts.length - 3] ?? "";
  }
  return parts[0] ?? "";
}

/** Extract ZIP from address */
function parseZip(address: string): string {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1] ?? "";
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Auth check — admin only (cookie-based client)
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Service role client for DB writes (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Validate input
  const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";
  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as PopulateBody;
  const { city, state, max_results } = body;

  if (!city || !state || state.length !== 2) {
    return NextResponse.json(
      { error: "city (string) and state (2-letter code) required" },
      { status: 400 }
    );
  }

  const stateUpper = state.toUpperCase();
  const limit = max_results && max_results > 0 ? max_results : 100;

  // 3. Fetch from Google Places — paginate until we hit limit
  const allPlaces: PlaceResult[] = [];
  let nextPageToken: string | undefined;

  // Search for hospitals
  const hospitalQuery = `hospitals in ${city}, ${stateUpper}`;
  let page = 0;

  do {
    const result = await searchPlaces(GOOGLE_API_KEY, hospitalQuery, nextPageToken);
    allPlaces.push(...result.places);
    nextPageToken = result.nextPageToken;
    page++;
  } while (nextPageToken && page < 3 && allPlaces.length < limit);

  // Also search for clinics/medical centers if we haven't hit the limit
  if (allPlaces.length < limit) {
    const clinicQuery = `medical centers and clinics in ${city}, ${stateUpper}`;
    nextPageToken = undefined;
    page = 0;

    do {
      const result = await searchPlaces(GOOGLE_API_KEY, clinicQuery, nextPageToken);
      allPlaces.push(...result.places);
      nextPageToken = result.nextPageToken;
      page++;
    } while (nextPageToken && page < 2 && allPlaces.length < limit);
  }

  // Deduplicate by Google Place ID, then cap at limit
  const uniquePlaces = new Map<string, PlaceResult>();
  for (const p of allPlaces) {
    if (p.id && !uniquePlaces.has(p.id)) {
      if (uniquePlaces.size >= limit) break;
      uniquePlaces.set(p.id, p);
    }
  }

  // 4. Upsert into facilities
  let created = 0;
  let skipped = 0;
  const facilities: Array<{
    id: string;
    name: string;
    google_place_id: string;
    address: string;
    website: string | null;
  }> = [];

  for (const place of uniquePlaces.values()) {
    const name = place.displayName?.text ?? "Unknown Facility";
    const address = place.formattedAddress ?? "";
    const website = place.websiteUri ?? null;
    const cityParsed = parseCity(address);
    const zip = parseZip(address);

    // Check if this google_place_id already exists
    const { data: existing } = await supabase
      .from("facilities")
      .select("id")
      .eq("google_place_id", place.id)
      .maybeSingle();

    if (existing) {
      skipped++;
      facilities.push({
        id: existing.id,
        name,
        google_place_id: place.id,
        address,
        website,
      });
      continue;
    }

    // Insert new facility
    const { data: inserted, error } = await supabase
      .from("facilities")
      .insert({
        name,
        google_place_id: place.id,
        location_city: cityParsed,
        location_state: stateUpper,
        location_zip: zip,
        location_address: address,
        website,
        is_claimed: false,
        data_source: "scraped",
      })
      .select("id")
      .single();

    if (error) {
      console.error(`Failed to insert ${name}:`, error.message);
      continue;
    }

    created++;
    facilities.push({
      id: inserted.id,
      name,
      google_place_id: place.id,
      address,
      website,
    });
  }

  return NextResponse.json({
    city,
    state: stateUpper,
    total_found: uniquePlaces.size,
    created,
    skipped,
    facilities,
  });
}
