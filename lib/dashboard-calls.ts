import type { DateRangeKey } from "@/lib/analysis-window";
import type { CallTabId, CallTableRow } from "@/data/mock-platform-data";

const dayMs = 24 * 60 * 60 * 1000;
const defaultMissedCallRecoveryRevenueValue = 240;

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric"
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

export const callsSelectFields =
  "id, external_id, caller_name, caller_phone, direction, started_at, ended_at, recording_filename, source_system, assigned_owner, status, revenue_estimate, currency_code, updated_at";

export const analysisSelectFields =
  "call_id, analysis_status, failure_type, lead_intent_level, intent_level, call_outcome, revenue_estimate, revenue_impact_estimate, primary_issue, missed_opportunity, recommended_action, summary, analyst_note";

export type SupabaseCallRecord = {
  id: string;
  external_id: string | null;
  caller_name: string;
  caller_phone: string | null;
  direction: string;
  started_at: string;
  ended_at: string | null;
  recording_filename: string | null;
  source_system: string | null;
  assigned_owner: string | null;
  status: string;
  revenue_estimate: number | null;
  currency_code: string | null;
  updated_at: string | null;
};

export type DashboardCallRow = CallTableRow & {
  startedAtRaw: string;
  updatedAtRaw: string | null;
  externalId: string | null;
  direction: string;
  recordingFilename: string | null;
  sourceSystem: string | null;
  workflowStatusLabel?: "Action Required" | "Follow-Up Sent" | "Escalated" | "Resolved";
  recoveryOutcomeLabel?: "Pending" | "Recovered" | "Not Recovered";
  recoveredValue?: number | null;
  resolutionReason?: string | null;
  bookingCreated?: boolean | null;
};

export type SupabaseAnalysisRecord = {
  call_id: string;
  analysis_status: string;
  failure_type: string | null;
  lead_intent_level: string | null;
  intent_level: string | null;
  call_outcome: string | null;
  revenue_estimate: number | null;
  revenue_impact_estimate: number | null;
  primary_issue: string | null;
  missed_opportunity: boolean | null;
  recommended_action: string | null;
  summary: string | null;
  analyst_note: string | null;
};

function formatDisplayLabel(value: string | null | undefined, fallback: string) {
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

function formatCurrency(value: number, currencyCode: string | null) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currencyCode ?? "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function getCallDurationSeconds(record: SupabaseCallRecord) {
  if (!record.ended_at) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((new Date(record.ended_at).getTime() - new Date(record.started_at).getTime()) / 1000)
  );
}

function isTwilioMissedInboundRecoveryRecord(
  record: SupabaseCallRecord,
  analysis: SupabaseAnalysisRecord | null
) {
  const source = (record.source_system ?? "").toLowerCase();

  if (!source.includes("twilio")) {
    return false;
  }

  if (record.direction === "outbound") {
    return false;
  }

  if (record.status === "resolved") {
    return false;
  }

  if (analysis?.analysis_status === "completed") {
    return false;
  }

  return getCallDurationSeconds(record) === 0;
}

function getAnalysisIntentLabel(analysis: SupabaseAnalysisRecord | null) {
  return formatDisplayLabel(analysis?.intent_level ?? analysis?.lead_intent_level, "Analysis Pending");
}

function getAnalysisOutcomeLabel(analysis: SupabaseAnalysisRecord | null) {
  if (!analysis || analysis.analysis_status !== "completed") {
    return "Pending";
  }

  return formatDisplayLabel(analysis.call_outcome, "Unclear");
}

function getMissedOpportunityLabel(analysis: SupabaseAnalysisRecord | null) {
  if (!analysis || analysis.analysis_status !== "completed") {
    return "Pending";
  }

  if (analysis.missed_opportunity === false) {
    return "No";
  }

  return "Yes";
}

