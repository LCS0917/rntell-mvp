// =============================================================================
// Federal Incentive Layer — Public Barrel Export
// =============================================================================

export { analyzeFederalIncentives } from "./engine";
export { classifyEmployer } from "./employer-classifier";
export { lookupHpsa } from "./hpsa-lookup";
export type {
  FederalIncentiveInput,
  FederalIncentiveLayer,
  PslfAnalysis,
  HrsaAnalysis,
  EmployerType,
  EmploymentType,
  HpsaType,
} from "./types";
