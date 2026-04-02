import type { DashboardCallRow } from "@/lib/dashboard-calls";

export type MissedCallWorkflowStatus = NonNullable<DashboardCallRow["workflowStatusLabel"]>;
export type MissedCallRecoveryOutcome = NonNullable<DashboardCallRow["recoveryOutcomeLabel"]>;
export type MissedCallHistoryEventType =
  | "missed_call_detected"
  | "follow_up_sent"
  | "escalated"
  | "resolved"
  | "note_added";

export type MissedCallHistoryEntry = {
  id: string;
  type: MissedCallHistoryEventType;
  title: string;
  detail: string;
  timestamp: string;
};

type MissedCallWorkflowOverride = Pick<
  DashboardCallRow,
  | "workflowStatusLabel"
  | "status"
  | "statusTone"
  | "urgency"
  | "urgencyTone"
  | "dueBy"
  | "nextStep"
  | "recommendedAction"
  | "assignedOwner"
  | "actionStatus"
  | "callOutcome"
  | "missedOpportunityLabel"
  | "missedOpportunityDetected"
  | "revenueImpact"
  | "revenueImpactValue"
  | "analystNote"
  | "conciseAnalystNote"
  | "recoveryOutcomeLabel"
  | "recoveredValue"
  | "resolutionReason"
  | "bookingCreated"
  | "updatedAtRaw"
  | "notes"
>;

const STORAGE_KEY = "orvelle.missed-call-workflow";
const AUDIT_PREFIX = "__AUDIT__";

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatDisplayTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function readStoredOverrides() {
  if (typeof window === "undefined") {
    return {} as Record<string, MissedCallWorkflowOverride>;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return {} as Record<string, MissedCallWorkflowOverride>;
    }

    const parsed = JSON.parse(rawValue) as Record<string, MissedCallWorkflowOverride>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {} as Record<string, MissedCallWorkflowOverride>;
  }
}

function writeStoredOverrides(overrides: Record<string, MissedCallWorkflowOverride>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function createNoteList(row: DashboardCallRow, note: string) {
  return row.notes.includes(note) ? row.notes : [note, ...row.notes];
}

function formatAuditTitle(type: MissedCallHistoryEventType) {
  switch (type) {
    case "missed_call_detected":
      return "Missed call detected";
    case "follow_up_sent":
      return "Follow-up sent";
    case "escalated":
      return "Case escalated";
    case "resolved":
      return "Marked resolved";
    case "note_added":
      return "Note added";
    default:
      return "Workflow event";
  }
}

function createAuditEntry(
  type: MissedCallHistoryEventType,
  detail: string,
  timestamp = new Date().toISOString()
) {
  return `${AUDIT_PREFIX}|${type}|${timestamp}|${detail}`;
}

function parseAuditEntry(note: string): MissedCallHistoryEntry | null {
  if (!note.startsWith(`${AUDIT_PREFIX}|`)) {
    return null;
  }

  const [, type, timestamp, ...detailParts] = note.split("|");
  const detail = detailParts.join("|").trim();

  if (!type || !timestamp || !detail) {
    return null;
  }

  return {
    id: `${type}-${timestamp}-${detail}`,
    type: type as MissedCallHistoryEventType,
    title: formatAuditTitle(type as MissedCallHistoryEventType),
    detail,
    timestamp
  };
}

function buildSyntheticHistoryEntry(
  type: MissedCallHistoryEventType,
  detail: string,
  timestamp: string
): MissedCallHistoryEntry {
  return {
    id: `${type}-${timestamp}-${detail}`,
    type,
    title: formatAuditTitle(type),
    detail,
    timestamp
  };
}

function hasHistoryType(entries: MissedCallHistoryEntry[], type: MissedCallHistoryEventType) {
  return entries.some((entry) => entry.type === type);
}

export function isMissedCallRecoveryRecord(rowOrId: DashboardCallRow | string) {
  if (typeof rowOrId === "string") {
    return rowOrId.startsWith("missed-call-");
  }

  return rowOrId.id.startsWith("missed-call-") || Boolean(rowOrId.workflowStatusLabel && rowOrId.direction === "inbound");
}

export function buildMissedCallHistory(row: DashboardCallRow): MissedCallHistoryEntry[] {
  const parsedEntries = row.notes
    .map((note) => parseAuditEntry(note))
    .filter((entry): entry is MissedCallHistoryEntry => Boolean(entry));

  if (!hasHistoryType(parsedEntries, "missed_call_detected")) {
    parsedEntries.push(
      buildSyntheticHistoryEntry(
        "missed_call_detected",
        `Inbound call entered the recovery workflow from ${row.sourceSystem ?? "the connected call system"}.`,
        row.startedAtRaw
      )
    );
  }

  const workflowStatus = getMissedCallWorkflowStatus(row);
  const outcome = getMissedCallRecoveryOutcome(row);

  if (workflowStatus === "Follow-Up Sent" && !hasHistoryType(parsedEntries, "follow_up_sent")) {
    parsedEntries.push(
      buildSyntheticHistoryEntry(
        "follow_up_sent",
        "Follow-up action was sent and the case remains open pending customer response.",
        row.updatedAtRaw ?? row.startedAtRaw
      )
    );
  }

  if (workflowStatus === "Escalated" && !hasHistoryType(parsedEntries, "escalated")) {
    parsedEntries.push(
      buildSyntheticHistoryEntry(
        "escalated",
        "Case was escalated for immediate recovery handling.",
        row.updatedAtRaw ?? row.startedAtRaw
      )
    );
  }

  if (workflowStatus === "Resolved" && !hasHistoryType(parsedEntries, "resolved")) {
    parsedEntries.push(
      buildSyntheticHistoryEntry(
        "resolved",
        outcome === "Recovered"
          ? "Recovery workflow was completed and a booking was created."
          : "Recovery workflow was completed and the case was closed without a recovered booking.",
        row.updatedAtRaw ?? row.startedAtRaw
      )
    );
  }

  row.notes.forEach((note, index) => {
    if (note.startsWith(`${AUDIT_PREFIX}|`)) {
      return;
    }

    parsedEntries.push({
      id: `legacy-note-${row.id}-${index}`,
      type: "note_added",
      title: formatAuditTitle("note_added"),
      detail: note,
      timestamp: row.updatedAtRaw ?? row.startedAtRaw
    });
  });

  return parsedEntries.sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );
}

