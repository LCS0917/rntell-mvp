import { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { getPublicJobPostings, getMatchedJobs } from "@/app/actions/jobs";
import type { JobFilters } from "@/app/actions/jobs";
import { createClient } from "@/utils/supabase/server";
import { JobBoardClient } from "./JobBoardClient";
import Footer from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "Direct-Hire Travel Nursing Jobs | RNTell",
  description:
    "Browse travel nursing jobs posted directly by hospitals. No agency markup — you keep what you earn.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[]>>;
};

export default async function JobsPage({ searchParams }: Props) {
  const params = await searchParams;

  // Parse multi-value params
  const toArray = (v: string | string[] | undefined): string[] => {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  };
  const toString = (v: string | string[] | undefined): string => {
    if (!v) return "";
    return Array.isArray(v) ? v[0] : v;
  };

  const filters: JobFilters = {
    specialty: toArray(params.specialty),
    state: toString(params.state),
    shift_type: toArray(params.shift_type),
    contract_weeks: toString(params.contract_weeks),
    min_weekly_pay: params.min_weekly_pay
      ? parseInt(toString(params.min_weekly_pay))
      : undefined,
    start_date_window: toString(params.start_date_window),
    source_filter: toString(params.source_filter) || "all",
    sort: toString(params.sort) || "newest",
  };

  // Fetch data
  const [jobsResult, matchResult] = await Promise.all([
    getPublicJobPostings(filters),
    getMatchedJobs(),
  ]);

  // Check auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <JobBoardClient
        jobs={jobsResult.data}
        total={jobsResult.total}
        matchedJobs={matchResult.data}
        hasProfile={matchResult.hasProfile}
        isLoggedIn={!!user}
        currentSort={filters.sort || "newest"}
      />
      <Footer />
    </>
  );
}
