"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { claimAnalyses } from "@/app/actions/claimAnalysis";
import { FileText, Briefcase } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "signup";
  fromAnalyze?: boolean;
  fromJobs?: boolean;
  jobId?: string;
}

export default function AuthForm({
  mode,
  fromAnalyze,
  fromJobs,
  jobId,
}: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"nurse" | "facility">("nurse");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
          },
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    // Claim any anonymous analyses from the /analyze flow
    if (fromAnalyze) {
      await claimAnalyses();
    }

    // Redirect back to job listing if coming from jobs flow
    if (fromJobs && jobId) {
      router.push(`/jobs/${jobId}`);
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  };

  // Build cross-link search params preserving flow context
  function crossLinkHref(targetMode: "login" | "signup"): string {
    const base = targetMode === "login" ? "/login" : "/signup";
    const params = new URLSearchParams();
    if (fromAnalyze) params.set("from", "analyze");
    if (fromJobs) {
      params.set("from", "jobs");
      if (jobId) params.set("job_id", jobId);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
      {/* Contextual banner when coming from /analyze */}
      {fromAnalyze && (
        <div className="flex items-start gap-3 rounded-lg border border-brand-orange/30 bg-brand-peach-50 p-4">
          <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-orange" />
          <p className="text-sm text-brand-charcoal">
            Your contract analysis is saved.{" "}
            {mode === "signup"
              ? "Create your free account to unlock negotiation levers and smart job matching for your offer."
              : "Sign in to unlock negotiation levers and smart job matching for your offer."}
          </p>
        </div>
      )}

      {/* Contextual banner when coming from /jobs */}
      {fromJobs && (
        <div className="flex items-start gap-3 rounded-lg border border-brand-orange/30 bg-brand-peach-50 p-4">
          <Briefcase className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-orange" />
          <p className="text-sm text-brand-charcoal">
            {mode === "signup"
              ? "Create a free account to apply directly to this position."
              : "Sign in to apply directly to this position."}
          </p>
        </div>
      )}

      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-charcoal">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          {mode === "login"
            ? "Sign in to continue to RNTell"
            : "Get started with RNTell"}
        </p>
      </div>

      {mode === "signup" && (
        <div className="flex rounded-lg border border-brand-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setRole("nurse")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              role === "nurse"
                ? "bg-brand-orange text-white"
                : "text-brand-gray-500 hover:text-brand-charcoal"
            }`}
          >
            I am a Nurse
          </button>
          <button
            type="button"
            onClick={() => setRole("facility")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              role === "facility"
                ? "bg-brand-orange text-white"
                : "text-brand-gray-500 hover:text-brand-charcoal"
            }`}
          >
            I am a Facility
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-brand-charcoal"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-brand-charcoal placeholder-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-brand-charcoal"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 block w-full rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-brand-charcoal placeholder-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            placeholder="At least 6 characters"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-50"
      >
        {loading
          ? "Please wait..."
          : mode === "login"
            ? "Sign In"
            : "Create Account"}
      </button>

      <p className="text-center text-sm text-brand-gray-500">
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href={crossLinkHref("signup")}
              className="font-medium text-brand-orange hover:text-brand-orange-hover"
            >
              Sign Up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={crossLinkHref("login")}
              className="font-medium text-brand-orange hover:text-brand-orange-hover"
            >
              Sign In
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
