/**
 * POST /api/admin/scrape-jobs/run
 * --------------------------------
 * Step 2: For facilities with a known ATS, fetches up to 5 recent
 * contract/travel nurse jobs from each ATS endpoint and upserts into
 * job_postings.
 *
 * Request body:
 *   { state?: string }
 *
 * Returns:
 *   { facilities_processed, jobs_created, jobs_updated, jobs_skipped,
 *     details: { name, ats_type, jobs_found }[], errors[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacilityRow {
  id: string;
  name: string;
  careers_url: string;
  ats_type: string;
  location_state: string | null;
  location_city: string | null;
}

interface ScrapedJob {
  title: string;
  specialty: string;
  location: string;
  source_url: string;
  description: string;
  shift_type: string | null;
}

// ---------------------------------------------------------------------------
// ATS-specific fetchers — each returns up to 5 contract/travel nurse jobs
// ---------------------------------------------------------------------------

const NURSE_KEYWORDS = ["nurse", "rn ", "travel rn", "contract rn", "nursing", "registered nurse"];
const CONTRACT_KEYWORDS = ["travel", "contract", "per diem", "prn", "temp", "locum"];

const FETCH_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" };

async function fetchWorkdayJobs(careersUrl: string): Promise<ScrapedJob[]> {
  try {
    const url = new URL(careersUrl);
    const host = url.host;
    const orgMatch = host.match(/^([^.]+)\./);
    if (!orgMatch) return [];
    const org = orgMatch[1];

    // Filter out locale segments (en-US) and known path words
    const pathParts = url.pathname.split("/").filter(Boolean);
    const siteCandidates = pathParts.filter(
      (p) => !/^[a-z]{2}(-[A-Z]{2})?$/.test(p) && p !== "jobs" && p !== "login"
    );

    // Try each candidate site name, plus "External" as fallback
    const candidates = [...new Set([...siteCandidates, "External"])];

    for (const site of candidates) {
      const apiUrl = `https://${host}/wday/cxs/${org}/${site}/jobs`;
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...FETCH_HEADERS },
        body: JSON.stringify({
          appliedFacets: {},
          limit: 20,
          offset: 0,
          searchText: "nurse",
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue; // try next candidate
      const data = await res.json();
      const postings = data.jobPostings ?? [];
      if (postings.length === 0) continue;

      return postings
        .filter((p: Record<string, unknown>) => {
          const title = ((p.title as string) || "").toLowerCase();
          const hasPath = !!(p.externalPath as string);
          return hasPath && NURSE_KEYWORDS.some((kw) => title.includes(kw));
        })
        .slice(0, 5)
        .map((p: Record<string, unknown>) => ({
          title: (p.title as string) || "Untitled",
          specialty: inferSpecialty((p.title as string) || ""),
          location: (p.locationsText as string) || "",
          source_url: `https://${host}${p.externalPath as string}`,
          description: (p.bulletFields as string[])?.join(". ") || "",
          shift_type: inferShift((p.title as string) || ""),
        }));
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchGreenhouseJobs(careersUrl: string): Promise<ScrapedJob[]> {
  try {
    const url = new URL(careersUrl);
    const board = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!board) return [];

    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
      headers: FETCH_HEADERS,
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.jobs ?? [])
      .filter((j: Record<string, unknown>) => {
        const title = ((j.title as string) || "").toLowerCase();
        return NURSE_KEYWORDS.some((kw) => title.includes(kw));
      })
      .slice(0, 5)
      .map((j: Record<string, unknown>) => ({
        title: (j.title as string) || "Untitled",
        specialty: inferSpecialty((j.title as string) || ""),
        location: ((j.location as Record<string, string>)?.name) || "",
        source_url: (j.absolute_url as string) || "",
        description: stripHtml((j.content as string) || "").slice(0, 500),
        shift_type: inferShift((j.title as string) || ""),
      }));
  } catch {
    return [];
  }
}

async function fetchLeverJobs(careersUrl: string): Promise<ScrapedJob[]> {
  try {
    const url = new URL(careersUrl);
    const company = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!company) return [];

    const apiUrl = `https://api.lever.co/v0/postings/${company}?mode=json`;
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
      headers: FETCH_HEADERS,
    });
    if (!res.ok) return [];
    const jobs: Record<string, unknown>[] = await res.json();

    return jobs
      .filter((j) => {
        const title = ((j.text as string) || "").toLowerCase();
        return NURSE_KEYWORDS.some((kw) => title.includes(kw));
      })
      .slice(0, 5)
      .map((j) => ({
        title: (j.text as string) || "Untitled",
        specialty: inferSpecialty((j.text as string) || ""),
        location: ((j.categories as Record<string, string>)?.location) || "",
        source_url: (j.hostedUrl as string) || "",
        description: stripHtml((j.descriptionPlain as string) || (j.description as string) || "").slice(0, 500),
        shift_type: inferShift((j.text as string) || ""),
      }));
  } catch {
    return [];
  }
}

async function fetchSmartRecruitersJobs(careersUrl: string): Promise<ScrapedJob[]> {
  try {
    const url = new URL(careersUrl);
    const company = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!company) return [];

    const apiUrl = `https://api.smartrecruiters.com/v1/companies/${company}/postings?q=nurse&limit=20`;
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
      headers: FETCH_HEADERS,
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.content ?? [])
      .filter((j: Record<string, unknown>) => {
        const title = ((j.name as string) || "").toLowerCase();
        return NURSE_KEYWORDS.some((kw) => title.includes(kw));
      })
      .slice(0, 5)
      .map((j: Record<string, unknown>) => ({
        title: (j.name as string) || "Untitled",
        specialty: inferSpecialty((j.name as string) || ""),
        location: ((j.location as Record<string, unknown>)?.city as string) || "",
        source_url: ((j.ref as string) || "").replace("api.smartrecruiters.com/v1/companies", "jobs.smartrecruiters.com"),
        description: "",
        shift_type: inferShift((j.name as string) || ""),
      }));
  } catch {
    return [];
  }
}

async function fetchAvatureJobs(careersUrl: string): Promise<ScrapedJob[]> {
  // Avature doesn't have a public JSON API — scrape from career page HTML
  // The saved URL might be a deep link (e.g. ?jobId=1014&source=...), so strip to base path
  try {
    const parsedUrl = new URL(careersUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;

    // Try fetching the base talent network page (job listing)
    const res = await fetch(baseUrl, {
      signal: AbortSignal.timeout(10000),
      headers: FETCH_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Avature job links typically contain jobId in query string or have /opportunities/ paths
    // Pattern 1: links with jobId param (same talent network)
    const jobIdMatches = [...html.matchAll(/<a[^>]+href=["']([^"']*jobId=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];

    // Pattern 2: links with /job/ or /opportunities/ in path
    const pathMatches = [...html.matchAll(/<a[^>]+href=["']([^"']*(?:\/job[s]?\/|\/opportunities\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];

    const allMatches = [...jobIdMatches, ...pathMatches];

    // Extract clean title text (strip inner HTML tags)
    return allMatches
      .map(([, href, rawTitle]) => ({
        href,
        title: rawTitle.replace(/<[^>]+>/g, "").trim(),
      }))
      .filter(({ title }) => {
        if (!title || title.length < 5) return false;
        const t = title.toLowerCase();
        return NURSE_KEYWORDS.some((kw) => t.includes(kw));
      })
      .slice(0, 5)
      .map(({ href, title }) => ({
        title,
        specialty: inferSpecialty(title),
        location: "",
        source_url: href.startsWith("http") ? href : new URL(href, baseUrl).href,
        description: "",
        shift_type: inferShift(title),
      }));
  } catch {
    return [];
  }
}

async function fetchTaleoJobs(careersUrl: string): Promise<ScrapedJob[]> {
  // Taleo (Oracle) — try the REST API pattern
  try {
    // Taleo URLs often look like: https://company.taleo.net/careersection/...
    // The API endpoint is: https://company.taleo.net/careersection/rest/jobboard/searchjobs
    const url = new URL(careersUrl);
    const baseTaleo = `${url.protocol}//${url.host}`;

    // Try fetching the career page HTML for job links
    const res = await fetch(careersUrl, {
      signal: AbortSignal.timeout(10000),
      headers: FETCH_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Extract job links from Taleo HTML
    const jobMatches = [...html.matchAll(/<a[^>]+href=["']([^"']*(?:jobdetail|requisition)[^"']*)["'][^>]*>([^<]*)</gi)];

    return jobMatches
      .filter(([, , title]) => {
        const t = (title || "").toLowerCase();
        return NURSE_KEYWORDS.some((kw) => t.includes(kw));
      })
      .slice(0, 5)
      .map(([, jobUrl, title]) => ({
        title: title.trim() || "Untitled",
        specialty: inferSpecialty(title),
        location: "",
        source_url: jobUrl.startsWith("http") ? jobUrl : baseTaleo + jobUrl,
        description: "",
        shift_type: inferShift(title),
      }));
  } catch {
    return [];
  }
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

function inferShift(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes("night") || t.includes("noc")) return "night";
  if (t.includes("day") || t.includes("am ")) return "day";
  if (t.includes("rotating")) return "rotating";
  if (t.includes("prn") || t.includes("per diem")) return "prn";
  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

  // 2. Get facilities with a known ATS (not "none" or "unknown")
  let query = supabase
    .from("facilities")
    .select("id, name, careers_url, ats_type, location_state, location_city")
    .not("careers_url", "is", null)
    .not("ats_type", "is", null)
    .not("ats_type", "eq", "none")
    .not("ats_type", "eq", "unknown");

  if (body.state) {
    query = query.eq("location_state", body.state.toUpperCase());
  }

  const { data: facilities, error: fetchErr } = await query.limit(100);
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const results = {
    facilities_processed: 0,
    jobs_created: 0,
    jobs_updated: 0,
    jobs_skipped: 0,
    details: [] as { name: string; ats_type: string; jobs_found: number }[],
    errors: [] as { facility: string; message: string }[],
  };

  // 3. Fetch jobs from each facility's ATS
  for (const facility of (facilities as FacilityRow[]) ?? []) {
    results.facilities_processed++;

    try {
      let scrapedJobs: ScrapedJob[] = [];

      switch (facility.ats_type) {
        case "workday":
          scrapedJobs = await fetchWorkdayJobs(facility.careers_url);
          break;
        case "greenhouse":
          scrapedJobs = await fetchGreenhouseJobs(facility.careers_url);
          break;
        case "lever":
          scrapedJobs = await fetchLeverJobs(facility.careers_url);
          break;
        case "smartrecruiters":
          scrapedJobs = await fetchSmartRecruitersJobs(facility.careers_url);
          break;
        case "avature":
          scrapedJobs = await fetchAvatureJobs(facility.careers_url);
          break;
        case "taleo":
          scrapedJobs = await fetchTaleoJobs(facility.careers_url);
          break;
        default:
          continue;
      }

      results.details.push({
        name: facility.name,
        ats_type: facility.ats_type,
        jobs_found: scrapedJobs.length,
      });

      // 4. Upsert into job_postings
      for (const job of scrapedJobs) {
        if (!job.source_url) continue;

        const contentHash = hashContent(job.title + job.description + job.location);

        const { data: existing } = await supabase
          .from("job_postings")
          .select("id, source_hash")
          .eq("source_url", job.source_url)
          .maybeSingle();

        if (existing) {
          if (existing.source_hash === contentHash) {
            await supabase
              .from("job_postings")
              .update({ last_seen_at: new Date().toISOString() })
              .eq("id", existing.id);
            results.jobs_skipped++;
          } else {
            await supabase
              .from("job_postings")
              .update({
                title: job.title,
                specialty: job.specialty,
                description: job.description,
                source_hash: contentHash,
                last_seen_at: new Date().toISOString(),
                ...(job.shift_type && { shift_type: job.shift_type }),
              })
              .eq("id", existing.id);
            results.jobs_updated++;
          }
        } else {
          const { error: insertErr } = await supabase
            .from("job_postings")
            .insert({
              facility_id: facility.id,
              title: job.title,
              specialty: job.specialty,
              description: job.description,
              source_url: job.source_url,
              source_hash: contentHash,
              data_source: "scraped",
              is_active: true,
              scraped_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
              ...(job.shift_type && { shift_type: job.shift_type }),
            });

          if (insertErr) {
            results.errors.push({ facility: facility.name, message: insertErr.message });
          } else {
            results.jobs_created++;
          }
        }
      }
    } catch (e) {
      results.errors.push({
        facility: facility.name,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return NextResponse.json(results);
}
