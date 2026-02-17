import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role;

  if (role === "facility") {
    redirect("/facility");
  }

  // Default to nurse dashboard
  redirect("/nurse");
}
