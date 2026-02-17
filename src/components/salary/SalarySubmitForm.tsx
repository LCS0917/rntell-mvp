"use client";

import { submitSalaryReport } from "@/app/actions/salary";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

type Facility = {
  id: string;
  name: string;
  location_city: string | null;
  location_state: string | null;
};

export function SalarySubmitForm({ facilities }: { facilities: Facility[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);
    const facilityId = form.get("facility_id") as string;
    const specialty = (form.get("specialty") as string).trim();
    const hourlyRate = parseFloat(form.get("hourly_rate") as string);
    const housing = parseFloat(form.get("stipend_housing") as string) || 0;
    const meals = parseFloat(form.get("stipend_meals") as string) || 0;

    if (!facilityId) {
      setError("Please select a facility.");
      return;
    }
    if (!specialty) {
      setError("Please enter your specialty.");
      return;
    }
    if (!hourlyRate || hourlyRate <= 0) {
      setError("Please enter a valid hourly rate.");
      return;
    }

    startTransition(async () => {
      const result = await submitSalaryReport({
        facility_id: facilityId,
        specialty,
        hourly_rate: hourlyRate,
        stipend_housing: housing,
        stipend_meals: meals,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/nurse/salary");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      {error && (
        <div className="rounded-lg bg-brand-danger-light px-4 py-3 text-sm text-brand-danger">
          {error}
        </div>
      )}

      {/* Facility */}
      <div>
        <label
          htmlFor="facility_id"
          className="mb-1 block text-sm font-medium text-brand-charcoal"
        >
          Facility Name
        </label>
        {facilities.length > 0 ? (
          <select
            id="facility_id"
            name="facility_id"
            required
            className="w-full rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-sm text-brand-charcoal focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
          >
            <option value="">Select a facility...</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.location_state ? ` — ${f.location_city}, ${f.location_state}` : ""}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="facility_id"
            name="facility_id"
            type="text"
            placeholder="Facility ID (no facilities found)"
            className="w-full rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
          />
        )}
      </div>

      {/* Specialty */}
      <div>
        <label
          htmlFor="specialty"
          className="mb-1 block text-sm font-medium text-brand-charcoal"
        >
          Specialty
        </label>
        <input
          id="specialty"
          name="specialty"
          type="text"
          required
          placeholder="e.g. ICU, Med/Surg, ER, L&D"
          className="w-full rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
        />
      </div>

      {/* Hourly Rate */}
      <div>
        <label
          htmlFor="hourly_rate"
          className="mb-1 block text-sm font-medium text-brand-charcoal"
        >
          Hourly Rate ($)
        </label>
        <input
          id="hourly_rate"
          name="hourly_rate"
          type="number"
          required
          min="0"
          step="0.01"
          placeholder="45.00"
          className="w-full rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
        />
      </div>

      {/* Stipends */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="stipend_housing"
            className="mb-1 block text-sm font-medium text-brand-charcoal"
          >
            Housing Stipend ($/wk)
          </label>
          <input
            id="stipend_housing"
            name="stipend_housing"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
          />
        </div>
        <div>
          <label
            htmlFor="stipend_meals"
            className="mb-1 block text-sm font-medium text-brand-charcoal"
          >
            Meal Stipend ($/wk)
          </label>
          <input
            id="stipend_meals"
            name="stipend_meals"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/nurse/salary"
          className="inline-flex items-center gap-1 text-sm text-brand-gray-500 hover:text-brand-charcoal"
        >
          <ArrowLeft size={14} />
          Back to Pay Database
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover disabled:opacity-50"
        >
          <Send size={14} />
          {isPending ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    </form>
  );
}
