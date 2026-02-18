// =============================================================================
// RNTell MVP — Centralized Constants
// Single source of truth for values used across server actions & components.
// =============================================================================

/** GSA weekly benchmark used for "High Margin Risk" detection.
 *  If Weekly Gross < this value, the offer is flagged as a Market Margin Opportunity. */
export const GSA_WEEKLY_BENCHMARK = 2000;

/** Standard work-week hours for travel nurses (3 × 12-hr shifts). */
export const STANDARD_WEEKLY_HOURS = 36;

/** Nursing specialties available across the platform. */
export const SPECIALTIES = [
  "ICU",
  "ER",
  "Med-Surg",
  "L&D",
  "NICU",
  "OR",
  "Tele",
  "PCU",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

/** Default base hourly rates by specialty (used when no reported data exists). */
export const DEFAULT_HOURLY_RATES: Record<Specialty, number> = {
  ICU: 55,
  ER: 52,
  "Med-Surg": 45,
  "L&D": 50,
  NICU: 54,
  OR: 53,
  Tele: 47,
  PCU: 48,
};

/** US states for dropdowns. */
export const STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "Washington DC" },
] as const;

/** Shift types for contract analysis. */
export const SHIFT_TYPES = ["Day", "Night", "Rotating", "PRN"] as const;
