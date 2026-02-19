import Link from "next/link";
import {
  getApplicationsForNurse,
  type NurseApplicationWithJob,
} from "@/app/actions/jobs";
import { Briefcase, ArrowRight } from "lucide-react";
import { ApplicationRow } from "./ApplicationRow";

export const metadata = {
  title: "My Applications | RNTell",
};

export default async function ApplicationsPage() {
  const { data: applications, error } = await getApplicationsForNurse();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
            <Briefcase className="text-brand-orange" size={28} />
            My Applications
          </h1>
          <p className="mt-1 text-sm text-brand-gray-500">
            Track your direct-hire applications.
          </p>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
        >
          Browse Jobs <ArrowRight size={14} />
        </Link>
      </div>

      {error && (
        <p className="mb-4 text-sm text-brand-danger">{error}</p>
      )}

      {applications.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-brand-gray-200 bg-white p-12 text-center">
          <Briefcase className="text-brand-gray-300" size={48} />
          <h2 className="mt-4 text-lg font-semibold text-brand-charcoal">
            You haven&apos;t applied to any jobs yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-brand-gray-500">
            Find your next assignment on the job board.
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            Browse Jobs <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-brand-gray-200 bg-brand-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">
                  Facility
                </th>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">
                  Job Title
                </th>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">
                  Specialty
                </th>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">
                  Date Applied
                </th>
                <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray-100">
              {applications.map((app) => (
                <ApplicationRow key={app.id} application={app} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
