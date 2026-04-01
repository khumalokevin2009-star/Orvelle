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
  getLastUpdatedLabel,
  isWithinDateRange,
  type DashboardCallRow
} from "@/lib/dashboard-calls";
import {
  demoDashboardMetricSnapshot,
  demoTrendByRange
} from "@/lib/demo-dashboard-data";

type PrimaryMetricItem = {
  label: string;
  value: string;
  detail: string;
};

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
  items
}: {
  items: PrimaryMetricItem[];
}) {
  return (
    <section className="motion-fade-up">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="type-section-title text-[18px] sm:text-[19px]">Key metrics</h2>
          <p className="type-body-text mt-1 text-[14px]">
            Revenue exposure, recovery progress, and analysis coverage for the active window.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={item.label}
            className="surface-primary motion-fade-up px-5 py-5 sm:px-6"
            style={{ animationDelay: `${70 + index * 45}ms` }}
          >
            <div className="type-label-text text-[12px]">{item.label}</div>
            <div className="type-metric-text mt-3 text-[34px] sm:text-[38px]">{item.value}</div>
            <p className="type-body-text mt-2 text-[13px]">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PriorityCallbacksPanel({
  rows,
  selectedRange,
  onOpenRecord,
  onAssignFollowUp,
  onMarkResolved
}: {
  rows: DashboardCallRow[];
  selectedRange: DateRangeKey;
  onOpenRecord: (row: DashboardCallRow) => void;
  onAssignFollowUp: (row: DashboardCallRow) => void;
  onMarkResolved: (row: DashboardCallRow) => void;
}) {
  return (
    <section className="surface-primary motion-fade-up overflow-hidden">
      <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="type-page-title text-[28px] sm:text-[30px]">Priority Callbacks</h2>
            <p className="type-body-text mt-2 max-w-[720px] text-[15px]">
              The highest-value missed opportunities your team should call back first in{" "}
              {getDateRangeLabel(selectedRange).toLowerCase()}.
            </p>
          </div>
          <div className="surface-secondary px-3 py-2 text-right">
            <div className="type-label-text text-[11px]">Open callback queue</div>
            <div className="type-section-title mt-1 text-[18px]">{rows.length}</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#E5E7EB]">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.id} className="bg-[#FFFFFF] px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="type-page-title text-[24px] leading-[1.05] sm:text-[26px]">
                        {row.caller}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[#6B7280]">
                        <span>{row.time}</span>
                        <span className="text-[#D1D5DB]">•</span>
                        <span>{row.assignedOwner}</span>
                        <span className="text-[#D1D5DB]">•</span>
                        <span>{row.dueBy}</span>
                      </div>
                    </div>

                    <div className="surface-secondary min-w-[152px] px-4 py-3">
                      <div className="type-label-text text-[11px]">Estimated Revenue Opportunity</div>
                      <div className="type-section-title mt-2 text-[24px] text-[#111827]">
                        {row.revenueImpact ?? row.revenue}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
                    <div className="space-y-4">
                      <div>
                        <div className="type-label-text text-[11px]">Issue</div>
                        <div className="type-section-title mt-1 text-[16px]">{getIssueLabel(row)}</div>
                      </div>

                      <div>
                        <div className="type-label-text text-[11px]">Urgency</div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] ${getUrgencyClasses(
                              row.urgency
                            )}`}
                          >
                            {row.urgency}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="type-label-text text-[11px]">Recommended Action</div>
                      <p className="type-body-text mt-2 text-[14px] leading-7">{row.recommendedAction}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenRecord(row)}
                  className="button-primary-accent inline-flex cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Open Record
                </button>
                <button
                  type="button"
                  onClick={() => onAssignFollowUp(row)}
                  className="button-secondary-ui inline-flex cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Assign Follow-Up
                </button>
                <button
                  type="button"
                  onClick={() => onMarkResolved(row)}
                  className="button-secondary-ui inline-flex cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-10 text-center sm:px-6">
            <div className="type-section-title text-[18px]">No priority callbacks in this view</div>
            <p className="type-body-text mt-2 text-[14px]">
              All analysed calls in the current window are either resolved or outside the selected trend focus.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function PerformanceSnapshot({
  focusedRows,
  focusedMissedRevenue,
  averageResponseDelay
}: {
  focusedRows: DashboardCallRow[];
  focusedMissedRevenue: number;
  averageResponseDelay: number;
}) {
  const resolvedCount = focusedRows.filter((row) => getRowActionStatus(row) === "No Action Needed").length;
  const callbackQueueCount = focusedRows.filter((row) => getRowActionStatus(row) === "Needs Action").length;

  const items = [
    {
      label: "Callback Queue",
      value: String(callbackQueueCount),
      detail: "Open calls requiring a commercial follow-up"
    },
    {
      label: "Focused Missed Revenue",
      value: formatCurrency(focusedMissedRevenue),
      detail: "Revenue still exposed inside the active trend focus"
    },
    {
      label: "Resolved Calls",
      value: String(resolvedCount),
      detail: "Calls already recovered or closed without more action"
    },
    {
      label: "Avg. Response Delay",
      value: `${averageResponseDelay.toFixed(1)} hrs`,
      detail: "Average elapsed time before first follow-up activity"
    }
  ];

  return (
    <section className="surface-secondary motion-fade-up p-5">
      <div className="border-b border-[#E5E7EB] pb-4">
        <h3 className="type-section-title text-[18px]">Performance snapshot</h3>
        <p className="type-body-text mt-1 text-[14px]">
          Operational context for the current queue and trend focus.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {items.map((item) => (
          <div key={item.label} className="surface-primary px-4 py-4">
            <div className="type-label-text text-[11px]">{item.label}</div>
            <div className="type-section-title mt-2 text-[26px]">{item.value}</div>
            <p className="type-body-text mt-2 text-[13px]">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CallsOverviewTable({
  rows,
  emptyMessage,
  onOpenRecord
}: {
  rows: DashboardCallRow[];
  emptyMessage: string;
  onOpenRecord: (row: DashboardCallRow) => void;
}) {
  return (
    <section className="surface-primary motion-fade-up overflow-hidden">
      <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6">
        <h2 className="type-section-title text-[20px] sm:text-[22px]">Analysed calls</h2>
        <p className="type-body-text mt-2 text-[14px]">
          Recent analysed calls driving missed revenue, recoveries, and operational follow-up.
        </p>
      </div>

      <div className="ui-scrollbar ui-scrollbar-x overflow-x-auto">
        <table className="min-w-[760px] border-separate border-spacing-0 text-left">
          <thead className="bg-[#F9FAFB]">
            <tr className="text-[13px] font-medium uppercase tracking-[0.05em] text-[#374151]">
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Name</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Outcome</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Issue</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Value</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Timestamp</th>
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
                  className="cursor-pointer transition outline-none hover:bg-[#F3F4F6] focus-visible:bg-[#F3F4F6]"
                >
                  <td className="border-b border-[#E5E7EB] px-5 py-4 align-top">
                    <div className="type-section-title text-[16px]">{row.caller}</div>
                    <div className="type-muted-text mt-1 text-[13px]">{getRowActionStatus(row)}</div>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-4 align-top">
                    <div className="type-section-title text-[15px]">{row.callOutcome ?? "Pending"}</div>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-4 align-top">
                    <div className="type-body-text text-[14px]">{getIssueLabel(row)}</div>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-4 align-top">
                    <div className="text-[16px] font-bold tracking-[-0.02em] text-[#111827]">
                      {row.revenueImpact ?? row.revenue}
                    </div>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-4 align-top">
                    <div className="type-body-text text-[14px]">{row.date}</div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center">
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

  const focusedMissedRevenue = useMemo(
    () =>
      focusedRows
        .filter((row) => getRowActionStatus(row) === "Needs Action")
        .reduce((sum, row) => sum + row.revenueValue, 0),
    [focusedRows]
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

  const averageResponseDelay = useMemo(() => {
    if (focusedRows.length === 0) return 0;

    return focusedRows.reduce((sum, row) => sum + row.responseDelayHours, 0) / focusedRows.length;
  }, [focusedRows]);

  const priorityRows = useMemo(
    () =>
      sortPriorityRows(
        focusedRows.filter((row) => getRowActionStatus(row) === "Needs Action")
      ).slice(0, 4),
    [focusedRows]
  );

  const primaryMetrics = useMemo<PrimaryMetricItem[]>(() => {
    if (dataState !== "ready") {
      return [
        {
          label: "Missed Revenue",
          value: "—",
          detail: "Loading revenue exposure for the active analysis window"
        },
        {
          label: "High-Intent Missed Calls",
          value: "—",
          detail: "Loading calls that likely should have converted"
        },
        {
          label: "Recovery Rate",
          value: "—",
          detail: "Loading recovery performance across analysed calls"
        },
        {
          label: "Calls Analysed",
          value: "—",
          detail: "Loading call coverage for the selected period"
        }
      ];
    }

    if (dashboardMode === "demo") {
      return [
        {
          label: "Missed Revenue",
          value: formatCurrency(demoDashboardMetricSnapshot.missedRevenue),
          detail: "Estimated revenue still exposed across the active callback queue"
        },
        {
          label: "High-Intent Missed Calls",
          value: String(demoDashboardMetricSnapshot.highIntentMissedCalls),
          detail: "High-intent calls that should be prioritised for revenue recovery"
        },
        {
          label: "Recovery Rate",
          value: `${demoDashboardMetricSnapshot.recoveryRate}%`,
          detail: "Revenue already recovered across the monitored operating window"
        },
        {
          label: "Calls Analysed",
          value: String(demoDashboardMetricSnapshot.callsAnalysed),
          detail: "Calls processed through the operating system view"
        }
      ];
    }

    return [
      {
        label: "Missed Revenue",
        value: formatCurrency(missedRevenue),
        detail: "Estimated revenue still tied to unresolved missed opportunities"
      },
      {
        label: "High-Intent Missed Calls",
        value: String(highIntentMissedCalls),
        detail: "Actionable calls where commercial intent appears strongest"
      },
      {
        label: "Recovery Rate",
        value: `${recoveryRate}%`,
        detail: `${formatCurrency(recoveredRevenue)} recovered across the selected analysis window`
      },
      {
        label: "Calls Analysed",
        value: String(rowsInSelectedRange.length),
        detail: "Calls currently represented in the revenue recovery operating view"
      }
    ];
  }, [dashboardMode, dataState, highIntentMissedCalls, missedRevenue, recoveredRevenue, recoveryRate, rowsInSelectedRange.length]);

  const summaryItems = useMemo(() => {
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

    if (dashboardMode === "demo") {
      return [
        `Analysis Window: ${getDateRangeLabel(selectedRange)}`,
        `Calls Analysed: ${demoDashboardMetricSnapshot.callsAnalysed}`,
        `Missed Revenue: ${formatCurrency(demoDashboardMetricSnapshot.missedRevenue)}`,
        activeTrendBucket ? `Focused Period: ${activeTrendBucket}` : "Last Updated: 14 minutes ago"
      ];
    }

    return [
      `Analysis Window: ${getDateRangeLabel(selectedRange)}`,
      `Calls Analysed: ${rowsInSelectedRange.length}`,
      `Missed Revenue: ${formatCurrency(missedRevenue)}`,
      activeTrendBucket
        ? `Focused Period: ${activeTrendBucket}`
        : `Last Updated: ${getLastUpdatedLabel(rowsInSelectedRange.length > 0 ? rowsInSelectedRange : rowsState)}`
    ];
  }, [activeTrendBucket, dashboardMode, dataState, missedRevenue, rowsInSelectedRange, rowsState, selectedRange]);

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
      notes: row.notes.includes("Case marked resolved from the overview.")
        ? row.notes
        : [...row.notes, "Case marked resolved from the overview."]
    };
  }

  function buildFollowUpRow(row: DashboardCallRow): DashboardCallRow {
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
          selectedRange={selectedRange}
          summaryItems={summaryItems}
          onSelectRange={handleRangeChange}
          onCopyLink={handleCopyLink}
        />

        <div className="mt-5 space-y-5 lg:mt-6 xl:space-y-6">
          {dataState === "error" && dataError ? (
            <div className="surface-primary border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-[14px] text-[#991B1B]">
              {dataError}
            </div>
          ) : null}

          <PrimaryMetrics items={primaryMetrics} />

          <PriorityCallbacksPanel
            rows={priorityRows}
            selectedRange={selectedRange}
            onOpenRecord={handleRowOpen}
            onAssignFollowUp={handleAssignFollowUp}
            onMarkResolved={handleMarkResolved}
          />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_340px] xl:items-start xl:gap-5">
            <MissedOpportunitiesChart
              title="Missed revenue trend"
              data={missedRevenueTrendData}
              activeBucket={activeTrendBucket}
              onBucketSelect={handleTrendBucketSelect}
              subtitle="Track where missed revenue is accumulating over time and focus the operating view on a specific reporting period."
              peakLabel="Peak Missed Revenue"
              tooltipLabel="missed revenue"
              valueFormatter={formatCurrency}
            />
            <PerformanceSnapshot
              focusedRows={focusedRows}
              focusedMissedRevenue={focusedMissedRevenue}
              averageResponseDelay={averageResponseDelay}
            />
          </section>

          <CallsOverviewTable
            rows={focusedRows}
            emptyMessage={callListEmptyMessage}
            onOpenRecord={handleRowOpen}
          />
        </div>
      </main>
    </>
  );
}
