"use client";

import { useMemo, useState } from "react";
import { WorkspacePageHeader } from "@/components/workspace-page-header";

type AutomationRule = {
  id: string;
  title: string;
  description: string;
  category: string;
  enabled: boolean;
};

function AutomationToggle({
  checked,
  onToggle
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className="inline-flex cursor-pointer items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
    >
      <span
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? "bg-[#2563EB]" : "bg-[#D1D5DB]"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

function RuleCard({
  rule,
  onToggle
}: {
  rule: AutomationRule;
  onToggle: () => void;
}) {
  return (
    <section className="surface-primary p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="surface-secondary type-label-text inline-flex rounded-full px-3 py-1 text-[11px]">
            {rule.category}
          </div>
          <h2 className="type-section-title mt-3 text-[18px]">{rule.title}</h2>
          <p className="type-body-text mt-2 text-[14px]">{rule.description}</p>
        </div>

        <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
          <AutomationToggle checked={rule.enabled} onToggle={onToggle} />
          <span
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
              rule.enabled
                ? "border border-[#2563EB] bg-[#2563EB] text-white"
                : "border border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]"
            }`}
          >
            {rule.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>
    </section>
  );
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([
    {
      id: "callback-unconverted-lead",
      title: "Trigger callback when high-intent lead is unconverted",
      description:
        "Generate an outbound follow-up task when purchase intent is detected but no booking confirmation is recorded during the initial interaction.",
      category: "Recovery Workflow",
      enabled: true
    },
    {
      id: "sla-breach-flag",
      title: "Flag response SLA breaches",
      description:
        "Route interaction records into the review queue when no documented callback is completed within the configured response window.",
      category: "SLA Monitoring",
      enabled: true
    },
    {
      id: "repeat-missed-booking-escalation",
      title: "Escalate repeated missed booking failures",
      description:
        "Escalate recurring conversion failures to supervisory review when multiple unconverted leads are associated with the same operating team or intake function.",
      category: "Escalation Control",
      enabled: false
    },
    {
      id: "review-queue-assignment",
      title: "Assign flagged call review workflow ownership",
      description:
        "Automatically assign flagged interactions to the appropriate revenue operations owner based on failure classification, urgency, and projected revenue impact.",
      category: "Queue Assignment",
      enabled: true
    }
  ]);

  const activeRules = useMemo(() => rules.filter((rule) => rule.enabled).length, [rules]);

  function handleToggleRule(ruleId: string) {
    setRules((currentRules) =>
      currentRules.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  }

  return (
    <main>
      <WorkspacePageHeader
        title="Automation Rules"
        description="Configure operational rules for follow-up, escalation, and call review workflows."
      />

      <div className="mt-5 grid gap-4 lg:mt-6 lg:gap-5 xl:grid-cols-[minmax(0,1.2fr)_320px] xl:items-start">
        <section className="space-y-4">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} onToggle={() => handleToggleRule(rule.id)} />
          ))}
        </section>

        <aside className="space-y-4 sm:space-y-5 xl:border-l xl:border-[#E5E7EB] xl:pl-5">
          <section className="surface-secondary p-4 sm:p-5">
            <h3 className="type-section-title text-[18px]">Rule Execution Summary</h3>
            <div className="mt-4 space-y-3 text-[14px] text-[#6B7280]">
              <div className="flex items-center justify-between">
                <span>Active Rules</span>
                <span className="type-section-title text-[15px]">{activeRules}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Inactive Rules</span>
                <span className="type-section-title text-[15px]">{rules.length - activeRules}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Workflow Scope</span>
                <span className="type-section-title text-[15px]">Follow-Up + Escalation</span>
              </div>
            </div>
          </section>

          <section className="surface-secondary p-4 sm:p-5">
            <h3 className="type-section-title text-[18px]">Operational Coverage</h3>
            <div className="mt-4 space-y-3">
              {[
                "Automations apply placeholder routing logic to flagged interaction review.",
                "Rule activation updates local interface state for demonstration purposes.",
                "Execution events and audit history can be layered onto this screen later."
              ].map((item) => (
                <div key={item} className="surface-primary type-body-text px-4 py-3 text-[14px]">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
