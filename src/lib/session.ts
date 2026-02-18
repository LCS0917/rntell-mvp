import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE_NAME = "rntell_session_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Get existing session ID from cookie, or create a new one.
 * Used to link anonymous contract analyses to a browser session
 * so they can be claimed when the nurse creates an account.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME);

  if (existing?.value) {
    return existing.value;
  }

  const sessionId = randomUUID();
  cookieStore.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return sessionId;
}

/**
 * Read the session ID without creating one.
 * Used during signup to check if there's an analysis to claim.
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Clear the session cookie after claiming analyses.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
