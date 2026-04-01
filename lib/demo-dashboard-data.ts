import type { DateRangeKey } from "@/lib/analysis-window";
import type { DashboardCallRow } from "@/lib/dashboard-calls";
import type { CallRecordDetail } from "@/lib/call-detail";

type MetricSnapshot = {
  missedRevenue: number;
  highIntentMissedCalls: number;
  recoveryRate: number;
  callsAnalysed: number;
};

type TrendPoint = {
  label: string;
  value: number;
};

function createDemoRow(row: DashboardCallRow): DashboardCallRow {
  return row;
}

export const demoDashboardMetricSnapshot: MetricSnapshot = {
  missedRevenue: 2480,
  highIntentMissedCalls: 7,
  recoveryRate: 18,
  callsAnalysed: 42
};

export const demoTrendByRange: Record<DateRangeKey, TrendPoint[]> = {
  "7d": [
    { label: "Thu", value: 180 },
    { label: "Fri", value: 420 },
    { label: "Sat", value: 260 },
    { label: "Sun", value: 540 },
    { label: "Mon", value: 760 },
    { label: "Tue", value: 320 },
    { label: "Wed", value: 420 }
  ],
  "30d": [
    { label: "W1", value: 680 },
    { label: "W2", value: 520 },
    { label: "W3", value: 860 },
    { label: "W4", value: 740 },
    { label: "W5", value: 910 }
  ],
  "90d": [
    { label: "Feb", value: 1280 },
    { label: "Mar", value: 1740 },
    { label: "Apr", value: 2480 }
  ]
};

