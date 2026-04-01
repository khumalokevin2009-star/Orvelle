import { type CallProviderPayload } from "@/providers/types";

const defaultCallerName = "Unknown Caller";
const defaultAssignedOwner = "unassigned";
const defaultDirection = "inbound" as const;
const defaultStatus = "action_required" as const;
const defaultCurrencyCode = "GBP";

type BuildCallInsertOptions = {
  callerName?: string;
  assignedOwner?: string;
  status?: "action_required" | "under_review" | "resolved" | "escalated";
  revenueEstimate?: number;
  currencyCode?: string;
  recordingFileName?: string | null;
};

function getRecordingFileName(recordingUrl?: string, fallbackFileName?: string | null) {
  if (fallbackFileName?.trim()) {
    return fallbackFileName.trim();
  }

  if (!recordingUrl) {
    return null;
  }

  const segments = recordingUrl.split("/");
  const candidate = segments[segments.length - 1];

  return candidate?.trim() ? candidate : null;
}

export function buildCallInsertFromProviderPayload(
  payload: CallProviderPayload,
  options: BuildCallInsertOptions = {}
) {
  const startedAt = new Date(payload.timestamp);

  if (Number.isNaN(startedAt.valueOf())) {
    throw new Error(`Invalid ${payload.provider} timestamp "${payload.timestamp}".`);
  }

  const durationSeconds =
    Number.isFinite(payload.duration) && payload.duration > 0 ? Math.round(payload.duration) : 0;
  const endedAt =
    durationSeconds > 0 ? new Date(startedAt.getTime() + durationSeconds * 1000).toISOString() : null;

  return {
    external_id: payload.external_call_id,
    caller_name: options.callerName?.trim() || defaultCallerName,
    caller_phone: payload.phone_number,
    direction: defaultDirection,
    started_at: startedAt.toISOString(),
    ended_at: endedAt,
    audio_url: payload.recording_url ?? null,
    recording_filename: getRecordingFileName(payload.recording_url, options.recordingFileName),
    source_system: payload.provider,
    assigned_owner: options.assignedOwner?.trim() || defaultAssignedOwner,
    status: options.status ?? defaultStatus,
    revenue_estimate: options.revenueEstimate ?? 0,
    currency_code: options.currencyCode ?? defaultCurrencyCode
  };
}
