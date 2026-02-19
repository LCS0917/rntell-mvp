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
  "PACU",
  "Stepdown",
  "Psych",
  "Rehab",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

/** All specialties for the public job board filter (includes "Other"). */
export const JOB_BOARD_SPECIALTIES = [
  ...SPECIALTIES,
  "Other",
] as const;

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
  PACU: 52,
  Stepdown: 48,
  Psych: 44,
  Rehab: 43,
};

/** Contract length options for job board filter. */
export const CONTRACT_LENGTH_OPTIONS = [
  { value: "8", label: "8 weeks" },
  { value: "13", label: "13 weeks" },
  { value: "26", label: "26 weeks" },
  { value: "", label: "Any" },
] as const;

/** Start date window options. */
export const START_DATE_OPTIONS = [
  { value: "asap", label: "ASAP" },
  { value: "30", label: "Within 30 days" },
  { value: "60", label: "Within 60 days" },
  { value: "", label: "Any" },
] as const;

/** Sort options for job board. */
export const JOB_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "highest_pay", label: "Highest Pay" },
  { value: "soonest_start", label: "Soonest Start" },
] as const;

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

/** Shift type DB enum values → display labels. DB stores lowercase. */
export const SHIFT_TYPE_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "night", label: "Night" },
  { value: "rotating", label: "Rotating" },
  { value: "prn", label: "PRN" },
] as const;

/** Map DB shift_type enum to display label. */
export const SHIFT_LABELS: Record<string, string> = {
  day: "Day",
  night: "Night",
  rotating: "Rotating",
  prn: "PRN",
  travel: "Travel",
  per_diem: "Per Diem",
};
