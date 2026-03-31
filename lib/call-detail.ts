import type { DashboardCallRow, SupabaseCallRecord } from "@/lib/dashboard-calls";

export type TranscriptEntry = {
  speaker: "Caller" | "Agent" | "System";
  time: string;
  text: string;
};

export type DetectedIssue = {
  title: string;
  description: string;
};

export type CallRecordDetail = {
  subtitle: string;
  duration: string;
  revenueContext: string;
  transcript: TranscriptEntry[];
  transcriptPending: boolean;
  issues: DetectedIssue[];
  analysisPending: boolean;
  analysisSummary: {
    intentLevel: string;
    callOutcome: string;
    missedOpportunity: string;
    revenueImpact: string;
    primaryIssue: string;
    confidenceScore: string;
    callOutcomeTone: "neutral" | "success" | "warning" | "critical";
    missedOpportunityTone: "neutral" | "success" | "warning" | "critical";
  };
};

export type TranscriptRecord = {
  id?: string | null;
  transcript_text: string | null;
  version?: number | null;
  confidence_score?: number | null;
};

export type AnalysisRecord = {
  id?: string | null;
  transcript_id?: string | null;
  analysis_status: string;
  failure_type?: string | null;
  conversion_failure_detected?: boolean | null;
  no_booking_attempt?: boolean | null;
  no_callback_logged?: boolean | null;
  response_sla_breach?: boolean | null;
  lead_intent_level?: string | null;
  intent_level?: string | null;
  call_outcome?: string | null;
  revenue_estimate?: number | null;
  primary_issue?: string | null;
  missed_opportunity?: boolean | null;
  recommended_action?: string | null;
  summary?: string | null;
  analyst_note?: string | null;
  revenue_impact_estimate?: number | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

function formatCurrency(value: number, currencyCode: string | null) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currencyCode ?? "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDisplayLabel(value: string | null | undefined, fallback: string) {
  if (!value?.trim()) {
    return fallback;
  }

  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return dateFormatter.format(new Date(value));
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) {
    return "Not available";
  }

  const durationSeconds = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
  );
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatTranscriptTime(index: number, totalEntries: number, startedAt: string, endedAt: string | null) {
  if (!endedAt || totalEntries <= 1) {
    return `Segment ${String(index + 1).padStart(2, "0")}`;
  }

  const totalSeconds = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
  );
  const offsetSeconds = Math.min(totalSeconds, Math.round((totalSeconds / Math.max(totalEntries, 1)) * index));
  const minutes = Math.floor(offsetSeconds / 60);
  const seconds = offsetSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function parseTranscriptEntries(
  transcriptText: string | null,
  startedAt: string,
  endedAt: string | null
): TranscriptEntry[] {
  if (!transcriptText?.trim()) {
    return [];
  }

  const matches = Array.from(
    transcriptText.matchAll(/(Caller voicemail|Caller|Agent|System):\s*([\s\S]*?)(?=(?:Caller voicemail|Caller|Agent|System):|$)/gi)
  );

  if (matches.length === 0) {
    return [
      {
        speaker: "System",
        time: "Segment 01",
        text: transcriptText.trim()
      }
    ];
  }

  return matches.map((match, index) => {
    const rawSpeaker = match[1].toLowerCase();
    const speaker: TranscriptEntry["speaker"] =
      rawSpeaker.startsWith("agent")
        ? "Agent"
        : rawSpeaker.startsWith("system")
          ? "System"
          : "Caller";

    return {
      speaker,
      time: formatTranscriptTime(index, matches.length, startedAt, endedAt),
      text: match[2].trim()
    };
  });
}

function getIntentLevel(analysis: AnalysisRecord | null) {
  return analysis?.intent_level?.trim() || analysis?.lead_intent_level?.trim() || null;
}

function getCallOutcome(analysis: AnalysisRecord | null) {
  return analysis?.call_outcome?.trim() || null;
}

