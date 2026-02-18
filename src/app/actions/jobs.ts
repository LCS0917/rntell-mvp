"use server";

import { createClient } from "@/utils/supabase/server";
import { GSA_WEEKLY_BENCHMARK } from "@/lib/constants";

export type JobFilters = {
  specialty?: string;
  state?: string;
  minPay?: number;
};

export type JobPosting = {
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
  facilities: {
    id: string;
    name: string;
    location_city: string | null;
    location_state: string | null;
  } | null;
  has_applied?: boolean;
  beats_market_rate: boolean; // Computed: pay >= GSA benchmark ("Beats Market Rate")
};

export async function getJobPostings(filters: JobFilters = {}): Promise<{
  data: JobPosting[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("job_postings")
    .select(
      `
      id,
      title,
      specialty,
      shift_type,
      pay_rate_hourly,
      pay_package_total,
      stipend_housing,
      stipend_meals,
      contract_weeks,
      start_date,
      requirements,
      description,
      is_active,
      slots_available,
      created_at,
      facilities (
        id,
        name,
        location_city,
        location_state
      )
    `
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (filters.specialty) {
    query = query.ilike("specialty", `%${filters.specialty}%`);
  }
  if (filters.state) {
    query = query.ilike("facilities.location_state", `%${filters.state}%`);
  }

  const { data, error } = await query;

  if (error) return { error: error.message, data: [] };

  // Get nurse's existing applications to mark "already applied"
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

  let rows = (data ?? []) as unknown as JobPosting[];

  // Filter out null facilities when filtering by state
  if (filters.state) {
    rows = rows.filter((r) => r.facilities !== null);
  }

  // Filter by minimum pay
  if (filters.minPay) {
    rows = rows.filter(
      (r) => r.pay_package_total && r.pay_package_total >= filters.minPay!
    );
  }

  const enriched = rows.map((job) => ({
    ...job,
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    has_applied: appliedJobIds.has(job.id),
    beats_market_rate:
      (job.pay_package_total ?? 0) >= GSA_WEEKLY_BENCHMARK,
  }));

  return { data: enriched };
}

export async function applyToJob(data: { job_id: string; cover_note?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check if already applied
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("job_id", data.job_id)
    .eq("nurse_id", user.id)
    .single();

  if (existing) return { error: "You have already applied to this job." };

  const { error } = await supabase.from("applications").insert({
    job_id: data.job_id,
    nurse_id: user.id,
    cover_note: data.cover_note || null,
    status: "submitted",
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getApplicationsForFacility(): Promise<{
  data: ApplicationWithDetails[];
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
      id,
      status,
      cover_note,
      created_at,
      job_postings!inner (
        id,
        title,
        specialty,
        facility_id
      ),
      nurses (
        id,
        specialty,
        years_experience,
        license_state,
        license_compact,
        license_verified,
        verification_status
      )
    `
    )
    .eq("job_postings.facility_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };

  const rows = (data ?? []) as unknown as ApplicationWithDetails[];
  return { data: rows };
}

export type ApplicationWithDetails = {
  id: string;
  status: string;
  cover_note: string | null;
  created_at: string;
  job_postings: {
    id: string;
    title: string;
    specialty: string;
    facility_id: string;
  };
  nurses: {
    id: string;
    specialty: string | null;
    years_experience: number | null;
    license_state: string | null;
    license_compact: boolean;
    license_verified: boolean;
    verification_status: string;
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
      id,
      status,
      cover_note,
      created_at,
      updated_at,
      job_postings!inner (
        id,
        title,
        specialty,
        pay_package_total,
        contract_weeks,
        start_date,
        facilities (
          id,
          name,
          location_city,
          location_state
        )
      )
    `
    )
    .eq("nurse_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };

  const rows = (data ?? []) as unknown as NurseApplicationWithJob[];
  return { data: rows };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId);

  if (error) return { error: error.message };
  return { success: true };
}
