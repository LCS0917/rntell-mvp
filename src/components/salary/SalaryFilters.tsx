"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useTransition } from "react";

export function SalaryFilters({
  currentState,
  currentSpecialty,
}: {
  currentState: string;
  currentSpecialty: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const state = (formData.get("state") as string).trim();
    const specialty = (formData.get("specialty") as string).trim();

    const params = new URLSearchParams(searchParams.toString());
    if (state) params.set("state", state);
    else params.delete("state");
    if (specialty) params.set("specialty", specialty);
    else params.delete("specialty");

    startTransition(() => {
      router.push(`/nurse/salary?${params.toString()}`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-brand-gray-200 bg-white p-4"
    >
      <div className="flex-1 min-w-[140px]">
        <label
          htmlFor="state"
          className="mb-1 block text-xs font-medium text-brand-gray-500"
        >
          State
        </label>
        <input
          id="state"
          name="state"
          type="text"
          placeholder="e.g. CA, TX"
          defaultValue={currentState}
          className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
        />
      </div>
      <div className="flex-1 min-w-[140px]">
        <label
          htmlFor="specialty"
          className="mb-1 block text-xs font-medium text-brand-gray-500"
        >
          Specialty
        </label>
        <input
          id="specialty"
          name="specialty"
          type="text"
          placeholder="e.g. ICU, ER"
          defaultValue={currentSpecialty}
          className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal placeholder:text-brand-gray-400 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-brand-charcoal/90 disabled:opacity-50"
      >
        <Search size={14} />
        {isPending ? "Searching..." : "Filter"}
      </button>
    </form>
  );
}