export function getOwnerLabelFromAuthUser(
  user:
    | {
        email?: string | null;
        user_metadata?: Record<string, unknown> | null;
      }
    | null
    | undefined
) {
  const fullName = user?.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  const name = user?.user_metadata?.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  const email = user?.email?.trim();
  if (!email) {
    return null;
  }

  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return localPart ? toTitleCase(localPart) : null;
}

export function isMissedCallAssignedToOwner(row: DashboardCallRow, ownerLabel: string | null) {
  if (!ownerLabel?.trim()) {
    return false;
  }

  return row.assignedOwner.trim().toLowerCase() === ownerLabel.trim().toLowerCase();
}

export function isMissedCallUnassigned(row: DashboardCallRow) {
  return row.assignedOwner.trim().toLowerCase() === "unassigned";
}

export function getMissedCallRecoveryOutcome(row: DashboardCallRow): MissedCallRecoveryOutcome {
  if (row.recoveryOutcomeLabel) {
    return row.recoveryOutcomeLabel;
  }

  if (row.bookingCreated === true || row.callOutcome === "Converted") {
    return "Recovered";
  }

  if (getMissedCallWorkflowStatus(row) === "Resolved") {
    return "Not Recovered";
  }

  return "Pending";
}

export function getMissedCallRecoveredValue(row: DashboardCallRow) {
  if (typeof row.recoveredValue === "number") {
    return row.recoveredValue;
  }

  return getMissedCallRecoveryOutcome(row) === "Recovered" ? row.revenueValue : 0;
}

export function getMissedCallResolutionReason(row: DashboardCallRow) {
  if (row.resolutionReason?.trim()) {
    return row.resolutionReason.trim();
  }

  const outcome = getMissedCallRecoveryOutcome(row);

  if (outcome === "Recovered") {
    return "Booking created after recovery follow-up.";
  }

  if (outcome === "Not Recovered") {
    return "Recovery window closed without booking.";
  }

  return "Recovery outcome still pending.";
}

export function getMissedCallBookingCreatedLabel(row: DashboardCallRow) {
  if (row.bookingCreated === true) {
    return "Yes";
  }

  if (row.bookingCreated === false) {
    return "No";
  }

  return getMissedCallRecoveryOutcome(row) === "Pending" ? "Pending" : "No";
}

export function getMissedCallWorkflowStatus(row: DashboardCallRow): MissedCallWorkflowStatus {
  if (row.workflowStatusLabel) {
    return row.workflowStatusLabel;
  }

  if (row.status === "Resolved") {
    return "Resolved";
  }

  if (row.status === "Escalated") {
    return "Escalated";
  }

  return "Action Required";
}

export function getMissedCallDuration(row: DashboardCallRow) {
  if (row.callOutcome === "No Callback") {
    return "4m 22s";
  }

  if (row.callOutcome === "Converted") {
    return "5m 11s";
  }

  return "3m 48s";
}