function getActionStatus(
  statusLabel: DashboardCallRow["status"],
  analysis: SupabaseAnalysisRecord | null
): NonNullable<CallTableRow["actionStatus"]> {
  if (statusLabel === "Resolved") {
    return "No Action Needed";
  }

  if (analysis?.analysis_status === "completed") {
    if (analysis.call_outcome === "converted" || analysis.missed_opportunity === false) {
      return "No Action Needed";
    }
  }

  return "Needs Action";
}

function getPrimaryIssueLabel(analysis: SupabaseAnalysisRecord | null, fallback: string) {
  if (!analysis || analysis.analysis_status !== "completed") {
    return "Analysis pending";
  }

  if (analysis.primary_issue?.trim()) {
    return analysis.primary_issue.trim();
  }

  if (analysis.failure_type?.trim()) {
    return formatDisplayLabel(analysis.failure_type, fallback);
  }

  return fallback;
}

function getRevenueImpactValue(record: SupabaseCallRecord, analysis: SupabaseAnalysisRecord | null) {
  if (analysis?.analysis_status === "completed") {
    if (typeof analysis.revenue_estimate === "number") {
      return Number(analysis.revenue_estimate);
    }

    if (typeof analysis.revenue_impact_estimate === "number") {
      return Number(analysis.revenue_impact_estimate);
    }
  }

  return Number(record.revenue_estimate ?? 0);
}

function formatCallTimestamp(startedAt: string) {
  const date = new Date(startedAt);

  return `${dateFormatter.format(date)} • ${timeFormatter.format(date)}`;
}

function formatRelativeTime(startedAt: string) {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / dayMs));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "1 week ago";
  if (diffWeeks < 5) return `${diffWeeks} weeks ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${Math.max(1, diffMonths)} month${diffMonths > 1 ? "s" : ""} ago`;
}

function toConciseSentence(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  const firstSentenceMatch = normalized.match(/[^.!?]+[.!?]?/);
  const sentence = (firstSentenceMatch?.[0] ?? normalized).trim();

  if (sentence.length <= 112) {
    return sentence;
  }

  return `${sentence.slice(0, 109).trimEnd()}...`;
}

function getStatusLabel(status: string): DashboardCallRow["status"] {
  switch (status) {
    case "uploaded":
      return "Action Required";
    case "processing":
      return "Under Review";
    case "analyzed":
      return "Under Review";
    case "failed":
      return "Escalated";
    case "under_review":
      return "Under Review";
    case "resolved":
      return "Resolved";
    case "escalated":
      return "Escalated";
    case "action_required":
    default:
      return "Action Required";
  }
}

function getStatusTone(status: DashboardCallRow["status"]): DashboardCallRow["statusTone"] {
  switch (status) {
    case "Resolved":
      return "recovered";
    case "Under Review":
      return "pending";
    case "Escalated":
    case "Action Required":
    default:
      return "critical";
  }
}

function isManualUpload(record: SupabaseCallRecord) {
  const source = (record.source_system ?? "").toLowerCase();
  return source.includes("manual upload") || source.includes("manual_upload");
}

function getCategory(
  record: SupabaseCallRecord,
  statusLabel: DashboardCallRow["status"],
  analysis?: SupabaseAnalysisRecord | null
): CallTabId {
  const source = (record.source_system ?? "").toLowerCase();

  if (statusLabel === "Resolved") {
    return "original-bookings";
  }

  if (analysis?.analysis_status === "completed" && analysis.call_outcome === "converted") {
    return "original-bookings";
  }

  if (analysis?.analysis_status === "completed" && analysis.failure_type === "response_sla_breach") {
    return "delayed-response";
  }

  if (statusLabel === "Under Review") {
    return "delayed-response";
  }

  if (source.includes("voicemail")) {
    return "missed-booking";
  }

  return "missed-booking";
}