export const demoDashboardRows: DashboardCallRow[] = [
  createDemoRow({
    id: "demo-emma-clarke",
    caller: "Emma Clarke",
    time: "Today",
    issue: "Estimated revenue leakage",
    reason: "High purchase intent, no booking",
    recommendedAction:
      "Urgent callback required. Customer asked for immediate availability and demonstrated strong intent to book. Review the call notes and attempt to secure the appointment on the first return call.",
    status: "Action Required",
    actionStatus: "Needs Action",
    statusTone: "critical",
    urgency: "Critical Priority",
    urgencyTone: "critical",
    assignedOwner: "S. Patel",
    dueBy: "Today • 16:30",
    responseDelayHours: 5.8,
    revenue: "£760",
    revenueValue: 760,
    noteTop: "High purchase intent -",
    noteBottom: "no booking completed",
    category: "missed-booking",
    periodByRange: { "7d": "Mon", "30d": "W5", "90d": "Apr" },
    phone: "+44 7700 900101",
    date: "April 1, 2026 • 9:18 AM",
    summary:
      "Emma called to book a same-week service visit, confirmed budget, and asked whether an engineer could be dispatched quickly. The conversation ended without a booking attempt or documented callback.",
    nextStep: "Call immediately, confirm availability, and capture the booking while purchase intent remains high.",
    notes: ["No booking step was initiated after the caller asked for next-available service."],
    analysisPending: false,
    analysisStatus: "completed",
    intentLevel: "High",
    callOutcome: "Missed Opportunity",
    missedOpportunityLabel: "Yes",
    missedOpportunityDetected: true,
    primaryIssue: "High purchase intent, no booking",
    revenueImpact: "£760",
    revenueImpactValue: 760,
    analystNote:
      "Customer was prepared to move forward during the initial call. Immediate commercial recovery is recommended.",
    conciseAnalystNote: "Prepared to buy; no booking attempt recorded.",
    startedAtRaw: "2026-04-01T09:18:00Z",
    updatedAtRaw: "2026-04-01T12:15:00Z",
    externalId: "ORV-DEMO-001",
    direction: "inbound",
    recordingFilename: "2026-04-01_emma-clarke_inbound.wav",
    sourceSystem: "Aircall"
  }),
  createDemoRow({
    id: "demo-laura-bennett",
    caller: "Laura Bennett",
    time: "Today",
    issue: "Estimated revenue leakage",
    reason: "Quote requested, no follow-up",
    recommendedAction:
      "High-priority callback required. Laura asked for a quote and expected next-step confirmation. Follow up today, confirm pricing, and push the job back into an active sales workflow.",
    status: "Action Required",
    actionStatus: "Needs Action",
    statusTone: "critical",
    urgency: "Critical Priority",
    urgencyTone: "critical",
    assignedOwner: "J. Mercer",
    dueBy: "Today • 17:00",
    responseDelayHours: 4.4,
    revenue: "£540",
    revenueValue: 540,
    noteTop: "Quote requested -",
    noteBottom: "no follow-up scheduled",
    category: "missed-booking",
    periodByRange: { "7d": "Sun", "30d": "W4", "90d": "Apr" },
    phone: "+44 7700 900102",
    date: "April 1, 2026 • 8:42 AM",
    summary:
      "The caller requested a quote for a priority service job and asked for confirmation later the same day. No outbound follow-up or quote delivery was recorded.",
    nextStep: "Reconnect today, confirm the quote, and recover the pending job before the customer moves on.",
    notes: ["Quote was discussed but never sent from the inbound workflow."],
    analysisPending: false,
    analysisStatus: "completed",
    intentLevel: "High",
    callOutcome: "Follow-up Needed",
    missedOpportunityLabel: "Yes",
    missedOpportunityDetected: true,
    primaryIssue: "Quote requested, no follow-up",
    revenueImpact: "£540",
    revenueImpactValue: 540,
    analystNote: "High-value quote path stalled after the first call.",
    conciseAnalystNote: "Quote discussed; follow-up never completed.",
    startedAtRaw: "2026-04-01T08:42:00Z",
    updatedAtRaw: "2026-04-01T11:30:00Z",
    externalId: "ORV-DEMO-002",
    direction: "inbound",
    recordingFilename: "2026-04-01_laura-bennett_inbound.mp3",
    sourceSystem: "Twilio"
  }),
  createDemoRow({
    id: "demo-sarah-thompson",
    caller: "Sarah Thompson",
    time: "1 hour ago",
    issue: "Estimated revenue leakage",
    reason: "No callback made",
    recommendedAction:
      "Call immediately. Sarah requested a callback to confirm availability and no return contact was logged inside the same business day.",
    status: "Action Required",
    actionStatus: "Needs Action",
    statusTone: "critical",
    urgency: "Critical Priority",
    urgencyTone: "critical",
    assignedOwner: "A. Howard",
    dueBy: "Today • 15:45",
    responseDelayHours: 6.1,
    revenue: "£420",
    revenueValue: 420,
    noteTop: "Callback promised -",
    noteBottom: "no return contact",
    category: "delayed-response",
    periodByRange: { "7d": "Wed", "30d": "W5", "90d": "Apr" },
    phone: "+44 7700 900103",
    date: "April 1, 2026 • 1:22 PM",
    summary:
      "Sarah requested an urgent callback after confirming the issue and expected a same-day response. No callback completion was documented.",
    nextStep: "Call immediately, confirm service timing, and move the opportunity back toward conversion.",
    notes: ["No completed callback event recorded after the inbound enquiry."],
    analysisPending: false,
    analysisStatus: "completed",
    intentLevel: "High",
    callOutcome: "No Callback",
    missedOpportunityLabel: "Yes",
    missedOpportunityDetected: true,
    primaryIssue: "No callback made",
    revenueImpact: "£420",
    revenueImpactValue: 420,
    analystNote: "Strong intent with zero recorded follow-up.",
    conciseAnalystNote: "High-intent caller received no callback.",
    startedAtRaw: "2026-04-01T13:22:00Z",
    updatedAtRaw: "2026-04-01T14:40:00Z",
    externalId: "ORV-DEMO-003",
    direction: "inbound",
    recordingFilename: "2026-04-01_sarah-thompson_inbound.wav",
    sourceSystem: "RingCentral"
  }),
  createDemoRow({
    id: "demo-michael-reed",
    caller: "Michael Reed",
    time: "4 hours ago",
    issue: "Estimated revenue leakage",
    reason: "Poor handling on inbound enquiry",
    recommendedAction:
      "Review the interaction and call back. The caller showed interest, but the handling quality likely reduced conversion confidence before the enquiry was closed.",
    status: "Under Review",
    actionStatus: "Needs Action",
    statusTone: "pending",
    urgency: "Elevated Priority",
    urgencyTone: "pending",
    assignedOwner: "K. Ellis",
    dueBy: "Today • 18:00",
    responseDelayHours: 3.7,
    revenue: "£320",
    revenueValue: 320,
    noteTop: "Handling quality issue -",
    noteBottom: "callback recommended",
    category: "missed-booking",
    periodByRange: { "7d": "Tue", "30d": "W4", "90d": "Apr" },
    phone: "+44 7700 900104",
    date: "April 1, 2026 • 10:14 AM",
    summary:
      "Michael’s inbound enquiry did not progress cleanly. The customer asked clarifying questions about availability and pricing, but the call handling reduced confidence and no recovery action followed.",
    nextStep: "Review the call quality issue, then call back with a clearer booking offer.",
    notes: ["Conversation quality created hesitation and no resolution path was offered."],
    analysisPending: false,
    analysisStatus: "completed",
    intentLevel: "Medium",
    callOutcome: "Poor Handling",
    missedOpportunityLabel: "Yes",
    missedOpportunityDetected: true,
    primaryIssue: "Poor handling on inbound enquiry",
    revenueImpact: "£320",
    revenueImpactValue: 320,
    analystNote: "Opportunity weakened by poor agent handling rather than lack of intent.",
    conciseAnalystNote: "Handling issue likely drove conversion loss.",
    startedAtRaw: "2026-04-01T10:14:00Z",
    updatedAtRaw: "2026-04-01T12:05:00Z",
    externalId: "ORV-DEMO-004",
    direction: "inbound",
    recordingFilename: "2026-04-01_michael-reed_inbound.mp3",
    sourceSystem: "Twilio"
  }),
  createDemoRow({
    id: "demo-john-davies",
    caller: "John Davies",
    time: "Yesterday",
    issue: "Estimated revenue leakage",
    reason: "Missed during business hours",
    recommendedAction:
      "Follow up today. The call landed during staffed hours and the customer did not receive a timely response or routing outcome.",
    status: "Under Review",
    actionStatus: "Needs Action",
    statusTone: "pending",
    urgency: "Elevated Priority",
    urgencyTone: "pending",
    assignedOwner: "R. Singh",
    dueBy: "Today • 14:00",
    responseDelayHours: 2.6,
    revenue: "£180",
    revenueValue: 180,
    noteTop: "Missed in hours -",
    noteBottom: "follow-up still required",
    category: "delayed-response",
    periodByRange: { "7d": "Fri", "30d": "W3", "90d": "Mar" },
    phone: "+44 7700 900105",
    date: "March 31, 2026 • 11:09 AM",
    summary:
      "John called during business hours to request assistance, but the enquiry was not answered cleanly and no documented callback path was completed.",
    nextStep: "Return the call today and recover the opportunity before it ages out.",
    notes: ["Call landed during staffed time but did not convert into an active follow-up."],
    analysisPending: false,
    analysisStatus: "completed",
    intentLevel: "Medium",
    callOutcome: "Follow-up Needed",
    missedOpportunityLabel: "Yes",
    missedOpportunityDetected: true,
    primaryIssue: "Missed during business hours",
    revenueImpact: "£180",
    revenueImpactValue: 180,
    analystNote: "Response workflow failed during normal operating hours.",
    conciseAnalystNote: "Missed in business hours; callback overdue.",
    startedAtRaw: "2026-03-31T11:09:00Z",
    updatedAtRaw: "2026-03-31T15:12:00Z",
    externalId: "ORV-DEMO-005",
    direction: "inbound",
    recordingFilename: "2026-03-31_john-davies_inbound.wav",
    sourceSystem: "Aircall"
  }),
  createDemoRow({
    id: "demo-olivia-harris",
    caller: "Olivia Harris",
    time: "Yesterday",
    issue: "Estimated revenue leakage",
    reason: "Follow-up needed after dispatch query",
    recommendedAction:
      "Confirm the next available appointment and close the loop with the customer today.",
    status: "Under Review",
    actionStatus: "Needs Action",
    statusTone: "pending",
    urgency: "Elevated Priority",
    urgencyTone: "pending",
    assignedOwner: "C. Doyle",
    dueBy: "Tomorrow • 09:00",
    responseDelayHours: 2.1,
    revenue: "£260",
    revenueValue: 260,
    noteTop: "Dispatch query open -",
    noteBottom: "follow-up outstanding",
    category: "delayed-response",
    periodByRange: { "7d": "Tue", "30d": "W4", "90d": "Mar" },
    phone: "+44 7700 900106",
    date: "March 31, 2026 • 3:26 PM",
    summary:
      "Olivia requested dispatch timing for a booked service window, but a clear next step was not confirmed and the callback remained pending.",
    nextStep: "Reconnect with dispatch availability and secure the appointment slot.",
    notes: ["Call required a clearer ownership handoff to dispatch."],
    analysisPending: false,
    analysisStatus: "completed",
    intentLevel: "Medium",
    callOutcome: "Follow-up Needed",
    missedOpportunityLabel: "Yes",
    missedOpportunityDetected: true,
    primaryIssue: "Follow-up needed after dispatch query",
    revenueImpact: "£260",
    revenueImpactValue: 260,
    analystNote: "Opportunity still recoverable with a fast operational follow-up.",
    conciseAnalystNote: "Dispatch-related callback still pending.",
    startedAtRaw: "2026-03-31T15:26:00Z",
    updatedAtRaw: "2026-03-31T16:45:00Z",
    externalId: "ORV-DEMO-006",
    direction: "inbound",
    recordingFilename: "2026-03-31_olivia-harris_inbound.m4a",
    sourceSystem: "RingCentral"
  }),
  createDemoRow({
    id: "demo-daniel-foster",
    caller: "Daniel Foster",
    time: "2 days ago",
    issue: "Revenue reinstated",
    reason: "Recovered booking",
    recommendedAction:
      "No further action required. The missed opportunity was successfully recovered and the booking has been confirmed.",
    status: "Resolved",
    actionStatus: "No Action Needed",
    statusTone: "recovered",
    urgency: "Closed",
    urgencyTone: "recovered",
    assignedOwner: "L. Mercer",
    dueBy: "Completed",
    responseDelayHours: 1.2,
    revenue: "£390",
    revenueValue: 390,
    noteTop: "Recovered booking -",
    noteBottom: "appointment confirmed",
    category: "original-bookings",
    periodByRange: { "7d": "Sat", "30d": "W2", "90d": "Mar" },
    phone: "+44 7700 900107",
    date: "March 30, 2026 • 4:05 PM",
    summary:
      "Daniel’s original enquiry was at risk, but outbound remediation successfully recovered the booking and the call can remain archived for audit reference.",
    nextStep: "No next step required.",
    notes: ["Recovery outreach completed and appointment confirmed."],
    analysisPending: false,
    analysisStatus: "completed",
    intentLevel: "High",
    callOutcome: "Converted",
    missedOpportunityLabel: "No",
    missedOpportunityDetected: false,
    primaryIssue: "Recovered booking",
    revenueImpact: "£390",
    revenueImpactValue: 390,
    analystNote: "Recovered conversion; keep for reporting.",
    conciseAnalystNote: "Recovered and closed.",
    startedAtRaw: "2026-03-30T16:05:00Z",
    updatedAtRaw: "2026-03-30T17:20:00Z",
    externalId: "ORV-DEMO-007",
    direction: "inbound",
    recordingFilename: "2026-03-30_daniel-foster_inbound.wav",
    sourceSystem: "Twilio"
  }),
  createDemoRow({
    id: "demo-priya-patel",
    caller: "Priya Patel",
    time: "3 days ago",
    issue: "No revenue opportunity detected",
    reason: "Unqualified lead",
    recommendedAction:
      "No commercial recovery required. The enquiry did not meet fit or timing criteria for the service workflow.",
    status: "Resolved",
    actionStatus: "No Action Needed",
    statusTone: "recovered",
    urgency: "Closed",
    urgencyTone: "recovered",
    assignedOwner: "M. Clarke",
    dueBy: "Completed",
    responseDelayHours: 0.9,
    revenue: "£0",
    revenueValue: 0,
    noteTop: "Lead disqualified -",
    noteBottom: "no recovery needed",
    category: "original-bookings",
    periodByRange: { "7d": "Thu", "30d": "W1", "90d": "Mar" },
    phone: "+44 7700 900108",
    date: "March 29, 2026 • 12:48 PM",
    summary:
      "Priya’s enquiry did not align with the business’s operating area and service criteria. No missed revenue opportunity was detected.",
    nextStep: "No next step required.",
    notes: ["Customer location and service need fell outside qualification rules."],
    analysisPending: false,
    analysisStatus: "completed",
    intentLevel: "Low",
    callOutcome: "Unqualified",
    missedOpportunityLabel: "No",
    missedOpportunityDetected: false,
    primaryIssue: "Unqualified lead",
    revenueImpact: "£0",
    revenueImpactValue: 0,
    analystNote: "Correctly filtered out from recovery queue.",
    conciseAnalystNote: "Unqualified; no action required.",
    startedAtRaw: "2026-03-29T12:48:00Z",
    updatedAtRaw: "2026-03-29T13:12:00Z",
    externalId: "ORV-DEMO-008",
    direction: "inbound",
    recordingFilename: "2026-03-29_priya-patel_inbound.mp3",
    sourceSystem: "Manual Upload"
  })
];

