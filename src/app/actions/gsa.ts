"use server";

// =============================================================================
// GSA Per Diem Rate Lookup
// Fetches lodging + meals rates from the GSA API for a given city/state.
// Used by the contract analysis engine to benchmark nurse offers against market.
// =============================================================================

const GSA_API_BASE = "https://api.gsa.gov/travel/perdiem/v2/rates";
const GSA_FISCAL_YEAR = 2025;

// Federal standard fallback rates (FY2024/2025)
const FEDERAL_STANDARD_LODGING = 107; // $/night
const FEDERAL_STANDARD_MEALS = 59; // $/day

export type GsaRates = {
  lodging_nightly: number;
  meals_daily: number;
  weekly_housing: number; // lodging_nightly × 7
  weekly_meals: number; // meals_daily × 7
  weekly_total: number; // weekly_housing + weekly_meals
  source: "city" | "state_standard" | "federal_standard";
  city_returned: string;
  state: string;
};

export async function getGsaRates(
  city: string,
  state: string,
  month?: number // 1-12; uses current month if not provided
): Promise<GsaRates> {
  const apiKey = process.env.GSA_API_KEY;
  if (!apiKey) {
    console.error("GSA_API_KEY not set — using federal standard rates");
    return buildFederalFallback(state);
  }

  const targetMonth = month ?? new Date().getMonth() + 1; // JS months are 0-indexed

  // Try city-specific lookup first
  try {
    const encodedCity = encodeURIComponent(city);
    const url = `${GSA_API_BASE}/city/${encodedCity}/state/${state}/year/${GSA_FISCAL_YEAR}?api_key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h

    if (!res.ok) {
      console.error(`GSA API error: ${res.status} for ${city}, ${state}`);
      return buildFederalFallback(state);
    }

    const data = await res.json();
    const rates = data?.rates?.[0]?.rate;

    if (!rates || rates.length === 0) {
      return buildFederalFallback(state);
    }

    // The API returns one rate entry per matching location.
    // If the city isn't found, it returns the state standard rate
    // with city = "Standard Rate".
    const rate = rates[0];
    const months = rate.months?.month;
    const monthData = months?.find((m: { number: number }) => m.number === targetMonth);
    const lodging = monthData?.value ?? FEDERAL_STANDARD_LODGING;
    const meals = rate.meals ?? FEDERAL_STANDARD_MEALS;

    const isStandardRate = rate.city === "Standard Rate";
    const source: GsaRates["source"] = isStandardRate ? "state_standard" : "city";

    return {
      lodging_nightly: lodging,
      meals_daily: meals,
      weekly_housing: lodging * 7,
      weekly_meals: meals * 7,
      weekly_total: lodging * 7 + meals * 7,
      source,
      city_returned: isStandardRate ? `${state} Standard` : rate.city,
      state,
    };
  } catch (err) {
    console.error("GSA API fetch failed:", err);
    return buildFederalFallback(state);
  }
}

function buildFederalFallback(state: string): GsaRates {
  return {
    lodging_nightly: FEDERAL_STANDARD_LODGING,
    meals_daily: FEDERAL_STANDARD_MEALS,
    weekly_housing: FEDERAL_STANDARD_LODGING * 7,
    weekly_meals: FEDERAL_STANDARD_MEALS * 7,
    weekly_total: (FEDERAL_STANDARD_LODGING + FEDERAL_STANDARD_MEALS) * 7,
    source: "federal_standard",
    city_returned: "Federal Standard",
    state,
  };
}
