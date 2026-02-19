"use client";

import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    // For MVP, just mark as sent — no backend wiring yet.
    // Replace with server action or API route when ready.
    await new Promise((r) => setTimeout(r, 600));
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-brand-mint-100 bg-brand-mint-50 p-8 text-center">
        <p className="text-lg font-semibold text-brand-success-dark">
          Message sent!
        </p>
        <p className="mt-2 text-sm text-brand-gray-500">
          We&apos;ll get back to you as soon as possible.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-brand-gray-200 bg-white p-8 shadow-sm"
    >
      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-sm font-medium text-brand-charcoal"
        >
          Name <span className="text-brand-danger">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full rounded-lg border border-brand-gray-200 px-4 py-2.5 text-sm text-brand-charcoal outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-brand-charcoal"
        >
          Email <span className="text-brand-danger">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-brand-gray-200 px-4 py-2.5 text-sm text-brand-charcoal outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
        />
      </div>

      <div>
        <label
          htmlFor="role"
          className="mb-1 block text-sm font-medium text-brand-charcoal"
        >
          I am a...
        </label>
        <select
          id="role"
          name="role"
          className="w-full rounded-lg border border-brand-gray-200 px-4 py-2.5 text-sm text-brand-charcoal outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
        >
          <option value="">Select one</option>
          <option value="nurse">Nurse</option>
          <option value="facility">Facility</option>
          <option value="landlord">Landlord</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-1 block text-sm font-medium text-brand-charcoal"
        >
          Message <span className="text-brand-danger">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          className="w-full rounded-lg border border-brand-gray-200 px-4 py-2.5 text-sm text-brand-charcoal outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
        />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-brand-orange px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-60"
      >
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
