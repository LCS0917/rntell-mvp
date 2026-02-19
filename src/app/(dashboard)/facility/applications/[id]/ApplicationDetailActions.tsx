"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateApplicationStatus } from "@/app/actions/jobs";
import { STATUS_LABELS } from "@/components/jobs/StatusBadge";

const STAGE_FLOW: Record<
  string,
  { label: string; nextStatus: string; className: string }[]
> = {
  submitted: [
    {
      label: "Move to Reviewing",
      nextStatus: "reviewing",
      className: "bg-amber-500 hover:bg-amber-600 text-white",
    },
    {
      label: "Reject",
      nextStatus: "rejected",
      className: "bg-brand-gray-200 hover:bg-brand-gray-300 text-brand-charcoal",
    },
  ],
  reviewing: [
    {
      label: "Schedule Interview",
      nextStatus: "interview",
      className: "bg-purple-500 hover:bg-purple-600 text-white",
    },
    {
      label: "Reject",
      nextStatus: "rejected",
      className: "bg-brand-gray-200 hover:bg-brand-gray-300 text-brand-charcoal",
    },
  ],
  interview: [
    {
      label: "Extend Offer",
      nextStatus: "offered",
      className: "bg-green-600 hover:bg-green-700 text-white",
    },
    {
      label: "Reject",
      nextStatus: "rejected",
      className: "bg-brand-gray-200 hover:bg-brand-gray-300 text-brand-charcoal",
    },
  ],
  offered: [
    {
      label: "Mark Accepted",
      nextStatus: "accepted",
      className: "bg-green-600 hover:bg-green-700 text-white",
    },
    {
      label: "Reject",
      nextStatus: "rejected",
      className: "bg-brand-gray-200 hover:bg-brand-gray-300 text-brand-charcoal",
    },
  ],
};

export function ApplicationDetailActions({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const actions = STAGE_FLOW[currentStatus] ?? [];

  function handleAction(newStatus: string) {
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

  if (actions.length === 0) {
    return (
      <p className="text-sm text-brand-gray-500">
        This application is{" "}
        <span className="font-medium capitalize">{currentStatus}</span>. No
        further actions available.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <button
          key={action.nextStatus}
          onClick={() => handleAction(action.nextStatus)}
          disabled={isPending}
          className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${action.className}`}
        >
          {isPending ? "Updating..." : action.label}
        </button>
      ))}
    </div>
  );
}
