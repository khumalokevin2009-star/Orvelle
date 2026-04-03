"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardHeader,
  getDateRangeLabel,
  type DateRangeKey
} from "@/components/dashboard-header";
import { MissedOpportunitiesChart } from "@/components/missed-opportunities-chart";
import { type CallTableRow } from "@/data/mock-platform-data";
import {
  buildTrendData,
  buildMissedCallRecoveryRows,
  getLastUpdatedLabel,
  isWithinDateRange,
  type DashboardCallRow
} from "@/lib/dashboard-calls";
import { demoMissedCallRecoveryRows, demoTrendByRange } from "@/lib/demo-dashboard-data";
import { useSolutionMode } from "@/components/solution-mode-provider";
import { getSolutionModeCopy } from "@/lib/solution-mode-copy";

type PrimaryMetricItem = {
  label: string;
  value: string;
  detail: string;
};

function isStartedToday(startedAt: string) {
  const targetDate = new Date(startedAt);
  const currentDate = new Date();

  return (
    targetDate.getFullYear() === currentDate.getFullYear() &&
    targetDate.getMonth() === currentDate.getMonth() &&
    targetDate.getDate() === currentDate.getDate()
  );
}

function getNormalizedOutcome(row: DashboardCallRow) {
  return (row.callOutcome ?? "").trim().toLowerCase();
}

