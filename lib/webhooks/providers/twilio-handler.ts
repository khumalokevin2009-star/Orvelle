import { createAdminClient } from "@/lib/supabase/admin";
import { ingestCall } from "@/lib/call-ingestion";
import {
  getTwilioCallDuration,
  getTwilioWebhookEventType,
  mapTwilioPayload,
  parseTwilioWebhookBody,
  validateTwilioWebhookSignature,
  type TwilioCallPayload,
  type TwilioWebhookEventType
} from "@/providers/twilio";
import {
  getTwilioRecordingFileName,
  storeTwilioRecordingInSupabase
} from "@/lib/twilio-recordings";

type ProviderValidationResult =
  | { ok: true }
  | { ok: false; status: number; message: string; reason: string };

type IngestionResult = {
  status: number;
  body: {
    message: string;
    callId?: string | null;
    duplicate?: boolean;
    updated?: boolean;
    warning?: boolean;
  };
  metadata: {
    eventType: TwilioWebhookEventType;
    providerEvent?: string | null;
    answered?: boolean;
    duration?: number;
    hasRecording?: boolean;
    toNumber?: string;
    shouldProcess?: boolean;
    responseType?: "json" | "twiml";
  };
};

type ParsedTwilioWebhookResult = {
  payload: ReturnType<typeof mapTwilioPayload>;
  rawPayload: TwilioCallPayload;
  metadata: IngestionResult["metadata"];
};

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

