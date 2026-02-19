"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// ---------------------------------------------------------------------------
// Auth guard — every admin action calls this first
// ---------------------------------------------------------------------------
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  return { user, supabase };
}

// ---------------------------------------------------------------------------
// OVERVIEW
// ---------------------------------------------------------------------------
export async function getOverviewStats() {
  await requireAdmin();
  const db = createAdminClient();

  const [nurses, facilities, jobs, analyses, applications] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "nurse"),
    db.from("facilities").select("id, is_claimed", { count: "exact" }),
    db.from("job_postings").select("id, data_source", { count: "exact" }),
    db.from("contract_analyses").select("id, is_claimed", { count: "exact" }),
    db.from("applications").select("id", { count: "exact", head: true }),
  ]);

  const facilitiesData = facilities.data || [];
  const claimed = facilitiesData.filter((f) => f.is_claimed).length;
  const unclaimed = facilitiesData.length - claimed;

  const jobsData = jobs.data || [];
  const scraped = jobsData.filter((j) => j.data_source === "scraped").length;
  const direct = jobsData.length - scraped;

  const analysesData = analyses.data || [];
  const claimedAnalyses = analysesData.filter((a) => a.is_claimed).length;
  const anonymousAnalyses = analysesData.length - claimedAnalyses;

  return {
    totalNurses: nurses.count ?? 0,
    totalFacilities: facilitiesData.length,
    facilitiesClaimed: claimed,
    facilitiesUnclaimed: unclaimed,
    totalJobs: jobsData.length,
    jobsScraped: scraped,
    jobsDirect: direct,
    totalAnalyses: analysesData.length,
    analysesClaimed: claimedAnalyses,
    analysesAnonymous: anonymousAnalyses,
    totalApplications: applications.count ?? 0,
  };
}

