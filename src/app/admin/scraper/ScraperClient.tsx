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

interface DetectResult {
  facilities_scanned: number;
  careers_found: number;
  ats_breakdown: Record<string, number>;
  details: { name: string; website: string; careers_url: string | null; ats_type: string }[];
  errors: { facility: string; message: string }[];
}

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

  // Detect career pages state
  const [showDetect, setShowDetect] = useState(true);
  const [detectState, setDetectState] = useState("");
  const [detectLoading, setDetectLoading] = useState(false);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  async function handleDetect() {
    setDetectLoading(true);
    setDetectError(null);
    setDetectResult(null);
    try {
      const body: Record<string, unknown> = {};
      if (detectState) body.state = detectState;
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
      setDetectResult(data);
      router.refresh();
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : "Failed to detect career pages.");
    } finally {
      setDetectLoading(false);
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

      {/* Step 1: Detect Career Pages */}
      <div className="rounded-xl border border-brand-gray-200 bg-white">
        <button
          onClick={() => setShowDetect(!showDetect)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <div>
            <h2 className="text-base font-semibold text-brand-charcoal">
              Step 1: Detect Career Pages &amp; ATS
            </h2>
            <p className="mt-0.5 text-xs text-brand-gray-400">
              Visits each facility&apos;s website, finds their careers page URL, and identifies the ATS system (Workday, Greenhouse, Lever, Avature, etc.).
            </p>
          </div>
          {showDetect ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDetect && (
          <div className="border-t border-brand-gray-200 px-6 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-gray-500">State (optional)</label>
                <select
                  value={detectState}
                  onChange={(e) => setDetectState(e.target.value)}
                  className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
                >
                  <option value="">All States</option>
                  {US_STATES.filter(Boolean).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleDetect}
                disabled={detectLoading}
                className="flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {detectLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                {detectLoading ? "Scanning…" : "Detect Career Pages"}
              </button>
            </div>

            {detectResult && (
              <div className="mt-4 space-y-3">
                {/* Summary stats */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-brand-gray-500">
                    Scanned: <strong className="text-brand-charcoal">{detectResult.facilities_scanned}</strong> facilities
                  </span>
                  <span className="text-green-600">
                    Career pages found: <strong>{detectResult.careers_found}</strong>
                  </span>
                </div>

                {/* ATS breakdown */}
                {Object.keys(detectResult.ats_breakdown).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(detectResult.ats_breakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <span
                          key={type}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            type === "none"
                              ? "bg-gray-100 text-gray-500"
                              : type === "unknown"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {type}: {count}
                        </span>
                      ))}
                  </div>
                )}

                {/* Details toggle */}
                {detectResult.details.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="text-xs text-brand-orange hover:underline"
                    >
                      {showDetails ? "Hide details" : "Show all facilities"}
                    </button>

                    {showDetails && (
                      <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-brand-gray-200">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                              <th className="px-3 py-2 font-medium text-brand-gray-500">Facility</th>
                              <th className="px-3 py-2 font-medium text-brand-gray-500">ATS</th>
                              <th className="px-3 py-2 font-medium text-brand-gray-500">Career Page URL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detectResult.details.map((d, i) => (
                              <tr key={i} className="border-b border-brand-gray-200 hover:bg-brand-gray-50">
                                <td className="px-3 py-1.5 text-brand-charcoal">{d.name}</td>
                                <td className="px-3 py-1.5">
                                  <span
                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                      d.ats_type === "none"
                                        ? "bg-gray-100 text-gray-400"
                                        : d.ats_type === "unknown"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {d.ats_type}
                                  </span>
                                </td>
                                <td className="max-w-xs truncate px-3 py-1.5 text-brand-gray-400">
                                  {d.careers_url || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Errors */}
                {detectResult.errors.length > 0 && (
                  <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-700">
                    <strong>{detectResult.errors.length} errors:</strong>
                    <ul className="mt-1 list-disc pl-4">
                      {detectResult.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e.facility}: {e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {detectError && (
              <p className="mt-3 text-sm text-red-600">{detectError}</p>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Scrape Jobs (coming soon / legacy) */}
      <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-brand-charcoal">Step 2: Scrape Jobs from ATS (Coming Soon)</h2>
        <p className="text-xs text-brand-gray-400 mb-4">
          Once career pages are detected above, this step will pull structured job data from known ATS systems (Workday, Greenhouse, Lever, etc.).
        </p>

        <h3 className="mb-3 text-sm font-medium text-brand-gray-500">Legacy Scraper</h3>
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