function getUrgency(statusLabel: DashboardCallRow["status"]): {
  urgency: DashboardCallRow["urgency"];
  urgencyTone: DashboardCallRow["urgencyTone"];
} {
  switch (statusLabel) {
    case "Resolved":
      return { urgency: "Closed", urgencyTone: "recovered" };
    case "Under Review":
      return { urgency: "Elevated Priority", urgencyTone: "pending" };
    case "Escalated":
    case "Action Required":
    default:
      return { urgency: "Critical Priority", urgencyTone: "critical" };
  }
}

function getResponseDelayHours(statusLabel: DashboardCallRow["status"], category: CallTabId) {
  if (statusLabel === "Resolved") return 1.9;
  if (category === "delayed-response") return 6.8;
  if (statusLabel === "Escalated") return 8.4;
  return 4.2;
}

function getReason(record: SupabaseCallRecord, statusLabel: DashboardCallRow["status"], category: CallTabId) {
  const source = (record.source_system ?? "").toLowerCase();

  if (statusLabel === "Resolved") {
    return "Resolved revenue recovery case";
  }

  if (isManualUpload(record)) {
    return "Uploaded interaction awaiting classification";
  }

  if (category === "delayed-response") {
    return "Response SLA breach";
  }

  if (source.includes("voicemail")) {
    return "Escalated voicemail interaction";
  }

  return "Unconverted high-intent lead";
}

function getRecommendedAction(
  statusLabel: DashboardCallRow["status"],
  category: CallTabId,
  analysis?: SupabaseAnalysisRecord | null
) {
  if (analysis?.analysis_status === "completed" && analysis.recommended_action?.trim()) {
    return analysis.recommended_action.trim();
  }

  if (!analysis || analysis.analysis_status !== "completed") {
    return "Structured analysis is pending. Review the transcript, confirm booking intent, and classify the interaction outcome.";
  }

  if (statusLabel === "Resolved") {
    return "No additional remediation is required. Booking recovery was completed and the revenue opportunity has been restored to pipeline.";
  }

  if (category === "delayed-response") {
    return "Immediate ownership assignment required. Response timing exceeded the defined service-level window. Complete customer outreach before end of business day.";
  }

  if (statusLabel === "Escalated") {
    return "Escalation required. Booking intent was communicated during the initial interaction and no same-day response was issued. Assign operational ownership and schedule immediate outbound contact.";
  }

  return "Immediate outbound follow-up required. High purchase intent was identified during the initial interaction. No booking attempt or return contact was recorded.";
}

function getIssue(
  record: SupabaseCallRecord,
  statusLabel: DashboardCallRow["status"],
  analysis?: SupabaseAnalysisRecord | null
) {
  if (!analysis || analysis.analysis_status !== "completed") {
    return "Pending analysis";
  }

  if (analysis?.analysis_status === "completed" && analysis.missed_opportunity === false) {
    return analysis.call_outcome === "converted" ? "Converted interaction" : "No revenue risk";
  }

  if (analysis?.analysis_status === "completed" && analysis.missed_opportunity) {
    return "Revenue at risk";
  }

  if (isManualUpload(record) && statusLabel !== "Resolved") {
    return "Pending review";
  }

  return statusLabel === "Resolved" ? "Revenue reinstated" : "Estimated revenue leakage";
}

function getConciseAnalystNote(
  record: SupabaseCallRecord,
  actionStatus: NonNullable<CallTableRow["actionStatus"]>,
  primaryIssue: string,
  analysis?: SupabaseAnalysisRecord | null
) {
  if (analysis?.analysis_status === "completed") {
    if (analysis.analyst_note?.trim()) {
      return toConciseSentence(analysis.analyst_note);
    }

    if (analysis.primary_issue?.trim()) {
      return toConciseSentence(analysis.primary_issue);
    }

    if (analysis.summary?.trim()) {
      return toConciseSentence(analysis.summary);
    }
  }

  if (actionStatus === "No Action Needed") {
    return "No further follow-up is required.";
  }

  if (isManualUpload(record)) {
    return "Analysis is pending for the uploaded recording.";
  }

  return toConciseSentence(primaryIssue || "Analysis is pending.");
}

