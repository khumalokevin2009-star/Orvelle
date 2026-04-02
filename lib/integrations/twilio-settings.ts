import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type TwilioIntegrationSnapshot = {
  accountIdentifier: string;
  webhookUrl: string;
  status: "connected" | "not_connected";
  statusDescription: string;
  endpointReady: boolean;
  totalCallsReceived: number;
  lastEventAt: string | null;
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
  accountIdentifier,
  origin
}: {
  accountIdentifier: string;
  origin: string;
}): Promise<TwilioIntegrationSnapshot> {
  const endpointReady = Boolean(
    process.env.TWILIO_AUTH_TOKEN &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let totalCallsReceived = 0;
  let lastEventAt: string | null = null;

  try {
    const supabase = createAdminClient();
    const { data, count, error } = await supabase
      .from("calls")
      .select("started_at", { count: "exact" })
      .eq("source_system", "twilio")
      .order("started_at", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    totalCallsReceived = count ?? 0;
    lastEventAt = data?.[0]?.started_at ?? null;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to resolve Twilio integration status.";

    console.error("[integrations] Failed to resolve Twilio integration snapshot.", {
      message
    });
  }

  const status = totalCallsReceived > 0 ? "connected" : "not_connected";

  return {
    accountIdentifier,
    webhookUrl: `${origin}/api/webhooks/twilio`,
    status,
    statusDescription:
      status === "connected"
        ? "Twilio events are already reaching Orvelle and call records are being ingested successfully."
        : endpointReady
          ? "No completed call or recording events have been received from Twilio yet."
          : "Webhook ingestion is not fully configured yet. Finish the server-side setup before going live.",
    endpointReady,
    totalCallsReceived,
    lastEventAt,
    instructions: [
      "Set your Twilio Voice status callback and recording status callback to the webhook URL below.",
      "Use POST with application/x-www-form-urlencoded so completed call and recording events can be validated safely.",
      "Keep the account identifier available for internal mapping and support coordination during rollout."
    ]
  };
}
