import "server-only";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

export type IntentLevel = "high" | "medium" | "low";
export type CallOutcome = "converted" | "not_converted" | "unclear";
export type FailureType =
  | "unconverted_high_intent_lead"
  | "response_sla_breach"
  | "missed_booking_failure"
  | "resolved_recovery_case";

export type StructuredCallAnalysis = {
  intent_level: IntentLevel;
  call_outcome: CallOutcome;
  revenue_estimate: number;
  primary_issue: string;
  missed_opportunity: boolean;
  recommended_action: string;
  failure_type: FailureType;
  summary: string;
  analyst_note: string;
  no_booking_attempt: boolean;
  no_callback_logged: boolean;
  response_sla_breach: boolean;
};

type AnalysisProvider = "openai" | "mock";

const callAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent_level: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "Purchase intent inferred from the transcript."
    },
    call_outcome: {
      type: "string",
      enum: ["converted", "not_converted", "unclear"],
      description: "Whether the interaction converted into a booking or clear next step."
    },
    revenue_estimate: {
      type: "number",
      description: "Estimated revenue value associated with the interaction in major currency units."
    },
    primary_issue: {
      type: "string",
      description: "Short description of the dominant conversion or follow-up issue."
    },
    missed_opportunity: {
      type: "boolean",
      description: "Whether the transcript indicates a missed revenue opportunity."
    },
    recommended_action: {
      type: "string",
      description: "Operational next step written in concise business language."
    },
    failure_type: {
      type: "string",
      enum: [
        "unconverted_high_intent_lead",
        "response_sla_breach",
        "missed_booking_failure",
        "resolved_recovery_case"
      ],
      description: "Structured failure category aligned to the platform schema."
    },
    summary: {
      type: "string",
      description: "Formal summary of the interaction outcome and business impact."
    },
    analyst_note: {
      type: "string",
      description: "Internal note suitable for revenue operations review."
    },
    no_booking_attempt: {
      type: "boolean",
      description: "Whether the transcript indicates no booking attempt was made."
    },
    no_callback_logged: {
      type: "boolean",
      description: "Whether the transcript indicates no callback or follow-up commitment was made."
    },
    response_sla_breach: {
      type: "boolean",
      description: "Whether the transcript suggests the interaction breached the expected response window."
    }
  },
  required: [
    "intent_level",
    "call_outcome",
    "revenue_estimate",
    "primary_issue",
    "missed_opportunity",
    "recommended_action",
    "failure_type",
    "summary",
    "analyst_note",
    "no_booking_attempt",
    "no_callback_logged",
    "response_sla_breach"
  ]
} as const;

function getConfiguredProvider(): AnalysisProvider | null {
  const value = process.env.ANALYSIS_PROVIDER?.trim().toLowerCase();

  if (!value) {
    return process.env.OPENAI_API_KEY?.trim() ? "openai" : null;
  }

  if (value === "openai" || value === "mock") {
    return value;
  }

  throw new Error(
    `Unsupported analysis provider "${process.env.ANALYSIS_PROVIDER}". Use "openai" or "mock".`
  );
}

function getOpenAIAnalysisModel() {
  return process.env.OPENAI_ANALYSIS_MODEL?.trim() || "gpt-4.1";
}

function assertStructuredOutput(payload: unknown): StructuredCallAnalysis {
  if (!payload || typeof payload !== "object") {
    throw new Error("Analysis provider returned an invalid payload.");
  }

  const candidate = payload as Record<string, unknown>;
  const intentLevel = candidate.intent_level;
  const callOutcome = candidate.call_outcome;
  const revenueEstimate = candidate.revenue_estimate;

  if (intentLevel !== "high" && intentLevel !== "medium" && intentLevel !== "low") {
    throw new Error("Analysis provider returned an invalid intent level.");
  }

  if (callOutcome !== "converted" && callOutcome !== "not_converted" && callOutcome !== "unclear") {
    throw new Error("Analysis provider returned an invalid call outcome.");
  }

  if (typeof revenueEstimate !== "number" || Number.isNaN(revenueEstimate)) {
    throw new Error("Analysis provider returned an invalid revenue estimate.");
  }

  return {
    intent_level: intentLevel,
    call_outcome: callOutcome,
    revenue_estimate: Math.max(0, Math.round(revenueEstimate)),
    primary_issue: typeof candidate.primary_issue === "string" ? candidate.primary_issue.trim() : "",
    missed_opportunity: Boolean(candidate.missed_opportunity),
    recommended_action:
      typeof candidate.recommended_action === "string" ? candidate.recommended_action.trim() : "",
    failure_type:
      candidate.failure_type === "response_sla_breach" ||
      candidate.failure_type === "missed_booking_failure" ||
      candidate.failure_type === "resolved_recovery_case"
        ? candidate.failure_type
        : "unconverted_high_intent_lead",
    summary: typeof candidate.summary === "string" ? candidate.summary.trim() : "",
    analyst_note: typeof candidate.analyst_note === "string" ? candidate.analyst_note.trim() : "",
    no_booking_attempt: Boolean(candidate.no_booking_attempt),
    no_callback_logged: Boolean(candidate.no_callback_logged),
    response_sla_breach: Boolean(candidate.response_sla_breach)
  };
}