export async function getActivityFeed() {
  await requireAdmin();
  const db = createAdminClient();

  // Pull recent records from multiple tables and merge into a feed
  const [profiles, facilities, analyses, applications] = await Promise.all([
    db
      .from("profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("facilities")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("contract_analyses")
      .select("id, facility_name, specialty, is_claimed, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("applications")
      .select("id, nurse_id, job_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  type FeedItem = {
    id: string;
    type: string;
    description: string;
    who: string;
    when: string;
    link: string;
  };

  const feed: FeedItem[] = [];

  (profiles.data || []).forEach((p) => {
    feed.push({
      id: p.id,
      type: "signup",
      description: `New ${p.role} signed up`,
      who: p.email,
      when: p.created_at,
      link:
        p.role === "nurse"
          ? "/admin/nurses"
          : p.role === "facility"
            ? "/admin/facilities"
            : "/admin/settings",
    });
  });

  (facilities.data || []).forEach((f) => {
    feed.push({
      id: f.id,
      type: "facility",
      description: `Facility created: ${f.name}`,
      who: f.name,
      when: f.created_at,
      link: "/admin/facilities",
    });
  });

  (analyses.data || []).forEach((a) => {
    feed.push({
      id: a.id,
      type: "analysis",
      description: `Contract analyzed — ${a.facility_name || "Unknown"} (${a.specialty || "N/A"})`,
      who: a.is_claimed ? "Claimed" : "Anonymous",
      when: a.created_at,
      link: "/admin/analyses",
    });
  });

  (applications.data || []).forEach((app) => {
    feed.push({
      id: app.id,
      type: "application",
      description: `Application ${app.status}`,
      who: app.nurse_id,
      when: app.created_at,
      link: "/admin/jobs",
    });
  });

  // Sort by date descending and take 20
  feed.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  return feed.slice(0, 20);
}

// ---------------------------------------------------------------------------
// NURSES
// ---------------------------------------------------------------------------
export async function getNurses(filters?: {
  search?: string;
  verification_status?: string;
  specialty?: string;
  license_state?: string;
}) {
  await requireAdmin();
  const db = createAdminClient();

  // Join nurses with profiles for name/email
  let query = db
    .from("nurses")
    .select(
      `id, specialty, license_state, license_compact, verification_status, created_at,
       profiles!inner(email, full_name, created_at)`
    );

  if (filters?.verification_status) {
    query = query.eq("verification_status", filters.verification_status);
  }
  if (filters?.specialty) {
    query = query.eq("specialty", filters.specialty);
  }
  if (filters?.license_state) {
    query = query.eq("license_state", filters.license_state);
  }

  const { data: nurses, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  // Search filter (name or email) — client side since we need the join
  let result = nurses || [];
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter((n) => {
      const profile = n.profiles as unknown as { email: string; full_name: string | null };
      return (
        profile.email?.toLowerCase().includes(s) ||
        profile.full_name?.toLowerCase().includes(s)
      );
    });
  }

  // Get analysis/application counts per nurse
  const nurseIds = result.map((n) => n.id);

  const [analysesCounts, appCounts, docCounts] = await Promise.all([
    db
      .from("contract_analyses")
      .select("nurse_id")
      .in("nurse_id", nurseIds.length ? nurseIds : [""]),
    db
      .from("applications")
      .select("nurse_id")
      .in("nurse_id", nurseIds.length ? nurseIds : [""]),
    db
      .from("nurse_documents")
      .select("nurse_id")
      .in("nurse_id", nurseIds.length ? nurseIds : [""]),
  ]);

  const analysesMap = new Map<string, number>();
  (analysesCounts.data || []).forEach((a) => {
    analysesMap.set(a.nurse_id, (analysesMap.get(a.nurse_id) || 0) + 1);
  });

  const appsMap = new Map<string, number>();
  (appCounts.data || []).forEach((a) => {
    appsMap.set(a.nurse_id, (appsMap.get(a.nurse_id) || 0) + 1);
  });

  const docsSet = new Set<string>();
  (docCounts.data || []).forEach((d) => docsSet.add(d.nurse_id));

  return result.map((n) => {
    const profile = n.profiles as unknown as {
      email: string;
      full_name: string | null;
      created_at: string;
    };
    return {
      id: n.id,
      name: profile.full_name || "—",
      email: profile.email,
      joined: profile.created_at,
      specialty: n.specialty,
      license_state: n.license_state,
      license_compact: n.license_compact,
      verification_status: n.verification_status,
      analyses_count: analysesMap.get(n.id) || 0,
      applications_count: appsMap.get(n.id) || 0,
      has_passport_docs: docsSet.has(n.id),
    };
  });
}

export async function updateNurseVerification(nurseId: string, status: string) {
  await requireAdmin();
  const db = createAdminClient();

  const { error } = await db
    .from("nurses")
    .update({ verification_status: status })
    .eq("id", nurseId);

  if (error) throw error;
  return { success: true };
}

// ---------------------------------------------------------------------------
// FACILITIES
// ---------------------------------------------------------------------------
export async function getFacilities(filters?: {
  search?: string;
  state?: string;
  claimed?: string;
  verification_status?: string;
  data_source?: string;
}) {
  await requireAdmin();
  const db = createAdminClient();

  let query = db
    .from("facilities")
    .select(
      `id, name, location_city, location_state, type, data_source, is_claimed,
       is_verified, verification_status, is_premium_subscriber, admin_notes, created_at,
       description, website`
    );

  if (filters?.state) query = query.eq("location_state", filters.state);
  if (filters?.claimed === "true") query = query.eq("is_claimed", true);
  if (filters?.claimed === "false") query = query.eq("is_claimed", false);
  if (filters?.verification_status)
    query = query.eq("verification_status", filters.verification_status);
  if (filters?.data_source) query = query.eq("data_source", filters.data_source);

  const { data: facilities, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  let result = facilities || [];
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter((f) => f.name?.toLowerCase().includes(s));
  }

  // Get job + review counts per facility
  const facilityIds = result.map((f) => f.id);

  const [jobCounts, reviewCounts] = await Promise.all([
    db
      .from("job_postings")
      .select("facility_id")
      .in("facility_id", facilityIds.length ? facilityIds : [""]),
    db
      .from("facility_reviews")
      .select("facility_id")
      .in("facility_id", facilityIds.length ? facilityIds : [""]),
  ]);

  const jobsMap = new Map<string, number>();
  (jobCounts.data || []).forEach((j) => {
    jobsMap.set(j.facility_id, (jobsMap.get(j.facility_id) || 0) + 1);
  });

  const reviewsMap = new Map<string, number>();
  (reviewCounts.data || []).forEach((r) => {
    reviewsMap.set(r.facility_id, (reviewsMap.get(r.facility_id) || 0) + 1);
  });

  return result.map((f) => ({
    ...f,
    jobs_count: jobsMap.get(f.id) || 0,
    reviews_count: reviewsMap.get(f.id) || 0,
  }));
}

export async function updateFacilityClaim(facilityId: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db
    .from("facilities")
    .update({ is_claimed: true })
    .eq("id", facilityId);
  if (error) throw error;
  return { success: true };
}

export async function updateFacilityVerification(
  facilityId: string,
  action: "approve" | "reject",
  reason?: string
) {
  await requireAdmin();
  const db = createAdminClient();

  if (action === "approve") {
    const { error } = await db
      .from("facilities")
      .update({ is_verified: true, verification_status: "verified" })
      .eq("id", facilityId);
    if (error) throw error;
  } else {
    const { error } = await db
      .from("facilities")
      .update({ verification_status: "rejected" })
      .eq("id", facilityId);
    if (error) throw error;
  }
  return { success: true };
}

export async function updateFacilityNotes(facilityId: string, notes: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db
    .from("facilities")
    .update({ admin_notes: notes })
    .eq("id", facilityId);
  if (error) throw error;
  return { success: true };
}

// ---------------------------------------------------------------------------
// JOBS
// ---------------------------------------------------------------------------
export async function getJobs(filters?: {
  search?: string;
  specialty?: string;
  state?: string;
  data_source?: string;
  active?: string;
}) {
  await requireAdmin();
  const db = createAdminClient();

  let query = db
    .from("job_postings")
    .select(
      `id, title, specialty, pay_rate_hourly, stipend_housing, stipend_meals,
       data_source, is_active, start_date, created_at, contract_weeks, description,
       facility_id, facilities!inner(name, location_city, location_state)`
    );

  if (filters?.specialty) query = query.eq("specialty", filters.specialty);
  if (filters?.active === "true") query = query.eq("is_active", true);
  if (filters?.active === "false") query = query.eq("is_active", false);
  if (filters?.data_source) query = query.eq("data_source", filters.data_source);

  const { data: jobs, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  let result = jobs || [];

  // Filter by state (from facility join)
  if (filters?.state) {
    result = result.filter((j) => {
      const fac = j.facilities as unknown as { location_state: string };
      return fac.location_state === filters.state;
    });
  }

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter((j) => {
      const fac = j.facilities as unknown as { name: string };
      return j.title?.toLowerCase().includes(s) || fac.name?.toLowerCase().includes(s);
    });
  }

  // Get application counts per job
  const jobIds = result.map((j) => j.id);
  const { data: appCounts } = await db
    .from("applications")
    .select("job_id")
    .in("job_id", jobIds.length ? jobIds : [""]);

  const appsMap = new Map<string, number>();
  (appCounts || []).forEach((a) => {
    appsMap.set(a.job_id, (appsMap.get(a.job_id) || 0) + 1);
  });

  return result.map((j) => {
    const fac = j.facilities as unknown as {
      name: string;
      location_city: string;
      location_state: string;
    };
    const weeklyPackage =
      (Number(j.pay_rate_hourly) || 0) * 36 +
      (Number(j.stipend_housing) || 0) +
      (Number(j.stipend_meals) || 0);

    return {
      id: j.id,
      title: j.title,
      facility_name: fac.name,
      city: fac.location_city,
      state: fac.location_state,
      specialty: j.specialty,
      weekly_package: weeklyPackage,
      data_source: j.data_source,
      is_active: j.is_active,
      applications_count: appsMap.get(j.id) || 0,
      date_posted: j.created_at,
      facility_id: j.facility_id,
      pay_rate_hourly: j.pay_rate_hourly,
      stipend_housing: j.stipend_housing,
      stipend_meals: j.stipend_meals,
      contract_weeks: j.contract_weeks,
      start_date: j.start_date,
      description: (j as unknown as { description: string | null }).description,
    };
  });
}

export async function toggleJobActive(jobId: string, isActive: boolean) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db
    .from("job_postings")
    .update({ is_active: isActive })
    .eq("id", jobId);
  if (error) throw error;
  return { success: true };
}

export async function deleteJob(jobId: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("job_postings").delete().eq("id", jobId);
  if (error) throw error;
  return { success: true };
}

// ---------------------------------------------------------------------------
// ANALYSES
// ---------------------------------------------------------------------------
export async function getAnalyses(filters?: {
  state?: string;
  specialty?: string;
  claimed?: string;
  margin_risk?: string;
  date_from?: string;
  date_to?: string;
}) {
  await requireAdmin();
  const db = createAdminClient();

  let query = db.from("contract_analyses").select(
    `id, nurse_id, facility_name, facility_state, specialty, hourly_rate,
     stipend_housing, stipend_meals, market_margin_dollars, margin_risk_detected,
     input_method, is_claimed, analysis_result, bill_rate_estimated,
     market_margin_pct, gsa_rate_used, travel_reimbursement, contract_weeks,
     start_date, shift_type, raw_contract_text, storage_path, session_id,
     created_at, updated_at`
  );

  if (filters?.state) query = query.eq("facility_state", filters.state);
  if (filters?.specialty) query = query.eq("specialty", filters.specialty);
  if (filters?.claimed === "true") query = query.eq("is_claimed", true);
  if (filters?.claimed === "false") query = query.eq("is_claimed", false);
  if (filters?.margin_risk === "true") query = query.eq("margin_risk_detected", true);
  if (filters?.date_from) query = query.gte("created_at", filters.date_from);
  if (filters?.date_to) query = query.lte("created_at", filters.date_to);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  // Get nurse names for claimed analyses
  const nurseIds = (data || [])
    .filter((a) => a.nurse_id)
    .map((a) => a.nurse_id as string);

  let nurseMap = new Map<string, string>();
  if (nurseIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", nurseIds);
    (profiles || []).forEach((p) => {
      nurseMap.set(p.id, p.full_name || p.email);
    });
  }

  return (data || []).map((a) => {
    const weeklyPackage =
      (Number(a.hourly_rate) || 0) * 36 +
      (Number(a.stipend_housing) || 0) +
      (Number(a.stipend_meals) || 0);
    return {
      ...a,
      nurse_name: a.nurse_id ? nurseMap.get(a.nurse_id) || "Unknown" : "Anonymous",
      weekly_package: weeklyPackage,
    };
  });
}

// ---------------------------------------------------------------------------
// PLACEHOLDER STATS
// ---------------------------------------------------------------------------
export async function getRentalStats() {
  await requireAdmin();
  const db = createAdminClient();
  const { count } = await db
    .from("rental_listings")
    .select("id", { count: "exact", head: true });
  return { totalListings: count ?? 0 };
}

export async function getCredentialStats() {
  await requireAdmin();
  const db = createAdminClient();

  const { count: total } = await db
    .from("nurse_documents")
    .select("id", { count: "exact", head: true });

  const { data: docs } = await db
    .from("nurse_documents")
    .select("verification_status");

  const statusCounts: Record<string, number> = {};
  (docs || []).forEach((d) => {
    statusCounts[d.verification_status] = (statusCounts[d.verification_status] || 0) + 1;
  });

  return { totalDocuments: total ?? 0, byStatus: statusCounts };
}

export async function getFeeStats() {
  await requireAdmin();
  const db = createAdminClient();

  const [contracts, rentals] = await Promise.all([
    db.from("contracts").select("id, success_fee_amount, success_fee_paid"),
    db.from("rental_agreements").select("id, bank_shield_fee, status"),
  ]);

  const contractsData = contracts.data || [];
  const totalContracts = contractsData.length;
  const totalFeesOwed = contractsData
    .filter((c) => !c.success_fee_paid)
    .reduce((sum, c) => sum + (Number(c.success_fee_amount) || 0), 0);

  const rentalsData = rentals.data || [];
  const activeRentals = rentalsData.filter(
    (r) => r.status === "active" || r.status === "completed"
  ).length;
  const totalRentalFees = rentalsData
    .filter((r) => r.status === "active" || r.status === "completed")
    .reduce((sum, r) => sum + (Number(r.bank_shield_fee) || 0), 0);

  return {
    totalContracts,
    totalFeesOwed,
    activeRentals,
    totalRentalFees,
  };
}

export async function getAdminProfile() {
  const { user } = await requireAdmin();
  return { email: user.email, role: "admin" };
}

// ---------------------------------------------------------------------------
// CREATE FACILITY
// ---------------------------------------------------------------------------
export async function createFacility(data: {
  name: string;
  location_city?: string;
  location_state?: string;
  type?: string;
  data_source?: string;
  description?: string;
  website?: string;
}) {
  await requireAdmin();
  const db = createAdminClient();

  // Create a profile row first (facilities FK to profiles)
  const { data: authUser, error: authError } = await db.auth.admin.createUser({
    email: `facility-${Date.now()}@rntell-placeholder.com`,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { role: "facility" },
  });
  if (authError) throw authError;

  const facilityId = authUser.user.id;

  // Update the profile name
  const { error: profileError } = await db
    .from("profiles")
    .update({ full_name: data.name })
    .eq("id", facilityId);
  if (profileError) throw profileError;

  // Insert into facilities
  const { error } = await db.from("facilities").insert({
    id: facilityId,
    name: data.name,
    location_city: data.location_city || null,
    location_state: data.location_state || null,
    type: data.type || null,
    data_source: data.data_source || "imported",
    description: data.description || null,
    website: data.website || null,
    is_claimed: false,
  });
  if (error) throw error;

  return { success: true, id: facilityId };
}

// ---------------------------------------------------------------------------
// CREATE JOB
// ---------------------------------------------------------------------------
export async function createJob(data: {
  facility_id: string;
  title: string;
  specialty: string;
  pay_rate_hourly?: number;
  stipend_housing?: number;
  stipend_meals?: number;
  contract_weeks?: number;
  start_date?: string;
  description?: string;
  data_source?: string;
}) {
  await requireAdmin();
  const db = createAdminClient();

  const { error } = await db.from("job_postings").insert({
    facility_id: data.facility_id,
    title: data.title,
    specialty: data.specialty,
    pay_rate_hourly: data.pay_rate_hourly || null,
    stipend_housing: data.stipend_housing || null,
    stipend_meals: data.stipend_meals || null,
    contract_weeks: data.contract_weeks || null,
    start_date: data.start_date || null,
    description: data.description || null,
    data_source: data.data_source || "direct",
    is_active: true,
  });
  if (error) throw error;

  return { success: true };
}

// ---------------------------------------------------------------------------
// UPDATE JOB
// ---------------------------------------------------------------------------
export async function updateJob(
  jobId: string,
  data: {
    facility_id?: string;
    title?: string;
    specialty?: string;
    pay_rate_hourly?: number | null;
    stipend_housing?: number | null;
    stipend_meals?: number | null;
    contract_weeks?: number | null;
    start_date?: string | null;
    description?: string | null;
    data_source?: string;
    is_active?: boolean;
  }
) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("job_postings").update(data).eq("id", jobId);
  if (error) throw error;
  return { success: true };
}

// ---------------------------------------------------------------------------
// UPDATE FACILITY
// ---------------------------------------------------------------------------
export async function updateFacility(
  facilityId: string,
  data: {
    name?: string;
    location_city?: string | null;
    location_state?: string | null;
    type?: string | null;
    data_source?: string;
    description?: string | null;
    website?: string | null;
  }
) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("facilities").update(data).eq("id", facilityId);
  if (error) throw error;
  // Sync profile name if name changed
  if (data.name) {
    await db.from("profiles").update({ full_name: data.name }).eq("id", facilityId);
  }
  return { success: true };
}

// Get facility list for job creation dropdown
export async function getFacilityList() {
  await requireAdmin();
  const db = createAdminClient();
  const { data, error } = await db
    .from("facilities")
    .select("id, name, location_state")
    .order("name");
  if (error) throw error;
  return data || [];
}
