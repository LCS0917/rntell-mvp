/**
 * POST /api/admin/scrape-jobs/run
 * --------------------------------
 * "Universal Discovery" pipeline: For each facility, uses Playwright to
 * dynamically render the careers page (handling JS-heavy sites like
 * CommonSpirit), collects ALL links agnostically, asks Gemini to pick the
 * top 5 travel/contract nurse URLs, fetches those pages, enriches inline,
 * and upserts.
 *
 * Key improvements over previous version:
 * 1. DYNAMIC RENDERING via Playwright (waits for networkidle / job containers)
 * 2. AGNOSTIC LINK COLLECTION — captures text, url, AND title attributes
 * 3. Updated Gemini selection prompt for universal discovery
 * 4. Robust redirect/timeout handling for Indeed/LinkedIn external links
 * 5. Inline enrichment immediately after link selection
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
import { chromium as playwrightChromium, type Browser } from "playwright-core";
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
  title: string | null;
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

/** Domains that are external job boards — redirect traps we want to skip */
const EXTERNAL_REDIRECT_DOMAINS = [
  "indeed.com", "linkedin.com", "glassdoor.com", "ziprecruiter.com",
  "monster.com", "careerbuilder.com", "simplyhired.com",
];

// ---------------------------------------------------------------------------
// Playwright: Dynamic rendering + agnostic link collection
// ---------------------------------------------------------------------------

/**
 * Launch Playwright, navigate to the careers page, wait for dynamic content,
 * and extract ALL <a> tags with text, href, and title attributes.
 */
async function scrapeLinksWithPlaywright(
  browser: Browser,
  pageUrl: string,
): Promise<LinkEntry[]> {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  const links: LinkEntry[] = [];

  try {
    // Navigate with a generous timeout — dynamic sites can be slow
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    // Wait for network to settle — ensures all JS bundles have loaded
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    // Smart sleep: CommonSpirit and similar sites use JS frameworks that inject
    // search results into the DOM after network settles. Give them time to render.
    await new Promise((r) => setTimeout(r, 3000));

    // Additional wait: try to find job-item containers that indicate content loaded
    try {
      await page.waitForSelector(
        '[class*="job"], [class*="Job"], [class*="posting"], [class*="Posting"], ' +
        '[class*="position"], [class*="Position"], [class*="search-result"], ' +
        '[data-job], [data-posting], article, .card, .list-item',
        { timeout: 5000 },
      );
    } catch {
      // No job containers found — that's OK, we'll still scrape whatever links exist
    }

    // Also follow "View All" / "See All" / "Show More" pagination links by clicking them
    try {
      const viewAllBtn = page.locator(
        'a:text-matches("view all|see all|all jobs|all openings|all positions|show more|load more", "i"), ' +
        'button:text-matches("view all|see all|all jobs|all openings|all positions|show more|load more", "i")',
      ).first();
      if (await viewAllBtn.isVisible({ timeout: 2000 })) {
        await viewAllBtn.click();
        await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      }
    } catch {
      // No pagination button found — continue
    }

    // AGNOSTIC LINK COLLECTION: Extract EVERY <a> tag on the page
    const rawLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
      return anchors.map((a) => ({
        text: (a.textContent || "").replace(/\s+/g, " ").trim(),
        url: a.href,
        title: a.getAttribute("title") || null,
      }));
    });

    // Deduplicate and filter
    const seen = new Set<string>();
    for (const link of rawLinks) {
      if (!link.url || link.url.startsWith("javascript:") || link.url.startsWith("mailto:") || link.url.startsWith("tel:") || link.url === "#") continue;
      if (!link.text && !link.title) continue;
      if ((link.text || "").length < 2 && !link.title) continue;
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      links.push({
        text: link.text || "",
        url: link.url,
        title: link.title,
      });
    }
  } catch (e) {
    console.error(`Playwright scrape failed for ${pageUrl}:`, e instanceof Error ? e.message : e);
  } finally {
    await context.close();
  }

  return links;
}

// ---------------------------------------------------------------------------
// Fallback: Static fetch for simple pages (no JS rendering needed)
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

