import { getAdminProfile } from "@/app/actions/admin";
import { ExternalLink } from "lucide-react";

export default async function AdminSettingsPage() {
  const profile = await getAdminProfile();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-brand-charcoal">Settings</h1>

      {/* Admin info */}
      <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">
          Admin Account
        </h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-brand-gray-500">Email:</span>{" "}
            <span className="font-medium text-brand-charcoal">{profile.email}</span>
          </p>
          <p>
            <span className="text-brand-gray-500">Role:</span>{" "}
            <span className="inline-block rounded-full bg-brand-charcoal px-2 py-0.5 text-xs font-semibold text-white">
              {profile.role}
            </span>
          </p>
        </div>
      </div>

      {/* Platform toggles */}
      <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold text-brand-charcoal">
          Platform Status
        </h2>
        <p className="mb-4 text-xs text-brand-gray-400">
          These are display only. Backend enforcement coming in a future build.
        </p>
        <div className="space-y-3">
          {[
            { label: "Nurse Signups", status: "Open" },
            { label: "Facility Signups", status: "Open" },
            { label: "Contract Analysis Tool", status: "Open" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg border border-brand-gray-200 px-4 py-3"
            >
              <span className="text-sm font-medium text-brand-charcoal">
                {item.label}
              </span>
              <span className="rounded-full bg-brand-green-light px-3 py-0.5 text-xs font-semibold text-brand-success-dark">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">
          Quick Links
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            {
              label: "Supabase Table Editor",
              href: "https://supabase.com/dashboard/project/mcwhelgpzummhjhebquw/editor",
            },
            {
              label: "Supabase Auth",
              href: "https://supabase.com/dashboard/project/mcwhelgpzummhjhebquw/auth/users",
            },
            {
              label: "Supabase SQL Editor",
              href: "https://supabase.com/dashboard/project/mcwhelgpzummhjhebquw/sql",
            },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-gray-200 px-4 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
            >
              {link.label}
              <ExternalLink size={14} className="text-brand-gray-400" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
