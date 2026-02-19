"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Play, RefreshCw, CheckCircle, XCircle, Loader2, Clock, AlertCircle, Search, ChevronDown, ChevronUp } from "lucide-react";
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

  // Discover jobs state
  const [showDiscover, setShowDiscover] = useState(true);
  const [discoverState, setDiscoverState] = useState("");
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<{
    facilities_scanned: number;
    ats_detected: number;
    jobs_created: number;
    jobs_updated: number;
    jobs_skipped: number;
    errors: { facility: string; message: string }[];
  } | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  async function handleDiscover() {
    setDiscoverLoading(true);
    setDiscoverError(null);
    setDiscoverResult(null);
    try {
      const body: Record<string, unknown> = {};
      if (discoverState) body.state = discoverState;
      const res = await fetch("/api/admin/scrape-jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDiscoverResult(data);
      router.refresh();
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : "Failed to discover jobs.");
    } finally {
      setDiscoverLoading(false);
    }
  }

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

      {/* Discover Jobs panel */}
      <div className="rounded-xl border border-brand-gray-200 bg-white">
        <button
          onClick={() => setShowDiscover(!showDiscover)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <div>
            <h2 className="text-base font-semibold text-brand-charcoal">Discover Jobs from Facility Websites</h2>
            <p className="mt-0.5 text-xs text-brand-gray-400">
              Scans facility websites, detects ATS (Workday, Greenhouse, Lever, iCIMS, SmartRecruiters), and pulls nursing job metadata.
            </p>
          </div>
          {showDiscover ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDiscover && (
          <div className="border-t border-brand-gray-200 px-6 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-gray-500">State (optional)</label>
                <select
                  value={discoverState}
                  onChange={(e) => setDiscoverState(e.target.value)}
                  className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
                >
                  <option value="">All States</option>
                  {US_STATES.filter(Boolean).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleDiscover}
                disabled={discoverLoading}
                className="flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {discoverLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                {discoverLoading ? "Scanning…" : "Discover Jobs"}
              </button>
            </div>

            {discoverResult && (
              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-brand-gray-500">
                    Scanned: <strong className="text-brand-charcoal">{discoverResult.facilities_scanned}</strong> facilities
                  </span>
                  <span className="text-brand-gray-500">
                    ATS found: <strong className="text-brand-charcoal">{discoverResult.ats_detected}</strong>
                  </span>
                  <span className="text-green-600">
                    Jobs created: <strong>{discoverResult.jobs_created}</strong>
                  </span>
                  <span className="text-blue-600">
                    Updated: <strong>{discoverResult.jobs_updated}</strong>
                  </span>
                  <span className="text-brand-gray-400">
                    Skipped: <strong>{discoverResult.jobs_skipped}</strong>
                  </span>
                </div>
                {discoverResult.errors.length > 0 && (
                  <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-700">
                    <strong>{discoverResult.errors.length} errors:</strong>
                    <ul className="mt-1 list-disc pl-4">
                      {discoverResult.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e.facility}: {e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {discoverError && (
              <p className="mt-3 text-sm text-red-600">{discoverError}</p>
            )}
          </div>
        )}
      </div>

      {/* Trigger panel (legacy Python scraper) */}
      <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-brand-charcoal">Run a Scraper (Legacy)</h2>

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
