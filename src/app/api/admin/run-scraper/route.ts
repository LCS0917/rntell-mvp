/**
 * POST /api/admin/run-scraper
 * ----------------------------
 * Triggers a scraper run asynchronously.
 *
 * Request body:
 *   { source_type: string; state?: string }
 *
 * Flow:
 *   1. Authenticate caller — must be admin
 *   2. Create a scrape_jobs row with status = "queued"
 *   3. Spawn the Python runner as a child process (non-blocking)
 *   4. Return 202 Accepted with the scrape_job id
 *
 * The Python process updates the scrape_jobs row directly as it runs.
 * The admin dashboard polls GET /api/admin/scrape-jobs to show progress.
 *
 * IMPORTANT: This requires SCRAPER_PYTHON_PATH env var pointing to the
 * Python executable in your scraper virtualenv.
 */

import { spawn } from "child_process";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RunScraperBody {
  source_type: string;
  state?: string;
}

interface ScraperRunResponse {
  scrape_job_id: string;
  status: "queued";
  message: string;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  // 2. Parse body
  let body: RunScraperBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { source_type, state } = body;
  if (!source_type) {
    return NextResponse.json(
      { error: "source_type is required" },
      { status: 400 }
    );
  }

  // Validate source_type to prevent injection
  const ALLOWED_SOURCE_TYPES = ["hospital_careers", "custom"] as const;
  if (!ALLOWED_SOURCE_TYPES.includes(source_type as (typeof ALLOWED_SOURCE_TYPES)[number])) {
    return NextResponse.json(
      { error: `source_type must be one of: ${ALLOWED_SOURCE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate state (if provided) — must be 2-letter code
  if (state && !/^[A-Z]{2}$/i.test(state)) {
    return NextResponse.json(
      { error: "state must be a 2-letter US state code" },
      { status: 400 }
    );
  }

  // 3. Create scrape_jobs row
  // Use service-role client to bypass RLS for this write
  const { createClient: createServiceClient } = await import(
    "@supabase/supabase-js"
  ).then((m) => m);

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sourceName = `${source_type}${state ? ` (${state.toUpperCase()})` : ""}`;

  const { data: scrapeJob, error: insertError } = await serviceClient
    .from("scrape_jobs")
    .insert({
      source_type,
      source_name: sourceName,
      state_filter: state?.toUpperCase() ?? null,
      status: "queued",
      triggered_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !scrapeJob) {
    console.error("[run-scraper] Failed to create scrape_jobs row:", insertError);
    return NextResponse.json(
      { error: "Failed to create scrape job record" },
      { status: 500 }
    );
  }

  const scrapeJobId: string = scrapeJob.id;

  // 4. Spawn Python runner asynchronously
  const spawned = spawnScraper({ source_type, state, scrapeJobId });

  if (!spawned) {
    // Mark as failed if we couldn't spawn
    await serviceClient
      .from("scrape_jobs")
      .update({ status: "failed", errors: [{ url: "", message: "Failed to spawn Python process" }] })
      .eq("id", scrapeJobId);

    return NextResponse.json(
      { error: "Failed to start scraper process. Check SCRAPER_PYTHON_PATH." },
      { status: 500 }
    );
  }

  // 5. Return 202 immediately — don't wait for the process
  const response: ScraperRunResponse = {
    scrape_job_id: scrapeJobId,
    status: "queued",
    message: `Scraper queued for ${sourceName}. Poll /api/admin/scrape-jobs/${scrapeJobId} for status.`,
  };

  return NextResponse.json(response, { status: 202 });
}

// ---------------------------------------------------------------------------
// Spawn helper
// ---------------------------------------------------------------------------

function spawnScraper(opts: {
  source_type: string;
  state?: string;
  scrapeJobId: string;
}): boolean {
  const pythonPath = process.env.SCRAPER_PYTHON_PATH;
  if (!pythonPath) {
    console.error(
      "[run-scraper] SCRAPER_PYTHON_PATH env var not set. " +
        "Set it to the Python executable in your scraper virtualenv."
    );
    return false;
  }

  const scraperDir = path.resolve(process.cwd(), "scraper");
  const runnerScript = path.join(scraperDir, "runner.py");

  const args = [
    runnerScript,
    "--source_type",
    opts.source_type,
    "--scrape_job_id",
    opts.scrapeJobId,
  ];

  if (opts.state) {
    args.push("--state", opts.state.toUpperCase());
  }

  const child = spawn(pythonPath, args, {
    cwd: scraperDir,
    detached: true,   // Allow parent (Next.js) to exit independently
    stdio: "pipe",    // Capture output for logging
  });

  // Log output for debugging (visible in Next.js dev server terminal)
  child.stdout?.on("data", (data: Buffer) => {
    console.log(`[scraper:${opts.scrapeJobId.slice(0, 8)}] ${data.toString().trim()}`);
  });
  child.stderr?.on("data", (data: Buffer) => {
    console.error(`[scraper:${opts.scrapeJobId.slice(0, 8)}] ERR: ${data.toString().trim()}`);
  });
  child.on("exit", (code) => {
    console.log(`[scraper:${opts.scrapeJobId.slice(0, 8)}] Process exited with code ${code}`);
  });

  // Unref so Next.js doesn't wait for this process to finish
  child.unref();

  return true;
}
