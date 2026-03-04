import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  FileText,
  Briefcase,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { getCredentials } from "@/app/actions/credentials";

export const metadata = {
  title: "My License HQ | RNTell",
};

export default async function NurseDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = user.user_metadata?.full_name || user.email;

  // Fetch nurse profile for Passport summary
  const { data: nurse } = await supabase
    .from("nurses")
    .select("specialty, years_experience, license_state, license_compact, verification_status")
    .eq("id", user.id)
    .single();

  const { data: credentials } = await getCredentials();
  const verifiedCount = credentials.filter((c) => c.status === "verified").length;

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-charcoal">
          CEO of My License
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Welcome back, {name}. Own your career. Capture your margin.
        </p>
      </div>

      {/* Nurse Passport Card */}
      <div className="mb-8 rounded-xl border border-brand-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield size={20} className="text-brand-orange" />
          <h2 className="text-lg font-semibold text-brand-charcoal">
            Nurse Passport
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-brand-gray-100 p-4">
            <p className="text-xs font-medium text-brand-gray-500">Specialty</p>
            <p className="mt-1 text-lg font-semibold text-brand-charcoal">
              {nurse?.specialty ?? "Not set"}
            </p>
          </div>
          <div className="rounded-lg bg-brand-gray-100 p-4">
            <p className="text-xs font-medium text-brand-gray-500">Experience</p>
            <p className="mt-1 text-lg font-semibold text-brand-charcoal">
              {nurse?.years_experience ?? 0} years
            </p>
          </div>
          <div className="rounded-lg bg-brand-gray-100 p-4">
            <p className="text-xs font-medium text-brand-gray-500">License</p>
            <p className="mt-1 text-lg font-semibold text-brand-charcoal">
              {nurse?.license_state ?? "—"}
              {nurse?.license_compact && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-brand-mint-100 px-2 py-0.5 text-xs font-medium text-brand-success-dark">
                  Compact
                </span>
              )}
            </p>
          </div>
          <div className="rounded-lg bg-brand-gray-100 p-4">
            <p className="text-xs font-medium text-brand-gray-500">
              Credentials Verified
            </p>
            <p className="mt-1 text-lg font-semibold text-brand-charcoal">
              {verifiedCount} / {credentials.length}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions — Margin Capture */}
      <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">
        Capture Your Margin
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/nurse/pay"
          className="group flex items-start gap-4 rounded-xl border border-brand-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-green-light">
            <DollarSign size={20} className="text-brand-success-dark" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-brand-charcoal group-hover:text-brand-orange">
              Pay Center
            </h3>
            <p className="mt-0.5 text-sm text-brand-gray-500">
              Calculate your market value, browse salary data, and negotiate
              with real numbers.
            </p>
          </div>
          <ChevronRight size={16} className="mt-1 text-brand-gray-300 group-hover:text-brand-orange" />
        </Link>

        <Link
          href="/nurse/jobs"
          className="group flex items-start gap-4 rounded-xl border border-brand-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-mint-50">
            <Briefcase size={20} className="text-brand-success-dark" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-brand-charcoal group-hover:text-brand-orange">
              Direct-Hire Jobs
            </h3>
            <p className="mt-0.5 text-sm text-brand-gray-500">
              Apply directly to facilities — no recruiter, no middleman cut.
            </p>
          </div>
          <ChevronRight size={16} className="mt-1 text-brand-gray-300 group-hover:text-brand-orange" />
        </Link>

        <Link
          href="/nurse/credentials"
          className="group flex items-start gap-4 rounded-xl border border-brand-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-gray-100">
            <FileText size={20} className="text-brand-charcoal" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-brand-charcoal group-hover:text-brand-orange">
              Credential Vault
            </h3>
            <p className="mt-0.5 text-sm text-brand-gray-500">
              Upload and verify your licenses and certifications.
            </p>
          </div>
          <ChevronRight size={16} className="mt-1 text-brand-gray-300 group-hover:text-brand-orange" />
        </Link>
      </div>
    </div>
  );
}
