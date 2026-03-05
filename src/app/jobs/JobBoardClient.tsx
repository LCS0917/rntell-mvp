"use client";

import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicJobFilters, MobileFilterToggle } from "@/components/jobs/PublicJobFilters";
import { JobCard } from "@/components/jobs/JobCard";
import { JobAlertForm } from "@/components/jobs/JobAlertForm";
import { JOB_SORT_OPTIONS } from "@/lib/constants";
import type { PublicJobPosting } from "@/app/actions/jobs";

export function JobBoardClient({
  jobs,
  total,
  matchedJobs,
  hasProfile,
  isLoggedIn,
  currentSort,
}: {
  jobs: PublicJobPosting[];
  total: number;
  matchedJobs: PublicJobPosting[];
  hasProfile: boolean;
  isLoggedIn: boolean;
  currentSort: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSortChange(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    router.push(`/jobs?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-brand-warm selection:bg-brand-orange selection:text-white">
      <Navbar />

      <div className="mx-auto max-w-[1600px] px-6 py-16 lg:px-12">
        {/* Page title */}
        <div className="mb-16 max-w-3xl">
          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-tight tracking-tight text-brand-charcoal">
            Direct-Hire Assignments.
          </h1>
          <p className="mt-4 text-xl font-medium text-brand-charcoal/60">
            Browse positions posted directly by hospitals. No agency markup, you keep what you earn.
          </p>
        </div>

        {/* Mobile filters */}
        <div className="mb-8 lg:hidden">
          <MobileFilterToggle>
            <PublicJobFilters />
          </MobileFilterToggle>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col gap-16 lg:flex-row">
          {/* Left: sticky filter panel (desktop) */}
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-10 border-t-4 border-brand-charcoal pt-8">
              <PublicJobFilters />
            </div>
          </aside>

          {/* Right: job feed */}
          <div className="min-w-0 flex-1">
            {/* Matched section (logged-in nurses with profile) */}
            {isLoggedIn && matchedJobs.length > 0 && (
              <div className="mb-16 border-t-4 border-brand-orange">
                <h2 className="bg-brand-orange py-4 pl-6 text-xl font-bold uppercase tracking-widest text-white">
                  Matched for You
                </h2>
                <div className="flex flex-col">
                  {matchedJobs.map((job) => (
                    <JobCard key={job.id} job={job} isLoggedIn={true} matchReason={job.match_reasons?.[0]} />
                  ))}
                </div>
              </div>
            )}

            {/* Prompt for nurses without profile data */}
            {isLoggedIn && !hasProfile && matchedJobs.length === 0 && (
              <div className="mb-12 border-l-4 border-brand-orange bg-white p-8 shadow-sm">
                <h3 className="mb-2 text-xl font-bold text-brand-charcoal">
                  Unlock personalized matching
                </h3>
                <p className="text-brand-charcoal/70">
                  Analyze your current offer to see which listings are the best financial fit.
                </p>
                <Link href="/analyze" className="mt-6 inline-flex items-center gap-2 font-bold uppercase tracking-widest text-brand-orange transition-colors hover:text-brand-charcoal">
                  Analyze your offer <ArrowRight size={16} />
                </Link>
              </div>
            )}

            {/* Sort + count bar */}
            <div className="mb-8 flex items-end justify-between border-b-2 border-brand-charcoal/10 pb-4">
              <p className="font-mono text-sm font-bold uppercase tracking-widest text-brand-charcoal/60">
                <span className="text-xl text-brand-charcoal">{total}</span>{" "}
                {total === 1 ? "position" : "positions"}
              </p>
              <div className="flex items-center gap-4">
                <label htmlFor="sort-select" className="hidden font-mono text-sm font-bold uppercase tracking-widest text-brand-charcoal/60 sm:block">
                  Sort By
                </label>
                <select
                  id="sort-select"
                  value={currentSort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border-b-2 border-brand-charcoal bg-transparent py-2 pl-0 pr-8 font-mono text-sm font-bold uppercase tracking-wider focus:border-brand-orange focus:outline-none focus:ring-0"
                >
                  {JOB_SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* All Listings */}
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-brand-charcoal/20 py-24 text-center">
                <Briefcase className="mb-6 h-16 w-16 text-brand-charcoal/20" />
                <h2 className="text-2xl font-bold text-brand-charcoal">No listings match your filters</h2>
                <p className="mx-auto mt-2 max-w-sm text-brand-charcoal/60">
                  Try broadening your search or sign up for alerts when matching jobs are posted.
                </p>
                <div className="mx-auto mt-8 w-full max-w-md">
                  <JobAlertForm />
                </div>
              </div>
            ) : (
              <div className="flex flex-col border-t-2 border-brand-charcoal">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} isLoggedIn={isLoggedIn} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
