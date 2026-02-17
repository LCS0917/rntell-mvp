"use server";

import { createClient } from "@/utils/supabase/server";

export type SocialProfile = {
  social_style: "ghost" | "friendly" | "community";
  cleanliness: number;
  pet_policy: string;
  target_cities: string[];
};

export type RoommateMatch = {
  nurse_id: string;
  specialty: string | null;
  social_style: string | null;
  target_cities: string[];
  pet_policy: string;
  compatibility_score: number;
  match_reasons: string[];
};

export async function getSocialProfile(): Promise<{
  data: SocialProfile | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("nurses")
    .select("social_style, travel_preferences, has_pets")
    .eq("id", user.id)
    .single();

  if (error) {
    // No nurse row yet — return null so the form shows empty
    if (error.code === "PGRST116") return { data: null };
    return { data: null, error: error.message };
  }

  const prefs = (data.travel_preferences ?? {}) as Record<string, unknown>;

  return {
    data: {
      social_style: data.social_style ?? "friendly",
      cleanliness: (prefs.cleanliness as number) ?? 3,
      pet_policy: data.has_pets
        ? "has_pets"
        : (prefs.pet_policy as string) ?? "none",
      target_cities: (prefs.target_cities as string[]) ?? [],
    },
  };
}

export async function saveSocialProfile(profile: SocialProfile) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Try update first, then upsert if no row exists
  const { error } = await supabase
    .from("nurses")
    .upsert(
      {
        id: user.id,
        social_style: profile.social_style,
        has_pets: profile.pet_policy === "has_pets",
        travel_preferences: {
          target_cities: profile.target_cities,
          cleanliness: profile.cleanliness,
          pet_policy: profile.pet_policy,
        },
      },
      { onConflict: "id" }
    );

  if (error) return { error: error.message };
  return { success: true };
}

export async function findRoommates(): Promise<{
  data: RoommateMatch[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  // Get current user's profile
  const { data: me, error: meError } = await supabase
    .from("nurses")
    .select("id, specialty, social_style, has_pets, travel_preferences")
    .eq("id", user.id)
    .single();

  if (meError || !me) {
    return { data: [], error: "Set up your social profile first." };
  }

  const myPrefs = (me.travel_preferences ?? {}) as Record<string, unknown>;
  const myCities = (myPrefs.target_cities as string[]) ?? [];
  const myCleanliness = (myPrefs.cleanliness as number) ?? 3;
  const myPetPolicy = (myPrefs.pet_policy as string) ?? "none";

  // Fetch all other nurses
  const { data: nurses, error: nursesError } = await supabase
    .from("nurses")
    .select("id, specialty, social_style, has_pets, travel_preferences")
    .neq("id", user.id);

  if (nursesError) return { data: [], error: nursesError.message };
  if (!nurses || nurses.length === 0) return { data: [] };

  // Score each nurse
  const scored: RoommateMatch[] = nurses.map((nurse) => {
    let score = 0;
    const reasons: string[] = [];
    const prefs = (nurse.travel_preferences ?? {}) as Record<string, unknown>;
    const theirCities = (prefs.target_cities as string[]) ?? [];
    const theirCleanliness = (prefs.cleanliness as number) ?? 3;
    const theirPetPolicy = (prefs.pet_policy as string) ?? "none";

    // +10 for each shared target city
    const sharedCities = myCities.filter((c) => theirCities.includes(c));
    if (sharedCities.length > 0) {
      score += 10 * sharedCities.length;
      reasons.push(`Same city: ${sharedCities.join(", ")}`);
    }

    // +5 for same social style
    if (me.social_style && me.social_style === nurse.social_style) {
      score += 5;
      reasons.push("Same social style");
    }

    // +5 for compatible pet policy
    const petCompatible =
      myPetPolicy === theirPetPolicy ||
      (myPetPolicy === "ok_with_pets" && theirPetPolicy === "has_pets") ||
      (myPetPolicy === "has_pets" && theirPetPolicy === "ok_with_pets") ||
      (myPetPolicy === "ok_with_pets" && theirPetPolicy === "ok_with_pets");
    if (petCompatible) {
      score += 5;
      reasons.push("Pet-compatible");
    }

    // +3 for similar cleanliness (within 1 level)
    if (Math.abs(myCleanliness - theirCleanliness) <= 1) {
      score += 3;
      reasons.push("Similar cleanliness");
    }

    // +2 for same specialty (nice-to-have)
    if (me.specialty && me.specialty === nurse.specialty) {
      score += 2;
      reasons.push("Same specialty");
    }

    return {
      nurse_id: nurse.id,
      specialty: nurse.specialty,
      social_style: nurse.social_style,
      target_cities: theirCities,
      pet_policy: theirPetPolicy,
      compatibility_score: score,
      match_reasons: reasons,
    };
  });

  // Sort by score descending, filter out zero-score matches
  const matches = scored
    .filter((m) => m.compatibility_score > 0)
    .sort((a, b) => b.compatibility_score - a.compatibility_score);

  // Normalize scores to percentage (max possible = ~35 for a perfect match)
  const maxScore = Math.max(35, ...matches.map((m) => m.compatibility_score));
  for (const m of matches) {
    m.compatibility_score = Math.round((m.compatibility_score / maxScore) * 100);
  }

  return { data: matches };
}

export async function sendConnectRequest(targetNurseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check for existing match in either direction
  const { data: existing } = await supabase
    .from("rn_matches")
    .select("id, status, nurse_a_id")
    .or(
      `and(nurse_a_id.eq.${user.id},nurse_b_id.eq.${targetNurseId}),and(nurse_a_id.eq.${targetNurseId},nurse_b_id.eq.${user.id})`
    )
    .limit(1)
    .maybeSingle();

  if (existing) {
    // If the other nurse already sent a request, upgrade to "matched"
    if (
      existing.status === "liked" &&
      existing.nurse_a_id === targetNurseId
    ) {
      const { error } = await supabase
        .from("rn_matches")
        .update({ status: "matched" })
        .eq("id", existing.id);
      if (error) return { error: error.message };
      return { success: true, matched: true };
    }
    return { error: "Connection already exists" };
  }

  const { error } = await supabase.from("rn_matches").insert({
    nurse_a_id: user.id,
    nurse_b_id: targetNurseId,
    status: "liked",
    match_reasons: [],
  });

  if (error) return { error: error.message };
  return { success: true, matched: false };
}
