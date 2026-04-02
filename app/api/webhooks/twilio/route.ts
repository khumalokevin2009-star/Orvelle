export const runtime = "nodejs";

const TWIML_RESPONSE = `<Response>
  <Say>Call connected</Say>
  <Hangup />
</Response>`;

function createTwimlResponse() {
  return new Response(TWIML_RESPONSE, {
    status: 200,
    headers: {
      "Content-Type": "text/xml"
    }
  });
}

export async function POST(request: Request) {
  let rawBody = "";

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

  return createTwimlResponse();
}
