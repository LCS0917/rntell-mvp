"use client";

import { saveSocialProfile, type SocialProfile } from "@/app/actions/matching";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

const SOCIAL_STYLES = [
  { value: "ghost", label: "Ghost", description: "I keep to myself — headphones in, door closed" },
  { value: "friendly", label: "Friendly", description: "Down to hang out but also need my space" },
  { value: "community", label: "Community", description: "I love group dinners, exploring together" },
] as const;

const CLEANLINESS_LEVELS = [
  { value: 1, label: "Relaxed" },
  { value: 2, label: "Average" },
  { value: 3, label: "Clean" },
  { value: 4, label: "Very Clean" },
  { value: 5, label: "Spotless" },
] as const;

const PET_OPTIONS = [
  { value: "none", label: "No pets / prefer pet-free" },
  { value: "ok_with_pets", label: "Fine with pets around" },
  { value: "has_pets", label: "I travel with pets" },
] as const;

const POPULAR_CITIES = [
  "Seattle, WA",
  "Portland, OR",
  "San Francisco, CA",
  "Los Angeles, CA",
  "San Diego, CA",
  "Phoenix, AZ",
  "Denver, CO",
  "Dallas, TX",
  "Houston, TX",
  "Austin, TX",
  "Chicago, IL",
  "Nashville, TN",
  "Atlanta, GA",
  "Miami, FL",
  "Tampa, FL",
  "Charlotte, NC",
  "New York, NY",
  "Boston, MA",
  "Philadelphia, PA",
  "Washington, DC",
];

export function SocialProfileForm({
  initialData,
}: {
  initialData: SocialProfile | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>(
    initialData?.target_cities ?? []
  );

  function toggleCity(city: string) {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);
    const socialStyle = form.get("social_style") as string;
    const cleanliness = parseInt(form.get("cleanliness") as string, 10);
    const petPolicy = form.get("pet_policy") as string;

    if (!socialStyle) {
      setError("Please select a social style.");
      return;
    }
    if (!cleanliness) {
      setError("Please select a cleanliness preference.");
      return;
    }
    if (!petPolicy) {
      setError("Please select a pet policy.");
      return;
    }

    startTransition(async () => {
      const result = await saveSocialProfile({
        social_style: socialStyle as "ghost" | "friendly" | "community",
        cleanliness,
        pet_policy: petPolicy,
        target_cities: selectedCities,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/nurse/social");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {error && (
        <div className="rounded-lg bg-brand-danger-light px-4 py-3 text-sm text-brand-danger">
          {error}
        </div>
      )}

      {/* Social Style */}
      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-brand-charcoal">
          Social Style
        </legend>
        <div className="space-y-2">
          {SOCIAL_STYLES.map((style) => (
            <label
              key={style.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-gray-200 px-4 py-3 has-[:checked]:border-brand-orange has-[:checked]:bg-brand-peach-50"
            >
              <input
                type="radio"
                name="social_style"
                value={style.value}
                defaultChecked={initialData?.social_style === style.value}
                className="mt-0.5 accent-brand-orange"
              />
              <div>
                <span className="text-sm font-medium text-brand-charcoal">
                  {style.label}
                </span>
                <p className="text-xs text-brand-gray-500">
                  {style.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Cleanliness */}
      <div>
        <label
          htmlFor="cleanliness"
          className="mb-2 block text-sm font-medium text-brand-charcoal"
        >
          Cleanliness Preference
        </label>
        <div className="flex gap-2">
          {CLEANLINESS_LEVELS.map((level) => (
            <label
              key={level.value}
              className="flex flex-1 cursor-pointer flex-col items-center rounded-lg border border-brand-gray-200 px-2 py-3 text-center has-[:checked]:border-brand-orange has-[:checked]:bg-brand-peach-50"
            >
              <input
                type="radio"
                name="cleanliness"
                value={level.value}
                defaultChecked={initialData?.cleanliness === level.value}
                className="sr-only"
              />
              <span className="text-lg font-semibold text-brand-charcoal">
                {level.value}
              </span>
              <span className="text-xs text-brand-gray-500">{level.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Pet Policy */}
      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-brand-charcoal">
          Pet Policy
        </legend>
        <div className="space-y-2">
          {PET_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-brand-gray-200 px-4 py-3 has-[:checked]:border-brand-orange has-[:checked]:bg-brand-peach-50"
            >
              <input
                type="radio"
                name="pet_policy"
                value={option.value}
                defaultChecked={initialData?.pet_policy === option.value}
                className="accent-brand-orange"
              />
              <span className="text-sm text-brand-charcoal">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Target Cities */}
      <div>
        <p className="mb-2 text-sm font-medium text-brand-charcoal">
          Travel Plans — Target Cities
        </p>
        <p className="mb-3 text-xs text-brand-gray-500">
          Select the cities you&apos;re interested in for your next assignment.
        </p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CITIES.map((city) => {
            const isSelected = selectedCities.includes(city);
            return (
              <button
                key={city}
                type="button"
                onClick={() => toggleCity(city)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-brand-orange text-white"
                    : "border border-brand-gray-200 bg-white text-brand-gray-500 hover:border-brand-orange hover:text-brand-charcoal"
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/nurse/social"
          className="inline-flex items-center gap-1 text-sm text-brand-gray-500 hover:text-brand-charcoal"
        >
          <ArrowLeft size={14} />
          Back to Roommates
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover disabled:opacity-50"
        >
          <Save size={14} />
          {isPending ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </form>
  );
}