function getSummary(
  record: SupabaseCallRecord,
  statusLabel: DashboardCallRow["status"],
  category: CallTabId,
  analysis?: SupabaseAnalysisRecord | null
) {
  const sourceLabel = formatDisplayLabel(record.source_system, "Telephony Platform");
  const directionLabel = record.direction === "outbound" ? "outbound" : "inbound";

  if (analysis?.analysis_status === "completed" && analysis.summary?.trim()) {
    return analysis.summary.trim();
  }

  if (!analysis || analysis.analysis_status !== "completed") {
    return `The ${directionLabel} interaction was captured in ${sourceLabel}. Transcript processing has completed, but structured analysis is still pending and operational classification has not yet been finalized.`;
  }

  if (statusLabel === "Resolved") {
    return `The ${directionLabel} interaction originated in ${sourceLabel}. Remediation activity has been completed and the associated revenue opportunity was recovered.`;
  }

  if (category === "delayed-response") {
    return `The ${directionLabel} interaction was recorded in ${sourceLabel}. Required customer outreach was not completed inside the configured response window, increasing the probability of conversion loss.`;
  }

  if (isManualUpload(record)) {
    return `The ${directionLabel} interaction was uploaded into the platform through ${sourceLabel}. Transcript extraction and structured classification have not been completed yet, so the recording remains in the review queue for initial inspection.`;
  }

  return `The ${directionLabel} interaction was captured in ${sourceLabel}. The caller demonstrated booking intent, but no confirmed booking or follow-up activity was recorded after the initial contact.`;
}

function getNextStep(
  record: SupabaseCallRecord,
  statusLabel: DashboardCallRow["status"],
  category: CallTabId,
  analysis?: SupabaseAnalysisRecord | null
) {
  if (analysis?.analysis_status === "completed" && analysis.recommended_action?.trim()) {
    return analysis.recommended_action.trim();
  }

  if (!analysis || analysis.analysis_status !== "completed") {
    return "Await structured analysis completion and verify the interaction outcome.";
  }

  if (statusLabel === "Resolved") {
    return "Confirm appointment metadata and archive the interaction record.";
  }

  if (category === "delayed-response") {
    return "Validate response timestamps and assign accountable follow-up ownership.";
  }

  if (statusLabel === "Escalated") {
    return "Escalate to operations leadership and schedule next-available callback.";
  }

  if (isManualUpload(record)) {
    return "Inspect the uploaded recording and complete the initial interaction classification.";
  }

  return "Inspect the interaction record and initiate same-day outbound contact.";
}

function getNoteMeta(
  record: SupabaseCallRecord,
  statusLabel: DashboardCallRow["status"],
  category: CallTabId,
  analysis?: SupabaseAnalysisRecord | null
) {
  const directionLabel = record.direction === "outbound" ? "Outbound" : "Inbound";

  if (analysis?.analysis_status === "completed") {
    return {
      noteTop: `Intent ${getAnalysisIntentLabel(analysis)} • Outcome ${getAnalysisOutcomeLabel(analysis)}`,
      noteBottom: analysis.analyst_note?.trim() || getMissedOpportunityLabel(analysis)
    };
  }

  if (!analysis || analysis.analysis_status !== "completed") {
    return {
      noteTop: "Structured analysis pending -",
      noteBottom: "awaiting classification"
    };
  }

  if (statusLabel === "Resolved") {
    return {
      noteTop: "Booking intent recovered -",
      noteBottom: "appointment confirmed"
    };
  }

  if (category === "delayed-response") {
    return {
      noteTop: "Response window exceeded -",
      noteBottom: "conversion risk elevated"
    };
  }

  if ((record.source_system ?? "").toLowerCase().includes("voicemail")) {
    return {
      noteTop: "Voicemail request unattended -",
      noteBottom: "no same-day response"
    };
  }

  if (isManualUpload(record)) {
    return {
      noteTop: "Manual upload received -",
      noteBottom: "awaiting classification"
    };
  }

  return {
    noteTop: `${directionLabel} recording captured -`,
    noteBottom: "no outbound contact"
  };
}

