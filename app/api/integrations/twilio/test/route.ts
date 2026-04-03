import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { ensureBusinessAccountForUser } from "@/lib/business-account";
import { ensureProviderConnectionState } from "@/lib/integrations/connection-status";
import { deriveOriginFromHeaders } from "@/lib/integrations/twilio-settings";
import { twilioWebhookHandler } from "@/lib/webhooks/providers/twilio-handler";
import {
  createTwilioWebhookSignature,
  parseTwilioWebhookBody
} from "@/providers/twilio";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      {
        message: "Authentication required."
      },
      { status: 401 }
    );
  }

  if (!process.env.TWILIO_AUTH_TOKEN) {
    return NextResponse.json(
      {
        message: "Webhook testing is temporarily unavailable. Please try again later."
      },
      { status: 503 }
    );
  }

  const origin = deriveOriginFromHeaders(request.headers);
  const businessAccount = await ensureBusinessAccountForUser(user);
  const accountIdentifier = businessAccount.businessId;
  const webhookUrl = `${origin}/api/webhooks/twilio?account=${encodeURIComponent(accountIdentifier)}`;
  const rawBody = new URLSearchParams({
    CallSid: `twilio-test-${user.id.slice(0, 8)}-${Date.now()}`,
    From: "+441234567890",
    To: "+448765432100",
    CallStatus: "completed",
    CallDuration: "94",
    Timestamp: new Date().toISOString()
  }).toString();

  try {
    const { signatureParams } = parseTwilioWebhookBody(rawBody);
    const signature = createTwilioWebhookSignature({
      authToken: process.env.TWILIO_AUTH_TOKEN,
      url: webhookUrl,
      params: signatureParams
    });

    const validation = twilioWebhookHandler.validate({
      rawBody,
      requestUrl: webhookUrl,
      headers: new Headers({
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": signature
      })
    });

    if (!validation.ok) {
      return NextResponse.json(
        {
          message: "Webhook validation failed. Please review your Twilio configuration."
        },
        { status: validation.status }
      );
    }

    const parsedWebhook = twilioWebhookHandler.parse({
      rawBody,
      contentType: "application/x-www-form-urlencoded"
    });

    await ensureProviderConnectionState({
      userId: user.id,
      provider: "twilio",
      accountIdentifier
    });

    console.info("[integrations] Twilio webhook connection test passed.", {
      accountIdentifier,
      eventType: parsedWebhook.metadata.eventType,
      providerEvent: parsedWebhook.metadata.providerEvent ?? null,
      answered: parsedWebhook.metadata.answered,
      duration: parsedWebhook.metadata.duration
    });

    return NextResponse.json({
      message: "Twilio webhook endpoint is ready to receive signed events.",
      metadata: {
        provider: "twilio",
        eventType: parsedWebhook.metadata.eventType
      }
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected Twilio webhook verification failure.";

    console.error("[integrations] Twilio webhook connection test failed.", {
      accountIdentifier,
      message
    });

    return NextResponse.json(
      {
        message: "Webhook testing is temporarily unavailable. Please try again later."
      },
      { status: 500 }
    );
  }
}
