"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { SPECIALTIES, STATES } from "@/lib/constants";

export function JobFilters({
  currentSpecialty,
  currentState,
}: {
  currentSpecialty: string;
  currentState: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/nurse/jobs?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-gray-200 bg-white p-4">
      <Search size={16} className="text-brand-gray-400" />

      <select
        value={currentSpecialty}
        onChange={(e) => handleFilter("specialty", e.target.value)}
        className="rounded-lg border border-brand-gray-200 px-3 py-1.5 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
      >
        <option value="">All Specialties</option>
        {SPECIALTIES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={currentState}
        onChange={(e) => handleFilter("state", e.target.value)}
        className="rounded-lg border border-brand-gray-200 px-3 py-1.5 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
      >
        <option value="">All States</option>
        {STATES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {(currentSpecialty || currentState) && (
        <button
          onClick={() => router.push("/nurse/jobs")}
          className="text-sm text-brand-orange hover:text-brand-orange-hover"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
