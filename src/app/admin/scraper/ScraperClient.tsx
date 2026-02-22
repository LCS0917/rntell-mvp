"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, AlertCircle, Search, ChevronDown, ChevronUp, Download, Sparkles } from "lucide-react";

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

interface ScrapeResult {
  facilities_processed: number;
  jobs_created: number;
  jobs_updated: number;
  jobs_skipped: number;
  jobs_deactivated: number;
  details: { name: string; careers_url: string | null; links_found: number; gemini_selected: number; jobs_saved: number; jobs_deactivated: number; debug?: string }[];
  errors: { facility: string; message: string }[];
}

interface EnrichResult {
  jobs_enriched: number;
  jobs_failed: number;
  message?: string;
  details: { id: string; title: string; fields_filled: string[] }[];
  errors: { id: string; title: string; message: string }[];
}

export default function ScraperClient({
  initError,
}: {
  initError?: string;
}) {
  const router = useRouter();

  // Detect career pages state
  const [showDetect, setShowDetect] = useState(true);
  const [detectState, setDetectState] = useState("");
  const [detectLoading, setDetectLoading] = useState(false);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Scrape jobs state
  const [showScrape, setShowScrape] = useState(true);
  const [scrapeState, setScrapeState] = useState("");
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [showScrapeDetails, setShowScrapeDetails] = useState(false);

  // Enrich state
  const [showEnrich, setShowEnrich] = useState(true);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [showEnrichDetails, setShowEnrichDetails] = useState(false);

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
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(res.ok ? "Invalid response from server" : `Server error (HTTP ${res.status}) — likely timed out. Try filtering by state.`);
      }
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setDetectResult(data);
      router.refresh();
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : "Failed to detect career pages.");
    } finally {
      setDetectLoading(false);
    }
  }

  async function handleScrape() {
    setScrapeLoading(true);
    setScrapeError(null);
    setScrapeResult(null);

    try {
      const listRes = await fetch("/api/admin/scrape-jobs/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: scrapeState || undefined, listOnly: true }),
      });
      const listData = await listRes.json();
      const facilities: { id: string; name: string }[] = listData.facilities || [];

      if (facilities.length === 0) {
        setScrapeError("No facilities found for this state.");
        setScrapeLoading(false);
        return;
      }

      const combined: ScrapeResult = {
        facilities_processed: 0,
        jobs_created: 0,
        jobs_updated: 0,
        jobs_skipped: 0,
        jobs_deactivated: 0,
        details: [],
        errors: [],
      };

      for (const facility of facilities) {
        try {
          const res = await fetch("/api/admin/scrape-jobs/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ facilityId: facility.id }),
          });
          const text = await res.text();
          let data: ScrapeResult;
          try { data = JSON.parse(text); } catch { continue; }
          combined.facilities_processed += data.facilities_processed || 0;
          combined.jobs_created += data.jobs_created || 0;
          combined.jobs_updated += data.jobs_updated || 0;
          combined.jobs_skipped += data.jobs_skipped || 0;
          combined.jobs_deactivated += data.jobs_deactivated || 0;
          combined.details.push(...(data.details || []));
          combined.errors.push(...(data.errors || []));
          setScrapeResult({ ...combined });
        } catch {
          combined.errors.push({ facility: facility.name, message: "Request failed" });
        }
      }

      router.refresh();
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Failed to scrape jobs.");
    } finally {
      setScrapeLoading(false);
    }
  }

    async function handleEnrich() {
    setEnrichLoading(true);
    setEnrichError(null);
    setEnrichResult(null);
    try {
      const res = await fetch("/api/admin/scrape-jobs/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          res.ok
            ? "Invalid response from server"
            : `Server error (HTTP ${res.status}) — likely timed out.`
        );
      }
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setEnrichResult(data);
      router.refresh();
    } catch (e) {
      setEnrichError(e instanceof Error ? e.message : "Failed to enrich jobs.");
    } finally {
      setEnrichLoading(false);
    }
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

      {/* Step 2: Scrape Jobs from ATS */}
      <div className="rounded-xl border border-brand-gray-200 bg-white">
        <button
          onClick={() => setShowScrape(!showScrape)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <div>
            <h2 className="text-base font-semibold text-brand-charcoal">
              Step 2: Universal Job Discovery
            </h2>
            <p className="mt-0.5 text-xs text-brand-gray-400">
              Uses Playwright to dynamically render career pages (handles JS-heavy sites like CommonSpirit), collects ALL links, asks Gemini to pick the top 5 travel/contract nurse URLs, fetches &amp; enriches them inline.
            </p>
          </div>
          {showScrape ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showScrape && (
          <div className="border-t border-brand-gray-200 px-6 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-gray-500">State (optional)</label>
                <select
                  value={scrapeState}
                  onChange={(e) => setScrapeState(e.target.value)}
                  className="rounded-lg border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
                >
                  <option value="">All States</option>
                  {US_STATES.filter(Boolean).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleScrape}
                disabled={scrapeLoading}
                className="flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {scrapeLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {scrapeLoading ? "Discovering…" : "Discover & Enrich Jobs"}
              </button>
            </div>

            {scrapeResult && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-brand-gray-500">
                    Facilities: <strong className="text-brand-charcoal">{scrapeResult.facilities_processed}</strong>
                  </span>
                  <span className="text-green-600">
                    Jobs created: <strong>{scrapeResult.jobs_created}</strong>
                  </span>
                  <span className="text-blue-600">
                    Updated: <strong>{scrapeResult.jobs_updated}</strong>
                  </span>
                  <span className="text-brand-gray-400">
                    Skipped: <strong>{scrapeResult.jobs_skipped}</strong>
                  </span>
                  <span className="text-red-500">
                    Deactivated: <strong>{scrapeResult.jobs_deactivated}</strong>
                  </span>
                </div>

                {scrapeResult.details.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowScrapeDetails(!showScrapeDetails)}
                      className="text-xs text-brand-orange hover:underline"
                    >
                      {showScrapeDetails ? "Hide details" : "Show per-facility breakdown"}
                    </button>

                    {showScrapeDetails && (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-brand-gray-200">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                              <th className="px-3 py-2 font-medium text-brand-gray-500">Facility</th>
                              <th className="px-3 py-2 font-medium text-brand-gray-500 text-right">Links</th>
                              <th className="px-3 py-2 font-medium text-brand-gray-500 text-right">AI Picked</th>
                              <th className="px-3 py-2 font-medium text-brand-gray-500 text-right">Saved</th>
                              <th className="px-3 py-2 font-medium text-brand-gray-500 text-right">Deactivated</th>
                              <th className="px-3 py-2 font-medium text-brand-gray-500">Info</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scrapeResult.details.map((d, i) => (
                              <tr key={i} className="border-b border-brand-gray-200 hover:bg-brand-gray-50">
                                <td className="px-3 py-1.5 text-brand-charcoal">{d.name}</td>
                                <td className="px-3 py-1.5 text-right text-brand-gray-400">{d.links_found}</td>
                                <td className="px-3 py-1.5 text-right font-medium text-blue-600">{d.gemini_selected}</td>
                                <td className="px-3 py-1.5 text-right font-medium text-green-600">{d.jobs_saved}</td>
                                <td className="px-3 py-1.5 text-right font-medium text-red-500">{d.jobs_deactivated || 0}</td>
                                <td className="max-w-xs truncate px-3 py-1.5 text-brand-gray-400">{d.debug || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {scrapeResult.errors.length > 0 && (
                  <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-700">
                    <strong>{scrapeResult.errors.length} errors:</strong>
                    <ul className="mt-1 list-disc pl-4">
                      {scrapeResult.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e.facility}: {e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {scrapeError && (
              <p className="mt-3 text-sm text-red-600">{scrapeError}</p>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Enrich Jobs with AI */}
      <div className="rounded-xl border border-brand-gray-200 bg-white">
        <button
          onClick={() => setShowEnrich(!showEnrich)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <div>
            <h2 className="text-base font-semibold text-brand-charcoal">
              Step 3: Enrich Leftovers
            </h2>
            <p className="mt-0.5 text-xs text-brand-gray-400">
              Catch-up enrichment for legacy or previously failed jobs. Step 2 now enriches inline — this handles any stragglers.
            </p>
          </div>
          {showEnrich ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showEnrich && (
          <div className="border-t border-brand-gray-200 px-6 py-4">
            <button
              onClick={handleEnrich}
              disabled={enrichLoading}
              className="flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {enrichLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {enrichLoading ? "Enriching…" : "Enrich Un-enriched Jobs (up to 20)"}
            </button>

            {enrichResult && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-green-600">
                    Enriched: <strong>{enrichResult.jobs_enriched}</strong>
                  </span>
                  <span className="text-red-500">
                    Failed: <strong>{enrichResult.jobs_failed}</strong>
                  </span>
                  {enrichResult.message && (
                    <span className="text-brand-gray-400">{enrichResult.message}</span>
                  )}
                </div>

                {enrichResult.details.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowEnrichDetails(!showEnrichDetails)}
                      className="text-xs text-brand-orange hover:underline"
                    >
                      {showEnrichDetails ? "Hide details" : "Show per-job breakdown"}
                    </button>

                    {showEnrichDetails && (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-brand-gray-200">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-brand-gray-200 bg-brand-gray-100">
                              <th className="px-3 py-2 font-medium text-brand-gray-500">Job Title</th>
                              <th className="px-3 py-2 font-medium text-brand-gray-500">Fields Extracted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enrichResult.details.map((d) => (
                              <tr key={d.id} className="border-b border-brand-gray-200 hover:bg-brand-gray-50">
                                <td className="max-w-xs truncate px-3 py-1.5 text-brand-charcoal">{d.title}</td>
                                <td className="px-3 py-1.5">
                                  <div className="flex flex-wrap gap-1">
                                    {d.fields_filled.map((f) => (
                                      <span key={f} className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                        {f}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {enrichResult.errors.length > 0 && (
                  <div className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-700">
                    <strong>{enrichResult.errors.length} errors:</strong>
                    <ul className="mt-1 list-disc pl-4">
                      {enrichResult.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e.title}: {e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {enrichError && (
              <p className="mt-3 text-sm text-red-600">{enrichError}</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

