import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCallInsertFromProviderPayload } from "@/lib/call-ingestion";
import {
  logWebhookFailure,
  logWebhookSuccess,
  logWebhookWarning
} from "@/lib/webhooks/logger";
import { getWebhookProviderHandler } from "@/lib/webhooks/provider-registry";

export const runtime = "nodejs";

function buildRequestMetadata(request: Request, provider: string) {
  return {
    provider,
    requestId: request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id"),
    path: new URL(request.url).pathname,
    contentType: request.headers.get("content-type")
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const handler = getWebhookProviderHandler(provider);
  const requestMetadata = buildRequestMetadata(request, provider);

  if (!handler) {
    logWebhookWarning("Unsupported webhook provider rejected.", {
      ...requestMetadata,
      status: 404,
      reason: "unsupported_provider"
    });

    return NextResponse.json(
      {
        message: "Webhook provider not supported."
      },
      { status: 404 }
    );
  }

  let rawBody = "";

  try {
    rawBody = await request.text();
  } catch {
    logWebhookFailure("Failed to read webhook request body.", {
      ...requestMetadata,
      status: 400,
      reason: "invalid_body"
    });

    return NextResponse.json(
      {
        message: "Invalid webhook request body."
      },
      { status: 400 }
    );
  }

  const validation = handler.validate({
    rawBody,
    requestUrl: request.url,
    headers: request.headers
  });

  if (!validation.ok) {
    logWebhookFailure("Webhook validation failed.", {
      ...requestMetadata,
      status: validation.status,
      reason: validation.reason,
      message: validation.message
    });

    return NextResponse.json(
      {
        message: validation.message
      },
      { status: validation.status }
    );
  }

  let parsedWebhook;

  try {
    parsedWebhook = handler.parse({
      rawBody,
      contentType: request.headers.get("content-type")
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to parse the webhook payload safely.";

    logWebhookFailure("Webhook payload parsing failed.", {
      ...requestMetadata,
      status: 400,
      reason: "parse_failure",
      message
    });

    return NextResponse.json(
      {
        message: "Malformed webhook payload."
      },
      { status: 400 }
    );
  }

  let supabase;

  try {
    supabase = createAdminClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to initialize the webhook ingestion client.";

    logWebhookFailure("Webhook ingestion could not initialize the admin client.", {
      ...requestMetadata,
      externalCallId: parsedWebhook.payload.external_call_id,
      status: 500,
      reason: "admin_client_failure",
      message
    });

    return NextResponse.json(
      {
        message: "Webhook ingestion is temporarily unavailable."
      },
      { status: 500 }
    );
  }

  const normalizedPayload = parsedWebhook.payload;

  try {
    const { data: existingCall, error: duplicateLookupError } = await supabase
      .from("calls")
      .select("id")
      .eq("external_id", normalizedPayload.external_call_id)
      .maybeSingle();

    if (duplicateLookupError) {
      throw duplicateLookupError;
    }

    if (existingCall?.id) {
      logWebhookSuccess("Duplicate webhook call ignored.", {
        ...requestMetadata,
        externalCallId: normalizedPayload.external_call_id,
        duplicate: true,
        callId: existingCall.id as string,
        providerEvent: parsedWebhook.metadata.providerEvent ?? null,
        answered: parsedWebhook.metadata.answered,
        duration: parsedWebhook.metadata.duration,
        hasRecording: parsedWebhook.metadata.hasRecording,
        status: 200
      });

      return NextResponse.json(
        {
          message: "Webhook call already ingested.",
          duplicate: true,
          callId: existingCall.id
        },
        { status: 200 }
      );
    }

    const insertPayload = buildCallInsertFromProviderPayload(normalizedPayload, {
      callerName: normalizedPayload.phone_number,
      status: normalizedPayload.answered ? "under_review" : "action_required"
    });

    const { data: insertedCall, error: insertError } = await supabase
      .from("calls")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      if ((insertError as { code?: string }).code === "23505") {
        const { data: duplicateCall } = await supabase
          .from("calls")
          .select("id")
          .eq("external_id", normalizedPayload.external_call_id)
          .maybeSingle();

        logWebhookWarning("Duplicate webhook call detected during insert race.", {
          ...requestMetadata,
          externalCallId: normalizedPayload.external_call_id,
          duplicate: true,
          callId: (duplicateCall?.id as string | undefined) ?? undefined,
          providerEvent: parsedWebhook.metadata.providerEvent ?? null,
          answered: parsedWebhook.metadata.answered,
          duration: parsedWebhook.metadata.duration,
          hasRecording: parsedWebhook.metadata.hasRecording,
          status: 200
        });

        return NextResponse.json(
          {
            message: "Webhook call already ingested.",
            duplicate: true,
            callId: duplicateCall?.id ?? null
          },
          { status: 200 }
        );
      }

      throw insertError;
    }

    logWebhookSuccess("Webhook call ingested successfully.", {
      ...requestMetadata,
      externalCallId: normalizedPayload.external_call_id,
      duplicate: false,
      callId: insertedCall.id as string,
      providerEvent: parsedWebhook.metadata.providerEvent ?? null,
      answered: parsedWebhook.metadata.answered,
      duration: parsedWebhook.metadata.duration,
      hasRecording: parsedWebhook.metadata.hasRecording,
      status: 201
    });

    return NextResponse.json(
      {
        message: "Webhook ingested successfully.",
        callId: insertedCall.id
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected webhook ingestion failure.";

    logWebhookFailure("Webhook ingestion failed.", {
      ...requestMetadata,
      externalCallId: normalizedPayload.external_call_id,
      providerEvent: parsedWebhook.metadata.providerEvent ?? null,
      answered: parsedWebhook.metadata.answered,
      duration: parsedWebhook.metadata.duration,
      hasRecording: parsedWebhook.metadata.hasRecording,
      status: 500,
      reason: "ingestion_failure",
      message
    });

    return NextResponse.json(
      {
        message: "Webhook ingestion failed."
      },
      { status: 500 }
    );
  }
}
