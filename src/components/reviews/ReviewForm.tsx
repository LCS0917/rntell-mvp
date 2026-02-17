"use client";

import { submitReview } from "@/app/actions/reviews";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MessageSquarePlus, Send } from "lucide-react";

function RatingSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const color =
    value >= 4
      ? "accent-brand-green"
      : value < 3
        ? "accent-brand-danger"
        : "accent-brand-orange";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-brand-gray-500">
          {label}
        </label>
        <span className="text-xs font-semibold text-brand-charcoal">
          {value}/5
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-gray-200 ${color}`}
      />
      <div className="mt-0.5 flex justify-between text-[10px] text-brand-gray-400">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>
    </div>
  );
}

export function ReviewForm({ facilityId }: { facilityId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const [ratings, setRatings] = useState({
    safety: 3,
    staffing: 3,
    culture: 3,
  });

  function setRating(key: keyof typeof ratings) {
    return (v: number) => setRatings((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);
    const pros = (form.get("pros") as string).trim();
    const cons = (form.get("cons") as string).trim();
    const wouldReturn = form.get("would_return") === "yes";

    // Overall is the average of the three sliders
    const overall = Math.round(
      (ratings.safety + ratings.staffing + ratings.culture) / 3
    );

    startTransition(async () => {
      const result = await submitReview({
        facility_id: facilityId,
        rating_overall: overall,
        rating_safety: ratings.safety,
        rating_staffing: ratings.staffing,
        rating_culture: ratings.culture,
        pros,
        cons,
        would_return: wouldReturn,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-gray-200 bg-white py-4 text-sm font-medium text-brand-gray-500 hover:border-brand-orange hover:text-brand-orange"
      >
        <MessageSquarePlus size={18} />
        Add a Review
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-brand-charcoal">
        Write a Review
      </h2>

      {error && (
        <div className="mt-3 rounded-lg bg-brand-danger-light px-4 py-3 text-sm text-brand-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-5">
        {/* Rating Sliders */}
        <div className="grid gap-5 sm:grid-cols-3">
          <RatingSlider
            label="Safety"
            value={ratings.safety}
            onChange={setRating("safety")}
          />
          <RatingSlider
            label="Staffing"
            value={ratings.staffing}
            onChange={setRating("staffing")}
          />
          <RatingSlider
            label="Culture"
            value={ratings.culture}
            onChange={setRating("culture")}
          />
        </div>

        {/* Pros */}
        <div>
          <label
            htmlFor="pros"
            className="mb-1 block text-sm font-medium text-brand-charcoal"
          >
            Pros
          </label>
          <textarea
            id="pros"
            name="pros"
            rows={3}
            placeholder="What did you like about this facility?"
            className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
          />
        </div>

        {/* Cons */}
        <div>
          <label
            htmlFor="cons"
            className="mb-1 block text-sm font-medium text-brand-charcoal"
          >
            Cons
          </label>
          <textarea
            id="cons"
            name="cons"
            rows={3}
            placeholder="What could be improved?"
            className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
          />
        </div>

        {/* Would Return */}
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-charcoal">
            Would you return to this facility?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-brand-gray-500">
              <input
                type="radio"
                name="would_return"
                value="yes"
                defaultChecked
                className="accent-brand-orange"
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-gray-500">
              <input
                type="radio"
                name="would_return"
                value="no"
                className="accent-brand-orange"
              />
              No
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-brand-gray-500 hover:text-brand-charcoal"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover disabled:opacity-50"
          >
            <Send size={14} />
            {isPending ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
