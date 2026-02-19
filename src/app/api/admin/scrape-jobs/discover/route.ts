/**
 * POST /api/admin/scrape-jobs/discover
 * -------------------------------------
 * Detection-only: for each facility with a website, discovers the careers
 * page URL and identifies the ATS system. Does NOT pull jobs.
 *
 * Request body:
 *   { facility_ids?: string[]; state?: string }
 *
 * Returns:
 *   { facilities_scanned, careers_found, ats_breakdown: Record<string,number>,
 *     details: { name, website, careers_url, ats_type }[], errors[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiscoverBody {
  facility_ids?: string[];
  state?: string;
}

interface FacilityRow {
  id: string;
  name: string;
  website: string | null;
  careers_url: string | null;
  ats_type: string | null;
  location_state: string | null;
}

type ATSType =
  | "workday"
  | "greenhouse"
  | "lever"
  | "icims"
  | "smartrecruiters"
  | "taleo"
  | "successfactors"
  | "avature"
  | "phenom"
  | "dayforce"
  | "jobvite"
  | "unknown"
  | "none";

// ---------------------------------------------------------------------------
// ATS detection patterns — checked against URLs and HTML hrefs
// ---------------------------------------------------------------------------

const ATS_PATTERNS: { type: ATSType; re: RegExp }[] = [
  // Workday — two major domain families
  { type: "workday", re: /myworkdayjobs\.com/ },
  { type: "workday", re: /myworkdaysite\.com/ },
  { type: "workday", re: /wd\d+\.myworkday\.com/ },
  { type: "workday", re: /workday\.com\/.*\/job/ },

  // Greenhouse
  { type: "greenhouse", re: /boards\.greenhouse\.io/ },
  { type: "greenhouse", re: /job-boards\.greenhouse\.io/ },

  // Lever
  { type: "lever", re: /jobs\.lever\.co/ },
  { type: "lever", re: /lever\.co\/.*\/postings/ },

  // iCIMS
  { type: "icims", re: /icims\.com/ },

  // SmartRecruiters
  { type: "smartrecruiters", re: /jobs\.smartrecruiters\.com/ },
  { type: "smartrecruiters", re: /smartrecruiters\.com/ },

  // Taleo (Oracle)
  { type: "taleo", re: /taleo\.net/ },
  { type: "taleo", re: /oracle\.com\/.*taleo/ },

  // SAP SuccessFactors
  { type: "successfactors", re: /successfactors\.com/ },
  { type: "successfactors", re: /successfactors\.eu/ },

  // Avature (used by Providence, large systems)
  { type: "avature", re: /avature\.net/ },

  // Phenom People
  { type: "phenom", re: /phenom\.com/ },
  { type: "phenom", re: /phenom-people\.com/ },

  // Dayforce (Ceridian)
  { type: "dayforce", re: /dayforcehcm\.com/ },
  { type: "dayforce", re: /ceridian\.com/ },

  // Jobvite
  { type: "jobvite", re: /jobvite\.com/ },
  { type: "jobvite", re: /jobs\.jobvite\.com/ },
];

/** Paths to probe for career pages if not found in main HTML */
const CAREER_PATHS = [
  "/careers",
  "/jobs",
  "/career",
  "/job-opportunities",
  "/employment",
  "/work-with-us",
  "/join-our-team",
  "/nursing-careers",
  "/nursing-jobs",
];

// ---------------------------------------------------------------------------
// Detection logic
// ---------------------------------------------------------------------------

const FETCH_OPTS: RequestInit = {
  redirect: "follow",
  headers: { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" },
};

/** Fetch a page with timeout; returns { html, finalUrl } or null on failure */
async function safeFetch(url: string, timeoutMs = 8000): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      ...FETCH_OPTS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return { html, finalUrl: res.url };
  } catch {
    return null;
  }
}

/** Check a URL string against all ATS patterns. Returns the matched type or null. */
function matchATSUrl(url: string): ATSType | null {
  for (const { type, re } of ATS_PATTERNS) {
    if (re.test(url)) return type;
  }
  return null;
}

/** Extract all href/src URLs from HTML */
function extractUrls(html: string): string[] {
  const matches = [...html.matchAll(/(?:href|src|action)=["']([^"']+)["']/gi)];
  return matches.map((m) => m[1]);
}

/** Check extracted URLs for ATS patterns. Returns { type, url } or null. */
function findATSInUrls(urls: string[]): { type: ATSType; url: string } | null {
  for (const u of urls) {
    const type = matchATSUrl(u);
    if (type) return { type, url: u };
  }
  return null;
}

