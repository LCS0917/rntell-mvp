"use client";

import { useState, useTransition } from "react";
import { X, Send, CheckCircle, Clock } from "lucide-react";
import { applyToJob } from "@/app/actions/jobs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ApplyModal({
  jobId,
  jobTitle,
  facilityName,
  hasApplied,
  existingStatus,
  existingDate,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  facilityName: string;
  hasApplied: boolean;
  existingStatus?: string;
  existingDate?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [coverNote, setCoverNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await applyToJob({
        job_id: jobId,
        cover_note: coverNote || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Application submitted");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-charcoal">
            Apply Directly
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-brand-gray-400 hover:bg-brand-gray-100 hover:text-brand-charcoal"
          >
            <X size={20} />
          </button>
        </div>

        {hasApplied ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-brand-green-light p-4">
              <CheckCircle
                size={20}
                className="mt-0.5 flex-shrink-0 text-brand-success-dark"
              />
              <div>
                <p className="text-sm font-medium text-brand-success-dark">
                  You&apos;ve already applied
                </p>
                <p className="mt-1 text-sm text-brand-charcoal">
                  Status:{" "}
                  <span className="font-medium capitalize">
                    {existingStatus}
                  </span>
                </p>
                {existingDate && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-gray-500">
                    <Clock size={11} />
                    Applied{" "}
                    {new Date(existingDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-brand-gray-200 px-4 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Job summary */}
            <div className="rounded-lg bg-brand-gray-100 p-3">
              <p className="text-sm font-medium text-brand-charcoal">
                {jobTitle}
              </p>
              <p className="text-xs text-brand-gray-500">{facilityName}</p>
            </div>

            {/* Cover note */}
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-charcoal">
                Cover note{" "}
                <span className="font-normal text-brand-gray-400">
                  (optional)
                </span>
              </label>
              <textarea
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                rows={4}
                placeholder="Tell the facility why you're a great fit..."
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal placeholder-brand-gray-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              <Send size={16} />
              {isPending ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
