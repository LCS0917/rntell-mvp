"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useTransition, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { CreateJobInput, FacilityJobPosting } from "@/app/actions/jobs";
import { createJobPosting, updateJobPosting } from "@/app/actions/jobs";

const SPECIALTIES = [
  "ICU",
  "Med/Surg",
  "ER",
  "L&D",
  "NICU",
  "PACU",
  "OR",
  "Telemetry",
  "Stepdown",
  "Psych",
  "Rehab",
  "Other",
];

const SHIFTS = [
  { value: "day", label: "Day" },
  { value: "night", label: "Night" },
  { value: "rotating", label: "Rotating" },
  { value: "prn", label: "PRN" },
  { value: "travel", label: "Travel" },
  { value: "per_diem", label: "Per Diem" },
];

type FormValues = {
  title: string;
  specialty: string;
  shift_type: string;
  pay_rate_hourly: string;
  stipend_housing: string;
  stipend_meals: string;
  contract_weeks: string;
  start_date: string;
  slots_available: string;
  description: string;
};

function toDefaults(job?: FacilityJobPosting | null): FormValues {
  if (!job) {
    return {
      title: "",
      specialty: "",
      shift_type: "day",
      pay_rate_hourly: "",
      stipend_housing: "",
      stipend_meals: "",
      contract_weeks: "13",
      start_date: "",
      slots_available: "1",
      description: "",
    };
  }
  return {
    title: job.title,
    specialty: job.specialty,
    shift_type: job.shift_type ?? "day",
    pay_rate_hourly: job.pay_rate_hourly?.toString() ?? "",
    stipend_housing: job.stipend_housing?.toString() ?? "",
    stipend_meals: job.stipend_meals?.toString() ?? "",
    contract_weeks: job.contract_weeks?.toString() ?? "13",
    start_date: job.start_date ?? "",
    slots_available: job.slots_available?.toString() ?? "1",
    description: job.description ?? "",
  };
}

function computePackage(hourly: string, housing: string, meals: string) {
  const h = parseFloat(hourly) || 0;
  const hs = parseFloat(housing) || 0;
  const ms = parseFloat(meals) || 0;
  return h * 36 + hs + ms;
}

export function JobPostForm({
  job,
  mode,
}: {
  job?: FacilityJobPosting | null;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requirements, setRequirements] = useState<string[]>(
    job?.requirements ?? []
  );
  const tagRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: toDefaults(job),
  });

  const hourly = useWatch({ control, name: "pay_rate_hourly" });
  const housing = useWatch({ control, name: "stipend_housing" });
  const meals = useWatch({ control, name: "stipend_meals" });
  const packageTotal = computePackage(hourly, housing, meals);

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagRef.current?.value.trim();
      if (val && !requirements.includes(val)) {
        setRequirements((prev) => [...prev, val]);
      }
      if (tagRef.current) tagRef.current.value = "";
    }
  }

  function removeTag(tag: string) {
    setRequirements((prev) => prev.filter((t) => t !== tag));
  }

  function onSubmit(values: FormValues) {
    const input: CreateJobInput = {
      title: values.title,
      specialty: values.specialty,
      shift_type: values.shift_type,
      pay_rate_hourly: parseFloat(values.pay_rate_hourly) || 0,
      stipend_housing: parseFloat(values.stipend_housing) || 0,
      stipend_meals: parseFloat(values.stipend_meals) || 0,
      pay_package_total: computePackage(
        values.pay_rate_hourly,
        values.stipend_housing,
        values.stipend_meals
      ),
      contract_weeks: values.contract_weeks
        ? parseInt(values.contract_weeks)
        : null,
      start_date: values.start_date || null,
      slots_available: parseInt(values.slots_available) || 1,
      requirements,
      description: values.description,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createJobPosting(input)
          : await updateJobPosting(job!.id, input);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          mode === "create"
            ? "Job posted successfully"
            : "Job updated successfully"
        );
        router.push("/facility/jobs");
        router.refresh();
      }
    });
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-orange-400";
  const labelClass = "mb-1 block text-sm font-medium text-[#2C2C2C]";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <div>
        <label className={labelClass}>
          Job Title <span className="text-red-500">*</span>
        </label>
        <input
          {...register("title", { required: "Title is required" })}
          className={inputClass}
          placeholder="e.g. ICU Travel RN — 13 Week Contract"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Specialty + Shift */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Specialty <span className="text-red-500">*</span>
          </label>
          <select
            {...register("specialty", { required: "Specialty is required" })}
            className={inputClass}
          >
            <option value="">Select specialty</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.specialty && (
            <p className="mt-1 text-xs text-red-500">
              {errors.specialty.message}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Shift Type</label>
          <select {...register("shift_type")} className={inputClass}>
            {SHIFTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pay Fields */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>
            Hourly Rate ($) <span className="text-red-500">*</span>
          </label>
          <input
            {...register("pay_rate_hourly", {
              required: "Hourly rate is required",
              min: { value: 0.01, message: "Must be greater than 0" },
            })}
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            placeholder="55.00"
          />
          {errors.pay_rate_hourly && (
            <p className="mt-1 text-xs text-red-500">
              {errors.pay_rate_hourly.message}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Housing Stipend ($)</label>
          <input
            {...register("stipend_housing")}
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            placeholder="1,200.00"
          />
        </div>
        <div>
          <label className={labelClass}>Meals Stipend ($)</label>
          <input
            {...register("stipend_meals")}
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            placeholder="300.00"
          />
        </div>
      </div>

      {/* Calculated Weekly Package */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-brand-gray-500">
          Weekly Package Total
        </p>
        <p className="mt-1 text-3xl font-bold text-[#26C6DA]">
          ${packageTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          <span className="ml-1 text-base font-normal text-brand-gray-400">
            /week
          </span>
        </p>
        <p className="mt-1 text-xs text-brand-gray-400">
          (Hourly x 36hrs) + Housing + Meals
        </p>
      </div>

      {/* Contract + Start + Slots */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Contract Weeks</label>
          <input
            {...register("contract_weeks", {
              min: { value: 1, message: "Minimum 1 week" },
              max: { value: 52, message: "Maximum 52 weeks" },
            })}
            type="number"
            min="1"
            max="52"
            className={inputClass}
            placeholder="13"
          />
          {errors.contract_weeks && (
            <p className="mt-1 text-xs text-red-500">
              {errors.contract_weeks.message}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Start Date</label>
          <input
            {...register("start_date")}
            type="date"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Slots Available</label>
          <input
            {...register("slots_available")}
            type="number"
            min="1"
            className={inputClass}
            placeholder="1"
          />
        </div>
      </div>

      {/* Requirements Tags */}
      <div>
        <label className={labelClass}>Requirements</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {requirements.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <input
          ref={tagRef}
          onKeyDown={handleTagKeyDown}
          className={inputClass}
          placeholder="Type a requirement and press Enter"
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          {...register("description")}
          rows={4}
          className={inputClass}
          placeholder="Describe the role, unit details, team culture, or any perks..."
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-orange-500 px-6 py-2.5 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isPending
            ? mode === "create"
              ? "Posting..."
              : "Saving..."
            : mode === "create"
              ? "Post Job"
              : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
