"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toggleJobActive, deleteJob } from "@/app/actions/admin";
import { Search, X, Trash2 } from "lucide-react";

type Job = {
  id: string;
  title: string;
  facility_name: string;
  city: string | null;
  state: string | null;
  specialty: string;
  weekly_package: number;
  data_source: string;
  is_active: boolean;
  applications_count: number;
  date_posted: string;
  pay_rate_hourly: number | null;
  stipend_housing: number | null;
  stipend_meals: number | null;
  contract_weeks: number | null;
  start_date: string | null;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function JobsClient({
  jobs,
  filters,
}: {
  jobs: Job[];
  filters: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Job | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/jobs?${params.toString()}`);
  }

  function handleToggleActive(jobId: string, current: boolean) {
    startTransition(async () => {
      await toggleJobActive(jobId, !current);
      if (selected?.id === jobId) {
        setSelected({ ...selected, is_active: !current });
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!selected) return;
    startTransition(async () => {
      await deleteJob(selected.id);
      setSelected(null);
      setConfirmDelete(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-charcoal">Job Listings</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
          <input
            type="text"
            placeholder="Search title or facility..."
            defaultValue={filters.search || ""}
            onChange={(e) => {
              const val = e.target.value;
              const timeout = setTimeout(() => updateFilter("search", val), 400);
              return () => clearTimeout(timeout);
            }}
            className="rounded-lg border border-brand-gray-200 py-2 pl-9 pr-3 text-sm focus:border-brand-orange focus:outline-none"
          />
        </div>

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

        <select
          defaultValue={filters.data_source || ""}
          onChange={(e) => updateFilter("data_source", e.target.value)}
          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        >
          <option value="">All Sources</option>
          <option value="direct">Direct</option>
          <option value="scraped">Scraped</option>
          <option value="imported">Imported</option>
        </select>

        <select
          defaultValue={filters.active || ""}
          onChange={(e) => updateFilter("active", e.target.value)}
          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 overflow-x-auto rounded-xl border border-brand-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                <th className="px-4 py-3 font-medium text-brand-gray-500">Title</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Facility</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">City</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">State</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Specialty</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Weekly Pkg</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Source</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Active</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500"># Apps</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Posted</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-brand-gray-400">
                    No job listings found.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr
                    key={j.id}
                    className="cursor-pointer border-b border-brand-gray-200 hover:bg-brand-gray-100"
                    onClick={() => {
                      setSelected(j);
                      setConfirmDelete(false);
                    }}
                  >
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium text-brand-charcoal">
                      {j.title}
                    </td>
                    <td className="px-4 py-3 text-brand-gray-500">{j.facility_name}</td>
                    <td className="px-4 py-3">{j.city || "—"}</td>
                    <td className="px-4 py-3">{j.state || "—"}</td>
                    <td className="px-4 py-3">{j.specialty}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(j.weekly_package)}
                    </td>
                    <td className="px-4 py-3">{j.data_source}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          j.is_active
                            ? "bg-brand-green-light text-brand-success-dark"
                            : "bg-brand-gray-100 text-brand-gray-500"
                        }`}
                      >
                        {j.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{j.applications_count}</td>
                    <td className="px-4 py-3 text-brand-gray-500">
                      {new Date(j.date_posted).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 shrink-0 space-y-4 rounded-xl border border-brand-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-charcoal">Job Detail</h3>
              <button onClick={() => setSelected(null)}>
                <X size={18} className="text-brand-gray-400 hover:text-brand-charcoal" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <Detail label="Title" value={selected.title} />
              <Detail label="Facility" value={selected.facility_name} />
              <Detail label="Location" value={`${selected.city || "—"}, ${selected.state || "—"}`} />
              <Detail label="Specialty" value={selected.specialty} />
              <Detail label="Hourly Rate" value={selected.pay_rate_hourly ? `$${selected.pay_rate_hourly}` : "—"} />
              <Detail label="Housing Stipend" value={selected.stipend_housing ? `$${selected.stipend_housing}/wk` : "—"} />
              <Detail label="Meals Stipend" value={selected.stipend_meals ? `$${selected.stipend_meals}/wk` : "—"} />
              <Detail label="Weekly Package" value={formatCurrency(selected.weekly_package)} />
              <Detail label="Contract Weeks" value={selected.contract_weeks ? String(selected.contract_weeks) : "—"} />
              <Detail label="Start Date" value={selected.start_date || "—"} />
              <Detail label="Data Source" value={selected.data_source} />
              <Detail label="Applications" value={String(selected.applications_count)} />
            </div>

            {/* Actions */}
            <div className="space-y-2 border-t border-brand-gray-200 pt-4">
              <button
                onClick={() => handleToggleActive(selected.id, selected.is_active)}
                disabled={isPending}
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  selected.is_active
                    ? "bg-brand-gray-500 hover:bg-brand-gray-400"
                    : "bg-brand-success hover:opacity-90"
                }`}
              >
                {selected.is_active ? "Deactivate" : "Activate"}
              </button>

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete Job
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 rounded-lg bg-brand-danger px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-gray-500 hover:bg-brand-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
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
