import "server-only";

import { createHash } from "node:crypto";
import type { DashboardCallRow } from "@/lib/dashboard-calls";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  defaultMissedCallRecoverySettings,
  renderMissedCallRecoverySmsTemplate,
  type MissedCallRecoverySettings
} from "@/lib/missed-call-recovery-settings";

const UK_DEFAULT_COUNTRY_CODE = "+44";
const FOLLOW_UP_SMS_LOG_KEY = "orvelle_follow_up_sms";
const DEFAULT_AUTOMATIC_SMS_COOLDOWN_MS = 2 * 60 * 60 * 1000;

type FollowUpSendSuccess = {
  ok: true;
  mode: "twilio" | "mock";
  message: string;
  sid: string | null;
};

type FollowUpSendFailure = {
  ok: false;
  status: number;
  message: string;
  reason?:
    | "missing_phone"
    | "invalid_phone"
    | "cooldown_active"
    | "sms_not_configured"
    | "provider_error";
};

type FollowUpSendResult = FollowUpSendSuccess | FollowUpSendFailure;

type FollowUpSendSource = "manual" | "automatic_missed_call";

type FollowUpSmsAttemptRecord = {
  id: string;
  callId: string;
  phoneNumber: string;
  templateHash: string;
  sid: string | null;
  mode: "twilio" | "mock";
  source: FollowUpSendSource;
  deliveryStatus: "accepted";
  createdAt: string;
};

type FollowUpSmsLogCollection = {
  recent?: FollowUpSmsAttemptRecord[];
};

function getTwilioMessagingEnv() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_SMS_FROM_NUMBER;

  if (!accountSid || !authToken || (!messagingServiceSid && !fromNumber)) {
    return null;
  }

  return {
    accountSid,
    authToken,
    messagingServiceSid: messagingServiceSid ?? null,
    fromNumber: fromNumber ?? null
  };
}

function getCallerFirstName(caller: string) {
  const firstName = caller.trim().split(/\s+/)[0];
  return firstName || "there";
}

