import "server-only";

import type { User } from "@supabase/supabase-js";
import { ensureBusinessAccountForUser } from "@/lib/business-account";
import {
  ensureProviderConnectionState,
  readProviderConnectionState,
  type IntegrationConnectionHealth,
  type IntegrationStatus
} from "@/lib/integrations/connection-status";
import {
  readMonitoringSnapshot,
  type MonitoringEventRecord
} from "@/lib/integrations/monitoring";
import {
  getMissedCallRecoverySettings
} from "@/lib/missed-call-recovery-settings";
import type { ServiceCallRoutingMode } from "@/lib/service-call-routing-mode";

export type TwilioIntegrationSnapshot = {
  accountIdentifier: string;
  webhookUrl: string;
  callRoutingMode: ServiceCallRoutingMode;
  answerNumber: string | null;
  status: IntegrationStatus;
  connectionHealth: IntegrationConnectionHealth;
  statusDescription: string;
  endpointReady: boolean;
  lastEventAt: string | null;
  lastErrorMessage: string | null;
  monitoring: {
    totalCallsIngested: number;
    failedIngestions: number;
    analysisFailures: number;
    recentActivity: MonitoringEventRecord[];
  };
  instructions: string[];
};

export function deriveOriginFromHeaders(headerStore: Headers) {
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "orvellehq.com";
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

export async function getTwilioIntegrationSnapshot({
  user,
  origin
}: {
  user: User;
  origin: string;
}): Promise<TwilioIntegrationSnapshot> {
  const businessAccount = await ensureBusinessAccountForUser(user);
  const accountIdentifier = businessAccount.businessId;
  const missedCallRecoverySettings = await getMissedCallRecoverySettings(accountIdentifier).catch(() => null);
  const endpointReady = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let integrationState = readProviderConnectionState({
    appMetadata: user.app_metadata,
    provider: "twilio",
    accountIdentifier
  });
  const monitoring = readMonitoringSnapshot(user.app_metadata);

  if (!integrationState) {
    try {
      integrationState = await ensureProviderConnectionState({
        userId: user.id,
        provider: "twilio",
        accountIdentifier
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to initialize Twilio integration status.";

      console.error("[integrations] Failed to initialize Twilio integration state.", {
        accountIdentifier,
        message
      });
    }
  }

  const resolvedStatus =
    !endpointReady
      ? "error"
      : integrationState?.status ?? "waiting_for_data";
  const resolvedHealth =
    !endpointReady
      ? "error"
      : integrationState?.connectionHealth ?? "waiting";
  const lastErrorMessage =
    !endpointReady
      ? "Webhook ingestion is not fully configured yet. Finish the server-side setup before going live."
      : integrationState?.lastErrorMessage ?? null;
  const statusDescription =
    resolvedStatus === "connected"
      ? "Twilio is connected and valid events are reaching Orvelle successfully."
      : resolvedStatus === "error"
        ? lastErrorMessage ??
          "The Twilio integration needs attention before it can receive live call events reliably."
        : "Twilio is configured, but Orvelle is still waiting for the first valid webhook event. Make sure Twilio is using the exact webhook URL below, including the account query parameter.";

  return {
    accountIdentifier,
    webhookUrl: `${origin}/api/webhooks/twilio?account=${encodeURIComponent(accountIdentifier)}`,
    callRoutingMode:
      missedCallRecoverySettings?.callRoutingMode ?? "missed_call_only_forwarding",
    answerNumber: missedCallRecoverySettings?.callbackNumber?.trim() || null,
    status: resolvedStatus,
    connectionHealth: resolvedHealth,
    statusDescription,
    endpointReady,
    lastEventAt: integrationState?.lastEventReceived ?? null,
    lastErrorMessage,
    monitoring,
    instructions: [
      "Set your Twilio phone number Voice webhook URL to the webhook URL below exactly as shown, including the account query parameter.",
      "Use POST with application/x-www-form-urlencoded for the inbound voice webhook. Orvelle returns the TwiML that controls forwarding, missed-call recovery, and recording callbacks.",
      (missedCallRecoverySettings?.callRoutingMode ?? "missed_call_only_forwarding") ===
        "full_call_capture"
        ? "Full call capture is enabled. Twilio must receive the inbound call first so Orvelle can record answered calls, store the recording, and queue transcription automatically before the call is bridged to your saved answer number."
        : "Missed-call-only forwarding is enabled. Orvelle forwards the inbound call to your saved answer number and only stores calls that were not answered for recovery.",
      "Do not point the Twilio number directly at the client’s handset or a separate Twilio Studio flow, or Orvelle will not be able to distinguish answered calls from missed calls reliably.",
      "If Twilio is pointed at /api/webhooks/twilio without the account query parameter, Orvelle can answer the call but cannot map the activity back to the correct business."
    ]
  };
}
