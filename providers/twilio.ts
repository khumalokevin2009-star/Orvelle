import { type CallProviderAdapter, type CallProviderPayload } from "@/providers/types";

export type TwilioCallPayload = {
  CallSid?: string;
  From?: string;
  Timestamp?: string;
  StartTime?: string;
  CallDuration?: string | number;
  RecordingUrl?: string;
  CallStatus?: string;
  AnsweredBy?: string;
};

function parseDurationSeconds(duration: TwilioCallPayload["CallDuration"]) {
  if (typeof duration === "number" && Number.isFinite(duration)) {
    return Math.max(0, Math.round(duration));
  }

  if (typeof duration === "string" && duration.trim()) {
    const parsed = Number(duration);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }

  return 0;
}

function getTimestamp(payload: TwilioCallPayload) {
  const candidate = payload.StartTime ?? payload.Timestamp;

  if (!candidate) {
    throw new Error("Twilio payload is missing a timestamp.");
  }

  const timestamp = new Date(candidate);

  if (Number.isNaN(timestamp.valueOf())) {
    throw new Error("Twilio payload contains an invalid timestamp.");
  }

  return timestamp.toISOString();
}

function getAnsweredFlag(payload: TwilioCallPayload) {
  const normalizedStatus = payload.CallStatus?.trim().toLowerCase();

  if (normalizedStatus) {
    return ["completed", "in-progress", "in progress", "answered", "bridged"].includes(normalizedStatus);
  }

  return Boolean(payload.AnsweredBy) || parseDurationSeconds(payload.CallDuration) > 0;
}

export function mapTwilioPayload(payload: TwilioCallPayload): CallProviderPayload {
  if (!payload.CallSid?.trim()) {
    throw new Error("Twilio payload is missing CallSid.");
  }

  return {
    phone_number: payload.From?.trim() || "Unknown number",
    timestamp: getTimestamp(payload),
    duration: parseDurationSeconds(payload.CallDuration),
    answered: getAnsweredFlag(payload),
    recording_url: payload.RecordingUrl?.trim() || undefined,
    external_call_id: payload.CallSid.trim(),
    provider: "twilio"
  };
}

export const twilioProvider: CallProviderAdapter<TwilioCallPayload> = {
  provider: "twilio",
  mapToCallPayload: mapTwilioPayload
};
