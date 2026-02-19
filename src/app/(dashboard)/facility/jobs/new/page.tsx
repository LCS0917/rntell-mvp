"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { JobPostForm } from "../JobPostForm";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-2xl bg-brand-warm">
      <Link
        href="/facility/jobs"
        className="mb-4 inline-flex items-center gap-1 text-sm text-brand-gray-500 hover:text-[#2C2C2C]"
      >
        <ChevronLeft size={16} />
        Back to Job Postings
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="mb-1 text-2xl font-bold text-[#2C2C2C]">
          Post a New Job
        </h1>
        <p className="mb-6 text-sm text-brand-gray-500">
          Fill out the details below to publish a direct-hire position.
        </p>

        <JobPostForm mode="create" />
      </div>
    </div>
  );
}
