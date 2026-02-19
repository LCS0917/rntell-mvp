import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  DollarSign,
  TrendingUp,
  Users,
  Briefcase,
  FileText,
  Inbox,
  BarChart3,
  ClipboardList,
} from "lucide-react";

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

  if (!user) {
    redirect("/login");
  }

  // Admin users should never see the regular dashboard — send them to /admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  const role = (profile?.role || user.user_metadata?.role) as string | undefined;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-brand-gray-200 bg-white">
        <div className="p-6">
          <Link href="/dashboard" className="text-xl font-bold text-brand-orange">
            RNTell
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {/* Market Snapshot — shared across roles */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
          >
            <BarChart3 size={16} />
            Market Snapshot
          </Link>

          {role === "nurse" && (
            <>
              <Link
                href="/nurse"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
              >
                My License HQ
              </Link>
              <Link
                href="/nurse/pay-intelligence"
                className="flex items-center gap-2 rounded-lg bg-brand-green-light px-3 py-2 text-sm font-semibold text-brand-success-dark hover:bg-brand-mint-100"
              >
                <TrendingUp size={16} />
                Pay Intelligence
              </Link>
              <Link
                href="/nurse/salary"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
              >
                <DollarSign size={16} />
                Pay Database
              </Link>
              <Link
                href="/nurse/social"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
              >
                <Users size={16} />
                Find Roommates
              </Link>
              <Link
                href="/nurse/jobs"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
              >
                <Briefcase size={16} />
                Direct-Hire Jobs
              </Link>
              <Link
                href="/nurse/credentials"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
              >
                <FileText size={16} />
                Credential Vault
              </Link>
            </>
          )}
          {role === "facility" && (
            <>
              <Link
                href="/facility"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
              >
                Employer Dashboard
              </Link>
              <Link
                href="/facility/jobs"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
              >
                <ClipboardList size={16} />
                My Job Postings
              </Link>
              <Link
                href="/facility/candidates"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
              >
                <Inbox size={16} />
                Talent Pipeline
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-brand-gray-200 p-3">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-gray-500 hover:bg-brand-gray-100 hover:text-brand-charcoal"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center border-b border-brand-gray-200 bg-white px-6">
          <p className="text-sm text-brand-gray-500">
            Signed in as{" "}
            <span className="font-medium text-brand-charcoal">
              {user.email}
            </span>
          </p>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
