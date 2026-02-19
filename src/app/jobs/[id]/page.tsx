import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJobById } from "@/app/actions/jobs";
import { createClient } from "@/utils/supabase/server";
import { JobDetailClient } from "./JobDetailClient";
import Footer from "@/components/ui/Footer";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data: job } = await getJobById(id);

  if (!job) {
    return { title: "Job Not Found | RNTell" };
  }

  const city = job.facilities?.location_city;
  const state = job.facilities?.location_state;
  const location = city && state ? `${city}, ${state}` : "";
  const weekly = job.pay_package_total
    ? `$${job.pay_package_total.toLocaleString()}`
    : "";

  return {
    title: `${job.specialty} Travel RN — ${location} | RNTell`,
    description: `${job.contract_weeks || 13}-week ${job.specialty} contract in ${location}. ${weekly}/week. Apply directly.`,
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: job, error } = await getJobById(id);

  if (!job || error) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <JobDetailClient job={job} isLoggedIn={!!user} />
      <Footer />
    </>
  );
}
