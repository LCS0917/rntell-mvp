"use client";

import { applyToJob } from "@/app/actions/jobs";
import { Send, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ApplyButton({
  jobId,
  hasApplied,
}: {
  jobId: string;
  hasApplied: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [applied, setApplied] = useState(hasApplied);
  const [error, setError] = useState("");

  function handleApply() {
    startTransition(async () => {
      const result = await applyToJob({ job_id: jobId });
      if (result.error) {
        setError(result.error);
      } else {
        setApplied(true);
        router.refresh();
      }
    });
  }

  if (applied) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green-light px-3 py-1.5 text-sm font-medium text-brand-success-dark">
        <CheckCircle size={14} />
        Applied
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={handleApply}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-orange-hover disabled:opacity-50"
      >
        <Send size={14} />
        {isPending ? "Applying..." : "Apply Now"}
      </button>
      {error && (
        <p className="mt-1 text-xs text-brand-danger">{error}</p>
      )}
    </div>
  );
}
