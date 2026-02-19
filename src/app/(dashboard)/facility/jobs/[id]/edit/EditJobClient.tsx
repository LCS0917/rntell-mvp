"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { FacilityJobPosting } from "@/app/actions/jobs";
import { toggleJobActive, deleteJobPosting } from "@/app/actions/jobs";
import { JobPostForm } from "../../JobPostForm";

export function EditJobClient({ job }: { job: FacilityJobPosting }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleDeactivate() {
    startTransition(async () => {
      const result = await toggleJobActive(job.id, false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Job posting deactivated");
        router.push("/facility/jobs");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteJobPosting(job.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Job posting deleted");
        router.push("/facility/jobs");
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl bg-brand-warm">
      <Link
        href="/facility/jobs"
        className="mb-4 inline-flex items-center gap-1 text-sm text-brand-gray-500 hover:text-[#2C2C2C]"
      >
        <ChevronLeft size={16} />
        Back to Job Postings
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="mb-1 text-2xl font-bold text-[#2C2C2C]">
          Edit Job Posting
        </h1>
        <p className="mb-6 text-sm text-brand-gray-500">
          Update the details for this position.
        </p>

        <JobPostForm job={job} mode="edit" />
      </div>

      {/* Danger Zone */}
      <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-[#2C2C2C]">
          Danger Zone
        </h2>
        <p className="mb-4 text-sm text-brand-gray-500">
          These actions cannot be easily undone.
        </p>
        <div className="flex flex-wrap gap-3">
          {job.is_active && (
            <button
              onClick={handleDeactivate}
              disabled={isPending}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Deactivate Posting
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            Delete Posting
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-[#2C2C2C]">
                Delete this posting?
              </h3>
            </div>
            <p className="mb-6 text-sm text-brand-gray-500">
              This will deactivate the job posting. Nurses will no longer be able
              to see or apply to it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
