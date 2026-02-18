import {
  getApplicationsForFacility,
  type ApplicationWithDetails,
} from "@/app/actions/jobs";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import {
  Users,
  ShieldCheck,
  Clock,
  Briefcase,
  MapPin,
  FileText,
} from "lucide-react";

export const metadata = {
  title: "Incoming Applications | RNTell",
};

export default async function CandidatesPage() {
  const { data: applications, error } = await getApplicationsForFacility();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
          <Users className="text-brand-orange" size={28} />
          Incoming Applications
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Review nurse applications and see their verified credential status.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-brand-danger-light px-4 py-2 text-sm text-brand-danger">
          {error}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-brand-gray-200 bg-white p-12 text-center">
          <Briefcase className="text-brand-gray-300" size={48} />
          <h2 className="mt-4 text-lg font-semibold text-brand-charcoal">
            No applications yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-brand-gray-500">
            Once nurses apply to your job postings, their applications will
            appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-brand-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Nurse
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Job
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Credentials
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-brand-gray-500">
                  Applied
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray-200">
              {applications.map((app: ApplicationWithDetails) => {
                const nurse = app.nurses;
                const isVerified =
                  nurse?.verification_status === "verified" &&
                  nurse?.license_verified;

                return (
                  <tr key={app.id} className="hover:bg-brand-gray-100/50">
                    {/* Nurse Info */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-charcoal">
                        {nurse?.specialty ?? "RN"} Nurse
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-brand-gray-500">
                        {nurse?.years_experience != null && (
                          <span>{nurse.years_experience} yrs exp</span>
                        )}
                        {nurse?.license_state && (
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin size={10} />
                            {nurse.license_state}
                          </span>
                        )}
                        {nurse?.license_compact && (
                          <span className="rounded bg-brand-gray-100 px-1.5 py-0.5 text-xs">
                            Compact
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Job */}
                    <td className="px-4 py-3 text-brand-gray-500">
                      {app.job_postings.title}
                    </td>

                    {/* Credential Status */}
                    <td className="px-4 py-3">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-light px-2 py-0.5 text-xs font-semibold text-brand-success-dark">
                          <ShieldCheck size={12} />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-peach-100/40 px-2 py-0.5 text-xs font-semibold text-brand-orange">
                          <Clock size={12} />
                          {nurse?.verification_status === "pending"
                            ? "Pending"
                            : "Unverified"}
                        </span>
                      )}
                    </td>

                    {/* Application Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} applicationId={app.id} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-brand-gray-500">
                      {new Date(app.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
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
