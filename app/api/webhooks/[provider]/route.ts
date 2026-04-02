import { after, NextResponse } from "next/server";
import { processCallAfterIngestion } from "@/lib/call-processing";
import { updateProviderConnectionState } from "@/lib/integrations/connection-status";
import { appendIntegrationError } from "@/lib/integrations/error-log";
import { recordMonitoringEvent } from "@/lib/integrations/monitoring";
import { createAdminClient } from "@/lib/supabase/admin";
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

async function persistIntegrationFailure({
  accountIdentifier,
  provider,
  errorMessage,
  eventType,
  callId
}: {
  accountIdentifier: string | null;
  provider: string;
  errorMessage: string;
  eventType?: string | null;
  callId?: string | null;
}) {
  if (!accountIdentifier) {
    return;
  }

  try {
    await updateProviderConnectionState({
      userId: accountIdentifier,
      provider,
      accountIdentifier,
      status: "error",
      connectionHealth: "error",
      lastErrorMessage: errorMessage
    });

    await appendIntegrationError({
      userId: accountIdentifier,
      provider,
      callId,
      errorMessage,
      eventType
    });

    await recordMonitoringEvent({
      userId: accountIdentifier,
      provider,
      type: "ingestion_failed",
      callId,
      message: errorMessage
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown integration failure persistence error.";

    logWebhookWarning("Integration failure could not be persisted.", {
      provider,
      accountIdentifier,
      message,
      reason: "integration_failure_persist_error"
    });
  }
}

async function persistIntegrationWarning({
  accountIdentifier,
  provider,
  warningMessage,
  eventType,
  callId
}: {
  accountIdentifier: string | null;
  provider: string;
  warningMessage: string;
  eventType?: string | null;
  callId?: string | null;
}) {
  if (!accountIdentifier) {
    return;
  }

  try {
    await appendIntegrationError({
      userId: accountIdentifier,
      provider,
      callId,
      errorMessage: warningMessage,
      eventType,
      severity: "warning"
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown integration warning persistence error.";

    logWebhookWarning("Integration warning could not be persisted.", {
      provider,
      accountIdentifier,
      message,
      reason: "integration_warning_persist_error"
    });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const requestUrl = new URL(request.url);
  const accountIdentifier = requestUrl.searchParams.get("account")?.trim() || null;
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

    await persistIntegrationFailure({
      accountIdentifier,
      provider,
      errorMessage: message
    });

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

    await persistIntegrationFailure({
      accountIdentifier,
      provider,
      errorMessage: message,
      eventType: parsedWebhook.metadata.eventType
    });

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
    const ingestionResult = await handler.ingest({
      supabase,
      parsedWebhook
    });

    if (ingestionResult.body.warning) {
      await persistIntegrationWarning({
        accountIdentifier,
        provider,
        warningMessage: ingestionResult.body.message,
        eventType: ingestionResult.metadata.eventType,
        callId: ingestionResult.body.callId ?? null
      });

      logWebhookWarning("Webhook ingested with warning state.", {
        ...requestMetadata,
        accountIdentifier: accountIdentifier ?? undefined,
        externalCallId: normalizedPayload.external_call_id,
        eventType: ingestionResult.metadata.eventType,
        callId: (ingestionResult.body.callId as string | undefined) ?? undefined,
        providerEvent: ingestionResult.metadata.providerEvent ?? null,
        answered: ingestionResult.metadata.answered,
        duration: ingestionResult.metadata.duration,
        hasRecording: ingestionResult.metadata.hasRecording,
        status: ingestionResult.status,
        message: ingestionResult.body.message,
        reason: "warning"
      });
    } else if (ingestionResult.body.duplicate) {
      logWebhookWarning("Duplicate webhook call ignored.", {
        ...requestMetadata,
        accountIdentifier: accountIdentifier ?? undefined,
        externalCallId: normalizedPayload.external_call_id,
        eventType: ingestionResult.metadata.eventType,
        toNumber: ingestionResult.metadata.toNumber,
        duplicate: true,
        callId: (ingestionResult.body.callId as string | undefined) ?? undefined,
        providerEvent: ingestionResult.metadata.providerEvent ?? null,
        answered: ingestionResult.metadata.answered,
        duration: ingestionResult.metadata.duration,
        hasRecording: ingestionResult.metadata.hasRecording,
        status: ingestionResult.status
      });
    } else {
      logWebhookSuccess("Webhook call ingested successfully.", {
        ...requestMetadata,
        accountIdentifier: accountIdentifier ?? undefined,
        externalCallId: normalizedPayload.external_call_id,
        eventType: ingestionResult.metadata.eventType,
        toNumber: ingestionResult.metadata.toNumber,
        duplicate: false,
        callId: (ingestionResult.body.callId as string | undefined) ?? undefined,
        providerEvent: ingestionResult.metadata.providerEvent ?? null,
        answered: ingestionResult.metadata.answered,
        duration: ingestionResult.metadata.duration,
        hasRecording: ingestionResult.metadata.hasRecording,
        status: ingestionResult.status
      });
    }

    if (accountIdentifier && !ingestionResult.body.warning) {
      try {
        await updateProviderConnectionState({
          userId: accountIdentifier,
          provider,
          accountIdentifier,
          status: "connected",
          connectionHealth: "healthy",
          lastEventReceived: normalizedPayload.timestamp
        });
      } catch (statusError) {
        const message =
          statusError instanceof Error
            ? statusError.message
            : "Unknown integration status update failure.";

        logWebhookWarning("Webhook ingested but integration status update failed.", {
          ...requestMetadata,
          accountIdentifier,
          externalCallId: normalizedPayload.external_call_id,
          reason: "integration_status_update_failed",
          message
        });
      }
    }

    if (accountIdentifier && !ingestionResult.body.duplicate && !ingestionResult.body.warning) {
      try {
        await recordMonitoringEvent({
          userId: accountIdentifier,
          provider,
          type: "call_ingested",
          callId: ingestionResult.body.callId ?? null,
          message: ingestionResult.body.updated
            ? "Provider event updated an existing call record."
            : "Provider event created a new call record."
        });
      } catch (monitoringError) {
        const message =
          monitoringError instanceof Error
            ? monitoringError.message
            : "Unknown monitoring event failure.";

        logWebhookWarning("Webhook ingested but monitoring event could not be recorded.", {
          ...requestMetadata,
          accountIdentifier,
          externalCallId: normalizedPayload.external_call_id,
          reason: "monitoring_event_failed",
          message
        });
      }
    }

    if (ingestionResult.body.callId && !ingestionResult.body.duplicate) {
      const scheduledCallId = ingestionResult.body.callId;

      after(async () => {
        await processCallAfterIngestion(scheduledCallId, {
          supabase,
          monitoringContext: accountIdentifier
            ? {
                userId: accountIdentifier,
                provider
              }
            : undefined
        });
      });
    }

    return NextResponse.json(ingestionResult.body, { status: ingestionResult.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected webhook ingestion failure.";

    await persistIntegrationFailure({
      accountIdentifier,
      provider,
      errorMessage: message,
      eventType: parsedWebhook.metadata.eventType,
      callId: null
    });

    logWebhookFailure("Webhook ingestion failed.", {
      ...requestMetadata,
      accountIdentifier: accountIdentifier ?? undefined,
      externalCallId: normalizedPayload.external_call_id,
      eventType: parsedWebhook.metadata.eventType,
      toNumber: parsedWebhook.metadata.toNumber,
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