// ---------------------------------------------------------------------------
// Gemini link selection — Universal Discovery prompt
// ---------------------------------------------------------------------------

const LINK_SELECTION_PROMPT = `I am providing a list of links from a hospital careers page. Some may be navigation, some may be 'Staff' jobs, and some are 'Travel/Contract' roles.

Identify the 5 best URLs for Travel/Contract Nursing assignments.

SELECTION RULES:
- Pick up to 5 URLs that look like individual job postings for travel, contract, per diem, or locum nursing roles.
- EXPLICITLY IGNORE links that mention: "Staff", "Permanent", "FTE", "Full-Time Employee", "Residency", "New Grad", "Internship", "Volunteer", "Student", "Fellowship".
- EXPLICITLY IGNORE links that are clearly navigation (About Us, Contact, Benefits, Login, Home, Privacy Policy, etc.)
- PREFER links whose text or title mentions: travel, contract, RN, nurse, nursing, per diem, assignment, 13 weeks, stipend, ICU, ER, OR, Med/Surg, etc.
- If no links look like travel/contract nursing jobs, look for links that say 'View Job' or 'Apply' — those may be individual job postings worth investigating.
- If you still find nothing relevant, return an empty array.

Return ONLY a JSON array of the selected URLs (strings). No markdown, no explanation.
Example: ["https://example.com/job/123", "https://example.com/job/456"]`;

async function selectLinksWithGemini(links: LinkEntry[]): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  // Format links including title attribute when present
  const linkList = links
    .slice(0, 100) // Cap at 100 links per the universal discovery spec
    .map((l, i) => {
      const titlePart = l.title ? ` [title: "${l.title}"]` : "";
      return `${i + 1}. "${l.text}"${titlePart} → ${l.url}`;
    })
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
// Robust page fetch with redirect/external domain handling
// ---------------------------------------------------------------------------

/**
 * Fetch a job page's text content. Includes:
 * - Redirect detection: if the final URL lands on Indeed/LinkedIn/etc, skip it
 * - Strict timeout to prevent hangs on slow redirects
 * - JSON-LD extraction for ATS-heavy pages
 */
