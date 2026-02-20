import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { TaxContextInput, AuditRiskResult } from "@/app/actions/analyze";

export async function POST(req: NextRequest) {
  try {
    const input: TaxContextInput = await req.json();

    if (!input.analysis_id || !input.session_id || !input.tax_context) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

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
    const auditRiskScore =
      baseRateRisk + taxHomeRisk + stipendExcessRisk + metroTimeRisk;

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
    const supabase = await createClient();
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
      return NextResponse.json(
        { error: "Failed to save. Please try again." },
        { status: 500 }
      );
    }

    const data: AuditRiskResult = {
      audit_risk_score: auditRiskScore,
      score_breakdown: scoreBreakdown,
      alerts,
    };

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Audit risk calc error:", message);
    return NextResponse.json(
      { error: `Calculation failed: ${message}` },
      { status: 500 }
    );
  }
}
