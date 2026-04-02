"use client";

import { useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "@/components/workspace-page-header";

type FollowUpStatus = "Action Required" | "Follow-Up Sent" | "Escalated" | "Resolved";
type QueueFilter = "All" | "Action Required" | "Follow-Up Sent" | "Resolved";

type MissedCallRecord = {
  id: string;
  caller: string;
  timestamp: string;
  duration: string;
  revenueRisk: number;
  followUpStatus: FollowUpStatus;
  recommendedAction: string;
  issueSummary: string;
};

const initialMissedCalls: MissedCallRecord[] = [
  {
    id: "missed-call-1",
    caller: "Adam Spencer",
    timestamp: "02 Apr 2026 · 09:14",
    duration: "00:42",
    revenueRisk: 420,
    followUpStatus: "Action Required",
    recommendedAction: "Call immediately",
    issueSummary: "No callback made after inbound service enquiry."
  },
  {
    id: "missed-call-2",
    caller: "Emily Green",
    timestamp: "02 Apr 2026 · 10:37",
    duration: "01:18",
    revenueRisk: 260,
    followUpStatus: "Follow-Up Sent",
    recommendedAction: "Confirm availability and resend booking link",
    issueSummary: "Follow-up sent, but appointment confirmation still pending."
  },
  {
    id: "missed-call-3",
    caller: "Brian Thompson",
    timestamp: "02 Apr 2026 · 11:06",
    duration: "00:31",
    revenueRisk: 610,
    followUpStatus: "Escalated",
    recommendedAction: "Manager call-back within the next hour",
    issueSummary: "High-value job request dropped during business hours."
  },
  {
    id: "missed-call-4",
    caller: "Laura Bennett",
    timestamp: "02 Apr 2026 · 12:24",
    duration: "02:04",
    revenueRisk: 340,
    followUpStatus: "Resolved",
    recommendedAction: "Closed after successful recovery and booking",
    issueSummary: "Callback completed and follow-up action closed."
  }
];

const filterOptions: QueueFilter[] = ["All", "Action Required", "Follow-Up Sent", "Resolved"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function getStatusClasses(status: FollowUpStatus) {
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

function matchesFilter(row: MissedCallRecord, filter: QueueFilter) {
  if (filter === "All") {
    return true;
  }

  if (filter === "Action Required") {
    return row.followUpStatus === "Action Required" || row.followUpStatus === "Escalated";
  }

  return row.followUpStatus === filter;
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
  const [rows, setRows] = useState(initialMissedCalls);
  const [selectedCallId, setSelectedCallId] = useState(initialMissedCalls[0]?.id ?? null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<QueueFilter>("All");

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesFilter(row, activeFilter)),
    [rows, activeFilter]
  );

  const selectedCall = rows.find((row) => row.id === selectedCallId) ?? null;
  const queueFocusCall = filteredRows.find((row) => row.id === selectedCallId) ?? filteredRows[0] ?? null;

  const summary = useMemo(() => {
    const missedCallsToday = rows.length;
    const awaitingFollowUp = rows.filter(
      (row) => row.followUpStatus === "Action Required" || row.followUpStatus === "Escalated"
    ).length;
    const revenueAtRisk = rows
      .filter((row) => row.followUpStatus !== "Resolved")
      .reduce((sum, row) => sum + row.revenueRisk, 0);
    const resolvedCount = rows.filter((row) => row.followUpStatus === "Resolved").length;
    const recoveryRate = rows.length > 0 ? Math.round((resolvedCount / rows.length) * 100) : 0;

    return {
      missedCallsToday,
      awaitingFollowUp,
      revenueAtRisk,
      recoveryRate
    };
  }, [rows]);

  useEffect(() => {
    if (!detailPanelOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [detailPanelOpen]);

  useEffect(() => {
    if (!queueFocusCall && detailPanelOpen) {
      setDetailPanelOpen(false);
    }
  }, [detailPanelOpen, queueFocusCall]);

  function updateRowStatus(id: string, nextStatus: FollowUpStatus, message: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              followUpStatus: nextStatus
            }
          : row
      )
    );
    setSelectedCallId(id);
    setActivityMessage(message);
  }

  function handleViewDetails(id: string) {
    setSelectedCallId(id);
    setDetailPanelOpen(true);
    setActivityMessage("Call detail panel opened for review.");
  }

  function handleSendFollowUp(id: string) {
    updateRowStatus(id, "Follow-Up Sent", "Follow-up action has been queued and logged.");
  }

  function handleMarkResolved(id: string) {
    updateRowStatus(id, "Resolved", "The missed call has been marked as resolved.");
  }

  return (
    <>
      <main className="space-y-6 lg:space-y-7">
        <WorkspacePageHeader
          title="Missed Call Recovery"
          description="Review missed inbound calls, assess revenue risk, and trigger follow-up actions."
        />

        {activityMessage ? (
          <section className="surface-secondary motion-fade-up border border-[#E5E7EB] px-4 py-4 sm:px-5">
            <div className="type-section-title text-[15px]">Action updated</div>
            <p className="type-body-text mt-2 text-[14px]">{activityMessage}</p>
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
            detail="Share of missed-call cases already recovered or closed."
          />
        </section>

        {queueFocusCall ? (
          <section className="surface-primary motion-fade-up overflow-hidden border-[#D1D5DB] shadow-[0_18px_36px_rgba(17,24,39,0.05)]">
            <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6 sm:py-6">
              <div className="type-label-text text-[11px]">Focused call</div>
              <h2 className="type-page-title mt-2 text-[26px] sm:text-[30px]">{queueFocusCall.caller}</h2>
              <p className="type-body-text mt-2 max-w-[760px] text-[14px] leading-6">
                {queueFocusCall.issueSummary}
              </p>
            </div>

            <div className="grid gap-3.5 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
              <DetailField label="Timestamp" value={queueFocusCall.timestamp} />
              <DetailField label="Call Duration" value={queueFocusCall.duration} />
              <DetailField label="Revenue Risk" value={formatCurrency(queueFocusCall.revenueRisk)} />
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
                          <div className="type-body-text mt-1 text-[13px] leading-6">{row.issueSummary}</div>
                        </td>
                        <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                          <div className="type-section-title text-[14px]">{row.timestamp}</div>
                        </td>
                        <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                          <div className="type-section-title text-[14px]">{row.duration}</div>
                        </td>
                        <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                          <div className="inline-flex rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition group-hover:shadow-[0_6px_16px_rgba(17,24,39,0.08)]">
                            <div>
                              <div className="text-[16px] font-bold tracking-[-0.02em] text-[#111827]">
                                {formatCurrency(row.revenueRisk)}
                              </div>
                              <div className="type-label-text mt-0.5 text-[10px]">Revenue Risk</div>
                            </div>
                          </div>
                        </td>
                        <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] ${getStatusClasses(
                              row.followUpStatus
                            )}`}
                          >
                            {row.followUpStatus}
                          </span>
                        </td>
                        <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                          <div className="type-section-title text-[15px] leading-6">{row.recommendedAction}</div>
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
                              className="button-secondary-ui inline-flex min-h-[40px] items-center justify-center px-3.5 text-[13px] transition hover:-translate-y-[1px] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:shadow-[0_8px_18px_rgba(17,24,39,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                            >
                              Send Follow-Up
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

      {detailPanelOpen && selectedCall ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close detail panel"
            onClick={() => setDetailPanelOpen(false)}
            className="absolute inset-0 bg-[rgba(17,24,39,0.18)] backdrop-blur-[2px]"
          />

          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-[#E5E7EB] bg-[#FFFFFF] shadow-[-20px_0_50px_rgba(17,24,39,0.12)]">
            <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="type-label-text text-[11px]">Call details</div>
                  <h2 className="type-page-title mt-2 text-[25px] sm:text-[28px]">{selectedCall.caller}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailPanelOpen(false)}
                  className="button-secondary-ui inline-flex h-10 w-10 items-center justify-center text-[18px] leading-none transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  aria-label="Close detail panel"
                >
                  ×
                </button>
              </div>
              <p className="type-body-text mt-3 text-[14px] leading-6">{selectedCall.issueSummary}</p>
            </div>

            <div className="ui-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <div className="space-y-3.5">
                <DetailField label="Follow-Up Status" value={selectedCall.followUpStatus} />
                <DetailField label="Timestamp" value={selectedCall.timestamp} />
                <DetailField label="Call Duration" value={selectedCall.duration} />
                <DetailField label="Revenue Risk" value={formatCurrency(selectedCall.revenueRisk)} />
                <DetailField label="Recommended Action" value={selectedCall.recommendedAction} />
              </div>
            </div>

            <div className="border-t border-[#E5E7EB] px-5 py-5 sm:px-6">
              <div className="grid gap-2.5 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => handleSendFollowUp(selectedCall.id)}
                  className="button-secondary-ui inline-flex min-h-[44px] items-center justify-center px-4 text-[14px] transition hover:-translate-y-[1px] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:shadow-[0_8px_18px_rgba(17,24,39,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Send Follow-Up
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkResolved(selectedCall.id)}
                  className="button-primary-accent inline-flex min-h-[44px] items-center justify-center px-4 text-[14px] transition hover:-translate-y-[1px] hover:border-[#1D4ED8] hover:bg-[#1D4ED8] hover:shadow-[0_12px_22px_rgba(37,99,235,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Mark Resolved
                </button>
                <button
                  type="button"
                  onClick={() => setDetailPanelOpen(false)}
                  className="button-secondary-ui inline-flex min-h-[44px] items-center justify-center px-4 text-[14px] transition hover:-translate-y-[1px] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:shadow-[0_8px_18px_rgba(17,24,39,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Close Panel
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
