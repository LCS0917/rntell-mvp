"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  updateFacilityClaim,
  updateFacilityVerification,
  updateFacilityNotes,
  createFacility,
  updateFacility,
} from "@/app/actions/admin";
import { Search, X, CheckCircle, XCircle, Flag, StickyNote, Plus, Pencil, MapPin, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

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
  description: string | null;
  website: string | null;
};

const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "expired", "rejected"];

const EMPTY_FORM = {
  name: "",
  location_city: "",
  location_state: "",
  type: "",
  data_source: "imported",
  description: "",
  website: "",
};

type FormState = typeof EMPTY_FORM;

function facilityToForm(f: Facility): FormState {
  return {
    name: f.name,
    location_city: f.location_city ?? "",
    location_state: f.location_state ?? "",
    type: f.type ?? "",
    data_source: f.data_source,
    description: f.description ?? "",
    website: f.website ?? "",
  };
}

export default function FacilitiesClient({
  facilities,
  filters,
}: {
  facilities: Facility[];
  filters: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Detail / moderation panel
  const [selected, setSelected] = useState<Facility | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [notes, setNotes] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [editFacility, setEditFacility] = useState<Facility | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);

  // Google Places populate
  const [showPopulate, setShowPopulate] = useState(false);
  const [popCity, setPopCity] = useState("");
  const [popState, setPopState] = useState("");
  const [popMax, setPopMax] = useState("20");
  const [popLoading, setPopLoading] = useState(false);
  const [popResult, setPopResult] = useState<{
    created: number;
    skipped: number;
    total_found: number;
  } | null>(null);
  const [popError, setPopError] = useState<string | null>(null);

  async function handlePopulate() {
    if (!popState || popState.length !== 2) {
      setPopError("Enter a 2-letter state code.");
      return;
    }
    setPopLoading(true);
    setPopError(null);
    setPopResult(null);
    try {
      const maxNum = parseInt(popMax) || 20;
      const res = await fetch("/api/admin/populate-facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(popCity && { city: popCity }), state: popState, max_results: maxNum }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPopResult({ created: data.created, skipped: data.skipped, total_found: data.total_found });
      router.refresh();
    } catch (e) {
      setPopError(e instanceof Error ? e.message : "Failed to populate.");
    } finally {
      setPopLoading(false);
    }
  }

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

  function openEdit(f: Facility) {
    setEditFacility(f);
    setEditForm(facilityToForm(f));
    setEditError(null);
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
      setSelected({ ...selected, is_verified: true, verification_status: "verified" });
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

  function handleCreate() {
    if (!createForm.name) {
      setCreateError("Name is required.");
      return;
    }
    setCreateError(null);
    startTransition(async () => {
      try {
        await createFacility({
          name: createForm.name,
          location_city: createForm.location_city || undefined,
          location_state: createForm.location_state || undefined,
          type: createForm.type || undefined,
          data_source: createForm.data_source || "imported",
          description: createForm.description || undefined,
          website: createForm.website || undefined,
        });
        setCreateForm(EMPTY_FORM);
        setShowCreate(false);
        router.refresh();
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : "Failed to create facility.");
      }
    });
  }

  function handleUpdate() {
    if (!editFacility) return;
    if (!editForm.name) {
      setEditError("Name is required.");
      return;
    }
    setEditError(null);
    startTransition(async () => {
      try {
        await updateFacility(editFacility.id, {
          name: editForm.name,
          location_city: editForm.location_city || null,
          location_state: editForm.location_state || null,
          type: editForm.type || null,
          data_source: editForm.data_source || "imported",
          description: editForm.description || null,
          website: editForm.website || null,
        });
        setEditFacility(null);
        router.refresh();
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "Failed to update facility.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-charcoal">Facilities</h1>
          <span className="rounded-full bg-brand-gray-100 px-3 py-1 text-sm font-medium text-brand-gray-500">
            {facilities.length} total
          </span>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(null); setCreateForm(EMPTY_FORM); }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} />
          Add Facility
        </button>
      </div>

      {/* Google Places Populate */}
      <div className="rounded-xl border border-brand-gray-200 bg-white">
        <button
          onClick={() => setShowPopulate(!showPopulate)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
        >
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-brand-orange" />
            Populate from Google Places
          </span>
          {showPopulate ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showPopulate && (
          <div className="border-t border-brand-gray-200 px-4 py-4">
            <p className="mb-3 text-xs text-brand-gray-500">
              Search Google Maps for hospitals &amp; clinics by state (or optionally narrow to a city). New facilities are added with data_source=&quot;scraped&quot;, is_claimed=false.
            </p>
            <div className="flex items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-gray-500">City (optional)</label>
                <input
                  type="text"
                  value={popCity}
                  onChange={(e) => setPopCity(e.target.value)}
                  placeholder="Leave blank for whole state"
                  className="w-48 rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-gray-500">State</label>
                <input
                  type="text"
                  value={popState}
                  onChange={(e) => setPopState(e.target.value.toUpperCase())}
                  placeholder="TX"
                  maxLength={2}
                  className="w-20 rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-gray-500">Max #</label>
                <input
                  type="number"
                  value={popMax}
                  onChange={(e) => setPopMax(e.target.value)}
                  min={1}
                  max={100}
                  className="w-20 rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
                />
              </div>
              <button
                onClick={handlePopulate}
                disabled={popLoading}
                className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {popLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <MapPin size={14} />
                    Pull Facilities
                  </>
                )}
              </button>
            </div>
            {popResult && (
              <p className="mt-3 text-sm text-brand-success">
                Found {popResult.total_found} facilities. Created {popResult.created}, skipped {popResult.skipped} (already exist).
              </p>
            )}
            {popError && <p className="mt-3 text-sm text-brand-danger">{popError}</p>}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <FacilityFormModal
          title="New Facility"
          form={createForm}
          setForm={setCreateForm}
          error={createError}
          isPending={isPending}
          submitLabel="Create Facility"
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Edit Modal */}
      {editFacility && (
        <FacilityFormModal
          title="Edit Facility"
          form={editForm}
          setForm={setEditForm}
          error={editError}
          isPending={isPending}
          submitLabel="Save Changes"
          onSubmit={handleUpdate}
          onClose={() => setEditFacility(null)}
        />
      )}

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
                <th className="px-4 py-3 font-medium text-brand-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {facilities.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-brand-gray-400">
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
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(f); }}
                        className="rounded p-1 text-brand-gray-400 hover:bg-brand-gray-200 hover:text-brand-charcoal"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
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
              <h3 className="text-lg font-semibold text-brand-charcoal">{selected.name}</h3>
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
                  className="flex w-full items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
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

// ---------------------------------------------------------------------------
// Facility form modal (shared for create & edit)
// ---------------------------------------------------------------------------
function FacilityFormModal({
  title,
  form,
  setForm,
  error,
  isPending,
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  form: FormState;
  setForm: (f: FormState) => void;
  error: string | null;
  isPending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onClose: () => void;
}) {
  function field(key: keyof FormState, value: string) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-charcoal">{title}</h2>
          <button onClick={onClose}>
            <X size={18} className="text-brand-gray-400 hover:text-brand-charcoal" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-gray-500">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              placeholder="e.g. UCSF Medical Center"
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">City</label>
              <input
                type="text"
                value={form.location_city}
                onChange={(e) => field("location_city", e.target.value)}
                placeholder="San Francisco"
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">State</label>
              <input
                type="text"
                value={form.location_state}
                onChange={(e) => field("location_state", e.target.value)}
                placeholder="CA"
                maxLength={2}
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">Type</label>
              <input
                type="text"
                value={form.type}
                onChange={(e) => field("type", e.target.value)}
                placeholder="e.g. Hospital"
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">Source</label>
              <select
                value={form.data_source}
                onChange={(e) => field("data_source", e.target.value)}
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              >
                <option value="imported">Imported</option>
                <option value="self_reported">Self-Reported</option>
                <option value="scraped">Scraped</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-brand-gray-500">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => field("website", e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-brand-gray-500">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
              rows={3}
              placeholder="Optional description…"
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-brand-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-brand-gray-200 px-4 py-2 text-sm text-brand-gray-500 hover:bg-brand-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={isPending}
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Saving…" : submitLabel}
            </button>
          </div>
        </div>
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
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.unverified}`}>
      {status}
    </span>
  );
}