export function shouldUseDemoDashboardData(rows: DashboardCallRow[]) {
  const actionReadyRows = rows.filter((row) => row.revenueValue > 0).length;
  return rows.length < 8 || actionReadyRows < 5;
}

export function getDemoCallRecordView(id: string): { row: DashboardCallRow; detail: CallRecordDetail } | null {
  const row = demoDashboardRows.find((entry) => entry.id === id);

  if (!row) {
    return null;
  }

  const detail: CallRecordDetail = {
    subtitle:
      row.callOutcome === "Converted"
        ? "Recovered Revenue Opportunity"
        : row.category === "delayed-response"
          ? "Response Workflow Recovery"
          : "Missed Revenue Opportunity",
    duration: row.callOutcome === "No Callback" ? "4m 22s" : row.callOutcome === "Converted" ? "5m 11s" : "3m 48s",
    revenueContext:
      row.revenueValue > 0
        ? "Estimated revenue impact is based on the projected booking value associated with the original customer intent and the missed operational follow-up."
        : "Current analysis indicates no revenue recovery opportunity is associated with this call.",
    transcriptPending: false,
    analysisPending: false,
    transcript: [
      {
        speaker: "Caller",
        time: "00:06",
        text: `${row.caller} contacted the business with a clear service need and expected guidance on next steps.`
      },
      {
        speaker: "Agent",
        time: "00:34",
        text: "The initial handling acknowledged the request, but the workflow did not progress cleanly into booking or confirmed follow-up."
      },
      {
        speaker: "System",
        time: "03:48",
        text: row.recommendedAction
      }
    ],
    issues: [
      {
        title: "Primary Issue",
        description: row.primaryIssue ?? row.reason
      },
      {
        title: "Intent Assessment",
        description: `Intent level assessed as ${row.intentLevel ?? "Medium"}. Call outcome classified as ${row.callOutcome ?? "Needs review"}.`
      },
      {
        title: "Opportunity Status",
        description:
          row.missedOpportunityLabel === "No"
            ? "Current analysis indicates this interaction does not require revenue recovery."
            : "Current analysis indicates this interaction should remain in the recovery workflow."
      }
    ],
    analysisSummary: {
      intentLevel: row.intentLevel ?? "Medium",
      callOutcome: row.callOutcome ?? "Needs review",
      missedOpportunity: row.missedOpportunityLabel === "No" ? "Not Detected" : "Detected",
      revenueImpact: row.revenueImpact ?? row.revenue,
      primaryIssue: row.primaryIssue ?? row.reason,
      confidenceScore: "93.8%",
      callOutcomeTone:
        row.callOutcome === "Converted"
          ? "success"
          : row.callOutcome === "Unqualified"
            ? "warning"
            : "critical",
      missedOpportunityTone: row.missedOpportunityLabel === "No" ? "success" : "critical"
    }
  };

  return { row, detail };
}
