import { getAnalyses } from "@/app/actions/admin";
import AnalysesClient from "./AnalysesClient";

export default async function AdminAnalysesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const analyses = await getAnalyses({
    state: params.state,
    specialty: params.specialty,
    claimed: params.claimed,
    margin_risk: params.margin_risk,
    date_from: params.date_from,
    date_to: params.date_to,
  });

  return <AnalysesClient analyses={analyses} filters={params} />;
}
