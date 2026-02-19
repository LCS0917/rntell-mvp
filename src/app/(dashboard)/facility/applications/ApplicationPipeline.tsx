"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ShieldCheck,
  Clock,
  MapPin,
  Eye,
  ChevronDown,
  Filter,
  X,
} from "lucide-react";
import {
  updateApplicationStatus,
  type ApplicationWithDetails,
  type FacilityJobPosting,
} from "@/app/actions/jobs";
import { STATUS_COLORS, STATUS_LABELS } from "@/components/jobs/StatusBadge";
import { SPECIALTIES } from "@/lib/constants";
import { NurseSlideOver } from "./NurseSlideOver";

const ALL_STATUSES = Object.keys(STATUS_LABELS);
const ACTIVE_STATUSES = ["submitted", "reviewing", "interview", "offered"];

type Props = {
  applications: ApplicationWithDetails[];
  jobPostings: FacilityJobPosting[];
  initialStatusFilter?: string[];
};

export function ApplicationPipeline({
  applications,
  jobPostings,
  initialStatusFilter,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters
  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(
    initialStatusFilter ?? []
  );
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Slide-over
  const [selectedApp, setSelectedApp] = useState<ApplicationWithDetails | null>(
    null
  );

  // Client-side filtering
  const filtered = applications.filter((app) => {
    if (jobFilter && app.job_postings.id !== jobFilter) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(app.status))
      return false;
    if (
      specialtyFilter &&
      app.nurses?.specialty?.toLowerCase() !== specialtyFilter.toLowerCase()
    )
      return false;
    if (
      verifiedOnly &&
      !(
        app.nurses?.verification_status === "verified" &&
        app.nurses?.license_verified
      )
    )
      return false;
    return true;
  });

  const hasActiveFilters =
    jobFilter || statusFilter.length > 0 || specialtyFilter || verifiedOnly;

  function clearFilters() {
    setJobFilter("");
    setStatusFilter([]);
    setSpecialtyFilter("");
    setVerifiedOnly(false);
  }

  function toggleStatus(status: string) {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  }

  function handleStatusChange(applicationId: string, newStatus: string) {
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Status updated to ${STATUS_LABELS[newStatus] ?? newStatus}`
        );
        router.refresh();
      }
    });
  }

  function getNurseName(app: ApplicationWithDetails) {
    return (
      app.nurses?.profiles?.full_name ||
      `${app.nurses?.specialty ?? "RN"} Nurse`
    );
  }

  function isVerified(app: ApplicationWithDetails) {
    return (
      app.nurses?.verification_status === "verified" &&
      app.nurses?.license_verified
    );
  }

  return (
    <>
      {/* Filter Bar */}
      <div className="mb-6 rounded-xl border border-brand-gray-200 bg-white p-4">
        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex w-full items-center justify-between md:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-brand-charcoal">
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
              <span className="rounded-full bg-brand-orange px-1.5 py-0.5 text-xs text-white">
                Active
              </span>
            )}
          </span>
          <ChevronDown
            size={16}
            className={`text-brand-gray-400 transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </button>

        {/* Desktop filters — always visible on md+ */}
        <div className="hidden md:flex md:flex-wrap md:items-end md:gap-4">
          {/* Job Posting */}
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-brand-gray-500">
              Job Posting
            </label>
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
            >
              <option value="">All Postings</option>
              {jobPostings.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Multi-Select */}
          <div className="min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-brand-gray-500">
              Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    statusFilter.includes(status)
                      ? STATUS_COLORS[status]
                      : "bg-brand-gray-100 text-brand-gray-400 hover:text-brand-gray-500"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          {/* Specialty */}
          <div className="min-w-[140px]">
            <label className="mb-1 block text-xs font-medium text-brand-gray-500">
              Specialty
            </label>
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
            >
              <option value="">All Specialties</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Verified Only */}
          <div className="flex items-center gap-2 pb-0.5">
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                verifiedOnly ? "bg-brand-orange" : "bg-brand-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  verifiedOnly ? "translate-x-4" : ""
                }`}
              />
            </button>
            <span className="text-xs font-medium text-brand-gray-500">
              Verified only
            </span>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-brand-orange hover:text-brand-orange-hover"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>

        {/* Mobile filters — toggled */}
        {showFilters && (
          <div className="mt-4 space-y-4 md:hidden">
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">
                Job Posting
              </label>
              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal"
              >
                <option value="">All Postings</option>
                {jobPostings.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">
                Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      statusFilter.includes(status)
                        ? STATUS_COLORS[status]
                        : "bg-brand-gray-100 text-brand-gray-400"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">
                Specialty
              </label>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal"
              >
                <option value="">All Specialties</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    verifiedOnly ? "bg-brand-orange" : "bg-brand-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      verifiedOnly ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <span className="text-xs font-medium text-brand-gray-500">
                  Verified only
                </span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-brand-orange"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <p className="mb-3 text-sm text-brand-gray-500">
        {filtered.length} application{filtered.length !== 1 ? "s" : ""}
        {hasActiveFilters ? " (filtered)" : ""}
      </p>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl border border-brand-gray-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Nurse
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Specialty
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  License
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Verification
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Job Title
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Applied
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray-200">
              {filtered.map((app) => {
                const nurse = app.nurses;
                const canReject = ACTIVE_STATUSES.includes(app.status);

                return (
                  <tr key={app.id} className="hover:bg-brand-gray-100/50">
                    {/* Nurse Name */}
                    <td className="px-4 py-3 font-medium text-brand-charcoal">
                      {getNurseName(app)}
                    </td>

                    {/* Specialty */}
                    <td className="px-4 py-3 text-brand-charcoal">
                      {nurse?.specialty ?? "—"}
                      {nurse?.years_experience != null && (
                        <span className="block text-xs text-brand-gray-400">
                          {nurse.years_experience} yrs
                        </span>
                      )}
                    </td>

                    {/* License */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {nurse?.license_state && (
                          <span className="inline-flex items-center gap-0.5 text-brand-charcoal">
                            <MapPin size={12} className="text-brand-gray-400" />
                            {nurse.license_state}
                          </span>
                        )}
                        {nurse?.license_compact && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                            Compact
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Verification */}
                    <td className="px-4 py-3">
                      {isVerified(app) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-light px-2 py-0.5 text-xs font-semibold text-brand-success-dark">
                          <ShieldCheck size={12} />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-peach-100/40 px-2 py-0.5 text-xs font-semibold text-brand-orange">
                          <Clock size={12} />
                          {nurse?.verification_status === "pending"
                            ? "Pending"
                            : "Unverified"}
                        </span>
                      )}
                    </td>

                    {/* Job Title */}
                    <td className="px-4 py-3 text-brand-gray-500">
                      {app.job_postings.title}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <select
                        value={app.status}
                        onChange={(e) =>
                          handleStatusChange(app.id, e.target.value)
                        }
                        disabled={isPending}
                        className={`cursor-pointer rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold focus:ring-1 focus:ring-brand-orange focus:outline-none ${STATUS_COLORS[app.status] ?? "bg-brand-gray-100 text-brand-gray-500"}`}
                      >
                        {ALL_STATUSES.filter((s) => s !== "withdrawn").map(
                          (s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-brand-gray-500">
                      {new Date(app.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="inline-flex items-center gap-1 text-sm text-brand-orange hover:text-brand-orange-hover"
                        >
                          <Eye size={14} />
                          Profile
                        </button>
                        <Link
                          href={`/facility/applications/${app.id}`}
                          className="text-sm text-brand-gray-500 hover:text-brand-charcoal"
                        >
                          Details
                        </Link>
                        {canReject && (
                          <button
                            onClick={() =>
                              handleStatusChange(app.id, "rejected")
                            }
                            disabled={isPending}
                            className="text-sm text-brand-gray-400 hover:text-brand-danger disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="space-y-3 md:hidden">
        {filtered.map((app) => {
          const nurse = app.nurses;
          const canReject = ACTIVE_STATUSES.includes(app.status);

          return (
            <div
              key={app.id}
              className="rounded-xl border border-brand-gray-200 bg-white p-4"
            >
              {/* Top Row: Name + Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-brand-charcoal">
                    {getNurseName(app)}
                  </p>
                  <p className="text-xs text-brand-gray-500">
                    {nurse?.specialty ?? "RN"}
                    {nurse?.years_experience != null &&
                      ` \u00B7 ${nurse.years_experience} yrs`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[app.status] ?? "bg-brand-gray-100 text-brand-gray-500"}`}
                >
                  {STATUS_LABELS[app.status] ?? app.status}
                </span>
              </div>

              {/* Details */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-brand-gray-500">
                {nurse?.license_state && (
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin size={10} />
                    {nurse.license_state}
                  </span>
                )}
                {nurse?.license_compact && (
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                    Compact
                  </span>
                )}
                {isVerified(app) ? (
                  <span className="inline-flex items-center gap-0.5 text-brand-success-dark">
                    <ShieldCheck size={10} />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-brand-orange">
                    <Clock size={10} />
                    {nurse?.verification_status === "pending"
                      ? "Pending"
                      : "Unverified"}
                  </span>
                )}
              </div>

              {/* Job + Date */}
              <div className="mt-2 text-xs text-brand-gray-400">
                {app.job_postings.title} &middot;{" "}
                {new Date(app.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-3 border-t border-brand-gray-200 pt-3">
                <button
                  onClick={() => setSelectedApp(app)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-orange"
                >
                  <Eye size={14} />
                  View Profile
                </button>
                <Link
                  href={`/facility/applications/${app.id}`}
                  className="text-sm text-brand-gray-500"
                >
                  Details
                </Link>
                {canReject && (
                  <button
                    onClick={() => handleStatusChange(app.id, "rejected")}
                    disabled={isPending}
                    className="ml-auto text-sm text-brand-gray-400 hover:text-brand-danger"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over */}
      {selectedApp && (
        <NurseSlideOver
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </>
  );
}
