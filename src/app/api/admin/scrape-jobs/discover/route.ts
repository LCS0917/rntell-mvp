/**
 * POST /api/admin/scrape-jobs/discover
 * -------------------------------------
 * For each facility with a website, discovers career page URLs,
 * detects ATS type, and fetches job metadata from structured endpoints.
 *
 * Request body:
 *   { facility_ids?: string[]; state?: string }
 *   - facility_ids: specific facilities to scan (omit for all with websites)
 *   - state: filter facilities by state
 *
 * Returns:
 *   { facilities_scanned, ats_detected, jobs_created, jobs_updated, errors[] }
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
  location_city: string | null;
}

interface ScrapedJob {
  title: string;
  specialty: string;
  location: string;
  source_url: string;
  description: string;
  pay_rate_hourly: number | null;
  pay_package_total: number | null;
  contract_weeks: number | null;
  shift_type: string | null;
  requirements: string[];
}

type ATSType = "workday" | "greenhouse" | "lever" | "icims" | "smartrecruiters" | "unknown" | "none";

// ---------------------------------------------------------------------------
// ATS Detection — probe the website for known ATS patterns
// ---------------------------------------------------------------------------

const ATS_PATTERNS: { type: ATSType; patterns: RegExp[] }[] = [
  {
    type: "workday",
    patterns: [
      /myworkdayjobs\.com/,
      /wd\d+\.myworkday(site)?\.com/,
      /workday\.com\/.*\/job/,
    ],
  },
  {
    type: "greenhouse",
    patterns: [
      /boards\.greenhouse\.io/,
      /job-boards\.greenhouse\.io/,
    ],
  },
  {
    type: "lever",
    patterns: [
      /jobs\.lever\.co/,
    ],
  },
  {
    type: "icims",
    patterns: [
      /icims\.com/,
      /careers-.*\.icims\.com/,
    ],
  },
  {
    type: "smartrecruiters",
    patterns: [
      /jobs\.smartrecruiters\.com/,
    ],
  },
];

/** Common career page path suffixes to probe */
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

async function detectATS(website: string): Promise<{
  ats_type: ATSType;
  careers_url: string | null;
}> {
  // Normalize website URL
  let baseUrl = website.trim();
  if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;
  // Remove trailing slash
  baseUrl = baseUrl.replace(/\/+$/, "");

  // Strategy 1: Fetch the main page and look for ATS links in HTML
  try {
    const res = await fetch(baseUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" },
    });

    if (res.ok) {
      const html = await res.text();

      // Check for ATS links in the HTML
      for (const { type, patterns } of ATS_PATTERNS) {
        for (const pattern of patterns) {
          const match = html.match(new RegExp(`href=["']([^"']*${pattern.source}[^"']*)["']`, "i"));
          if (match) {
            return { ats_type: type, careers_url: match[1] };
          }
        }
      }

      // Check for career page links
      const careerLinkMatch = html.match(
        /href=["']([^"']*(?:career|jobs|employment|join|work-with-us|nursing)[^"']*)["']/i
      );
      if (careerLinkMatch) {
        let careerUrl = careerLinkMatch[1];
        // Make absolute if relative
        if (careerUrl.startsWith("/")) careerUrl = baseUrl + careerUrl;

        // Fetch the career page and check for ATS
        try {
          const careerRes = await fetch(careerUrl, {
            redirect: "follow",
            signal: AbortSignal.timeout(8000),
            headers: { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" },
          });
          if (careerRes.ok) {
            const careerHtml = await careerRes.text();
            // Check final URL after redirects (might redirect to ATS)
            const finalUrl = careerRes.url;
            for (const { type, patterns } of ATS_PATTERNS) {
              for (const pattern of patterns) {
                if (pattern.test(finalUrl)) {
                  return { ats_type: type, careers_url: finalUrl };
                }
                const atsMatch = careerHtml.match(
                  new RegExp(`(?:href|src|action)=["']([^"']*${pattern.source}[^"']*)["']`, "i")
                );
                if (atsMatch) {
                  return { ats_type: type, careers_url: atsMatch[1] };
                }
              }
            }
            return { ats_type: "unknown", careers_url: careerUrl };
          }
        } catch {
          // Career page fetch failed, continue
        }
      }
    }
  } catch {
    // Main page fetch failed, continue to path probing
  }

  // Strategy 2: Probe common career paths
  for (const path of CAREER_PATHS) {
    try {
      const probeUrl = baseUrl + path;
      const res = await fetch(probeUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" },
      });

      if (res.ok) {
        const finalUrl = res.url;
        // Check if redirected to an ATS
        for (const { type, patterns } of ATS_PATTERNS) {
          for (const pattern of patterns) {
            if (pattern.test(finalUrl)) {
              return { ats_type: type, careers_url: finalUrl };
            }
          }
        }

        const html = await res.text();
        for (const { type, patterns } of ATS_PATTERNS) {
          for (const pattern of patterns) {
            const match = html.match(
              new RegExp(`(?:href|src)=["']([^"']*${pattern.source}[^"']*)["']`, "i")
            );
            if (match) {
              return { ats_type: type, careers_url: match[1] };
            }
          }
        }

        // Found a career page but no known ATS
        return { ats_type: "unknown", careers_url: probeUrl };
      }
    } catch {
      // Probe failed, try next path
    }
  }

  return { ats_type: "none", careers_url: null };
}

