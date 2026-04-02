"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import { demoMissedCallRecoveryRows } from "@/lib/demo-dashboard-data";
import { createClient } from "@/lib/supabase/client";
import { buildMissedCallRecoveryRows, type DashboardCallRow } from "@/lib/dashboard-calls";
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
  | "Resolved"
  | "Unassigned"
  | "Assigned to me";

const baseFilterOptions: QueueFilter[] = ["All", "Action Required", "Follow-Up Sent", "Resolved"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function getStatusClasses(status: MissedCallWorkflowStatus) {
  switch (status) {
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

function matchesFilter(row: DashboardCallRow, filter: QueueFilter, currentOwnerLabel: string | null) {
  const status = getMissedCallWorkflowStatus(row);

  if (filter === "All") {
    return true;
  }

  if (filter === "Action Required") {
    return status === "Action Required" || status === "Escalated";
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

export function MissedCallRecoveryPage() {
  const router = useRouter();
  const [rows, setRows] = useState(() => mergeMissedCallWorkflowRows(demoMissedCallRecoveryRows));
  const [selectedCallId, setSelectedCallId] = useState(demoMissedCallRecoveryRows[0]?.id ?? null);
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const [activityTone, setActivityTone] = useState<"success" | "error">("success");
  const [activeFilter, setActiveFilter] = useState<QueueFilter>("All");
  const [sendingCallId, setSendingCallId] = useState<string | null>(null);
  const [currentOwnerLabel, setCurrentOwnerLabel] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function hydrateLiveRows() {
      try {
        const response = await fetch("/api/dashboard-calls", {
          cache: "no-store"
        });

        if (!response.ok) {
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
          return;
        }

        const liveRows = mergeMissedCallWorkflowRows(buildMissedCallRecoveryRows(sourceRows));

        if (liveRows.length === 0) {
          return;
        }

        setRows(liveRows);
        setSelectedCallId((currentSelection) =>
          liveRows.some((row) => row.id === currentSelection) ? currentSelection : (liveRows[0]?.id ?? null)
        );
      } catch (error) {
        console.error("[missed-call-recovery] Failed to hydrate live missed-call rows.", error);
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
    ? [...baseFilterOptions, "Unassigned", "Assigned to me"]
    : baseFilterOptions;

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesFilter(row, activeFilter, currentOwnerLabel)),
    [rows, activeFilter, currentOwnerLabel]
  );

  const queueFocusCall = filteredRows.find((row) => row.id === selectedCallId) ?? filteredRows[0] ?? null;

  const summary = useMemo(() => {
    const missedCallsToday = rows.length;
    const awaitingFollowUp = rows.filter((row) => {
      const status = getMissedCallWorkflowStatus(row);
      return status === "Action Required" || status === "Escalated";
    }).length;
    const revenueAtRisk = rows
      .filter((row) => getMissedCallRecoveryOutcome(row) !== "Recovered")
      .reduce((sum, row) => sum + row.revenueValue, 0);
    const recoveredCount = rows.filter((row) => getMissedCallRecoveryOutcome(row) === "Recovered").length;
    const recoveredValue = rows.reduce((sum, row) => sum + getMissedCallRecoveredValue(row), 0);
    const recoveryRate = rows.length > 0 ? Math.round((recoveredCount / rows.length) * 100) : 0;

    return {
      missedCallsToday,
      awaitingFollowUp,
      revenueAtRisk,
      recoveredCount,
      recoveredValue,
      recoveryRate
    };
  }, [rows]);

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
    updateRowStatus(id, "Resolved", "The missed call has been marked as resolved.");
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
        title="Missed Call Recovery"
        description="Review missed inbound calls, assess revenue risk, and trigger follow-up actions."
      />

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
          label="Missed Calls Today"
          value={String(summary.missedCallsToday)}
          detail="Inbound calls captured in today’s recovery queue."
        />
        <SummaryCard
          label="Calls Awaiting Follow-Up"
          value={String(summary.awaitingFollowUp)}
          detail="Missed opportunities still requiring an outreach action."
        />
        <SummaryCard
          label="Estimated Revenue At Risk"
          value={formatCurrency(summary.revenueAtRisk)}
          detail="Potential booked revenue exposed across unresolved calls."
        />
        <SummaryCard
          label="Recovery Rate"
          value={`${summary.recoveryRate}%`}
          detail={`${formatCurrency(summary.recoveredValue)} recovered across ${summary.recoveredCount} recovered case${summary.recoveredCount === 1 ? "" : "s"}.`}
        />
      </section>

      {queueFocusCall ? (
        <section className="surface-primary motion-fade-up overflow-hidden border-[#D1D5DB] shadow-[0_18px_36px_rgba(17,24,39,0.05)]">
          <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6 sm:py-6">
            <div className="type-label-text text-[11px]">Focused call</div>
            <h2 className="type-page-title mt-2 text-[26px] sm:text-[30px]">{queueFocusCall.caller}</h2>
            <p className="type-body-text mt-2 max-w-[760px] text-[14px] leading-6">
              {queueFocusCall.summary}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[13px]">
              <span
                className={`inline-flex rounded-full px-3 py-1.5 font-semibold tracking-[0.02em] ${getStatusClasses(
                  getMissedCallWorkflowStatus(queueFocusCall)
                )}`}
              >
                {getMissedCallWorkflowStatus(queueFocusCall)}
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
            <DetailField label="Revenue Risk" value={formatCurrency(queueFocusCall.revenueValue)} />
            <DetailField label="Recommended Action" value={queueFocusCall.recommendedAction} />
          </div>
        </section>
      ) : null}

      <section className="surface-primary motion-fade-up overflow-hidden">
        <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6 sm:py-5.5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="type-section-title text-[20px] sm:text-[22px]">Recovery queue</h2>
              <p className="type-body-text mt-2 text-[14px] leading-6">
                Operational work surface for triaging missed inbound calls and keeping high-value follow-up on track.
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
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Call Duration</th>
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Revenue Risk</th>
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Follow-Up Status</th>
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Recommended Action</th>
                <th className="border-b border-[#E5E7EB] px-5 py-3.5 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => {
                  const status = getMissedCallWorkflowStatus(row);
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
                        <div className="type-body-text mt-1 text-[13px] leading-6">{row.reason}</div>
                        <div className="type-muted-text mt-2 text-[12px]">
                          {row.assignedOwner} • Last action {formatMissedCallLastAction(row)}
                        </div>
                      </td>
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        <div className="type-section-title text-[14px]">{row.date}</div>
                      </td>
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        <div className="type-section-title text-[14px]">{getMissedCallDuration(row)}</div>
                      </td>
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        <div className="inline-flex rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition group-hover:shadow-[0_6px_16px_rgba(17,24,39,0.08)]">
                          <div>
                            <div className="text-[16px] font-bold tracking-[-0.02em] text-[#111827]">
                              {row.revenueImpact ?? row.revenue}
                            </div>
                            <div className="type-label-text mt-0.5 text-[10px]">Revenue Risk</div>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] ${getStatusClasses(
                            status
                          )}`}
                        >
                          {status}
                        </span>
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
                            disabled={sendingCallId === row.id}
                            className="button-secondary-ui inline-flex min-h-[40px] items-center justify-center px-3.5 text-[13px] transition hover:-translate-y-[1px] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:shadow-[0_8px_18px_rgba(17,24,39,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] disabled:shadow-none"
                          >
                            {sendingCallId === row.id ? "Sending..." : "Send Follow-Up"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkResolved(row.id)}
                            className="button-primary-accent inline-flex min-h-[40px] items-center justify-center px-3.5 text-[13px] transition hover:-translate-y-[1px] hover:border-[#1D4ED8] hover:bg-[#1D4ED8] hover:shadow-[0_12px_22px_rgba(37,99,235,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                          >
                            Mark Resolved
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
