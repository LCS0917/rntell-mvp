"use server";

import { createClient } from "@/utils/supabase/server";
import { getOrCreateSessionId } from "@/lib/session";
import {
  computeAnalysis,
  computeAuditRisk,
  type ContractInput,
  type AnalysisResult,
  type StipendOptimizationGap,
  type UserTaxContext,
  type TaxContextInput,
  type AuditRiskResult,
} from "@/lib/contract-engine";

// Re-export types so existing imports continue to work
export type {
  ContractInput,
  AnalysisResult,
  StipendOptimizationGap,
  UserTaxContext,
  TaxContextInput,
  AuditRiskResult,
};

export async function analyzeContract(
  input: ContractInput
): Promise<{ data?: AnalysisResult; error?: string }> {
  try {
    const supabase = await createClient();
    const sessionId = await getOrCreateSessionId();

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
      return { error: "Failed to save analysis. Please try again." };
    }

    return {
      data: {
        ...result,
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

export async function saveAnalysisTaxContext(
  input: TaxContextInput
): Promise<{ data?: AuditRiskResult; error?: string }> {
  try {
    const supabase = await createClient();

    // Compute audit risk using shared engine
    const riskResult = computeAuditRisk(input);

    // Update the row — match on id + session_id to prevent cross-user writes
    const { error: updateError } = await supabase
      .from("contract_analyses")
      .update({
        user_tax_context: input.tax_context,
        audit_risk_score: riskResult.audit_risk_score,
      })
      .eq("id", input.analysis_id)
      .eq("session_id", input.session_id);

    if (updateError) {
      console.error("Failed to save tax context:", updateError);
      return { error: "Failed to save. Please try again." };
    }

    return { data: riskResult };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Tax context save error:", message);
    return { error: `Save failed: ${message}` };
  }
}
