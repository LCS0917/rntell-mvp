import { getNurses } from "@/app/actions/admin";
import NursesClient from "./NursesClient";

export default async function AdminNursesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const nurses = await getNurses({
    search: params.search,
    verification_status: params.verification_status,
    specialty: params.specialty,
    license_state: params.license_state,
  });

  return <NursesClient nurses={nurses} filters={params} />;
}
