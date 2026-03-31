import { type CallTableRow, type CallTabId } from "@/data/mock-platform-data";

const tabs: Array<{ id: CallTabId; label: string }> = [
  { id: "missed-booking", label: "Unconverted High-Intent Leads" },
  { id: "delayed-response", label: "Response SLA Breaches" },
  { id: "original-bookings", label: "Booked Interactions" }
];

type FlaggedCallsTableProps = {
  activeTab: CallTabId | null;
  rows: CallTableRow[];
  selectedRowId: string | null;
  emptyMessage?: string;
  onTabChange: (tab: CallTabId) => void;
  onRowSelect: (row: CallTableRow) => void;
  onRecoverCall: (row: CallTableRow) => void;
  onAssignFollowUp: (row: CallTableRow) => void;
  onMarkResolved: (row: CallTableRow) => void;
};

export function FlaggedCallsTable({
  activeTab,
  rows,
  selectedRowId,
  emptyMessage = "No interactions match the active analysis criteria.",
  onTabChange,
  onRowSelect,
  onRecoverCall,
  onAssignFollowUp,
  onMarkResolved
}: FlaggedCallsTableProps) {
  function getActionStatus(row: CallTableRow) {
    return row.actionStatus ?? (row.status === "Resolved" ? "No Action Needed" : "Needs Action");
  }

  function getActionStatusClasses(row: CallTableRow) {
    const actionStatus = getActionStatus(row);

    if (actionStatus === "No Action Needed") {
      return "border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]";
    }

    return "border border-[#C7D2FE] bg-[#EEF2FF] text-[#1E3A8A]";
  }

  function getMissedOpportunityClasses(row: CallTableRow) {
    if (row.missedOpportunityLabel === "Yes") {
      return "text-[#3730A3]";
    }

    if (row.missedOpportunityLabel === "No") {
      return "text-[#6B7280]";
    }

    return "text-[#6B7280]";
  }

  function getRevenuePanelClasses(row: CallTableRow) {
    if (row.missedOpportunityLabel === "Yes" || getActionStatus(row) === "Needs Action") {
      return "border-[#E5E7EB] bg-[#FFFFFF]";
    }

    return "border-[#E5E7EB] bg-[#F9FAFB]";
  }

  return (
    <section className="surface-primary motion-fade-up motion-delay-2 overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[#E5E7EB] px-5 pb-0 pt-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="ui-scrollbar ui-scrollbar-x flex items-end gap-9 overflow-x-auto">
          <div className="min-w-[280px] pb-3.5">
            <h2 className="type-section-title whitespace-nowrap text-[20px]">
              Flagged Call Interactions
            </h2>
            <p className="type-body-text mt-1 text-[14px]">
              Calls requiring review due to conversion failure or response gap
            </p>
          </div>
          <div className="flex items-end gap-7 text-[15px] font-medium text-[#6B7280]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeTab === tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`whitespace-nowrap border-b-2 pb-3 transition cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFFFF] ${
                  activeTab === tab.id
                    ? "border-[#2563EB] text-[#2563EB]"
                    : "border-transparent text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ui-scrollbar ui-scrollbar-x overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left">
          <thead className="bg-[#F9FAFB]">
            <tr className="text-[14px] font-medium text-[#374151]">
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Caller ID</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Call Outcome</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Action Status</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5">Revenue Impact</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5 text-right">Analyst Note</th>
              <th className="border-b border-[#E5E7EB] px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => {
                const isSelected = selectedRowId === row.id;
                const actionStatus = getActionStatus(row);
                const isClosed = actionStatus === "No Action Needed";
                const callOutcome = row.callOutcome ?? "Pending";
                const missedOpportunity = row.missedOpportunityLabel ?? "Pending";
                const conciseNote = row.conciseAnalystNote ?? row.analystNote ?? "Analysis pending.";

                return (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    role="button"
                    aria-selected={isSelected}
                    aria-label={`Inspect call record for ${row.caller}`}
                    onClick={() => onRowSelect(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowSelect(row);
                      }
                    }}
                    className={`cursor-pointer transition outline-none ${
                      isSelected ? "bg-[#F3F4F6]" : "hover:bg-[#F3F4F6] focus-visible:bg-[#F3F4F6]"
                    }`}
                  >
                    <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top">
                      <div className="type-section-title text-[17px]">{row.caller}</div>
                      <div className="type-muted-text mt-1 text-[13px]">{row.time}</div>
                    </td>
                    <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top">
                      <div className="space-y-1.5">
                        <div className="type-section-title text-[16px]">
                          {callOutcome}
                        </div>
                        <div className="type-muted-text text-[12px]">
                          {row.primaryIssue ?? row.reason}
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top">
                      <div className="space-y-1.5">
                        <div
                          className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] ${getActionStatusClasses(row)}`}
                        >
                          {actionStatus}
                        </div>
                        <div className="type-muted-text text-[12px]">
                          Missed Opportunity:{" "}
                          <span className={`font-semibold ${getMissedOpportunityClasses(row)}`}>{missedOpportunity}</span>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top">
                      <div
                        className={`inline-flex rounded-[12px] border px-3.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${getRevenuePanelClasses(
                          row
                        )}`}
                      >
                        <div>
                          <div className="text-[18px] font-bold tracking-[-0.02em] text-[#111827]">
                            {row.revenueImpact ?? row.revenue}
                          </div>
                          <div className="type-label-text mt-0.5 text-[11px]">
                            Revenue Impact
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top text-right text-[13px] leading-[22px] text-[#6B7280]">
                      <div className="type-body-text text-[13px]">{conciseNote}</div>
                    </td>
                    <td className="border-b border-[#E5E7EB] px-5 py-3.5 align-top">
                      <div className="ml-auto flex max-w-[220px] flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRecoverCall(row);
                          }}
                          className="button-primary-accent inline-flex cursor-pointer items-center justify-center px-3 py-2 text-[12px] transition hover:bg-[#1D4ED8] hover:border-[#1D4ED8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                        >
                          Recover Call
                        </button>
                        <button
                          type="button"
                          disabled={isClosed}
                          onClick={(event) => {
                            event.stopPropagation();
                            onAssignFollowUp(row);
                          }}
                          className="button-secondary-ui inline-flex cursor-pointer items-center justify-center px-3 py-2 text-[12px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                        >
                          Assign Follow-Up
                        </button>
                        <button
                          type="button"
                          disabled={isClosed}
                          onClick={(event) => {
                            event.stopPropagation();
                            onMarkResolved(row);
                          }}
                          className="button-secondary-ui inline-flex cursor-pointer items-center justify-center px-3 py-2 text-[12px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
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
                <td colSpan={6} className="px-5 py-9 text-center text-[15px] text-[#6B7280]">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