async function fetchPageText(url: string): Promise<{ text: string; skipped?: boolean; reason?: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: FETCH_HEADERS,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    // Check if we got redirected to an external job board
    const finalUrl = res.url;
    const finalHost = new URL(finalUrl).hostname.toLowerCase();
    for (const domain of EXTERNAL_REDIRECT_DOMAINS) {
      if (finalHost.includes(domain)) {
        return { text: "", skipped: true, reason: `Redirected to ${domain} — skipped` };
      }
    }

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
    if (jsonLdText.length > 50) return { text: combined };
    if (visibleText.length < 50) return null;
    return { text: combined };
  } catch (e) {
    // AbortError means we hit our timeout — likely a redirect chain
    if (e instanceof Error && e.name === "AbortError") {
      return { text: "", skipped: true, reason: "Timeout — likely redirect chain" };
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Gemini enrichment
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

  // Launch a single Playwright browser instance shared across all facilities
  let browser: Browser | undefined;
  try {
    browser = await playwrightChromium.connect(
      `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`
    );
  } catch (e) {
    console.warn('Playwright launch failed, falling back to static fetch:', e instanceof Error ? e.message : e);
  }


  const BATCH_SIZE = 3; // Smaller batch — each facility makes multiple Gemini calls

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

      // --- Phase 2: DYNAMIC RENDERING + AGNOSTIC LINK COLLECTION ---
      let allLinks: LinkEntry[];

      if (browser) {
        // Use Playwright for dynamic rendering — handles JS-heavy sites
        allLinks = await scrapeLinksWithPlaywright(browser, careersUrl);
      } else {
        // Fallback to static fetch if Playwright unavailable
        allLinks = await scrapeAllLinksStatic(careersUrl);
      }

      detail.links_found = allLinks.length;

      if (allLinks.length === 0) {
        detail.debug = "No links found on careers page" + (browser ? " (Playwright)" : " (static)");
        results.details.push(detail);
        results.facilities_processed++;
        return;
      }

      // --- Phase 3: GEMINI LINK SELECTION (first 100 links) ---
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

      // --- Phase 4: INLINE ENRICHMENT with redirect protection ---
      const seenSourceUrls = new Set<string>();

      for (const jobUrl of selectedUrls) {
        seenSourceUrls.add(jobUrl);

        // Each URL is wrapped in try/catch so a redirect to Indeed or a 404
        // does not crash the entire batch for this facility
        try {
          // Fetch the full page text with redirect/timeout protection
          const pageResult = await fetchPageText(jobUrl);

          if (!pageResult) {
            results.errors.push({ facility: facility.name, message: `Could not fetch ${jobUrl}` });
            continue;
          }

          // Skip external redirects (Indeed, LinkedIn, etc.)
          if (pageResult.skipped) {
            results.errors.push({ facility: facility.name, message: `${pageResult.reason}: ${jobUrl}` });
            continue;
          }

          if (pageResult.text.length < 50) {
            results.errors.push({ facility: facility.name, message: `Page too short: ${jobUrl}` });
            continue;
          }

          // Enrich with Gemini (inline — no separate step)
          const extracted = await enrichWithGemini(pageResult.text, jobUrl);

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

          // --- Phase 5: UPSERT ---
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
        } catch (urlErr) {
          // Log the error and move on to the next URL — don't crash the batch
          results.errors.push({
            facility: facility.name,
            message: `URL failed (${urlErr instanceof Error ? urlErr.message : "unknown"}): ${jobUrl}`,
          });
          continue;
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
      detail.debug = `${allLinks.length} links → Gemini picked ${selectedUrls.length} → ${detail.jobs_saved} saved` +
        (browser ? " (Playwright)" : " (static)");
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
  try {
    for (let i = 0; i < allFacilities.length; i += BATCH_SIZE) {
      const batch = allFacilities.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(processFacility));
    }
  } finally {
    // Always close the browser when done
    if (browser) {
      await browser.close();
    }
  }

  return NextResponse.json(results);
}

// ---------------------------------------------------------------------------
// Static fallback: scrape links without Playwright
// ---------------------------------------------------------------------------

async function scrapeAllLinksStatic(pageUrl: string): Promise<LinkEntry[]> {
  const page = await safeFetch(pageUrl);
  if (!page) return [];

  const baseUrl = new URL(pageUrl);
  const links: LinkEntry[] = [];
  const seen = new Set<string>();

  // Match all <a> tags with href, inner text, and title attribute
  const anchorMatches = [...page.html.matchAll(/<a([^>]*)>([\s\S]*?)<\/a>/gi)];

  for (const [, attrs, rawText] of anchorMatches) {
    // Extract href
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];

    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;

    // Extract title attribute
    const titleMatch = attrs.match(/title=["']([^"']+)["']/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const text = rawText.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!text && !title) continue;
    if (text.length < 3 && !title) continue;

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

    links.push({ text, url: absoluteUrl, title });
  }

  // Follow pagination / "view all jobs" patterns
  const viewAllPattern = /view\s*all|see\s*all|all\s*jobs|all\s*openings|all\s*positions|more\s*jobs|show\s*more/i;
  const viewAllLink = links.find((l) => viewAllPattern.test(l.text));
  if (viewAllLink) {
    const subPage = await safeFetch(viewAllLink.url, 5000);
    if (subPage) {
      const subAnchors = [...subPage.html.matchAll(/<a([^>]*)>([\s\S]*?)<\/a>/gi)];
      for (const [, attrs, rawText] of subAnchors) {
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
        if (!hrefMatch) continue;
        const href = hrefMatch[1];
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;

        const titleMatch = attrs.match(/title=["']([^"']+)["']/i);
        const title = titleMatch ? titleMatch[1].trim() : null;

        const text = rawText.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (!text && !title) continue;
        if (text.length < 3 && !title) continue;

        let absoluteUrl: string;
        try {
          absoluteUrl = href.startsWith("http") ? href : new URL(href, new URL(viewAllLink.url)).href;
        } catch {
          continue;
        }
        if (seen.has(absoluteUrl)) continue;
        seen.add(absoluteUrl);
        links.push({ text, url: absoluteUrl, title });
      }
    }
  }

  return links;
}
