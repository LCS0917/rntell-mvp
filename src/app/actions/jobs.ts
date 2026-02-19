"use server";

import { createClient } from "@/utils/supabase/server";
import { GSA_WEEKLY_BENCHMARK } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobFilters = {
  specialty?: string[];
  state?: string;
  shift_type?: string[];
  contract_weeks?: string;
  min_weekly_pay?: number;
  start_date_window?: string; // "asap" | "30" | "60" | ""
  source_filter?: string; // "all" | "direct_only"
  sort?: string; // "newest" | "highest_pay" | "soonest_start"
};

export type PublicJobPosting = {
  id: string;
  title: string;
  specialty: string;
  shift_type: string | null;
  pay_rate_hourly: number | null;
  pay_package_total: number | null;
  stipend_housing: number | null;
  stipend_meals: number | null;
  contract_weeks: number | null;
  start_date: string | null;
  requirements: string[];
  description: string | null;
  is_active: boolean;
  slots_available: number | null;
  data_source: string;
  created_at: string;
  facilities: {
    id: string;
    name: string;
    location_city: string | null;
    location_state: string | null;
    is_claimed: boolean;
  } | null;
  has_applied?: boolean;
  beats_market_rate: boolean;
  match_score?: number;
  match_reasons?: string[];
};

export type JobDetail = PublicJobPosting & {
  travel_reimbursement: number | null;
  facility_reviews_avg?: number;
  facility_review_count?: number;
  source_url?: string | null;
};

// Legacy alias used by existing dashboard nurse/jobs page
export type JobPosting = PublicJobPosting;

export type ApplicationFilters = {
  job_id?: string;
  status?: string[];
  specialty?: string;
  verified_only?: boolean;
};

export type ApplicationWithDetails = {
  id: string;
  status: string;
  cover_note: string | null;
  created_at: string;
  updated_at: string;
  job_postings: {
    id: string;
    title: string;
    specialty: string;
    facility_id: string;
    pay_package_total: number | null;
    shift_type: string | null;
  };
  nurses: {
    id: string;
    specialty: string | null;
    years_experience: number | null;
    license_state: string | null;
    license_compact: boolean;
    license_verified: boolean;
    verification_status: string;
    profiles: {
      full_name: string | null;
    } | null;
  } | null;
};

export type NurseApplicationWithJob = {
  id: string;
  status: string;
  cover_note: string | null;
  created_at: string;
  updated_at: string;
  job_postings: {
    id: string;
    title: string;
    specialty: string;
    pay_package_total: number | null;
    contract_weeks: number | null;
    start_date: string | null;
    facilities: {
      id: string;
      name: string;
      location_city: string | null;
      location_state: string | null;
    } | null;
  };
};

// ---------------------------------------------------------------------------
// Smart Match Scorer
// ---------------------------------------------------------------------------

type NurseProfile = {
  specialty?: string | null;
  license_state?: string | null;
  travel_preferences?: { preferred_states?: string[] } | null;
};

function scoreJobMatch(
  job: PublicJobPosting,
  nurse: NurseProfile
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Specialty match: 40 pts
  if (
    nurse.specialty &&
    job.specialty.toLowerCase() === nurse.specialty.toLowerCase()
  ) {
    score += 40;
    reasons.push(`Matches your ${nurse.specialty} specialty`);
  }

  // License state match: 30 pts
  if (
    nurse.license_state &&
    job.facilities?.location_state?.toUpperCase() ===
      nurse.license_state.toUpperCase()
  ) {
    score += 30;
    reasons.push(
      `In your license state (${job.facilities.location_state})`
    );
  }

  // Location proximity / preferred states: 20 pts
  const preferred = nurse.travel_preferences?.preferred_states ?? [];
  if (
    preferred.length > 0 &&
    job.facilities?.location_state &&
    preferred.some(
      (s: string) =>
        s.toUpperCase() === job.facilities!.location_state!.toUpperCase()
    )
  ) {
    score += 20;
    reasons.push(
      `Near your preferred location (${job.facilities.location_state})`
    );
  }

  // Start date alignment: 10 pts — upcoming starts get bonus
  if (job.start_date) {
    const daysOut = Math.ceil(
      (new Date(job.start_date).getTime() - Date.now()) / 86_400_000
    );
    if (daysOut >= 0 && daysOut <= 30) {
      score += 10;
      reasons.push("Starting soon");
    }
  }

  return { score, reasons };
}

// ---------------------------------------------------------------------------
// Public Job Board (no auth required to read)
// ---------------------------------------------------------------------------