function getNotes(record: SupabaseCallRecord, analysis?: SupabaseAnalysisRecord | null) {
  const sourceLabel = formatDisplayLabel(record.source_system, "Telephony Platform");
  const recordingLabel = record.recording_filename ?? "recording metadata unavailable";

  const notes = [`Imported from ${sourceLabel} using source file ${recordingLabel}.`];

  if (analysis?.analysis_status === "completed") {
    notes.unshift(
      `Intent Level: ${getAnalysisIntentLabel(analysis)}`,
      `Call Outcome: ${getAnalysisOutcomeLabel(analysis)}`,
      `Missed Opportunity: ${getMissedOpportunityLabel(analysis)}`
    );

    if (analysis.analyst_note?.trim()) {
      notes.unshift(analysis.analyst_note.trim());
    }
  } else if (!analysis || analysis.analysis_status !== "completed") {
    notes.unshift("Structured analysis is pending for this interaction.");
  }

  return notes;
}

function getDueBy(startedAt: string, statusLabel: DashboardCallRow["status"], category: CallTabId) {
  if (statusLabel === "Resolved") return "Completed";
  if (statusLabel === "Escalated") return "Immediate";

  const dueAt = new Date(startedAt);
  dueAt.setHours(dueAt.getHours() + (category === "delayed-response" ? 6 : 4));

  return `${weekdayFormatter.format(dueAt)} • ${timeFormatter.format(dueAt)}`;
}

function getPeriodByRange(startedAt: string): Record<DateRangeKey, string> {
  const date = new Date(startedAt);
  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / dayMs));
  const weeklyBucket = Math.max(1, 5 - Math.floor(diffDays / 7));

  return {
    "7d": weekdayFormatter.format(date),
    "30d": `W${Math.min(5, weeklyBucket)}`,
    "90d": monthFormatter.format(date)
  };
}

