import { getCredentialStats } from "@/app/actions/admin";
import { ShieldCheck } from "lucide-react";

export default async function AdminCredentialsPage() {
  const stats = await getCredentialStats();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-charcoal">Credentials</h1>

      <div className="rounded-xl border border-brand-gray-200 bg-white p-8 text-center">
        <ShieldCheck size={40} className="mx-auto mb-4 text-brand-gray-300" />
        <p className="text-lg font-semibold text-brand-charcoal">
          Credential review is coming soon.
        </p>
        <div className="mt-4 space-y-1">
          <p className="text-sm text-brand-gray-500">
            Total documents uploaded:{" "}
            <span className="font-bold text-brand-charcoal">{stats.totalDocuments}</span>
          </p>
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <p key={status} className="text-sm text-brand-gray-500">
              {status}:{" "}
              <span className="font-bold text-brand-charcoal">{count}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
