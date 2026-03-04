import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Home,
  FileSearch,
  ShieldCheck,
  DollarSign,
  Settings,
  Bot,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, comingSoon: false },
  { href: "/admin/nurses", label: "Nurses", icon: Users, comingSoon: false },
  { href: "/admin/facilities", label: "Facilities", icon: Building2, comingSoon: false },
  { href: "/admin/jobs", label: "Job Listings", icon: Briefcase, comingSoon: false },
  { href: "/admin/scraper", label: "Scraper", icon: Bot, comingSoon: false },
  { href: "/admin/rentals", label: "Rental Listings", icon: Home, comingSoon: true },
  { href: "/admin/analyses", label: "Analyses", icon: FileSearch, comingSoon: false },
  { href: "/admin/credentials", label: "Credentials", icon: ShieldCheck, comingSoon: true },
  { href: "/admin/fees", label: "Fees", icon: DollarSign, comingSoon: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, comingSoon: false },
  { href: "/admin/cms", label: "Page Editor", icon: LayoutDashboard, comingSoon: false },
  { href: "/admin/blog", label: "Blog Posts", icon: FileSearch, comingSoon: false },
];

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AdminLayout({
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

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-brand-gray-200 bg-white">
        <div className="p-6">
          <Link href="/admin" className="text-xl font-bold text-brand-charcoal">
            RNTell <span className="text-sm font-normal text-brand-gray-500">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.comingSoon) {
              return (
                <span
                  key={item.href}
                  className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-gray-400"
                >
                  <Icon size={16} />
                  {item.label}
                  <span className="ml-auto rounded-full bg-brand-gray-200 px-2 py-0.5 text-[10px] font-medium text-brand-gray-500">
                    Soon
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
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
        {/* Header — visually distinct from regular dashboard */}
        <header className="flex h-16 items-center border-b border-brand-gray-200 bg-brand-charcoal px-6">
          <p className="text-sm text-brand-gray-300">
            <span className="font-semibold text-white">RNTell Admin</span>
            <span className="mx-2 text-brand-gray-500">|</span>
            {user.email}
          </p>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-brand-gray-100 p-6">{children}</main>
      </div>
    </div>
  );
}
