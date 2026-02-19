"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toggleJobActive, deleteJob, createJob, updateJob } from "@/app/actions/admin";
import { Search, X, Trash2, Plus, Pencil } from "lucide-react";

type Facility = {
  id: string;
  name: string;
  location_state: string | null;
};

type Job = {
  id: string;
  title: string;
  facility_name: string;
  facility_id: string;
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
  description: string | null;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

const EMPTY_FORM = {
  facility_id: "",
  title: "",
  specialty: "",
  pay_rate_hourly: "",
  stipend_housing: "",
  stipend_meals: "",
  contract_weeks: "",
  start_date: "",
  description: "",
  data_source: "direct",
};

type FormState = typeof EMPTY_FORM;

function jobToForm(j: Job): FormState {
  return {
    facility_id: j.facility_id,
    title: j.title,
    specialty: j.specialty,
    pay_rate_hourly: j.pay_rate_hourly != null ? String(j.pay_rate_hourly) : "",
    stipend_housing: j.stipend_housing != null ? String(j.stipend_housing) : "",
    stipend_meals: j.stipend_meals != null ? String(j.stipend_meals) : "",
    contract_weeks: j.contract_weeks != null ? String(j.contract_weeks) : "",
    start_date: j.start_date ?? "",
    description: j.description ?? "",
    data_source: j.data_source,
  };
}

export default function JobsClient({
  jobs,
  filters,
  facilities,
}: {
  jobs: Job[];
  filters: { [key: string]: string | undefined };
  facilities: Facility[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/jobs?${params.toString()}`);
  }

  function openEdit(j: Job) {
    setEditJob(j);
    setEditForm(jobToForm(j));
    setEditError(null);
    setConfirmDelete(false);
  }

  function handleToggleActive(job: Job) {
    startTransition(async () => {
      await toggleJobActive(job.id, !job.is_active);
      if (editJob?.id === job.id) setEditJob({ ...editJob, is_active: !job.is_active });
      router.refresh();
    });
  }

  function handleCreate() {
    if (!createForm.facility_id || !createForm.title || !createForm.specialty) {
      setCreateError("Facility, title, and specialty are required.");
      return;
    }
    setCreateError(null);
    startTransition(async () => {
      try {
        await createJob({
          facility_id: createForm.facility_id,
          title: createForm.title,
          specialty: createForm.specialty,
          pay_rate_hourly: createForm.pay_rate_hourly ? Number(createForm.pay_rate_hourly) : undefined,
          stipend_housing: createForm.stipend_housing ? Number(createForm.stipend_housing) : undefined,
          stipend_meals: createForm.stipend_meals ? Number(createForm.stipend_meals) : undefined,
          contract_weeks: createForm.contract_weeks ? Number(createForm.contract_weeks) : undefined,
          start_date: createForm.start_date || undefined,
          description: createForm.description || undefined,
          data_source: createForm.data_source || "direct",
        });
        setCreateForm(EMPTY_FORM);
        setShowCreate(false);
        router.refresh();
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : "Failed to create job.");
      }
    });
  }

  function handleUpdate() {
    if (!editJob) return;
    if (!editForm.facility_id || !editForm.title || !editForm.specialty) {
      setEditError("Facility, title, and specialty are required.");
      return;
    }
    setEditError(null);
    startTransition(async () => {
      try {
        await updateJob(editJob.id, {
          facility_id: editForm.facility_id,
          title: editForm.title,
          specialty: editForm.specialty,
          pay_rate_hourly: editForm.pay_rate_hourly ? Number(editForm.pay_rate_hourly) : null,
          stipend_housing: editForm.stipend_housing ? Number(editForm.stipend_housing) : null,
          stipend_meals: editForm.stipend_meals ? Number(editForm.stipend_meals) : null,
          contract_weeks: editForm.contract_weeks ? Number(editForm.contract_weeks) : null,
          start_date: editForm.start_date || null,
          description: editForm.description || null,
          data_source: editForm.data_source || "direct",
        });
        setEditJob(null);
        router.refresh();
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "Failed to update job.");
      }
    });
  }

  function handleDelete() {
    if (!editJob) return;
    startTransition(async () => {
      await deleteJob(editJob.id);
      setEditJob(null);
      setConfirmDelete(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-charcoal">Job Listings</h1>
        <button
          onClick={() => { setShowCreate(true); setCreateError(null); setCreateForm(EMPTY_FORM); }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} />
          Add Job
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <JobFormModal
          title="New Job Listing"
          form={createForm}
          setForm={setCreateForm}
          facilities={facilities}
          error={createError}
          isPending={isPending}
          submitLabel="Create Job"
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Edit Modal */}
      {editJob && (
        <JobFormModal
          title="Edit Job Listing"
          form={editForm}
          setForm={setEditForm}
          facilities={facilities}
          error={editError}
          isPending={isPending}
          submitLabel="Save Changes"
          onSubmit={handleUpdate}
          onClose={() => setEditJob(null)}
          footer={
            <div className="flex items-center justify-between border-t border-brand-gray-200 pt-4">
              <button
                onClick={() => handleToggleActive(editJob)}
                disabled={isPending}
                className={`rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  editJob.is_active
                    ? "bg-brand-gray-500 hover:bg-brand-gray-400"
                    : "bg-brand-success hover:opacity-90"
                }`}
              >
                {editJob.is_active ? "Deactivate" : "Activate"}
              </button>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-danger px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="rounded-lg bg-brand-danger px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
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
          }
        />
      )}

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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-brand-gray-200 bg-white">
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
              <th className="px-4 py-3 font-medium text-brand-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-brand-gray-400">
                  No job listings found.
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr
                  key={j.id}
                  className="border-b border-brand-gray-200 hover:bg-brand-gray-100"
                >
                  <td className="max-w-[200px] truncate px-4 py-3 font-medium text-brand-charcoal">
                    {j.title}
                  </td>
                  <td className="px-4 py-3 text-brand-gray-500">{j.facility_name}</td>
                  <td className="px-4 py-3">{j.city || "—"}</td>
                  <td className="px-4 py-3">{j.state || "—"}</td>
                  <td className="px-4 py-3">{j.specialty}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(j.weekly_package)}</td>
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(j)}
                      className="rounded p-1 text-brand-gray-400 hover:bg-brand-gray-100 hover:text-brand-charcoal"
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared form modal
// ---------------------------------------------------------------------------
function JobFormModal({
  title,
  form,
  setForm,
  facilities,
  error,
  isPending,
  submitLabel,
  onSubmit,
  onClose,
  footer,
}: {
  title: string;
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
  facilities: Facility[];
  error: string | null;
  isPending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  function field(key: keyof typeof EMPTY_FORM, value: string) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-charcoal">{title}</h2>
          <button onClick={onClose}>
            <X size={18} className="text-brand-gray-400 hover:text-brand-charcoal" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-gray-500">Facility *</label>
            <select
              value={form.facility_id}
              onChange={(e) => field("facility_id", e.target.value)}
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            >
              <option value="">Select facility…</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}{f.location_state ? ` (${f.location_state})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => field("title", e.target.value)}
                placeholder="e.g. Travel RN – ICU"
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">Specialty *</label>
              <input
                type="text"
                value={form.specialty}
                onChange={(e) => field("specialty", e.target.value)}
                placeholder="e.g. ICU"
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">Hourly Rate ($)</label>
              <input
                type="number"
                value={form.pay_rate_hourly}
                onChange={(e) => field("pay_rate_hourly", e.target.value)}
                placeholder="65"
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">Housing ($)</label>
              <input
                type="number"
                value={form.stipend_housing}
                onChange={(e) => field("stipend_housing", e.target.value)}
                placeholder="1200"
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">Meals ($)</label>
              <input
                type="number"
                value={form.stipend_meals}
                onChange={(e) => field("stipend_meals", e.target.value)}
                placeholder="400"
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">Contract Weeks</label>
              <input
                type="number"
                value={form.contract_weeks}
                onChange={(e) => field("contract_weeks", e.target.value)}
                placeholder="13"
                className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray-500">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => field("start_date", e.target.value)}
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
                <option value="direct">Direct</option>
                <option value="scraped">Scraped</option>
                <option value="imported">Imported</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-brand-gray-500">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
              rows={3}
              placeholder="Optional job description…"
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

          {footer}
        </div>
      </div>
    </div>
  );
}
