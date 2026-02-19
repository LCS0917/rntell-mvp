"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import type { FacilityJobPosting } from "@/app/actions/jobs";
import { toggleJobActive } from "@/app/actions/jobs";

const SHIFT_LABELS: Record<string, string> = {
  day: "Day",
  night: "Night",
  rotating: "Rotating",
  prn: "PRN",
  travel: "Travel",
  per_diem: "Per Diem",
};

function formatCurrency(n: number | null) {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function JobListingTable({ jobs }: { jobs: FacilityJobPosting[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      const result = await toggleJobActive(id, !currentActive);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(currentActive ? "Job deactivated" : "Job activated");
        router.refresh();
      }
    });
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-brand-gray-500">
                <th className="px-5 py-3">Job Title</th>
                <th className="px-5 py-3">Specialty</th>
                <th className="px-5 py-3">Shift</th>
                <th className="px-5 py-3 text-right">Weekly Package</th>
                <th className="px-5 py-3 text-center">Slots</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Start Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-brand-gray-100/40">
                  <td className="px-5 py-3.5 font-medium text-[#2C2C2C]">
                    {job.title}
                  </td>
                  <td className="px-5 py-3.5 text-brand-gray-500">
                    {job.specialty}
                  </td>
                  <td className="px-5 py-3.5 text-brand-gray-500">
                    {SHIFT_LABELS[job.shift_type ?? ""] ?? job.shift_type ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-[#26C6DA]">
                    {formatCurrency(job.pay_package_total)}/wk
                  </td>
                  <td className="px-5 py-3.5 text-center text-brand-gray-500">
                    {job.slots_available ?? 1}
                  </td>
                  <td className="px-5 py-3.5">
                    {job.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-brand-gray-500">
                    {formatDate(job.start_date)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/facility/jobs/${job.id}/edit`}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil size={13} className="inline -mt-0.5 mr-1" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleToggle(job.id, job.is_active)}
                        disabled={isPending}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {job.is_active ? (
                          <ToggleRight size={13} className="inline -mt-0.5 mr-1 text-green-600" />
                        ) : (
                          <ToggleLeft size={13} className="inline -mt-0.5 mr-1 text-gray-400" />
                        )}
                        {job.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="space-y-3 md:hidden">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-[#2C2C2C]">{job.title}</h3>
                <p className="text-sm text-brand-gray-500">
                  {job.specialty} &middot;{" "}
                  {SHIFT_LABELS[job.shift_type ?? ""] ?? job.shift_type ?? "—"}
                </p>
              </div>
              {job.is_active ? (
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                  Inactive
                </span>
              )}
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-brand-gray-400">Weekly Package</p>
                <p className="font-semibold text-[#26C6DA]">
                  {formatCurrency(job.pay_package_total)}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-gray-400">Slots</p>
                <p className="font-medium text-[#2C2C2C]">
                  {job.slots_available ?? 1}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-gray-400">Start</p>
                <p className="font-medium text-[#2C2C2C]">
                  {formatDate(job.start_date)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/facility/jobs/${job.id}/edit`}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </Link>
              <button
                onClick={() => handleToggle(job.id, job.is_active)}
                disabled={isPending}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {job.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
