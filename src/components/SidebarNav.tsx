"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut, DollarSign, TrendingUp, Users, FileText,
  Inbox, BarChart3, ClipboardList, ClipboardCheck, Sparkles,
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
        <Link href="/smartrn" className={navClass("/smartrn")}>
          <Sparkles size={16} />
          SmartRN
        </Link>
        {role === "nurse" && (
          <>
            <Link href="/nurse" className={navClass("/nurse")}>
              My License HQ
            </Link>
            <Link href="/nurse/pay-intelligence" className={navClass("/nurse/pay-intelligence")}>
              <TrendingUp size={16} />
              Pay Intelligence
            </Link>
            <Link href="/nurse/salary" className={navClass("/nurse/salary")}>
              <DollarSign size={16} />
              Pay Database
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
