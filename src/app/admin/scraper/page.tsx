import { getScrapeJobs } from "@/app/actions/admin";
import ScraperClient from "./ScraperClient";

export default async function ScraperPage() {
  try {
    const jobs = await getScrapeJobs();
    return <ScraperClient jobs={jobs} />;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load scraper data.";
    return <ScraperClient jobs={[]} initError={message} />;
  }
}
