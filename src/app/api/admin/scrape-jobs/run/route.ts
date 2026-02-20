/**
 * POST /api/admin/scrape-jobs/run
 * --------------------------------
 * "Gemini-First" pipeline: For each facility, finds the careers/jobs page,
 * scrapes ALL anchor tags, asks Gemini to pick the top 5 travel/contract
 * nurse URLs, fetches those pages, enriches inline, and upserts.
 *
 * Request body:
 *   { state?: string }
 *
 * Returns:
 *   { facilities_processed, jobs_created, jobs_updated, jobs_skipped,
 *     jobs_deactivated, details[], errors[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacilityRow {
  id: string;
  name: string;
  website: string | null;
  careers_url: string | null;
  ats_type: string | null;
  location_state: string | null;
  location_city: string | null;
}

interface LinkEntry {
  text: string;
  url: string;
}

interface EnrichedFields {
  is_contract?: boolean;
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
  title?: string | null;
  specialty?: string | null;
}

interface FacilityDetail {
  name: string;
  careers_url: string | null;
  links_found: number;
  gemini_selected: number;
  jobs_saved: number;
  jobs_deactivated: number;
  debug?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" };

const CAREER_PATHS = [
  "/careers", "/jobs", "/career", "/job-opportunities", "/employment",
  "/work-with-us", "/join-our-team", "/nursing-careers", "/nursing-jobs",
];

// ---------------------------------------------------------------------------
// Step 1: Find careers page and scrape ALL anchor tags
// ---------------------------------------------------------------------------

async function safeFetch(url: string, timeoutMs = 8000): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return { html, finalUrl: res.url };
  } catch {
    return null;
  }
}

/** Find the main careers/jobs page URL for a facility */
async function findCareersPage(facility: FacilityRow): Promise<string | null> {
  // If we already have a careers_url from a previous discover run, use it
  if (facility.careers_url) return facility.careers_url;
  if (!facility.website) return null;

  let baseUrl = facility.website.trim();
  if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;
  baseUrl = baseUrl.replace(/\/+$/, "");

  // Try fetching the main page and looking for career links
  const mainPage = await safeFetch(baseUrl, 5000);
  if (mainPage) {
    const careerKeywords = /career|jobs|employment|join|work-with-us|nursing|talent|opportunities/i;
    const hrefMatches = [...mainPage.html.matchAll(/href=["']([^"']+)["']/gi)];
    for (const [, href] of hrefMatches) {
      if (careerKeywords.test(href)) {
        const absolute = href.startsWith("http") ? href : href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
        return absolute;
      }
    }
  }

  // Probe common career paths
  for (const path of CAREER_PATHS) {
    const probeUrl = baseUrl + path;
    const page = await safeFetch(probeUrl, 3000);
    if (page) return page.finalUrl;
  }

  return null;
}

