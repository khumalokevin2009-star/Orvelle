import { createHmac, timingSafeEqual } from "node:crypto";
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

export type TwilioWebhookValidationResult =
  | { ok: true }
  | { ok: false; reason: "missing_auth_token" | "missing_signature" | "invalid_signature" };

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

export function parseTwilioWebhookBody(rawBody: string) {
  const params = new URLSearchParams(rawBody);
  const parsedPayload: TwilioCallPayload = {};
  const signatureParams = new Map<string, string[]>();

  for (const [key, value] of params.entries()) {
    parsedPayload[key as keyof TwilioCallPayload] = value;

    const existingValues = signatureParams.get(key) ?? [];
    existingValues.push(value);
    signatureParams.set(key, existingValues);
  }

  return {
    parsedPayload,
    signatureParams
  };
}

function buildTwilioSignaturePayload(url: string, params: Map<string, string[]>) {
  const sortedEntries = [...params.entries()].sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey)
  );

  let signaturePayload = url;

  for (const [key, values] of sortedEntries) {
    for (const value of values) {
      signaturePayload += `${key}${value}`;
    }
  }

  return signaturePayload;
}

export function validateTwilioWebhookSignature({
  authToken,
  signature,
  url,
  params
}: {
  authToken?: string;
  signature?: string | null;
  url: string;
  params: Map<string, string[]>;
}): TwilioWebhookValidationResult {
  if (!authToken) {
    return { ok: false, reason: "missing_auth_token" };
  }

  if (!signature) {
    return { ok: false, reason: "missing_signature" };
  }

  const payload = buildTwilioSignaturePayload(url, params);
  const expectedSignature = createHmac("sha1", authToken).update(payload, "utf8").digest("base64");

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return { ok: false, reason: "invalid_signature" };
  }

  return { ok: true };
}
