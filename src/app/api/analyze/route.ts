import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getOrCreateSessionId } from "@/lib/session";
import { computeAnalysis, type ContractInput } from "@/lib/contract-engine";

export async function POST(req: NextRequest) {
  try {
    const input: ContractInput = await req.json();

    if (!input.city?.trim() || !input.state || !input.hourly_rate) {
      return NextResponse.json({ error: "City, state, and hourly rate are required." }, { status: 400 });
    }

    const supabase = await createClient();

    let sessionId: string;
    try {
      sessionId = await getOrCreateSessionId();
    } catch {
      sessionId = crypto.randomUUID();
    }

    // Compute analysis using shared engine
    const { result, dbRow } = await computeAnalysis(input);

    // Save to contract_analyses
    const { data: row, error: insertError } = await supabase
      .from("contract_analyses")
      .insert({
        nurse_id: null,
        session_id: sessionId,
        ...dbRow,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to save analysis:", insertError);
      return NextResponse.json({ error: `Failed to save analysis: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        ...result,
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
