"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getGsaRates } from "@/app/actions/gsa";
import { getOrCreateSessionId } from "@/lib/session";

export async function GET() {
  const steps: string[] = [];
  try {
    steps.push("1. Creating supabase client...");
    const supabase = await createClient();
    steps.push("1. OK");

    steps.push("2. Getting user...");
    const { data: { user } } = await supabase.auth.getUser();
    steps.push(`2. OK (user: ${user?.id ?? "anon"})`);

    steps.push("3. Getting session...");
    const sessionId = await getOrCreateSessionId();
    steps.push(`3. OK (session: ${sessionId})`);

    steps.push("4. Fetching GSA rates...");
    const gsa = await getGsaRates("Houston", "TX");
    steps.push(`4. OK (total: ${gsa.weekly_total})`);

    steps.push("5. Inserting test row...");
    const { data: row, error: insertError } = await supabase
      .from("contract_analyses")
      .insert({
        nurse_id: user?.id ?? null,
        session_id: sessionId,
        facility_name: "Debug Test",
        facility_city: "Houston",
        facility_state: "TX",
        hourly_rate: 45,
        stipend_housing: 1200,
        stipend_meals: 0,
        contract_weeks: 13,
        market_margin_pct: 10,
        market_margin_dollars: 100,
        gsa_rate_used: gsa.weekly_total,
        margin_risk_detected: false,
        analysis_result: {},
        is_claimed: false,
      })
      .select("id")
      .single();

    if (insertError) {
      steps.push(`5. FAILED: ${JSON.stringify(insertError)}`);
    } else {
      steps.push(`5. OK (id: ${row.id})`);
      // Clean up test row
      await supabase.from("contract_analyses").delete().eq("id", row.id);
      steps.push("6. Cleaned up test row");
    }

    return NextResponse.json({ success: true, steps });
  } catch (err) {
    const message = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    steps.push(`CAUGHT ERROR: ${message}`);
    return NextResponse.json({ success: false, steps }, { status: 500 });
  }
}