function isHighIntent(row: DashboardCallRow) {
  return (row.intentLevel ?? "").trim().toLowerCase().includes("high");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function getRowActionStatus(row: CallTableRow) {
  return row.actionStatus ?? (row.status === "Resolved" ? "No Action Needed" : "Needs Action");
}

function getIssueLabel(row: CallTableRow) {
  const primaryIssue = row.primaryIssue?.trim();

  if (primaryIssue && primaryIssue !== "Analysis pending") {
    return primaryIssue;
  }

  return row.reason;
}

function getUrgencyClasses(urgency: CallTableRow["urgency"]) {
  if (urgency === "Critical Priority") {
    return "border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]";
  }

  if (urgency === "Elevated Priority") {
    return "border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]";
  }

  return "border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]";
}

function getOutcomeClasses(outcome: string) {
  const normalizedOutcome = outcome.toLowerCase();

  if (normalizedOutcome === "converted") {
    return "border border-[#D1E9D7] bg-[#F4FBF5] text-[#256B44]";
  }

  if (normalizedOutcome === "unqualified") {
    return "border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]";
  }

  if (normalizedOutcome.includes("missed") || normalizedOutcome.includes("no callback")) {
    return "border border-[#F2D8D8] bg-[#FFF6F6] text-[#A04C4C]";
  }

  if (normalizedOutcome.includes("poor handling")) {
    return "border border-[#F0DFC1] bg-[#FFF9EE] text-[#946C19]";
  }

  return "border border-[#C7D2FE] bg-[#EEF2FF] text-[#1E3A8A]";
}

function sortPriorityRows(rows: DashboardCallRow[]) {
  const urgencyRank: Record<CallTableRow["urgency"], number> = {
    "Critical Priority": 0,
    "Elevated Priority": 1,
    Closed: 2
  };

  return [...rows].sort((left, right) => {
    const urgencyDelta = urgencyRank[left.urgency] - urgencyRank[right.urgency];
    if (urgencyDelta !== 0) return urgencyDelta;

    const revenueDelta = right.revenueValue - left.revenueValue;
    if (revenueDelta !== 0) return revenueDelta;

    return right.responseDelayHours - left.responseDelayHours;
  });
}

function buildMissedRevenueTrendData(rows: DashboardCallRow[], range: DateRangeKey) {
  const baseTrend = buildTrendData(rows, range);
  const revenueByLabel = new Map<string, number>();

  rows.forEach((row) => {
    if (getRowActionStatus(row) !== "Needs Action") {
      return;
    }

    const label = row.periodByRange[range];
    revenueByLabel.set(label, (revenueByLabel.get(label) ?? 0) + row.revenueValue);
  });

  return baseTrend.map((point) => ({
    label: point.label,
    value: revenueByLabel.get(point.label) ?? 0
  }));
}

function PrimaryMetrics({
  items,
  description = "Revenue exposure, recovery progress, and analysis coverage for the active window."
}: {
  items: PrimaryMetricItem[];
  description?: string;
}) {
  const gridClassName =
    items.length === 5 ? "grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5" : "grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <section className="motion-fade-up">
      <div className="mb-4 sm:mb-5">
        <div>
          <h2 className="type-section-title text-[19px] sm:text-[20px]">Key metrics</h2>
          <p className="type-body-text mt-1.5 text-[14px] leading-6">
            {description}
          </p>
        </div>
      </div>

      <div className={gridClassName}>
        {items.map((item, index) => (
          <div
            key={item.label}
            className="surface-primary motion-fade-up flex min-h-[164px] flex-col px-5 py-5 shadow-[0_12px_28px_rgba(17,24,39,0.04)] sm:min-h-[176px] sm:px-6 sm:py-6"
            style={{ animationDelay: `${70 + index * 45}ms` }}
          >
            <div className="type-label-text text-[11px]">{item.label}</div>
            <div className="type-metric-text mt-4 text-[32px] sm:text-[36px] xl:text-[38px]">{item.value}</div>
            <p className="type-body-text mt-auto pt-4 text-[13px] leading-6">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PriorityCallbacksPanel({
  rows,
  selectedRange,
  eyebrow = "Core operating queue",
  title = "Priority Callbacks",
  description,
  emptyMessage = "All analysed calls in the current window are either resolved or outside the selected trend focus.",
  onOpenRecord,
  onAssignFollowUp,
  onMarkResolved
}: {
  rows: DashboardCallRow[];
  selectedRange: DateRangeKey;
  eyebrow?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
  onOpenRecord: (row: DashboardCallRow) => void;
  onAssignFollowUp: (row: DashboardCallRow) => void;
  onMarkResolved: (row: DashboardCallRow) => void;
}) {
  const queueRevenue = rows.reduce((sum, row) => sum + row.revenueValue, 0);
  const highestOpportunity = rows.reduce((highest, row) => Math.max(highest, row.revenueValue), 0);

  return (
    <section className="surface-primary motion-fade-up overflow-hidden border-[#D1D5DB] shadow-[0_22px_44px_rgba(17,24,39,0.055)]">
      <div className="border-b border-[#E5E7EB] px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="type-label-text text-[11px]">{eyebrow}</div>
            <h2 className="type-page-title mt-2 text-[29px] sm:text-[33px]">{title}</h2>
            <p className="type-body-text mt-3 max-w-[780px] text-[15px] leading-7">
              {description ??
                `The highest-value missed opportunities your team should call back first in ${getDateRangeLabel(
                  selectedRange
                ).toLowerCase()}.`}
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3 xl:min-w-[470px]">
            <div className="surface-secondary min-h-[102px] px-4 py-3.5">
              <div className="type-label-text text-[11px]">Open callbacks</div>
              <div className="type-section-title mt-2.5 text-[22px]">{rows.length}</div>
            </div>
            <div className="surface-secondary min-h-[102px] px-4 py-3.5">
              <div className="type-label-text text-[11px]">Revenue in queue</div>
              <div className="type-section-title mt-2.5 text-[22px]">{formatCurrency(queueRevenue)}</div>
            </div>
            <div className="surface-secondary min-h-[102px] px-4 py-3.5">
              <div className="type-label-text text-[11px]">Highest opportunity</div>
              <div className="type-section-title mt-2.5 text-[22px]">
                {rows.length > 0 ? formatCurrency(highestOpportunity) : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#E5E7EB] bg-[#FCFCFD]">
        {rows.length > 0 ? (
          rows.map((row, index) => (
            <div key={row.id} className="bg-[#FFFFFF] px-5 py-6 sm:px-7 sm:py-7">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_290px] xl:gap-6">
                <div className="min-w-0">
                  <div className="type-label-text text-[10px]">Priority {String(index + 1).padStart(2, "0")}</div>

                  <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="type-page-title text-[25px] leading-[1.04] sm:text-[29px]">
                        {row.caller}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-[#6B7280]">
                        <span>{row.time}</span>
                        <span className="text-[#D1D5DB]">•</span>
                        <span>{row.assignedOwner}</span>
                        <span className="text-[#D1D5DB]">•</span>
                        <span>{row.dueBy}</span>
                      </div>
                    </div>

                    <div className="surface-secondary min-w-[174px] px-4 py-3.5">
                      <div className="type-label-text text-[11px]">Estimated revenue</div>
                      <div className="type-page-title mt-2.5 text-[30px] leading-none text-[#111827]">
                        {row.revenueImpact ?? row.revenue}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3.5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.28fr)]">
                    <div className="space-y-3.5">
                      <div className="surface-secondary px-4 py-4">
                        <div className="type-label-text text-[11px]">Issue summary</div>
                        <div className="type-section-title mt-2 text-[18px] leading-6">{getIssueLabel(row)}</div>
                      </div>

                      <div className="surface-secondary px-4 py-4">
                        <div className="type-label-text text-[11px]">Urgency</div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] ${getUrgencyClasses(
                              row.urgency
                            )}`}
                          >
                            {row.urgency}
                          </span>
                          <span className="type-muted-text text-[12px]">Action owner: {row.assignedOwner}</span>
                        </div>
                      </div>
                    </div>

                    <div className="surface-secondary px-4 py-4">
                      <div className="type-label-text text-[11px]">Recommended next action</div>
                      <div className="type-section-title mt-2 text-[18px] leading-7">{row.nextStep}</div>
                      <p className="type-body-text mt-3 text-[14px] leading-7">{row.recommendedAction}</p>
                    </div>
                  </div>
                </div>

                <div className="surface-secondary flex flex-col justify-between gap-4 px-4 py-4.5">
                  <div>
                    <div className="type-label-text text-[11px]">Action path</div>
                    <p className="type-body-text mt-2.5 text-[14px] leading-7">
                      Confirm the conversation context, document ownership, and close the case once outreach is complete.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenRecord(row)}
                      className="button-primary-accent inline-flex min-h-[44px] cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      Open Record
                    </button>
                    <button
                      type="button"
                      onClick={() => onAssignFollowUp(row)}
                      className="button-secondary-ui inline-flex min-h-[44px] cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      Assign Follow-Up
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkResolved(row)}
                      className="button-secondary-ui inline-flex min-h-[44px] cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-10 text-center sm:px-6">
            <div className="type-section-title text-[18px]">No priority callbacks in this view</div>
            <p className="type-body-text mt-2 text-[14px]">{emptyMessage}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CallsOverviewTable({
  title,
  description,
  rows,
  emptyMessage,
  onOpenRecord
}: {
  title: string;
  description: string;
  rows: DashboardCallRow[];
  emptyMessage: string;
  onOpenRecord: (row: DashboardCallRow) => void;
}) {
  return (
    <section className="surface-primary motion-fade-up overflow-hidden">
      <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6 sm:py-5.5">
        <h2 className="type-section-title text-[20px] sm:text-[22px]">{title}</h2>
        <p className="type-body-text mt-2 text-[14px] leading-6">
          {description}
        </p>
      </div>

      <div className="ui-scrollbar ui-scrollbar-x overflow-x-auto">
        <table className="min-w-[860px] border-separate border-spacing-0 text-left">
          <thead className="bg-[#FAFAFB]">
            <tr className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#4B5563]">
              <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Name</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Outcome</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Issue</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Estimated Value</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5 sm:px-6">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open analysed call for ${row.caller}`}
                  onClick={() => onOpenRecord(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenRecord(row);
                    }
                  }}
                  className="group cursor-pointer transition outline-none hover:bg-[#FAFBFC] focus-visible:bg-[#FAFBFC]"
                >
                  <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="type-section-title text-[16px]">{row.caller}</div>
                        <div className="type-muted-text mt-1 text-[13px]">{getRowActionStatus(row)}</div>
                      </div>
                      <span className="type-muted-text mt-0.5 shrink-0 text-[12px] font-medium transition group-hover:text-[#111827] group-focus-visible:text-[#111827]">
                        Open record →
                      </span>
                    </div>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] ${getOutcomeClasses(
                        row.callOutcome ?? "Pending"
                      )}`}
                    >
                      {row.callOutcome ?? "Pending"}
                    </span>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                    <div className="type-section-title text-[15px] leading-6">{getIssueLabel(row)}</div>
                    <div className="type-body-text mt-1.5 text-[13px] leading-6">
                      {row.conciseAnalystNote ?? row.analystNote ?? row.reason}
                    </div>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                    <div className="inline-flex rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                      <div>
                        <div className="text-[16px] font-bold tracking-[-0.02em] text-[#111827]">
                          {row.revenueImpact ?? row.revenue}
                        </div>
                        <div className="type-label-text mt-0.5 text-[10px]">Revenue Value</div>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-5 align-top sm:px-6">
                    <div className="type-section-title text-[14px]">{row.date}</div>
                    <div className="type-muted-text mt-1 text-[12px]">{row.time}</div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center sm:px-6">
                  <div className="type-body-text text-[15px]">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [selectedRange, setSelectedRange] = useState<DateRangeKey>("30d");
  const [activeTrendBucket, setActiveTrendBucket] = useState<string | null>(null);
  const [rowsState, setRowsState] = useState<DashboardCallRow[]>([]);
  const [dashboardMode, setDashboardMode] = useState<"live" | "demo">("live");
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">("loading");
  const [dataError, setDataError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const solutionMode = useSolutionMode();

  const isServiceBusinessMode = solutionMode === "service_business_missed_call_recovery";
  const copy = getSolutionModeCopy(solutionMode);

  const rowsInSelectedRange = useMemo(
    () => rowsState.filter((row) => isWithinDateRange(row.startedAtRaw, selectedRange)),
    [rowsState, selectedRange]
  );

  const focusedRows = useMemo(
    () =>
      activeTrendBucket
        ? rowsInSelectedRange.filter((row) => row.periodByRange[selectedRange] === activeTrendBucket)
        : rowsInSelectedRange,
    [activeTrendBucket, rowsInSelectedRange, selectedRange]
  );

  const recoveryRowsInSelectedRange = useMemo(() => {
    const recoveryRows = buildMissedCallRecoveryRows(rowsInSelectedRange);

    if (dashboardMode === "demo" && recoveryRows.length === 0) {
      return demoMissedCallRecoveryRows.filter((row) => isWithinDateRange(row.startedAtRaw, selectedRange));
    }

    return recoveryRows;
  }, [dashboardMode, rowsInSelectedRange, selectedRange]);

  const missedRevenueTrendData = useMemo(
    () =>
      dashboardMode === "demo"
        ? demoTrendByRange[selectedRange]
        : buildMissedRevenueTrendData(rowsInSelectedRange, selectedRange),
    [dashboardMode, rowsInSelectedRange, selectedRange]
  );

  const totalRevenue = useMemo(
    () => rowsInSelectedRange.reduce((sum, row) => sum + row.revenueValue, 0),
    [rowsInSelectedRange]
  );

  const missedRevenue = useMemo(
    () =>
      rowsInSelectedRange
        .filter((row) => getRowActionStatus(row) === "Needs Action")
        .reduce((sum, row) => sum + row.revenueValue, 0),
    [rowsInSelectedRange]
  );

  const recoveredRevenue = useMemo(
    () =>
      rowsInSelectedRange
        .filter((row) => getRowActionStatus(row) === "No Action Needed")
        .reduce((sum, row) => sum + row.revenueValue, 0),
    [rowsInSelectedRange]
  );

  const recoveryRate = useMemo(() => {
    if (totalRevenue === 0) return 0;
    return Math.round((recoveredRevenue / totalRevenue) * 100);
  }, [recoveredRevenue, totalRevenue]);

  const highIntentMissedCalls = useMemo(
    () =>
      rowsInSelectedRange.filter(
        (row) => row.category === "missed-booking" && getRowActionStatus(row) === "Needs Action"
      ).length,
    [rowsInSelectedRange]
  );

  const conversionFailures = useMemo(
    () =>
      rowsInSelectedRange.filter((row) => {
        const normalizedOutcome = getNormalizedOutcome(row);

        return (
          getRowActionStatus(row) === "Needs Action" &&
          normalizedOutcome !== "pending" &&
          normalizedOutcome !== "unqualified"
        );
      }).length,
    [rowsInSelectedRange]
  );

  const followUpDelays = useMemo(
    () =>
      rowsInSelectedRange.filter(
        (row) => row.category === "delayed-response" && getRowActionStatus(row) === "Needs Action"
      ).length,
    [rowsInSelectedRange]
  );

  const highIntentUnconvertedCalls = useMemo(
    () =>
      rowsInSelectedRange.filter(
        (row) => isHighIntent(row) && getRowActionStatus(row) === "Needs Action"
      ).length,
    [rowsInSelectedRange]
  );

  const managerReviewCases = useMemo(
    () =>
      rowsInSelectedRange.filter((row) => {
        const normalizedOutcome = getNormalizedOutcome(row);

        return (
          getRowActionStatus(row) === "Needs Action" &&
          (row.status === "Escalated" || normalizedOutcome.includes("poor handling"))
        );
      }).length,
    [rowsInSelectedRange]
  );

  const priorityRows = useMemo(
    () =>
      sortPriorityRows(
        focusedRows.filter((row) => getRowActionStatus(row) === "Needs Action")
      ).slice(0, 4),
    [focusedRows]
  );

  const servicePriorityRows = useMemo(
    () =>
      sortPriorityRows(
        recoveryRowsInSelectedRange.filter((row) => getRowActionStatus(row) === "Needs Action")
      ).slice(0, 4),
    [recoveryRowsInSelectedRange]
  );

  const serviceRecoveryRows = useMemo(
    () => sortPriorityRows(recoveryRowsInSelectedRange),
    [recoveryRowsInSelectedRange]
  );

  const serviceMissedCallsToday = useMemo(
    () => recoveryRowsInSelectedRange.filter((row) => isStartedToday(row.startedAtRaw)).length,
    [recoveryRowsInSelectedRange]
  );

  const serviceAwaitingFollowUp = useMemo(
    () =>
      recoveryRowsInSelectedRange.filter(
        (row) => row.workflowStatusLabel === "Action Required" || row.workflowStatusLabel === "Escalated"
      ).length,
    [recoveryRowsInSelectedRange]
  );

  const serviceSmsSent = useMemo(
    () => recoveryRowsInSelectedRange.filter((row) => row.workflowStatusLabel === "Follow-Up Sent").length,
    [recoveryRowsInSelectedRange]
  );

  const serviceUnresolvedCases = useMemo(
    () => recoveryRowsInSelectedRange.filter((row) => row.workflowStatusLabel !== "Resolved").length,
    [recoveryRowsInSelectedRange]
  );

  const serviceRevenueAtRisk = useMemo(
    () =>
      recoveryRowsInSelectedRange
        .filter((row) => row.workflowStatusLabel !== "Resolved")
        .reduce((sum, row) => sum + row.revenueValue, 0),
    [recoveryRowsInSelectedRange]
  );

  const primaryMetrics = useMemo<PrimaryMetricItem[]>(() => {
    if (isServiceBusinessMode) {
      if (dataState !== "ready") {
        return [
          {
            label: "Missed Calls Today",
            value: "—",
            detail: "Loading today’s inbound calls that require recovery action"
          },
          {
            label: copy.dashboard.serviceFollowUpLabel,
            value: "—",
            detail: "Loading cases that still need a manual callback or escalation"
          },
          {
            label: "SMS Sent",
            value: "—",
            detail: "Loading automatic and manual missed-call follow-up activity"
          },
          {
            label: copy.dashboard.serviceJobsAtRiskLabel,
            value: "—",
            detail: "Loading open recovery work across the active operating window"
          },
          {
            label: "Estimated Revenue At Risk",
            value: "—",
            detail: "Loading the value still exposed across unresolved missed-call cases"
          }
        ];
      }

      return [
        {
          label: "Missed Calls Today",
          value: String(serviceMissedCallsToday),
          detail: "Inbound calls from today that entered the missed-call recovery workflow"
        },
        {
          label: copy.dashboard.serviceFollowUpLabel,
          value: String(serviceAwaitingFollowUp),
          detail: "Open cases that still require a callback, escalation, or same-day action"
        },
        {
          label: "SMS Sent",
          value: String(serviceSmsSent),
          detail: "Recovery cases where follow-up has already been initiated by SMS"
        },
        {
          label: copy.dashboard.serviceJobsAtRiskLabel,
          value: String(serviceUnresolvedCases),
          detail: "Active missed-call recovery work still open inside the selected operating window"
        },
        {
          label: "Estimated Revenue At Risk",
          value: formatCurrency(serviceRevenueAtRisk),
          detail: "Commercial value still exposed across unresolved service-business missed calls"
        }
      ];
    }

    if (dataState !== "ready") {
      return [
        {
          label: "Conversion Failures",
          value: "—",
          detail: "Loading unconverted calls where revenue recovery is still required"
        },
        {
          label: "Revenue At Risk",
          value: "—",
          detail: "Loading commercial value still exposed across unresolved calls"
        },
        {
          label: "Follow-Up Delays",
          value: "—",
          detail: "Loading calls where response timing or callback handling slipped"
        },
        {
          label: "High-Intent Unconverted",
          value: "—",
          detail: "Loading high-intent enquiries that did not convert cleanly"
        },
        {
          label: "Manager Review Cases",
          value: "—",
          detail: "Loading escalation and coaching-style review cases"
        }
      ];
    }

    return [
      {
        label: "Conversion Failures",
        value: String(conversionFailures),
        detail: "Calls with unresolved commercial failure signals that still need recovery action"
      },
      {
        label: "Revenue At Risk",
        value: formatCurrency(missedRevenue),
        detail: "Estimated revenue still tied to unresolved conversion failures and missed follow-up"
      },
      {
        label: "Follow-Up Delays",
        value: String(followUpDelays),
        detail: "Calls where response timing drifted and operational follow-up is still outstanding"
      },
      {
        label: "High-Intent Unconverted",
        value: String(highIntentUnconvertedCalls),
        detail: "Strong-intent enquiries that did not convert and should be prioritised for review"
      },
      {
        label: "Manager Review Cases",
        value: String(managerReviewCases),
        detail: "Escalated or handling-quality calls that may require coaching or manager review"
      }
    ];
  }, [
    conversionFailures,
    dataState,
    followUpDelays,
    highIntentUnconvertedCalls,
    isServiceBusinessMode,
    managerReviewCases,
    missedRevenue,
    serviceAwaitingFollowUp,
    serviceMissedCallsToday,
    serviceRevenueAtRisk,
    serviceSmsSent,
    serviceUnresolvedCases
  ]);

  const summaryItems = useMemo(() => {
    if (isServiceBusinessMode) {
      if (dataState === "loading") {
        return [
          `Recovery Window: ${getDateRangeLabel(selectedRange)}`,
          "Open Cases: Loading...",
          "SMS Sent: Loading...",
          "Last Updated: Syncing..."
        ];
      }

      if (dataState === "error") {
        return [
          `Recovery Window: ${getDateRangeLabel(selectedRange)}`,
          "Open Cases: Unavailable",
          "SMS Sent: Unavailable",
          "Last Updated: Connection failed"
        ];
      }

      return [
        `Recovery Window: ${getDateRangeLabel(selectedRange)}`,
        `Open Cases: ${serviceUnresolvedCases}`,
        `SMS Sent: ${serviceSmsSent}`,
        `Last Updated: ${getLastUpdatedLabel(
          recoveryRowsInSelectedRange.length > 0 ? recoveryRowsInSelectedRange : rowsState
        )}`
      ];
    }

    if (dataState === "loading") {
      return [
        `Analysis Window: ${getDateRangeLabel(selectedRange)}`,
        "Calls Analysed: Loading...",
        "Missed Revenue: Loading...",
        "Last Updated: Syncing..."
      ];
    }

    if (dataState === "error") {
      return [
        `Analysis Window: ${getDateRangeLabel(selectedRange)}`,
        "Calls Analysed: Unavailable",
        "Missed Revenue: Unavailable",
        "Last Updated: Connection failed"
      ];
    }

    return [
      `Analysis Window: ${getDateRangeLabel(selectedRange)}`,
      `Revenue At Risk: ${formatCurrency(missedRevenue)}`,
      `Follow-Up Delays: ${followUpDelays}`,
      activeTrendBucket
        ? `Focused Period: ${activeTrendBucket}`
        : `Missed Calls In Queue: ${serviceUnresolvedCases}`
    ];
  }, [
    activeTrendBucket,
    dataState,
    followUpDelays,
    isServiceBusinessMode,
    missedRevenue,
    recoveryRowsInSelectedRange,
    rowsState,
    selectedRange,
    serviceSmsSent,
    serviceUnresolvedCases
  ]);

  const callListEmptyMessage = useMemo(() => {
    if (dataState === "loading") {
      return "Loading analysed calls from the dashboard data service...";
    }

    if (dataState === "error") {
      return dataError ?? "Unable to load analysed calls right now.";
    }

    if (rowsState.length === 0) {
      return "No analysed calls are available yet. Upload or process call data to populate the dashboard.";
    }

    if (activeTrendBucket) {
      return `No calls match the ${activeTrendBucket} trend focus.`;
    }

    return "No calls match the current operating view.";
  }, [activeTrendBucket, dataError, dataState, rowsState.length]);

  const recoveryListEmptyMessage = useMemo(() => {
    if (dataState === "loading") {
      return "Loading missed-call recovery cases from the dashboard data service...";
    }

    if (dataState === "error") {
      return dataError ?? "Unable to load missed-call recovery cases right now.";
    }

    if (recoveryRowsInSelectedRange.length === 0) {
      return "No missed inbound calls require recovery action in the selected operating window.";
    }

    return "No recovery cases match the current operating view.";
  }, [dataError, dataState, recoveryRowsInSelectedRange.length]);

  useEffect(() => {
    let isCancelled = false;

    async function loadCalls() {
      setDataState("loading");
      setDataError(null);
      let response: Response;

      try {
        response = await fetch("/api/dashboard-calls", {
          method: "GET",
          cache: "no-store"
        });
      } catch {
        if (isCancelled) {
          return;
        }

        setRowsState([]);
        setDashboardMode("live");
        setDataState("error");
        setDataError("Unable to load dashboard data right now. Please try again shortly.");
        return;
      }

      const payload = (await response.json()) as {
        mode?: "live" | "demo";
        message?: string;
        rows?: DashboardCallRow[];
      };

      if (isCancelled) {
        return;
      }

      if (!response.ok) {
        setRowsState([]);
        setDashboardMode("live");
        setDataState("error");
        setDataError(payload.message || "Unable to load dashboard data right now. Please try again shortly.");
        return;
      }

      setRowsState(payload.rows ?? []);
      setDashboardMode(payload.mode === "demo" ? "demo" : "live");
      setDataState("ready");
      setDataError(null);
    }

    void loadCalls();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timeoutId = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!activeTrendBucket) {
      return;
    }

    if (!missedRevenueTrendData.some((point) => point.label === activeTrendBucket)) {
      setActiveTrendBucket(null);
    }
  }, [activeTrendBucket, missedRevenueTrendData]);

  function updateRow(rowId: string, updater: (row: DashboardCallRow) => DashboardCallRow) {
    setRowsState((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? updater(row) : row))
    );
  }

  function buildResolvedRow(row: DashboardCallRow): DashboardCallRow {
    const updatedAtRaw = new Date().toISOString();

    return {
      ...row,
      issue: "Revenue reinstated",
      reason: row.reason,
      status: "Resolved",
      actionStatus: "No Action Needed",
      statusTone: "recovered",
      urgency: "Closed",
      urgencyTone: "recovered",
      dueBy: "Completed",
      callOutcome: row.callOutcome && row.callOutcome !== "Pending" ? row.callOutcome : "Converted",
      missedOpportunityLabel: "No",
      recommendedAction:
        "Case closure confirmed. Revenue impact has been remediated and no further outbound action is required.",
      analystNote: "No further follow-up is required.",
      conciseAnalystNote: "No further follow-up is required.",
      workflowStatusLabel: row.workflowStatusLabel ? "Resolved" : row.workflowStatusLabel,
      updatedAtRaw,
      notes: row.notes.includes("Case marked resolved from the overview.")
        ? row.notes
        : [...row.notes, "Case marked resolved from the overview."]
    };
  }

  function buildFollowUpRow(row: DashboardCallRow): DashboardCallRow {
    const updatedAtRaw = new Date().toISOString();

    return {
      ...row,
      issue: "Estimated revenue leakage",
      status: "Under Review",
      actionStatus: "Needs Action",
      statusTone: "pending",
      urgency: row.urgency === "Closed" ? "Elevated Priority" : row.urgency,
      urgencyTone: row.urgencyTone === "recovered" ? "pending" : row.urgencyTone,
      dueBy: row.dueBy === "Completed" ? "Next Business Day • 09:00" : row.dueBy,
      conciseAnalystNote: "Follow-up ownership has been assigned and outreach is still required.",
      analystNote: "Follow-up ownership has been assigned and outreach is still required.",
      workflowStatusLabel: row.workflowStatusLabel ? "Follow-Up Sent" : row.workflowStatusLabel,
      updatedAtRaw,
      recommendedAction:
        "Immediate outbound follow-up remains required. Ownership has been assigned and customer outreach should be completed within the active response window."
    };
  }

  function handleRowOpen(row: DashboardCallRow) {
    router.push(`/call/${row.id}`);
  }

  function handleAssignFollowUp(row: DashboardCallRow) {
    if (getRowActionStatus(row) === "No Action Needed") {
      setNotice(`${row.caller} does not require further action.`);
      return;
    }

    updateRow(row.id, (currentRow) => {
      const nextRow = buildFollowUpRow(currentRow);

      return {
        ...nextRow,
        notes: nextRow.notes.includes("Follow-up ownership assigned from the overview.")
          ? nextRow.notes
          : [...nextRow.notes, "Follow-up ownership assigned from the overview."]
      };
    });

    setNotice(`Follow-up ownership assigned for ${row.caller}.`);
  }

  function handleMarkResolved(row: DashboardCallRow) {
    if (getRowActionStatus(row) === "No Action Needed") {
      setNotice(`${row.caller} is already marked as resolved.`);
      return;
    }

    updateRow(row.id, buildResolvedRow);
    setNotice(`Case resolved for ${row.caller}.`);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Overview link copied to clipboard.");
    } catch {
      setNotice("Unable to copy the overview link in this browser.");
    }
  }

  function handleRangeChange(range: DateRangeKey) {
    setSelectedRange(range);
    setActiveTrendBucket(null);
    setNotice(`Displaying ${getDateRangeLabel(range)} recovery data.`);
  }

  function handleTrendBucketSelect(label: string) {
    setActiveTrendBucket((currentBucket) => (currentBucket === label ? null : label));
  }

  return (
    <>
      {notice ? (
        <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-[16px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-[14px] font-medium text-[#111827] shadow-[0_14px_30px_rgba(17,24,39,0.08)]">
          {notice}
        </div>
      ) : null}

      <main>
        <DashboardHeader
          title={
            isServiceBusinessMode ? "Missed Call Recovery" : "Call Performance / Revenue Recovery"
          }
          description={
            isServiceBusinessMode
              ? "Operational view of missed inbound calls, follow-up activity, jobs at risk, and unresolved recovery cases that still need action."
              : "Performance view of conversion failures, revenue exposure, follow-up delays, and the calls that need coaching or recovery attention first."
          }
          selectedRange={selectedRange}
          summaryItems={summaryItems}
          onSelectRange={handleRangeChange}
          onCopyLink={handleCopyLink}
        />

        <div className="mt-6 space-y-6 lg:mt-7 xl:space-y-7">
          {dataState === "error" && dataError ? (
            <div className="surface-primary border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-[14px] text-[#991B1B]">
              {dataError}
            </div>
          ) : null}

          {isServiceBusinessMode ? (
            <>
              <PriorityCallbacksPanel
                rows={servicePriorityRows}
                selectedRange={selectedRange}
                eyebrow="Service recovery queue"
                title="Priority Callbacks"
                description={`Missed inbound calls that still require follow-up action in ${getDateRangeLabel(
                  selectedRange
                ).toLowerCase()}.`}
                emptyMessage="No missed inbound calls are currently waiting for callback action in this operating window."
                onOpenRecord={handleRowOpen}
                onAssignFollowUp={handleAssignFollowUp}
                onMarkResolved={handleMarkResolved}
              />

              <PrimaryMetrics
                items={primaryMetrics}
                description="Missed-call volume, follow-up progress, and unresolved recovery work for the active operating window."
              />

              <CallsOverviewTable
                title="Recovery cases"
                description="Operational queue of missed inbound calls, follow-up activity, and unresolved recovery work for the selected window."
                rows={serviceRecoveryRows}
                emptyMessage={recoveryListEmptyMessage}
                onOpenRecord={handleRowOpen}
              />
            </>
          ) : (
            <>
              <PrimaryMetrics items={primaryMetrics} />

              <PriorityCallbacksPanel
                rows={priorityRows}
                selectedRange={selectedRange}
                eyebrow="Performance recovery queue"
                title="Revenue Recovery Priorities"
                description={`High-intent unconverted calls, follow-up delays, and missed-call recovery cases that need action in ${getDateRangeLabel(
                  selectedRange
                ).toLowerCase()}.`}
                emptyMessage="No unresolved conversion failures or follow-up delays are active in this view."
                onOpenRecord={handleRowOpen}
                onAssignFollowUp={handleAssignFollowUp}
                onMarkResolved={handleMarkResolved}
              />

              <section>
                <MissedOpportunitiesChart
                  title="Missed revenue trend"
                  data={missedRevenueTrendData}
                  activeBucket={activeTrendBucket}
                  onBucketSelect={handleTrendBucketSelect}
                  subtitle="Track where missed revenue is accumulating over time and focus the operating view on a specific reporting period."
                  tooltipLabel="missed revenue"
                  valueFormatter={formatCurrency}
                />
              </section>

              <CallsOverviewTable
                title="Call performance queue"
                description="Analysed calls requiring revenue recovery, follow-up review, or manager coaching attention."
                rows={focusedRows}
                emptyMessage={callListEmptyMessage}
                onOpenRecord={handleRowOpen}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