export async function getPublicJobPostings(
  filters: JobFilters = {}
): Promise<{ data: PublicJobPosting[]; total: number; error?: string }> {
  const supabase = await createClient();

  let query = supabase
    .from("job_postings")
    .select(
      `
      id, title, specialty, shift_type,
      pay_rate_hourly, pay_package_total,
      stipend_housing, stipend_meals,
      contract_weeks, start_date,
      requirements, description,
      is_active, slots_available, data_source, created_at,
      facilities (
        id, name, location_city, location_state, is_claimed
      )
    `
    )
    .eq("is_active", true);

  // Source filter
  if (filters.source_filter === "direct_only") {
    query = query.eq("data_source", "self_reported");
  }

  // Specialty filter (array of specialties)
  if (filters.specialty && filters.specialty.length > 0) {
    query = query.in("specialty", filters.specialty);
  }

  // Shift type filter (array)
  if (filters.shift_type && filters.shift_type.length > 0) {
    query = query.in("shift_type", filters.shift_type);
  }

  // Contract weeks
  if (filters.contract_weeks) {
    query = query.eq("contract_weeks", parseInt(filters.contract_weeks));
  }

  // Sort
  const sort = filters.sort || "newest";
  if (sort === "highest_pay") {
    query = query.order("pay_package_total", {
      ascending: false,
      nullsFirst: false,
    });
  } else if (sort === "soonest_start") {
    query = query.order("start_date", {
      ascending: true,
      nullsFirst: false,
    });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return { error: error.message, data: [], total: 0 };

  let rows = (data ?? []) as unknown as PublicJobPosting[];

  // Client-side filtering for joined table fields and range values
  if (filters.state) {
    rows = rows.filter(
      (r) =>
        r.facilities?.location_state?.toUpperCase() ===
        filters.state!.toUpperCase()
    );
  }

  if (filters.min_weekly_pay) {
    rows = rows.filter(
      (r) =>
        r.pay_package_total && r.pay_package_total >= filters.min_weekly_pay!
    );
  }

  if (filters.start_date_window && filters.start_date_window !== "") {
    const now = new Date();
    rows = rows.filter((r) => {
      if (!r.start_date) return false;
      const start = new Date(r.start_date);
      const daysOut = Math.ceil(
        (start.getTime() - now.getTime()) / 86_400_000
      );
      if (filters.start_date_window === "asap") return daysOut <= 14;
      return daysOut <= parseInt(filters.start_date_window!);
    });
  }

  const total = rows.length;

  // Check if user is logged in for has_applied
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let appliedJobIds: Set<string> = new Set();
  if (user) {
    const { data: apps } = await supabase
      .from("applications")
      .select("job_id")
      .eq("nurse_id", user.id);
    if (apps) {
      appliedJobIds = new Set(apps.map((a) => a.job_id));
    }
  }

  const enriched = rows.map((job) => ({
    ...job,
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    has_applied: appliedJobIds.has(job.id),
    beats_market_rate: (job.pay_package_total ?? 0) >= GSA_WEEKLY_BENCHMARK,
  }));

  return { data: enriched, total };
}

// ---------------------------------------------------------------------------
// Smart-matched jobs for logged-in nurse
// ---------------------------------------------------------------------------

export async function getMatchedJobs(): Promise<{
  data: PublicJobPosting[];
  hasProfile: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], hasProfile: false };

  // Get nurse profile
  const { data: nurse } = await supabase
    .from("nurses")
    .select("specialty, license_state, travel_preferences")
    .eq("id", user.id)
    .single();

  if (!nurse || (!nurse.specialty && !nurse.license_state)) {
    return { data: [], hasProfile: false };
  }

  // Get all active jobs
  const { data: jobs } = await supabase
    .from("job_postings")
    .select(
      `
      id, title, specialty, shift_type,
      pay_rate_hourly, pay_package_total,
      stipend_housing, stipend_meals,
      contract_weeks, start_date,
      requirements, description,
      is_active, slots_available, data_source, created_at,
      facilities (
        id, name, location_city, location_state, is_claimed
      )
    `
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (!jobs) return { data: [], hasProfile: true };

  // Get applied jobs
  const { data: apps } = await supabase
    .from("applications")
    .select("job_id")
    .eq("nurse_id", user.id);
  const appliedJobIds = new Set((apps ?? []).map((a) => a.job_id));

  const scored = (jobs as unknown as PublicJobPosting[])
    .map((job) => {
      const { score, reasons } = scoreJobMatch(job, nurse);
      return {
        ...job,
        requirements: Array.isArray(job.requirements) ? job.requirements : [],
        has_applied: appliedJobIds.has(job.id),
        beats_market_rate:
          (job.pay_package_total ?? 0) >= GSA_WEEKLY_BENCHMARK,
        match_score: score,
        match_reasons: reasons,
      };
    })
    .filter((j) => j.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 5);

  return { data: scored, hasProfile: true };
}

