export const runtime = "nodejs";

import { ingestCall } from "@/lib/call-ingestion";
import { appendIntegrationError } from "@/lib/integrations/error-log";
import { updateProviderConnectionState } from "@/lib/integrations/connection-status";
import { recordMonitoringEvent } from "@/lib/integrations/monitoring";
import { getMissedCallRecoverySettings } from "@/lib/missed-call-recovery-settings";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_MISSED_CALL_REVENUE_ESTIMATE = 240;
const MISSED_DIAL_STATUSES = new Set(["busy", "failed", "canceled", "no-answer", "noanswer"]);
const FALLBACK_FORWARD_NUMBER = process.env.TWILIO_VOICE_FORWARD_NUMBER?.trim() || null;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createXmlResponse(twiml: string) {
  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml"
    }
  });
}

function buildCompletionTwiml() {
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>';
}

function buildForwardDialTwiml(actionUrl: string, forwardNumber: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial action="${escapeXml(
    actionUrl
  )}" method="POST">${escapeXml(forwardNumber)}</Dial></Response>`;
}

function buildFallbackTwiml() {
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you. Your call was received. Goodbye.</Say><Hangup/></Response>';
}

function getTimestamp() {
  return new Date().toISOString();
}

function logWebhookHit(method: string, details: Record<string, string | null | undefined> = {}) {
  console.info("Twilio webhook hit", {
    method,
    timestamp: getTimestamp(),
    ...details
  });
}

function buildActionUrl(requestUrl: string) {
  const actionUrl = new URL(requestUrl);
  actionUrl.searchParams.set("dial_event", "completed");
  return actionUrl.toString();
}

function getFormValue(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value || undefined;
}

function getAccountIdentifier(requestUrl: string) {
  return new URL(requestUrl).searchParams.get("account")?.trim() || null;
}

function normalizeDialStatus(value: string | undefined) {
  return value?.toLowerCase().replace(/\s+/g, "-");
}

function isDialCallback(params: URLSearchParams, requestUrl: string) {
  return (
    Boolean(getFormValue(params, "DialCallStatus")) ||
    new URL(requestUrl).searchParams.get("dial_event") === "completed"
  );
}

function isMissedDialStatus(dialStatus: string | undefined) {
  const normalizedStatus = normalizeDialStatus(dialStatus);
  return normalizedStatus ? MISSED_DIAL_STATUSES.has(normalizedStatus) : false;
}

function getWebhookTimestamp(params: URLSearchParams) {
  const candidate =
    getFormValue(params, "Timestamp") ??
    getFormValue(params, "StartTime") ??
    getFormValue(params, "DateCreated");

  if (!candidate) {
    return getTimestamp();
  }

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.valueOf()) ? getTimestamp() : parsed.toISOString();
}

