type WebhookLogMetadata = {
  provider: string;
  requestId?: string | null;
  path?: string;
  contentType?: string | null;
  accountIdentifier?: string;
  eventType?: string;
  externalCallId?: string;
  toNumber?: string;
  providerEvent?: string | null;
  answered?: boolean;
  duration?: number;
  hasRecording?: boolean;
  duplicate?: boolean;
  callId?: string;
  status?: number;
  message?: string;
  reason?: string;
};

function sanitizeMetadata(metadata: WebhookLogMetadata) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export function logWebhookSuccess(event: string, metadata: WebhookLogMetadata) {
  console.info(`[webhooks] ${event}`, sanitizeMetadata(metadata));
}

export function logWebhookFailure(event: string, metadata: WebhookLogMetadata) {
  console.error(`[webhooks] ${event}`, sanitizeMetadata(metadata));
}

export function logWebhookWarning(event: string, metadata: WebhookLogMetadata) {
  console.warn(`[webhooks] ${event}`, sanitizeMetadata(metadata));
}
