import { getScrapeJobs } from "@/app/actions/admin";
import ScraperClient from "./ScraperClient";

export default async function ScraperPage() {
  const jobs = await getScrapeJobs();
  return <ScraperClient jobs={jobs} />;
}
