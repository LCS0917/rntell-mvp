// =============================================================================
// Federal Incentive Layer — Types
// Structured output types for PSLF + HRSA eligibility detection
// =============================================================================

export type EmployerType =
  | "nonprofit_501c3"
  | "government_public"
  | "for_profit"
  | "unknown";

export type EmploymentType = "W2" | "1099";

export type HpsaType = "primary_care" | "mental_health" | "dental" | "unknown";

// Input to the federal incentive engine
export type FederalIncentiveInput = {
  facility_name: string;
  facility_address?: string;
  facility_zip: string;
  facility_state: string;
  facility_ein?: string | null;
  employment_type: EmploymentType;
  contract_length_weeks: number;
};

// PSLF analysis output
export type PslfAnalysis = {
  eligible: boolean;
  employer_type: EmployerType;
  confidence_score: number; // 0.0 – 1.0
  estimated_long_term_value_flag: boolean;
  notes: string;
};

// HRSA / HPSA analysis output
export type HrsaAnalysis = {
  hpsa_designated: boolean;
  hpsa_type: HpsaType | null;
  potentially_eligible: boolean;
  confidence_score: number; // 0.0 or 1.0
  notes: string;
};

// Unified incentive layer output
export type FederalIncentiveLayer = {
  pslf: PslfAnalysis;
  hrsa: HrsaAnalysis;
  federal_strength_score: number; // 0–100
  federal_opportunity_flag: boolean;
};
