"use server";

import { createClient } from "@/utils/supabase/server";

const MOCK_GSA_WEEKLY_RATE = 2000;

export type SalaryFilters = {
  state?: string;
  specialty?: string;
};

export type SalaryReport = {
  id: string;
  specialty: string | null;
  shift_type: string | null;
  hourly_rate: number;
  stipend_housing: number;
  stipend_meals: number;
  agency_gap_detected: boolean;
  gsa_rate_comparison: number | null;
  is_verified: boolean;
  reported_at: string;
  facilities: {
    id: string;
    name: string;
    location_city: string | null;
    location_state: string | null;
  } | null;
};

export async function submitSalaryReport(data: {
  facility_id: string;
  specialty: string;
  shift_type?: string;
  hourly_rate: number;
  stipend_housing: number;
  stipend_meals: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const weeklyPay = data.hourly_rate * 36 + data.stipend_housing + data.stipend_meals;
  const agencyGapDetected = weeklyPay < MOCK_GSA_WEEKLY_RATE;
  const gsaComparison = ((weeklyPay - MOCK_GSA_WEEKLY_RATE) / MOCK_GSA_WEEKLY_RATE) * 100;

  const { error } = await supabase.from("salary_reports").insert({
    facility_id: data.facility_id,
    nurse_id: user.id,
    specialty: data.specialty,
    shift_type: data.shift_type || null,
    hourly_rate: data.hourly_rate,
    stipend_housing: data.stipend_housing,
    stipend_meals: data.stipend_meals,
    agency_gap_detected: agencyGapDetected,
    gsa_rate_comparison: parseFloat(gsaComparison.toFixed(2)),
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getSalaryReports(filters: SalaryFilters = {}) {
  const supabase = await createClient();

  let query = supabase
    .from("salary_reports")
    .select(
      `
      id,
      specialty,
      shift_type,
      hourly_rate,
      stipend_housing,
      stipend_meals,
      agency_gap_detected,
      gsa_rate_comparison,
      is_verified,
      reported_at,
      facilities (
        id,
        name,
        location_city,
        location_state
      )
    `
    )
    .order("reported_at", { ascending: false });

  if (filters.specialty) {
    query = query.ilike("specialty", `%${filters.specialty}%`);
  }

  if (filters.state) {
    query = query.ilike("facilities.location_state", `%${filters.state}%`);
  }

  const { data, error } = await query;

  if (error) return { error: error.message, data: [] as SalaryReport[] };

  const rows = (data ?? []) as unknown as SalaryReport[];

  // When filtering by state via joined table, Supabase returns rows with null
  // facilities if the join doesn't match. Filter those out.
  const filtered = filters.state
    ? rows.filter((r) => r.facilities !== null)
    : rows;

  return { data: filtered };
}

export async function getFacilitiesList() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("facilities")
    .select("id, name, location_city, location_state")
    .order("name");

  if (error) return { error: error.message, data: [] };
  return { data: data ?? [] };
}