function normalizeSmsDestination(value: string | null | undefined) {
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

function getExistingFollowUpSmsLog(appMetadata: unknown) {
  if (!appMetadata || typeof appMetadata !== "object") {
    return { recent: [] } satisfies FollowUpSmsLogCollection;
  }

  const metadata = appMetadata as Record<string, unknown>;
  const smsLog = metadata[FOLLOW_UP_SMS_LOG_KEY];

  if (!smsLog || typeof smsLog !== "object") {
    return { recent: [] } satisfies FollowUpSmsLogCollection;
  }

  return smsLog as FollowUpSmsLogCollection;
}

function hashSmsBody(body: string) {
  return createHash("sha256").update(body).digest("hex");
}

async function findRecentSmsAttempt({
  userId,
  phoneNumber,
  templateHash,
  cooldownWindowMs
}: {
  userId: string;
  phoneNumber: string;
  templateHash: string;
  cooldownWindowMs: number;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  const attempts = getExistingFollowUpSmsLog(data.user?.app_metadata).recent ?? [];
  const cutoff = Date.now() - cooldownWindowMs;

  return (
    attempts.find((attempt) => {
      if (attempt.phoneNumber !== phoneNumber || attempt.templateHash !== templateHash) {
        return false;
      }

      const createdAt = new Date(attempt.createdAt).getTime();
      return Number.isFinite(createdAt) && createdAt >= cutoff;
    }) ?? null
  );
}

async function recordFollowUpSmsAttempt({
  userId,
  callId,
  phoneNumber,
  templateHash,
  sid,
  mode,
  source
}: {
  userId: string;
  callId: string;
  phoneNumber: string;
  templateHash: string;
  sid: string | null;
  mode: "twilio" | "mock";
  source: FollowUpSendSource;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  const existingAppMetadata =
    data.user?.app_metadata && typeof data.user.app_metadata === "object"
      ? { ...(data.user.app_metadata as Record<string, unknown>) }
      : {};
  const existingLog = getExistingFollowUpSmsLog(data.user?.app_metadata);
  const nextAttempt: FollowUpSmsAttemptRecord = {
    id: crypto.randomUUID(),
    callId,
    phoneNumber,
    templateHash,
    sid,
    mode,
    source,
    deliveryStatus: "accepted",
    createdAt: new Date().toISOString()
  };

  existingAppMetadata[FOLLOW_UP_SMS_LOG_KEY] = {
    recent: [nextAttempt, ...(existingLog.recent ?? [])].slice(0, 30)
  } satisfies FollowUpSmsLogCollection;

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: existingAppMetadata
  });

  if (updateError) {
    throw updateError;
  }

  return nextAttempt;
}

function buildFollowUpSmsBody(row: DashboardCallRow) {
  return buildFollowUpSmsBodyFromSettings({
    row,
    settings: defaultMissedCallRecoverySettings
  });
}

function buildFollowUpSmsBodyFromSettings({
  row,
  settings
}: {
  row: DashboardCallRow;
  settings: MissedCallRecoverySettings;
}) {
  const firstName = getCallerFirstName(row.caller);
  const callbackNumber = settings.callbackNumber || row.phone;
  const renderedTemplate = renderMissedCallRecoverySmsTemplate({
    template: settings.smsTemplate || defaultMissedCallRecoverySettings.smsTemplate,
    businessName: settings.businessName || defaultMissedCallRecoverySettings.businessName,
    callbackWindow:
      settings.defaultCallbackWindow || defaultMissedCallRecoverySettings.defaultCallbackWindow,
    phoneNumber: callbackNumber
  });

  return renderedTemplate.startsWith("Hi ")
    ? renderedTemplate
    : `Hi ${firstName}, ${renderedTemplate.charAt(0).toLowerCase()}${renderedTemplate.slice(1)}`;
}

async function sendTwilioSms({
  to,
  body
}: {
  to: string;
  body: string;
}): Promise<FollowUpSendResult> {
  const env = getTwilioMessagingEnv();

  console.info("[follow-up-sms] SMS send function called.", {
    destinationPhone: to,
    usingMessagingServiceSid: Boolean(env?.messagingServiceSid),
    usingFromNumber: Boolean(env?.fromNumber)
  });

  if (!env) {
    console.warn("[follow-up-sms] Outbound message request failed because SMS is not configured.", {
      destinationPhone: to
    });
    return {
      ok: false,
      status: 503,
      message:
        "SMS follow-up is not configured yet. Add TWILIO_ACCOUNT_SID and either TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM_NUMBER to enable live sending.",
      reason: "sms_not_configured"
    };
  }

  const form = new URLSearchParams({
    To: to,
    Body: body
  });

  if (env.messagingServiceSid) {
    form.set("MessagingServiceSid", env.messagingServiceSid);
  } else if (env.fromNumber) {
    form.set("From", env.fromNumber);
  }

  const authorization = Buffer.from(`${env.accountSid}:${env.authToken}`).toString("base64");

  let response: Response;

  try {
    console.info("[follow-up-sms] Outbound Twilio message request started.", {
      destinationPhone: to
    });

    response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form.toString()
      }
    );
  } catch (error) {
    console.error("[follow-up-sms] Outbound Twilio message request failed.", {
      destinationPhone: to,
      message: error instanceof Error ? error.message : "Unknown error"
    });

    return {
      ok: false,
      status: 502,
      message:
        error instanceof Error
          ? error.message
          : "Twilio could not send the follow-up message right now.",
      reason: "provider_error"
    };
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        sid?: string;
        message?: string;
        error_message?: string | null;
      }
    | null;

  if (!response.ok) {
    console.error("[follow-up-sms] Outbound Twilio message request failed.", {
      destinationPhone: to,
      status: response.status || 502,
      message:
        payload?.message ||
        payload?.error_message ||
        "Twilio could not send the follow-up message right now."
    });

    return {
      ok: false,
      status: response.status || 502,
      message:
        payload?.message ||
        payload?.error_message ||
        "Twilio could not send the follow-up message right now.",
      reason: "provider_error"
    };
  }

  console.info("[follow-up-sms] Outbound Twilio message request succeeded.", {
    destinationPhone: to,
    sid: payload?.sid ?? null
  });

  return {
    ok: true,
    mode: "twilio",
    sid: payload?.sid ?? null,
    message: "Follow-up SMS sent successfully via Twilio."
  };
}

