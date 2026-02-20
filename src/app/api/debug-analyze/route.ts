import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getGsaRates } from "@/app/actions/gsa";
import { getOrCreateSessionId } from "@/lib/session";
import { analyzeFederalIncentives } from "@/lib/federal-incentives";

export async function GET() {
  const steps: string[] = [];
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const sessionId = await getOrCreateSessionId();
    const gsa = await getGsaRates("Houston", "TX");
    steps.push("Setup OK");

    // Mirror the exact insert from analyzeContract
    const weeklyBase = 45 * 36;
    const weeklyHousing = 1246;
    const weeklyMeals = 0;
    const totalWeekly = weeklyBase + weeklyHousing + weeklyMeals;
    const marginDollars = gsa.weekly_total - totalWeekly;
    const marginPct = gsa.weekly_total > 0 ? (marginDollars / gsa.weekly_total) * 100 : 0;
    const billRateLow = (totalWeekly * 1.35) / 36;
    const billRateHigh = (totalWeekly * 1.45) / 36;

    let federalIncentiveLayer = null;
    try {
      federalIncentiveLayer = analyzeFederalIncentives({
        facility_name: "Test Hospital",
        facility_zip: "77001",
        facility_state: "TX",
        facility_ein: null,
        employment_type: "W2",
        contract_length_weeks: 13,
      });
      steps.push("Federal incentives OK");
    } catch (e) {
      steps.push(`Federal incentives FAILED: ${e}`);
    }

    const analysisResult = {
      weekly_base: weeklyBase,
      hourly_rate: 45,
      overtime_rate: 67.5,
      doubletime_rate: 90,
      oncall_rate: 3.2,
      callback_rate: 70,
      bonus_signon: null,
      bonus_completion: null,
      bonus_retention: null,
      bonus_taxable_week: null,
      wage_recharacterization_risk: false,
      weekly_housing: weeklyHousing,
      weekly_meals: weeklyMeals,
      total_weekly: totalWeekly,
      travel_reimbursement: 400,
      reimbursement_type: "reimbursement",
      reimbursement_taxable: false,
      stipend_optimization_gap: { housing_gap: 0, meals_gap: 0 },
      gsa_weekly_housing: gsa.weekly_housing,
      gsa_weekly_meals: gsa.weekly_meals,
      gsa_weekly_total: gsa.weekly_total,
      gsa_source: gsa.source,
      gsa_city_label: gsa.city_returned,
      margin_dollars: marginDollars,
      margin_pct: marginPct,
      margin_risk_detected: false,
      margin_severity: "green",
      bill_rate_low: billRateLow,
      bill_rate_high: billRateHigh,
      facility_name: "Test Hospital",
      facility_zip_code: "77001",
      city: "Houston",
      state: "TX",
      specialty: "ICU",
      contract_weeks: 13,
      contract_end_date: null,
      contracted_hours_per_week: 36,
      hours_flag: null,
      user_tax_context: null,
      audit_risk_score: null,
      federal_incentive_layer: federalIncentiveLayer,
    };

    steps.push("Inserting full row...");
    const { data: row, error: insertError } = await supabase
      .from("contract_analyses")
      .insert({
        nurse_id: user?.id ?? null,
        session_id: sessionId,
        facility_name: "Test Hospital",
        facility_city: "Houston",
        facility_state: "TX",
        facility_zip_code: "77001",
        specialty: "ICU",
        shift_type: "day",
        contract_weeks: 13,
        start_date: null,
        contract_end_date: null,
        contracted_hours_per_week: 36,
        hourly_rate: 45,
        overtime_rate: 67.5,
        doubletime_rate: 90,
        oncall_rate: 3.2,
        callback_rate: 70,
        bonus_signon: null,
        bonus_completion: null,
        bonus_retention: null,
        bonus_taxable_week: null,
        stipend_housing: weeklyHousing,
        stipend_meals: weeklyMeals,
        travel_reimbursement: 400,
        reimbursement_type: "reimbursement",
        stipend_optimization_gap: { housing_gap: 0, meals_gap: 0 },
        bill_rate_estimated: (billRateLow + billRateHigh) / 2,
        market_margin_pct: marginPct,
        market_margin_dollars: marginDollars,
        gsa_rate_used: gsa.weekly_total,
        margin_risk_detected: false,
        input_method: "manual",
        raw_contract_text: null,
        storage_path: null,
        analysis_result: analysisResult,
        is_claimed: false,
      })
      .select("id")
      .single();

    if (insertError) {
      steps.push(`Insert FAILED: ${JSON.stringify(insertError)}`);
      return NextResponse.json({ success: false, steps });
    }

    steps.push(`Insert OK (id: ${row.id})`);
    await supabase.from("contract_analyses").delete().eq("id", row.id);
    steps.push("Cleaned up");

    return NextResponse.json({ success: true, steps });
  } catch (err) {
    const message = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    steps.push(`CAUGHT: ${message}`);
    return NextResponse.json({ success: false, steps }, { status: 500 });
  }
}
