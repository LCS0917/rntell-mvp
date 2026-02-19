import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getFacilityJobPostings } from "@/app/actions/jobs";
import { JobListingTable } from "./JobListingTable";

export const metadata = {
  title: "My Job Postings | RNTell",
};

export default async function FacilityJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: jobs, error } = await getFacilityJobPostings();

  return (
    <div className="bg-brand-warm min-h-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C2C2C]">My Job Postings</h1>
          <p className="mt-1 text-sm text-brand-gray-500">
            Manage your open positions and attract direct-hire nurses.
          </p>
        </div>
        <Link
          href="/facility/jobs/new"
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600"
        >
          <Plus size={16} />
          Post a New Job
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-gray-100">
            <Plus size={28} className="text-brand-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-[#2C2C2C]">
            You haven&apos;t posted any jobs yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-brand-gray-500">
            Nurses are waiting to apply directly. Post your first job to start
            building your talent pipeline without recruiter fees.
          </p>
          <Link
            href="/facility/jobs/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 font-medium text-white hover:bg-orange-600"
          >
            <Plus size={16} />
            Post a New Job
          </Link>
        </div>
      ) : (
        <JobListingTable jobs={jobs} />
      )}
    </div>
  );
}
