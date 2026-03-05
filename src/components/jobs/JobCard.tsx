"use client";

import Link from "next/link";
import { MapPin, Clock, Calendar, Shield, Info, Timer, ArrowRight } from "lucide-react";
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
    <div className="group relative flex flex-col gap-6 border-b border-brand-charcoal/10 bg-transparent px-4 py-8 transition-colors hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
      {/* Left: Job info */}
      <div className="flex-1">
        {/* Match reason tag */}
        {matchReason && (
          <div className="mb-4 inline-block bg-brand-orange px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
            {matchReason}
          </div>
        )}

        <div className="mb-2 flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-brand-orange">
          <span>{job.specialty}</span>
          {isVerified && (
            <>
              <span className="h-1 w-1 rounded-full bg-brand-orange/30"></span>
              <span className="flex items-center gap-1 text-[#66BB6A]">
                <Shield size={14} /> Verified Post
              </span>
            </>
          )}
        </div>

        {/* Title & Facility */}
        <h3 className="text-2xl font-bold text-brand-charcoal transition-colors group-hover:text-brand-orange sm:text-3xl">
          {job.title}
        </h3>
        
        <p className="mt-2 text-lg text-brand-charcoal/70">
          {job.facilities?.name ?? "Unknown Facility"}
          {job.facilities?.location_city && (
             <span className="ml-2 inline-flex items-center gap-1 font-medium">
               <MapPin size={16} className="text-brand-orange" />
               {job.facilities.location_city}, {job.facilities.location_state}
             </span>
          )}
        </p>

        {/* Requirements & Details row */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-sm text-brand-charcoal/60">
          {job.shift_type && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {SHIFT_LABELS[job.shift_type] ?? job.shift_type}
            </span>
          )}
          {job.contract_weeks && (
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {job.contract_weeks} wk
            </span>
          )}
          {job.hours_per_week && (
            <span className="flex items-center gap-1.5">
              <Timer size={14} />
              {job.hours_per_week} hrs/wk
            </span>
          )}
          {job.start_date && (
            <span className="flex items-center gap-1.5">
              Starts {new Date(job.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        
        {job.requirements.length > 0 && (
           <div className="mt-4 flex flex-wrap gap-2">
             {job.requirements.slice(0, 3).map((req) => (
               <span
                 key={req}
                 className="bg-brand-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-charcoal"
               >
                 {req}
               </span>
             ))}
           </div>
        )}
      </div>

      {/* Right: Pay + Apply */}
      <div className="flex shrink-0 flex-col items-start gap-4 sm:items-end">
        <div className="text-left sm:text-right">
          {job.pay_package_total && (
            <p className="text-4xl font-extrabold tracking-tight text-brand-teal sm:text-5xl">
              ${job.pay_package_total.toLocaleString()}
            </p>
          )}
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-brand-charcoal/50">
            Per Week
          </p>
          {job.pay_rate_hourly && (
            <p className="mt-2 font-mono text-sm text-brand-charcoal/40">
              ${job.pay_rate_hourly}/hr
            </p>
          )}
        </div>

        <div className="mt-4">
          {isLoggedIn && job.has_applied ? (
            <span className="inline-block bg-[#66BB6A] px-8 py-3 text-sm font-bold uppercase tracking-widest text-white">
              Applied
            </span>
          ) : (
            <Link
              href={`/jobs/${job.id}`}
              className="inline-flex items-center gap-2 bg-brand-charcoal px-8 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-brand-orange"
            >
              View & Apply <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
