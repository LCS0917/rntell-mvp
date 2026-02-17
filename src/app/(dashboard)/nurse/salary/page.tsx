import { getSalaryReports, type SalaryReport } from "@/app/actions/salary";
import Link from "next/link";
import { DollarSign, Plus, ShieldCheck } from "lucide-react";
import { SalaryFilters } from "@/components/salary/SalaryFilters";

export const metadata = {
  title: "Verified Pay Database | RNTell",
};

type Props = {
  searchParams: Promise<{ state?: string; specialty?: string }>;
};

export default async function SalaryDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const { data: reports } = await getSalaryReports({
    state: params.state,
    specialty: params.specialty,
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
            <DollarSign className="text-brand-orange" size={28} />
            Verified Pay Database
          </h1>
          <p className="mt-1 text-sm text-brand-gray-500">
            Real pay data from real nurses. No agency spin.
          </p>
        </div>
        <Link
          href="/nurse/salary/submit"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover"
        >
          <Plus size={16} />
          Submit Your Pay
        </Link>
      </div>

      {/* Filters */}
      <SalaryFilters
        currentState={params.state ?? ""}
        currentSpecialty={params.specialty ?? ""}
      />

      {/* Data Table or Empty State */}
      {reports.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-xl border border-brand-gray-200 bg-white p-12 text-center">
          <DollarSign className="text-brand-gray-300" size={48} />
          <h2 className="mt-4 text-lg font-semibold text-brand-charcoal">
            No salary reports yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-brand-gray-500">
            Be the first to contribute. Your anonymous report helps other nurses
            negotiate fair pay.
          </p>
          <Link
            href="/nurse/salary/submit"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover"
          >
            <Plus size={16} />
            Submit Your Salary
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-brand-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                <th className="px-4 py-3 font-medium text-brand-gray-500">Facility</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Location</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Specialty</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Pay Package</th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">Status</th>
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
                      <div className="text-brand-charcoal font-medium">
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
                        {report.agency_gap_detected && (
                          <span className="inline-flex items-center rounded-full bg-brand-danger-light px-2 py-0.5 text-xs font-medium text-brand-danger">
                            Lowball Offer
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
