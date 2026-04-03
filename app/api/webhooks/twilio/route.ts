export const runtime = "nodejs";

import {
  callsSelectFields,
  mapSupabaseCallToDashboardRow,
  type SupabaseCallRecord
} from "@/lib/dashboard-calls";
import { ingestCall } from "@/lib/call-ingestion";
import { appendIntegrationError } from "@/lib/integrations/error-log";
import { updateProviderConnectionState } from "@/lib/integrations/connection-status";
import { recordMonitoringEvent } from "@/lib/integrations/monitoring";
import { getMissedCallRecoverySettings } from "@/lib/missed-call-recovery-settings";
import { sendFollowUpForCall } from "@/lib/follow-up-sms";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_MISSED_CALL_REVENUE_ESTIMATE = 240;
const MISSED_DIAL_STATUSES = new Set(["busy", "failed", "canceled", "no-answer", "noanswer"]);
const SUCCESSFUL_DIAL_STATUSES = new Set(["completed", "answered"]);
const FALLBACK_FORWARD_NUMBER = process.env.TWILIO_VOICE_FORWARD_NUMBER?.trim() || null;
const UK_DEFAULT_COUNTRY_CODE = "+44";

type ForwardTargetResolution =
  | {
      ok: true;
      number: string;
      source: "settings" | "env";
    }
  | {
      ok: false;
      reason:
        | "missing_account_identifier"
        | "settings_lookup_failed"
        | "missing_callback_number"
        | "invalid_callback_number"
        | "invalid_env_fallback"
        | "missing_forward_number";
      message: string;
    };

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

