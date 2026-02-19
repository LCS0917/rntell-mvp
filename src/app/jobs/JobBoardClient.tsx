"use client";

import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-brand-warm">
      {/* Header */}
      <header className="border-b border-brand-gray-200 bg-white">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-orange">
            RNTell
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/jobs"
              className="text-sm font-medium text-brand-charcoal"
            >
              Find Jobs
            </Link>
            <Link
              href="/analyze"
              className="text-sm font-medium text-brand-gray-500 hover:text-brand-charcoal"
            >
              Analyze an Offer
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-brand-orange px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-charcoal transition-colors hover:bg-brand-gray-100"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-brand-orange px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="container py-6">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
            <Briefcase className="text-brand-orange" size={28} />
            Direct-Hire Travel Nursing Jobs
          </h1>
          <p className="mt-1 text-sm text-brand-gray-500">
            Browse positions posted directly by hospitals. You keep what you
            earn.
          </p>
        </div>

        {/* Mobile filters */}
        <div className="mb-4 lg:hidden">
          <MobileFilterToggle>
            <PublicJobFilters />
          </MobileFilterToggle>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left: sticky filter panel (desktop) */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-6 rounded-xl border border-brand-gray-200 bg-white p-4">
              <PublicJobFilters />
            </div>
          </aside>

          {/* Right: job feed */}
          <div className="min-w-0 flex-1">
            {/* Matched section (logged-in nurses with profile) */}
            {isLoggedIn && matchedJobs.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-lg font-semibold text-brand-charcoal">
                  Matched for You
                </h2>
                <div className="space-y-3">
                  {matchedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isLoggedIn={true}
                      matchReason={job.match_reasons?.[0]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Prompt for nurses without profile data */}
            {isLoggedIn && !hasProfile && matchedJobs.length === 0 && (
              <div className="mb-6 rounded-xl border border-brand-orange/20 bg-brand-peach-50 p-4">
                <p className="text-sm text-brand-charcoal">
                  <span className="font-semibold">
                    Unlock personalized job matching
                  </span>{" "}
                  — analyze your current offer to see which listings are the best
                  fit.
                </p>
                <Link
                  href="/analyze"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-orange hover:text-brand-orange-hover"
                >
                  Analyze your offer <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Sort + count bar */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-brand-gray-500">
                <span className="font-semibold text-brand-charcoal">
                  {total}
                </span>{" "}
                direct-hire {total === 1 ? "position" : "positions"} available
              </p>
              <select
                value={currentSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="rounded-lg border border-brand-gray-200 px-3 py-1.5 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
              >
                {JOB_SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* All Listings */}
            {matchedJobs.length > 0 && (
              <h2 className="mb-3 text-lg font-semibold text-brand-charcoal">
                All Listings
              </h2>
            )}

            {jobs.length === 0 ? (
              <div className="rounded-xl border border-brand-gray-200 bg-white p-12 text-center">
                <Briefcase
                  className="mx-auto text-brand-gray-300"
                  size={48}
                />
                <h2 className="mt-4 text-lg font-semibold text-brand-charcoal">
                  No listings match your filters
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-brand-gray-500">
                  Try broadening your search or sign up for alerts.
                </p>
                <div className="mx-auto mt-6 max-w-md">
                  <JobAlertForm />
                </div>
                <Link
                  href="/analyze"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-orange hover:text-brand-orange-hover"
                >
                  Already have an offer? Analyze it here{" "}
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isLoggedIn={isLoggedIn}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
