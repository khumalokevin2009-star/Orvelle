export const runtime = "nodejs";

const VERIFIED_FORWARD_NUMBER = "+447900261143";
const TWIML_RESPONSE = `<Response>
  <Dial>${VERIFIED_FORWARD_NUMBER}</Dial>
</Response>`;

function logWebhookHit(method: string) {
  console.info("Twilio webhook hit", {
    method,
    timestamp: new Date().toISOString()
  });
}

function createTwimlResponse() {
  return new Response(TWIML_RESPONSE, {
    status: 200,
    headers: {
      "Content-Type": "text/xml"
    }
  });
}

export async function GET() {
  logWebhookHit("GET");
  return createTwimlResponse();
}

export async function POST() {
  logWebhookHit("POST");
  return createTwimlResponse();
}
