export const runtime = "nodejs";

import { recordMonitoringEvent } from "@/lib/integrations/monitoring";
import { updateProviderConnectionState } from "@/lib/integrations/connection-status";

const VERIFIED_FORWARD_NUMBER = "+447392752193";
const TWIML_RESPONSE = `<Response>
  <Dial>${VERIFIED_FORWARD_NUMBER}</Dial>
</Response>`;

function createTwimlResponse() {
  return new Response(TWIML_RESPONSE, {
    status: 200,
    headers: {
      "Content-Type": "text/xml"
    }
  });
}

function createTextResponse(message: string) {
  return new Response(message, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

function parseTwilioFields(rawBody: string) {
  const params = new URLSearchParams(rawBody);

  return {
    callSid: params.get("CallSid")?.trim() || null,
    from: params.get("From")?.trim() || null,
    to: params.get("To")?.trim() || null,
    callStatus: params.get("CallStatus")?.trim() || null
  };
}

export async function GET() {
  return createTextResponse(
    "Twilio voice webhook endpoint is live. Configure Twilio to send POST requests to this URL."
  );
}

export async function POST(request: Request) {
  let rawBody = "";
  const timestamp = new Date().toISOString();
  const requestUrl = new URL(request.url);
  const accountIdentifier = requestUrl.searchParams.get("account")?.trim() || null;

  console.info("Twilio webhook hit");

  try {
    rawBody = await request.text();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read Twilio webhook body.";

    console.error("Twilio webhook body read failed", { message });
    return createTwimlResponse();
  }

  console.info("Twilio webhook body", rawBody);

  const fields = parseTwilioFields(rawBody);

  console.info("Twilio webhook event metadata", {
    timestamp,
    method: request.method,
    accountIdentifier,
    callSid: fields.callSid,
    from: fields.from,
    to: fields.to,
    callStatus: fields.callStatus
  });

  if (accountIdentifier) {
    try {
      await updateProviderConnectionState({
        userId: accountIdentifier,
        provider: "twilio",
        accountIdentifier,
        status: "connected",
        connectionHealth: "healthy",
        lastEventReceived: timestamp
      });

      await recordMonitoringEvent({
        userId: accountIdentifier,
        provider: "twilio",
        type: "call_ingested",
        callId: fields.callSid,
        message: `Voice webhook received${fields.from ? ` from ${fields.from}` : ""}${fields.to ? ` to ${fields.to}` : ""}.`
      });

      console.info("Twilio webhook event persisted for integration tracking", {
        timestamp,
        accountIdentifier,
        callSid: fields.callSid
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to persist Twilio webhook event.";

      console.error("Twilio webhook persistence failed", {
        timestamp,
        accountIdentifier,
        callSid: fields.callSid,
        message
      });
    }
  } else {
    console.warn("Twilio webhook received without account query parameter; integration status not updated", {
      timestamp,
      callSid: fields.callSid,
      from: fields.from,
      to: fields.to
    });
  }

  console.info("Twilio webhook returning dial TwiML", {
    timestamp,
    accountIdentifier,
    callSid: fields.callSid,
    dialTo: VERIFIED_FORWARD_NUMBER
  });

  return createTwimlResponse();
}
