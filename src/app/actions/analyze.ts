"use server";

import { createClient } from "@/utils/supabase/server";
import { getGsaRates, type GsaRates } from "./gsa";
import { getOrCreateSessionId } from "@/lib/session";
import { STANDARD_WEEKLY_HOURS } from "@/lib/constants";

// =============================================================================
// Contract Analysis Engine
// Takes nurse contract fields → fetches GSA rates → computes margin gap → saves
// =============================================================================

export type ContractInput = {
  facility_name?: string;
  city: string;
  state: string;
  specialty?: string;
  shift_type?: string;
  contract_weeks?: number;
  start_date?: string; // ISO date string
  hourly_rate: number;
  stipend_housing?: number;
  stipend_meals?: number;
  travel_reimbursement?: number;
  input_method?: "manual" | "pdf_upload";
  raw_contract_text?: string;
  storage_path?: string;
};

export type AnalysisResult = {
  id: string;
  // Nurse's offer breakdown
  weekly_base: number; // hourly × 36
  weekly_housing: number;
  weekly_meals: number;
  total_weekly: number;
  // GSA benchmark
  gsa_weekly_housing: number;
  gsa_weekly_meals: number;
  gsa_weekly_total: number;
  gsa_source: GsaRates["source"];
  gsa_city_label: string;
  // Margin gap
  margin_dollars: number; // positive = nurse is below market
  margin_pct: number;
  margin_risk_detected: boolean;
  margin_severity: "green" | "amber" | "red";
  // Bill rate estimate
  bill_rate_low: number;
  bill_rate_high: number;
  // Input echo
  facility_name: string | null;
  city: string;
  state: string;
  specialty: string | null;
  contract_weeks: number;
  // Session
  session_id: string;
};

const AGENCY_MARGIN_LOW = 1.35;
const AGENCY_MARGIN_HIGH = 1.45;

export async function analyzeContract(
  input: ContractInput
): Promise<{ data?: AnalysisResult; error?: string }> {
  try {
    // 1. Get authenticated user (may be null for anonymous)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. Get or create anonymous session
    const sessionId = await getOrCreateSessionId();

    // 3. Parse start date month for seasonal GSA rates
    let startMonth: number | undefined;
    if (input.start_date) {
      const d = new Date(input.start_date);
      if (!isNaN(d.getTime())) {
        startMonth = d.getMonth() + 1;
      }
    }

    // 4. Fetch GSA rates for this location
    const gsa = await getGsaRates(input.city, input.state, startMonth);

    // 5. Calculate nurse's total weekly package
    const weeklyBase = input.hourly_rate * STANDARD_WEEKLY_HOURS;
    const weeklyHousing = input.stipend_housing ?? 0;
    const weeklyMeals = input.stipend_meals ?? 0;
    const totalWeekly = weeklyBase + weeklyHousing + weeklyMeals;

    // 6. Calculate market margin gap
    // Positive margin_dollars = nurse is being paid BELOW GSA benchmark
    const marginDollars = gsa.weekly_total - totalWeekly;
    const marginPct =
      gsa.weekly_total > 0
        ? (marginDollars / gsa.weekly_total) * 100
        : 0;

    // 7. Determine severity
    const marginRiskDetected = marginPct > 10;
    let marginSeverity: "green" | "amber" | "red" = "green";
    if (marginPct > 25) marginSeverity = "red";
    else if (marginPct > 10) marginSeverity = "amber";

    // 8. Bill rate estimate range
    const billRateLow = (totalWeekly * AGENCY_MARGIN_LOW) / STANDARD_WEEKLY_HOURS;
    const billRateHigh = (totalWeekly * AGENCY_MARGIN_HIGH) / STANDARD_WEEKLY_HOURS;

    // 9. Build the full result
    const analysisResult: Omit<AnalysisResult, "id" | "session_id"> = {
      weekly_base: round2(weeklyBase),
      weekly_housing: round2(weeklyHousing),
      weekly_meals: round2(weeklyMeals),
      total_weekly: round2(totalWeekly),
      gsa_weekly_housing: round2(gsa.weekly_housing),
      gsa_weekly_meals: round2(gsa.weekly_meals),
      gsa_weekly_total: round2(gsa.weekly_total),
      gsa_source: gsa.source,
      gsa_city_label: gsa.city_returned,
      margin_dollars: round2(marginDollars),
      margin_pct: round2(marginPct),
      margin_risk_detected: marginRiskDetected,
      margin_severity: marginSeverity,
      bill_rate_low: round2(billRateLow),
      bill_rate_high: round2(billRateHigh),
      facility_name: input.facility_name || null,
      city: input.city,
      state: input.state,
      specialty: input.specialty || null,
      contract_weeks: input.contract_weeks ?? 13,
    };

    // 10. Save to contract_analyses
    const { data: row, error: insertError } = await supabase
      .from("contract_analyses")
      .insert({
        nurse_id: user?.id ?? null,
        session_id: sessionId,
        facility_name: input.facility_name || null,
        facility_city: input.city,
        facility_state: input.state,
        specialty: input.specialty || null,
        shift_type: input.shift_type || null,
        contract_weeks: input.contract_weeks ?? 13,
        start_date: input.start_date || null,
        hourly_rate: input.hourly_rate,
        stipend_housing: weeklyHousing,
        stipend_meals: weeklyMeals,
        travel_reimbursement: input.travel_reimbursement ?? null,
        bill_rate_estimated: round2((billRateLow + billRateHigh) / 2),
        market_margin_pct: round2(marginPct),
        market_margin_dollars: round2(marginDollars),
        gsa_rate_used: round2(gsa.weekly_total),
        margin_risk_detected: marginRiskDetected,
        input_method: input.input_method ?? "manual",
        raw_contract_text: input.raw_contract_text ?? null,
        storage_path: input.storage_path ?? null,
        analysis_result: analysisResult,
        is_claimed: !!user,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to save analysis:", insertError);
      return { error: "Failed to save analysis. Please try again." };
    }

    return {
      data: {
        ...analysisResult,
        id: row.id,
        session_id: sessionId,
      },
    };
  } catch (err) {
    console.error("Analysis error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
