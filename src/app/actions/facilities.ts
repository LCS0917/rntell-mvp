"use server";

import { createClient } from "@/utils/supabase/server";

export type PublicFacility = {
  id: string;
  name: string;
  location_city: string | null;
  location_state: string | null;
  type: string | null;
  website: string | null;
  is_claimed: boolean;
  is_verified: boolean;
  reviews_count: number;
  community_reviews_count: number;
};

export type FacilityFilters = {
  search?: string;
  state?: string;
  sort?: string;
};

export async function getPublicFacilities(filters: FacilityFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("facilities")
    .select("id, name, location_city, location_state, type, website, is_claimed, is_verified");

  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }
  if (filters.state) {
    query = query.eq("location_state", filters.state.toUpperCase());
  }

  query = query.order("name", { ascending: true }).limit(100);

  const { data: facilities, error } = await query;
  if (error) return { data: [], total: 0 };

  // Get review counts in parallel
  const facilityIds = (facilities ?? []).map((f) => f.id);

  const [reviewsResult, communityResult] = await Promise.all([
    supabase
      .from("facility_reviews")
      .select("facility_id")
      .in("facility_id", facilityIds),
    supabase
      .from("community_reviews")
      .select("facility_id")
      .in("facility_id", facilityIds)
      .not("facility_id", "is", null),
  ]);

  const reviewCounts: Record<string, number> = {};
  (reviewsResult.data ?? []).forEach((r) => {
    reviewCounts[r.facility_id] = (reviewCounts[r.facility_id] || 0) + 1;
  });

  const communityCounts: Record<string, number> = {};
  (communityResult.data ?? []).forEach((r) => {
    communityCounts[r.facility_id] = (communityCounts[r.facility_id] || 0) + 1;
  });

  const enriched: PublicFacility[] = (facilities ?? []).map((f) => ({
    ...f,
    reviews_count: reviewCounts[f.id] || 0,
    community_reviews_count: communityCounts[f.id] || 0,
  }));

  return { data: enriched, total: enriched.length };
}

export type FacilityProfile = {
  id: string;
  name: string;
  location_city: string | null;
  location_state: string | null;
  location_address: string | null;
  type: string | null;
  website: string | null;
  description: string | null;
  is_claimed: boolean;
  is_verified: boolean;
};

export type CommunityReviewPublic = {
  id: string;
  post_title: string;
  review_text: string;
  score: number;
  reddit_url: string | null;
  subreddit: string | null;
  posted_at: string | null;
};

export async function getPublicFacilityProfile(facilityId: string) {
  const supabase = await createClient();

  const [facilityResult, reviewsResult, communityResult, salaryResult] =
    await Promise.all([
      supabase
        .from("facilities")
        .select(
          "id, name, location_city, location_state, location_address, type, website, description, is_claimed, is_verified"
        )
        .eq("id", facilityId)
        .single(),
      supabase
        .from("facility_reviews")
        .select("rating_overall, rating_safety, rating_staffing, rating_culture, rating_pay, review_body, would_return, created_at")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false }),
      supabase
        .from("community_reviews")
        .select("id, post_title, review_text, score, reddit_url, subreddit, posted_at")
        .eq("facility_id", facilityId)
        .order("score", { ascending: false })
        .limit(20),
      supabase
        .from("salary_reports")
        .select("hourly_rate, stipend_housing, stipend_meals")
        .eq("facility_id", facilityId),
    ]);

  if (facilityResult.error) {
    return { facility: null, reviews: [], communityReviews: [], aggregate: null, salaryAggregate: null };
  }

  const reviews = reviewsResult.data ?? [];
  const communityReviews = (communityResult.data ?? []) as CommunityReviewPublic[];

  // Aggregate ratings
  const count = reviews.length;
  const aggregate =
    count > 0
      ? {
          overall: avg(reviews.map((r) => r.rating_overall)),
          safety: avg(reviews.map((r) => r.rating_safety).filter(Boolean) as number[]),
          staffing: avg(reviews.map((r) => r.rating_staffing).filter(Boolean) as number[]),
          culture: avg(reviews.map((r) => r.rating_culture).filter(Boolean) as number[]),
          pay: avg(reviews.map((r) => r.rating_pay).filter(Boolean) as number[]),
          count,
        }
      : null;

  // Salary aggregate
  const salaryRows = salaryResult.data ?? [];
  const salaryAggregate =
    salaryRows.length > 0
      ? {
          avgWeeklyPay: avg(
            salaryRows.map((r) => r.hourly_rate * 36 + r.stipend_housing + r.stipend_meals)
          ),
          reportCount: salaryRows.length,
        }
      : null;

  return {
    facility: facilityResult.data as FacilityProfile,
    reviews,
    communityReviews,
    aggregate,
    salaryAggregate,
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1));
}
