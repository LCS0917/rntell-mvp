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
 *     jobs_deactivated, details: { name, ats_type, jobs_found }[], errors[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Allow up to 120s on Vercel (Pro plan) — default is 10s
export const maxDuration = 120;

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

interface FetchResult {
  jobs: ScrapedJob[];
  debug?: string; // diagnostic info when 0 jobs found
}

// ---------------------------------------------------------------------------
// ATS-specific fetchers — each returns up to 5 contract/travel nurse jobs
// ---------------------------------------------------------------------------

const NURSE_KEYWORDS = ["nurse", "rn ", "travel rn", "contract rn", "nursing", "registered nurse"];
const CONTRACT_KEYWORDS = ["travel", "contract", "per diem", "prn", "temp", "locum"];

const FETCH_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" };

async function fetchWorkdayJobs(careersUrl: string): Promise<FetchResult> {
  try {
    const url = new URL(careersUrl);
    const host = url.host;
    const orgMatch = host.match(/^([^.]+)\./);
    if (!orgMatch) return { jobs: [], debug: "No org in host" };
    const org = orgMatch[1];

    // Filter out locale segments (en-US) and known path words
    const pathParts = url.pathname.split("/").filter(Boolean);
    const siteCandidates = pathParts.filter(
      (p) => !/^[a-z]{2}(-[A-Z]{2})?$/.test(p) && p !== "jobs" && p !== "login"
    );

    // Try each candidate site name, plus "External" as fallback
    const candidates = [...new Set([...siteCandidates, "External"])];
    const triedEndpoints: string[] = [];

    for (const site of candidates) {
      const apiUrl = `https://${host}/wday/cxs/${org}/${site}/jobs`;
      triedEndpoints.push(`${site}→`);
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...FETCH_HEADERS },
        body: JSON.stringify({
          appliedFacets: {},
          limit: 20,
          offset: 0,
          searchText: "nurse",
          jobSortBy: "postedOn",
        }),
        signal: AbortSignal.timeout(10000),
      });

      triedEndpoints[triedEndpoints.length - 1] += `${res.status}`;
      if (!res.ok) continue;
      const data = await res.json();
      const postings = data.jobPostings ?? [];
      triedEndpoints[triedEndpoints.length - 1] += `(${postings.length} raw)`;
      if (postings.length === 0) continue;

      const filtered = postings
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
          source_url: `https://${host}/${site}${p.externalPath as string}`,
          description: (p.bulletFields as string[])?.join(". ") || "",
          shift_type: inferShift((p.title as string) || ""),
        }));

      return { jobs: filtered, debug: triedEndpoints.join(", ") };
    }
    return { jobs: [], debug: `Tried: ${triedEndpoints.join(", ")}` };
  } catch (err) {
    return { jobs: [], debug: `Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function fetchGreenhouseJobs(careersUrl: string): Promise<FetchResult> {
  try {
    const url = new URL(careersUrl);
    const board = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!board) return { jobs: [], debug: "No board in path" };

    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true&updated_after=${new Date(Date.now() - 30 * 86400000).toISOString()}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000), headers: FETCH_HEADERS });
    if (!res.ok) return { jobs: [], debug: `HTTP ${res.status}` };
    const data = await res.json();

    const jobs = (data.jobs ?? [])
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
    return { jobs, debug: `${(data.jobs ?? []).length} raw, ${jobs.length} after filter` };
  } catch (err) {
    return { jobs: [], debug: `Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function fetchLeverJobs(careersUrl: string): Promise<FetchResult> {
  try {
    const url = new URL(careersUrl);
    const company = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!company) return { jobs: [], debug: "No company in path" };

    const apiUrl = `https://api.lever.co/v0/postings/${company}?mode=json&sort=createdAt&direction=desc`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000), headers: FETCH_HEADERS });
    if (!res.ok) return { jobs: [], debug: `HTTP ${res.status}` };
    const rawJobs: Record<string, unknown>[] = await res.json();

    const jobs = rawJobs
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
    return { jobs, debug: `${rawJobs.length} raw, ${jobs.length} after filter` };
  } catch (err) {
    return { jobs: [], debug: `Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function fetchSmartRecruitersJobs(careersUrl: string): Promise<FetchResult> {
  try {
    const url = new URL(careersUrl);
    const company = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!company) return { jobs: [], debug: "No company in path" };

    const apiUrl = `https://api.smartrecruiters.com/v1/companies/${company}/postings?q=nurse&limit=20&sort=posted&order=desc`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000), headers: FETCH_HEADERS });
    if (!res.ok) return { jobs: [], debug: `HTTP ${res.status}` };
    const data = await res.json();

    const jobs = (data.content ?? [])
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
    return { jobs, debug: `${(data.content ?? []).length} raw, ${jobs.length} after filter` };
  } catch (err) {
    return { jobs: [], debug: `Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function fetchAvatureJobs(careersUrl: string): Promise<FetchResult> {
  try {
    const parsedUrl = new URL(careersUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;

    const res = await fetch(baseUrl, {
      signal: AbortSignal.timeout(10000),
      headers: FETCH_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return { jobs: [], debug: `HTTP ${res.status} from ${baseUrl}` };
    const html = await res.text();

    const jobIdMatches = [...html.matchAll(/<a[^>]+href=["']([^"']*jobId=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const pathMatches = [...html.matchAll(/<a[^>]+href=["']([^"']*(?:\/job[s]?\/|\/opportunities\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const allMatches = [...jobIdMatches, ...pathMatches];

    const jobs = allMatches
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
    return { jobs, debug: `${allMatches.length} links found, ${jobs.length} after filter` };
  } catch (err) {
    return { jobs: [], debug: `Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function fetchTaleoJobs(careersUrl: string): Promise<FetchResult> {
  try {
    const url = new URL(careersUrl);
    const baseTaleo = `${url.protocol}//${url.host}`;

    const res = await fetch(careersUrl, {
      signal: AbortSignal.timeout(10000),
      headers: FETCH_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return { jobs: [], debug: `HTTP ${res.status}` };
    const html = await res.text();

    const jobMatches = [...html.matchAll(/<a[^>]+href=["']([^"']*(?:jobdetail|requisition)[^"']*)["'][^>]*>([^<]*)</gi)];

    const jobs = jobMatches
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
    return { jobs, debug: `${jobMatches.length} links found, ${jobs.length} after filter` };
  } catch (err) {
    return { jobs: [], debug: `Error: ${err instanceof Error ? err.message : String(err)}` };
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

/** Quick HEAD check — returns true if URL resolves to a real page (not generic careers) */
async function isValidJobUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(2000),
      headers: FETCH_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return false;
    // Reject if redirected to a generic careers/home page
    const finalUrl = res.url.toLowerCase();
    if (finalUrl.endsWith("/careers") || finalUrl.endsWith("/careers/") || finalUrl.endsWith("/jobs") || finalUrl.endsWith("/jobs/")) return false;
    return true;
  } catch {
    return false;
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
    details: [] as { name: string; ats_type: string; jobs_found: number; jobs_deactivated: number; debug?: string }[],
    errors: [] as { facility: string; message: string }[],
  };

  // 3. Fetch jobs from each facility's ATS — process in parallel batches of 5
  const BATCH_SIZE = 5;
  const allFacilities = (facilities as FacilityRow[]) ?? [];

  async function processFacility(facility: FacilityRow) {
    try {
      let fetchResult: FetchResult = { jobs: [] };

      switch (facility.ats_type) {
        case "workday":
          fetchResult = await fetchWorkdayJobs(facility.careers_url);
          break;
        case "greenhouse":
          fetchResult = await fetchGreenhouseJobs(facility.careers_url);
          break;
        case "lever":
          fetchResult = await fetchLeverJobs(facility.careers_url);
          break;
        case "smartrecruiters":
          fetchResult = await fetchSmartRecruitersJobs(facility.careers_url);
          break;
        case "avature":
          fetchResult = await fetchAvatureJobs(facility.careers_url);
          break;
        case "taleo":
          fetchResult = await fetchTaleoJobs(facility.careers_url);
          break;
        default:
          return;
      }

      // 4. Filter jobs with valid source URLs + validate they point to real pages
      const rawJobs = fetchResult.jobs.filter((j) => !!j.source_url);
      const validJobs: ScrapedJob[] = [];
      for (const job of rawJobs) {
        const ok = await isValidJobUrl(job.source_url);
        if (ok) validJobs.push(job);
      }

      let facilityDeactivated = 0;

      // 5. Upsert valid jobs into job_postings
      const seenSourceUrls = new Set<string>();
      for (const job of validJobs) {
        seenSourceUrls.add(job.source_url);

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
              .update({ last_seen_at: new Date().toISOString(), is_active: true })
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
                is_active: true,
                ...(job.shift_type && { shift_type: job.shift_type }),
              })
              .eq("id", existing.id);
            results.jobs_updated++;
          }
        } else {
          // Plain insert — the select+maybeSingle above already handles dedup.
          // If a race condition causes a duplicate source_url, catch the error gracefully.
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
            // Duplicate source_url — treat as skip, not error
            if (insertErr.code === "23505") {
              results.jobs_skipped++;
            } else {
              results.errors.push({ facility: facility.name, message: insertErr.message });
            }
          } else {
            results.jobs_created++;
          }
        }
      }

      // 6. Deactivate stale jobs
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
          facilityDeactivated++;
        }
      }

      results.jobs_deactivated += facilityDeactivated;
      results.facilities_processed++;

      results.details.push({
        name: facility.name,
        ats_type: facility.ats_type,
        jobs_found: validJobs.length,
        jobs_deactivated: facilityDeactivated,
        debug: fetchResult.debug + (rawJobs.length > validJobs.length ? ` | ${rawJobs.length - validJobs.length} bad URLs skipped` : ""),
      });
    } catch (e) {
      results.facilities_processed++;
      results.errors.push({
        facility: facility.name,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  for (let i = 0; i < allFacilities.length; i += BATCH_SIZE) {
    const batch = allFacilities.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(processFacility));
  }

  return NextResponse.json(results);
}
