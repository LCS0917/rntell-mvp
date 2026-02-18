import { getJobPostings, type JobPosting } from "@/app/actions/jobs";
import { JobFilters } from "@/components/jobs/JobFilters";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import {
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

export const metadata = {
  title: "Job Board | RNTell",
};

type Props = {
  searchParams: Promise<{ specialty?: string; state?: string }>;
};

export default async function JobBoardPage({ searchParams }: Props) {
  const params = await searchParams;
  const { data: jobs } = await getJobPostings({
    specialty: params.specialty,
    state: params.state,
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
          <Briefcase className="text-brand-orange" size={28} />
          Direct-Hire Job Board
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Skip the middleman. Apply directly to facilities and capture your full
          market value.
        </p>
      </div>

      {/* Filters */}
      <JobFilters
        currentSpecialty={params.specialty ?? ""}
        currentState={params.state ?? ""}
      />

      {/* Job List */}
      {jobs.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-brand-gray-200 bg-white p-12 text-center">
          <Briefcase className="text-brand-gray-300" size={48} />
          <h2 className="mt-4 text-lg font-semibold text-brand-charcoal">
            No jobs match your filters
          </h2>
          <p className="mt-2 max-w-sm text-sm text-brand-gray-500">
            Try broadening your search or check back soon — new positions are
            posted regularly.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {jobs.map((job: JobPosting) => (
            <div
              key={job.id}
              className="rounded-xl border border-brand-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Job Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-brand-charcoal">
                      {job.title}
                    </h3>
                    {job.beats_market_rate && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-light px-2 py-0.5 text-xs font-semibold text-brand-success-dark">
                        <TrendingUp size={11} />
                        Beats Market Rate
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-brand-gray-500">
                    {job.facilities?.name ?? "Unknown Facility"}
                    {job.facilities?.location_city && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <MapPin size={12} />
                        {job.facilities.location_city},{" "}
                        {job.facilities.location_state}
                      </span>
                    )}
                  </p>

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-charcoal">
                      {job.specialty}
                    </span>
                    {job.shift_type && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-charcoal">
                        <Clock size={11} />
                        {job.shift_type}
                      </span>
                    )}
                    {job.contract_weeks && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-charcoal">
                        <Calendar size={11} />
                        {job.contract_weeks} weeks
                      </span>
                    )}
                    {job.start_date && (
                      <span className="rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-medium text-brand-charcoal">
                        Starts{" "}
                        {new Date(job.start_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Requirements */}
                  {job.requirements.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.requirements.map((req: string) => (
                        <span
                          key={req}
                          className="rounded bg-brand-peach-50/60 px-2 py-0.5 text-xs text-brand-orange"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  )}

                  {job.description && (
                    <p className="mt-3 text-sm text-brand-gray-500 line-clamp-2">
                      {job.description}
                    </p>
                  )}
                </div>

                {/* Pay + Apply */}
                <div className="flex flex-col items-end gap-3 text-right">
                  <div>
                    {job.pay_package_total && (
                      <p className="text-xl font-bold text-brand-charcoal">
                        ${job.pay_package_total.toLocaleString()}
                        <span className="text-sm font-normal text-brand-gray-400">
                          /wk
                        </span>
                      </p>
                    )}
                    {job.pay_rate_hourly && (
                      <p className="text-sm text-brand-gray-500">
                        ${job.pay_rate_hourly}/hr
                        {job.stipend_housing
                          ? ` + $${job.stipend_housing} housing`
                          : ""}
                      </p>
                    )}
                  </div>

                  <ApplyButton
                    jobId={job.id}
                    hasApplied={job.has_applied ?? false}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
