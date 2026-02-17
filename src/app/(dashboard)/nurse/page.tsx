import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Nurse Dashboard | RNTell",
};

export default async function NurseDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = user.user_metadata?.full_name || user.email;

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-charcoal">
        Welcome, Nurse {name}
      </h1>
      <p className="mt-2 text-brand-gray-500">
        Your nurse dashboard is being built. Check back soon.
      </p>
    </div>
  );
}
