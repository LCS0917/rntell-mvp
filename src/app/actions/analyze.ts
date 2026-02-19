"use server";

import { createClient } from "@/utils/supabase/server";
import { getGsaRates, type GsaRates } from "./gsa";
import { getOrCreateSessionId } from "@/lib/session";
import { STANDARD_WEEKLY_HOURS } from "@/lib/constants";
import {
  analyzeFederalIncentives,
  type FederalIncentiveLayer,
  type EmploymentType,
} from "@/lib/federal-incentives";

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
  facility_zip_code?: string;
  // Layer 1 — Taxable Income
  hourly_rate: number;
  overtime_rate?: number;
  doubletime_rate?: number;
  oncall_rate?: number;
  callback_rate?: number;
  bonus_signon?: number;
  bonus_completion?: number;
  bonus_retention?: number;
  bonus_taxable_week?: string;
  // Layer 2 — Stipends
  stipend_housing?: number;
  stipend_meals?: number;
  travel_reimbursement?: number;
  reimbursement_type?: "reimbursement" | "bonus";
  // Layer 3 — Contract Metadata
  contract_weeks?: number;
  start_date?: string; // ISO date string
  contract_end_date?: string; // ISO date string
  contracted_hours_per_week?: number;
  // Employment classification (for federal incentive detection)
  employment_type?: EmploymentType; // "W2" | "1099" — defaults to "W2"
  facility_ein?: string;
  // Meta
  input_method?: "manual" | "pdf_upload";
  raw_contract_text?: string;
  storage_path?: string;
};

export type StipendOptimizationGap = {
  housing_gap: number; // GSA max housing − reported housing (positive = room to optimize)
  meals_gap: number; // GSA max meals − reported meals
};

export type UserTaxContext = {
  tax_home_zip: string;
  tax_home_monthly_expense: number;
  metro_months_last_24: number;
};

