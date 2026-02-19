"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  X,
  ShieldCheck,
  Clock,
  MapPin,
  Award,
  FileText,
  Calendar,
} from "lucide-react";
import { updateApplicationStatus, type ApplicationWithDetails } from "@/app/actions/jobs";
import { STATUS_COLORS, STATUS_LABELS } from "@/components/jobs/StatusBadge";

const STAGE_ORDER = [
  "submitted",
  "reviewing",
  "interview",
  "offered",
  "accepted",
] as const;

type ActionButton = {
  label: string;
  status: string;
  className: string;
};

function getAvailableActions(currentStatus: string): ActionButton[] {
  const idx = STAGE_ORDER.indexOf(currentStatus as (typeof STAGE_ORDER)[number]);
  const actions: ActionButton[] = [];

  if (currentStatus === "submitted") {
    actions.push({
      label: "Move to Reviewing",
      status: "reviewing",
      className: "bg-amber-500 hover:bg-amber-600 text-white",
    });
  }
  if (currentStatus === "reviewing") {
    actions.push({
      label: "Schedule Interview",
      status: "interview",
      className: "bg-purple-500 hover:bg-purple-600 text-white",
    });
  }
  if (currentStatus === "interview") {
    actions.push({
      label: "Extend Offer",
      status: "offered",
      className: "bg-green-600 hover:bg-green-700 text-white",
    });
  }
  if (currentStatus === "offered") {
    actions.push({
      label: "Mark Accepted",
      status: "accepted",
      className: "bg-green-600 hover:bg-green-700 text-white",
    });
  }

  // Reject available for all active statuses
  if (idx >= 0 && !["accepted", "rejected", "withdrawn"].includes(currentStatus)) {
    actions.push({
      label: "Reject",
      status: "rejected",
      className: "bg-brand-gray-200 hover:bg-brand-gray-300 text-brand-charcoal",
    });
  }

  return actions;
}

export function NurseSlideOver({
  application,
  onClose,
}: {
  application: ApplicationWithDetails;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const nurse = application.nurses;
  const nurseName = nurse?.profiles?.full_name || `${nurse?.specialty ?? "RN"} Nurse`;
  const isVerified =
    nurse?.verification_status === "verified" && nurse?.license_verified;
  const actions = getAvailableActions(application.status);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const result = await updateApplicationStatus(application.id, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Status updated to ${STATUS_LABELS[newStatus] ?? newStatus}`);
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div
        ref={panelRef}
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl animate-in slide-in-from-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-brand-charcoal">
            Nurse Profile
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-brand-gray-400 hover:bg-brand-gray-100 hover:text-brand-charcoal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Name + Status */}
          <div>
            <h3 className="text-xl font-bold text-brand-charcoal">{nurseName}</h3>
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[application.status] ?? "bg-brand-gray-100 text-brand-gray-500"}`}
            >
              {STATUS_LABELS[application.status] ?? application.status}
            </span>
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            {nurse?.specialty && (
              <div className="flex items-start gap-3">
                <Award size={16} className="mt-0.5 text-brand-gray-400" />
                <div>
                  <p className="text-xs text-brand-gray-500">Specialty</p>
                  <p className="text-sm font-medium text-brand-charcoal">
                    {nurse.specialty}
                    {nurse.years_experience != null &&
                      ` \u00B7 ${nurse.years_experience} yrs experience`}
                  </p>
                </div>
              </div>
            )}

            {nurse?.license_state && (
              <div className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 text-brand-gray-400" />
                <div>
                  <p className="text-xs text-brand-gray-500">License State</p>
                  <p className="text-sm font-medium text-brand-charcoal">
                    {nurse.license_state}
                    {nurse.license_compact && (
                      <span className="ml-2 rounded bg-brand-gray-100 px-1.5 py-0.5 text-xs text-brand-gray-500">
                        Compact
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="mt-0.5 text-brand-gray-400" />
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

            <div className="flex items-start gap-3">
              <Calendar size={16} className="mt-0.5 text-brand-gray-400" />
              <div>
                <p className="text-xs text-brand-gray-500">Date Applied</p>
                <p className="text-sm font-medium text-brand-charcoal">
                  {new Date(application.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Cover Note */}
          {application.cover_note && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-brand-gray-400" />
                <p className="text-xs font-medium text-brand-gray-500 uppercase tracking-wide">
                  Cover Note
                </p>
              </div>
              <div className="rounded-lg bg-brand-gray-100 p-4 text-sm text-brand-charcoal leading-relaxed">
                {application.cover_note}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {actions.length > 0 && (
          <div className="border-t border-brand-gray-200 px-6 py-4 space-y-2">
            {actions.map((action) => (
              <button
                key={action.status}
                onClick={() => handleStatusChange(action.status)}
                disabled={isPending}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${action.className}`}
              >
                {isPending ? "Updating..." : action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
