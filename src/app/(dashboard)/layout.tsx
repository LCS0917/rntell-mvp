import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/SidebarNav";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") redirect("/admin");

  const role = (profile?.role || user.user_metadata?.role) as string | undefined;

  return (
    <div className="flex min-h-screen">
      <SidebarNav role={role} email={user.email ?? ""} signOut={signOut} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b border-brand-gray-200 bg-white px-6">
          <p className="text-sm text-brand-gray-500">
            Signed in as{" "}
            <span className="font-medium text-brand-charcoal">{user.email}</span>
          </p>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