// ---------------------------------------------------------------------------
// ATS-specific job fetchers
// ---------------------------------------------------------------------------

async function fetchWorkdayJobs(careersUrl: string, facilityName: string): Promise<ScrapedJob[]> {
  // Workday JSON API
  // URL pattern: https://ORG.wd5.myworkdayjobs.com/en-US/SITE/jobs
  // API: https://ORG.wd5.myworkdayjobs.com/wday/cxs/ORG/SITE/jobs
  try {
    const url = new URL(careersUrl);
    const host = url.host;
    const orgMatch = host.match(/^([^.]+)\./);
    if (!orgMatch) return [];
    const org = orgMatch[1];

    // Path is like /en-US/multicare/jobs — filter out locale segments and "jobs"/"login"
    const pathParts = url.pathname.split("/").filter(Boolean);
    const site = pathParts.find(
      (p) => !p.match(/^[a-z]{2}(-[A-Z]{2})?$/) && p !== "jobs" && p !== "login"
    ) || pathParts[0] || "External";

    const apiUrl = `https://${host}/wday/cxs/${org}/${site}/jobs`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)",
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit: 20,
        offset: 0,
        searchText: "nurse",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const postings = data.jobPostings ?? [];

    return postings.map((p: Record<string, unknown>) => ({
      title: (p.title as string) || "Untitled",
      specialty: inferSpecialty((p.title as string) || ""),
      location: (p.locationsText as string) || "",
      source_url: `https://${host}${(p.externalPath as string) || ""}`,
      description: (p.bulletFields as string[])?.join(". ") || "",
      pay_rate_hourly: null,
      pay_package_total: null,
      contract_weeks: null,
      shift_type: inferShift((p.title as string) || ""),
      requirements: [],
    }));
  } catch {
    return [];
  }
}

async function fetchGreenhouseJobs(careersUrl: string): Promise<ScrapedJob[]> {
  // Greenhouse API: https://boards-api.greenhouse.io/v1/boards/{board}/jobs
  try {
    const url = new URL(careersUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const board = pathParts[0] || "";
    if (!board) return [];

    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const jobs = data.jobs ?? [];

    return jobs
      .filter((j: Record<string, unknown>) => {
        const title = ((j.title as string) || "").toLowerCase();
        return title.includes("nurse") || title.includes("rn") || title.includes("nursing");
      })
      .slice(0, 20)
      .map((j: Record<string, unknown>) => ({
        title: (j.title as string) || "Untitled",
        specialty: inferSpecialty((j.title as string) || ""),
        location: ((j.location as Record<string, string>)?.name) || "",
        source_url: (j.absolute_url as string) || "",
        description: stripHtml((j.content as string) || "").slice(0, 500),
        pay_rate_hourly: null,
        pay_package_total: null,
        contract_weeks: null,
        shift_type: inferShift((j.title as string) || ""),
        requirements: [],
      }));
  } catch {
    return [];
  }
}

async function fetchLeverJobs(careersUrl: string): Promise<ScrapedJob[]> {
  // Lever API: https://api.lever.co/v0/postings/{company}?mode=json
  try {
    const url = new URL(careersUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const company = pathParts[0] || "";
    if (!company) return [];

    const apiUrl = `https://api.lever.co/v0/postings/${company}?mode=json`;
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" },
    });
    if (!res.ok) return [];
    const jobs: Record<string, unknown>[] = await res.json();

    return jobs
      .filter((j) => {
        const title = ((j.text as string) || "").toLowerCase();
        return title.includes("nurse") || title.includes("rn") || title.includes("nursing");
      })
      .slice(0, 20)
      .map((j) => ({
        title: (j.text as string) || "Untitled",
        specialty: inferSpecialty((j.text as string) || ""),
        location: ((j.categories as Record<string, string>)?.location) || "",
        source_url: (j.hostedUrl as string) || "",
        description: stripHtml((j.descriptionPlain as string) || (j.description as string) || "").slice(0, 500),
        pay_rate_hourly: null,
        pay_package_total: null,
        contract_weeks: null,
        shift_type: inferShift((j.text as string) || ""),
        requirements: [],
      }));
  } catch {
    return [];
  }
}

async function fetchICIMSJobs(careersUrl: string): Promise<ScrapedJob[]> {
  // iCIMS doesn't have a clean public API — return empty for now
  // Would need HTML parsing or their partner API
  return [];
}

