"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut, DollarSign, Users, FileText,
  Inbox, BarChart3, ClipboardList, ClipboardCheck, Sparkles,
  Briefcase, HelpCircle, Layout, BookOpen,
} from "lucide-react";

type Props = {
  role: string | undefined;
  email: string;
  signOut: () => Promise<void>;
};

export function SidebarNav({ role, signOut }: Props) {
  const pathname = usePathname();

  function navClass(href: string) {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-brand-green-light text-brand-success-dark font-semibold"
        : "text-brand-charcoal hover:bg-brand-gray-100"
    }`;
  }

  return (
    <aside className="flex w-64 flex-col border-r border-brand-gray-200 bg-white">
      <div className="p-6">
        <Link href="/dashboard" className="text-xl font-bold text-brand-orange">
          RNTell
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        <Link href="/dashboard" className={navClass("/dashboard")}>
          <BarChart3 size={16} />
          Market Snapshot
        </Link>
        <Link href="/nurse/smartrn" className={navClass("/nurse/smartrn")}>
          <Sparkles size={16} />
          SmartRN
        </Link>
        {role === "nurse" && (
          <>
            <Link href="/nurse" className={navClass("/nurse")}>
              My License HQ
            </Link>
            <Link href="/nurse/pay" className={navClass("/nurse/pay")}>
              <DollarSign size={16} />
              Pay Center
            </Link>
            <Link href="/nurse/social" className={navClass("/nurse/social")}>
              <Users size={16} />
              Find Roommates
            </Link>
            <Link href="/nurse/jobs" className={navClass("/nurse/jobs")}>
              <ClipboardCheck size={16} />
              My Applications
            </Link>
            <Link href="/nurse/credentials" className={navClass("/nurse/credentials")}>
              <FileText size={16} />
              Credential Vault
            </Link>
          </>
        )}
        {role === "facility" && (
          <>
            <Link href="/facility" className={navClass("/facility")}>
              Employer Dashboard
            </Link>
            <Link href="/facility/jobs" className={navClass("/facility/jobs")}>
              <ClipboardList size={16} />
              My Job Postings
            </Link>
            <Link href="/facility/applications" className={navClass("/facility/applications")}>
              <Inbox size={16} />
              Applications
            </Link>
          </>
        )}
        {role === "admin" && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-brand-gray-400">Admin</p>
            </div>
            <Link href="/admin/cms" className={navClass("/admin/cms")}>
              <Layout size={16} />
              Page Editor
            </Link>
            <Link href="/admin/blog" className={navClass("/admin/blog")}>
              <BookOpen size={16} />
              Blog Posts
            </Link>
          </>
        )}
        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-brand-gray-400">Explore</p>
        </div>
        <Link href="/jobs" className={navClass("/jobs")}>
          <Briefcase size={16} />
          Browse Jobs
        </Link>
        <Link href="/questions" className={navClass("/questions")}>
          <HelpCircle size={16} />
          Questions
        </Link>
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
  );
}