async function analyzeWithOpenAI(transcriptText: string): Promise<StructuredCallAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OpenAI analysis is not configured. Add OPENAI_API_KEY or switch ANALYSIS_PROVIDER to mock.");
  }

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: getOpenAIAnalysisModel(),
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a revenue operations call analysis engine. Review service-business call transcripts and produce structured operational output. Focus on booking conversion, callback failures, and missed revenue opportunities. Return only schema-compliant data."
        },
        {
          role: "user",
          content: `Analyze the following call transcript and classify business impact.\n\nTranscript:\n${transcriptText}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "call_analysis",
          strict: true,
          schema: callAnalysisSchema
        }
      }
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: {
            content?: string | null;
            refusal?: string | null;
          };
        }>;
        error?: {
          message?: string;
        };
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || "The analysis provider returned an error.");
  }

  const choice = payload?.choices?.[0]?.message;

  if (choice?.refusal) {
    throw new Error(choice.refusal);
  }

  const content = choice?.content?.trim();

  if (!content) {
    throw new Error("The analysis provider returned an empty response.");
  }

  return assertStructuredOutput(JSON.parse(content));
}

async function analyzeWithMock(transcriptText: string): Promise<StructuredCallAnalysis> {
  const lower = transcriptText.toLowerCase();
  const mentionsBooking =
    lower.includes("book") || lower.includes("schedule") || lower.includes("appointment");
  const mentionsCallback = lower.includes("call back") || lower.includes("callback");
  const mentionsVoicemail = lower.includes("voicemail");
  const converted = lower.includes("confirmed") || lower.includes("booked");
  const missedOpportunity = mentionsBooking && !converted;

  return {
    intent_level: mentionsBooking ? "high" : "medium",
    call_outcome: converted ? "converted" : missedOpportunity ? "not_converted" : "unclear",
    revenue_estimate: missedOpportunity ? 250 : 0,
    primary_issue: converted
      ? "Booking secured"
      : mentionsVoicemail
        ? "Voicemail inquiry remained without confirmed follow-up"
        : "Booking intent captured without confirmed next step",
    missed_opportunity: missedOpportunity,
    recommended_action: converted
      ? "No further remediation is required. Maintain the record for audit review."
      : "Immediate outbound follow-up required. Confirm service availability, secure a booking attempt, and document the outcome.",
    failure_type: converted
      ? "resolved_recovery_case"
      : mentionsVoicemail
        ? "missed_booking_failure"
        : mentionsCallback
          ? "response_sla_breach"
          : "unconverted_high_intent_lead",
    summary: converted
      ? "The transcript indicates that the revenue opportunity was converted and does not require additional remediation."
      : "The transcript indicates booking intent without a confirmed conversion outcome, creating revenue recovery risk.",
    analyst_note: converted
      ? "Mock analysis indicates a converted interaction."
      : "Mock analysis indicates follow-up is required to protect the revenue opportunity.",
    no_booking_attempt: !converted && mentionsBooking,
    no_callback_logged: !converted && !mentionsCallback,
    response_sla_breach: !converted && mentionsCallback
  };
}

export async function analyzeTranscript(transcriptText: string): Promise<StructuredCallAnalysis> {
  const provider = getConfiguredProvider();

  if (!provider) {
    throw new Error(
      "No analysis provider is configured. Set ANALYSIS_PROVIDER to openai or mock before generating structured analysis."
    );
  }

  if (provider === "mock") {
    return analyzeWithMock(transcriptText);
  }

  return analyzeWithOpenAI(transcriptText);
}
