import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { type CallProviderPayload } from "@/providers/types";

const defaultCallerName = "Unknown Caller";
const defaultAssignedOwner = "unassigned";
const defaultDirection = "inbound" as const;
const normalizedDefaultStatus = "uploaded" as const;
const fallbackDatabaseStatus = "action_required" as const;
const defaultCurrencyCode = "GBP";

type BuildCallInsertOptions = {
  userId?: string | null;
  businessId?: string | null;
  callerName?: string;
  assignedOwner?: string;
  status?: "uploaded" | "action_required" | "under_review" | "resolved" | "escalated";
  revenueEstimate?: number;
  currencyCode?: string;
  recordingFileName?: string | null;
};

export type NormalizedCallRecord = {
  user_id: string | null;
  provider: string;
  phone_number: string;
  timestamp: string;
  duration: number;
  answered: boolean;
  recording_url?: string;
  external_call_id: string;
  status: "uploaded";
};

export type IngestCallResult = {
  status: "created" | "duplicate";
  duplicate: boolean;
  callId: string | null;
  storedStatus: "uploaded" | "action_required" | "under_review" | "resolved" | "escalated";
  normalizedCall: NormalizedCallRecord;
};

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

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

export function buildNormalizedCallRecord(
  payload: CallProviderPayload,
  options: Pick<BuildCallInsertOptions, "userId"> = {}
): NormalizedCallRecord {
  const timestamp = new Date(payload.timestamp);

  if (Number.isNaN(timestamp.valueOf())) {
    throw new Error(`Invalid ${payload.provider} timestamp "${payload.timestamp}".`);
  }

  if (!payload.external_call_id?.trim()) {
    throw new Error(`Missing external_call_id for provider "${payload.provider}".`);
  }

  return {
    user_id: options.userId ?? null,
    provider: payload.provider,
    phone_number: payload.phone_number,
    timestamp: timestamp.toISOString(),
    duration:
      Number.isFinite(payload.duration) && payload.duration > 0 ? Math.round(payload.duration) : 0,
    answered: Boolean(payload.answered),
    recording_url: payload.recording_url?.trim() || undefined,
    external_call_id: payload.external_call_id.trim(),
    status: normalizedDefaultStatus
  };
}

function buildCallInsertFromNormalizedRecord(
  record: NormalizedCallRecord,
  options: Omit<BuildCallInsertOptions, "userId" | "status"> & {
    databaseStatus?: BuildCallInsertOptions["status"];
  } = {}
) {
  const startedAt = new Date(record.timestamp);
  const endedAt =
    record.duration > 0
      ? new Date(startedAt.getTime() + record.duration * 1000).toISOString()
      : null;

  return {
    business_id: options.businessId?.trim() || null,
    external_id: record.external_call_id,
    caller_name: options.callerName?.trim() || defaultCallerName,
    caller_phone: record.phone_number,
    direction: defaultDirection,
    started_at: startedAt.toISOString(),
    ended_at: endedAt,
    audio_url: record.recording_url ?? null,
    recording_filename: getRecordingFileName(record.recording_url, options.recordingFileName),
    source_system: record.provider,
    assigned_owner: options.assignedOwner?.trim() || defaultAssignedOwner,
    status: options.databaseStatus ?? record.status,
    revenue_estimate: options.revenueEstimate ?? 0,
    currency_code: options.currencyCode ?? defaultCurrencyCode
  };
}

function isUploadedStatusConstraintError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("status") && message.includes("uploaded");
}

export function buildCallInsertFromProviderPayload(
  payload: CallProviderPayload,
  options: BuildCallInsertOptions = {}
) {
  const normalized = buildNormalizedCallRecord(payload, {
    userId: options.userId
  });

  return buildCallInsertFromNormalizedRecord(normalized, {
    callerName: options.callerName,
    assignedOwner: options.assignedOwner,
    databaseStatus: options.status,
    revenueEstimate: options.revenueEstimate,
    currencyCode: options.currencyCode,
    recordingFileName: options.recordingFileName,
    businessId: options.businessId
  });
}