export function formatMissedCallLastAction(row: DashboardCallRow) {
  if (!row.updatedAtRaw) {
    return row.date;
  }

  return formatDisplayTimestamp(row.updatedAtRaw);
}

export function mergeMissedCallWorkflowRow(row: DashboardCallRow) {
  if (!isMissedCallRecoveryRecord(row)) {
    return row;
  }

  const overrides = readStoredOverrides();
  const override = overrides[row.id];

  if (!override) {
    return row;
  }

  return {
    ...row,
    ...override
  };
}

export function mergeMissedCallWorkflowRows(rows: DashboardCallRow[]) {
  return rows.map((row) => mergeMissedCallWorkflowRow(row));
}

export function addMissedCallWorkflowNote(row: DashboardCallRow, note: string) {
  const baseRow = mergeMissedCallWorkflowRow(row);

  return persistMissedCallWorkflowRow({
    ...baseRow,
    updatedAtRaw: new Date().toISOString(),
    notes: createNoteList(
      baseRow,
      createAuditEntry("note_added", note.trim())
    )
  });
}

export function assignMissedCallWorkflowOwner(row: DashboardCallRow, ownerLabel: string | null) {
  const baseRow = mergeMissedCallWorkflowRow(row);
  const lastActionAt = new Date().toISOString();
  const nextOwner = ownerLabel?.trim() || "Unassigned";
  const detail =
    nextOwner === "Unassigned"
      ? "Case returned to the unassigned recovery queue."
      : `Ownership assigned to ${nextOwner}.`;

  return persistMissedCallWorkflowRow({
    ...baseRow,
    assignedOwner: nextOwner,
    updatedAtRaw: lastActionAt,
    notes: createNoteList(
      baseRow,
      createAuditEntry("note_added", detail, lastActionAt)
    )
  });
}

function persistMissedCallWorkflowRow(row: DashboardCallRow) {
  if (!isMissedCallRecoveryRecord(row)) {
    return row;
  }

  const overrides = readStoredOverrides();
  overrides[row.id] = {
    workflowStatusLabel: getMissedCallWorkflowStatus(row),
    status: row.status,
    statusTone: row.statusTone,
    urgency: row.urgency,
    urgencyTone: row.urgencyTone,
    dueBy: row.dueBy,
    nextStep: row.nextStep,
    recommendedAction: row.recommendedAction,
    assignedOwner: row.assignedOwner,
    actionStatus: row.actionStatus,
    callOutcome: row.callOutcome,
    missedOpportunityLabel: row.missedOpportunityLabel,
    missedOpportunityDetected: row.missedOpportunityDetected,
    revenueImpact: row.revenueImpact,
    revenueImpactValue: row.revenueImpactValue,
    analystNote: row.analystNote,
    conciseAnalystNote: row.conciseAnalystNote,
    recoveryOutcomeLabel: getMissedCallRecoveryOutcome(row),
    recoveredValue: getMissedCallRecoveredValue(row),
    resolutionReason: getMissedCallResolutionReason(row),
    bookingCreated: row.bookingCreated ?? (getMissedCallRecoveryOutcome(row) === "Recovered"),
    updatedAtRaw: row.updatedAtRaw,
    notes: row.notes
  };
  writeStoredOverrides(overrides);

  return row;
}

