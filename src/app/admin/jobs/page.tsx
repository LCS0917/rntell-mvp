import { getJobs, getFacilityList } from "@/app/actions/admin";
import JobsClient from "./JobsClient";

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const [jobs, facilities] = await Promise.all([
    getJobs({
      search: params.search,
      specialty: params.specialty,
      state: params.state,
      data_source: params.data_source,
      active: params.active,
    }),
    getFacilityList(),
  ]);

  return <JobsClient jobs={jobs} filters={params} facilities={facilities} />;
}
