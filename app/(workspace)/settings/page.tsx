"use client";

import { useState } from "react";
import { SettingToggle } from "@/components/setting-toggle";
import { WorkspacePageHeader } from "@/components/workspace-page-header";

type UserAccessRecord = {
  id: string;
  name: string;
  role: string;
  email: string;
};

function SectionCard({
  title,
  description,
  children,
  actions
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="surface-primary p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="type-section-title text-[18px]">{title}</h2>
          <p className="type-body-text mt-2 max-w-[620px] text-[14px]">{description}</p>
        </div>
        {actions ? <div className="w-full self-start sm:w-auto">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="type-label-text text-[12px]">{label}</div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClassName =
  "h-12 w-full rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-[15px] text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]";

const disabledUserAccessButtonClassName =
  "inline-flex items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#6B7280] opacity-50 cursor-not-allowed pointer-events-none";

export default function SettingsPage() {
  const [businessProfile, setBusinessProfile] = useState({
    businessName: "Cotrnested Services Ltd.",
    businessSector: "Residential HVAC Services",
    contactEmail: "ops@cotrnested.com"
  });
  const [analysisWindow, setAnalysisWindow] = useState({
    defaultInterval: "Last 30 Days",
    timezone: "Europe/London"
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    flaggedInteractionAlerts: true,
    revenueLeakageAlerts: true,
    weeklyDigest: false
  });

  const userAccessRecords: UserAccessRecord[] = [
    {
      id: "user-01",
      name: "Sarah Thompson",
      role: "Revenue Operations Analyst",
      email: "s.thompson@revenueops.io"
    },
    {
      id: "user-02",
      name: "David Mercer",
      role: "Regional Service Director",
      email: "d.mercer@revenueops.io"
    },
    {
      id: "user-03",
      name: "Olivia Chen",
      role: "Platform Administrator",
      email: "o.chen@revenueops.io"
    }
  ];

  function toggleNotification(key: keyof typeof notificationPreferences) {
    setNotificationPreferences((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  return (
    <main>
      <WorkspacePageHeader
        title="Platform Settings"
        description="Manage business profile details, notification behavior, analysis defaults, and user access across the platform."
      />

      <div className="mt-5 grid gap-4 lg:mt-6 lg:gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-start">
        <section className="space-y-4">
          <SectionCard
            title="Business Profile"
            description="Maintain the core business information used throughout reporting and operational workflows."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Business Name">
                  <input
                    type="text"
                    value={businessProfile.businessName}
                    onChange={(event) =>
                      setBusinessProfile((current) => ({
                        ...current,
                        businessName: event.target.value
                      }))
                    }
                    className={inputClassName}
                  />
                </Field>
              </div>
              <Field label="Business Sector">
                <input
                  type="text"
                  value={businessProfile.businessSector}
                  onChange={(event) =>
                    setBusinessProfile((current) => ({
                      ...current,
                      businessSector: event.target.value
                    }))
                  }
                  className={inputClassName}
                />
              </Field>
              <Field label="Primary Contact Email">
                <input
                  type="email"
                  value={businessProfile.contactEmail}
                  onChange={(event) =>
                    setBusinessProfile((current) => ({
                      ...current,
                      contactEmail: event.target.value
                    }))
                  }
                  className={inputClassName}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Notification Preferences"
            description="Control operational notifications for flagged interactions, revenue exposure, and recurring review updates."
          >
            <div className="space-y-4">
              <SettingToggle
                label="Flagged Interaction Alerts"
                description="Notify the review queue when a call is classified with a conversion failure or follow-up gap."
                checked={notificationPreferences.flaggedInteractionAlerts}
                onToggle={() => toggleNotification("flaggedInteractionAlerts")}
              />
              <SettingToggle
                label="Revenue Leakage Alerts"
                description="Send notifications when projected revenue exposure exceeds the current review threshold."
                checked={notificationPreferences.revenueLeakageAlerts}
                onToggle={() => toggleNotification("revenueLeakageAlerts")}
              />
              <SettingToggle
                label="Weekly Review Digest"
                description="Deliver a weekly summary of flagged call volume, resolution outcomes, and unresolved cases."
                checked={notificationPreferences.weeklyDigest}
                onToggle={() => toggleNotification("weeklyDigest")}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Analysis Window"
            description="Define the default reporting interval and timezone reference used when loading dashboard analytics."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Default Interval">
                <select
                  value={analysisWindow.defaultInterval}
                  onChange={(event) =>
                    setAnalysisWindow((current) => ({
                      ...current,
                      defaultInterval: event.target.value
                    }))
                  }
                  className={inputClassName}
                >
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>Last 90 Days</option>
                </select>
              </Field>
              <Field label="Reporting Timezone">
                <select
                  value={analysisWindow.timezone}
                  onChange={(event) =>
                    setAnalysisWindow((current) => ({
                      ...current,
                      timezone: event.target.value
                    }))
                  }
                  className={inputClassName}
                >
                  <option>Europe/London</option>
                  <option>America/Los_Angeles</option>
                  <option>America/New_York</option>
                </select>
              </Field>
            </div>
          </SectionCard>
        </section>

        <aside className="space-y-4 sm:space-y-5 xl:border-l xl:border-[#E5E7EB] xl:pl-5">
          <SectionCard
            title="User Access"
            description="Review user accounts, assigned roles, and access ownership across the platform."
            actions={
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <span className="inline-flex rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[12px] font-medium text-[#6B7280]">
                  Coming soon
                </span>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="User management will be available in a future release"
                  className={`${disabledUserAccessButtonClassName} px-4 py-2.5 text-[14px]`}
                >
                  Invite User
                </button>
              </div>
            }
          >
            <div className="mb-4 rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] text-[#6B7280]">
              User management will be available in a future release.
            </div>

            <div className="space-y-3">
              {userAccessRecords.map((record) => (
                <div key={record.id} className="surface-secondary px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="type-section-title text-[15px]">{record.name}</div>
                      <div className="type-body-text mt-1 text-[13px]">{record.email}</div>
                      <div className="surface-primary mt-2 inline-flex rounded-full px-3 py-1 text-[12px] font-semibold text-[#374151]">
                        {record.role}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="User management will be available in a future release"
                      className={`${disabledUserAccessButtonClassName} self-start px-3 py-2 text-[13px]`}
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </main>
  );
}
