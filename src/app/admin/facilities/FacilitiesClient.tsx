"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  updateFacilityClaim,
  updateFacilityVerification,
  updateFacilityNotes,
} from "@/app/actions/admin";
import { Search, X, CheckCircle, XCircle, Flag, StickyNote } from "lucide-react";

type Facility = {
  id: string;
  name: string;
  location_city: string | null;
  location_state: string | null;
  type: string | null;
  data_source: string;
  is_claimed: boolean;
  is_verified: boolean;
  verification_status: string;
  is_premium_subscriber: boolean;
  admin_notes: string | null;
  created_at: string;
  jobs_count: number;
  reviews_count: number;
};

const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "expired", "rejected"];

export default function FacilitiesClient({
  facilities,
  filters,
}: {
  facilities: Facility[];
  filters: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Facility | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [notes, setNotes] = useState("");

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/facilities?${params.toString()}`);
  }

  function selectFacility(f: Facility) {
    setSelected(f);
    setNotes(f.admin_notes || "");
    setShowRejectInput(false);
    setRejectReason("");
  }

  function handleClaim() {
    if (!selected) return;
    startTransition(async () => {
      await updateFacilityClaim(selected.id);
      setSelected({ ...selected, is_claimed: true });
      router.refresh();
    });
  }

  function handleApprove() {
    if (!selected) return;
    startTransition(async () => {
      await updateFacilityVerification(selected.id, "approve");
      setSelected({
        ...selected,
        is_verified: true,
        verification_status: "verified",
      });
      router.refresh();
    });
  }

  function handleReject() {
    if (!selected) return;
    startTransition(async () => {
      await updateFacilityVerification(selected.id, "reject", rejectReason);
      setSelected({ ...selected, verification_status: "rejected" });
      setShowRejectInput(false);
      router.refresh();
    });
  }

  function handleSaveNotes() {
    if (!selected) return;
    startTransition(async () => {
      await updateFacilityNotes(selected.id, notes);
      setSelected({ ...selected, admin_notes: notes });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-charcoal">Facilities</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
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
          defaultValue={filters.claimed || ""}
          onChange={(e) => updateFilter("claimed", e.target.value)}
          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        >
          <option value="">All Claimed</option>
          <option value="true">Claimed</option>
          <option value="false">Unclaimed</option>
        </select>

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

        <select
          defaultValue={filters.data_source || ""}
          onChange={(e) => updateFilter("data_source", e.target.value)}
          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
        >
          <option value="">All Sources</option>
          <option value="self_reported">Self-Reported</option>
          <option value="scraped">Scraped</option>
          <option value="imported">Imported</option>
        </select>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 overflow-x-auto rounded-xl border border-brand-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                <th className="px-4 py-3 font-medium text-brand-gray-500">Name</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">City</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">State</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Type</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Source</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Claimed</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Verified</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500"># Jobs</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500"># Reviews</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Premium</th>
              </tr>
            </thead>
            <tbody>
              {facilities.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-brand-gray-400">
                    No facilities found.
                  </td>
                </tr>
              ) : (
                facilities.map((f) => (
                  <tr
                    key={f.id}
                    className="cursor-pointer border-b border-brand-gray-200 hover:bg-brand-gray-100"
                    onClick={() => selectFacility(f)}
                  >
                    <td className="px-4 py-3 font-medium text-brand-charcoal">{f.name}</td>
                    <td className="px-4 py-3 text-brand-gray-500">{f.location_city || "—"}</td>
                    <td className="px-4 py-3">{f.location_state || "—"}</td>
                    <td className="px-4 py-3">{f.type || "—"}</td>
                    <td className="px-4 py-3">{f.data_source}</td>
                    <td className="px-4 py-3">{f.is_claimed ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">{f.is_verified ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={f.verification_status} />
                    </td>
                    <td className="px-4 py-3 text-center">{f.jobs_count}</td>
                    <td className="px-4 py-3 text-center">{f.reviews_count}</td>
                    <td className="px-4 py-3">{f.is_premium_subscriber ? "Yes" : "No"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Side panel */}
        {selected && (
          <div className="w-96 shrink-0 space-y-4 rounded-xl border border-brand-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-charcoal">
                {selected.name}
              </h3>
              <button onClick={() => setSelected(null)}>
                <X size={18} className="text-brand-gray-400 hover:text-brand-charcoal" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="City" value={selected.location_city || "—"} />
              <Detail label="State" value={selected.location_state || "—"} />
              <Detail label="Type" value={selected.type || "—"} />
              <Detail label="Data Source" value={selected.data_source} />
              <Detail label="Claimed" value={selected.is_claimed ? "Yes" : "No"} />
              <Detail label="Verified" value={selected.is_verified ? "Yes" : "No"} />
              <Detail label="Status" value={selected.verification_status} />
              <Detail label="Premium" value={selected.is_premium_subscriber ? "Yes" : "No"} />
              <Detail label="Jobs" value={String(selected.jobs_count)} />
              <Detail label="Reviews" value={String(selected.reviews_count)} />
            </div>

            {/* Actions */}
            <div className="space-y-2 border-t border-brand-gray-200 pt-4">
              <p className="text-xs font-semibold uppercase text-brand-gray-400">Actions</p>

              {!selected.is_claimed && (
                <button
                  onClick={handleClaim}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover disabled:opacity-50"
                >
                  <Flag size={14} />
                  Mark as Claimed
                </button>
              )}

              {selected.verification_status !== "verified" && (
                <button
                  onClick={handleApprove}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 rounded-lg bg-brand-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <CheckCircle size={14} />
                  Approve Verification
                </button>
              )}

              {selected.verification_status !== "rejected" && (
                <>
                  {!showRejectInput ? (
                    <button
                      onClick={() => setShowRejectInput(true)}
                      disabled={isPending}
                      className="flex w-full items-center gap-2 rounded-lg bg-brand-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      Reject Verification
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Rejection reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-danger focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleReject}
                          disabled={isPending}
                          className="flex-1 rounded-lg bg-brand-danger px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => setShowRejectInput(false)}
                          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-gray-500 hover:bg-brand-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Admin notes */}
            <div className="space-y-2 border-t border-brand-gray-200 pt-4">
              <label className="flex items-center gap-1 text-xs font-semibold uppercase text-brand-gray-400">
                <StickyNote size={12} />
                Admin Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
                placeholder="Internal notes about this facility..."
              />
              <button
                onClick={handleSaveNotes}
                disabled={isPending}
                className="rounded-lg bg-brand-charcoal px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Save Notes
              </button>
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
