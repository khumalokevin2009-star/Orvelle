import type { DashboardCallRow } from "@/lib/dashboard-calls";

export type MissedCallWorkflowStatus = NonNullable<DashboardCallRow["workflowStatusLabel"]>;

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
  | "updatedAtRaw"
  | "notes"
>;

const STORAGE_KEY = "orvelle.missed-call-workflow";

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

export function isMissedCallRecoveryRecord(rowOrId: DashboardCallRow | string) {
  const id = typeof rowOrId === "string" ? rowOrId : rowOrId.id;
  return id.startsWith("missed-call-");
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
    return persistMissedCallWorkflowRow({
      ...baseRow,
      status: "Resolved",
      workflowStatusLabel: "Resolved",
      statusTone: "recovered",
      urgency: "Closed",
      urgencyTone: "recovered",
      dueBy: "Completed",
      nextStep: "Closed after successful recovery",
      recommendedAction: "No further action required. Opportunity recovered and workflow closed.",
      updatedAtRaw: lastActionAt,
      notes: createNoteList(baseRow, "Recovery case closed from the missed call recovery workflow.")
    });
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
      notes: createNoteList(baseRow, "Case escalated from the missed call recovery workflow.")
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
    updatedAtRaw: lastActionAt,
    notes: createNoteList(baseRow, "Follow-up sent from the missed call recovery workflow.")
  });
}
