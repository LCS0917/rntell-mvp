// =============================================================================
// Employer Classification Resolver
// Determines whether a facility is nonprofit, government, or for-profit
// using EIN lookup + name/pattern matching against known registries.
// =============================================================================

import type { EmployerType } from "./types";

export type ClassificationResult = {
  employer_type: EmployerType;
  confidence_score: number; // 0.0 – 1.0
  match_source: string;
};

// ---------------------------------------------------------------------------
// Known nonprofit hospital systems (name fragments, lowercased)
// These are large, well-known 501(c)(3) health systems.
// ---------------------------------------------------------------------------
const KNOWN_NONPROFIT_SYSTEMS: string[] = [
  "kaiser permanente",
  "ascension",
  "commonspirit",
  "providence",
  "trinity health",
  "advocate aurora",
  "atrium health",
  "bon secours mercy",
  "intermountain",
  "northwell health",
  "nyu langone",
  "mount sinai",
  "cleveland clinic",
  "mayo clinic",
  "johns hopkins",
  "cedars-sinai",
  "memorial sloan",
  "mass general",
  "brigham and women",
  "stanford health",
  "ucsf health",
  "rush university",
  "beaumont health",
  "geisinger",
  "ochsner health",
  "sentara",
  "baptist health",
  "methodist",
  "st. luke",
  "st luke",
  "st. joseph",
  "st joseph",
  "st. mary",
  "st mary",
  "mercy health",
  "mercy hospital",
  "sacred heart",
  "good samaritan",
  "adventhealth",
  "adventist health",
  "sutter health",
  "dignity health",
  "christus health",
  "ssm health",
  "spectrum health",
  "wellstar",
  "hackensack meridian",
  "children's hospital",
  "childrens hospital",
  "shriners",
  "novant health",
  "ballad health",
  "carilion",
  "piedmont healthcare",
  "sanford health",
  "gundersen",
  "marshfield clinic",
  "fairview health",
  "aurora health",
  "froedtert",
];

// ---------------------------------------------------------------------------
// Government / public facility name patterns
// ---------------------------------------------------------------------------
const GOVERNMENT_PATTERNS: RegExp[] = [
  /\bva\b/i,
  /\bveterans?\s*(affairs|administration|medical|health)\b/i,
  /\bcounty\s+(hospital|medical|health|regional)\b/i,
  /\bpublic\s+health\b/i,
  /\bstate\s+(hospital|medical)\b/i,
  /\bcity\s+(hospital|medical)\b/i,
  /\bmunicipal\b/i,
  /\btribal\s+(health|hospital|medical)\b/i,
  /\bindian\s+health\s+service\b/i,
  /\bihs\b/i,
  /\bmilitary\b/i,
  /\bnaval\s+(hospital|medical)\b/i,
  /\barmy\s+(hospital|medical)\b/i,
  /\bair\s+force\s+(hospital|medical)\b/i,
  /\bfederal\s+(medical|hospital|health)\b/i,
  /\bgrady\s+memorial\b/i,
  /\bjackson\s+memorial\b/i,
  /\bbellevue\b/i,
  /\bparkland\b/i,
  /\bcook\s+county\b/i,
  /\bharborview\b/i,
  /\buniversity\s+(of\s+)?\w+\s+(hospital|medical|health)\b/i,
];

// ---------------------------------------------------------------------------
// For-profit chain patterns
// ---------------------------------------------------------------------------
const FOR_PROFIT_SYSTEMS: string[] = [
  "hca healthcare",
  "hca ",
  "tenet healthcare",
  "tenet ",
  "community health systems",
  "chs ",
  "universal health services",
  "uhs ",
  "lifepoint health",
  "ardent health",
  "prime healthcare",
  "steward health",
  "quorum health",
  "acadia healthcare",
  "encompass health",
  "kindred",
  "select medical",
  "surgery partners",
  "uspi",
  "united surgical partners",
  "davita",
  "fresenius",
];

// ---------------------------------------------------------------------------
// Known nonprofit EINs (mock stub — in production, integrate IRS Exempt Org API)
// These are real EINs for major nonprofit health systems.
// ---------------------------------------------------------------------------
const KNOWN_NONPROFIT_EINS: Set<string> = new Set([
  "941156621", // Kaiser Foundation Hospitals
  "351544450", // Ascension Health
  "462745937", // CommonSpirit Health
  "910565577", // Providence Health
  "383480038", // Trinity Health
  "362170833", // Advocate Aurora
  "561684865", // Atrium Health
  "341846431", // Cleveland Clinic
  "410774237", // Mayo Clinic
  "521236800", // Johns Hopkins Health
  "953644600", // Cedars-Sinai
  "131624090", // Memorial Sloan Kettering
  "042697983", // Mass General Brigham
  "941196203", // Stanford Health Care
  "941156473", // UCSF Medical Center
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a facility as nonprofit, government, or for-profit.
 * Returns employer_type, confidence_score, and the source of the match.
 */
export function classifyEmployer(
  facilityName: string,
  facilityEin?: string | null
): ClassificationResult {
  // 1. EIN-based lookup (highest confidence)
  if (facilityEin) {
    const cleanEin = facilityEin.replace(/\D/g, "");
    if (KNOWN_NONPROFIT_EINS.has(cleanEin)) {
      return {
        employer_type: "nonprofit_501c3",
        confidence_score: 1.0,
        match_source: `EIN ${cleanEin} confirmed 501(c)(3)`,
      };
    }
  }

  const nameLower = facilityName.toLowerCase().trim();

  // 2. Government pattern matching (high confidence)
  for (const pattern of GOVERNMENT_PATTERNS) {
    if (pattern.test(nameLower)) {
      return {
        employer_type: "government_public",
        confidence_score: 0.8,
        match_source: `Name matched government pattern: ${pattern.source}`,
      };
    }
  }

  // 3. Known nonprofit system matching (high confidence)
  for (const system of KNOWN_NONPROFIT_SYSTEMS) {
    if (nameLower.includes(system)) {
      return {
        employer_type: "nonprofit_501c3",
        confidence_score: 0.9,
        match_source: `Matched known nonprofit system: ${system}`,
      };
    }
  }

  // 4. For-profit chain matching
  for (const chain of FOR_PROFIT_SYSTEMS) {
    if (nameLower.includes(chain)) {
      return {
        employer_type: "for_profit",
        confidence_score: 0.9,
        match_source: `Matched known for-profit chain: ${chain}`,
      };
    }
  }

  // 5. Heuristic: "nonprofit" or "501c3" in name
  if (
    nameLower.includes("nonprofit") ||
    nameLower.includes("non-profit") ||
    nameLower.includes("501(c)(3)") ||
    nameLower.includes("501c3")
  ) {
    return {
      employer_type: "nonprofit_501c3",
      confidence_score: 0.4,
      match_source: "Name contains nonprofit indicator (low confidence)",
    };
  }

  // 6. Heuristic: "community" + "hospital/health" often nonprofit
  if (
    nameLower.includes("community") &&
    (nameLower.includes("hospital") || nameLower.includes("health"))
  ) {
    return {
      employer_type: "nonprofit_501c3",
      confidence_score: 0.4,
      match_source:
        "Name pattern 'community hospital/health' suggests nonprofit (low confidence)",
    };
  }

  // 7. Unknown
  return {
    employer_type: "unknown",
    confidence_score: 0,
    match_source: "Could not classify facility",
  };
}
