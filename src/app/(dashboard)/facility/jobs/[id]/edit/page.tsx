import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getFacilityJobPostingById } from "@/app/actions/jobs";
import { EditJobClient } from "./EditJobClient";

export const metadata = {
  title: "Edit Job Posting | RNTell",
};

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: job, error } = await getFacilityJobPostingById(id);

  if (error || !job) {
    redirect("/facility/jobs");
  }

  return <EditJobClient job={job} />;
}
