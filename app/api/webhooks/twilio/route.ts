export const runtime = "nodejs";

import { ingestCall } from "@/lib/call-ingestion";
import { createAdminClient } from "@/lib/supabase/admin";

const VERIFIED_FORWARD_NUMBER = "+447900261143";
const DEFAULT_MISSED_CALL_REVENUE_ESTIMATE = 240;
const MISSED_DIAL_STATUSES = new Set(["busy", "failed", "canceled", "no-answer", "noanswer"]);

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

function buildDialTwiml(actionUrl: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial action="${escapeXml(
    actionUrl
  )}" method="POST">${escapeXml(VERIFIED_FORWARD_NUMBER)}</Dial></Response>`;
}

function buildCompletionTwiml() {
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>';
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

async function persistMissedInboundCall(params: URLSearchParams) {
  const callSid = getFormValue(params, "CallSid");
  const from = getFormValue(params, "From") ?? "Unknown number";
  const to = getFormValue(params, "To") ?? VERIFIED_FORWARD_NUMBER;
  const dialStatus = getFormValue(params, "DialCallStatus");
  const durationValue = Number(getFormValue(params, "DialCallDuration") ?? "0");

  if (!callSid) {
    console.warn("[twilio-voice-webhook] Missed-call callback received without CallSid.", {
      from,
      to,
      dialStatus
    });
    return;
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
  } catch (error) {
    console.error("[twilio-voice-webhook] Failed to persist missed inbound call.", {
      callSid,
      from,
      to,
      dialStatus,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export async function GET(request: Request) {
  logWebhookHit("GET");
  return createXmlResponse(buildDialTwiml(buildActionUrl(request.url)));
}

export async function POST(request: Request) {
  const rawBody = await request.text().catch(() => "");
  const params = new URLSearchParams(rawBody);
  const callSid = getFormValue(params, "CallSid");
  const from = getFormValue(params, "From");
  const to = getFormValue(params, "To");
  const callStatus = getFormValue(params, "CallStatus");
  const dialStatus = getFormValue(params, "DialCallStatus");

  logWebhookHit("POST", {
    callSid,
    from,
    to,
    callStatus,
    dialStatus
  });

  if (isDialCallback(params, request.url)) {
    if (isMissedDialStatus(dialStatus)) {
      await persistMissedInboundCall(params);
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

  return createXmlResponse(buildDialTwiml(buildActionUrl(request.url)));
}
