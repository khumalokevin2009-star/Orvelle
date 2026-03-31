"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ActionBar, type ActionPanel } from "@/components/action-bar";
import {
  DashboardHeader,
  getDateRangeLabel,
  type DateRangeKey
} from "@/components/dashboard-header";
import {
  FlaggedCallsTable
} from "@/components/flagged-calls-table";
import {
  type CallTableRow,
  type CallTabId
} from "@/data/mock-platform-data";
import {
  MetricCards,
  RevenueSummaryCards,
  type MetricCardItem,
  type RevenueSummaryItem
} from "@/components/metric-cards";
import { MissedOpportunitiesChart } from "@/components/missed-opportunities-chart";
import { BoltIcon, MailMiniIcon, SearchFlagIcon, SettingsIcon, StatsIcon } from "@/components/icons";
import {
  buildTrendData,
  getLastUpdatedLabel,
  isWithinDateRange,
  type DashboardCallRow,
} from "@/lib/dashboard-calls";

type SidebarItem = "dashboard" | "mail";

type PanelState =
  | {
      type: ActionPanel | "mail";
    }
  | {
      type: "call";
      rowId: string;
    }
  | null;

type SettingsState = {
  emailAlerts: boolean;
  reviewLock: boolean;
  revenueWarnings: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function formatTabLabel(tab: CallTabId | null) {
  if (!tab) return "All Flagged Interactions";

  if (tab === "missed-booking") return "Unconverted High-Intent Leads";
  if (tab === "delayed-response") return "Response SLA Breaches";

  return "Booked Interactions";
}

function getOpenRecoveryCount(rows: CallTableRow[]) {
  return rows.filter((row) => (row.actionStatus ?? (row.status === "Resolved" ? "No Action Needed" : "Needs Action")) === "Needs Action").length;
}

function getRowActionStatus(row: CallTableRow) {
  return row.actionStatus ?? (row.status === "Resolved" ? "No Action Needed" : "Needs Action");
}

function DrawerMetric({
  label,
  value,
  accent = false
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`${accent ? "surface-primary" : "surface-secondary"} px-4 py-3`}>
      <div className="type-label-text text-[12px]">{label}</div>
      <div className={`type-section-title mt-2 text-[20px] ${accent ? "text-[#111827]" : "text-[#111827]"}`}>
        {value}
      </div>
    </div>
  );
}

type ActivityTone = "warning" | "info" | "neutral";

