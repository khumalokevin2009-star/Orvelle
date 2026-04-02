import "server-only";

import type { DashboardCallRow } from "@/lib/dashboard-calls";
import {
  defaultMissedCallRecoverySettings,
  renderMissedCallRecoverySmsTemplate,
  type MissedCallRecoverySettings
} from "@/lib/missed-call-recovery-settings";

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
};

type FollowUpSendResult = FollowUpSendSuccess | FollowUpSendFailure;

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

  if (!env) {
    return {
      ok: false,
      status: 503,
      message:
        "SMS follow-up is not configured yet. Add TWILIO_ACCOUNT_SID and either TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM_NUMBER to enable live sending."
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

  const response = await fetch(
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

  const payload = (await response.json().catch(() => null)) as
    | {
        sid?: string;
        message?: string;
        error_message?: string | null;
      }
    | null;

  if (!response.ok) {
    return {
      ok: false,
      status: response.status || 502,
      message:
        payload?.message ||
        payload?.error_message ||
        "Twilio could not send the follow-up message right now."
    };
  }

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
  settings
}: {
  row: DashboardCallRow;
  forceMock?: boolean;
  settings?: MissedCallRecoverySettings;
}): Promise<FollowUpSendResult> {
  if (forceMock) {
    return {
      ok: true,
      mode: "mock",
      sid: null,
      message: "Mock follow-up logged for this demo recovery case."
    };
  }

  if (!row.phone || row.phone === "Phone number placeholder") {
    return {
      ok: false,
      status: 400,
      message: "A valid phone number is required before a follow-up can be sent."
    };
  }

  return sendTwilioSms({
    to: row.phone,
    body: settings ? buildFollowUpSmsBodyFromSettings({ row, settings }) : buildFollowUpSmsBody(row)
  });
}
