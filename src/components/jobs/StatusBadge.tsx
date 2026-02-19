"use client";

import { updateApplicationStatus } from "@/app/actions/jobs";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "Reviewing",
  interview: "Interview",
  offered: "Offered",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700",
  reviewing: "bg-amber-50 text-amber-700",
  interview: "bg-purple-50 text-purple-700",
  offered: "bg-green-50 text-green-700",
  accepted: "bg-green-100 text-green-800 font-bold",
  rejected: "bg-brand-gray-100 text-brand-gray-500",
  withdrawn: "bg-brand-gray-100 text-brand-gray-500",
};

export { STATUS_COLORS, STATUS_LABELS };

export function StatusBadge({
  status,
  applicationId,
}: {
  status: string;
  applicationId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(status);

  function handleChange(newStatus: string) {
    setCurrentStatus(newStatus);
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, newStatus);
      if (result.error) {
        setCurrentStatus(status); // revert on error
      } else {
        router.refresh();
      }
    });
  }

  return (
    <select
      value={currentStatus}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className={`cursor-pointer rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold focus:ring-1 focus:ring-brand-orange focus:outline-none ${STATUS_COLORS[currentStatus] ?? STATUS_COLORS.submitted}`}
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