// ---------------------------------------------------------------------------
// Single Job Detail (public)
// ---------------------------------------------------------------------------

export async function getJobById(
  id: string
): Promise<{ data: JobDetail | null; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_postings")
    .select(
      `
      id, title, specialty, shift_type,
      pay_rate_hourly, pay_package_total,
      stipend_housing, stipend_meals, travel_reimbursement,
      contract_weeks, start_date,
      requirements, description,
      is_active, slots_available, data_source, source_url, created_at,
      facilities (
        id, name, location_city, location_state, is_claimed
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null };

  // Get facility review summary
  let reviewAvg: number | undefined;
  let reviewCount: number | undefined;
  if (data.facilities) {
    const fac = data.facilities as unknown as { id: string };
    const fid = fac.id;
    const { data: reviews } = await supabase
      .from("facility_reviews")
      .select("rating_overall")
      .eq("facility_id", fid);
    if (reviews && reviews.length > 0) {
      reviewCount = reviews.length;
      reviewAvg =
        reviews.reduce(
          (sum: number, r: { rating_overall: number }) =>
            sum + r.rating_overall,
          0
        ) / reviews.length;
    }
  }

  // Check has_applied
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let hasApplied = false;
  if (user) {
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", id)
      .eq("nurse_id", user.id)
      .single();
    hasApplied = !!existing;
  }

  const job = data as unknown as JobDetail;
  return {
    data: {
      ...job,
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
      has_applied: hasApplied,
      beats_market_rate: (job.pay_package_total ?? 0) >= GSA_WEEKLY_BENCHMARK,
      facility_reviews_avg: reviewAvg,
      facility_review_count: reviewCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Application actions
// ---------------------------------------------------------------------------

export async function applyToJob(data: {
  job_id: string;
  cover_note?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check if already applied
  const { data: existing } = await supabase
    .from("applications")
    .select("id, status, created_at")
    .eq("job_id", data.job_id)
    .eq("nurse_id", user.id)
    .single();

  if (existing)
    return {
      error: "You have already applied to this job.",
      existing: { status: existing.status, created_at: existing.created_at },
    };

  const { error } = await supabase.from("applications").insert({
    job_id: data.job_id,
    nurse_id: user.id,
    cover_note: data.cover_note || null,
    status: "submitted",
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getApplicationsForNurse(): Promise<{
  data: NurseApplicationWithJob[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
      id, status, cover_note, created_at, updated_at,
      job_postings!inner (
        id, title, specialty, pay_package_total, contract_weeks, start_date,
        facilities ( id, name, location_city, location_state )
      )
    `
    )
    .eq("nurse_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: (data ?? []) as unknown as NurseApplicationWithJob[] };
}

const VALID_STATUSES = [
  "submitted",
  "reviewing",
  "interview",
  "offered",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export async function updateApplicationStatus(
  applicationId: string,
  status: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Validate status value
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { error: "Invalid status" };
  }

  // Fetch the application to check ownership
  const { data: app } = await supabase
    .from("applications")
    .select("nurse_id, job_postings!inner ( facility_id )")
    .eq("id", applicationId)
    .single();

  if (!app) return { error: "Application not found" };

  const facilityId = (app.job_postings as unknown as { facility_id: string })
    .facility_id;

  // Nurses can only withdraw their own applications
  if (app.nurse_id === user.id) {
    if (status !== "withdrawn") {
      return { error: "Nurses can only withdraw applications" };
    }
  } else if (facilityId === user.id) {
    // Facility can update to any status except withdrawn
    if (status === "withdrawn") {
      return { error: "Only the applicant can withdraw" };
    }
  } else {
    return { error: "Not authorized to update this application" };
  }

  const { error } = await supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Job Alerts (email capture for logged-out users)
// ---------------------------------------------------------------------------

export async function subscribeJobAlert(data: {
  name: string;
  email: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("job_alerts").insert({
    name: data.name,
    email: data.email,
  });

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Facility Job Posting Management (existing)
// ---------------------------------------------------------------------------

export type FacilityJobPosting = {
  id: string;
  title: string;
  specialty: string;
  shift_type: string | null;
  pay_rate_hourly: number | null;
  pay_package_total: number | null;
  stipend_housing: number | null;
  stipend_meals: number | null;
  contract_weeks: number | null;
  start_date: string | null;
  requirements: string[];
  description: string | null;
  is_active: boolean;
  slots_available: number | null;
  created_at: string;
  data_source: string;
};

export async function getFacilityJobPostings(): Promise<{
  data: FacilityJobPosting[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("job_postings")
    .select(
      `id, title, specialty, shift_type, pay_rate_hourly, pay_package_total,
       stipend_housing, stipend_meals, contract_weeks, start_date,
       requirements, description, is_active, slots_available, created_at, data_source`
    )
    .eq("facility_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };

  const rows = (data ?? []).map((r) => ({
    ...r,
    requirements: Array.isArray(r.requirements) ? r.requirements : [],
  })) as FacilityJobPosting[];

  return { data: rows };
}

export async function getFacilityJobPostingById(
  id: string
): Promise<{ data: FacilityJobPosting | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("job_postings")
    .select(
      `id, title, specialty, shift_type, pay_rate_hourly, pay_package_total,
       stipend_housing, stipend_meals, contract_weeks, start_date,
       requirements, description, is_active, slots_available, created_at, data_source`
    )
    .eq("id", id)
    .eq("facility_id", user.id)
    .single();

  if (error) return { data: null, error: error.message };

  return {
    data: {
      ...data,
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
    } as FacilityJobPosting,
  };
}

export type CreateJobInput = {
  title: string;
  specialty: string;
  shift_type: string;
  pay_rate_hourly: number;
  stipend_housing: number;
  stipend_meals: number;
  pay_package_total: number;
  contract_weeks: number | null;
  start_date: string | null;
  slots_available: number;
  requirements: string[];
  description: string;
};

export async function createJobPosting(input: CreateJobInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("job_postings").insert({
    facility_id: user.id,
    data_source: "self_reported",
    title: input.title,
    specialty: input.specialty,
    shift_type: input.shift_type,
    pay_rate_hourly: input.pay_rate_hourly,
    stipend_housing: input.stipend_housing,
    stipend_meals: input.stipend_meals,
    pay_package_total: input.pay_package_total,
    contract_weeks: input.contract_weeks,
    start_date: input.start_date || null,
    slots_available: input.slots_available,
    requirements: input.requirements,
    description: input.description || null,
    is_active: true,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateJobPosting(id: string, input: CreateJobInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("job_postings")
    .update({
      title: input.title,
      specialty: input.specialty,
      shift_type: input.shift_type,
      pay_rate_hourly: input.pay_rate_hourly,
      stipend_housing: input.stipend_housing,
      stipend_meals: input.stipend_meals,
      pay_package_total: input.pay_package_total,
      contract_weeks: input.contract_weeks,
      start_date: input.start_date || null,
      slots_available: input.slots_available,
      requirements: input.requirements,
      description: input.description || null,
    })
    .eq("id", id)
    .eq("facility_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleJobActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("job_postings")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("facility_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteJobPosting(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Soft delete: set is_active = false
  const { error } = await supabase
    .from("job_postings")
    .update({ is_active: false })
    .eq("id", id)
    .eq("facility_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Facility Talent Pipeline (existing)
// ---------------------------------------------------------------------------

export async function getApplicationsForFacility(
  filters?: ApplicationFilters
): Promise<{
  data: ApplicationWithDetails[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  let query = supabase
    .from("applications")
    .select(
      `
      id, status, cover_note, created_at, updated_at,
      job_postings!inner ( id, title, specialty, facility_id, pay_package_total, shift_type ),
      nurses ( id, specialty, years_experience, license_state, license_compact, license_verified, verification_status,
        profiles ( full_name )
      )
    `
    )
    .eq("job_postings.facility_id", user.id);

  // Server-side filters on the applications table
  if (filters?.job_id) {
    query = query.eq("job_id", filters.job_id);
  }
  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };

  let rows = (data ?? []) as unknown as ApplicationWithDetails[];

  // Client-side filters on joined fields
  if (filters?.specialty) {
    rows = rows.filter(
      (r) =>
        r.nurses?.specialty?.toLowerCase() === filters.specialty!.toLowerCase()
    );
  }
  if (filters?.verified_only) {
    rows = rows.filter(
      (r) =>
        r.nurses?.verification_status === "verified" &&
        r.nurses?.license_verified
    );
  }

  return { data: rows };
}

export async function getApplicationById(
  applicationId: string
): Promise<{ data: ApplicationWithDetails | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
      id, status, cover_note, created_at, updated_at,
      job_postings!inner ( id, title, specialty, facility_id, pay_package_total, shift_type ),
      nurses ( id, specialty, years_experience, license_state, license_compact, license_verified, verification_status,
        profiles ( full_name )
      )
    `
    )
    .eq("id", applicationId)
    .eq("job_postings.facility_id", user.id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as unknown as ApplicationWithDetails };
}
