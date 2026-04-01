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
  };
  metadata: {
    eventType: TwilioWebhookEventType;
    providerEvent?: string | null;
    answered?: boolean;
    duration?: number;
    hasRecording?: boolean;
    toNumber?: string;
  };
};

type ParsedTwilioWebhookResult = {
  payload: ReturnType<typeof mapTwilioPayload>;
  rawPayload: TwilioCallPayload;
  metadata: IngestionResult["metadata"];
};

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

function getRecordingFileName(recordingUrl?: string) {
  if (!recordingUrl) {
    return null;
  }

  const lastSegment = recordingUrl.split("/").pop()?.trim();
  return lastSegment || null;
}

async function findExistingCall(supabase: SupabaseAdminClient, externalCallId: string) {
  const { data, error } = await supabase
    .from("calls")
    .select("id, audio_url, recording_filename, started_at, ended_at, caller_phone")
    .eq("external_id", externalCallId)
    .maybeSingle();

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
      }
    | null;
}

async function insertTwilioCall(
  supabase: SupabaseAdminClient,
  parsedWebhook: ParsedTwilioWebhookResult
) {
  const ingestedCall = await ingestCall(parsedWebhook.payload, {
    supabase,
    callerName: parsedWebhook.payload.phone_number,
    recordingFileName: getRecordingFileName(parsedWebhook.payload.recording_url)
  });

  if (!ingestedCall.callId) {
    throw new Error("Twilio call ingestion completed without returning a call id.");
  }

  return ingestedCall.callId;
}

async function handleCallCompleted(
  supabase: SupabaseAdminClient,
  parsedWebhook: ParsedTwilioWebhookResult
): Promise<IngestionResult> {
  const existingCall = await findExistingCall(supabase, parsedWebhook.payload.external_call_id);

  if (existingCall?.id) {
    return {
      status: 200,
      body: {
        message: "Webhook call already ingested.",
        duplicate: true,
        callId: existingCall.id
      },
      metadata: parsedWebhook.metadata
    };
  }

  const callId = await insertTwilioCall(supabase, parsedWebhook);

  return {
    status: 201,
    body: {
      message: "Webhook ingested successfully.",
      callId
    },
    metadata: parsedWebhook.metadata
  };
}

async function handleRecordingCompleted(
  supabase: SupabaseAdminClient,
  parsedWebhook: ParsedTwilioWebhookResult
): Promise<IngestionResult> {
  const existingCall = await findExistingCall(supabase, parsedWebhook.payload.external_call_id);
  const recordingUrl = parsedWebhook.payload.recording_url ?? null;
  const recordingFileName = getRecordingFileName(recordingUrl ?? undefined);

  if (!existingCall?.id) {
    const callId = await insertTwilioCall(supabase, parsedWebhook);

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
    existingCall.audio_url === recordingUrl &&
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

  const { error } = await supabase
    .from("calls")
    .update({
      caller_phone: existingCall.caller_phone ?? parsedWebhook.payload.phone_number,
      started_at: startedAt,
      ended_at: existingCall.ended_at ?? endedAt,
      audio_url: recordingUrl,
      recording_filename: recordingFileName,
      source_system: parsedWebhook.payload.provider,
      status: parsedWebhook.payload.answered ? "under_review" : "action_required"
    })
    .eq("id", existingCall.id);

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
    const payload = mapTwilioPayload(parsedPayload);

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
        toNumber: parsedPayload.To?.trim() || undefined
      }
    };
  },
  async ingest({
    supabase,
    parsedWebhook
  }: {
    supabase: SupabaseAdminClient;
    parsedWebhook: ParsedTwilioWebhookResult;
  }): Promise<IngestionResult> {
    if (parsedWebhook.metadata.eventType === "recording_completed") {
      return handleRecordingCompleted(supabase, parsedWebhook);
    }

    return handleCallCompleted(supabase, parsedWebhook);
  }
};
