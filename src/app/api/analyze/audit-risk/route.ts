import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { computeAuditRisk, type TaxContextInput } from "@/lib/contract-engine";

export async function POST(req: NextRequest) {
  try {
    const input: TaxContextInput = await req.json();

    if (!input.analysis_id || !input.session_id || !input.tax_context) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Compute audit risk using shared engine
    const data = computeAuditRisk(input);

    // Update the row — match on id + session_id to prevent cross-user writes
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from("contract_analyses")
      .update({
        user_tax_context: input.tax_context,
        audit_risk_score: data.audit_risk_score,
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
