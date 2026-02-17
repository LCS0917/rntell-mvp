"use client";

import { sendConnectRequest } from "@/app/actions/matching";
import type { RoommateMatch } from "@/app/actions/matching";
import { UserPlus, Check, MapPin, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

const STYLE_LABELS: Record<string, string> = {
  ghost: "Ghost",
  friendly: "Friendly",
  community: "Community",
};

const PET_LABELS: Record<string, string> = {
  none: "No pets",
  ok_with_pets: "Pet-friendly",
  has_pets: "Has pets",
};

export function MatchCard({ match }: { match: RoommateMatch }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [matched, setMatched] = useState(false);
  const [error, setError] = useState("");

  function handleConnect() {
    startTransition(async () => {
      const result = await sendConnectRequest(match.nurse_id);
      if (result.error) {
        setError(result.error);
      } else if (result.matched) {
        setMatched(true);
      } else {
        setSent(true);
      }
    });
  }

  // Privacy: show specialty + first target city, not full name
  const displayLabel = [
    match.specialty ? `${match.specialty} Nurse` : "Travel Nurse",
    match.target_cities[0] ? `in ${match.target_cities[0]}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const scoreColor =
    match.compatibility_score >= 80
      ? "text-brand-success-dark bg-brand-green-light"
      : match.compatibility_score >= 50
        ? "text-brand-orange bg-brand-peach-50"
        : "text-brand-gray-500 bg-brand-gray-100";

  return (
    <div className="flex flex-col rounded-xl border border-brand-gray-200 bg-white p-5">
      {/* Header: avatar placeholder + score */}
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-peach-50 text-sm font-bold text-brand-orange">
          {(match.specialty ?? "RN").slice(0, 2).toUpperCase()}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreColor}`}
        >
          {match.compatibility_score}% Match
        </span>
      </div>

      {/* Identity (privacy-safe) */}
      <h3 className="mt-3 text-sm font-semibold text-brand-charcoal">
        {displayLabel}
      </h3>

      {/* Tags */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {match.social_style && (
          <span className="rounded-full bg-brand-gray-100 px-2 py-0.5 text-xs text-brand-gray-500">
            {STYLE_LABELS[match.social_style] ?? match.social_style}
          </span>
        )}
        <span className="rounded-full bg-brand-gray-100 px-2 py-0.5 text-xs text-brand-gray-500">
          {PET_LABELS[match.pet_policy] ?? match.pet_policy}
        </span>
      </div>

      {/* Match reasons */}
      {match.match_reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {match.match_reasons.map((reason) => (
            <div
              key={reason}
              className="flex items-center gap-1.5 text-xs text-brand-gray-500"
            >
              {reason.startsWith("Same city") ? (
                <MapPin size={12} className="text-brand-orange" />
              ) : (
                <Sparkles size={12} className="text-brand-orange" />
              )}
              {reason}
            </div>
          ))}
        </div>
      )}

      {/* Connect button */}
      <div className="mt-auto pt-4">
        {error && (
          <p className="mb-2 text-xs text-brand-danger">{error}</p>
        )}
        {matched ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-green-light px-4 py-2 text-sm font-medium text-brand-success-dark">
            <Check size={14} />
            Matched!
          </div>
        ) : sent ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-gray-100 px-4 py-2 text-sm font-medium text-brand-gray-500">
            <Check size={14} />
            Request Sent
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover disabled:opacity-50"
          >
            <UserPlus size={14} />
            {isPending ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>
    </div>
  );
}
