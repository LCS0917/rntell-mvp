"use server";

import { createClient } from "@/utils/supabase/server";

const MOCK_GSA_WEEKLY_RATE = 2000;

export async function submitReview(data: {
  facility_id: string;
  rating_overall: number;
  rating_safety: number;
  rating_staffing: number;
  rating_culture: number;
  pros: string;
  cons: string;
  would_return: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Store pros/cons in the existing review_body column as structured text
  const body = [
    data.pros ? `Pros: ${data.pros}` : "",
    data.cons ? `Cons: ${data.cons}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { error } = await supabase.from("facility_reviews").insert({
    facility_id: data.facility_id,
    nurse_id: user.id,
    rating_overall: data.rating_overall,
    rating_safety: data.rating_safety,
    rating_staffing: data.rating_staffing,
    rating_culture: data.rating_culture,
    review_body: body || null,
    would_return: data.would_return,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export type FacilityAggregate = {
  overall: number;
  pay: number;
  safety: number;
  staffing: number;
  culture: number;
};

export type SalaryAggregate = {
  avgWeeklyPay: number;
  reportCount: number;
};

export type NegotiationLever = {
  id: string;
  lever_type: string;
  description: string | null;
  lever_value: string | null;
  verified_count: number;
};

export async function getFacilityWithReviews(facilityId: string) {
  const supabase = await createClient();

  const [facilityResult, reviewsResult, salaryResult, leversResult] =
    await Promise.all([
      supabase
        .from("facilities")
        .select(
          "id, name, location_city, location_state, type, bed_count, is_verified"
        )
        .eq("id", facilityId)
        .single(),
      supabase
        .from("facility_reviews")
        .select("*")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false }),
      supabase
        .from("salary_reports")
        .select("hourly_rate, stipend_housing, stipend_meals")
        .eq("facility_id", facilityId),
      supabase
        .from("negotiation_levers")
        .select("id, lever_type, description, lever_value, verified_count")
        .eq("facility_id", facilityId)
        .order("verified_count", { ascending: false }),
    ]);

  if (facilityResult.error) {
    return {
      error: facilityResult.error.message,
      facility: null,
      reviews: [],
      aggregate: null,
      reviewCount: 0,
      salaryAggregate: null,
      levers: [],
    };
  }

  const reviews = reviewsResult.data ?? [];

  // Compute aggregate ratings
  const count = reviews.length;
  const aggregate: FacilityAggregate | null =
    count > 0
      ? {
          overall: avg(reviews.map((r) => r.rating_overall)),
          pay: avg(
            reviews.map((r) => r.rating_pay).filter(Boolean) as number[]
          ),
          safety: avg(
            reviews.map((r) => r.rating_safety).filter(Boolean) as number[]
          ),
          staffing: avg(
            reviews.map((r) => r.rating_staffing).filter(Boolean) as number[]
          ),
          culture: avg(
            reviews.map((r) => r.rating_culture).filter(Boolean) as number[]
          ),
        }
      : null;

  // Compute salary aggregate
  const salaryRows = salaryResult.data ?? [];
  const salaryAggregate: SalaryAggregate | null =
    salaryRows.length > 0
      ? {
          avgWeeklyPay: avg(
            salaryRows.map(
              (r) => r.hourly_rate * 36 + r.stipend_housing + r.stipend_meals
            )
          ),
          reportCount: salaryRows.length,
        }
      : null;

  const levers = (leversResult.data ?? []) as NegotiationLever[];

  return {
    facility: facilityResult.data,
    reviews,
    aggregate,
    reviewCount: count,
    salaryAggregate,
    levers,
    gsaBenchmark: MOCK_GSA_WEEKLY_RATE,
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1));
}