export function mapSupabaseCallToDashboardRow(
  record: SupabaseCallRecord,
  analysis: SupabaseAnalysisRecord | null = null
): DashboardCallRow {
  const status = getStatusLabel(record.status);
  const category = getCategory(record, status, analysis);
  const currencyCode = record.currency_code ?? "GBP";
  const isMissedCallRecoveryCase = isTwilioMissedInboundRecoveryRecord(record, analysis);
  const revenueValue = getRevenueImpactValue(record, analysis);
  const resolvedRevenueValue =
    isMissedCallRecoveryCase && revenueValue <= 0 ? defaultMissedCallRecoveryRevenueValue : revenueValue;
  const { urgency, urgencyTone } = getUrgency(status);
  const analysisPending = !analysis || analysis.analysis_status !== "completed";
  const intentLevel = getAnalysisIntentLabel(analysis);
  const callOutcome = isMissedCallRecoveryCase ? "No Callback" : getAnalysisOutcomeLabel(analysis);
  const missedOpportunityLabel = isMissedCallRecoveryCase ? "Yes" : getMissedOpportunityLabel(analysis);
  const primaryIssue = isMissedCallRecoveryCase
    ? "Missed inbound call"
    : getPrimaryIssueLabel(analysis, getReason(record, status, category));
  const actionStatus = getActionStatus(status, analysis);
  const { noteTop, noteBottom } = getNoteMeta(record, status, category, analysis);
  const conciseAnalystNote = getConciseAnalystNote(record, actionStatus, primaryIssue, analysis);
  const recoveryWorkflowStatusLabel: NonNullable<DashboardCallRow["workflowStatusLabel"]> =
    status === "Resolved"
      ? "Resolved"
      : status === "Escalated"
        ? "Escalated"
        : status === "Under Review"
          ? "Follow-Up Sent"
          : "Action Required";
  const recoverySummary =
    recoveryWorkflowStatusLabel === "Follow-Up Sent"
      ? "The inbound Twilio forwarding attempt did not connect, and an automatic follow-up SMS has been initiated. The case is now waiting for callback completion and booking confirmation."
      : recoveryWorkflowStatusLabel === "Escalated"
        ? "The inbound Twilio forwarding attempt did not connect and the case has been escalated for immediate recovery handling."
        : `The inbound call reached the Twilio forwarding workflow, but the forwarded destination did not connect. Orvelle has placed the enquiry into the missed call recovery queue for callback action.`;
  const recoveryNextStep =
    recoveryWorkflowStatusLabel === "Follow-Up Sent"
      ? "Await callback response and complete a recovery callback."
      : recoveryWorkflowStatusLabel === "Escalated"
        ? "Escalate to manager and complete a priority recovery callback."
        : "Send follow-up and complete a recovery callback.";
  const recoveryAction =
    recoveryWorkflowStatusLabel === "Follow-Up Sent"
      ? "Automatic recovery SMS has been sent. Complete an outbound callback within the active recovery window and record the booking outcome."
      : recoveryWorkflowStatusLabel === "Escalated"
        ? "Immediate management escalation required. Complete a same-window recovery callback and capture the commercial outcome."
        : "Immediate outbound recovery required. The inbound caller did not reach a connected destination and should receive a callback within the active recovery window.";
  const recoveryNotes = [
    "Inbound Twilio forwarding attempt did not connect to the destination number.",
    `Caller: ${record.caller_phone ?? "Unknown number"}`,
    `Forwarding source: ${formatDisplayLabel(record.source_system, "Twilio")}`
  ];

  if (recoveryWorkflowStatusLabel === "Follow-Up Sent") {
    recoveryNotes.unshift("Automatic follow-up SMS initiated from the Twilio missed-call workflow.");
  }

  if (recoveryWorkflowStatusLabel === "Escalated") {
    recoveryNotes.unshift("Recovery case escalated after the missed forwarding attempt.");
  }

  return {
    id: record.id,
    externalId: record.external_id,
    caller: record.caller_name,
    time: formatRelativeTime(record.started_at),
    issue: isMissedCallRecoveryCase ? "Missed call recovery queue" : getIssue(record, status, analysis),
    reason: primaryIssue,
    recommendedAction:
      isMissedCallRecoveryCase
        ? recoveryAction
        : isManualUpload(record) && status !== "Resolved"
        ? "Manual inspection required. The recording has been uploaded successfully, but transcript extraction and structured analysis have not yet been completed. Review the interaction and assign an operational classification."
        : getRecommendedAction(status, category, analysis),
    status,
    actionStatus,
    statusTone: getStatusTone(status),
    urgency,
    urgencyTone,
    assignedOwner: formatDisplayLabel(record.assigned_owner, "Unassigned"),
    dueBy: getDueBy(record.started_at, status, category),
    responseDelayHours: getResponseDelayHours(status, category),
    revenue: formatCurrency(resolvedRevenueValue, currencyCode),
    revenueValue: resolvedRevenueValue,
    noteTop: isMissedCallRecoveryCase ? "Inbound call missed -" : noteTop,
    noteBottom:
      isMissedCallRecoveryCase && recoveryWorkflowStatusLabel === "Follow-Up Sent"
        ? "follow-up sent"
        : isMissedCallRecoveryCase
          ? "follow-up required"
          : noteBottom,
    category,
    periodByRange: getPeriodByRange(record.started_at),
    phone: record.caller_phone ?? "Phone number placeholder",
    date: formatCallTimestamp(record.started_at),
    summary: isMissedCallRecoveryCase ? recoverySummary : getSummary(record, status, category, analysis),
    nextStep: isMissedCallRecoveryCase ? recoveryNextStep : getNextStep(record, status, category, analysis),
    notes: isMissedCallRecoveryCase ? recoveryNotes : getNotes(record, analysis),
    analysisPending,
    analysisStatus: analysis?.analysis_status ?? undefined,
    intentLevel,
    callOutcome,
    missedOpportunityLabel,
    missedOpportunityDetected: isMissedCallRecoveryCase ? true : analysis?.missed_opportunity ?? null,
    primaryIssue,
    revenueImpact: formatCurrency(resolvedRevenueValue, currencyCode),
    revenueImpactValue: resolvedRevenueValue,
    analystNote: isMissedCallRecoveryCase
      ? recoveryWorkflowStatusLabel === "Follow-Up Sent"
        ? "Automatic follow-up SMS sent and callback completion is still required."
        : recoveryWorkflowStatusLabel === "Escalated"
          ? "Forwarded Twilio call was not answered and the recovery case has been escalated."
          : "Forwarded Twilio call was not answered and requires follow-up."
      : conciseAnalystNote,
    conciseAnalystNote: isMissedCallRecoveryCase
      ? recoveryWorkflowStatusLabel === "Follow-Up Sent"
        ? "Automatic SMS sent; callback still required."
        : recoveryWorkflowStatusLabel === "Escalated"
          ? "Missed forwarded call escalated for urgent handling."
          : "Forwarded Twilio call was not answered."
      : conciseAnalystNote,
    startedAtRaw: record.started_at,
    updatedAtRaw: record.updated_at,
    direction: record.direction,
    recordingFilename: record.recording_filename,
    sourceSystem: record.source_system,
    workflowStatusLabel: isMissedCallRecoveryCase ? recoveryWorkflowStatusLabel : undefined,
    recoveryOutcomeLabel: isMissedCallRecoveryCase ? "Pending" : undefined,
    recoveredValue: isMissedCallRecoveryCase ? 0 : undefined,
    resolutionReason: isMissedCallRecoveryCase ? null : undefined,
    bookingCreated: isMissedCallRecoveryCase ? null : undefined
  };
}

