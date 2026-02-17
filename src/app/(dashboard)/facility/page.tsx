import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Facility Dashboard | RNTell",
};

export default async function FacilityDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-charcoal">
        Facility Dashboard
      </h1>
      <p className="mt-2 text-brand-gray-500">
        Your facility dashboard is being built. Check back soon.
      </p>
    </div>
  );
}