function getMissedOpportunity(analysis: AnalysisRecord | null) {
  if (typeof analysis?.missed_opportunity === "boolean") {
    return analysis.missed_opportunity;
  }

  if (typeof analysis?.conversion_failure_detected === "boolean") {
    return analysis.conversion_failure_detected;
  }

  return null;
}

function getPrimaryIssue(analysis: AnalysisRecord | null) {
  if (analysis?.primary_issue?.trim()) {
    return analysis.primary_issue.trim();
  }

  if (analysis?.failure_type?.trim()) {
    return formatDisplayLabel(analysis.failure_type, "Primary issue not available");
  }

  return null;
}

function getRevenueEstimate(analysis: AnalysisRecord | null) {
  if (typeof analysis?.revenue_estimate === "number") {
    return analysis.revenue_estimate;
  }

  if (typeof analysis?.revenue_impact_estimate === "number") {
    return analysis.revenue_impact_estimate;
  }

  return null;
}

function formatConfidenceScore(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Not available";
  }

  return `${value.toFixed(1)}%`;
}

function getSubtitle(row: DashboardCallRow, analysis: AnalysisRecord | null) {
  const outcome = getCallOutcome(analysis);

  if (outcome === "converted") {
    return "Recovered Revenue Opportunity";
  }

  switch (analysis?.failure_type) {
    case "response_sla_breach":
      return "Response SLA Breach";
    case "resolved_recovery_case":
      return "Recovered Revenue Opportunity";
    case "missed_booking_failure":
    case "unconverted_high_intent_lead":
      return "Unconverted High-Intent Lead";
    default:
      if (row.status === "Resolved") return "Recovered Revenue Opportunity";
      if (row.status === "Under Review") return "Response SLA Breach";
      return "Unconverted High-Intent Lead";
  }
}

function buildIssueCards(analysis: AnalysisRecord | null): DetectedIssue[] {
  const analysisPending = !analysis || analysis.analysis_status !== "completed";

  if (analysisPending) {
    return [
      {
        title: "Primary Issue",
        description:
          "Analysis not yet generated. Generate structured analysis to classify the primary conversion risk associated with this interaction."
      },
      {
        title: "Intent Assessment",
        description:
          "Analysis not yet generated. Intent level and conversion outcome will populate here after transcript review completes."
      },
      {
        title: "Opportunity Status",
        description:
          "Analysis not yet generated. Missed opportunity and remediation urgency indicators will populate here after transcript review completes."
      }
    ];
  }

  const primaryIssue = getPrimaryIssue(analysis) || "Primary issue not available";
  const intentLevel = formatDisplayLabel(getIntentLevel(analysis), "Unknown");
  const callOutcome = formatDisplayLabel(getCallOutcome(analysis), "Unclear");
  const missedOpportunity = getMissedOpportunity(analysis);

  return [
    {
      title: "Primary Issue",
      description: primaryIssue
    },
    {
      title: "Intent Assessment",
      description: `Intent level assessed as ${intentLevel}. Call outcome classified as ${callOutcome}.`
    },
    {
      title: "Opportunity Status",
      description:
        missedOpportunity === false
          ? "Current analysis indicates the interaction did not result in a missed revenue opportunity."
          : "Current analysis indicates the interaction contains a missed revenue opportunity requiring follow-up action."
    }
  ];
}

function buildRevenueContext(analysis: AnalysisRecord | null) {
  const estimate = getRevenueEstimate(analysis);

  if (typeof estimate === "number" && estimate > 0) {
    return "Estimated revenue impact is based on the structured transcript analysis and the projected appointment value associated with this interaction.";
  }

  return "Analysis not yet generated. Revenue impact will populate after transcript review completes.";
}

