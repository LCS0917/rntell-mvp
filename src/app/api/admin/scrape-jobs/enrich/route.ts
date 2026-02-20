/**
 * POST /api/admin/scrape-jobs/enrich
 * -----------------------------------
 * Step 3: For scraped jobs that haven't been enriched yet, fetch the
 * source_url page and use Gemini 2.5 Flash to extract structured data
 * (pay, hours, certs, experience, etc.) then update the DB.
 *
 * Request body:
 *   { limit?: number }  — max jobs to enrich (default 20)
 *
 * Returns:
 *   { jobs_enriched, jobs_failed, details[], errors[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnrichedFields {
  pay_rate_hourly: number | null;
  pay_package_total: number | null;
  stipend_housing: number | null;
  stipend_meals: number | null;
  contract_weeks: number | null;
  hours_per_week: number | null;
  shift_type: string | null;
  start_date: string | null;
  requirements: string[];
  experience_required: string | null;
  description: string | null;
}

// ---------------------------------------------------------------------------
// Gemini extraction
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You are a data extraction assistant. Given the text content of a travel nurse job posting, extract the following fields into a JSON object. Return ONLY valid JSON, no markdown fences, no explanation.

Fields to extract:
- pay_rate_hourly: number or null (hourly base pay rate in USD, e.g. 55.00)
- pay_package_total: number or null (total weekly compensation package in USD)
- stipend_housing: number or null (weekly housing stipend/allowance in USD)
- stipend_meals: number or null (weekly meal/M&IE stipend in USD)
- contract_weeks: number or null (contract duration in weeks, e.g. 13)
- hours_per_week: number or null (scheduled hours per week, e.g. 36, 40, 48)
- shift_type: "day" or "night" or "rotating" or "prn" or null
- start_date: ISO date string "YYYY-MM-DD" or null (if ASAP or not specified, use null)
- requirements: array of strings — certifications and qualifications required (e.g. ["BLS", "ACLS", "2 years ICU experience", "Active RN License"])
- experience_required: string or null — a short summary of experience needed (e.g. "2 years ICU experience required")
- description: string or null — a clean 1-3 sentence summary of the position (max 300 chars)

Rules:
- If a field is not mentioned or unclear, use null (or empty array for requirements).
- For pay: extract the BASE hourly rate, not blended/OT rates. Weekly package = total weekly take-home.
- For requirements: include certifications (BLS, ACLS, PALS, NRP, etc.), license requirements, and experience minimums.
- Do NOT invent data. Only extract what is explicitly stated.`;

async function extractWithGemini(pageText: string): Promise<EnrichedFields | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  // Truncate to ~4000 chars to keep token usage low
  const truncated = pageText.slice(0, 4000);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EXTRACTION_PROMPT },
              { text: `\n\nJob posting text:\n${truncated}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024,
        },
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip markdown fences if Gemini wraps in ```json ... ```
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned) as EnrichedFields;
    // Validate shift_type enum
    const validShifts = ["day", "night", "rotating", "prn"];
    if (parsed.shift_type && !validShifts.includes(parsed.shift_type)) {
      parsed.shift_type = null;
    }
    // Ensure requirements is an array
    if (!Array.isArray(parsed.requirements)) {
      parsed.requirements = [];
    }
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch + strip page text
// ---------------------------------------------------------------------------

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 1. Try extracting JSON-LD structured data first (Workday, many ATS use this)
    const jsonLdMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    let jsonLdText = "";
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        // Flatten the JSON-LD into readable text for Gemini
        jsonLdText += JSON.stringify(data, null, 2) + "\n";
      } catch {
        // Skip malformed JSON-LD
      }
    }

    // 2. Also extract visible text content (strip scripts, styles, tags)
    const visibleText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 3. Combine: JSON-LD first (structured), then visible text (may have more details)
    const combined = (jsonLdText + "\n\n" + visibleText).trim();

    // If we got meaningful JSON-LD, that alone is enough even if visible text is short
    if (jsonLdText.length > 50) return combined;
    // Otherwise, need at least 50 chars of visible text
    if (visibleText.length < 50) return null;
    return combined;
  } catch {
    return null;
  }
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(body.limit ?? 20, 50);

  // 2. Get un-enriched scraped jobs
  const { data: jobs, error: fetchErr } = await supabase
    .from("job_postings")
    .select("id, title, source_url, specialty")
    .eq("data_source", "scraped")
    .eq("is_active", true)
    .is("enriched_at", null)
    .not("source_url", "is", null)
    .order("scraped_at", { ascending: false })
    .limit(limit);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({
      jobs_enriched: 0,
      jobs_failed: 0,
      message: "No un-enriched jobs found",
      details: [],
      errors: [],
    });
  }

  const results = {
    jobs_enriched: 0,
    jobs_failed: 0,
    details: [] as { id: string; title: string; fields_filled: string[] }[],
    errors: [] as { id: string; title: string; message: string }[],
  };

  // 3. Process sequentially with delay to avoid Gemini rate limits (free tier)
  const DELAY_MS = 1500; // 1.5s between Gemini calls

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i] as { id: string; title: string; source_url: string; specialty: string };

    try {
      // Fetch page text
      const pageText = await fetchPageText(job.source_url);
      if (!pageText || pageText.length < 50) {
        results.errors.push({ id: job.id, title: job.title, message: "Could not fetch page or page too short" });
        results.jobs_failed++;
        continue;
      }

      // Extract with Gemini
      const extracted = await extractWithGemini(pageText);
      if (!extracted) {
        results.errors.push({ id: job.id, title: job.title, message: "Gemini returned unparseable response" });
        results.jobs_failed++;
        continue;
      }

      // Build update object — only set fields that Gemini actually extracted
      const update: Record<string, unknown> = {
        enriched_at: new Date().toISOString(),
      };
      const fieldsFilled: string[] = [];

      if (extracted.pay_rate_hourly != null) { update.pay_rate_hourly = extracted.pay_rate_hourly; fieldsFilled.push("pay_rate_hourly"); }
      if (extracted.pay_package_total != null) { update.pay_package_total = extracted.pay_package_total; fieldsFilled.push("pay_package_total"); }
      if (extracted.stipend_housing != null) { update.stipend_housing = extracted.stipend_housing; fieldsFilled.push("stipend_housing"); }
      if (extracted.stipend_meals != null) { update.stipend_meals = extracted.stipend_meals; fieldsFilled.push("stipend_meals"); }
      if (extracted.contract_weeks != null) { update.contract_weeks = extracted.contract_weeks; fieldsFilled.push("contract_weeks"); }
      if (extracted.hours_per_week != null) { update.hours_per_week = extracted.hours_per_week; fieldsFilled.push("hours_per_week"); }
      if (extracted.shift_type) { update.shift_type = extracted.shift_type; fieldsFilled.push("shift_type"); }
      if (extracted.start_date) { update.start_date = extracted.start_date; fieldsFilled.push("start_date"); }
      if (extracted.requirements.length > 0) { update.requirements = extracted.requirements; fieldsFilled.push("requirements"); }
      if (extracted.experience_required) { update.experience_required = extracted.experience_required; fieldsFilled.push("experience_required"); }
      if (extracted.description) { update.description = extracted.description; fieldsFilled.push("description"); }

      // Update DB
      const { error: updateErr } = await supabase
        .from("job_postings")
        .update(update)
        .eq("id", job.id);

      if (updateErr) {
        results.errors.push({ id: job.id, title: job.title, message: updateErr.message });
        results.jobs_failed++;
      } else {
        results.jobs_enriched++;
        results.details.push({ id: job.id, title: job.title, fields_filled: fieldsFilled });
      }
    } catch (e) {
      results.errors.push({
        id: job.id,
        title: job.title,
        message: e instanceof Error ? e.message : "Unknown error",
      });
      results.jobs_failed++;
    }

    // Delay between jobs to respect Gemini rate limits
    if (i < jobs.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return NextResponse.json(results);
}
