import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  MapPin,
  DollarSign,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import {
  GSA_WEEKLY_BENCHMARK,
  STANDARD_WEEKLY_HOURS,
  STATES,
} from "@/lib/constants";

export const metadata = {
  title: "Market Snapshot | RNTell",
};

type RegionStat = {
  state: string;
  label: string;
  avg_weekly: number;
  report_count: number;
  margin_pct: number;
};

export default async function MarketSnapshotPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role as string | undefined;

  // Fetch all salary reports with facility location
  const { data: reports } = await supabase
    .from("salary_reports")
    .select(
      `
      hourly_rate,
      stipend_housing,
      stipend_meals,
      specialty,
      facilities (
        location_state
      )
    `
    )
    .order("reported_at", { ascending: false });

  // Aggregate by state
  const stateMap = new Map<
    string,
    { total: number; count: number }
  >();

  for (const r of reports ?? []) {
    const fac = r.facilities as unknown as
      | { location_state: string | null }
      | null;
    const state = fac?.location_state;
    if (!state) continue;
    const weekly =
      r.hourly_rate * STANDARD_WEEKLY_HOURS +
      r.stipend_housing +
      r.stipend_meals;
    const existing = stateMap.get(state) ?? { total: 0, count: 0 };
    stateMap.set(state, {
      total: existing.total + weekly,
      count: existing.count + 1,
    });
  }

  const stateLabel = (code: string) =>
    STATES.find((s) => s.value === code)?.label ?? code;

  const regionStats: RegionStat[] = Array.from(stateMap.entries())
    .map(([state, { total, count }]) => {
      const avg = total / count;
      return {
        state,
        label: stateLabel(state),
        avg_weekly: Math.round(avg),
        report_count: count,
        margin_pct: Math.round(
          ((avg - GSA_WEEKLY_BENCHMARK) / GSA_WEEKLY_BENCHMARK) * 100
        ),
      };
    })
    .sort((a, b) => b.avg_weekly - a.avg_weekly);

  // Aggregate by specialty
  const specMap = new Map<string, { total: number; count: number }>();
  for (const r of reports ?? []) {
    if (!r.specialty) continue;
    const weekly =
      r.hourly_rate * STANDARD_WEEKLY_HOURS +
      r.stipend_housing +
      r.stipend_meals;
    const existing = specMap.get(r.specialty) ?? { total: 0, count: 0 };
    specMap.set(r.specialty, {
      total: existing.total + weekly,
      count: existing.count + 1,
    });
  }

  const specialtyStats = Array.from(specMap.entries())
    .map(([spec, { total, count }]) => ({
      specialty: spec,
      avg_weekly: Math.round(total / count),
      report_count: count,
    }))
    .sort((a, b) => b.avg_weekly - a.avg_weekly);

  const totalReports = reports?.length ?? 0;
  const hasData = totalReports > 0;

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
          <BarChart3 className="text-brand-orange" size={28} />
          Market Snapshot
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Real-time pay intelligence across the travel nurse market. Find
          top-paying cities and high-margin regions.
        </p>
      </div>

      {/* Quick Nav */}
      <div className="mb-8 flex gap-3">
        <Link
          href={role === "facility" ? "/facility" : "/nurse"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover"
        >
          My Dashboard
          <ArrowRight size={14} />
        </Link>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center rounded-xl border border-brand-gray-200 bg-white p-12 text-center">
          <BarChart3 className="text-brand-gray-300" size={48} />
          <h2 className="mt-4 text-lg font-semibold text-brand-charcoal">
            No market data yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-brand-gray-500">
            As nurses submit salary reports, market insights will appear here.
          </p>
          {role === "nurse" && (
            <Link
              href="/nurse/pay/submit"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover"
            >
              Be the first to contribute
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Global Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
              <p className="text-xs font-medium text-brand-gray-500">
                Total Reports
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-charcoal">
                {totalReports}
              </p>
            </div>
            <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
              <p className="text-xs font-medium text-brand-gray-500">
                States Covered
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-charcoal">
                {regionStats.length}
              </p>
            </div>
            <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
              <p className="text-xs font-medium text-brand-gray-500">
                GSA Benchmark
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-charcoal">
                ${GSA_WEEKLY_BENCHMARK.toLocaleString()}/wk
              </p>
            </div>
          </div>

          {/* Top-Paying Regions */}
          {regionStats.length > 0 && (
            <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-charcoal">
                <MapPin size={20} className="text-brand-orange" />
                Top-Paying Regions
              </h2>
              <div className="space-y-3">
                {regionStats.slice(0, 8).map((region) => (
                  <div
                    key={region.state}
                    className="flex items-center justify-between rounded-lg bg-brand-gray-100 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-brand-charcoal">
                        {region.label}
                      </p>
                      <p className="text-xs text-brand-gray-500">
                        {region.report_count} report
                        {region.report_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-brand-charcoal">
                        ${region.avg_weekly.toLocaleString()}/wk
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          region.margin_pct >= 0
                            ? "text-brand-success-dark"
                            : "text-brand-danger"
                        }`}
                      >
                        {region.margin_pct >= 0 ? "+" : ""}
                        {region.margin_pct}% vs GSA
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top-Paying Specialties */}
          {specialtyStats.length > 0 && (
            <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-charcoal">
                <DollarSign size={20} className="text-brand-orange" />
                Pay by Specialty
              </h2>
              <div className="space-y-3">
                {specialtyStats.map((spec) => (
                  <div
                    key={spec.specialty}
                    className="flex items-center justify-between rounded-lg bg-brand-gray-100 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-brand-charcoal">
                        {spec.specialty}
                      </p>
                      <p className="text-xs text-brand-gray-500">
                        {spec.report_count} report
                        {spec.report_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-brand-charcoal">
                      ${spec.avg_weekly.toLocaleString()}/wk avg
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
