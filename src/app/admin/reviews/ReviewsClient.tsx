"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  matchCommunityReview,
  deleteCommunityReview,
} from "@/app/actions/admin";
import type { CommunityReview } from "@/app/actions/admin";
import {
  MessageSquare,
  Trash2,
  Link2,
  ArrowUpCircle,
  Search,
  ExternalLink,
  Check,
} from "lucide-react";

type Facility = {
  id: string;
  name: string;
  location_state: string | null;
  is_claimed: boolean;
};

export function ReviewsClient({
  reviews: initialReviews,
  facilities,
}: {
  reviews: CommunityReview[];
  facilities: Facility[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "unmatched" | "matched">("unmatched");
  const [facilitySearch, setFacilitySearch] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = initialReviews.filter((r) => {
    if (filter === "unmatched") return !r.facility_id;
    if (filter === "matched") return !!r.facility_id;
    return true;
  });

  function getFacilitySuggestions(reviewId: string, extractedName: string) {
    const search = (facilitySearch[reviewId] || "").toLowerCase();
    const query = search || extractedName.toLowerCase();
    return facilities
      .filter((f) => f.name.toLowerCase().includes(query))
      .slice(0, 5);
  }

  function handleMatch(reviewId: string, facilityId: string) {
    startTransition(async () => {
      await matchCommunityReview(reviewId, facilityId);
      router.refresh();
    });
  }

  function handleDelete(reviewId: string) {
    startTransition(async () => {
      await deleteCommunityReview(reviewId);
      setConfirmDelete(null);
      router.refresh();
    });
  }

  const unmatchedCount = initialReviews.filter((r) => !r.facility_id).length;
  const matchedCount = initialReviews.filter((r) => !!r.facility_id).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-charcoal">
            Community Reviews
          </h1>
          <span className="rounded-full bg-brand-gray-100 px-3 py-1 text-sm font-medium text-brand-gray-500">
            {initialReviews.length} total
          </span>
        </div>
      </div>

      <p className="text-sm text-brand-gray-500">
        Reddit posts tagged as facility reviews. Match them to facilities in the
        database, or delete irrelevant ones.
      </p>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["unmatched", "matched", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-brand-orange text-white"
                : "bg-white text-brand-gray-500 hover:bg-brand-gray-100"
            }`}
          >
            {f === "unmatched" && `Unmatched (${unmatchedCount})`}
            {f === "matched" && `Matched (${matchedCount})`}
            {f === "all" && `All (${initialReviews.length})`}
          </button>
        ))}
      </div>

      {/* Review cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-brand-gray-200 bg-white p-8 text-center">
          <MessageSquare className="mx-auto text-brand-gray-300" size={40} />
          <p className="mt-3 text-sm text-brand-gray-500">
            {filter === "unmatched"
              ? "No unmatched reviews. Run extract-reviews.ts to pull new ones."
              : "No reviews found."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => {
            const matchedFacility = review.facility_id
              ? facilities.find((f) => f.id === review.facility_id)
              : null;

            return (
              <div
                key={review.id}
                className="rounded-xl border border-brand-gray-200 bg-white p-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-brand-charcoal">
                      {review.post_title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-brand-gray-400">
                      <span className="flex items-center gap-1">
                        <ArrowUpCircle size={12} />
                        {review.score} upvotes
                      </span>
                      {review.subreddit && (
                        <span>r/{review.subreddit}</span>
                      )}
                      {review.posted_at && (
                        <span>
                          {new Date(review.posted_at).toLocaleDateString()}
                        </span>
                      )}
                      {review.reddit_url && (
                        <a
                          href={review.reddit_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 text-brand-orange hover:underline"
                        >
                          <ExternalLink size={10} />
                          Reddit
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Extracted facility name badge */}
                  <div className="shrink-0 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                    Extracted: {review.facility_name_extracted}
                  </div>
                </div>

                {/* Review body */}
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-gray-500">
                  {review.review_text.length > 400
                    ? review.review_text.slice(0, 400) + "…"
                    : review.review_text}
                </p>

                {/* Match / Delete actions */}
                <div className="mt-4 border-t border-brand-gray-200 pt-4">
                  {matchedFacility ? (
                    <div className="flex items-center gap-2 text-sm text-brand-success-dark">
                      <Check size={14} />
                      Matched to: <strong>{matchedFacility.name}</strong>
                      {matchedFacility.location_state &&
                        ` (${matchedFacility.location_state})`}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search
                            size={14}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-gray-400"
                          />
                          <input
                            type="text"
                            placeholder={`Search facilities (or matching "${review.facility_name_extracted}")…`}
                            value={facilitySearch[review.id] || ""}
                            onChange={(e) =>
                              setFacilitySearch((s) => ({
                                ...s,
                                [review.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-brand-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-brand-orange focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Suggestions */}
                      <div className="flex flex-wrap gap-2">
                        {getFacilitySuggestions(
                          review.id,
                          review.facility_name_extracted
                        ).map((f) => (
                          <button
                            key={f.id}
                            onClick={() => handleMatch(review.id, f.id)}
                            disabled={isPending}
                            className="flex items-center gap-1.5 rounded-lg border border-brand-gray-200 px-3 py-1.5 text-xs font-medium text-brand-charcoal hover:border-brand-orange hover:bg-brand-orange/5 disabled:opacity-50"
                          >
                            <Link2 size={12} className="text-brand-orange" />
                            {f.name}
                            {f.location_state && (
                              <span className="text-brand-gray-400">
                                ({f.location_state})
                              </span>
                            )}
                          </button>
                        ))}
                        {getFacilitySuggestions(
                          review.id,
                          review.facility_name_extracted
                        ).length === 0 && (
                          <span className="text-xs text-brand-gray-400">
                            No matching facilities found
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delete */}
                  <div className="mt-3 flex justify-end">
                    {confirmDelete === review.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-brand-danger">
                          Delete this review?
                        </span>
                        <button
                          onClick={() => handleDelete(review.id)}
                          disabled={isPending}
                          className="rounded-lg bg-brand-danger px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-lg border border-brand-gray-200 px-3 py-1 text-xs text-brand-gray-500 hover:bg-brand-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(review.id)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-brand-gray-400 hover:bg-brand-danger-light hover:text-brand-danger"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