function normalizeTwilioDialNumber(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const compact = value.trim().replace(/[()\s-]+/g, "");

  if (compact.startsWith("00")) {
    const normalized = `+${compact.slice(2)}`;
    return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
  }

  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  if (/^0\d{9,10}$/.test(compact)) {
    const normalized = `${UK_DEFAULT_COUNTRY_CODE}${compact.slice(1)}`;
    return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
  }

  return null;
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

function isSuccessfulDialStatus(dialStatus: string | undefined) {
  const normalizedStatus = normalizeDialStatus(dialStatus);
  return normalizedStatus ? SUCCESSFUL_DIAL_STATUSES.has(normalizedStatus) : false;
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

async function resolveForwardTarget(accountIdentifier: string | null): Promise<ForwardTargetResolution> {
  if (accountIdentifier) {
    console.info("[twilio-voice-webhook] Account resolved for inbound voice webhook.", {
      accountIdentifier
    });

    try {
      const settings = await getMissedCallRecoverySettings(accountIdentifier);
      const callbackNumber = settings.callbackNumber.trim();

      if (callbackNumber) {
        const normalizedCallbackNumber = normalizeTwilioDialNumber(callbackNumber);

        if (normalizedCallbackNumber) {
          console.info("[twilio-voice-webhook] Callback number loaded from missed-call recovery settings.", {
            accountIdentifier,
            source: "settings",
            callbackNumber: normalizedCallbackNumber
          });

          return {
            ok: true,
            number: normalizedCallbackNumber,
            source: "settings"
          };
        }

        console.warn("[twilio-voice-webhook] Saved callback number is invalid for Twilio dialing.", {
          accountIdentifier,
          source: "settings",
          callbackNumber
        });
      } else {
        console.warn("[twilio-voice-webhook] No saved callback number found in missed-call recovery settings.", {
          accountIdentifier
        });
      }
    } catch (error) {
      console.warn("[twilio-voice-webhook] Failed to read missed-call recovery settings for forwarding.", {
        accountIdentifier,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  } else {
    console.warn("[twilio-voice-webhook] No account identifier was provided on the Twilio voice webhook URL.", {
      reason: "missing_account_identifier"
    });
  }

  if (FALLBACK_FORWARD_NUMBER) {
    const normalizedFallbackNumber = normalizeTwilioDialNumber(FALLBACK_FORWARD_NUMBER);

    if (normalizedFallbackNumber) {
      console.info("[twilio-voice-webhook] Callback number loaded from env fallback.", {
        source: "env",
        callbackNumber: normalizedFallbackNumber
      });

      return {
        ok: true,
        number: normalizedFallbackNumber,
        source: "env"
      };
    }

    return {
      ok: false,
      reason: "invalid_env_fallback",
      message: "TWILIO_VOICE_FORWARD_NUMBER is present but invalid for Twilio dialing."
    };
  }

  if (!accountIdentifier) {
    return {
      ok: false,
      reason: "missing_account_identifier",
      message:
        "No account identifier was provided on the Twilio voice webhook URL, and no env fallback forwarding number is configured."
    };
  }

  try {
    const settings = await getMissedCallRecoverySettings(accountIdentifier);

    if (!settings.callbackNumber.trim()) {
      return {
        ok: false,
        reason: "missing_callback_number",
        message:
          "No callback number is configured in missed-call recovery settings, and no env fallback forwarding number is configured."
      };
    }

    return {
      ok: false,
      reason: "invalid_callback_number",
      message:
        "The saved callback number is invalid for Twilio dialing, and no env fallback forwarding number is configured."
    };
  } catch {
    return {
      ok: false,
      reason: "settings_lookup_failed",
      message:
        "The callback number could not be loaded from missed-call recovery settings, and no env fallback forwarding number is configured."
    };
  }
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
    return {
      callId: null,
      duplicate: false
    };
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

    return {
      callId: result.callId,
      duplicate: result.duplicate
    };
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

  return {
    callId: null,
    duplicate: false
  };
}

async function loadDashboardRowForCallId(
  supabase: ReturnType<typeof createAdminClient>,
  callId: string
) {
  const { data, error } = await supabase
    .from("calls")
    .select(callsSelectFields)
    .eq("id", callId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapSupabaseCallToDashboardRow(data as SupabaseCallRecord, null);
}

async function markCallFollowUpQueued(
  supabase: ReturnType<typeof createAdminClient>,
  callId: string
) {
  const { error } = await supabase
    .from("calls")
    .update({ status: "under_review" })
    .eq("id", callId)
    .neq("status", "resolved");

  if (error) {
    throw error;
  }
}

async function maybeSendAutomaticMissedCallSms({
  supabase,
  accountIdentifier,
  callId
}: {
  supabase: ReturnType<typeof createAdminClient>;
  accountIdentifier: string | null;
  callId: string | null;
}) {
  if (!accountIdentifier || !callId) {
    console.info("[twilio-voice-webhook] Automatic missed-call SMS skipped.", {
      accountIdentifier: accountIdentifier ?? undefined,
      callId,
      reason: !accountIdentifier ? "missing_account_identifier" : "missing_call_id"
    });
    return;
  }

  let settings;

  try {
    settings = await getMissedCallRecoverySettings(accountIdentifier);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Automatic missed-call SMS settings could not be loaded.";

    console.warn("[twilio-voice-webhook] Automatic missed-call SMS settings lookup failed.", {
      accountIdentifier,
      callId,
      message
    });

    await appendIntegrationError({
      userId: accountIdentifier,
      provider: "twilio",
      callId,
      errorMessage: message,
      eventType: "automatic_missed_call_sms",
      severity: "warning"
    }).catch(() => undefined);

    return;
  }

  if (!settings.autoFollowUpEnabled) {
    console.info("[twilio-voice-webhook] Automatic missed-call SMS skipped because auto follow-up is disabled.", {
      accountIdentifier,
      callId
    });
    return;
  }

  let row: Awaited<ReturnType<typeof loadDashboardRowForCallId>>;

  try {
    row = await loadDashboardRowForCallId(supabase, callId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Automatic missed-call SMS call lookup failed.";

    console.warn("[twilio-voice-webhook] Automatic missed-call SMS could not reload the call row.", {
      accountIdentifier,
      callId,
      message
    });

    await appendIntegrationError({
      userId: accountIdentifier,
      provider: "twilio",
      callId,
      errorMessage: message,
      eventType: "automatic_missed_call_sms",
      severity: "warning"
    }).catch(() => undefined);

    return;
  }

  if (!row) {
    console.warn("[twilio-voice-webhook] Automatic missed-call SMS skipped because the call row could not be reloaded.", {
      accountIdentifier,
      callId
    });
    return;
  }

  let result: Awaited<ReturnType<typeof sendFollowUpForCall>>;

  try {
    result = await sendFollowUpForCall({
      row,
      settings,
      userId: accountIdentifier,
      source: "automatic_missed_call",
      enforceCooldown: true
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Automatic missed-call SMS failed before Twilio accepted the request.";

    console.warn("[twilio-voice-webhook] Automatic missed-call SMS send crashed.", {
      accountIdentifier,
      callId,
      message
    });

    await appendIntegrationError({
      userId: accountIdentifier,
      provider: "twilio",
      callId,
      errorMessage: message,
      eventType: "automatic_missed_call_sms",
      severity: "warning"
    }).catch(() => undefined);

    return;
  }

  if (!result.ok) {
    if (result.reason === "cooldown_active") {
      await markCallFollowUpQueued(supabase, callId).catch((error) => {
        console.warn("[twilio-voice-webhook] Automatic missed-call SMS cooldown skip could not update call status.", {
          accountIdentifier,
          callId,
          message: error instanceof Error ? error.message : "Unknown error"
        });
      });

      console.info("[twilio-voice-webhook] Automatic missed-call SMS skipped because of cooldown.", {
        accountIdentifier,
        callId,
        message: result.message
      });
      return;
    }

    console.warn("[twilio-voice-webhook] Automatic missed-call SMS failed.", {
      accountIdentifier,
      callId,
      reason: result.reason,
      message: result.message
    });

    await appendIntegrationError({
      userId: accountIdentifier,
      provider: "twilio",
      callId,
      errorMessage: result.message,
      eventType: "automatic_missed_call_sms",
      severity: "warning"
    }).catch(() => undefined);

    return;
  }

  await markCallFollowUpQueued(supabase, callId).catch(async (error) => {
    const message =
      error instanceof Error
        ? error.message
        : "Automatic missed-call SMS sent but the call status could not be updated.";

    console.warn("[twilio-voice-webhook] Automatic missed-call SMS sent but status update failed.", {
      accountIdentifier,
      callId,
      message
    });

    await appendIntegrationError({
      userId: accountIdentifier,
      provider: "twilio",
      callId,
      errorMessage: message,
      eventType: "automatic_missed_call_sms",
      severity: "warning"
    }).catch(() => undefined);
  });

  console.info("[twilio-voice-webhook] Automatic missed-call SMS sent.", {
    accountIdentifier,
    callId,
    mode: result.mode,
    sid: result.sid
  });
}

export async function GET(request: Request) {
  const accountIdentifier = getAccountIdentifier(request.url);
  logWebhookHit("GET", {
    accountIdentifier: accountIdentifier ?? undefined
  });

  const forwardTarget = await resolveForwardTarget(accountIdentifier);

  if (!forwardTarget.ok) {
    console.warn("[twilio-voice-webhook] Fallback TwiML branch used.", {
      method: "GET",
      accountIdentifier: accountIdentifier ?? undefined,
      reason: forwardTarget.reason,
      message: forwardTarget.message
    });
    return createXmlResponse(buildFallbackTwiml());
  }

  console.info("[twilio-voice-webhook] Forwarding branch used.", {
    method: "GET",
    accountIdentifier: accountIdentifier ?? undefined,
    source: forwardTarget.source,
    forwardNumber: forwardTarget.number
  });

  return createXmlResponse(buildForwardDialTwiml(buildActionUrl(request.url), forwardTarget.number));
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
    console.info("[twilio-voice-webhook] DialCallStatus received.", {
      accountIdentifier: accountIdentifier ?? undefined,
      callSid,
      from,
      to,
      dialStatus: dialStatus ?? null
    });

    if (isMissedDialStatus(dialStatus)) {
      const ingestion = await persistMissedInboundCall(params, accountIdentifier);

      if (ingestion.callId && !ingestion.duplicate) {
        try {
          const supabase = createAdminClient();
          await maybeSendAutomaticMissedCallSms({
            supabase,
            accountIdentifier,
            callId: ingestion.callId
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Automatic missed-call SMS failed unexpectedly.";

          console.warn("[twilio-voice-webhook] Automatic missed-call SMS branch failed unexpectedly.", {
            accountIdentifier: accountIdentifier ?? undefined,
            callId: ingestion.callId,
            message
          });

          if (accountIdentifier) {
            await appendIntegrationError({
              userId: accountIdentifier,
              provider: "twilio",
              callId: ingestion.callId,
              errorMessage: message,
              eventType: "automatic_missed_call_sms",
              severity: "warning"
            }).catch(() => undefined);
          }
        }
      } else {
        console.info("[twilio-voice-webhook] Automatic missed-call SMS skipped because the missed call record was already present.", {
          accountIdentifier: accountIdentifier ?? undefined,
          callSid,
          dialStatus: dialStatus ?? null,
          callId: ingestion.callId,
          duplicate: ingestion.duplicate
        });
      }
    } else {
      if (isSuccessfulDialStatus(dialStatus)) {
        console.info("[twilio-voice-webhook] Automatic missed-call SMS skipped because the forwarded call connected successfully.", {
          accountIdentifier: accountIdentifier ?? undefined,
          callSid,
          from,
          to,
          dialStatus
        });
      } else {
        console.info("[twilio-voice-webhook] Automatic missed-call SMS skipped because DialCallStatus did not qualify for recovery.", {
          accountIdentifier: accountIdentifier ?? undefined,
          callSid,
          from,
          to,
          dialStatus
        });
      }
    }

    return createXmlResponse(buildCompletionTwiml());
  }

  const forwardTarget = await resolveForwardTarget(accountIdentifier);

  if (!forwardTarget.ok) {
    await recordIntegrationFailure({
      accountIdentifier,
      message: forwardTarget.message,
      eventType: "voice_inbound"
    });

    console.warn("[twilio-voice-webhook] Fallback TwiML branch used.", {
      method: "POST",
      accountIdentifier: accountIdentifier ?? undefined,
      callSid,
      reason: forwardTarget.reason,
      message: forwardTarget.message
    });

    return createXmlResponse(buildFallbackTwiml());
  }

  console.info("[twilio-voice-webhook] Forwarding branch used.", {
    method: "POST",
    accountIdentifier: accountIdentifier ?? undefined,
    callSid,
    source: forwardTarget.source,
    forwardNumber: forwardTarget.number
  });

  return createXmlResponse(buildForwardDialTwiml(buildActionUrl(request.url), forwardTarget.number));
}
