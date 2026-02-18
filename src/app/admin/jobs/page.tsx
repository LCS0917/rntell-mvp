import { getJobs } from "@/app/actions/admin";
import JobsClient from "./JobsClient";

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const jobs = await getJobs({
    search: params.search,
    specialty: params.specialty,
    state: params.state,
    data_source: params.data_source,
    active: params.active,
  });

  return <JobsClient jobs={jobs} filters={params} />;
}
