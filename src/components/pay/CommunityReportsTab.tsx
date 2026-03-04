"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getSalaryReports,
  type SalaryReport,
  type SalaryFilters,
} from "@/app/actions/salary";
import Link from "next/link";
import { DollarSign, Plus, ShieldCheck, Search, Loader2 } from "lucide-react";

export default function CommunityReportsTab() {
  const [reports, setReports] = useState<SalaryReport[]>([]);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  // Filter state
  const [stateFilter, setStateFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  function fetchReports(filters?: SalaryFilters) {
    startTransition(async () => {
      const { data } = await getSalaryReports(filters);
      setReports(data);
      setLoaded(true);
    });
  }

  // Fetch on mount
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    const filters: SalaryFilters = {};
    if (stateFilter.trim()) filters.state = stateFilter.trim();
    if (specialtyFilter.trim()) filters.specialty = specialtyFilter.trim();
    fetchReports(filters);
  }

  return (
    <div>
      {/* Header row: subtitle + Submit CTA */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-brand-gray-500">
          Real pay data from real nurses. See where to capture your margin.
        </p>
        <Link
          href="/nurse/pay/submit"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover"
        >
          <Plus size={16} />
          Submit Your Pay
        </Link>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleFilter}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-brand-gray-200 bg-white p-4"
      >
        <div className="min-w-[140px] flex-1">
          <label
            htmlFor="cr-state"
            className="mb-1 block text-xs font-medium text-brand-gray-500"
          >
            State
          </label>
          <input
            id="cr-state"
            type="text"
            placeholder="e.g. CA, TX"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
          />
        </div>
        <div className="min-w-[140px] flex-1">
          <label
            htmlFor="cr-specialty"
            className="mb-1 block text-xs font-medium text-brand-gray-500"
          >
            Specialty
          </label>
          <input
            id="cr-specialty"
            type="text"
            placeholder="e.g. ICU, ER"
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-brand-charcoal/90 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          {isPending ? "Searching..." : "Filter"}
        </button>
      </form>

      {/* Loading state on first load */}
      {!loaded && isPending && (
        <div className="mt-12 flex flex-col items-center py-12">
          <Loader2 size={32} className="animate-spin text-brand-gray-300" />
          <p className="mt-3 text-sm text-brand-gray-500">
            Loading salary reports…
          </p>
        </div>
      )}

      {/* Empty state */}
      {loaded && reports.length === 0 && (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-brand-gray-200 bg-white p-12 text-center">
          <DollarSign className="text-brand-gray-300" size={48} />
          <h2 className="mt-4 text-lg font-semibold text-brand-charcoal">
            No salary reports yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-brand-gray-500">
            Be the first to contribute. Your anonymous report helps other nurses
            negotiate fair pay.
          </p>
          <Link
            href="/nurse/pay/submit"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover"
          >
            <Plus size={16} />
            Submit Your Salary
          </Link>
        </div>
      )}

      {/* Data table */}
      {loaded && reports.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-brand-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Facility
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Location
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Specialty
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Pay Package
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray-200">
              {reports.map((report: SalaryReport) => {
                const weeklyTotal =
                  report.hourly_rate * 36 +
                  report.stipend_housing +
                  report.stipend_meals;

                return (
                  <tr key={report.id} className="hover:bg-brand-gray-100/50">
                    <td className="px-4 py-3 font-medium text-brand-charcoal">
                      {report.facilities?.name ?? "Unknown Facility"}
                    </td>
                    <td className="px-4 py-3 text-brand-gray-500">
                      {report.facilities
                        ? `${report.facilities.location_city}, ${report.facilities.location_state}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-brand-gray-500">
                      {report.specialty}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-charcoal">
                        ${report.hourly_rate}/hr + $
                        {report.stipend_housing + report.stipend_meals}/wk
                      </div>
                      <div className="text-xs text-brand-gray-400">
                        ${weeklyTotal.toLocaleString()}/wk total
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {report.is_verified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-light px-2 py-0.5 text-xs font-medium text-brand-success-dark">
                            <ShieldCheck size={12} />
                            Verified
                          </span>
                        )}
                        {report.margin_risk_detected && (
                          <span className="inline-flex items-center rounded-full bg-brand-danger-light px-2 py-0.5 text-xs font-medium text-brand-danger">
                            High Margin Risk
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