/** Find a career-ish link in the HTML that we can follow */
function findCareerLink(urls: string[], baseUrl: string): string | null {
  const careerKeywords = /career|jobs|employment|join|work-with-us|nursing|talent|apply|opportunities/i;
  for (const u of urls) {
    // Skip generic anchors, hash links, mailto, tel
    if (!u || u.startsWith("#") || u.startsWith("mailto:") || u.startsWith("tel:")) continue;
    if (careerKeywords.test(u)) {
      // Make absolute
      if (u.startsWith("/")) return baseUrl + u;
      if (u.startsWith("http")) return u;
    }
  }
  return null;
}

/**
 * Main detection pipeline for a single facility.
 * Strategy:
 *  1. Fetch main website → check redirect URL and HTML for ATS links
 *  2. If no ATS, look for a career link on the main page → fetch it → check
 *  3. If still nothing, probe common career paths (/careers, /jobs, etc.)
 *  4. Return careers_url + ats_type
 */
async function detectATS(website: string): Promise<{
  ats_type: ATSType;
  careers_url: string | null;
}> {
  let baseUrl = website.trim();
  if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;
  baseUrl = baseUrl.replace(/\/+$/, "");

  // --- Step 1: Fetch main page ---
  const mainPage = await safeFetch(baseUrl);
  if (mainPage) {
    // Check if main page itself redirected to an ATS
    const mainAts = matchATSUrl(mainPage.finalUrl);
    if (mainAts) return { ats_type: mainAts, careers_url: mainPage.finalUrl };

    const mainUrls = extractUrls(mainPage.html);

    // Check all hrefs/srcs for ATS links
    const atsHit = findATSInUrls(mainUrls);
    if (atsHit) return { ats_type: atsHit.type, careers_url: atsHit.url };

    // --- Step 2: Follow career links found on the main page ---
    const careerLink = findCareerLink(mainUrls, baseUrl);
    if (careerLink) {
      const careerPage = await safeFetch(careerLink);
      if (careerPage) {
        // Check if career page redirected to ATS
        const redirectAts = matchATSUrl(careerPage.finalUrl);
        if (redirectAts) return { ats_type: redirectAts, careers_url: careerPage.finalUrl };

        // Check career page HTML for ATS links
        const careerUrls = extractUrls(careerPage.html);
        const careerAts = findATSInUrls(careerUrls);
        if (careerAts) return { ats_type: careerAts.type, careers_url: careerAts.url };

        // Career page exists but no known ATS
        return { ats_type: "unknown", careers_url: careerLink };
      }
    }
  }

  // --- Step 3: Probe common career paths ---
  for (const path of CAREER_PATHS) {
    const probeUrl = baseUrl + path;
    const page = await safeFetch(probeUrl, 5000);
    if (!page) continue;

    // Check redirect destination
    const probeAts = matchATSUrl(page.finalUrl);
    if (probeAts) return { ats_type: probeAts, careers_url: page.finalUrl };

    // Check HTML for ATS links
    const urls = extractUrls(page.html);
    const atsHit = findATSInUrls(urls);
    if (atsHit) return { ats_type: atsHit.type, careers_url: atsHit.url };

    // Found a working career page with no known ATS
    return { ats_type: "unknown", careers_url: probeUrl };
  }

  return { ats_type: "none", careers_url: null };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Auth — admin only
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await authClient
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  // Service role client for DB writes
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = (await request.json()) as DiscoverBody;

  // 2. Get facilities to scan
  let query = supabase
    .from("facilities")
    .select("id, name, website, careers_url, ats_type, location_state")
    .not("website", "is", null);

  if (body.facility_ids?.length) {
    query = query.in("id", body.facility_ids);
  }
  if (body.state) {
    query = query.eq("location_state", body.state.toUpperCase());
  }

  const { data: facilities, error: fetchErr } = await query.limit(100);
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const atsBreakdown: Record<string, number> = {};
  const details: { name: string; website: string; careers_url: string | null; ats_type: string }[] = [];
  const errors: { facility: string; message: string }[] = [];
  let facilitiesScanned = 0;
  let careersFound = 0;

  // 3. Process each facility
  for (const facility of (facilities as FacilityRow[]) ?? []) {
    facilitiesScanned++;

    try {
      const detection = await detectATS(facility.website!);

      // Save detection result to DB
      await supabase
        .from("facilities")
        .update({ ats_type: detection.ats_type, careers_url: detection.careers_url })
        .eq("id", facility.id);

      // Track stats
      if (detection.careers_url) careersFound++;
      atsBreakdown[detection.ats_type] = (atsBreakdown[detection.ats_type] || 0) + 1;

      details.push({
        name: facility.name,
        website: facility.website!,
        careers_url: detection.careers_url,
        ats_type: detection.ats_type,
      });
    } catch (e) {
      errors.push({
        facility: facility.name,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    facilities_scanned: facilitiesScanned,
    careers_found: careersFound,
    ats_breakdown: atsBreakdown,
    details,
    errors,
  });
}
