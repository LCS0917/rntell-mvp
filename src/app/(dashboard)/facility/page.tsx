import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Inbox,
  Users,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { getApplicationsForFacility } from "@/app/actions/jobs";

export const metadata = {
  title: "Facility Dashboard | RNTell",
};

export default async function FacilityDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get facility info
  const { data: facility } = await supabase
    .from("facilities")
    .select("name, location_city, location_state, is_verified")
    .eq("id", user.id)
    .single();

  // Get application stats
  const { data: apps } = await getApplicationsForFacility();
  const newApps = apps.filter((a) => a.status === "submitted").length;
  const interviewApps = apps.filter((a) => a.status === "interview").length;

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-charcoal">
          {facility?.name ?? "Facility"} Dashboard
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Hire directly. Save on recruiter fees. Build your talent pipeline.
        </p>
      </div>

      {/* Stats Row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-peach-50">
              <Inbox size={20} className="text-brand-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-charcoal">{newApps}</p>
              <p className="text-xs text-brand-gray-500">New Applications</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-mint-50">
              <Users size={20} className="text-brand-success-dark" />
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-charcoal">
                {interviewApps}
              </p>
              <p className="text-xs text-brand-gray-500">In Interview</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green-light">
              <DollarSign size={20} className="text-brand-success-dark" />
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-charcoal">{apps.length}</p>
              <p className="text-xs text-brand-gray-500">Total Pipeline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">
        Manage Your Pipeline
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/facility/candidates"
          className="group flex items-start gap-4 rounded-xl border border-brand-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-peach-50">
            <Inbox size={20} className="text-brand-orange" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-brand-charcoal group-hover:text-brand-orange">
              Review Applications
            </h3>
            <p className="mt-0.5 text-sm text-brand-gray-500">
              Review incoming nurse applications and manage your hiring pipeline.
            </p>
          </div>
          <ChevronRight
            size={16}
            className="mt-1 text-brand-gray-300 group-hover:text-brand-orange"
          />
        </Link>
      </div>
    </div>
  );
}