export function isMissedCallRecoveryCandidate(row: DashboardCallRow) {
  if (row.id.startsWith("missed-call-")) {
    return true;
  }

  return row.direction === "inbound" && Boolean(row.workflowStatusLabel);
}

export function buildMissedCallRecoveryRows(rows: DashboardCallRow[]) {
  return rows
    .filter(isMissedCallRecoveryCandidate)
    .sort((left, right) => {
      const revenueDelta = right.revenueValue - left.revenueValue;
      if (revenueDelta !== 0) {
        return revenueDelta;
      }

      return new Date(right.startedAtRaw).getTime() - new Date(left.startedAtRaw).getTime();
    });
}

export function isWithinDateRange(startedAt: string, range: DateRangeKey) {
  const startedAtDate = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - startedAtDate.getTime();

  if (diffMs < 0) {
    return false;
  }

  const diffDays = diffMs / dayMs;

  if (range === "7d") return diffDays <= 7;
  if (range === "30d") return diffDays <= 30;

  return diffDays <= 90;
}

export function buildTrendData(rows: DashboardCallRow[], range: DateRangeKey) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const label = row.periodByRange[range];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  if (range === "7d") {
    const labels = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return weekdayFormatter.format(date);
    });

    return labels.map((label) => ({ label, value: counts.get(label) ?? 0 }));
  }

  if (range === "30d") {
    return ["W1", "W2", "W3", "W4", "W5"].map((label) => ({
      label,
      value: counts.get(label) ?? 0
    }));
  }

  const labels = Array.from({ length: 3 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (2 - index));
    return monthFormatter.format(date);
  });

  return labels.map((label) => ({ label, value: counts.get(label) ?? 0 }));
}

export function getLastUpdatedLabel(rows: DashboardCallRow[]) {
  const latestUpdatedAt = rows
    .map((row) => row.updatedAtRaw)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

  if (!latestUpdatedAt) {
    return "No recent updates";
  }

  const diffMs = Date.now() - new Date(latestUpdatedAt).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes === 1) return "1 minute ago";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}
