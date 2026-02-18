"use client";

import { uploadCredential } from "@/app/actions/credentials";
import { Upload, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function UploadCredentialForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const type = form.get("type") as "license" | "certification";
    const issuingBody = form.get("issuing_body") as string;
    const expiryDate = form.get("expiry_date") as string;

    if (!name || !issuingBody) {
      setError("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      const result = await uploadCredential({
        name,
        type,
        issuing_body: issuingBody,
        expiry_date: expiryDate || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover"
      >
        <Upload size={16} />
        Upload Credential
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-brand-charcoal">
        Upload a Credential
      </h2>
      <p className="mt-1 text-sm text-brand-gray-500">
        Simulated for MVP — documents will be stored in Supabase Storage in
        production.
      </p>

      {error && (
        <div className="mt-3 rounded-lg bg-brand-danger-light px-4 py-2 text-sm text-brand-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-brand-charcoal"
          >
            Credential Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. RN License — California"
            className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="type"
              className="mb-1 block text-sm font-medium text-brand-charcoal"
            >
              Type *
            </label>
            <select
              id="type"
              name="type"
              required
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
            >
              <option value="license">License</option>
              <option value="certification">Certification</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="issuing_body"
              className="mb-1 block text-sm font-medium text-brand-charcoal"
            >
              Issuing Body *
            </label>
            <input
              id="issuing_body"
              name="issuing_body"
              type="text"
              required
              placeholder="e.g. CA Board of Nursing"
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="expiry_date"
            className="mb-1 block text-sm font-medium text-brand-charcoal"
          >
            Expiry Date
          </label>
          <input
            id="expiry_date"
            name="expiry_date"
            type="date"
            className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-brand-gray-500 hover:text-brand-charcoal"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover disabled:opacity-50"
          >
            <Send size={14} />
            {isPending ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
}