export type AnalysisResult = {
  id: string;
  // Layer 1 — Taxable Income
  weekly_base: number; // hourly × hours
  hourly_rate: number;
  overtime_rate: number | null;
  doubletime_rate: number | null;
  oncall_rate: number | null;
  callback_rate: number | null;
  bonus_signon: number | null;
  bonus_completion: number | null;
  bonus_retention: number | null;
  bonus_taxable_week: string | null;
  wage_recharacterization_risk: boolean; // base < $25
  // Layer 2 — Stipends
  weekly_housing: number;
  weekly_meals: number;
  total_weekly: number;
  travel_reimbursement: number | null;
  reimbursement_type: "reimbursement" | "bonus" | null;
  reimbursement_taxable: boolean; // true if type === 'bonus'
  stipend_optimization_gap: StipendOptimizationGap;
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
  // Layer 3 — Contract Metadata
  facility_name: string | null;
  facility_zip_code: string | null;
  city: string;
  state: string;
  specialty: string | null;
  contract_weeks: number;
  contract_end_date: string | null;
  contracted_hours_per_week: number | null;
  hours_flag: string | null; // warning text if hours != 36 or 40
  // Layer 4 — Tax context (populated after follow-up form)
  user_tax_context: UserTaxContext | null;
  audit_risk_score: number | null; // 0–100, null until tax context submitted
  // Federal Incentive Layer
  federal_incentive_layer: FederalIncentiveLayer | null;
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
    const hours = input.contracted_hours_per_week ?? STANDARD_WEEKLY_HOURS;
    const weeklyBase = input.hourly_rate * hours;
    const weeklyHousing = input.stipend_housing ?? 0;
    const weeklyMeals = input.stipend_meals ?? 0;
    const totalWeekly = weeklyBase + weeklyHousing + weeklyMeals;

    // 5a. Derive OT/DT from base if not provided
    const overtimeRate = input.overtime_rate ?? round2(input.hourly_rate * 1.5);
    const doubletimeRate = input.doubletime_rate ?? round2(input.hourly_rate * 2);

    // 5b. Wage recharacterization risk
    const wageRecharacterizationRisk = input.hourly_rate < 25;

    // 5c. Reimbursement taxability
    const reimbursementTaxable = input.reimbursement_type === "bonus";

    // 5d. Hours flag
    let hoursFlag: string | null = null;
    if (input.contracted_hours_per_week && input.contracted_hours_per_week !== 36 && input.contracted_hours_per_week !== 40) {
      hoursFlag = `Contract specifies ${input.contracted_hours_per_week}hrs/week (standard is 36 or 40). Weekly gross calculations use this figure.`;
    }

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

    // 7a. Stipend optimization gap
    const stipendOptimizationGap: StipendOptimizationGap = {
      housing_gap: round2(gsa.weekly_housing - weeklyHousing),
      meals_gap: round2(gsa.weekly_meals - weeklyMeals),
    };

    // 8. Bill rate estimate range
    const billRateLow = (totalWeekly * AGENCY_MARGIN_LOW) / hours;
    const billRateHigh = (totalWeekly * AGENCY_MARGIN_HIGH) / hours;

    // 8a. Federal incentive layer detection
    let federalIncentiveLayer: FederalIncentiveLayer | null = null;
    if (input.facility_zip_code) {
      try {
        federalIncentiveLayer = analyzeFederalIncentives({
          facility_name: input.facility_name || "Unknown Facility",
          facility_zip: input.facility_zip_code,
          facility_state: input.state,
          facility_ein: input.facility_ein ?? null,
          employment_type: input.employment_type ?? "W2",
          contract_length_weeks: input.contract_weeks ?? 13,
        });
      } catch {
        // Non-critical — incentive detection failure should not block analysis
        federalIncentiveLayer = null;
      }
    }

    // 9. Build the full result
    const analysisResult: Omit<AnalysisResult, "id" | "session_id"> = {
      // Layer 1
      weekly_base: round2(weeklyBase),
      hourly_rate: input.hourly_rate,
      overtime_rate: overtimeRate,
      doubletime_rate: doubletimeRate,
      oncall_rate: input.oncall_rate ?? null,
      callback_rate: input.callback_rate ?? null,
      bonus_signon: input.bonus_signon ?? null,
      bonus_completion: input.bonus_completion ?? null,
      bonus_retention: input.bonus_retention ?? null,
      bonus_taxable_week: input.bonus_taxable_week ?? null,
      wage_recharacterization_risk: wageRecharacterizationRisk,
      // Layer 2
      weekly_housing: round2(weeklyHousing),
      weekly_meals: round2(weeklyMeals),
      total_weekly: round2(totalWeekly),
      travel_reimbursement: input.travel_reimbursement ?? null,
      reimbursement_type: input.reimbursement_type ?? null,
      reimbursement_taxable: reimbursementTaxable,
      stipend_optimization_gap: stipendOptimizationGap,
      // GSA
      gsa_weekly_housing: round2(gsa.weekly_housing),
      gsa_weekly_meals: round2(gsa.weekly_meals),
      gsa_weekly_total: round2(gsa.weekly_total),
      gsa_source: gsa.source,
      gsa_city_label: gsa.city_returned,
      // Margin
      margin_dollars: round2(marginDollars),
      margin_pct: round2(marginPct),
      margin_risk_detected: marginRiskDetected,
      margin_severity: marginSeverity,
      // Bill rate
      bill_rate_low: round2(billRateLow),
      bill_rate_high: round2(billRateHigh),
      // Layer 3
      facility_name: input.facility_name || null,
      facility_zip_code: input.facility_zip_code || null,
      city: input.city,
      state: input.state,
      specialty: input.specialty || null,
      contract_weeks: input.contract_weeks ?? 13,
      contract_end_date: input.contract_end_date || null,
      contracted_hours_per_week: input.contracted_hours_per_week ?? null,
      hours_flag: hoursFlag,
      // Layer 4 — not yet collected at this point
      user_tax_context: null,
      audit_risk_score: null,
      // Federal Incentive Layer
      federal_incentive_layer: federalIncentiveLayer,
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
        facility_zip_code: input.facility_zip_code || null,
        specialty: input.specialty || null,
        shift_type: input.shift_type || null,
        contract_weeks: input.contract_weeks ?? 13,
        start_date: input.start_date || null,
        contract_end_date: input.contract_end_date || null,
        contracted_hours_per_week: input.contracted_hours_per_week ?? null,
        hourly_rate: input.hourly_rate,
        overtime_rate: overtimeRate,
        doubletime_rate: doubletimeRate,
        oncall_rate: input.oncall_rate ?? null,
        callback_rate: input.callback_rate ?? null,
        bonus_signon: input.bonus_signon ?? null,
        bonus_completion: input.bonus_completion ?? null,
        bonus_retention: input.bonus_retention ?? null,
        bonus_taxable_week: input.bonus_taxable_week ?? null,
        stipend_housing: weeklyHousing,
        stipend_meals: weeklyMeals,
        travel_reimbursement: input.travel_reimbursement ?? null,
        reimbursement_type: input.reimbursement_type ?? null,
        stipend_optimization_gap: stipendOptimizationGap,
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
    const message = err instanceof Error ? err.message : String(err);
    console.error("Analysis error:", message);
    return { error: `Analysis failed: ${message}` };
  }
}

