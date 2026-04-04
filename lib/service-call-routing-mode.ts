export type ServiceCallRoutingMode =
  | "missed_call_only_forwarding"
  | "full_call_capture";

export const defaultServiceCallRoutingMode: ServiceCallRoutingMode =
  "missed_call_only_forwarding";

export const serviceCallRoutingModeOptions: Array<{
  value: ServiceCallRoutingMode;
  label: string;
  description: string;
}> = [
  {
    value: "missed_call_only_forwarding",
    label: "Missed-call-only forwarding",
    description:
      "Twilio forwards inbound calls to your service number and only stores calls that were not answered."
  },
  {
    value: "full_call_capture",
    label: "Full call capture",
    description:
      "Twilio sits in front of your service line, records answered calls for transcripts, and still sends missed calls into recovery."
  }
];

export function normalizeServiceCallRoutingMode(
  value: string | null | undefined
): ServiceCallRoutingMode {
  return value === "full_call_capture"
    ? "full_call_capture"
    : defaultServiceCallRoutingMode;
}