export async function sendFollowUpForCall({
  row,
  forceMock = false,
  settings,
  userId,
  source = "manual",
  enforceCooldown = false,
  cooldownWindowMs = DEFAULT_AUTOMATIC_SMS_COOLDOWN_MS
}: {
  row: DashboardCallRow;
  forceMock?: boolean;
  settings?: MissedCallRecoverySettings;
  userId?: string;
  source?: FollowUpSendSource;
  enforceCooldown?: boolean;
  cooldownWindowMs?: number;
}): Promise<FollowUpSendResult> {
  const smsBody = settings ? buildFollowUpSmsBodyFromSettings({ row, settings }) : buildFollowUpSmsBody(row);
  const normalizedPhoneNumber = normalizeSmsDestination(row.phone);
  const templateHash = hashSmsBody(smsBody);

  console.info("[follow-up-sms] Follow-up send requested.", {
    source,
    callId: row.id,
    caller: row.caller,
    originalInboundCallerPhone: row.phone,
    normalizedDestinationPhone: normalizedPhoneNumber,
    forceMock,
    enforceCooldown,
    hasUserId: Boolean(userId)
  });

  if (forceMock) {
    if (userId) {
      try {
        await recordFollowUpSmsAttempt({
          userId,
          callId: row.id,
          phoneNumber: normalizedPhoneNumber ?? row.phone,
          templateHash,
          sid: null,
          mode: "mock",
          source
        });
      } catch (error) {
        console.warn("[follow-up-sms] Failed to record mock SMS attempt.", {
          userId,
          callId: row.id,
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return {
      ok: true,
      mode: "mock",
      sid: null,
      message: "Mock follow-up logged for this demo recovery case."
    };
  }

  if (!row.phone || row.phone === "Phone number placeholder") {
    console.warn("[follow-up-sms] Follow-up send skipped because the original inbound caller number is missing.", {
      source,
      callId: row.id
    });
    return {
      ok: false,
      status: 400,
      message: "A valid phone number is required before a follow-up can be sent.",
      reason: "missing_phone"
    };
  }

  if (!normalizedPhoneNumber) {
    console.warn("[follow-up-sms] Follow-up send skipped because the original inbound caller number is invalid.", {
      source,
      callId: row.id,
      originalInboundCallerPhone: row.phone
    });
    return {
      ok: false,
      status: 400,
      message: "The destination caller number is invalid for SMS sending.",
      reason: "invalid_phone"
    };
  }

  if (userId && enforceCooldown) {
    try {
      const recentAttempt = await findRecentSmsAttempt({
        userId,
        phoneNumber: normalizedPhoneNumber,
        templateHash,
        cooldownWindowMs
      });

      if (recentAttempt) {
        console.info("[follow-up-sms] Follow-up send skipped because cooldown is active.", {
          source,
          callId: row.id,
          originalInboundCallerPhone: row.phone,
          normalizedDestinationPhone: normalizedPhoneNumber
        });
        return {
          ok: false,
          status: 409,
          message: "Automatic recovery SMS skipped because a similar follow-up was sent recently.",
          reason: "cooldown_active"
        };
      }
    } catch (error) {
      console.warn("[follow-up-sms] Failed to evaluate recent-send cooldown.", {
        userId,
        callId: row.id,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  const result = await sendTwilioSms({
    to: normalizedPhoneNumber,
    body: smsBody
  });

  if (result.ok && userId) {
    try {
      await recordFollowUpSmsAttempt({
        userId,
        callId: row.id,
        phoneNumber: normalizedPhoneNumber,
        templateHash,
        sid: result.sid,
        mode: result.mode,
        source
      });
    } catch (error) {
      console.warn("[follow-up-sms] Failed to record follow-up SMS attempt.", {
        userId,
        callId: row.id,
        sid: result.sid,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return result;
}
