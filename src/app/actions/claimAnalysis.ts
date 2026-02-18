"use server";

import { createClient } from "@/utils/supabase/server";
import { getSessionId, clearSessionCookie } from "@/lib/session";

/**
 * Claim any anonymous contract analyses that belong to the current session.
 * Called after a user signs up or logs in coming from /analyze.
 */
export async function claimAnalyses(): Promise<{ claimed: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { claimed: 0, error: "Not authenticated" };

  const sessionId = await getSessionId();
  if (!sessionId) return { claimed: 0 };

  const { data, error } = await supabase
    .from("contract_analyses")
    .update({ nurse_id: user.id, is_claimed: true })
    .eq("session_id", sessionId)
    .is("nurse_id", null)
    .select("id");

  if (error) {
    console.error("Failed to claim analyses:", error);
    return { claimed: 0, error: error.message };
  }

  await clearSessionCookie();

  return { claimed: data?.length ?? 0 };
}