function RecentActivityPanel({
  items
}: {
  items: Array<{ title: string; detail: string; time: string; tone: ActivityTone }>;
}) {
  const dotStyles: Record<(typeof items)[number]["tone"], string> = {
    warning: "bg-[#111827]",
    info: "bg-[#6B7280]",
    neutral: "bg-[#D1D5DB]"
  };

  return (
    <section className="surface-secondary motion-fade-up motion-delay-3 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="type-section-title text-[18px]">Operational Activity Log</h3>
          <p className="type-body-text mt-1 text-[14px]">
            Recent status changes, escalation events, and revenue impact updates.
          </p>
        </div>
        <div className="surface-primary px-3 py-1 text-[12px] font-semibold text-[#374151]">
          Operational Feed
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={`${item.title}-${item.time}`} className="surface-primary px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${dotStyles[item.tone]}`} />
                  <span className="type-section-title text-[14px]">{item.title}</span>
                </div>
                <p className="type-body-text mt-1 text-[13px]">{item.detail}</p>
              </div>
              <span className="type-muted-text whitespace-nowrap text-[12px]">{item.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[12px] border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
        <div className="type-section-title text-[13px]">No unresolved escalations detected</div>
        <p className="type-body-text mt-1 text-[13px]">
          Additional operational alerts will appear here when a new conversion failure or SLA breach requires intervention.
        </p>
      </div>
    </section>
  );
}

function ReviewQueuePanel({
  rows
}: {
  rows: CallTableRow[];
}) {
  const statusClasses: Record<CallTableRow["statusTone"], string> = {
    critical: "border border-[#C7D2FE] bg-[#EEF2FF] text-[#1E3A8A]",
    pending: "border border-[#C7D2FE] bg-[#EEF2FF] text-[#1E3A8A]",
    recovered: "border border-[#E5E7EB] bg-[#FFFFFF] text-[#111827]"
  };

  return (
    <section className="surface-primary motion-fade-up motion-delay-3 overflow-hidden">
      <div className="border-b border-[#E5E7EB] px-6 py-5">
        <h3 className="type-section-title text-[18px]">Review Queue</h3>
        <p className="type-body-text mt-1 text-[14px]">
          Pending analyst assignments and due times for unresolved interaction cases.
        </p>
      </div>

      <div className="ui-scrollbar ui-scrollbar-x overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left">
          <thead className="bg-[#F9FAFB]">
            <tr className="text-[13px] font-medium uppercase tracking-[0.05em] text-[#374151]">
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Caller</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Failure Type</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Assigned Owner</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Due By</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={`queue-${row.id}`} className="hover:bg-[#F3F4F6]">
                  <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top">
                    <div className="type-section-title text-[15px]">{row.caller}</div>
                    <div className="type-muted-text mt-1 text-[13px]">{row.date}</div>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top">
                    <div className="type-section-title text-[14px]">{row.reason}</div>
                    <div className="type-body-text mt-1 text-[13px]">{row.issue}</div>
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top text-[14px] font-medium text-[#111827]">
                    {row.assignedOwner}
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top text-[14px] font-medium text-[#111827]">
                    {row.dueBy}
                  </td>
                  <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top text-right">
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] ${statusClasses[row.statusTone]}`}
                    >
                      {getRowActionStatus(row)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="type-body-text px-6 py-10 text-center text-[15px]">
                  No unresolved cases are currently queued for analyst action.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResolutionOutcomesPanel({
  recoveredRevenue,
  resolvedCases,
  escalatedCases,
  averageDelayHours
}: {
  recoveredRevenue: string;
  resolvedCases: number;
  escalatedCases: number;
  averageDelayHours: number;
}) {
  const outcomeCards = [
    {
      label: "Recovered Revenue",
      value: recoveredRevenue,
      detail: "Restored through completed remediation activity"
    },
    {
      label: "Resolved Cases",
      value: String(resolvedCases),
      detail: "Interaction records closed without further action"
    },
    {
      label: "Escalated Cases",
      value: String(escalatedCases),
      detail: "Interactions routed for management attention"
    },
    {
      label: "Avg. Response Delay",
      value: `${averageDelayHours.toFixed(1)} hrs`,
      detail: "Average delay before first documented follow-up"
    }
  ];

  return (
    <section className="surface-secondary motion-fade-up motion-delay-3 p-5">
      <div className="border-b border-[#E5E7EB] pb-4">
        <h3 className="type-section-title text-[18px]">Resolution Outcomes</h3>
        <p className="type-body-text mt-1 text-[14px]">
          Outcome indicators summarizing remediation performance across the active case set.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {outcomeCards.map((item) => (
          <div key={item.label} className="surface-primary px-4 py-4">
            <div className="type-label-text text-[12px]">
              {item.label}
            </div>
            <div className="type-metric-text mt-2 text-[36px]">
              {item.value}
            </div>
            <p className="type-body-text mt-2 text-[13px]">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onToggle
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="surface-primary flex w-full cursor-pointer items-center justify-between px-4 py-4 text-left transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
    >
      <div>
        <div className="type-section-title text-[15px]">{label}</div>
        <div className="type-body-text mt-1 text-[14px]">{description}</div>
      </div>
      <span
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? "bg-[#2563EB]" : "bg-[#D1D5DB]"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-[#FFFFFF] transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

function SlideOver({
  panel,
  activeTab,
  selectedRange,
  selectedRow,
  filteredRows,
  settingsState,
  onClose,
  onToggleSetting,
  onMarkResolved,
  onScheduleCallback,
  onAddNote
}: {
  panel: PanelState;
  activeTab: CallTabId | null;
  selectedRange: DateRangeKey;
  selectedRow: CallTableRow | null;
  filteredRows: CallTableRow[];
  settingsState: SettingsState;
  onClose: () => void;
  onToggleSetting: (key: keyof SettingsState) => void;
  onMarkResolved: () => void;
  onScheduleCallback: () => void;
  onAddNote: () => void;
}) {
  if (!panel) return null;

  const totalRevenue = filteredRows.reduce((sum, row) => sum + row.revenueValue, 0);
  const averageRevenue = filteredRows.length > 0 ? Math.round(totalRevenue / filteredRows.length) : 0;
  const recoveryActionsOpen = getOpenRecoveryCount(filteredRows);
  const actionRequiredCount = filteredRows.filter((row) => row.status === "Action Required").length;
  const underReviewCount = filteredRows.filter((row) => row.status === "Under Review").length;
  const escalatedCount = filteredRows.filter((row) => row.status === "Escalated").length;
  const resolvedCount = filteredRows.filter((row) => row.status === "Resolved").length;

  const panelMeta =
    panel.type === "automations"
      ? {
          title: "Workflow Rules",
          subtitle: "Rule-based routing for conversion failures, SLA breaches, and escalation workflows.",
          icon: BoltIcon
        }
      : panel.type === "statistics"
        ? {
            title: "Operational Metrics",
            subtitle: "Performance summary for the active interaction analysis queue.",
            icon: StatsIcon
          }
        : panel.type === "settings"
          ? {
              title: "Configuration",
              subtitle: "Administrative controls for notification thresholds, record handling, and revenue leakage monitoring.",
              icon: SettingsIcon
            }
          : panel.type === "mail"
            ? {
                title: "Operational Inbox",
                subtitle: "Structured feed for alerts, exports, escalations, and analyst coordination.",
                icon: MailMiniIcon
              }
            : {
                title: "Inspect Call",
                subtitle: "Structured inspection of the selected interaction and recommended remediation pathway.",
                icon: SearchFlagIcon
              };

  const Icon = panelMeta.icon;

  return (
    <div className="fixed inset-0 z-50 bg-[#020617]/70 backdrop-blur-[3px]">
      <button type="button" aria-label="Close panel" className="absolute inset-0 cursor-pointer" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={panelMeta.title}
        className="absolute right-4 top-4 bottom-4 z-10 flex w-[calc(100%-2rem)] max-w-[390px] flex-col rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-[0_24px_70px_rgba(17,24,39,0.12)] sm:right-6 sm:top-6 sm:bottom-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] pb-4">
          <div className="min-w-0">
            <div className="surface-secondary inline-flex h-10 w-10 items-center justify-center text-[#111827]">
              <Icon className="h-[18px] w-[18px]" />
            </div>
            <h2 className="type-page-title mt-3 text-[24px]">{panelMeta.title}</h2>
            <p className="type-body-text mt-1 text-[14px]">{panelMeta.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="button-secondary-ui inline-flex h-10 w-10 cursor-pointer items-center justify-center text-[22px] leading-none text-[#6B7280] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:text-[#111827] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        <div className="ui-scrollbar ui-scrollbar-y mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
          {panel.type === "call" && selectedRow ? (
            <>
              <div className="surface-secondary p-4">
                <div className="type-label-text text-[13px]">Interaction Record</div>
                <div className="type-page-title mt-2 text-[24px]">{selectedRow.caller}</div>
                <div className="type-body-text mt-1 text-[14px]">
                  {selectedRow.phone} • {selectedRow.date}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DrawerMetric label="Revenue Impact" value={selectedRow.revenueImpact ?? selectedRow.revenue} accent />
                <DrawerMetric label="Primary Issue" value={selectedRow.primaryIssue ?? selectedRow.reason} />
                <DrawerMetric label="Action Status" value={getRowActionStatus(selectedRow)} />
                <DrawerMetric label="Call Outcome" value={selectedRow.callOutcome ?? "Analysis Pending"} />
                <DrawerMetric label="Intent Level" value={selectedRow.intentLevel ?? "Analysis Pending"} />
                <DrawerMetric
                  label="Missed Opportunity"
                  value={selectedRow.missedOpportunityLabel ?? "Analysis Pending"}
                />
              </div>

              <div className="surface-primary p-4">
                <div className="type-section-title text-[15px]">Interaction Summary</div>
                <p className="type-body-text mt-3 text-[14px]">{selectedRow.summary}</p>
              </div>

              <div className="surface-primary p-4">
                <div className="type-section-title text-[15px]">Recommended Action</div>
                <p className="type-body-text mt-3 text-[14px]">{selectedRow.recommendedAction}</p>
              </div>

              {selectedRow.notes.length > 0 ? (
                <div className="surface-secondary p-4">
                  <div className="type-section-title text-[15px]">Operational Notes</div>
                  <div className="mt-3 space-y-2">
                    {selectedRow.notes.map((note, index) => (
                      <div key={`${selectedRow.id}-note-${index}`} className="type-body-text surface-primary px-3 py-2 text-[13px]">
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={getRowActionStatus(selectedRow) === "No Action Needed"}
                  onClick={onMarkResolved}
                  className="button-primary-accent inline-flex min-w-[160px] flex-1 cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#1D4ED8] hover:bg-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#D1D5DB] disabled:bg-[#D1D5DB] disabled:text-white/80"
                >
                  Mark as Resolved
                </button>
                <button
                  type="button"
                  disabled={getRowActionStatus(selectedRow) === "No Action Needed"}
                  onClick={onScheduleCallback}
                  className="button-secondary-ui inline-flex min-w-[160px] flex-1 cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                >
                  Schedule Callback
                </button>
                <button
                  type="button"
                  onClick={onAddNote}
                  className="button-secondary-ui inline-flex min-w-[140px] flex-1 cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  Add Operational Note
                </button>
              </div>
            </>
          ) : null}

          {panel.type === "automations" ? (
            <>
              {[
                {
                  title: "SLA Breach Escalation",
                  detail: "Route inbound interactions that exceed the defined response window to the revenue operations queue.",
                  status: "Active"
                },
                {
                  title: "High-Intent Conversion Recovery",
                  detail: "Escalate interactions with revenue exposure above £300 to the assigned analyst owner.",
                  status: "Draft"
                },
                {
                  title: "Daily Revenue Leakage Export",
                  detail: "Deliver a structured CSV summary of flagged interactions to the operational inbox each evening.",
                  status: "Paused"
                }
              ].map((item) => (
                <div key={item.title} className="surface-primary p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="type-section-title text-[15px]">{item.title}</div>
                    <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[12px] font-semibold text-[#111827]">
                      {item.status}
                    </span>
                  </div>
                  <p className="type-body-text mt-2 text-[14px]">{item.detail}</p>
                </div>
              ))}

              <button
                type="button"
                onClick={onClose}
                className="button-secondary-ui inline-flex w-full cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                Close Panel
              </button>
            </>
          ) : null}

          {panel.type === "statistics" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <DrawerMetric label="Analysis Window" value={`${getDateRangeLabel(selectedRange)}`} />
                <DrawerMetric label="Interaction Queue" value={formatTabLabel(activeTab)} accent />
                <DrawerMetric label="Estimated Revenue Leakage" value={formatCurrency(totalRevenue)} />
                <DrawerMetric label="Average Exposure" value={formatCurrency(averageRevenue)} />
              </div>

              <div className="surface-primary p-4">
                <div className="type-section-title text-[15px]">Operational Summary</div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-[14px] text-[#6B7280]">
                    <span>Open action items</span>
                    <span className="font-semibold text-[#111827]">{recoveryActionsOpen}</span>
                  </div>
                  <div className="flex items-center justify-between text-[14px] text-[#6B7280]">
                    <span>Action required</span>
                    <span className="font-semibold text-[#111827]">{actionRequiredCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[14px] text-[#6B7280]">
                    <span>Under review</span>
                    <span className="font-semibold text-[#111827]">{underReviewCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[14px] text-[#6B7280]">
                    <span>Escalated</span>
                    <span className="font-semibold text-[#111827]">{escalatedCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[14px] text-[#6B7280]">
                    <span>Resolved</span>
                    <span className="font-semibold text-[#111827]">{resolvedCount}</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {panel.type === "settings" ? (
            <>
              <SettingToggle
                label="Escalation Notifications"
                description="Trigger analyst notifications when new critical-priority interactions are classified."
                checked={settingsState.emailAlerts}
                onToggle={() => onToggleSetting("emailAlerts")}
              />
              <SettingToggle
                label="Record Retention Lock"
                description="Retain inspected interaction records until an operations manager clears the case."
                checked={settingsState.reviewLock}
                onToggle={() => onToggleSetting("reviewLock")}
              />
              <SettingToggle
                label="Revenue Leakage Threshold Alerts"
                description="Apply elevated queue emphasis to interactions above £300 estimated revenue exposure."
                checked={settingsState.revenueWarnings}
                onToggle={() => onToggleSetting("revenueWarnings")}
              />
            </>
          ) : null}

          {panel.type === "mail" ? (
            <>
              {[
                {
                  title: "Action required queue update",
                  detail: `Two flagged interactions require outbound follow-up within ${getDateRangeLabel(selectedRange).toLowerCase()}.`,
                  time: "Just now"
                },
                {
                  title: "Export report generated",
                  detail: "The latest interaction analysis export is available for downstream operational analysis.",
                  time: "12 minutes ago"
                },
                {
                  title: "Escalation note recorded",
                  detail: "One response SLA breach remains without assigned ownership in the front desk queue.",
                  time: "1 hour ago"
                }
              ].map((message) => (
                <div key={message.title} className="surface-primary p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="type-section-title text-[15px]">{message.title}</div>
                    <span className="type-muted-text text-[12px]">{message.time}</span>
                  </div>
                  <p className="type-body-text mt-2 text-[14px]">{message.detail}</p>
                </div>
              ))}

              <button
                type="button"
                onClick={onClose}
                className="button-secondary-ui inline-flex w-full cursor-pointer items-center justify-center px-4 py-3 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                Return to Overview
              </button>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [activeSidebar, setActiveSidebar] = useState<SidebarItem>("dashboard");
  const [selectedRange, setSelectedRange] = useState<DateRangeKey>("30d");
  const [activeTab, setActiveTab] = useState<CallTabId | null>(null);
  const [activeTrendBucket, setActiveTrendBucket] = useState<string | null>(null);
  const [rowsState, setRowsState] = useState<DashboardCallRow[]>([]);
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">("loading");
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsState, setSettingsState] = useState<SettingsState>({
    emailAlerts: true,
    reviewLock: false,
    revenueWarnings: true
  });

  const rowsInSelectedRange = useMemo(
    () => rowsState.filter((row) => isWithinDateRange(row.startedAtRaw, selectedRange)),
    [rowsState, selectedRange]
  );

  const rowsByCategory = useMemo(
    () => (activeTab ? rowsInSelectedRange.filter((row) => row.category === activeTab) : rowsInSelectedRange),
    [activeTab, rowsInSelectedRange]
  );

  const filteredRows = useMemo(
    () =>
      activeTrendBucket
        ? rowsByCategory.filter((row) => row.periodByRange[selectedRange] === activeTrendBucket)
        : rowsByCategory,
    [activeTrendBucket, rowsByCategory, selectedRange]
  );
  const trendData = useMemo(() => buildTrendData(rowsByCategory, selectedRange), [rowsByCategory, selectedRange]);

  const totalRevenue = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.revenueValue, 0),
    [filteredRows]
  );

  const averageResponseDelay = useMemo(() => {
    if (filteredRows.length === 0) return 0;

    return filteredRows.reduce((sum, row) => sum + row.responseDelayHours, 0) / filteredRows.length;
  }, [filteredRows]);

  const revenueAtRisk = useMemo(
    () =>
      filteredRows
        .filter((row) => getRowActionStatus(row) === "Needs Action")
        .reduce((sum, row) => sum + row.revenueValue, 0),
    [filteredRows]
  );

  const revenueRecovered = useMemo(
    () =>
      filteredRows
        .filter((row) => getRowActionStatus(row) === "No Action Needed")
        .reduce((sum, row) => sum + row.revenueValue, 0),
    [filteredRows]
  );

  const recoveryRate = useMemo(() => {
    if (totalRevenue === 0) return 0;

    return Math.round((revenueRecovered / totalRevenue) * 100);
  }, [revenueRecovered, totalRevenue]);

  const selectedRow = useMemo(
    () => rowsState.find((row) => row.id === selectedRowId) ?? null,
    [rowsState, selectedRowId]
  );

  const metricCards = useMemo<MetricCardItem[]>(() => {
    if (dataState !== "ready") {
      return [
        {
          value: "—",
          label: "Total Call\nRecords",
          detail: "Call records loaded for the active analysis window"
        },
        {
          value: "—",
          label: "Action\nRequired",
          detail: "Calls currently marked for analyst intervention"
        },
        {
          value: "—",
          label: "Resolved\nCases",
          detail: "Calls remediated and closed within the active window"
        }
      ];
    }

    const totalCallRecords = rowsState.length;
    const actionRequiredCount = rowsState.filter(
      (row) => row.status === "Action Required"
    ).length;
    const resolvedCount = rowsState.filter((row) => row.status === "Resolved").length;

    // These values are sourced directly from the live Supabase calls table via /api/dashboard-calls.
    // TODO: Replace any analysis-dependent KPI cards with analysis-table aggregates
    // once structured analysis records are available in Supabase.

    return [
      {
        value: String(totalCallRecords),
        label: "Total Call\nRecords",
        detail: "Call records currently loaded from the calls table"
      },
      {
        value: String(actionRequiredCount),
        label: "Action\nRequired",
        detail: "Calls currently marked for analyst intervention"
      },
      {
        value: String(resolvedCount),
        label: "Resolved\nCases",
        detail: "Calls remediated and closed in the calls table"
      }
    ];
  }, [dataState, rowsState]);

  const revenueSummaryItems = useMemo<RevenueSummaryItem[]>(
    () => {
      if (dataState !== "ready") {
        return [
          {
            value: "—",
            label: "Revenue at Risk",
            detail: "Loading current revenue exposure",
            tone: "risk"
          },
          {
            value: "—",
            label: "Revenue Recovered",
            detail: "Loading remediated revenue outcomes",
            tone: "recovered"
          },
          {
            value: "—",
            label: "Recovery Rate",
            detail: "Loading recovery performance",
            tone: "neutral"
          }
        ];
      }

      return [
        {
          value: formatCurrency(revenueAtRisk),
          label: "Revenue at Risk",
          detail: `${filteredRows.filter((row) => getRowActionStatus(row) === "Needs Action").length} interactions currently require revenue recovery action`,
          tone: "risk"
        },
        {
          value: formatCurrency(revenueRecovered),
          label: "Revenue Recovered",
          detail: `${filteredRows.filter((row) => getRowActionStatus(row) === "No Action Needed").length} interactions currently require no further action`,
          tone: "recovered"
        },
        {
          value: `${recoveryRate}%`,
          label: "Recovery Rate",
          detail:
            totalRevenue > 0
              ? `${formatCurrency(revenueRecovered)} of ${formatCurrency(totalRevenue)} tracked exposure has been recovered`
              : "Recovery rate will update when revenue outcomes are recorded",
          tone: "neutral"
        }
      ];
    },
    [dataState, filteredRows, recoveryRate, revenueAtRisk, revenueRecovered, totalRevenue]
  );

  const summaryItems = useMemo(() => {
    if (dataState === "loading") {
      return [
        `Analysis Window: ${getDateRangeLabel(selectedRange)}`,
        "Flagged Interactions: Loading...",
        "Estimated Revenue Leakage: Loading...",
        "Last Updated: Syncing..."
      ];
    }

    if (dataState === "error") {
      return [
        `Analysis Window: ${getDateRangeLabel(selectedRange)}`,
        "Flagged Interactions: Unavailable",
        "Estimated Revenue Leakage: Unavailable",
        "Last Updated: Connection failed"
      ];
    }

    const leakage = rowsInSelectedRange
      .filter((row) => getRowActionStatus(row) === "Needs Action")
      .reduce((sum, row) => sum + row.revenueValue, 0);

    return [
      `Analysis Window: ${getDateRangeLabel(selectedRange)}`,
      `Flagged Interactions: ${rowsInSelectedRange.length}`,
      `Estimated Revenue Leakage: ${formatCurrency(leakage)}`,
      `Last Updated: ${getLastUpdatedLabel(rowsInSelectedRange.length > 0 ? rowsInSelectedRange : rowsState)}`
    ];
  }, [dataState, rowsInSelectedRange, rowsState, selectedRange]);

  const recentActivityItems = useMemo(() => {
    const sourceRows = filteredRows.length > 0 ? filteredRows : rowsInSelectedRange;

    if (sourceRows.length === 0) {
      if (dataState === "loading") {
        return [
          {
            title: "Supabase synchronization in progress",
            detail: "Call records are currently loading into the operational dashboard view.",
            time: "Now",
            tone: "info" as const
          }
        ];
      }

      if (dataState === "error") {
        return [
          {
            title: "Call record retrieval failed",
            detail: "The dashboard could not load calls from Supabase. Refresh the page after verifying connectivity.",
            time: "Now",
            tone: "warning" as const
          }
        ];
      }

      return [
        {
          title: "No call activity available",
          detail: "Supabase returned no call records for the selected analysis window.",
          time: "Now",
          tone: "neutral" as const
        }
      ];
    }

    const first = sourceRows[0];
    const second = sourceRows[1] ?? sourceRows[0];
    const third = sourceRows[2] ?? sourceRows[0];
    const mapTone = (tone: CallTableRow["statusTone"]): ActivityTone =>
      tone === "critical" ? "warning" : tone === "pending" ? "info" : "neutral";

    return [
      {
        title: `Classification updated: ${first.caller}`,
        detail: `${first.reason} remains in ${first.status.toLowerCase()} status.`,
        time: "3m ago",
        tone: mapTone(first.statusTone)
      },
      {
        title: `Operational status update: ${second.caller}`,
        detail: `${second.nextStep}.`,
        time: "18m ago",
        tone: mapTone(second.statusTone)
      },
      {
        title: "Estimated revenue leakage recalculated",
        detail: `${formatCurrency(totalRevenue)} is currently attributed to flagged interactions within ${getDateRangeLabel(selectedRange).toLowerCase()}.`,
        time: "Today",
        tone: "info" as const
      },
      {
        title: `Analyst note recorded: ${third.caller}`,
        detail: `${third.reason} remains classified within the ${formatTabLabel(third.category).toLowerCase()} queue.`,
        time: "1h ago",
        tone: "neutral" as const
      }
    ];
  }, [dataState, filteredRows, rowsInSelectedRange, selectedRange, totalRevenue]);

  const tableEmptyMessage = useMemo(() => {
    if (dataState === "loading") {
      return "Loading call records from Supabase...";
    }

    if (dataState === "error") {
      return dataError ?? "Unable to load call records from Supabase.";
    }

    if (rowsState.length === 0) {
      return "No call records are currently available in Supabase.";
    }

    return "No interactions match the active analysis criteria.";
  }, [dataError, dataState, rowsState.length]);

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
        setDataState("error");
        setDataError("Unable to load call records from the dashboard data service.");
        setSelectedRowId(null);
        return;
      }

      const payload = (await response.json()) as {
        message?: string;
        rows?: DashboardCallRow[];
      };

      if (isCancelled) {
        return;
      }

      if (!response.ok) {
        setRowsState([]);
        setDataState("error");
        setDataError(payload.message || "Unable to load call records from Supabase.");
        setSelectedRowId(null);
        return;
      }

      const mappedRows = payload.rows ?? [];
      setRowsState(mappedRows);
      setDataState("ready");
      setDataError(null);
      setSelectedRowId((currentSelectedRowId) =>
        currentSelectedRowId && mappedRows.some((row) => row.id === currentSelectedRowId)
          ? currentSelectedRowId
          : null
      );
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

    if (!trendData.some((point) => point.label === activeTrendBucket)) {
      setActiveTrendBucket(null);
    }
  }, [activeTrendBucket, trendData]);

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

  function handleTabChange(tab: CallTabId) {
    setActiveTab((currentTab) => (currentTab === tab ? null : tab));
    setActiveTrendBucket(null);
    setSelectedRowId(null);
    setPanel((currentPanel) => (currentPanel?.type === "call" ? null : currentPanel));
  }

  function handleTrendBucketSelect(label: string) {
    setActiveTrendBucket((currentBucket) => (currentBucket === label ? null : label));
    setSelectedRowId(null);
    setPanel((currentPanel) => (currentPanel?.type === "call" ? null : currentPanel));
  }

  function handleRowSelect(row: CallTableRow) {
    setSelectedRowId(row.id);
    router.push(`/call/${row.id}`);
  }

  function handleRecoverCall(row: CallTableRow) {
    setSelectedRowId(row.id);
    router.push(`/call/${row.id}`);
  }

  function handleAssignFollowUp(row: CallTableRow) {
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

  function handleMarkResolved(row: CallTableRow) {
    if (getRowActionStatus(row) === "No Action Needed") {
      setNotice(`${row.caller} is already marked as requiring no further action.`);
      return;
    }

    updateRow(row.id, buildResolvedRow);
    setNotice(`Case resolved for ${row.caller}.`);
  }

  function handleClosePanel() {
    setPanel(null);
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
    setSelectedRowId(null);
    setPanel((currentPanel) => (currentPanel?.type === "call" ? null : currentPanel));
    setNotice(`Displaying ${getDateRangeLabel(range)} interaction analysis data.`);
  }

  function handleExport() {
    const rowsToExport = filteredRows;
    const csvRows = [
      ["Caller ID", "Call Outcome", "Action Status", "Missed Opportunity", "Revenue Impact", "Analyst Note", "Queue"].join(","),
      ...rowsToExport.map((row) =>
        [
          `"${row.caller}"`,
          `"${row.callOutcome ?? "Pending"}"`,
          `"${getRowActionStatus(row)}"`,
          `"${row.missedOpportunityLabel ?? "Pending"}"`,
          `"${row.revenue}"`,
          `"${row.conciseAnalystNote ?? row.analystNote ?? "Analysis pending."}"`,
          `"${formatTabLabel(row.category)}"`
        ].join(",")
      )
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `call-performance-overview-${selectedRange}-${activeTab ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotice(
      `Exported ${rowsToExport.length} ${rowsToExport.length === 1 ? "interaction" : "interactions"} from ${getDateRangeLabel(selectedRange)}.`
    );
  }

  function handleOpenPanel(nextPanel: ActionPanel) {
    if (nextPanel === "statistics") {
      setPanel((currentPanel) => (currentPanel?.type === "statistics" ? null : { type: "statistics" }));
      return;
    }

    router.push(nextPanel === "automations" ? "/automations" : "/settings");
  }

  function handleMarkResolvedFromDetail() {
    if (!selectedRow) return;

    handleMarkResolved(selectedRow);
  }

  function handleScheduleCallback() {
    if (!selectedRow) return;

    if (getRowActionStatus(selectedRow) === "No Action Needed") {
      setNotice(`${selectedRow.caller} does not require further action.`);
      return;
    }

    updateRow(selectedRow.id, (currentRow) => {
      const nextRow = buildFollowUpRow(currentRow);

      return {
        ...nextRow,
        notes: nextRow.notes.includes("Callback scheduling placeholder created from the inspection record.")
          ? nextRow.notes
          : [...nextRow.notes, "Callback scheduling placeholder created from the inspection record."]
      };
    });
    setNotice(`Callback scheduling placeholder created for ${selectedRow.caller}.`);
  }

  function handleAddNote() {
    if (!selectedRow) return;

    const note = window.prompt(`Enter an operational note for ${selectedRow.caller}`);
    if (!note?.trim()) return;

    updateRow(selectedRow.id, (currentRow) => ({
      ...currentRow,
      notes: [...currentRow.notes, note.trim()]
    }));
    setNotice(`Operational note recorded for ${selectedRow.caller}.`);
  }

  function handleToggleSetting(key: keyof SettingsState) {
    setSettingsState((currentState) => ({
      ...currentState,
      [key]: !currentState[key]
    }));
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
        <div className="mt-6 space-y-4 xl:space-y-5">
          <RevenueSummaryCards items={revenueSummaryItems} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_340px] xl:items-start 2xl:grid-cols-[minmax(0,1.52fr)_360px]">
            <div className="relative min-w-0 space-y-4 xl:space-y-5">
              <MetricCards metrics={metricCards} />
              <div className="min-w-0">
                <FlaggedCallsTable
                  activeTab={activeTab}
                  rows={filteredRows}
                  selectedRowId={selectedRowId}
                  emptyMessage={tableEmptyMessage}
                  onTabChange={handleTabChange}
                  onRowSelect={handleRowSelect}
                  onRecoverCall={handleRecoverCall}
                  onAssignFollowUp={handleAssignFollowUp}
                  onMarkResolved={handleMarkResolved}
                />
              </div>
              <ActionBar
                activePanel={panel?.type && panel.type !== "call" && panel.type !== "mail" ? panel.type : null}
                onExport={handleExport}
                onOpenPanel={handleOpenPanel}
              />

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] xl:hidden">
                <MissedOpportunitiesChart
                  data={trendData}
                  activeBucket={activeTrendBucket}
                  onBucketSelect={handleTrendBucketSelect}
                  subtitle={`${activeTab ? `${formatTabLabel(activeTab)} classification set` : "All flagged interactions"} within ${getDateRangeLabel(selectedRange).toLowerCase()}. Select a data point to isolate the corresponding reporting period.`}
                />
                <RecentActivityPanel items={recentActivityItems} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
                <ReviewQueuePanel rows={filteredRows.filter((row) => getRowActionStatus(row) === "Needs Action")} />
                <ResolutionOutcomesPanel
                  recoveredRevenue={formatCurrency(revenueRecovered)}
                  resolvedCases={filteredRows.filter((row) => getRowActionStatus(row) === "No Action Needed").length}
                  escalatedCases={filteredRows.filter((row) => row.status === "Escalated").length}
                  averageDelayHours={averageResponseDelay}
                />
              </div>
            </div>

            <aside className="hidden self-start xl:block xl:space-y-5 xl:border-l xl:border-[#E5E7EB] xl:pl-5 2xl:pl-6">
              <MissedOpportunitiesChart
                data={trendData}
                activeBucket={activeTrendBucket}
                onBucketSelect={handleTrendBucketSelect}
                subtitle={`${activeTab ? `${formatTabLabel(activeTab)} classification set` : "All flagged interactions"} within ${getDateRangeLabel(selectedRange).toLowerCase()}. Select a data point to isolate the corresponding reporting period.`}
              />
              <RecentActivityPanel items={recentActivityItems} />
            </aside>
          </div>
        </div>
      </main>

      <SlideOver
        panel={panel}
        activeTab={activeTab}
        selectedRange={selectedRange}
        selectedRow={selectedRow}
        filteredRows={filteredRows}
        settingsState={settingsState}
        onClose={handleClosePanel}
        onToggleSetting={handleToggleSetting}
        onMarkResolved={handleMarkResolvedFromDetail}
        onScheduleCallback={handleScheduleCallback}
        onAddNote={handleAddNote}
      />
    </>
  );
}
