import type { DashboardCallRow } from "@/lib/dashboard-calls";

export type ServiceMissedCallStatus =
  | "SMS sent"
  | "No callback yet"
  | "Called back"
  | "Resolved";

export const SERVICE_MISSED_CALL_CALLED_BACK_NOTE = "Marked called back by staff.";
export const SERVICE_MISSED_CALL_RESOLVED_NOTE = "Marked resolved by staff.";

function normalizeNote(value: string) {
  return value.trim().toLowerCase();
}

export function getServiceMissedCallStatus(
  row: Pick<DashboardCallRow, "notes" | "status" | "workflowStatusLabel">
): ServiceMissedCallStatus {
  const normalizedNotes = row.notes.map(normalizeNote);

  if (
    row.status === "Resolved" ||
    row.workflowStatusLabel === "Resolved" ||
    normalizedNotes.includes(normalizeNote(SERVICE_MISSED_CALL_RESOLVED_NOTE))
  ) {
    return "Resolved";
  }

  if (normalizedNotes.includes(normalizeNote(SERVICE_MISSED_CALL_CALLED_BACK_NOTE))) {
    return "Called back";
  }

  if (
    row.workflowStatusLabel === "Follow-Up Sent" ||
    normalizedNotes.some((note) => note.includes("sms sent")) ||
    normalizedNotes.some((note) => note.includes("follow-up sent")) ||
    normalizedNotes.some((note) => note.includes("automatic follow-up sms"))
  ) {
    return "SMS sent";
  }

  return "No callback yet";
}
