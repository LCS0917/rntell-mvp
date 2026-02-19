"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  Shield,
  Info,
  Star,
  Users,
} from "lucide-react";
import type { JobDetail } from "@/app/actions/jobs";
import { SHIFT_LABELS } from "@/lib/constants";
import { ApplyModal } from "@/components/jobs/ApplyModal";

export function JobDetailClient({
  job,
  isLoggedIn,
}: {
  job: JobDetail;
  isLoggedIn: boolean;
}) {
  const [showApplyModal, setShowApplyModal] = useState(false);

  const isVerified =
    job.data_source === "self_reported" && job.facilities?.is_claimed;
  const weeklyBase = job.pay_rate_hourly ? job.pay_rate_hourly * 36 : null;

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
              className="text-sm font-medium text-brand-gray-500 hover:text-brand-charcoal"
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
        {/* Back link */}
        <Link
          href="/jobs"
          className="mb-4 inline-flex items-center gap-1 text-sm text-brand-gray-500 hover:text-brand-charcoal"
        >
          <ArrowLeft size={14} />
          Back to all jobs
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left: detail column (2/3) */}
          <div className="min-w-0 flex-1 lg:flex-[2]">
            {/* Title block */}
            <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-brand-charcoal">
                  {job.title}
                </h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-[#66BB6A]">
                    <Shield size={12} />
                    Verified Direct Post
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-gray-500"
                    title="Sourced from public job boards. Claim your facility profile to manage listings directly."
                  >
                    <Info size={12} />
                    Sourced Listing
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-brand-gray-500">
                {job.facilities && (
                  <Link
                    href={`/facility/${job.facilities.id}`}
                    className="font-medium text-brand-orange hover:text-brand-orange-hover"
                  >
                    {job.facilities.name}
                  </Link>
                )}
                {job.facilities?.location_city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} />
                    {job.facilities.location_city},{" "}
                    {job.facilities.location_state}
                  </span>
                )}
              </div>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-brand-gray-100 px-3 py-1 text-sm font-medium text-brand-charcoal">
                  {job.specialty}
                </span>
                {job.shift_type && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-gray-100 px-3 py-1 text-sm font-medium text-brand-charcoal">
                    <Clock size={12} />
                    {SHIFT_LABELS[job.shift_type] ?? job.shift_type}
                  </span>
                )}
                {job.contract_weeks && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-gray-100 px-3 py-1 text-sm font-medium text-brand-charcoal">
                    <Calendar size={12} />
                    {job.contract_weeks} weeks
                  </span>
                )}
                {job.start_date && (
                  <span className="rounded-full bg-brand-gray-100 px-3 py-1 text-sm font-medium text-brand-charcoal">
                    Starts{" "}
                    {new Date(job.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                {job.slots_available && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-peach-50 px-3 py-1 text-sm font-medium text-brand-orange">
                    <Users size={12} />
                    {job.slots_available} {job.slots_available === 1 ? "slot" : "slots"} available
                  </span>
                )}
              </div>
            </div>

            {/* Pay breakdown */}
            <div className="mt-4 rounded-xl border border-brand-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">
                Pay Breakdown
              </h2>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-brand-gray-100">
                  {job.pay_rate_hourly && (
                    <tr>
                      <td className="py-2.5 text-brand-gray-500">
                        Hourly Rate
                      </td>
                      <td className="py-2.5 text-right font-medium text-brand-charcoal">
                        ${job.pay_rate_hourly.toFixed(2)}/hr
                      </td>
                    </tr>
                  )}
                  {weeklyBase && (
                    <tr>
                      <td className="py-2.5 text-brand-gray-500">
                        Weekly Base (×36 hrs)
                      </td>
                      <td className="py-2.5 text-right font-medium text-brand-charcoal">
                        ${weeklyBase.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {(job.stipend_housing ?? 0) > 0 && (
                    <tr>
                      <td className="py-2.5 text-brand-gray-500">
                        Housing Stipend
                      </td>
                      <td className="py-2.5 text-right font-medium text-brand-charcoal">
                        ${job.stipend_housing!.toLocaleString()}/wk
                      </td>
                    </tr>
                  )}
                  {(job.stipend_meals ?? 0) > 0 && (
                    <tr>
                      <td className="py-2.5 text-brand-gray-500">
                        Meal Stipend
                      </td>
                      <td className="py-2.5 text-right font-medium text-brand-charcoal">
                        ${job.stipend_meals!.toLocaleString()}/wk
                      </td>
                    </tr>
                  )}
                  {(job.travel_reimbursement ?? 0) > 0 && (
                    <tr>
                      <td className="py-2.5 text-brand-gray-500">
                        Travel Reimbursement
                      </td>
                      <td className="py-2.5 text-right font-medium text-brand-charcoal">
                        ${job.travel_reimbursement!.toLocaleString()}/wk
                      </td>
                    </tr>
                  )}
                  {job.pay_package_total && (
                    <tr className="border-t-2 border-brand-gray-200">
                      <td className="py-3 text-base font-semibold text-brand-charcoal">
                        Total Weekly Package
                      </td>
                      <td className="py-3 text-right text-2xl font-bold text-[#26C6DA]">
                        ${job.pay_package_total.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Requirements */}
            {job.requirements.length > 0 && (
              <div className="mt-4 rounded-xl border border-brand-gray-200 bg-white p-6">
                <h2 className="mb-3 text-lg font-semibold text-brand-charcoal">
                  Requirements
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.requirements.map((req) => (
                    <span
                      key={req}
                      className="rounded-full bg-brand-peach-50/60 px-3 py-1 text-sm font-medium text-brand-orange"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div className="mt-4 rounded-xl border border-brand-gray-200 bg-white p-6">
                <h2 className="mb-3 text-lg font-semibold text-brand-charcoal">
                  About This Position
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-gray-500">
                  {job.description}
                </p>
              </div>
            )}

            {/* Sourced listing callout */}
            {!job.facilities?.is_claimed && job.facilities?.name && (
              <div className="mt-4 rounded-xl border border-dashed border-brand-gray-300 bg-brand-gray-100 p-5">
                <p className="text-sm text-brand-gray-500">
                  Are you the hiring manager at{" "}
                  <span className="font-medium text-brand-charcoal">
                    {job.facilities.name}
                  </span>
                  ? Claim your profile to manage this listing and respond to
                  applicants directly.
                </p>
                <Link
                  href="/facility/claim"
                  className="mt-2 inline-block text-sm font-semibold text-brand-orange hover:text-brand-orange-hover"
                >
                  Claim This Profile
                </Link>
              </div>
            )}
          </div>

          {/* Right: sticky apply card (1/3) */}
          <div className="lg:flex-1">
            <div className="sticky top-6 rounded-xl border border-brand-gray-200 bg-white p-6">
              {/* Weekly package */}
              {job.pay_package_total && (
                <p className="text-center text-3xl font-bold text-[#26C6DA]">
                  ${job.pay_package_total.toLocaleString()}
                  <span className="text-sm font-normal text-[#666666]">
                    /wk
                  </span>
                </p>
              )}

              {/* Slots */}
              {job.slots_available && (
                <p className="mt-2 text-center text-sm text-brand-gray-500">
                  {job.slots_available}{" "}
                  {job.slots_available === 1 ? "slot" : "slots"} available
                </p>
              )}

              {/* Apply button */}
              <div id="apply" className="mt-4">
                {isLoggedIn ? (
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                  >
                    {job.has_applied ? "View Application" : "Apply Directly"}
                  </button>
                ) : (
                  <Link
                    href={`/signup?from=jobs&job_id=${job.id}`}
                    className="block w-full rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                  >
                    Apply Directly
                  </Link>
                )}
              </div>

              {/* Analyze link */}
              <Link
                href="/analyze"
                className="mt-3 block text-center text-sm text-brand-orange hover:text-brand-orange-hover"
              >
                Analyze a similar offer
              </Link>

              {/* Facility badge & rating */}
              <div className="mt-6 border-t border-brand-gray-200 pt-4">
                {isVerified && (
                  <div className="flex items-center gap-1.5 text-sm text-[#66BB6A]">
                    <Shield size={14} />
                    <span className="font-medium">Verified Direct Post</span>
                  </div>
                )}
                {job.facility_review_count && job.facility_review_count > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-brand-gray-500">
                    <Star size={14} className="text-yellow-500" />
                    <span className="font-medium text-brand-charcoal">
                      {job.facility_reviews_avg?.toFixed(1)}
                    </span>
                    <span>
                      ({job.facility_review_count}{" "}
                      {job.facility_review_count === 1 ? "review" : "reviews"})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky apply bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-brand-gray-200 bg-white p-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          {job.pay_package_total && (
            <p className="text-xl font-bold text-[#26C6DA]">
              ${job.pay_package_total.toLocaleString()}
              <span className="text-xs font-normal text-[#666666]">/wk</span>
            </p>
          )}
          {isLoggedIn ? (
            <button
              onClick={() => setShowApplyModal(true)}
              className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              {job.has_applied ? "View Application" : "Apply Directly"}
            </button>
          ) : (
            <Link
              href={`/signup?from=jobs&job_id=${job.id}`}
              className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Apply Directly
            </Link>
          )}
        </div>
      </div>

      {/* Apply modal */}
      {showApplyModal && (
        <ApplyModal
          jobId={job.id}
          jobTitle={job.title}
          facilityName={job.facilities?.name ?? "Unknown Facility"}
          hasApplied={job.has_applied ?? false}
          onClose={() => setShowApplyModal(false)}
        />
      )}
    </div>
  );
}
