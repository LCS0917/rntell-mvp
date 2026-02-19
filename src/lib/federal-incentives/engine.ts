// =============================================================================
// Federal Incentive Engine
// Pure function module — determines PSLF + HRSA eligibility, computes
// federal_strength_score, and returns a unified FederalIncentiveLayer object.
//
// No UI. No console logging. No side effects. Structured JSON output only.
// =============================================================================

import { classifyEmployer } from "./employer-classifier";
import { lookupHpsa } from "./hpsa-lookup";
import type {
  FederalIncentiveInput,
  FederalIncentiveLayer,
  PslfAnalysis,
  HrsaAnalysis,
} from "./types";

// ---------------------------------------------------------------------------
// PSLF Eligibility Detection
// ---------------------------------------------------------------------------

function analyzePslf(input: FederalIncentiveInput): PslfAnalysis {
  // 1099 workers are automatically ineligible
  if (input.employment_type === "1099") {
    return {
      eligible: false,
      employer_type: "unknown",
      confidence_score: 0,
      estimated_long_term_value_flag: false,
      notes:
        "1099 independent contractors are not eligible for PSLF. Only W-2 employees of qualifying employers can participate.",
    };
  }

  // Classify the employer
  const classification = classifyEmployer(
    input.facility_name,
    input.facility_ein
  );

  const eligible =
    classification.employer_type === "nonprofit_501c3" ||
    classification.employer_type === "government_public";

  let notes: string;
  if (eligible) {
    notes = `Facility classified as ${classification.employer_type === "nonprofit_501c3" ? "501(c)(3) nonprofit" : "government/public employer"}. W-2 employment at this facility may count toward PSLF qualifying payments. ${classification.match_source}.`;
  } else if (classification.employer_type === "for_profit") {
    notes = `Facility classified as for-profit employer. For-profit employers do not qualify for PSLF. ${classification.match_source}.`;
  } else {
    notes = `Unable to determine employer classification. ${classification.match_source}. If you believe this facility is a nonprofit or government employer, verify with the facility's HR department.`;
  }

  return {
    eligible,
    employer_type: classification.employer_type,
    confidence_score: classification.confidence_score,
    estimated_long_term_value_flag: eligible,
    notes,
  };
}

// ---------------------------------------------------------------------------
// HRSA / HPSA Eligibility Detection
// ---------------------------------------------------------------------------

function analyzeHrsa(input: FederalIncentiveInput): HrsaAnalysis {
  // 1099 workers are automatically ineligible
  if (input.employment_type === "1099") {
    return {
      hpsa_designated: false,
      hpsa_type: null,
      potentially_eligible: false,
      confidence_score: 0,
      notes:
        "1099 independent contractors are generally not eligible for HRSA federal loan repayment programs.",
    };
  }

  const hpsa = lookupHpsa(input.facility_zip);

  if (!hpsa.designated) {
    return {
      hpsa_designated: false,
      hpsa_type: null,
      potentially_eligible: false,
      confidence_score: hpsa.confidence_score,
      notes: `${hpsa.source}. This facility does not appear to be in a Health Professional Shortage Area.`,
    };
  }

  return {
    hpsa_designated: true,
    hpsa_type: hpsa.hpsa_type,
    potentially_eligible: true,
    confidence_score: hpsa.confidence_score,
    notes: `${hpsa.source}. W-2 employees at HPSA-designated facilities may qualify for HRSA Nurse Corps Loan Repayment or similar federal loan repayment programs.`,
  };
}

// ---------------------------------------------------------------------------
// Federal Strength Score (0–100)
// ---------------------------------------------------------------------------

function computeFederalStrengthScore(
  pslf: PslfAnalysis,
  hrsa: HrsaAnalysis
): number {
  let score = 0;

  if (pslf.eligible) {
    score += 60 * pslf.confidence_score;
  }

  if (hrsa.potentially_eligible) {
    score += 40;
  }

  return Math.min(Math.round(score * 100) / 100, 100);
}

// ---------------------------------------------------------------------------
// Public API — Main entry point
// ---------------------------------------------------------------------------

/**
 * Analyze federal incentive eligibility for a given facility and employment context.
 * Returns a structured FederalIncentiveLayer with PSLF, HRSA, score, and flag.
 *
 * Pure function — no side effects, no DB calls, no external API calls.
 * Safe to call from server actions or edge functions.
 */
export function analyzeFederalIncentives(
  input: FederalIncentiveInput
): FederalIncentiveLayer {
  const pslf = analyzePslf(input);
  const hrsa = analyzeHrsa(input);
  const federalStrengthScore = computeFederalStrengthScore(pslf, hrsa);

  return {
    pslf,
    hrsa,
    federal_strength_score: federalStrengthScore,
    federal_opportunity_flag: federalStrengthScore >= 50,
  };
}
