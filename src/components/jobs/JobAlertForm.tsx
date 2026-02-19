"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { subscribeJobAlert } from "@/app/actions/jobs";

export function JobAlertForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await subscribeJobAlert({ name, email });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-lg bg-brand-green-light p-4 text-sm text-brand-success-dark">
        You&apos;re signed up! We&apos;ll notify you when new jobs match your
        criteria.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-medium text-brand-charcoal">
        <Bell size={14} />
        Get notified when new jobs are posted
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
        />
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-50"
        >
          {isPending ? "..." : "Notify Me"}
        </button>
      </div>
      {error && <p className="text-xs text-brand-danger">{error}</p>}
    </form>
  );
}
