"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Play, RefreshCw, CheckCircle, XCircle, Loader2, Clock, AlertCircle } from "lucide-react";
import { triggerScraper, type ScrapeJobRecord } from "@/app/actions/admin";

const SOURCE_TYPES = [
  { value: "hospital_careers", label: "Hospital Career Pages" },
];

const US_STATES = [
  "", "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

export default function ScraperClient({
  jobs,
  initError,
}: {
  jobs: ScrapeJobRecord[];
  initError?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [sourceType, setSourceType] = useState("hospital_careers");
  const [state, setState] = useState("");
  const [runError, setRunError] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState<string | null>(null);

  function handleRun() {
    setRunError(null);
    setRunSuccess(null);
    startTransition(async () => {
      try {
        const result = await triggerScraper(sourceType, state || undefined);
        setRunSuccess(`Scraper queued — Job ID: ${result.scrape_job_id.slice(0, 8)}…`);
        router.refresh();
      } catch (e) {
        setRunError(e instanceof Error ? e.message : "Failed to trigger scraper.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot size={24} className="text-brand-orange" />
        <h1 className="text-2xl font-bold text-brand-charcoal">Scraper</h1>
      </div>

      {initError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
          <AlertCircle size={16} className="shrink-0" />
          <span><strong>Error loading scraper data:</strong> {initError}</span>
        </div>
      )}

      {/* Trigger panel */}
      <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-brand-charcoal">Run a Scraper</h2>

        <div className="flex flex-wrap items-end gap-4">
          {/* Source type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-gray-500">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            >
              {SOURCE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* State filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-gray-500">State (optional)</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
            >
              <option value="">All States</option>
              {US_STATES.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            {isPending ? "Starting…" : "Run Scraper"}
          </button>

          {/* Refresh */}
          <button
            onClick={() => router.refresh()}
            className="flex items-center gap-2 rounded-lg border border-brand-gray-200 px-4 py-2 text-sm text-brand-gray-500 hover:bg-brand-gray-100"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {runSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle size={16} />
            {runSuccess}
          </div>
        )}
        {runError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} />
            {runError}
          </div>
        )}

        <p className="mt-4 text-xs text-brand-gray-400">
          Scraper runs asynchronously. Refresh this page to see updated status.
          Jobs not seen after 7 days are automatically marked inactive.
        </p>
      </div>

      {/* Run history */}
      <div className="rounded-xl border border-brand-gray-200 bg-white">
        <div className="border-b border-brand-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-brand-charcoal">Run History</h2>
        </div>

        {jobs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-brand-gray-400">
            No scraper runs yet. Trigger one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                  <th className="px-4 py-3 font-medium text-brand-gray-500">Source</th>
                  <th className="px-4 py-3 font-medium text-brand-gray-500">State</th>
                  <th className="px-4 py-3 font-medium text-brand-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-brand-gray-500 text-right">Created</th>
                  <th className="px-4 py-3 font-medium text-brand-gray-500 text-right">Updated</th>
                  <th className="px-4 py-3 font-medium text-brand-gray-500 text-right">Deactivated</th>
                  <th className="px-4 py-3 font-medium text-brand-gray-500 text-right">Skipped</th>
                  <th className="px-4 py-3 font-medium text-brand-gray-500 text-right">Facilities</th>
                  <th className="px-4 py-3 font-medium text-brand-gray-500 text-right">Duration</th>
                  <th className="px-4 py-3 font-medium text-brand-gray-500 text-right">Errors</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-brand-gray-200 hover:bg-brand-gray-50">
                    <td className="px-4 py-3 font-medium text-brand-charcoal">{job.source_name}</td>
                    <td className="px-4 py-3 text-brand-gray-500">{job.state_filter || "All"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-brand-gray-500">{job.records_created}</td>
                    <td className="px-4 py-3 text-right text-brand-gray-500">{job.records_updated}</td>
                    <td className="px-4 py-3 text-right text-brand-gray-500">{job.jobs_deactivated}</td>
                    <td className="px-4 py-3 text-right text-brand-gray-500">{job.duplicates_skipped}</td>
                    <td className="px-4 py-3 text-right text-brand-gray-500">{job.facilities_created}</td>
                    <td className="px-4 py-3 text-right text-brand-gray-500">
                      {job.started_at && job.finished_at
                        ? formatDuration(job.started_at, job.finished_at)
                        : job.started_at
                        ? "Running…"
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {job.errors?.length > 0 ? (
                        <span className="font-medium text-red-600">{job.errors.length}</span>
                      ) : (
                        <span className="text-brand-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; icon: React.ReactNode }> = {
    queued:   { color: "bg-gray-100 text-gray-600",   icon: <Clock size={12} /> },
    running:  { color: "bg-blue-100 text-blue-700",   icon: <Loader2 size={12} className="animate-spin" /> },
    complete: { color: "bg-green-100 text-green-700", icon: <CheckCircle size={12} /> },
    failed:   { color: "bg-red-100 text-red-700",     icon: <XCircle size={12} /> },
    cancelled:{ color: "bg-gray-100 text-gray-500",   icon: <XCircle size={12} /> },
  };
  const cfg = configs[status] || configs.queued;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {status}
    </span>
  );
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
