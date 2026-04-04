export const serviceAnsweredCallOutcomeOptions = [
  { value: "booked", label: "Booked" },
  { value: "quote requested", label: "Quote Requested" },
  { value: "callback needed", label: "Callback Needed" },
  { value: "no job", label: "No Job" },
  { value: "spam", label: "Spam" }
] as const;

export type ServiceAnsweredCallOutcome = (typeof serviceAnsweredCallOutcomeOptions)[number]["value"];

export function normalizeServiceAnsweredCallOutcome(
  value?: string | null
): ServiceAnsweredCallOutcome | null {
  const normalizedValue = value?.trim().toLowerCase().replace(/[_-]+/g, " ") ?? "";

  if (!normalizedValue) {
    return null;
  }

  const match = serviceAnsweredCallOutcomeOptions.find((option) => option.value === normalizedValue);
  return match?.value ?? null;
}

export function formatServiceAnsweredCallOutcomeLabel(
  value?: string | null,
  fallback = "Outcome Not Set"
) {
  const normalizedValue = normalizeServiceAnsweredCallOutcome(value);

  if (!normalizedValue) {
    return fallback;
  }

  return serviceAnsweredCallOutcomeOptions.find((option) => option.value === normalizedValue)?.label ?? fallback;
}
