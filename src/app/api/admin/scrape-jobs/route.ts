/**
 * GET /api/admin/scrape-jobs
 * --------------------------
 * Returns recent scrape_jobs records for the admin dashboard.
 * Optional query param: ?id=<uuid> to fetch a single job.
 *
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    // Single job lookup
    const { data, error } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  // List recent jobs (last 50)
  const { data, error } = await supabase
    .from("scrape_jobs")
    .select(
      "id, source_type, source_name, state_filter, status, records_created, records_updated, " +
      "facilities_created, duplicates_skipped, jobs_deactivated, started_at, finished_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