async function fetchExistingCallId(
  supabase: SupabaseAdminClient,
  externalCallId: string,
  businessId?: string | null
) {
  let query = supabase.from("calls").select("id").eq("external_id", externalCallId);

  if (businessId?.trim()) {
    query = query.eq("business_id", businessId.trim());
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.id as string | undefined) ?? null;
}

async function insertNormalizedCall(
  supabase: SupabaseAdminClient,
  normalizedCall: NormalizedCallRecord,
  options: BuildCallInsertOptions
) {
  const preferredInsertPayload = buildCallInsertFromNormalizedRecord(normalizedCall, {
    callerName: options.callerName,
    assignedOwner: options.assignedOwner,
    databaseStatus: options.status ?? normalizedCall.status,
    revenueEstimate: options.revenueEstimate,
    currencyCode: options.currencyCode,
    recordingFileName: options.recordingFileName,
    businessId: options.businessId
  });

  const attemptInsert = async (payload: ReturnType<typeof buildCallInsertFromNormalizedRecord>) =>
    supabase.from("calls").insert(payload).select("id").single();

  let { data, error } = await attemptInsert(preferredInsertPayload);

  if (error && isUploadedStatusConstraintError(error)) {
    console.warn("[call-ingestion] Falling back to legacy database status mapping for uploaded call.", {
      externalCallId: normalizedCall.external_call_id,
      provider: normalizedCall.provider
    });

    const fallbackInsertPayload = buildCallInsertFromNormalizedRecord(normalizedCall, {
      callerName: options.callerName,
      assignedOwner: options.assignedOwner,
      databaseStatus: fallbackDatabaseStatus,
      revenueEstimate: options.revenueEstimate,
      currencyCode: options.currencyCode,
      recordingFileName: options.recordingFileName,
      businessId: options.businessId
    });

    ({ data, error } = await attemptInsert(fallbackInsertPayload));

    if (!error && data?.id) {
      return {
        callId: data.id as string,
        storedStatus: fallbackDatabaseStatus
      };
    }
  }

  if (error) {
    throw error;
  }

  return {
    callId: data?.id as string,
    storedStatus: (preferredInsertPayload.status as IngestCallResult["storedStatus"]) ?? normalizedCall.status
  };
}

export async function ingestCall(
  payload: CallProviderPayload,
  options: BuildCallInsertOptions & {
    supabase?: SupabaseAdminClient;
  } = {}
): Promise<IngestCallResult> {
  const normalizedCall = buildNormalizedCallRecord(payload, {
    userId: options.userId
  });

  const supabase = options.supabase ?? createAdminClient();

  try {
    const existingCallId = await fetchExistingCallId(
      supabase,
      normalizedCall.external_call_id,
      options.businessId
    );

    if (existingCallId) {
      console.info("[call-ingestion] Duplicate call ignored.", {
        externalCallId: normalizedCall.external_call_id,
        provider: normalizedCall.provider,
        callId: existingCallId
      });

      return {
        status: "duplicate",
        duplicate: true,
        callId: existingCallId,
        storedStatus: normalizedCall.status,
        normalizedCall
      };
    }

    const inserted = await insertNormalizedCall(supabase, normalizedCall, options);

    console.info("[call-ingestion] Call ingested successfully.", {
      externalCallId: normalizedCall.external_call_id,
      provider: normalizedCall.provider,
      callId: inserted.callId,
      storedStatus: inserted.storedStatus
    });

    return {
      status: "created",
      duplicate: false,
      callId: inserted.callId,
      storedStatus: inserted.storedStatus,
      normalizedCall
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected call ingestion failure.";

    console.error("[call-ingestion] Call ingestion failed.", {
      externalCallId: normalizedCall.external_call_id,
      provider: normalizedCall.provider,
      message
    });

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      const callId = await fetchExistingCallId(
        supabase,
        normalizedCall.external_call_id,
        options.businessId
      );

      return {
        status: "duplicate",
        duplicate: true,
        callId,
        storedStatus: normalizedCall.status,
        normalizedCall
      };
    }

    throw error;
  }
}
