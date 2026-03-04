/**
 * Shared auth guards for API routes.
 * Eliminates repeated admin-check boilerplate across admin endpoints.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Verify the request is from an authenticated admin user.
 * Returns the user and a Supabase client, or throws ApiError.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new ApiError(403, "Admin only");
  }

  return { user, supabase };
}

/**
 * Wrap an API route handler with consistent error handling.
 * Catches ApiError and unexpected errors, returns proper JSON responses.
 */
export function withErrorHandler(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  return handler().catch((err) => {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  });
}
