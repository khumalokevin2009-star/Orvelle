"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSolutionMode } from "@/components/solution-mode-provider";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import { demoMissedCallRecoveryRows } from "@/lib/demo-dashboard-data";
import { getSolutionModeCopy } from "@/lib/solution-mode-copy";
import { defaultSolutionMode, type SolutionMode } from "@/lib/solution-mode";
import { createClient } from "@/lib/supabase/client";
import { buildMissedCallRecoveryRows, type DashboardCallRow } from "@/lib/dashboard-calls";
import { getServiceMissedCallStatus, type ServiceMissedCallStatus } from "@/lib/service-missed-call-status";
import {
  assignMissedCallWorkflowOwner,
  formatMissedCallLastAction,
  getMissedCallDuration,
  getMissedCallRecoveredValue,
  getMissedCallRecoveryOutcome,
  getMissedCallWorkflowStatus,
  getOwnerLabelFromAuthUser,
  isMissedCallAssignedToOwner,
  isMissedCallUnassigned,
  mergeMissedCallWorkflowRows,
  transitionMissedCallWorkflowRow,
  type MissedCallWorkflowStatus
} from "@/lib/missed-call-workflow";

type QueueFilter =
  | "All"
  | "Action Required"
  | "Follow-Up Sent"
  | "SMS sent"
  | "No callback yet"
  | "Called back"
  | "Resolved"
  | "Unassigned"
  | "Assigned to me";

const baseFilterOptions: QueueFilter[] = ["All", "Action Required", "Follow-Up Sent", "Resolved"];
const serviceFilterOptions: QueueFilter[] = ["All", "No callback yet", "SMS sent", "Called back", "Resolved"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function getStatusClasses(status: MissedCallWorkflowStatus | ServiceMissedCallStatus) {
  switch (status) {
    case "No callback yet":
      return "border border-[#F2D8D8] bg-[#FFF6F6] text-[#A04C4C]";
    case "SMS sent":
      return "border border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]";
    case "Called back":
      return "border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]";
    case "Action Required":
      return "border border-[#F2D8D8] bg-[#FFF6F6] text-[#A04C4C]";
    case "Follow-Up Sent":
      return "border border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]";
    case "Escalated":
      return "border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]";
    case "Resolved":
      return "border border-[#D1E9D7] bg-[#F4FBF5] text-[#256B44]";
    default:
      return "border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]";
  }
}

function matchesFilter(
  row: DashboardCallRow,
  filter: QueueFilter,
  currentOwnerLabel: string | null,
  isServiceBusinessMode: boolean
) {
  const status = isServiceBusinessMode ? getServiceMissedCallStatus(row) : getMissedCallWorkflowStatus(row);

  if (filter === "All") {
    return true;
  }

  if (filter === "Action Required") {
    return !isServiceBusinessMode && (status === "Action Required" || status === "Escalated");
  }

  if (filter === "Unassigned") {
    return isMissedCallUnassigned(row);
  }

  if (filter === "Assigned to me") {
    return isMissedCallAssignedToOwner(row, currentOwnerLabel);
  }

  return status === filter;
}

function SummaryCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="surface-primary flex min-h-[156px] flex-col px-5 py-5 shadow-[0_12px_28px_rgba(17,24,39,0.04)] sm:min-h-[170px] sm:px-6 sm:py-6">
      <div className="type-label-text text-[11px]">{label}</div>
      <div className="type-metric-text mt-4 text-[32px] sm:text-[36px]">{value}</div>
      <p className="type-body-text mt-auto pt-4 text-[13px] leading-6">{detail}</p>
    </div>
  );
}

function DetailField({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="surface-secondary px-4 py-4">
      <div className="type-label-text text-[11px]">{label}</div>
      <div className="type-section-title mt-2 text-[16px] leading-6">{value}</div>
    </div>
  );
}

function getServiceNoteSummary(row: DashboardCallRow) {
  const noteCount = row.noteCount ?? 0;
  const latestNote = row.latestNotePreview?.trim();

  if (noteCount <= 0) {
    return "No note added";
  }

  if (latestNote) {
    return `${noteCount} note${noteCount === 1 ? "" : "s"} • ${latestNote}`;
  }

  return `${noteCount} note${noteCount === 1 ? "" : "s"} saved`;
}

