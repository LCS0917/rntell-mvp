import { getCredentials, type Credential } from "@/app/actions/credentials";
import { UploadCredentialForm } from "@/components/credentials/UploadCredentialForm";
import { ShieldCheck, Clock, AlertTriangle, FileText } from "lucide-react";

export const metadata = {
  title: "Credential Vault | RNTell",
};

const STATUS_CONFIG = {
  verified: {
    label: "Verified",
    bg: "bg-brand-green-light",
    text: "text-brand-success-dark",
    icon: ShieldCheck,
  },
  pending: {
    label: "Pending",
    bg: "bg-brand-peach-100/40",
    text: "text-brand-orange",
    icon: Clock,
  },
  expired: {
    label: "Expired",
    bg: "bg-brand-danger-light",
    text: "text-brand-danger",
    icon: AlertTriangle,
  },
} as const;

export default async function CredentialsPage() {
  const { data: credentials, error } = await getCredentials();

  const verifiedCount = credentials.filter(
    (c) => c.status === "verified"
  ).length;
  const pendingCount = credentials.filter(
    (c) => c.status === "pending"
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
            <FileText className="text-brand-orange" size={28} />
            Credential Vault
          </h1>
          <p className="mt-1 text-sm text-brand-gray-500">
            Manage your licenses and certifications. Verified credentials make
            you stand out to facilities.
          </p>
        </div>
        <UploadCredentialForm />
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-gray-200 bg-white p-4">
          <p className="text-sm text-brand-gray-500">Total Credentials</p>
          <p className="mt-1 text-2xl font-bold text-brand-charcoal">
            {credentials.length}
          </p>
        </div>
        <div className="rounded-xl border border-brand-gray-200 bg-white p-4">
          <p className="text-sm text-brand-gray-500">Verified</p>
          <p className="mt-1 text-2xl font-bold text-brand-success-dark">
            {verifiedCount}
          </p>
        </div>
        <div className="rounded-xl border border-brand-gray-200 bg-white p-4">
          <p className="text-sm text-brand-gray-500">Pending Review</p>
          <p className="mt-1 text-2xl font-bold text-brand-orange">
            {pendingCount}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-brand-danger-light px-4 py-2 text-sm text-brand-danger">
          {error}
        </div>
      )}

      {/* Credential List */}
      {credentials.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-brand-gray-200 bg-white p-12 text-center">
          <FileText className="text-brand-gray-300" size={48} />
          <h2 className="mt-4 text-lg font-semibold text-brand-charcoal">
            No credentials yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-brand-gray-500">
            Upload your licenses and certifications to get verified and unlock
            direct-hire opportunities.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((credential: Credential) => {
            const config = STATUS_CONFIG[credential.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={credential.id}
                className="flex items-center justify-between rounded-xl border border-brand-gray-200 bg-white p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gray-100">
                    <FileText size={20} className="text-brand-gray-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-brand-charcoal">
                      {credential.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-brand-gray-500">
                      {credential.issuing_body}
                      {credential.expiry_date && (
                        <span>
                          {" "}
                          &middot; Expires{" "}
                          {new Date(credential.expiry_date).toLocaleDateString(
                            "en-US",
                            { month: "short", year: "numeric" }
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text}`}
                >
                  <StatusIcon size={12} />
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
