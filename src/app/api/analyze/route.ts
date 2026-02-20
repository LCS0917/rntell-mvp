import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getGsaRates } from "@/app/actions/gsa";
import { getOrCreateSessionId } from "@/lib/session";
import { STANDARD_WEEKLY_HOURS } from "@/lib/constants";
import { analyzeFederalIncentives } from "@/lib/federal-incentives";
import type { ContractInput, AnalysisResult, StipendOptimizationGap } from "@/app/actions/analyze";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const AGENCY_MARGIN_LOW = 1.35;
const AGENCY_MARGIN_HIGH = 1.45;

export async function POST(req: NextRequest) {
  try {
    const input: ContractInput = await req.json();

    if (!input.city?.trim() || !input.state || !input.hourly_rate) {
      return NextResponse.json({ error: "City, state, and hourly rate are required." }, { status: 400 });
    }

    const supabase = await createClient();
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Anonymous — continue
    }

    let sessionId: string;
    try {
      sessionId = await getOrCreateSessionId();
    } catch {
      sessionId = crypto.randomUUID();
    }

    let startMonth: number | undefined;
    if (input.start_date) {
      const d = new Date(input.start_date);
      if (!isNaN(d.getTime())) startMonth = d.getMonth() + 1;
    }

    const gsa = await getGsaRates(input.city, input.state, startMonth);

    const hours = input.contracted_hours_per_week ?? STANDARD_WEEKLY_HOURS;
    const weeklyBase = input.hourly_rate * hours;
    const weeklyHousing = input.stipend_housing ?? 0;
    const weeklyMeals = input.stipend_meals ?? 0;
    const totalWeekly = weeklyBase + weeklyHousing + weeklyMeals;

    const overtimeRate = input.overtime_rate ?? round2(input.hourly_rate * 1.5);
    const doubletimeRate = input.doubletime_rate ?? round2(input.hourly_rate * 2);
    const wageRecharacterizationRisk = input.hourly_rate < 25;
    const reimbursementTaxable = input.reimbursement_type === "bonus";

    let hoursFlag: string | null = null;
    if (input.contracted_hours_per_week && input.contracted_hours_per_week !== 36 && input.contracted_hours_per_week !== 40) {
      hoursFlag = `Contract specifies ${input.contracted_hours_per_week}hrs/week (standard is 36 or 40). Weekly gross calculations use this figure.`;
    }

    const marginDollars = gsa.weekly_total - totalWeekly;
    const marginPct = gsa.weekly_total > 0 ? (marginDollars / gsa.weekly_total) * 100 : 0;
    const marginRiskDetected = marginPct > 10;
    let marginSeverity: "green" | "amber" | "red" = "green";
    if (marginPct > 25) marginSeverity = "red";
    else if (marginPct > 10) marginSeverity = "amber";

    const stipendOptimizationGap: StipendOptimizationGap = {
      housing_gap: round2(gsa.weekly_housing - weeklyHousing),
      meals_gap: round2(gsa.weekly_meals - weeklyMeals),
    };

    const billRateLow = (totalWeekly * AGENCY_MARGIN_LOW) / hours;
    const billRateHigh = (totalWeekly * AGENCY_MARGIN_HIGH) / hours;

    let federalIncentiveLayer = null;
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
        federalIncentiveLayer = null;
      }
    }

    const analysisResult: Omit<AnalysisResult, "id" | "session_id"> = {
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
      weekly_housing: round2(weeklyHousing),
      weekly_meals: round2(weeklyMeals),
      total_weekly: round2(totalWeekly),
      travel_reimbursement: input.travel_reimbursement ?? null,
      reimbursement_type: input.reimbursement_type ?? null,
      reimbursement_taxable: reimbursementTaxable,
      stipend_optimization_gap: stipendOptimizationGap,
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
      facility_zip_code: input.facility_zip_code || null,
      city: input.city,
      state: input.state,
      specialty: input.specialty || null,
      contract_weeks: input.contract_weeks ?? 13,
      contract_end_date: input.contract_end_date || null,
      contracted_hours_per_week: input.contracted_hours_per_week ?? null,
      hours_flag: hoursFlag,
      user_tax_context: null,
      audit_risk_score: null,
      federal_incentive_layer: federalIncentiveLayer,
    };

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
        shift_type: input.shift_type ? input.shift_type.toLowerCase() : null,
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
      return NextResponse.json({ error: `Failed to save analysis: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        ...analysisResult,
        id: row.id,
        session_id: sessionId,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Analysis error:", message);
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
