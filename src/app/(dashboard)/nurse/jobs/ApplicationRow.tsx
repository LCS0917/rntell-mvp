"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateApplicationStatus,
  type NurseApplicationWithJob,
} from "@/app/actions/jobs";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700",
  reviewing: "bg-amber-50 text-amber-700",
  interview: "bg-purple-50 text-purple-700",
  offered: "bg-green-50 text-green-700",
  accepted: "bg-green-100 text-green-800 font-semibold",
  rejected: "bg-brand-gray-100 text-brand-gray-500",
  withdrawn: "bg-brand-gray-100 text-brand-gray-500",
};

export function ApplicationRow({
  application,
}: {
  application: NurseApplicationWithJob;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canWithdraw =
    application.status === "submitted" || application.status === "reviewing";

  function handleWithdraw() {
    startTransition(async () => {
      const result = await updateApplicationStatus(
        application.id,
        "withdrawn"
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Application withdrawn");
        router.refresh();
      }
    });
  }

  const facility = application.job_postings.facilities;

  return (
    <tr>
      <td className="px-4 py-3 text-brand-charcoal">
        {facility?.name ?? "Unknown"}
        {facility?.location_city && (
          <span className="block text-xs text-brand-gray-400">
            {facility.location_city}, {facility.location_state}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-brand-charcoal">
        {application.job_postings.title}
      </td>
      <td className="px-4 py-3 text-brand-charcoal">
        {application.job_postings.specialty}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
            STATUS_COLORS[application.status] ?? "bg-brand-gray-100 text-brand-gray-500"
          }`}
        >
          {application.status}
        </span>
      </td>
      <td className="px-4 py-3 text-brand-gray-500">
        {new Date(application.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/jobs/${application.job_postings.id}`}
            className="text-sm text-brand-orange hover:text-brand-orange-hover"
          >
            View Listing
          </Link>
          {canWithdraw && (
            <button
              onClick={handleWithdraw}
              disabled={isPending}
              className="text-sm text-brand-gray-500 hover:text-brand-danger disabled:opacity-50"
            >
              {isPending ? "..." : "Withdraw"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