export function transitionMissedCallWorkflowRow(
  row: DashboardCallRow,
  nextStatus: MissedCallWorkflowStatus
) {
  const baseRow = mergeMissedCallWorkflowRow(row);
  const lastActionAt = new Date().toISOString();

  if (nextStatus === "Resolved") {
    return setMissedCallRecoveryOutcome(
      baseRow,
      getMissedCallRecoveryOutcome(baseRow) === "Recovered" ? "Recovered" : "Not Recovered"
    );
  }

  if (nextStatus === "Escalated") {
    return persistMissedCallWorkflowRow({
      ...baseRow,
      status: "Escalated",
      workflowStatusLabel: "Escalated",
      statusTone: "critical",
      urgency: "Critical Priority",
      urgencyTone: "critical",
      dueBy: "Immediate escalation",
      nextStep: "Escalate to manager and call back",
      recommendedAction:
        "Escalate the case to senior operations ownership immediately, then complete an outbound recovery call while purchase intent remains active.",
      updatedAtRaw: lastActionAt,
      notes: createNoteList(
        baseRow,
        createAuditEntry(
          "escalated",
          "Case escalated from the missed call recovery workflow.",
          lastActionAt
        )
      )
    });
  }

  return persistMissedCallWorkflowRow({
    ...baseRow,
    status: baseRow.status === "Escalated" ? "Escalated" : "Under Review",
    workflowStatusLabel: "Follow-Up Sent",
    statusTone: baseRow.status === "Escalated" ? "critical" : "pending",
    urgency: baseRow.status === "Escalated" ? "Critical Priority" : "Elevated Priority",
    urgencyTone: baseRow.status === "Escalated" ? "critical" : "pending",
    dueBy: baseRow.status === "Escalated" ? "Immediate escalation" : "Follow-up queued",
    nextStep:
      baseRow.status === "Escalated"
        ? "Escalate to manager and call back"
        : "Confirm availability and complete outbound follow-up",
    recommendedAction:
      "Immediate outbound follow-up required. Lead exhibited high purchase intent and should be contacted within the active recovery window. Document call outcome and booking disposition upon completion.",
    actionStatus: "Needs Action",
    callOutcome: "Follow-Up Needed",
    missedOpportunityLabel: "Yes",
    missedOpportunityDetected: true,
    revenueImpact: baseRow.revenueImpact ?? baseRow.revenue,
    revenueImpactValue: baseRow.revenueImpactValue ?? baseRow.revenueValue,
    analystNote: "Recovery outreach has been triggered and customer response is still pending.",
    conciseAnalystNote: "Follow-up sent; recovery outcome remains pending.",
    recoveryOutcomeLabel: "Pending",
    recoveredValue: 0,
    resolutionReason: null,
    bookingCreated: null,
    updatedAtRaw: lastActionAt,
    notes: createNoteList(
      baseRow,
      createAuditEntry(
        "follow_up_sent",
        "Follow-up sent from the missed call recovery workflow.",
        lastActionAt
      )
    )
  });
}

export function setMissedCallRecoveryOutcome(
  row: DashboardCallRow,
  outcome: Exclude<MissedCallRecoveryOutcome, "Pending">
) {
  const baseRow = mergeMissedCallWorkflowRow(row);
  const lastActionAt = new Date().toISOString();

  if (outcome === "Recovered") {
    return persistMissedCallWorkflowRow({
      ...baseRow,
      status: "Resolved",
      workflowStatusLabel: "Resolved",
      actionStatus: "No Action Needed",
      statusTone: "recovered",
      urgency: "Closed",
      urgencyTone: "recovered",
      dueBy: "Completed",
      callOutcome: "Converted",
      missedOpportunityLabel: "No",
      missedOpportunityDetected: false,
      nextStep: "Recovered and archived",
      recommendedAction:
        "No further action required. Booking created and recovered revenue has been captured in the recovery workflow.",
      revenueImpact: baseRow.revenueImpact ?? baseRow.revenue,
      revenueImpactValue: baseRow.revenueImpactValue ?? baseRow.revenueValue,
      analystNote: "Recovered revenue confirmed and booking created from the missed-call recovery workflow.",
      conciseAnalystNote: "Recovered and converted into a booking.",
      recoveryOutcomeLabel: "Recovered",
      recoveredValue: baseRow.revenueValue,
      resolutionReason: "Booking created after recovery follow-up.",
      bookingCreated: true,
      updatedAtRaw: lastActionAt,
      notes: createNoteList(
        baseRow,
        createAuditEntry(
          "resolved",
          "Case closed as recovered. Booking created and revenue secured.",
          lastActionAt
        )
      )
    });
  }

  return persistMissedCallWorkflowRow({
    ...baseRow,
    status: "Resolved",
    workflowStatusLabel: "Resolved",
    actionStatus: "No Action Needed",
    statusTone: "recovered",
    urgency: "Closed",
    urgencyTone: "recovered",
    dueBy: "Completed",
    callOutcome: "Missed Opportunity",
    missedOpportunityLabel: "Yes",
    missedOpportunityDetected: true,
    nextStep: "Closed without recovery",
    recommendedAction:
      "No further action required. Recovery workflow has been closed without a recovered booking.",
    revenueImpact: baseRow.revenueImpact ?? baseRow.revenue,
    revenueImpactValue: baseRow.revenueImpactValue ?? baseRow.revenueValue,
    analystNote: "Recovery attempt closed without booking conversion.",
    conciseAnalystNote: "Closed without recovered booking.",
    recoveryOutcomeLabel: "Not Recovered",
    recoveredValue: 0,
    resolutionReason: "Recovery window closed without booking.",
    bookingCreated: false,
    updatedAtRaw: lastActionAt,
    notes: createNoteList(
      baseRow,
      createAuditEntry(
        "resolved",
        "Case closed without recovered booking.",
        lastActionAt
      )
    )
  });
}