async function recordIntegrationFailure({
  accountIdentifier,
  callId,
  message,
  eventType
}: {
  accountIdentifier: string | null;
  callId?: string | null;
  message: string;
  eventType: string;
}) {
  if (!accountIdentifier) {
    return;
  }

  try {
    await updateProviderConnectionState({
      userId: accountIdentifier,
      provider: "twilio",
      accountIdentifier,
      status: "error",
      connectionHealth: "error",
      lastErrorMessage: message
    });

    await appendIntegrationError({
      userId: accountIdentifier,
      provider: "twilio",
      callId: callId ?? null,
      errorMessage: message,
      eventType
    });

    await recordMonitoringEvent({
      userId: accountIdentifier,
      provider: "twilio",
      type: "ingestion_failed",
      callId: callId ?? null,
      message
    });
  } catch (error) {
    console.warn("[twilio-voice-webhook] Failed to persist integration failure state.", {
      accountIdentifier,
      eventType,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function markIntegrationConnected(accountIdentifier: string | null, timestamp: string) {
  if (!accountIdentifier) {
    return;
  }

  try {
    await updateProviderConnectionState({
      userId: accountIdentifier,
      provider: "twilio",
      accountIdentifier,
      status: "connected",
      connectionHealth: "healthy",
      lastEventReceived: timestamp
    });
  } catch (error) {
    console.warn("[twilio-voice-webhook] Failed to update integration connection status.", {
      accountIdentifier,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function resolveForwardNumber(accountIdentifier: string | null) {
  if (accountIdentifier) {
    try {
      const settings = await getMissedCallRecoverySettings(accountIdentifier);
      const callbackNumber = settings.callbackNumber.trim();

      if (callbackNumber) {
        return callbackNumber;
      }
    } catch (error) {
      console.warn("[twilio-voice-webhook] Failed to read missed-call recovery settings for forwarding.", {
        accountIdentifier,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return FALLBACK_FORWARD_NUMBER;
}

async function persistMissedInboundCall(params: URLSearchParams, accountIdentifier: string | null) {
  const callSid = getFormValue(params, "CallSid");
  const from = getFormValue(params, "From") ?? "Unknown number";
  const to = getFormValue(params, "To") ?? FALLBACK_FORWARD_NUMBER ?? "Unknown destination";
  const dialStatus = getFormValue(params, "DialCallStatus");
  const durationValue = Number(getFormValue(params, "DialCallDuration") ?? "0");

  if (!callSid) {
    console.warn("[twilio-voice-webhook] Missed-call callback received without CallSid.", {
      from,
      to,
      dialStatus
    });
    await recordIntegrationFailure({
      accountIdentifier,
      message: "Missed-call callback was received without CallSid.",
      eventType: "voice_dial_completed"
    });
    return null;
  }

  try {
    const supabase = createAdminClient();
    const result = await ingestCall(
      {
        phone_number: from,
        timestamp: getWebhookTimestamp(params),
        duration: Number.isFinite(durationValue) ? Math.max(0, durationValue) : 0,
        answered: false,
        external_call_id: callSid,
        provider: "twilio"
      },
      {
        supabase,
        callerName: from,
        status: "action_required",
        revenueEstimate: DEFAULT_MISSED_CALL_REVENUE_ESTIMATE
      }
    );

    console.info("[twilio-voice-webhook] Missed inbound call stored.", {
      callSid,
      from,
      to,
      dialStatus,
      callId: result.callId,
      duplicate: result.duplicate,
      storedStatus: result.storedStatus
    });

    if (accountIdentifier && result.callId && !result.duplicate) {
      try {
        await recordMonitoringEvent({
          userId: accountIdentifier,
          provider: "twilio",
          type: "call_ingested",
          callId: result.callId,
          message: "Missed forwarded inbound call stored for recovery."
        });
      } catch (error) {
        console.warn("[twilio-voice-webhook] Failed to record monitoring event after missed-call ingestion.", {
          accountIdentifier,
          callId: result.callId,
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return result.callId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("[twilio-voice-webhook] Failed to persist missed inbound call.", {
      callSid,
      from,
      to,
      dialStatus,
      message
    });

    await recordIntegrationFailure({
      accountIdentifier,
      message,
      eventType: "voice_dial_completed"
    });
  }

  return null;
}

export async function GET(request: Request) {
  const accountIdentifier = getAccountIdentifier(request.url);
  logWebhookHit("GET", {
    accountIdentifier: accountIdentifier ?? undefined
  });

  const forwardNumber = await resolveForwardNumber(accountIdentifier);

  if (!forwardNumber) {
    return createXmlResponse(buildFallbackTwiml());
  }

  return createXmlResponse(buildForwardDialTwiml(buildActionUrl(request.url), forwardNumber));
}

export async function POST(request: Request) {
  const rawBody = await request.text().catch(() => "");
  const params = new URLSearchParams(rawBody);
  const accountIdentifier = getAccountIdentifier(request.url);
  const callSid = getFormValue(params, "CallSid");
  const from = getFormValue(params, "From");
  const to = getFormValue(params, "To");
  const callStatus = getFormValue(params, "CallStatus");
  const dialStatus = getFormValue(params, "DialCallStatus");
  const eventTimestamp = getWebhookTimestamp(params);

  logWebhookHit("POST", {
    accountIdentifier: accountIdentifier ?? undefined,
    callSid,
    from,
    to,
    callStatus,
    dialStatus
  });

  await markIntegrationConnected(accountIdentifier, eventTimestamp);

  if (isDialCallback(params, request.url)) {
    if (isMissedDialStatus(dialStatus)) {
      await persistMissedInboundCall(params, accountIdentifier);
    } else {
      console.info("[twilio-voice-webhook] Forwarded call completed without missed-call recovery.", {
        callSid,
        from,
        to,
        dialStatus
      });
    }

    return createXmlResponse(buildCompletionTwiml());
  }

  const forwardNumber = await resolveForwardNumber(accountIdentifier);

  if (!forwardNumber) {
    await recordIntegrationFailure({
      accountIdentifier,
      message:
        "No callback number is configured for Twilio forwarding. Save a callback number in Platform Settings to enable live forwarding.",
      eventType: "voice_inbound"
    });

    return createXmlResponse(buildFallbackTwiml());
  }

  return createXmlResponse(buildForwardDialTwiml(buildActionUrl(request.url), forwardNumber));
}
