"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";

type VerifyResult = {
  name: string;
  licenseNumber: string;
  status: string;
  expiryDate: string | null;
  state: string;
  issuingBody: string;
  isActive: boolean;
};

export function VerifyLicenseForm() {
  const router = useRouter();
  const [licenseNumber, setLicenseNumber] = useState("");
  const [state, setState] = useState("CA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function handleVerify() {
    if (!licenseNumber.trim()) {
      setError("Please enter your license number.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/verify-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseNumber: licenseNumber.trim(), state }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed. Please try again.");
      } else {
        setResult(data.license);
        router.refresh();
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl border border-brand-success-dark/20 bg-brand-green-light p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-success-dark">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-success-dark">License Verified</h3>
            <p className="text-sm text-brand-success-dark/70">Pulled directly from the {result.state} state registry</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <div><span className="text-brand-gray-500">Name</span><p className="font-medium text-brand-charcoal">{result.name}</p></div>
          <div><span className="text-brand-gray-500">License Number</span><p className="font-medium text-brand-charcoal">{result.licenseNumber}</p></div>
          <div><span className="text-brand-gray-500">Status</span><p className="font-medium text-brand-charcoal">{result.status}</p></div>
          <div><span className="text-brand-gray-500">Expires</span><p className="font-medium text-brand-charcoal">{result.expiryDate ? new Date(result.expiryDate).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}</p></div>
          <div className="sm:col-span-2"><span className="text-brand-gray-500">Issuing Body</span><p className="font-medium text-brand-charcoal">{result.issuingBody}</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-brand-orange/20 bg-brand-peach-50 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-brand-charcoal">Verify Your RN License</h3>
          <p className="text-sm text-brand-gray-500">Instantly verified against the state registry — no upload needed</p>
        </div>
      </div>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-brand-danger-light px-4 py-2 text-sm text-brand-danger">
          <AlertCircle size={14} />{error}
        </div>
      )}
      <div className="flex gap-3">
        <select value={state} onChange={(e) => setState(e.target.value)} className="rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-orange focus:outline-none">
          <option value="CA">CA</option>
          <option value="WA">WA</option>
        </select>
        <input
          type="text"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="Enter license number"
          className="flex-1 rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
        />
        <button onClick={handleVerify} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover disabled:opacity-50">
          {loading ? <><Loader2 size={14} className="animate-spin" />Verifying...</> : <><ShieldCheck size={14} />Verify</>}
        </button>
      </div>
      <p className="mt-3 text-xs text-brand-gray-400">Currently supported: California (DCA) and Washington. More states coming soon.</p>
    </div>
  );
}
