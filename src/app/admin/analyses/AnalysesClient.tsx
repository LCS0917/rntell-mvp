"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, AlertTriangle } from "lucide-react";

type Analysis = {
  id: string;
  nurse_id: string | null;
  nurse_name: string;
  facility_name: string | null;
  facility_state: string | null;
  specialty: string | null;
  hourly_rate: number | null;
  stipend_housing: number | null;
  stipend_meals: number | null;
  weekly_package: number;
  market_margin_dollars: number | null;
  margin_risk_detected: boolean;
  input_method: string;
  is_claimed: boolean;
  analysis_result: Record<string, unknown>;
  bill_rate_estimated: number | null;
  market_margin_pct: number | null;
  gsa_rate_used: number | null;
  travel_reimbursement: number | null;
  contract_weeks: number | null;
  start_date: string | null;
  shift_type: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
};

function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AnalysesClient({
  analyses,
  filters,
}: {
  analyses: Analysis[];
  filters: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Analysis | null>(null);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/analyses?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-charcoal">Contract Analyses</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="State..."
          defaultValue={filters.state || ""}
          onChange={(e) => {
            const val = e.target.value;
            const timeout = setTimeout(() => updateFilter("state", val), 400);
            return () => clearTimeout(timeout);
          }}
          className="w-24 rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        />

        <input
          type="text"
          placeholder="Specialty..."
          defaultValue={filters.specialty || ""}
          onChange={(e) => {
            const val = e.target.value;
            const timeout = setTimeout(() => updateFilter("specialty", val), 400);
            return () => clearTimeout(timeout);
          }}
          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        />

        <select
          defaultValue={filters.claimed || ""}
          onChange={(e) => updateFilter("claimed", e.target.value)}
          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        >
          <option value="">All</option>
          <option value="true">Claimed</option>
          <option value="false">Anonymous</option>
        </select>

        <select
          defaultValue={filters.margin_risk || ""}
          onChange={(e) => updateFilter("margin_risk", e.target.value)}
          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        >
          <option value="">All Risk</option>
          <option value="true">Margin Risk</option>
        </select>

        <div className="flex items-center gap-1">
          <label className="text-xs text-brand-gray-500">From</label>
          <input
            type="date"
            defaultValue={filters.date_from || ""}
            onChange={(e) => updateFilter("date_from", e.target.value)}
            className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          <label className="text-xs text-brand-gray-500">To</label>
          <input
            type="date"
            defaultValue={filters.date_to || ""}
            onChange={(e) => updateFilter("date_to", e.target.value)}
            className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 overflow-x-auto rounded-xl border border-brand-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                <th className="px-4 py-3 font-medium text-brand-gray-500">Date</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Nurse</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Facility</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">State</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Specialty</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Weekly Pkg</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Margin Gap</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Risk</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Input</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Claimed</th>
              </tr>
            </thead>
            <tbody>
              {analyses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-brand-gray-400">
                    No analyses found.
                  </td>
                </tr>
              ) : (
                analyses.map((a) => (
                  <tr
                    key={a.id}
                    className="cursor-pointer border-b border-brand-gray-200 hover:bg-brand-gray-100"
                    onClick={() => setSelected(a)}
                  >
                    <td className="px-4 py-3 text-brand-gray-500">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-charcoal">{a.nurse_name}</td>
                    <td className="px-4 py-3">{a.facility_name || "—"}</td>
                    <td className="px-4 py-3">{a.facility_state || "—"}</td>
                    <td className="px-4 py-3">{a.specialty || "—"}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(a.weekly_package)}</td>
                    <td className="px-4 py-3 font-medium">
                      {a.market_margin_dollars != null
                        ? formatCurrency(a.market_margin_dollars)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {a.margin_risk_detected ? (
                        <AlertTriangle size={16} className="text-brand-danger" />
                      ) : (
                        <span className="text-brand-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{a.input_method}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.is_claimed
                            ? "bg-brand-green-light text-brand-success-dark"
                            : "bg-brand-gray-100 text-brand-gray-500"
                        }`}
                      >
                        {a.is_claimed ? "Claimed" : "Anon"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-96 shrink-0 space-y-4 overflow-y-auto rounded-xl border border-brand-gray-200 bg-white p-5" style={{ maxHeight: "80vh" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-charcoal">Analysis Detail</h3>
              <button onClick={() => setSelected(null)}>
                <X size={18} className="text-brand-gray-400 hover:text-brand-charcoal" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <Detail label="Date" value={new Date(selected.created_at).toLocaleString()} />
              <Detail label="Nurse" value={selected.nurse_name} />
              <Detail label="Facility" value={selected.facility_name || "—"} />
              <Detail label="State" value={selected.facility_state || "—"} />
              <Detail label="Specialty" value={selected.specialty || "—"} />
              <Detail label="Shift Type" value={selected.shift_type || "—"} />
              <Detail label="Contract Weeks" value={selected.contract_weeks ? String(selected.contract_weeks) : "—"} />
              <Detail label="Start Date" value={selected.start_date || "—"} />
              <Detail label="Hourly Rate" value={selected.hourly_rate ? `$${selected.hourly_rate}` : "—"} />
              <Detail label="Housing Stipend" value={selected.stipend_housing ? `$${selected.stipend_housing}/wk` : "—"} />
              <Detail label="Meals Stipend" value={selected.stipend_meals ? `$${selected.stipend_meals}/wk` : "—"} />
              <Detail label="Travel Reimb." value={selected.travel_reimbursement ? `$${selected.travel_reimbursement}` : "—"} />
              <Detail label="Weekly Package" value={formatCurrency(selected.weekly_package)} />
              <Detail label="Bill Rate (est.)" value={selected.bill_rate_estimated ? `$${selected.bill_rate_estimated}` : "—"} />
              <Detail label="Margin %" value={selected.market_margin_pct ? `${selected.market_margin_pct}%` : "—"} />
              <Detail label="Margin Gap" value={formatCurrency(selected.market_margin_dollars)} />
              <Detail label="GSA Rate Used" value={selected.gsa_rate_used ? `$${selected.gsa_rate_used}` : "—"} />
              <Detail label="Input Method" value={selected.input_method} />
              <Detail label="Claimed" value={selected.is_claimed ? "Yes" : "No"} />
              <Detail label="Session ID" value={selected.session_id || "—"} />

              {selected.margin_risk_detected && (
                <div className="flex items-center gap-2 rounded-lg bg-brand-danger-light p-3">
                  <AlertTriangle size={16} className="text-brand-danger" />
                  <span className="text-sm font-medium text-brand-danger">
                    Margin Risk Detected
                  </span>
                </div>
              )}
            </div>

            {/* Analysis result JSONB */}
            {selected.analysis_result &&
              Object.keys(selected.analysis_result).length > 0 && (
                <div className="border-t border-brand-gray-200 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-brand-gray-400">
                    Analysis Result
                  </p>
                  <pre className="max-h-60 overflow-auto rounded-lg bg-brand-gray-100 p-3 text-xs text-brand-charcoal">
                    {JSON.stringify(selected.analysis_result, null, 2)}
                  </pre>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-brand-gray-400">{label}</p>
      <p className="font-medium text-brand-charcoal">{value}</p>
    </div>
  );
}
