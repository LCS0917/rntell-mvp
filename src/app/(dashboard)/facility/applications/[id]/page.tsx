import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  MapPin,
  ShieldCheck,
  Clock,
  Briefcase,
  DollarSign,
  FileText,
  MessageSquare,
  CalendarClock,
} from "lucide-react";
import { getApplicationById } from "@/app/actions/jobs";
import { SHIFT_LABELS } from "@/lib/constants";
import { ApplicationDetailActions } from "./ApplicationDetailActions";

export const metadata = {
  title: "Application Detail | RNTell",
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: application, error } = await getApplicationById(id);

  if (error || !application) {
    notFound();
  }

  const nurse = application.nurses;
  const job = application.job_postings;
  const nurseName =
    nurse?.profiles?.full_name || `${nurse?.specialty ?? "RN"} Nurse`;
  const isVerified =
    nurse?.verification_status === "verified" && nurse?.license_verified;

  const STATUS_COLORS: Record<string, string> = {
    submitted: "bg-blue-50 text-blue-700",
    reviewing: "bg-amber-50 text-amber-700",
    interview: "bg-purple-50 text-purple-700",
    offered: "bg-green-50 text-green-700",
    accepted: "bg-green-100 text-green-800 font-bold",
    rejected: "bg-brand-gray-100 text-brand-gray-500",
    withdrawn: "bg-brand-gray-100 text-brand-gray-500",
  };

  const STATUS_LABELS: Record<string, string> = {
    submitted: "Submitted",
    reviewing: "Reviewing",
    interview: "Interview",
    offered: "Offered",
    accepted: "Accepted",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/facility/applications"
        className="mb-6 inline-flex items-center gap-1 text-sm text-brand-gray-500 hover:text-brand-charcoal"
      >
        <ArrowLeft size={14} />
        Back to Applications
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal">
            {nurseName}
          </h1>
          <p className="mt-1 text-sm text-brand-gray-500">
            Applied for {job.title}
          </p>
        </div>
        <span
          className={`self-start rounded-full px-3 py-1 text-sm font-semibold capitalize ${STATUS_COLORS[application.status] ?? "bg-brand-gray-100 text-brand-gray-500"}`}
        >
          {STATUS_LABELS[application.status] ?? application.status}
        </span>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Nurse Profile */}
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">
              Nurse Profile
            </h2>
            <div className="space-y-4">
              {nurse?.specialty && (
                <div className="flex items-start gap-3">
                  <Award
                    size={16}
                    className="mt-0.5 shrink-0 text-brand-gray-400"
                  />
                  <div>
                    <p className="text-xs text-brand-gray-500">Specialty</p>
                    <p className="text-sm font-medium text-brand-charcoal">
                      {nurse.specialty}
                    </p>
                  </div>
                </div>
              )}

              {nurse?.years_experience != null && (
                <div className="flex items-start gap-3">
                  <Briefcase
                    size={16}
                    className="mt-0.5 shrink-0 text-brand-gray-400"
                  />
                  <div>
                    <p className="text-xs text-brand-gray-500">Experience</p>
                    <p className="text-sm font-medium text-brand-charcoal">
                      {nurse.years_experience} years
                    </p>
                  </div>
                </div>
              )}

              {nurse?.license_state && (
                <div className="flex items-start gap-3">
                  <MapPin
                    size={16}
                    className="mt-0.5 shrink-0 text-brand-gray-400"
                  />
                  <div>
                    <p className="text-xs text-brand-gray-500">License State</p>
                    <p className="text-sm font-medium text-brand-charcoal">
                      {nurse.license_state}
                      {nurse.license_compact && (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                          Compact
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-brand-gray-400"
                />
                <div>
                  <p className="text-xs text-brand-gray-500">Verification</p>
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-success-dark">
                      <ShieldCheck size={14} />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-orange">
                      <Clock size={14} />
                      {nurse?.verification_status === "pending"
                        ? "Pending Verification"
                        : "Unverified"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cover Note */}
          <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <FileText size={16} className="text-brand-gray-400" />
              <h2 className="text-lg font-semibold text-brand-charcoal">
                Cover Note
              </h2>
            </div>
            {application.cover_note ? (
              <p className="text-sm leading-relaxed text-brand-charcoal">
                {application.cover_note}
              </p>
            ) : (
              <p className="text-sm italic text-brand-gray-400">
                No cover note provided.
              </p>
            )}
          </div>
        </div>

        {/* Right: Job Details + Status + Timeline */}
        <div className="space-y-4">
          {/* Job Details */}
          <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">
              Job Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-brand-gray-500">Position</p>
                <p className="text-sm font-medium text-brand-charcoal">
                  {job.title}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-gray-500">Specialty</p>
                <p className="text-sm font-medium text-brand-charcoal">
                  {job.specialty}
                </p>
              </div>
              {job.shift_type && (
                <div>
                  <p className="text-xs text-brand-gray-500">Shift Type</p>
                  <p className="text-sm font-medium text-brand-charcoal">
                    {SHIFT_LABELS[job.shift_type] ?? job.shift_type}
                  </p>
                </div>
              )}
              {job.pay_package_total && (
                <div>
                  <p className="text-xs text-brand-gray-500">Weekly Package</p>
                  <p className="text-sm font-semibold text-[#26C6DA]">
                    ${job.pay_package_total.toLocaleString()}/wk
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status Controls */}
          <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">
              Status Controls
            </h2>
            <ApplicationDetailActions
              applicationId={application.id}
              currentStatus={application.status}
            />
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock size={16} className="text-brand-gray-400" />
              <h2 className="text-lg font-semibold text-brand-charcoal">
                Timeline
              </h2>
            </div>
            <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-1 before:h-[calc(100%-8px)] before:w-px before:bg-brand-gray-200">
              <div className="relative">
                <div className="absolute -left-[18px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                <p className="text-sm font-medium text-brand-charcoal">
                  Application Submitted
                </p>
                <p className="text-xs text-brand-gray-500">
                  {new Date(application.created_at).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>
              {application.updated_at !== application.created_at && (
                <div className="relative">
                  <div
                    className={`absolute -left-[18px] top-1 h-2.5 w-2.5 rounded-full ${
                      application.status === "accepted"
                        ? "bg-green-500"
                        : application.status === "rejected"
                          ? "bg-brand-gray-400"
                          : "bg-brand-orange"
                    }`}
                  />
                  <p className="text-sm font-medium text-brand-charcoal">
                    Status changed to{" "}
                    <span className="capitalize">{application.status}</span>
                  </p>
                  <p className="text-xs text-brand-gray-500">
                    {new Date(application.updated_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Message Placeholder */}
          <div className="rounded-xl border border-dashed border-brand-gray-300 bg-brand-gray-100/50 p-6 text-center">
            <MessageSquare
              size={24}
              className="mx-auto mb-2 text-brand-gray-300"
            />
            <p className="text-sm font-medium text-brand-gray-500">
              Message Nurse
            </p>
            <p className="mt-1 text-xs text-brand-gray-400">
              Coming soon: Direct messaging
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