export function MissedCallRecoveryPage({
  solutionMode = defaultSolutionMode
}: {
  solutionMode?: SolutionMode;
}) {
  const router = useRouter();
  const resolvedSolutionMode = useSolutionMode(solutionMode);
  const copy = getSolutionModeCopy(resolvedSolutionMode);
  const isServiceBusinessMode = resolvedSolutionMode === "service_business_missed_call_recovery";
  const [rows, setRows] = useState(() => mergeMissedCallWorkflowRows(demoMissedCallRecoveryRows));
  const [selectedCallId, setSelectedCallId] = useState(demoMissedCallRecoveryRows[0]?.id ?? null);
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const [activityTone, setActivityTone] = useState<"success" | "error">("success");
  const [activeFilter, setActiveFilter] = useState<QueueFilter>("All");
  const [sendingCallId, setSendingCallId] = useState<string | null>(null);
  const [currentOwnerLabel, setCurrentOwnerLabel] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<"checking" | "live" | "demo" | "error">("checking");

  useEffect(() => {
    let isActive = true;

    async function hydrateLiveRows() {
      try {
        const response = await fetch("/api/dashboard-calls", {
          cache: "no-store"
        });

        if (!response.ok) {
          if (isActive) {
            setDataMode("error");
          }
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | {
              rows?: DashboardCallRow[];
              liveRows?: DashboardCallRow[];
            }
          | null;

        const sourceRows = payload?.liveRows ?? payload?.rows;

        if (!isActive || !sourceRows) {
          if (isActive) {
            setDataMode("demo");
          }
          return;
        }

        const liveRows = mergeMissedCallWorkflowRows(buildMissedCallRecoveryRows(sourceRows));

        if (liveRows.length === 0) {
          if (isActive) {
            setDataMode("demo");
          }
          return;
        }

        setRows(liveRows);
        setDataMode("live");
        setSelectedCallId((currentSelection) =>
          liveRows.some((row) => row.id === currentSelection) ? currentSelection : (liveRows[0]?.id ?? null)
        );
      } catch (error) {
        console.error("[missed-call-recovery] Failed to hydrate live missed-call rows.", error);
        if (isActive) {
          setDataMode("error");
        }
      }
    }

    void hydrateLiveRows();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function hydrateCurrentUser() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();

        if (!isActive) {
          return;
        }

        setCurrentOwnerLabel(getOwnerLabelFromAuthUser(data.user));
      } catch (error) {
        console.error("[missed-call-recovery] Failed to resolve current owner label.", error);
      }
    }

    void hydrateCurrentUser();

    return () => {
      isActive = false;
    };
  }, []);

  const filterOptions: QueueFilter[] = currentOwnerLabel
    ? [...(isServiceBusinessMode ? serviceFilterOptions : baseFilterOptions), "Unassigned", "Assigned to me"]
    : isServiceBusinessMode
      ? serviceFilterOptions
      : baseFilterOptions;

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesFilter(row, activeFilter, currentOwnerLabel, isServiceBusinessMode)),
    [rows, activeFilter, currentOwnerLabel, isServiceBusinessMode]
  );

  const queueFocusCall = filteredRows.find((row) => row.id === selectedCallId) ?? filteredRows[0] ?? null;

  const summary = useMemo(() => {
    const missedCallsToday = rows.length;
    const awaitingFollowUp = rows.filter((row) => {
      const status = isServiceBusinessMode ? getServiceMissedCallStatus(row) : getMissedCallWorkflowStatus(row);
      return isServiceBusinessMode
        ? status !== "Resolved"
        : status === "Action Required" || status === "Escalated";
    }).length;
    const smsSentCount = rows.filter((row) => getServiceMissedCallStatus(row) === "SMS sent").length;
    const resolvedCount = rows.filter((row) => getServiceMissedCallStatus(row) === "Resolved").length;
    const revenueAtRisk = rows
      .filter((row) => getMissedCallRecoveryOutcome(row) !== "Recovered")
      .reduce((sum, row) => sum + row.revenueValue, 0);
    const recoveredCount = rows.filter((row) => getMissedCallRecoveryOutcome(row) === "Recovered").length;
    const recoveredValue = rows.reduce((sum, row) => sum + getMissedCallRecoveredValue(row), 0);
    const recoveryRate = rows.length > 0 ? Math.round((recoveredCount / rows.length) * 100) : 0;

    return {
      missedCallsToday,
      awaitingFollowUp,
      smsSentCount,
      resolvedCount,
      revenueAtRisk,
      recoveredCount,
      recoveredValue,
      recoveryRate
    };
  }, [isServiceBusinessMode, rows]);

  function applyRowStatus(id: string, nextStatus: MissedCallWorkflowStatus) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        return transitionMissedCallWorkflowRow(row, nextStatus);
      })
    );
  }

  function updateRowStatus(id: string, nextStatus: MissedCallWorkflowStatus, message: string) {
    applyRowStatus(id, nextStatus);
    setSelectedCallId(id);
    setActivityMessage(message);
    setActivityTone("success");
  }

  function handleViewDetails(id: string) {
    router.push(`/call/${id}`);
  }

  async function handleSendFollowUp(id: string) {
    const targetRow = rows.find((row) => row.id === id);

    if (targetRow && getMissedCallWorkflowStatus(targetRow) === "Resolved") {
      setSelectedCallId(id);
      setActivityTone("error");
      setActivityMessage("Closed recovery cases do not require additional follow-up.");
      return;
    }

    setSendingCallId(id);
    setActivityMessage(null);

    try {
      const response = await fetch(`/api/calls/${id}/follow-up`, {
        method: "POST"
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
            statusLabel?: MissedCallWorkflowStatus;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to send the follow-up right now.");
      }

      updateRowStatus(
        id,
        payload?.statusLabel ?? "Follow-Up Sent",
        payload?.message || "Follow-up action has been queued and logged."
      );
    } catch (error) {
      setSelectedCallId(id);
      setActivityTone("error");
      setActivityMessage(error instanceof Error ? error.message : "Unable to send the follow-up right now.");
    } finally {
      setSendingCallId(null);
    }
  }

  function handleMarkResolved(id: string) {
    updateRowStatus(id, "Resolved", "The missed call has been closed as not recovered.");
  }

  function handleAssignOwner(id: string, nextOwner: string | null) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        return assignMissedCallWorkflowOwner(row, nextOwner);
      })
    );
    setSelectedCallId(id);
    setActivityTone("success");
    setActivityMessage(
      nextOwner
        ? `Ownership assigned to ${nextOwner}.`
        : "Case returned to the unassigned queue."
    );
  }

  return (
    <main className="space-y-6 lg:space-y-7">
      <WorkspacePageHeader
        title={copy.recoveryPage.title}
        description={copy.recoveryPage.description}
      />

      {dataMode !== "live" ? (
        <section className="surface-secondary border px-4 py-4 sm:px-5">
          <div className="type-section-title text-[15px]">
            {dataMode === "error" ? "Live recovery data unavailable" : "Recovery queue preview"}
          </div>
          <p className="type-body-text mt-2 text-[14px]">
            {dataMode === "error"
              ? "The live missed-call feed could not be loaded right now. Showing the existing recovery demo cases instead."
              : dataMode === "demo"
                ? "No live missed-call recovery cases are available yet. Showing the existing demo cases until real missed calls are ingested."
                : "Checking connected call activity and loading any live missed-call recovery cases."}
          </p>
        </section>
      ) : null}

      {activityMessage ? (
        <section
          className={`surface-secondary motion-fade-up border px-4 py-4 sm:px-5 ${
            activityTone === "error" ? "border-[#F2D8D8]" : "border-[#E5E7EB]"
          }`}
        >
          <div className="type-section-title text-[15px]">
            {activityTone === "error" ? "Action error" : "Action updated"}
          </div>
          <p
            className={`mt-2 text-[14px] ${
              activityTone === "error" ? "text-[#A24E4E]" : "type-body-text"
            }`}
          >
            {activityMessage}
          </p>
        </section>
      ) : null}

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={copy.recoveryPage.summaryPrimaryLabel}
          value={isServiceBusinessMode ? String(summary.missedCallsToday) : String(summary.awaitingFollowUp)}
          detail={
            isServiceBusinessMode
              ? "Missed inbound calls in this view."
              : "Calls with unresolved conversion or recovery failures requiring review."
          }
        />
        <SummaryCard
          label={copy.recoveryPage.summaryFollowUpLabel}
          value={String(summary.awaitingFollowUp)}
          detail={
            isServiceBusinessMode
              ? "Missed calls that still need a callback or a final resolution."
              : "Missed opportunities still requiring an outreach action."
          }
        />
        <SummaryCard
          label={copy.recoveryPage.summaryRiskLabel}
          value={
            isServiceBusinessMode ? String(summary.smsSentCount) : formatCurrency(summary.revenueAtRisk)
          }
          detail={
            isServiceBusinessMode
              ? "Missed calls where an SMS has already been sent."
              : copy.recoveryPage.summaryRiskDetail
          }
        />
        <SummaryCard
          label={isServiceBusinessMode ? "Resolved" : "Recovery Rate"}
          value={isServiceBusinessMode ? String(summary.resolvedCount) : `${summary.recoveryRate}%`}
          detail={
            isServiceBusinessMode
              ? "Missed calls already closed by the team."
              : `${formatCurrency(summary.recoveredValue)} recovered across ${summary.recoveredCount} recovered case${summary.recoveredCount === 1 ? "" : "s"}.`
          }
        />
      </section>

      {queueFocusCall ? (
        <section className="surface-primary motion-fade-up overflow-hidden border-[#D1D5DB] shadow-[0_18px_36px_rgba(17,24,39,0.05)]">
          <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6 sm:py-6">
            <div className="type-label-text text-[11px]">{copy.recoveryPage.focusedLabel}</div>
            <h2 className="type-page-title mt-2 text-[26px] sm:text-[30px]">{queueFocusCall.caller}</h2>
            <p className="type-body-text mt-2 max-w-[760px] text-[14px] leading-6">
              {isServiceBusinessMode
                ? "Open the record, add notes, and keep this missed call moving."
                : queueFocusCall.summary}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[13px]">
              <span
                className={`inline-flex rounded-full px-3 py-1.5 font-semibold tracking-[0.02em] ${getStatusClasses(
                  isServiceBusinessMode
                    ? getServiceMissedCallStatus(queueFocusCall)
                    : getMissedCallWorkflowStatus(queueFocusCall)
                )}`}
              >
                {isServiceBusinessMode
                  ? getServiceMissedCallStatus(queueFocusCall)
                  : getMissedCallWorkflowStatus(queueFocusCall)}
              </span>
              <span className="type-body-text">Assigned owner: {queueFocusCall.assignedOwner}</span>
              <span className="type-body-text">Last action: {formatMissedCallLastAction(queueFocusCall)}</span>
            </div>
            {currentOwnerLabel ? (
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleAssignOwner(
                      queueFocusCall.id,
                      isMissedCallAssignedToOwner(queueFocusCall, currentOwnerLabel)
                        ? null
                        : currentOwnerLabel
                    )
                  }
                  className="button-secondary-ui inline-flex min-h-[38px] items-center justify-center px-3.5 text-[13px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  {isMissedCallAssignedToOwner(queueFocusCall, currentOwnerLabel)
                    ? "Mark Unassigned"
                    : "Assign to Me"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3.5 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            <DetailField label="Timestamp" value={queueFocusCall.date} />
            <DetailField label="Call Duration" value={getMissedCallDuration(queueFocusCall)} />
            <DetailField
              label={isServiceBusinessMode ? "Status" : "Revenue Risk"}
              value={
                isServiceBusinessMode
                  ? getServiceMissedCallStatus(queueFocusCall)
                  : formatCurrency(queueFocusCall.revenueValue)
              }
            />
            <DetailField
              label={isServiceBusinessMode ? "Notes" : "Recommended Action"}
              value={isServiceBusinessMode ? getServiceNoteSummary(queueFocusCall) : queueFocusCall.recommendedAction}
            />
          </div>
        </section>
      ) : null}

      <section className="surface-primary motion-fade-up overflow-hidden">
        <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6 sm:py-5.5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="type-section-title text-[20px] sm:text-[22px]">{copy.recoveryPage.queueTitle}</h2>
              <p className="type-body-text mt-2 text-[14px] leading-6">
                {copy.recoveryPage.queueDescription}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {filterOptions.map((filter) => {
                const isActive = activeFilter === filter;

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`inline-flex min-h-[38px] items-center justify-center rounded-full border px-4 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                      isActive
                        ? "border-[#111827] bg-[#111827] text-white shadow-[0_8px_20px_rgba(17,24,39,0.14)]"
                        : "border-[#E5E7EB] bg-[#FFFFFF] text-[#6B7280] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:text-[#111827]"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="ui-scrollbar ui-scrollbar-x overflow-x-auto">
          <table className="min-w-[1040px] border-separate border-spacing-0 text-left">
            <thead className="bg-[#FAFAFB]">
              <tr className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#4B5563]">
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Caller</th>
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Timestamp</th>
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">
                  {isServiceBusinessMode ? "Status" : "Call Duration"}
                </th>
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">
                  {isServiceBusinessMode ? "Notes" : "Revenue Risk"}
                </th>
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">
                  {isServiceBusinessMode ? "Owner" : "Follow-Up Status"}
                </th>
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">
                  {isServiceBusinessMode ? "Next Step" : "Recommended Action"}
                </th>
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => {
                  const status = isServiceBusinessMode ? getServiceMissedCallStatus(row) : getMissedCallWorkflowStatus(row);
                  const recoveryOutcome = getMissedCallRecoveryOutcome(row);
                  const isResolved = status === "Resolved";
                  const isSelected = row.id === selectedCallId;

                  return (
                    <tr
                      key={row.id}
                      className={`group transition ${
                        isSelected
                          ? "bg-[#FAFBFC] shadow-[inset_3px_0_0_#111827]"
                          : "bg-[#FFFFFF] hover:bg-[#FAFBFC]"
                      }`}
                    >
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        <div className="type-section-title text-[16px] transition group-hover:text-[#111827]">
                          {row.caller}
                        </div>
                        <div className="type-body-text mt-1 text-[13px] leading-6">
                          {isServiceBusinessMode ? row.phone : row.reason}
                        </div>
                        <div className="type-muted-text mt-2 text-[12px]">
                          {row.assignedOwner} • Last action {formatMissedCallLastAction(row)}
                        </div>
                      </td>
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        <div className="type-section-title text-[14px]">{row.date}</div>
                      </td>
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        {isServiceBusinessMode ? (
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] ${getStatusClasses(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        ) : (
                          <div className="type-section-title text-[14px]">{getMissedCallDuration(row)}</div>
                        )}
                      </td>
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        {isServiceBusinessMode ? (
                          <div className="type-body-text text-[14px] leading-6">{getServiceNoteSummary(row)}</div>
                        ) : (
                          <div className="inline-flex rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition group-hover:shadow-[0_6px_16px_rgba(17,24,39,0.08)]">
                            <div>
                              <div className="text-[16px] font-bold tracking-[-0.02em] text-[#111827]">
                                {row.revenueImpact ?? row.revenue}
                              </div>
                              <div className="type-label-text mt-0.5 text-[10px]">Revenue Risk</div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        {isServiceBusinessMode ? (
                          <div className="type-section-title text-[14px]">{row.assignedOwner}</div>
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] ${getStatusClasses(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        )}
                      </td>
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        <div className="type-section-title text-[15px] leading-6">{row.nextStep}</div>
                      </td>
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        <div className="flex min-w-[230px] justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(row.id)}
                            className="button-secondary-ui inline-flex min-h-[40px] items-center justify-center px-3.5 text-[13px] transition hover:-translate-y-[1px] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:shadow-[0_8px_18px_rgba(17,24,39,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendFollowUp(row.id)}
                            disabled={sendingCallId === row.id || isResolved}
                            className="button-secondary-ui inline-flex min-h-[40px] items-center justify-center px-3.5 text-[13px] transition hover:-translate-y-[1px] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:shadow-[0_8px_18px_rgba(17,24,39,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] disabled:shadow-none"
                          >
                            {sendingCallId === row.id
                              ? "Sending..."
                              : isResolved
                                ? "Closed"
                                : isServiceBusinessMode
                                  ? "Send SMS"
                                  : "Send Follow-Up"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkResolved(row.id)}
                            disabled={isResolved}
                            className="button-primary-accent inline-flex min-h-[40px] items-center justify-center px-3.5 text-[13px] transition hover:-translate-y-[1px] hover:border-[#1D4ED8] hover:bg-[#1D4ED8] hover:shadow-[0_12px_22px_rgba(37,99,235,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80 disabled:shadow-none"
                          >
                            {isResolved
                              ? recoveryOutcome === "Recovered"
                                ? "Recovered"
                                : "Not Recovered"
                              : "Mark Not Recovered"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center sm:px-6">
                    <div className="type-section-title text-[18px]">No calls in this filter</div>
                    <p className="type-body-text mt-2 text-[14px]">
                      Switch filters to review the rest of the missed-call recovery queue.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
