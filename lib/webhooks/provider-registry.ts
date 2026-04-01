import { type CallProviderPayload } from "@/providers/types";
import {
  mapTwilioPayload,
  parseTwilioWebhookBody,
  validateTwilioWebhookSignature
} from "@/providers/twilio";

type ProviderValidationResult =
  | { ok: true }
  | { ok: false; status: number; message: string; reason: string };

export type ParsedWebhookResult = {
  payload: CallProviderPayload;
  metadata: {
    providerEvent?: string | null;
    answered?: boolean;
    duration?: number;
    hasRecording?: boolean;
  };
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
};

const twilioWebhookHandler: ProviderWebhookHandler = {
  provider: "twilio",
  validate({ rawBody, requestUrl, headers }) {
    const { signatureParams } = parseTwilioWebhookBody(rawBody);
    const result = validateTwilioWebhookSignature({
      authToken: process.env.TWILIO_AUTH_TOKEN,
      signature: headers.get("x-twilio-signature"),
      url: requestUrl,
      params: signatureParams
    });

    if (result.ok) {
      return result;
    }

    if (result.reason === "missing_auth_token") {
      return {
        ok: false,
        status: 503,
        reason: result.reason,
        message: "Webhook ingestion is temporarily unavailable."
      };
    }

    return {
      ok: false,
      status: 401,
      reason: result.reason,
      message: "Unauthorized webhook request."
    };
  },
  parse({ rawBody, contentType }) {
    if (!contentType?.includes("application/x-www-form-urlencoded")) {
      throw new Error("Twilio webhooks must be sent as application/x-www-form-urlencoded.");
    }

    const { parsedPayload } = parseTwilioWebhookBody(rawBody);
    const payload = mapTwilioPayload(parsedPayload);

    return {
      payload,
      metadata: {
        providerEvent: parsedPayload.CallStatus ?? null,
        answered: payload.answered,
        duration: payload.duration,
        hasRecording: Boolean(payload.recording_url)
      }
    };
  }
};

const providerHandlers: Record<string, ProviderWebhookHandler> = {
  twilio: twilioWebhookHandler
};

export function getWebhookProviderHandler(provider: string) {
  return providerHandlers[provider.toLowerCase()] ?? null;
}
