export const solutionModeValues = [
  "service_business_missed_call_recovery",
  "call_performance_revenue_recovery"
] as const;

export type SolutionMode = (typeof solutionModeValues)[number];

export const businessVerticalValues = [
  "hvac",
  "plumbing",
  "electrical",
  "dental",
  "cosmetic_clinic",
  "legal_intake",
  "call_centre",
  "other"
] as const;

export type BusinessVertical = (typeof businessVerticalValues)[number];

export const defaultSolutionMode: SolutionMode = "service_business_missed_call_recovery";
export const defaultBusinessVertical: BusinessVertical = "hvac";

export const solutionModeOptions: Array<{
  value: SolutionMode;
  label: string;
  description: string;
}> = [
  {
    value: "service_business_missed_call_recovery",
    label: "Service Businesses / Missed Call Recovery",
    description: "Use service-business messaging, callback workflows, and missed-call recovery presets."
  },
  {
    value: "call_performance_revenue_recovery",
    label: "Call Performance / Revenue Recovery",
    description: "Use broader call performance and revenue recovery positioning across the platform."
  }
];

export const businessVerticalOptions: Array<{
  value: BusinessVertical;
  label: string;
}> = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "dental", label: "Dental" },
  { value: "cosmetic_clinic", label: "Cosmetic Clinic" },
  { value: "legal_intake", label: "Legal Intake" },
  { value: "call_centre", label: "Call Centre" },
  { value: "other", label: "Other" }
];

export function normalizeSolutionMode(input?: string | null): SolutionMode {
  return solutionModeValues.includes(input as SolutionMode)
    ? (input as SolutionMode)
    : defaultSolutionMode;
}

export function normalizeBusinessVertical(input?: string | null): BusinessVertical {
  return businessVerticalValues.includes(input as BusinessVertical)
    ? (input as BusinessVertical)
    : defaultBusinessVertical;
}
