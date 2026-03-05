"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useId } from "react";
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

  const minPayId = useId();
  const stateId = useId();
  const contractId = useId();
  const startDateId = useId();

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
      <div className="space-y-8">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-charcoal">
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filter Jobs
        </h2>

        {/* Specialty */}
        <fieldset>
          <legend className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-charcoal/60">
            Specialty
          </legend>
          <div className="space-y-3">
            {JOB_BOARD_SPECIALTIES.map((s) => (
              <label key={s} className="flex items-center gap-3 text-sm font-medium text-brand-charcoal transition-colors hover:text-brand-orange">
                <input
                  type="checkbox"
                  checked={specialties.includes(s)}
                  onChange={() => toggleArrayParam("specialty", s, specialties)}
                  className="h-4 w-4 rounded-sm border-2 border-brand-charcoal/30 text-brand-orange focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
                />
                {s}
              </label>
            ))}
          </div>
        </fieldset>

        {/* State */}
        <div className="flex flex-col gap-3">
          <label htmlFor={stateId} className="text-xs font-bold uppercase tracking-widest text-brand-charcoal/60">
            State
          </label>
          <select
            id={stateId}
            value={state}
            onChange={(e) => updateParams({ state: e.target.value })}
            className="w-full rounded-none border-b-2 border-brand-charcoal bg-transparent px-0 py-2 text-sm font-bold text-brand-charcoal focus:border-brand-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
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
        <fieldset>
          <legend className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-charcoal/60">
            Shift Type
          </legend>
          <div className="space-y-3">
            {SHIFT_TYPE_OPTIONS.map((s) => (
              <label key={s.value} className="flex items-center gap-3 text-sm font-medium text-brand-charcoal transition-colors hover:text-brand-orange">
                <input
                  type="checkbox"
                  checked={shiftTypes.includes(s.value)}
                  onChange={() => toggleArrayParam("shift_type", s.value, shiftTypes)}
                  className="h-4 w-4 rounded-sm border-2 border-brand-charcoal/30 text-brand-orange focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Contract Length */}
        <div className="flex flex-col gap-3">
          <label htmlFor={contractId} className="text-xs font-bold uppercase tracking-widest text-brand-charcoal/60">
            Contract Length
          </label>
          <select
            id={contractId}
            value={contractWeeks}
            onChange={(e) => updateParams({ contract_weeks: e.target.value })}
            className="w-full rounded-none border-b-2 border-brand-charcoal bg-transparent px-0 py-2 text-sm font-bold text-brand-charcoal focus:border-brand-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
          >
            {CONTRACT_LENGTH_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Weekly Pay Range */}
        <div className="flex flex-col gap-3">
          <label htmlFor={minPayId} className="text-xs font-bold uppercase tracking-widest text-brand-charcoal/60">
            Min Weekly Pay
          </label>
          <div className="flex items-center gap-4">
            <input
              id={minPayId}
              type="range"
              min={1000}
              max={5000}
              step={100}
              value={minPay || 1000}
              onChange={(e) => {
                const val = e.target.value;
                updateParams({ min_weekly_pay: val === "1000" ? "" : val });
              }}
              className="w-full accent-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
            />
            <span className="w-20 font-mono text-sm font-bold text-brand-teal" aria-live="polite">
              ${(minPay ? parseInt(minPay) : 1000).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-3">
          <label htmlFor={startDateId} className="text-xs font-bold uppercase tracking-widest text-brand-charcoal/60">
            Start Date
          </label>
          <select
            id={startDateId}
            value={startWindow}
            onChange={(e) => updateParams({ start_date_window: e.target.value })}
            className="w-full rounded-none border-b-2 border-brand-charcoal bg-transparent px-0 py-2 text-sm font-bold text-brand-charcoal focus:border-brand-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
          >
            {START_DATE_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Source toggle */}
        <fieldset>
          <legend className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-charcoal/60">
            Source
          </legend>
          <div className="flex border-2 border-brand-charcoal bg-transparent p-0.5" role="radiogroup" aria-label="Job Source Filter">
            <button
              role="radio"
              aria-checked={sourceFilter === "all"}
              onClick={() => updateParams({ source_filter: "all" })}
              className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 ${
                sourceFilter === "all"
                  ? "bg-brand-charcoal text-white"
                  : "text-brand-charcoal hover:bg-brand-charcoal/10"
              }`}
            >
              All
            </button>
            <button
              role="radio"
              aria-checked={sourceFilter === "direct_only"}
              onClick={() => updateParams({ source_filter: "direct_only" })}
              className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 ${
                sourceFilter === "direct_only"
                  ? "bg-brand-charcoal text-white"
                  : "text-brand-charcoal hover:bg-brand-charcoal/10"
              }`}
            >
              Verified
            </button>
          </div>
        </fieldset>

        {/* Clear all */}
        {hasFilters && (
          <button
            onClick={() => router.push("/jobs")}
            className="flex w-full justify-center items-center gap-2 border-2 border-brand-danger px-4 py-3 text-sm font-bold uppercase tracking-widest text-brand-danger hover:bg-brand-danger hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-danger focus-visible:ring-offset-2 transition-colors"
          >
            <X size={16} aria-hidden="true" />
            Clear Filters
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
    <details className="border-t-4 border-brand-charcoal bg-white lg:hidden group">
      <summary className="flex cursor-pointer items-center justify-between p-6 text-sm font-bold uppercase tracking-widest text-brand-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2">
        <span className="flex items-center gap-3">
          <Search size={20} aria-hidden="true" />
          Filter Jobs
        </span>
        <span className="text-xl leading-none group-open:hidden">+</span>
        <span className="hidden text-xl leading-none group-open:block">-</span>
      </summary>
      <div className="border-t-2 border-brand-charcoal/10 p-6">{children}</div>
    </details>
  );
}
