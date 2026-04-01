import { createAdminClient } from "@/lib/supabase/admin";
import { twilioWebhookHandler } from "@/lib/webhooks/providers/twilio-handler";

type ProviderValidationResult =
  | { ok: true }
  | { ok: false; status: number; message: string; reason: string };

export type ParsedWebhookResult = {
  payload: {
    phone_number: string;
    timestamp: string;
    duration: number;
    answered: boolean;
    recording_url?: string;
    external_call_id: string;
    provider: string;
  };
  metadata: {
    eventType?: string;
    providerEvent?: string | null;
    answered?: boolean;
    duration?: number;
    hasRecording?: boolean;
    toNumber?: string;
  };
};

export type ProviderIngestionResult = {
  status: number;
  body: {
    message: string;
    callId?: string | null;
    duplicate?: boolean;
    updated?: boolean;
  };
  metadata: ParsedWebhookResult["metadata"];
};

type ProviderWebhookHandler = {
  provider: string;
  validate(args: {
    rawBody: string;
    requestUrl: string;
    headers: Headers;
  }): ProviderValidationResult;
  parse(args: {
    rawBody: string;
    contentType: string | null;
  }): ParsedWebhookResult;
  ingest(args: {
    supabase: ReturnType<typeof createAdminClient>;
    parsedWebhook: ParsedWebhookResult;
  }): Promise<ProviderIngestionResult>;
};

const providerHandlers: Record<string, ProviderWebhookHandler> = {
  twilio: twilioWebhookHandler
};

export function getWebhookProviderHandler(provider: string) {
  return providerHandlers[provider.toLowerCase()] ?? null;
}