// =============================================================================
// Tax Context — save Layer 4 data and compute audit risk score
// Called client-side after the follow-up form is submitted.
// Updates the existing contract_analyses row identified by id + session_id.
// =============================================================================

export type TaxContextInput = {
  analysis_id: string;
  session_id: string;
  tax_context: UserTaxContext;
  // Need these to recalculate score without a DB round-trip
  hourly_rate: number;
  stipend_housing: number;
  stipend_meals: number;
  gsa_weekly_housing: number;
  gsa_weekly_meals: number;
};

export type AuditRiskResult = {
  audit_risk_score: number;
  score_breakdown: {
    base_rate_risk: number;       // +30 if hourly < $25
    tax_home_risk: number;        // +30 if monthly expense = $0
    stipend_excess_risk: number;  // +20 if either stipend > GSA max
    metro_time_risk: number;      // +20 if metro months > 10
  };
  alerts: string[];
};

export async function saveAnalysisTaxContext(
  input: TaxContextInput
): Promise<{ data?: AuditRiskResult; error?: string }> {
  try {
    const supabase = await createClient();

    const ctx = input.tax_context;

    // Calculate audit risk score components
    const baseRateRisk = input.hourly_rate < 25 ? 30 : 0;
    const taxHomeRisk = ctx.tax_home_monthly_expense === 0 ? 30 : 0;
    const stipendExcessRisk =
      input.stipend_housing > input.gsa_weekly_housing ||
      input.stipend_meals > input.gsa_weekly_meals
        ? 20
        : 0;
    const metroTimeRisk = ctx.metro_months_last_24 > 10 ? 20 : 0;
    const auditRiskScore = baseRateRisk + taxHomeRisk + stipendExcessRisk + metroTimeRisk;

    const scoreBreakdown = {
      base_rate_risk: baseRateRisk,
      tax_home_risk: taxHomeRisk,
      stipend_excess_risk: stipendExcessRisk,
      metro_time_risk: metroTimeRisk,
    };

    // Build alerts list
    const alerts: string[] = [];
    if (baseRateRisk > 0) {
      alerts.push(
        "Wage Recharacterization Risk: Your base hourly rate is below $25/hr. The IRS may reclassify a larger portion of your compensation as taxable wages, reducing the tax advantage of your stipends."
      );
    }
    if (taxHomeRisk > 0) {
      alerts.push(
        "Tax Home Expense Alert: If you pay no housing costs at your permanent tax home, the IRS may classify all travel stipends as taxable income. This significantly changes your tax exposure."
      );
    }
    if (stipendExcessRisk > 0) {
      alerts.push(
        "Stipend Exceeds GSA Maximum: One or more of your stipends is above the GSA per diem rate for this location. Amounts above GSA maximums are generally considered taxable income."
      );
    }
    if (metroTimeRisk > 0) {
      alerts.push(
        `12-Month Rule Warning: You've worked ${ctx.metro_months_last_24} months in this metro area over the last 24 months. Exceeding 12 months can invalidate your tax-free stipend status for this assignment.`
      );
    }

    // Update the row — match on id + session_id to prevent cross-user writes
    const { error: updateError } = await supabase
      .from("contract_analyses")
      .update({
        user_tax_context: ctx,
        audit_risk_score: auditRiskScore,
      })
      .eq("id", input.analysis_id)
      .eq("session_id", input.session_id);

    if (updateError) {
      console.error("Failed to save tax context:", updateError);
      return { error: "Failed to save. Please try again." };
    }

    return {
      data: {
        audit_risk_score: auditRiskScore,
        score_breakdown: scoreBreakdown,
        alerts,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Tax context save error:", message);
    return { error: `Save failed: ${message}` };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