async function findExistingCall(
  supabase: SupabaseAdminClient,
  externalCallId: string,
  businessId?: string | null
) {
  let query = supabase
    .from("calls")
    .select("id, audio_url, recording_filename, started_at, ended_at, caller_phone, source_system, status")
    .eq("external_id", externalCallId);

  if (businessId?.trim()) {
    query = query.eq("business_id", businessId.trim());
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data as
    | {
        id: string;
        audio_url: string | null;
        recording_filename: string | null;
        started_at: string | null;
        ended_at: string | null;
        caller_phone: string | null;
        source_system: string | null;
        status: string | null;
      }
    | null;
}

async function insertTwilioCall(
  supabase: SupabaseAdminClient,
  parsedWebhook: ParsedTwilioWebhookResult,
  businessId?: string | null
) {
  const ingestedCall = await ingestCall(parsedWebhook.payload, {
    supabase,
    businessId,
    callerName: parsedWebhook.payload.phone_number,
    recordingFileName: getTwilioRecordingFileName(parsedWebhook.payload.recording_url)
  });

  if (!ingestedCall.callId) {
    throw new Error("Twilio call ingestion completed without returning a call id.");
  }

  return ingestedCall.callId;
}

async function handleInboundVoiceRequest(
  supabase: SupabaseAdminClient,
  parsedWebhook: ParsedTwilioWebhookResult,
  businessId?: string | null
): Promise<IngestionResult> {
  const existingCall = await findExistingCall(
    supabase,
    parsedWebhook.payload.external_call_id,
    businessId
  );

  if (existingCall?.id) {
    return {
      status: 200,
      body: {
        message: "Inbound voice webhook acknowledged.",
        duplicate: true,
        callId: existingCall.id
      },
      metadata: parsedWebhook.metadata
    };
  }

  const callId = await insertTwilioCall(supabase, parsedWebhook, businessId);

  return {
    status: 201,
    body: {
      message: "Inbound voice webhook stored successfully.",
      callId
    },
    metadata: parsedWebhook.metadata
  };
}

async function handleCallCompleted(
  supabase: SupabaseAdminClient,
  parsedWebhook: ParsedTwilioWebhookResult,
  businessId?: string | null
): Promise<IngestionResult> {
  const existingCall = await findExistingCall(
    supabase,
    parsedWebhook.payload.external_call_id,
    businessId
  );

  if (!existingCall?.id) {
    const callId = await insertTwilioCall(supabase, parsedWebhook, businessId);

    return {
      status: 201,
      body: {
        message: "Webhook ingested successfully.",
        callId
      },
      metadata: parsedWebhook.metadata
    };
  }

  const startedAt = existingCall.started_at ?? parsedWebhook.payload.timestamp;
  const durationSeconds = Math.max(0, Math.round(parsedWebhook.payload.duration));
  const endedAt =
    durationSeconds > 0 ? new Date(new Date(startedAt).getTime() + durationSeconds * 1000).toISOString() : null;
  const nextStatus = parsedWebhook.payload.answered ? "under_review" : "action_required";
  const alreadyUpdated =
    existingCall.caller_phone === parsedWebhook.payload.phone_number &&
    existingCall.started_at === startedAt &&
    existingCall.ended_at === endedAt &&
    existingCall.source_system === parsedWebhook.payload.provider &&
    existingCall.status === nextStatus;

  if (alreadyUpdated) {
    return {
      status: 200,
      body: {
        message: "Completed call event already applied.",
        duplicate: true,
        callId: existingCall.id
      },
      metadata: parsedWebhook.metadata
    };
  }

  let completedCallUpdate = supabase
    .from("calls")
    .update({
      caller_phone: parsedWebhook.payload.phone_number,
      started_at: startedAt,
      ended_at: endedAt,
      source_system: parsedWebhook.payload.provider,
      status: nextStatus
    })
    .eq("id", existingCall.id);

  if (businessId?.trim()) {
    completedCallUpdate = completedCallUpdate.eq("business_id", businessId.trim());
  }

  const { error } = await completedCallUpdate;

  if (error) {
    throw error;
  }

  return {
    status: 200,
    body: {
      message: "Completed call metadata updated successfully.",
      callId: existingCall.id,
      updated: true
    },
    metadata: parsedWebhook.metadata
  };
}

async function handleRecordingCompleted(
  supabase: SupabaseAdminClient,
  parsedWebhook: ParsedTwilioWebhookResult,
  businessId?: string | null
): Promise<IngestionResult> {
  const existingCall = await findExistingCall(
    supabase,
    parsedWebhook.payload.external_call_id,
    businessId
  );
  const recordingUrl = parsedWebhook.payload.recording_url ?? null;
  const recordingFileName = getTwilioRecordingFileName(recordingUrl);

  if (!recordingUrl) {
    return {
      status: 202,
      body: {
        message: existingCall?.id
          ? "Recording event received without recording_url. Existing call kept intact while waiting for a retry."
          : "Recording event received without recording_url. Waiting for a follow-up event before attaching audio.",
        callId: existingCall?.id ?? null,
        warning: true
      },
      metadata: parsedWebhook.metadata
    };
  }

  const storedRecording = await storeTwilioRecordingInSupabase({
    supabase,
    recordingUrl,
    callSid: parsedWebhook.payload.external_call_id,
    preferredFileName: recordingFileName
  });

  if (!existingCall?.id) {
    const ingestedCall = await ingestCall(
      {
        ...parsedWebhook.payload,
        recording_url: storedRecording.audioUrl
      },
      {
        supabase,
        businessId,
        callerName: parsedWebhook.payload.phone_number,
        recordingFileName: storedRecording.recordingFileName,
        status: parsedWebhook.payload.answered ? "under_review" : "action_required"
      }
    );

    const callId = ingestedCall.callId;

    if (!callId) {
      throw new Error("Twilio recording ingestion completed without returning a call id.");
    }

    return {
      status: 201,
      body: {
        message: "Webhook ingested successfully.",
        callId
      },
      metadata: parsedWebhook.metadata
    };
  }

  const alreadyAttached =
    Boolean(existingCall.audio_url) &&
    existingCall.recording_filename === recordingFileName;

  if (alreadyAttached) {
    return {
      status: 200,
      body: {
        message: "Recording already attached to the existing call.",
        duplicate: true,
        callId: existingCall.id
      },
      metadata: parsedWebhook.metadata
    };
  }

  const startedAt = existingCall.started_at ?? parsedWebhook.payload.timestamp;
  const durationSeconds = Math.max(0, Math.round(parsedWebhook.payload.duration));
  const endedAt =
    durationSeconds > 0 ? new Date(new Date(startedAt).getTime() + durationSeconds * 1000).toISOString() : null;

  let recordingUpdate = supabase
    .from("calls")
    .update({
      caller_phone: existingCall.caller_phone ?? parsedWebhook.payload.phone_number,
      started_at: startedAt,
      ended_at: existingCall.ended_at ?? endedAt,
      audio_url: storedRecording.audioUrl,
      recording_filename: storedRecording.recordingFileName,
      source_system: parsedWebhook.payload.provider,
      status: parsedWebhook.payload.answered ? "under_review" : "action_required"
    })
    .eq("id", existingCall.id);

  if (businessId?.trim()) {
    recordingUpdate = recordingUpdate.eq("business_id", businessId.trim());
  }

  const { error } = await recordingUpdate;

  if (error) {
    throw error;
  }

  return {
    status: 200,
    body: {
      message: "Recording attached to existing call.",
      callId: existingCall.id,
      updated: true
    },
    metadata: parsedWebhook.metadata
  };
}

export const twilioWebhookHandler = {
  provider: "twilio",
  validate({
    rawBody,
    requestUrl,
    headers
  }: {
    rawBody: string;
    requestUrl: string;
    headers: Headers;
  }): ProviderValidationResult {
    const { signatureParams } = parseTwilioWebhookBody(rawBody);
    const result = validateTwilioWebhookSignature({
      authToken: process.env.TWILIO_AUTH_TOKEN,
      signature: headers.get("x-twilio-signature"),
      url: requestUrl,
      params: signatureParams
    });

    if (result.ok) {
      return result;
    }

    if (result.reason === "missing_auth_token") {
      return {
        ok: false,
        status: 503,
        reason: result.reason,
        message: "Webhook ingestion is temporarily unavailable."
      };
    }

    return {
      ok: false,
      status: 401,
      reason: result.reason,
      message: "Unauthorized webhook request."
    };
  },
  parse({
    rawBody,
    contentType
  }: {
    rawBody: string;
    contentType: string | null;
  }): ParsedTwilioWebhookResult {
    if (!contentType?.includes("application/x-www-form-urlencoded")) {
      throw new Error("Twilio webhooks must be sent as application/x-www-form-urlencoded.");
    }

    const { parsedPayload } = parseTwilioWebhookBody(rawBody);
    const eventType = getTwilioWebhookEventType(parsedPayload);
    const payload = mapTwilioPayload(parsedPayload, {
      fallbackTimestampToNow: eventType === "voice_inbound"
    });

    return {
      rawPayload: parsedPayload,
      payload,
      metadata: {
        eventType,
        providerEvent: eventType === "recording_completed"
          ? parsedPayload.RecordingStatus ?? null
          : parsedPayload.CallStatus ?? null,
        answered: payload.answered,
        duration: getTwilioCallDuration(parsedPayload),
        hasRecording: Boolean(payload.recording_url),
        toNumber: parsedPayload.To?.trim() || undefined,
        shouldProcess: eventType !== "voice_inbound",
        responseType: eventType === "voice_inbound" ? "twiml" : "json"
      }
    };
  },
  async ingest({
    supabase,
    parsedWebhook,
    businessId
  }: {
    supabase: SupabaseAdminClient;
    parsedWebhook: ParsedTwilioWebhookResult;
    businessId?: string | null;
  }): Promise<IngestionResult> {
    if (parsedWebhook.metadata.eventType === "voice_inbound") {
      return handleInboundVoiceRequest(supabase, parsedWebhook, businessId);
    }

    if (parsedWebhook.metadata.eventType === "recording_completed") {
      return handleRecordingCompleted(supabase, parsedWebhook, businessId);
    }

    return handleCallCompleted(supabase, parsedWebhook, businessId);
  }
};
