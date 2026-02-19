// =============================================================================
// HPSA (Health Professional Shortage Area) Lookup
// Determines whether a ZIP code falls within a federally designated HPSA.
//
// In production, integrate the HRSA HPSA API:
//   https://data.hrsa.gov/api/hpsas
// For now, uses a curated static dataset of known HPSA ZIP codes.
// =============================================================================

import type { HpsaType } from "./types";

export type HpsaLookupResult = {
  designated: boolean;
  hpsa_type: HpsaType | null;
  confidence_score: number;
  source: string;
};

// ---------------------------------------------------------------------------
// Static HPSA dataset (curated sample)
// In production, this would be loaded from the HRSA API or a full dataset.
// These are real HPSA-designated areas covering common travel nurse markets.
// ---------------------------------------------------------------------------

type HpsaEntry = {
  type: HpsaType;
  region: string;
};

const HPSA_ZIP_MAP: Record<string, HpsaEntry> = {
  // Rural Texas
  "79901": { type: "primary_care", region: "El Paso County, TX" },
  "79902": { type: "primary_care", region: "El Paso County, TX" },
  "78840": { type: "primary_care", region: "Val Verde County, TX" },
  "78801": { type: "primary_care", region: "Uvalde County, TX" },
  "79720": { type: "primary_care", region: "Howard County, TX" },
  "79761": { type: "primary_care", region: "Ector County, TX" },
  "76301": { type: "primary_care", region: "Wichita County, TX" },
  // Rural Mississippi
  "38601": { type: "primary_care", region: "Lafayette County, MS" },
  "38834": { type: "primary_care", region: "Alcorn County, MS" },
  "39120": { type: "primary_care", region: "Adams County, MS" },
  "39401": { type: "primary_care", region: "Forrest County, MS" },
  // Rural Alabama
  "36101": { type: "primary_care", region: "Montgomery County, AL" },
  "36301": { type: "primary_care", region: "Houston County, AL" },
  "35601": { type: "primary_care", region: "Morgan County, AL" },
  "36801": { type: "primary_care", region: "Lee County, AL" },
  // Appalachia / West Virginia
  "25301": { type: "primary_care", region: "Kanawha County, WV" },
  "25701": { type: "primary_care", region: "Cabell County, WV" },
  "26003": { type: "primary_care", region: "Ohio County, WV" },
  "26501": { type: "primary_care", region: "Monongalia County, WV" },
  // Rural Georgia
  "31601": { type: "primary_care", region: "Lowndes County, GA" },
  "31501": { type: "primary_care", region: "Ware County, GA" },
  "30401": { type: "primary_care", region: "Emanuel County, GA" },
  "31701": { type: "primary_care", region: "Dougherty County, GA" },
  // Rural Louisiana
  "71201": { type: "primary_care", region: "Ouachita Parish, LA" },
  "70601": { type: "primary_care", region: "Calcasieu Parish, LA" },
  "71301": { type: "primary_care", region: "Rapides Parish, LA" },
  "71101": { type: "primary_care", region: "Caddo Parish, LA" },
  // Rural Arkansas
  "72201": { type: "primary_care", region: "Pulaski County, AR" },
  "72401": { type: "primary_care", region: "Craighead County, AR" },
  "72901": { type: "primary_care", region: "Sebastian County, AR" },
  // Mental health shortage areas
  "59601": { type: "mental_health", region: "Lewis and Clark County, MT" },
  "59701": { type: "mental_health", region: "Silver Bow County, MT" },
  "59801": { type: "mental_health", region: "Missoula County, MT" },
  "82001": { type: "mental_health", region: "Laramie County, WY" },
  "82601": { type: "mental_health", region: "Natrona County, WY" },
  "57401": { type: "mental_health", region: "Brown County, SD" },
  "57701": { type: "mental_health", region: "Pennington County, SD" },
  "58501": { type: "mental_health", region: "Burleigh County, ND" },
  "58201": { type: "mental_health", region: "Grand Forks County, ND" },
  // Rural New Mexico
  "88001": { type: "primary_care", region: "Dona Ana County, NM" },
  "87501": { type: "primary_care", region: "Santa Fe County, NM" },
  "88201": { type: "primary_care", region: "Chaves County, NM" },
  "87301": { type: "primary_care", region: "McKinley County, NM" },
  // Rural Arizona
  "86001": { type: "primary_care", region: "Coconino County, AZ" },
  "85901": { type: "primary_care", region: "Navajo County, AZ" },
  "85501": { type: "primary_care", region: "Gila County, AZ" },
  "86301": { type: "primary_care", region: "Yavapai County, AZ" },
  // Rural South Carolina
  "29501": { type: "primary_care", region: "Florence County, SC" },
  "29801": { type: "primary_care", region: "Aiken County, SC" },
  "29150": { type: "primary_care", region: "Sumter County, SC" },
  // Rural Oklahoma
  "74401": { type: "primary_care", region: "Muskogee County, OK" },
  "73501": { type: "primary_care", region: "Comanche County, OK" },
  "74601": { type: "primary_care", region: "Kay County, OK" },
  "74701": { type: "primary_care", region: "Pittsburg County, OK" },
  // Rural Kentucky
  "40701": { type: "primary_care", region: "Laurel County, KY" },
  "41501": { type: "primary_care", region: "Pike County, KY" },
  "42001": { type: "primary_care", region: "McCracken County, KY" },
  "42101": { type: "primary_care", region: "Warren County, KY" },
  // Alaska
  "99501": { type: "primary_care", region: "Anchorage, AK" },
  "99701": { type: "primary_care", region: "Fairbanks North Star, AK" },
  "99801": { type: "primary_care", region: "Juneau, AK" },
  "99901": { type: "primary_care", region: "Ketchikan, AK" },
  // Hawaii (rural areas)
  "96720": { type: "primary_care", region: "Hawaii County, HI" },
  "96768": { type: "primary_care", region: "Maui County, HI" },
  // Dental shortage areas (selected)
  "39530": { type: "dental", region: "Leflore County, MS" },
  "38921": { type: "dental", region: "Grenada County, MS" },
  "71801": { type: "dental", region: "Miller County, AR" },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up whether a ZIP code is in a federally designated HPSA.
 * Returns designation status, type, and confidence.
 */
export function lookupHpsa(facilityZip: string): HpsaLookupResult {
  if (!facilityZip || facilityZip.trim().length < 5) {
    return {
      designated: false,
      hpsa_type: null,
      confidence_score: 0,
      source: "Invalid or missing ZIP code",
    };
  }

  const zip = facilityZip.trim().slice(0, 5);
  const entry = HPSA_ZIP_MAP[zip];

  if (entry) {
    return {
      designated: true,
      hpsa_type: entry.type,
      confidence_score: 1.0,
      source: `ZIP ${zip} matched HPSA designation: ${entry.region}`,
    };
  }

  return {
    designated: false,
    hpsa_type: null,
    confidence_score: 1.0,
    source: `ZIP ${zip} not found in HPSA dataset`,
  };
}
