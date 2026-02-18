import { getFacilities } from "@/app/actions/admin";
import FacilitiesClient from "./FacilitiesClient";

export default async function AdminFacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const facilities = await getFacilities({
    search: params.search,
    state: params.state,
    claimed: params.claimed,
    verification_status: params.verification_status,
    data_source: params.data_source,
  });

  return <FacilitiesClient facilities={facilities} filters={params} />;
}