/** Scrape all anchor tags from a page. Returns { text, url } pairs. */
async function scrapeAllLinks(pageUrl: string): Promise<LinkEntry[]> {
  const page = await safeFetch(pageUrl);
  if (!page) return [];

  const baseUrl = new URL(pageUrl);
  const links: LinkEntry[] = [];
  const seen = new Set<string>();

  // Match all <a> tags with href and inner text
  const anchorMatches = [...page.html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

  for (const [, href, rawText] of anchorMatches) {
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;

    const text = rawText.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!text || text.length < 3) continue;

    // Make URL absolute
    let absoluteUrl: string;
    try {
      absoluteUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
    } catch {
      continue;
    }

    // Deduplicate by URL
    if (seen.has(absoluteUrl)) continue;
    seen.add(absoluteUrl);

    links.push({ text, url: absoluteUrl });
  }

  // Also follow pagination / "view all jobs" patterns and scrape those pages
  const viewAllPattern = /view\s*all|see\s*all|all\s*jobs|all\s*openings|all\s*positions|more\s*jobs|show\s*more/i;
  const viewAllLink = links.find((l) => viewAllPattern.test(l.text));
  if (viewAllLink) {
    const subPage = await safeFetch(viewAllLink.url, 5000);
    if (subPage) {
      const subAnchors = [...subPage.html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      for (const [, href, rawText] of subAnchors) {
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
        const text = rawText.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (!text || text.length < 3) continue;
        let absoluteUrl: string;
        try {
          absoluteUrl = href.startsWith("http") ? href : new URL(href, new URL(viewAllLink.url)).href;
        } catch {
          continue;
        }
        if (seen.has(absoluteUrl)) continue;
        seen.add(absoluteUrl);
        links.push({ text, url: absoluteUrl });
      }
    }
  }

  return links;
}

// ---------------------------------------------------------------------------
// Step 2: Gemini link selection — pick top 5 travel nurse URLs
// ---------------------------------------------------------------------------

const LINK_SELECTION_PROMPT = `You are a travel nursing job expert. From the list of links below, identify the URLs most likely to be **Travel Nurse** or **Contract Nursing** job postings.

SELECTION RULES:
- Pick up to 5 URLs that look like individual job postings for travel, contract, per diem, or locum nursing roles.
- EXPLICITLY IGNORE links that mention: "Staff", "Permanent", "FTE", "Full-Time Employee", "Residency", "New Grad", "Internship", "Volunteer", "Student", "Fellowship".
- EXPLICITLY IGNORE links that are clearly navigation (About Us, Contact, Benefits, Login, Apply Now without a specific job, etc.)
- PREFER links whose text mentions: travel, contract, RN, nurse, nursing, per diem, assignment, 13 weeks, stipend, ICU, ER, OR, Med/Surg, etc.
- If no links look like travel/contract nursing jobs, return an empty array.

Return ONLY a JSON array of the selected URLs (strings). No markdown, no explanation.
Example: ["https://example.com/job/123", "https://example.com/job/456"]`;

async function selectLinksWithGemini(links: LinkEntry[]): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  // Format links as numbered list for Gemini
  const linkList = links
    .slice(0, 150) // Cap at 150 links to stay within token limits
    .map((l, i) => `${i + 1}. "${l.text}" → ${l.url}`)
    .join("\n");

  const payload = {
    contents: [{
      parts: [
        { text: LINK_SELECTION_PROMPT },
        { text: `\n\nLinks found on the careers page:\n${linkList}` },
      ],
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 512,
      response_mime_type: "application/json",
    },
  };

  const MAX_RETRIES = 2;
  const BACKOFF_MS = [1000, 2000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (res.status === 429 && attempt < MAX_RETRIES) continue;
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini link selection ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    try {
      const urls = JSON.parse(cleaned);
      if (Array.isArray(urls)) {
        return urls.filter((u: unknown) => typeof u === "string").slice(0, 5);
      }
    } catch {
      // If Gemini returned something unparseable, return empty
    }
    return [];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Step 3: Fetch page text + Gemini enrichment (inline)
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You are a data extraction expert for travel nursing job postings. Extract job details into raw JSON. Do not include markdown formatting or conversational filler. Use null for missing values.

FIRST: Determine if this is a Contract/Travel nursing role or a Staff/Permanent position.
If it is clearly a Staff or Permanent role (not travel/contract), return ONLY: {"is_contract": false}
If it IS a contract/travel role (or unclear), proceed with full extraction and include "is_contract": true.

Fields:
- is_contract: boolean (true if contract/travel, false if staff/permanent)
- title: string or null (the job title as stated)
- specialty: string or null — one of: ICU, ER, OR, L&D, NICU, PICU, Peds, Med/Surg, Oncology, Cardiac, Telemetry, Psych, Rehab, Home Health, Dialysis, Infusion, Endoscopy, Wound Care, General
- pay_rate_hourly: number or null (hourly base pay in USD, e.g. 55.00)
- pay_package_total: number or null (total weekly compensation in USD)
- stipend_housing: number or null (weekly housing stipend in USD)
- stipend_meals: number or null (weekly meal/M&IE stipend in USD)
- contract_weeks: number or null (duration in weeks, e.g. 13)
- hours_per_week: number or null (e.g. 36, 40, 48)
- shift_type: "day" or "night" or "rotating" or "prn" or null
- start_date: "YYYY-MM-DD" or null (null if ASAP or unspecified)
- requirements: string[] — certifications/qualifications (e.g. ["BLS", "ACLS", "Active RN License"])
- experience_required: string or null (e.g. "2 years ICU experience required")
- description: string or null — 1-3 sentence summary (max 300 chars)

Rules:
- null for missing/unclear fields; empty array for requirements if none stated.
- Extract BASE hourly rate only, not blended/OT. Weekly package = total take-home.
- Do NOT invent data. Only extract what is explicitly stated.`;

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: FETCH_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract JSON-LD structured data (Workday and many ATS use this)
    const jsonLdMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    let jsonLdText = "";
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        jsonLdText += JSON.stringify(data, null, 2) + "\n";
      } catch {
        // Skip malformed JSON-LD
      }
    }

    // Extract visible text content
    const visibleText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const combined = (jsonLdText + "\n\n" + visibleText).trim();
    if (jsonLdText.length > 50) return combined;
    if (visibleText.length < 50) return null;
    return combined;
  } catch {
    return null;
  }
}

async function enrichWithGemini(pageText: string, jobUrl: string): Promise<EnrichedFields | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const truncated = pageText.slice(0, 4000);

  const payload = {
    contents: [{
      parts: [
        { text: EXTRACTION_PROMPT },
        { text: `\n\nJob posting text:\n${truncated}` },
      ],
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      response_mime_type: "application/json",
    },
  };

  const MAX_RETRIES = 2;
  const BACKOFF_MS = [1000, 2000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`  ↻ Retry ${attempt}/${MAX_RETRIES} for enrichment of ${jobUrl}`);
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (res.status === 429 && attempt < MAX_RETRIES) continue;
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini enrichment ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!cleaned) return null;

    try {
      const parsed = JSON.parse(cleaned) as EnrichedFields;
      const validShifts = ["day", "night", "rotating", "prn"];
      if (parsed.shift_type && !validShifts.includes(parsed.shift_type)) {
        parsed.shift_type = null;
      }
      if (!Array.isArray(parsed.requirements)) {
        parsed.requirements = [];
      }
      return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferSpecialty(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("icu") || t.includes("critical care") || t.includes("intensive care")) return "ICU";
  if (t.includes("emergency") || t.includes(" er ") || t.match(/\ber\b/)) return "ER";
  if (t.includes("operating room") || t.includes(" or ") || t.includes("perioperative") || t.match(/\bor\b/)) return "OR";
  if (t.includes("labor") || t.includes("l&d") || t.includes("delivery") || t.includes("obstetric")) return "L&D";
  if (t.includes("nicu") || t.includes("neonatal")) return "NICU";
  if (t.includes("picu") || t.includes("pediatric intensive")) return "PICU";
  if (t.includes("pediatric") || t.includes("peds")) return "Peds";
  if (t.includes("med surg") || t.includes("med/surg") || t.includes("medical surgical")) return "Med/Surg";
  if (t.includes("oncology")) return "Oncology";
  if (t.includes("cardiac") || t.includes("cardiology") || t.includes("cath lab") || t.includes("cvicu")) return "Cardiac";
  if (t.includes("telemetry") || t.includes("tele")) return "Telemetry";
  if (t.includes("psych") || t.includes("behavioral") || t.includes("mental health")) return "Psych";
  if (t.includes("rehab")) return "Rehab";
  if (t.includes("home health")) return "Home Health";
  if (t.includes("dialysis") || t.includes("renal")) return "Dialysis";
  if (t.includes("infusion")) return "Infusion";
  if (t.includes("endoscopy")) return "Endoscopy";
  if (t.includes("wound care")) return "Wound Care";
  return "General";
}

function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const chr = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await request.json();

  // 2. Get ALL facilities with a website or careers_url — no ATS filter
  let query = supabase
    .from("facilities")
    .select("id, name, website, careers_url, ats_type, location_state, location_city")
    .or("website.not.is.null,careers_url.not.is.null");

  if (body.state) {
    query = query.eq("location_state", body.state.toUpperCase());
  }

  const { data: facilities, error: fetchErr } = await query.limit(20);
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const results = {
    facilities_processed: 0,
    jobs_created: 0,
    jobs_updated: 0,
    jobs_skipped: 0,
    jobs_deactivated: 0,
    details: [] as FacilityDetail[],
    errors: [] as { facility: string; message: string }[],
  };

  const allFacilities = (facilities as FacilityRow[]) ?? [];
  const BATCH_SIZE = 3; // Smaller batch — each facility now makes Gemini calls

  async function processFacility(facility: FacilityRow) {
    const detail: FacilityDetail = {
      name: facility.name,
      careers_url: null,
      links_found: 0,
      gemini_selected: 0,
      jobs_saved: 0,
      jobs_deactivated: 0,
    };

    try {
      // --- Phase 1: BROAD DISCOVERY — find careers page ---
      const careersUrl = await findCareersPage(facility);
      if (!careersUrl) {
        detail.debug = "No careers page found";
        results.details.push(detail);
        results.facilities_processed++;
        return;
      }
      detail.careers_url = careersUrl;

      // Update facility careers_url if we discovered a new one
      if (careersUrl !== facility.careers_url) {
        await supabase
          .from("facilities")
          .update({ careers_url: careersUrl })
          .eq("id", facility.id);
      }

      // --- Phase 2: Scrape ALL links from careers page ---
      const allLinks = await scrapeAllLinks(careersUrl);
      detail.links_found = allLinks.length;

      if (allLinks.length === 0) {
        detail.debug = "No links found on careers page";
        results.details.push(detail);
        results.facilities_processed++;
        return;
      }

      // --- Phase 3: INTELLIGENT LINK SELECTION via Gemini ---
      const selectedUrls = await selectLinksWithGemini(allLinks);
      detail.gemini_selected = selectedUrls.length;

      if (selectedUrls.length === 0) {
        detail.debug = `${allLinks.length} links scanned, Gemini found 0 travel nurse jobs`;
        results.details.push(detail);
        results.facilities_processed++;
        return;
      }

      // 300ms delay after link selection call before enrichment calls
      await new Promise((r) => setTimeout(r, 300));

      // --- Phase 4: TARGETED SCRAPING + PARALLEL ENRICHMENT ---
      const seenSourceUrls = new Set<string>();

      for (const jobUrl of selectedUrls) {
        seenSourceUrls.add(jobUrl);

        // Fetch the full page text
        const pageText = await fetchPageText(jobUrl);
        if (!pageText || pageText.length < 50) {
          results.errors.push({ facility: facility.name, message: `Could not fetch ${jobUrl}` });
          continue;
        }

        // Enrich with Gemini (inline — no separate step)
        const extracted = await enrichWithGemini(pageText, jobUrl);

        // 300ms delay between Gemini calls
        await new Promise((r) => setTimeout(r, 300));

        if (!extracted) {
          results.errors.push({ facility: facility.name, message: `Gemini parse failed for ${jobUrl}` });
          continue;
        }

        // Skip if Gemini determined this is a staff/permanent job
        if (extracted.is_contract === false) {
          continue;
        }

        // Build the job title — prefer Gemini's extraction, fall back to link text
        const linkEntry = allLinks.find((l) => l.url === jobUrl);
        const title = extracted.title || linkEntry?.text || "Untitled";
        const specialty = extracted.specialty || inferSpecialty(title);
        const contentHash = hashContent(title + (extracted.description || "") + jobUrl);

        // --- Phase 5: UPSERT with ON CONFLICT ---
        // Check for existing job by source_url
        const { data: existing } = await supabase
          .from("job_postings")
          .select("id, source_hash")
          .eq("source_url", jobUrl)
          .maybeSingle();

        const jobData: Record<string, unknown> = {
          title,
          specialty,
          source_hash: contentHash,
          last_seen_at: new Date().toISOString(),
          is_active: true,
          enriched_at: new Date().toISOString(),
        };

        // Set enriched fields
        if (extracted.pay_rate_hourly != null) jobData.pay_rate_hourly = extracted.pay_rate_hourly;
        if (extracted.pay_package_total != null) jobData.pay_package_total = extracted.pay_package_total;
        if (extracted.stipend_housing != null) jobData.stipend_housing = extracted.stipend_housing;
        if (extracted.stipend_meals != null) jobData.stipend_meals = extracted.stipend_meals;
        if (extracted.contract_weeks != null) jobData.contract_weeks = extracted.contract_weeks;
        if (extracted.hours_per_week != null) jobData.hours_per_week = extracted.hours_per_week;
        if (extracted.shift_type) jobData.shift_type = extracted.shift_type;
        if (extracted.start_date) jobData.start_date = extracted.start_date;
        if (extracted.requirements?.length > 0) jobData.requirements = extracted.requirements;
        if (extracted.experience_required) jobData.experience_required = extracted.experience_required;
        if (extracted.description) jobData.description = extracted.description;

        if (existing) {
          if (existing.source_hash === contentHash) {
            // Same content — just refresh timestamps
            await supabase
              .from("job_postings")
              .update({ last_seen_at: new Date().toISOString(), is_active: true })
              .eq("id", existing.id);
            results.jobs_skipped++;
          } else {
            // Content changed — full update
            await supabase
              .from("job_postings")
              .update(jobData)
              .eq("id", existing.id);
            results.jobs_updated++;
          }
        } else {
          // New job — insert
          const { error: insertErr } = await supabase
            .from("job_postings")
            .insert({
              facility_id: facility.id,
              source_url: jobUrl,
              data_source: "scraped",
              scraped_at: new Date().toISOString(),
              ...jobData,
            });

          if (insertErr) {
            if (insertErr.code === "23505") {
              results.jobs_skipped++;
            } else {
              results.errors.push({ facility: facility.name, message: insertErr.message });
            }
          } else {
            results.jobs_created++;
            detail.jobs_saved++;
          }
        }
      }

      // --- Deactivate stale jobs for this facility ---
      const { data: activeDbJobs } = await supabase
        .from("job_postings")
        .select("id, source_url")
        .eq("facility_id", facility.id)
        .eq("data_source", "scraped")
        .eq("is_active", true);

      for (const dbJob of activeDbJobs ?? []) {
        if (dbJob.source_url && !seenSourceUrls.has(dbJob.source_url)) {
          await supabase
            .from("job_postings")
            .update({ is_active: false })
            .eq("id", dbJob.id);
          detail.jobs_deactivated++;
        }
      }

      results.jobs_deactivated += detail.jobs_deactivated;
      detail.debug = `${allLinks.length} links → Gemini picked ${selectedUrls.length} → ${detail.jobs_saved} saved`;
    } catch (e) {
      results.errors.push({
        facility: facility.name,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }

    results.facilities_processed++;
    results.details.push(detail);
  }

  // Process facilities in batches of 3 (each makes multiple Gemini calls)
  for (let i = 0; i < allFacilities.length; i += BATCH_SIZE) {
    const batch = allFacilities.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(processFacility));
  }

  return NextResponse.json(results);
}
