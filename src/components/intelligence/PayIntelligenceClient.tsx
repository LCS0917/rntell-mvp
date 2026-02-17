"use client";

import { useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  calculateMarketValue,
  type MarketValueResult,
} from "@/app/actions/intelligence";
import { TrendingUp, Sparkles, MessageSquareText, Loader2 } from "lucide-react";

const SPECIALTIES = [
  "ICU",
  "ER",
  "Med-Surg",
  "L&D",
  "NICU",
  "OR",
  "Tele",
  "PCU",
];

const BAR_COLORS = ["#78716C", "#FF7043", "#22C55E"];

export default function PayIntelligenceClient() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<MarketValueResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [specialty, setSpecialty] = useState("ICU");
  const [yearsExp, setYearsExp] = useState(3);
  const [hasCerts, setHasCerts] = useState(false);
  const [currentRate, setCurrentRate] = useState<string>("");
  const [currentHousing, setCurrentHousing] = useState<string>("");
  const [currentMeals, setCurrentMeals] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await calculateMarketValue({
        specialty,
        years_experience: yearsExp,
        has_advanced_certs: hasCerts,
        current_hourly_rate: currentRate ? parseFloat(currentRate) : undefined,
        current_stipend_housing: currentHousing
          ? parseFloat(currentHousing)
          : undefined,
        current_stipend_meals: currentMeals
          ? parseFloat(currentMeals)
          : undefined,
      });

      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setResult(res.data);
      }
    });
  }

  const chartData = result
    ? [
        { name: "Your Current Pay", value: result.current_weekly_pay },
        { name: "Avg Agency Offer", value: result.avg_agency_offer },
        { name: "Direct Hire Potential", value: result.direct_hire_potential },
      ]
    : [];

  return (
    <div>
      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-xl border border-brand-gray-200 bg-white p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">
          Enter Your Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-gray-500">
              Specialty
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            >
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-gray-500">
              Years of Experience
            </label>
            <input
              type="number"
              min={0}
              max={40}
              value={yearsExp}
              onChange={(e) => setYearsExp(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-gray-500">
              Current Hourly Rate ($)
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="e.g. 45.00"
              value={currentRate}
              onChange={(e) => setCurrentRate(e.target.value)}
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-gray-500">
              Housing Stipend ($/wk)
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="e.g. 1200"
              value={currentHousing}
              onChange={(e) => setCurrentHousing(e.target.value)}
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-gray-500">
              Meal Stipend ($/wk)
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="e.g. 350"
              value={currentMeals}
              onChange={(e) => setCurrentMeals(e.target.value)}
              className="w-full rounded-lg border border-brand-gray-200 px-3 py-2 text-sm text-brand-charcoal focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-brand-charcoal">
              <input
                type="checkbox"
                checked={hasCerts}
                onChange={(e) => setHasCerts(e.target.checked)}
                className="h-4 w-4 rounded border-brand-gray-300 text-brand-orange accent-brand-orange"
              />
              Advanced Certifications (CCRN, CEN, etc.)
            </label>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-brand-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-orange-hover disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          Calculate My Market Value
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Hero Card */}
          <div className="rounded-xl bg-brand-green p-8 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <TrendingUp size={32} />
              <div>
                <p className="text-sm font-medium text-white/80">
                  Based on {result.data_points || "market"} data{" "}
                  {result.data_points === 1 ? "point" : "points"} for{" "}
                  {result.specialty} nurses
                </p>
                <h2 className="text-4xl font-bold">
                  You are worth: ${result.fair_market_value.toLocaleString()}/week
                </h2>
              </div>
            </div>
            <div className="mt-4 flex gap-6 text-sm text-white/90">
              <span>
                Low: ${result.low_range.toLocaleString()}/wk
              </span>
              <span>
                Fair Market: ${result.fair_market_value.toLocaleString()}/wk
              </span>
              <span>
                High: ${result.high_range.toLocaleString()}/wk
              </span>
            </div>
          </div>

          {/* Pay Comparison Bar Chart */}
          <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-brand-charcoal">
              The Breakdown
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 13, fill: "#78716C" }}
                  />
                  <YAxis
                    tick={{ fontSize: 13, fill: "#78716C" }}
                    tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `$${Number(value).toLocaleString()}/wk`,
                      "Weekly Pay",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E7E5E4",
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={80}>
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={BAR_COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-brand-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded" style={{ background: BAR_COLORS[0] }} />
                Your Current Pay
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded" style={{ background: BAR_COLORS[1] }} />
                Avg Agency Offer (Lower)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded" style={{ background: BAR_COLORS[2] }} />
                Direct Hire Potential (Higher)
              </span>
            </div>
          </div>

          {/* Negotiation Script */}
          <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquareText size={20} className="text-brand-orange" />
              <h3 className="text-lg font-semibold text-brand-charcoal">
                Your Negotiation Script
              </h3>
            </div>
            <div className="rounded-lg bg-brand-gray-100 p-4 text-sm leading-relaxed text-brand-charcoal">
              <p>
                &ldquo;Based on verified pay data from {result.data_points || "comparable"}{" "}
                {result.specialty} nurse reports, the fair market rate for my specialty
                is <strong>${result.fair_market_value.toLocaleString()}/week</strong>.
                I&rsquo;m requesting a rate of{" "}
                <strong>${result.high_range.toLocaleString()}/week</strong>,
                which accounts for my {yearsExp} years of experience
                {hasCerts ? " and advanced certifications" : ""}. Cite the 1.5x OT
                multiplier verified by {result.data_points >= 3 ? result.data_points : 3}{" "}
                other nurses.&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
