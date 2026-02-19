"use client";

import Link from "next/link";
import { MapPin, Clock, Calendar, Shield, Info } from "lucide-react";
import type { PublicJobPosting } from "@/app/actions/jobs";
import { SHIFT_LABELS } from "@/lib/constants";

export function JobCard({
  job,
  isLoggedIn,
  matchReason,
}: {
  job: PublicJobPosting;
  isLoggedIn: boolean;
  matchReason?: string;
}) {
  const isVerified = job.data_source === "self_reported";

  return (
    <div className="rounded-xl border border-brand-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
      {/* Match reason tag */}
      {matchReason && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-peach-50 px-3 py-1 text-xs font-medium text-brand-orange">
          {matchReason}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Job info */}
        <div className="min-w-0 flex-1">
          {/* Facility + Location */}
          <p className="text-sm text-brand-gray-500">
            {job.facilities?.name ?? "Unknown Facility"}
            {job.facilities?.location_city && (
              <span className="ml-2 inline-flex items-center gap-1">
                <MapPin size={12} />
                {job.facilities.location_city},{" "}
                {job.facilities.location_state}
              </span>
            )}
          </p>

          {/* Title */}
          <h3 className="mt-1 text-lg font-semibold text-brand-charcoal">
            {job.title}
          </h3>

          {/* Tags row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Specialty chip */}
            <span className="rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-charcoal">
              {job.specialty}
            </span>

            {/* Shift */}
            {job.shift_type && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-charcoal">
                <Clock size={11} />
                {SHIFT_LABELS[job.shift_type] ?? job.shift_type}
              </span>
            )}

            {/* Contract length */}
            {job.contract_weeks && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-charcoal">
                <Calendar size={11} />
                {job.contract_weeks} wk
              </span>
            )}

            {/* Start date */}
            {job.start_date && (
              <span className="rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-charcoal">
                Starts{" "}
                {new Date(job.start_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}

            {/* Trust badge */}
            {isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-[#66BB6A]">
                <Shield size={11} />
                Verified Direct Post
              </span>
            ) : (
              <span
                className="group relative inline-flex items-center gap-1 rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-gray-500"
                title="Sourced from public job boards. Claim your facility profile to manage listings directly."
              >
                <Info size={11} />
                Sourced Listing
              </span>
            )}
          </div>
        </div>

        {/* Right: Pay + Apply — always side-by-side */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            {job.pay_package_total && (
              <p className="text-2xl font-bold text-[#26C6DA] sm:text-3xl">
                ${job.pay_package_total.toLocaleString()}
                <span className="text-sm font-normal text-[#666666]">
                  /wk
                </span>
              </p>
            )}
            {job.pay_rate_hourly && (
              <p className="text-sm text-[#666666]">
                ${job.pay_rate_hourly}/hr
              </p>
            )}
          </div>

          {isLoggedIn ? (
            job.has_applied ? (
              <span className="rounded-xl bg-brand-green-light px-4 py-2 text-sm font-medium text-brand-success-dark">
                Applied
              </span>
            ) : (
              <Link
                href={`/jobs/${job.id}`}
                className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                Apply
              </Link>
            )
          ) : (
            <Link
              href={`/jobs/${job.id}`}
              className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Apply
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
