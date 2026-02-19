"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  JOB_BOARD_SPECIALTIES,
  STATES,
  SHIFT_TYPE_OPTIONS,
  CONTRACT_LENGTH_OPTIONS,
  START_DATE_OPTIONS,
} from "@/lib/constants";

export function PublicJobFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const specialties = searchParams.getAll("specialty");
  const state = searchParams.get("state") ?? "";
  const shiftTypes = searchParams.getAll("shift_type");
  const contractWeeks = searchParams.get("contract_weeks") ?? "";
  const minPay = searchParams.get("min_weekly_pay") ?? "";
  const startWindow = searchParams.get("start_date_window") ?? "";
  const sourceFilter = searchParams.get("source_filter") ?? "all";

  const updateParams = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        params.delete(key);
        if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
          // already deleted
        } else if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }

      router.push(`/jobs?${params.toString()}`);
    },
    [router, searchParams]
  );

  function toggleArrayParam(key: string, value: string, current: string[]) {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateParams({ [key]: next });
  }

  const hasFilters =
    specialties.length > 0 ||
    state ||
    shiftTypes.length > 0 ||
    contractWeeks ||
    minPay ||
    startWindow ||
    sourceFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Desktop: side panel filter layout */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
          <SlidersHorizontal size={16} />
          Filters
        </div>

        {/* Specialty */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-gray-500">
            Specialty
          </p>
          <div className="space-y-1.5">
            {JOB_BOARD_SPECIALTIES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-brand-charcoal">
                <input
                  type="checkbox"
                  checked={specialties.includes(s)}
                  onChange={() => toggleArrayParam("specialty", s, specialties)}
                  className="h-4 w-4 rounded border-brand-gray-300 text-brand-orange focus:ring-brand-orange"
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        {/* State */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-gray-500">
            State
          </p>
          <select
            value={state}
            onChange={(e) => updateParams({ state: e.target.value })}
            className="w-full rounded-lg border border-brand-gray-200 px-3 py-1.5 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
          >
            <option value="">All States</option>
            {STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Shift Type */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-gray-500">
            Shift Type
          </p>
          <div className="space-y-1.5">
            {SHIFT_TYPE_OPTIONS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm text-brand-charcoal">
                <input
                  type="checkbox"
                  checked={shiftTypes.includes(s.value)}
                  onChange={() => toggleArrayParam("shift_type", s.value, shiftTypes)}
                  className="h-4 w-4 rounded border-brand-gray-300 text-brand-orange focus:ring-brand-orange"
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        {/* Contract Length */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-gray-500">
            Contract Length
          </p>
          <select
            value={contractWeeks}
            onChange={(e) => updateParams({ contract_weeks: e.target.value })}
            className="w-full rounded-lg border border-brand-gray-200 px-3 py-1.5 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
          >
            {CONTRACT_LENGTH_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Weekly Pay Range */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-gray-500">
            Min Weekly Pay
          </p>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1000}
              max={5000}
              step={100}
              value={minPay || 1000}
              onChange={(e) => {
                const val = e.target.value;
                updateParams({ min_weekly_pay: val === "1000" ? "" : val });
              }}
              className="w-full accent-brand-orange"
            />
            <span className="w-16 text-right text-sm font-medium text-brand-charcoal">
              ${(minPay ? parseInt(minPay) : 1000).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Start Date */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-gray-500">
            Start Date
          </p>
          <select
            value={startWindow}
            onChange={(e) => updateParams({ start_date_window: e.target.value })}
            className="w-full rounded-lg border border-brand-gray-200 px-3 py-1.5 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
          >
            {START_DATE_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Source toggle */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-gray-500">
            Source
          </p>
          <div className="flex rounded-lg border border-brand-gray-200 bg-white p-0.5">
            <button
              onClick={() => updateParams({ source_filter: "all" })}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                sourceFilter === "all"
                  ? "bg-brand-orange text-white"
                  : "text-brand-gray-500 hover:text-brand-charcoal"
              }`}
            >
              All
            </button>
            <button
              onClick={() => updateParams({ source_filter: "direct_only" })}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                sourceFilter === "direct_only"
                  ? "bg-brand-orange text-white"
                  : "text-brand-gray-500 hover:text-brand-charcoal"
              }`}
            >
              Verified Only
            </button>
          </div>
        </div>

        {/* Clear all */}
        {hasFilters && (
          <button
            onClick={() => router.push("/jobs")}
            className="flex items-center gap-1.5 text-sm text-brand-orange hover:text-brand-orange-hover"
          >
            <X size={14} />
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}

// Mobile accordion wrapper
export function MobileFilterToggle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-xl border border-brand-gray-200 bg-white lg:hidden">
      <summary className="flex cursor-pointer items-center gap-2 p-4 text-sm font-semibold text-brand-charcoal">
        <Search size={16} />
        Filter Jobs
      </summary>
      <div className="border-t border-brand-gray-200 p-4">{children}</div>
    </details>
  );
}
