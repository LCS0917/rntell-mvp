"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateNurseVerification } from "@/app/actions/admin";
import { Search, X } from "lucide-react";

type Nurse = {
  id: string;
  name: string;
  email: string;
  joined: string;
  specialty: string | null;
  license_state: string | null;
  license_compact: boolean;
  verification_status: string;
  analyses_count: number;
  applications_count: number;
  has_passport_docs: boolean;
};

const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "expired", "rejected"];

export default function NursesClient({
  nurses,
  filters,
}: {
  nurses: Nurse[];
  filters: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/nurses?${params.toString()}`);
  }

  function handleVerificationChange(nurseId: string, status: string) {
    startTransition(async () => {
      await updateNurseVerification(nurseId, status);
      if (selectedNurse?.id === nurseId) {
        setSelectedNurse({ ...selectedNurse, verification_status: status });
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-charcoal">Nurses</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
          <input
            type="text"
            placeholder="Search name or email..."
            defaultValue={filters.search || ""}
            onChange={(e) => {
              const val = e.target.value;
              // Debounce
              const timeout = setTimeout(() => updateFilter("search", val), 400);
              return () => clearTimeout(timeout);
            }}
            className="rounded-lg border border-brand-gray-200 py-2 pl-9 pr-3 text-sm focus:border-brand-orange focus:outline-none"
          />
        </div>

        <select
          defaultValue={filters.verification_status || ""}
          onChange={(e) => updateFilter("verification_status", e.target.value)}
          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        >
          <option value="">All Statuses</option>
          {VERIFICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

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
          placeholder="License State..."
          defaultValue={filters.license_state || ""}
          onChange={(e) => {
            const val = e.target.value;
            const timeout = setTimeout(() => updateFilter("license_state", val), 400);
            return () => clearTimeout(timeout);
          }}
          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        />
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 overflow-x-auto rounded-xl border border-brand-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                <th className="px-4 py-3 font-medium text-brand-gray-500">Name</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Email</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Joined</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Specialty</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">State</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Compact</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500"># Analyses</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500"># Apps</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Docs</th>
              </tr>
            </thead>
            <tbody>
              {nurses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-brand-gray-400">
                    No nurses found.
                  </td>
                </tr>
              ) : (
                nurses.map((n) => (
                  <tr
                    key={n.id}
                    className="cursor-pointer border-b border-brand-gray-200 hover:bg-brand-gray-100"
                    onClick={() => setSelectedNurse(n)}
                  >
                    <td className="px-4 py-3 font-medium text-brand-charcoal">{n.name}</td>
                    <td className="px-4 py-3 text-brand-gray-500">{n.email}</td>
                    <td className="px-4 py-3 text-brand-gray-500">
                      {new Date(n.joined).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{n.specialty || "—"}</td>
                    <td className="px-4 py-3">{n.license_state || "—"}</td>
                    <td className="px-4 py-3">{n.license_compact ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={n.verification_status} />
                    </td>
                    <td className="px-4 py-3 text-center">{n.analyses_count}</td>
                    <td className="px-4 py-3 text-center">{n.applications_count}</td>
                    <td className="px-4 py-3 text-center">{n.has_passport_docs ? "Yes" : "No"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Side panel */}
        {selectedNurse && (
          <div className="w-80 shrink-0 rounded-xl border border-brand-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-charcoal">Nurse Detail</h3>
              <button onClick={() => setSelectedNurse(null)}>
                <X size={18} className="text-brand-gray-400 hover:text-brand-charcoal" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <Detail label="Name" value={selectedNurse.name} />
              <Detail label="Email" value={selectedNurse.email} />
              <Detail
                label="Joined"
                value={new Date(selectedNurse.joined).toLocaleDateString()}
              />
              <Detail label="Specialty" value={selectedNurse.specialty || "—"} />
              <Detail label="License State" value={selectedNurse.license_state || "—"} />
              <Detail
                label="Compact License"
                value={selectedNurse.license_compact ? "Yes" : "No"}
              />
              <Detail label="# Analyses" value={String(selectedNurse.analyses_count)} />
              <Detail label="# Applications" value={String(selectedNurse.applications_count)} />
              <Detail
                label="Passport Docs"
                value={selectedNurse.has_passport_docs ? "Yes" : "No"}
              />

              {/* Editable verification */}
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-gray-500">
                  Verification Status
                </label>
                <select
                  value={selectedNurse.verification_status}
                  onChange={(e) =>
                    handleVerificationChange(selectedNurse.id, e.target.value)
                  }
                  disabled={isPending}
                  className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none disabled:opacity-50"
                >
                  {VERIFICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    verified: "bg-brand-green-light text-brand-success-dark",
    pending: "bg-amber-100 text-amber-700",
    unverified: "bg-brand-gray-100 text-brand-gray-500",
    expired: "bg-brand-danger-light text-brand-danger",
    rejected: "bg-brand-danger-light text-brand-danger",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.unverified}`}
    >
      {status}
    </span>
  );
}