async function fetchSmartRecruitersJobs(careersUrl: string): Promise<ScrapedJob[]> {
  // SmartRecruiters API: https://api.smartrecruiters.com/v1/companies/{company}/postings
  try {
    const url = new URL(careersUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const company = pathParts[0] || "";
    if (!company) return [];

    const apiUrl = `https://api.smartrecruiters.com/v1/companies/${company}/postings?q=nurse&limit=20`;
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RNTell/1.0)" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const jobs = data.content ?? [];

    return jobs.map((j: Record<string, unknown>) => ({
      title: (j.name as string) || "Untitled",
      specialty: inferSpecialty((j.name as string) || ""),
      location: ((j.location as Record<string, unknown>)?.city as string) || "",
      source_url: ((j.ref as string) || "").replace("api.smartrecruiters.com/v1/companies", "jobs.smartrecruiters.com"),
      description: "",
      pay_rate_hourly: null,
      pay_package_total: null,
      contract_weeks: null,
      shift_type: inferShift((j.name as string) || ""),
      requirements: [],
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
  if (t.includes("travel")) return "travel";
  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function hashContent(content: string): string {
  // Simple hash for dedup — not crypto-grade, just for change detection
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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = (await request.json()) as DiscoverBody;

  // 2. Get facilities to scan
  let query = supabase
    .from("facilities")
    .select("id, name, website, careers_url, ats_type, location_state, location_city")
    .not("website", "is", null);

  if (body.facility_ids?.length) {
    query = query.in("id", body.facility_ids);
  }
  if (body.state) {
    query = query.eq("location_state", body.state.toUpperCase());
  }

  const { data: facilities, error: fetchErr } = await query.limit(50);
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const results = {
    facilities_scanned: 0,
    ats_detected: 0,
    jobs_created: 0,
    jobs_updated: 0,
    jobs_skipped: 0,
    errors: [] as { facility: string; message: string }[],
  };

  // 3. Process each facility
  for (const facility of (facilities as FacilityRow[]) ?? []) {
    results.facilities_scanned++;

    try {
      // 3a. Detect ATS if not already known
      let atsType = facility.ats_type as ATSType | null;
      let careersUrl = facility.careers_url;

      if (!atsType || atsType === "unknown") {
        const detection = await detectATS(facility.website!);
        atsType = detection.ats_type;
        careersUrl = detection.careers_url;

        // Save detection result
        await supabase
          .from("facilities")
          .update({ ats_type: atsType, careers_url: careersUrl })
          .eq("id", facility.id);

        if (atsType !== "none" && atsType !== "unknown") {
          results.ats_detected++;
        }
      } else if (atsType !== "none") {
        results.ats_detected++;
      }

      // 3b. Fetch jobs from detected ATS
      if (!careersUrl || atsType === "none") continue;

      let scrapedJobs: ScrapedJob[] = [];

      switch (atsType) {
        case "workday":
          scrapedJobs = await fetchWorkdayJobs(careersUrl, facility.name);
          break;
        case "greenhouse":
          scrapedJobs = await fetchGreenhouseJobs(careersUrl);
          break;
        case "lever":
          scrapedJobs = await fetchLeverJobs(careersUrl);
          break;
        case "icims":
          scrapedJobs = await fetchICIMSJobs(careersUrl);
          break;
        case "smartrecruiters":
          scrapedJobs = await fetchSmartRecruitersJobs(careersUrl);
          break;
        default:
          // Unknown ATS — can't fetch structured data
          continue;
      }

      // 3c. Upsert jobs into job_postings
      for (const job of scrapedJobs) {
        if (!job.source_url) continue;

        const contentHash = hashContent(job.title + job.description + job.location);

        // Check if job already exists
        const { data: existing } = await supabase
          .from("job_postings")
          .select("id, source_hash")
          .eq("source_url", job.source_url)
          .maybeSingle();

        if (existing) {
          if (existing.source_hash === contentHash) {
            // No change — just update last_seen_at
            await supabase
              .from("job_postings")
              .update({ last_seen_at: new Date().toISOString() })
              .eq("id", existing.id);
            results.jobs_skipped++;
          } else {
            // Content changed — update
            await supabase
              .from("job_postings")
              .update({
                title: job.title,
                specialty: job.specialty,
                description: job.description,
                source_hash: contentHash,
                last_seen_at: new Date().toISOString(),
                ...(job.pay_rate_hourly && { pay_rate_hourly: job.pay_rate_hourly }),
                ...(job.pay_package_total && { pay_package_total: job.pay_package_total }),
                ...(job.shift_type && { shift_type: job.shift_type }),
                ...(job.contract_weeks && { contract_weeks: job.contract_weeks }),
              })
              .eq("id", existing.id);
            results.jobs_updated++;
          }
        } else {
          // New job — insert
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
              ...(job.pay_rate_hourly && { pay_rate_hourly: job.pay_rate_hourly }),
              ...(job.pay_package_total && { pay_package_total: job.pay_package_total }),
              ...(job.shift_type && { shift_type: job.shift_type }),
              ...(job.contract_weeks && { contract_weeks: job.contract_weeks }),
              ...(job.requirements.length > 0 && { requirements: job.requirements }),
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
