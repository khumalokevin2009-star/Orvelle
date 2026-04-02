import "server-only";

import type { User } from "@supabase/supabase-js";
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

export type TwilioIntegrationSnapshot = {
  accountIdentifier: string;
  webhookUrl: string;
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
  const accountIdentifier = user.id;
  const endpointReady = Boolean(
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
        : "Twilio is configured, but Orvelle is still waiting for the first valid webhook event.";

  return {
    accountIdentifier,
    webhookUrl: `${origin}/api/webhooks/twilio?account=${encodeURIComponent(accountIdentifier)}`,
    status: resolvedStatus,
    connectionHealth: resolvedHealth,
    statusDescription,
    endpointReady,
    lastEventAt: integrationState?.lastEventReceived ?? null,
    lastErrorMessage,
    monitoring,
    instructions: [
      "Set your Twilio Voice status callback and recording status callback to the webhook URL below exactly as shown, including the account query parameter.",
      "Use POST with application/x-www-form-urlencoded so completed call and recording events can be validated safely.",
      "Keep the account identifier available for internal mapping and support coordination during rollout."
    ]
  };
}
