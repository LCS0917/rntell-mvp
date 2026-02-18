"use server";

import { createClient } from "@/utils/supabase/server";

export type Credential = {
  id: string;
  name: string;
  type: "license" | "certification";
  issuing_body: string;
  expiry_date: string | null;
  status: "verified" | "pending" | "expired";
  uploaded_at: string;
};

// For MVP, credentials are simulated (no Supabase Storage integration yet).
// We read the nurse's verification_status and license_state to display
// a realistic credential list, and simulate upload/verify workflow.

export async function getCredentials(): Promise<{
  data: Credential[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  const { data: nurse } = await supabase
    .from("nurses")
    .select("id, specialty, license_state, license_compact, license_verified, verification_status")
    .eq("id", user.id)
    .single();

  if (!nurse) {
    return { data: [] };
  }

  // Build simulated credential list from nurse profile
  const credentials: Credential[] = [];

  if (nurse.license_state) {
    credentials.push({
      id: `license-${nurse.id}`,
      name: `RN License — ${nurse.license_state}`,
      type: "license",
      issuing_body: `${nurse.license_state} Board of Nursing`,
      expiry_date: "2026-12-31",
      status: nurse.license_verified ? "verified" : "pending",
      uploaded_at: new Date().toISOString(),
    });
  }

  if (nurse.license_compact) {
    credentials.push({
      id: `compact-${nurse.id}`,
      name: "Nurse Licensure Compact (NLC)",
      type: "license",
      issuing_body: "NCSBN",
      expiry_date: "2026-12-31",
      status: nurse.license_verified ? "verified" : "pending",
      uploaded_at: new Date().toISOString(),
    });
  }

  if (nurse.specialty) {
    credentials.push({
      id: `cert-${nurse.id}`,
      name: `${nurse.specialty} Specialty Certification`,
      type: "certification",
      issuing_body: "ANCC",
      expiry_date: "2027-06-30",
      status: nurse.verification_status === "verified" ? "verified" : "pending",
      uploaded_at: new Date().toISOString(),
    });
  }

  // Always show BLS — assumed for all nurses
  credentials.push({
    id: `bls-${nurse.id}`,
    name: "Basic Life Support (BLS)",
    type: "certification",
    issuing_body: "American Heart Association",
    expiry_date: "2026-08-15",
    status: "verified",
    uploaded_at: new Date().toISOString(),
  });

  return { data: credentials };
}

export async function uploadCredential(data: {
  name: string;
  type: "license" | "certification";
  issuing_body: string;
  expiry_date?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // MVP: Simulate upload — mark nurse verification as pending
  const { error } = await supabase
    .from("nurses")
    .update({ verification_status: "pending" })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
