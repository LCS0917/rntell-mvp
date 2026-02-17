"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
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

      router.push("/dashboard");
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

      router.push("/dashboard");
    }

    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
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
              href="/signup"
              className="font-medium text-brand-orange hover:text-brand-orange-hover"
            >
              Sign Up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
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
