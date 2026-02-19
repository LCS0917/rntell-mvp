import Link from "next/link";
import { Briefcase, Users } from "lucide-react";
import {
  getApplicationsForFacility,
  getFacilityJobPostings,
} from "@/app/actions/jobs";
import { ApplicationPipeline } from "./ApplicationPipeline";

export const metadata = {
  title: "Applications | RNTell",
};

export default async function FacilityApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const initialStatus = params.status ? [params.status] : undefined;

  const [{ data: applications, error }, { data: jobPostings }] =
    await Promise.all([
      getApplicationsForFacility(),
      getFacilityJobPostings(),
    ]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
          <Users className="text-brand-orange" size={28} />
          Applications
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Review nurse applications, manage your hiring pipeline, and track
          candidates through each stage.
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
            No applications yet.
          </h2>
          <p className="mt-2 max-w-sm text-sm text-brand-gray-500">
            Once nurses apply to your job postings, their applications will
            appear here. Make sure you have active job postings.
          </p>
          <Link
            href="/facility/jobs"
            className="mt-4 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-hover"
          >
            Manage Job Postings
          </Link>
        </div>
      ) : (
        <ApplicationPipeline
          applications={applications}
          jobPostings={jobPostings}
          initialStatusFilter={initialStatus}
        />
      )}
    </div>
  );
}