function buildNotes(row: DashboardCallRow, record: SupabaseCallRecord, analysis: AnalysisRecord | null) {
  const noteEntries = [
    analysis?.analyst_note ?? null,
    `Assigned Owner: ${formatDisplayLabel(record.assigned_owner, "Unassigned")}`,
    `Source System: ${formatDisplayLabel(record.source_system, "Manual Upload")}`,
    `Direction: ${formatDisplayLabel(record.direction, "Inbound")}`,
    `Recording File: ${record.recording_filename ?? "Not available"}`,
    `Call End Timestamp: ${formatTimestamp(record.ended_at)}`,
    ...row.notes
  ];

  return Array.from(new Set(noteEntries.filter((entry): entry is string => Boolean(entry))));
}

export function buildCallRecordView(
  record: SupabaseCallRecord,
  row: DashboardCallRow,
  transcript: TranscriptRecord | null,
  analysis: AnalysisRecord | null
) {
  const transcriptEntries = parseTranscriptEntries(
    transcript?.transcript_text ?? null,
    record.started_at,
    record.ended_at
  );
  const analysisPending = !analysis || analysis.analysis_status !== "completed";
  const revenueEstimate = getRevenueEstimate(analysis);
  const missedOpportunity = getMissedOpportunity(analysis);
  const outcome = getCallOutcome(analysis);
  const intentLevel = getIntentLevel(analysis);
  const primaryIssue = getPrimaryIssue(analysis);
  const confidenceScore = formatConfidenceScore(transcript?.confidence_score);

  const nextRow: DashboardCallRow = {
    ...row,
    summary: analysis?.summary?.trim() || row.summary,
    revenue:
      typeof revenueEstimate === "number" && revenueEstimate > 0
        ? formatCurrency(revenueEstimate, record.currency_code)
        : row.revenue,
    revenueValue:
      typeof revenueEstimate === "number" && revenueEstimate >= 0 ? revenueEstimate : row.revenueValue,
    issue:
      analysisPending
        ? "Analysis not yet generated"
        : missedOpportunity === false
          ? "Revenue opportunity recovered"
          : "Estimated revenue leakage",
    reason: getPrimaryIssue(analysis) || row.reason,
    recommendedAction:
      analysisPending
        ? "Analysis not yet generated. Generate structured analysis to evaluate intent level, call outcome, revenue impact, and the required remediation step."
        : analysis?.recommended_action?.trim() || row.recommendedAction,
    notes: buildNotes(row, record, analysis)
  };

  if (outcome === "converted") {
    nextRow.status = "Resolved";
    nextRow.statusTone = "recovered";
    nextRow.urgency = "Closed";
    nextRow.urgencyTone = "recovered";
    nextRow.dueBy = "Completed";
  }

  const detail: CallRecordDetail = {
    subtitle: getSubtitle(nextRow, analysis),
    duration: formatDuration(record.started_at, record.ended_at),
    revenueContext: buildRevenueContext(analysis),
    transcript: transcriptEntries,
    transcriptPending: transcriptEntries.length === 0,
    issues: buildIssueCards(analysis),
    analysisPending,
    analysisSummary: {
      intentLevel: analysisPending ? "Analysis not yet generated" : formatDisplayLabel(intentLevel, "Not available"),
      callOutcome: analysisPending ? "Analysis not yet generated" : formatDisplayLabel(outcome, "Unclear"),
      missedOpportunity:
        analysisPending
          ? "Analysis not yet generated"
          : missedOpportunity === false
            ? "Not Detected"
            : "Detected",
      revenueImpact:
        analysisPending
          ? "Analysis not yet generated"
          : typeof revenueEstimate === "number"
            ? formatCurrency(revenueEstimate, record.currency_code)
            : row.revenue,
      primaryIssue: analysisPending ? "Pending classification" : primaryIssue || "Not available",
      confidenceScore,
      callOutcomeTone:
        analysisPending
          ? "neutral"
          : outcome === "converted"
            ? "success"
            : outcome === "not_converted"
              ? "critical"
              : "warning",
      missedOpportunityTone:
        analysisPending
          ? "neutral"
          : missedOpportunity === false
            ? "success"
            : "critical"
    }
  };

  return { row: nextRow, detail };
}
