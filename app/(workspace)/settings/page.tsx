"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SettingToggle } from "@/components/setting-toggle";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import {
  getOnboardingPresetById,
  onboardingPresets,
  type OnboardingPresetId
} from "@/lib/onboarding-presets";
import { getPricingReferenceContent } from "@/lib/pricing-reference";
import {
  businessVerticalOptions,
  defaultBusinessVertical,
  defaultSolutionMode,
  solutionModeOptions,
  type BusinessVertical,
  type SolutionMode
} from "@/lib/solution-mode";
import {
  defaultServiceCallRoutingMode,
  serviceCallRoutingModeOptions,
  type ServiceCallRoutingMode
} from "@/lib/service-call-routing-mode";

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
const textareaClassName =
  "min-h-[144px] w-full rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]";

const disabledUserAccessButtonClassName =
  "inline-flex items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#6B7280] opacity-50 cursor-not-allowed pointer-events-none";

export default function SettingsPage() {
  const [businessProfile, setBusinessProfile] = useState({
    businessName: "Cotrnested Services Ltd.",
    solutionMode: defaultSolutionMode as SolutionMode,
    businessVertical: defaultBusinessVertical as BusinessVertical,
    contactEmail: "ops@cotrnested.com",
    callbackNumber: "",
    businessHours: "Mon-Fri, 08:00-18:00"
  });
  const [analysisWindow, setAnalysisWindow] = useState({
    defaultInterval: "Last 30 Days",
    timezone: "Europe/London"
  });
  const [missedCallRecovery, setMissedCallRecovery] = useState({
    callRoutingMode: defaultServiceCallRoutingMode as ServiceCallRoutingMode,
    defaultCallbackWindow: "2 business hours",
    autoFollowUpEnabled: true,
    smsTemplate:
      "Sorry we missed your call. This is {{businessName}}. We’ve received your enquiry and will call you back within {{callbackWindow}}. If urgent, call us on {{phoneNumber}}."
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    flaggedInteractionAlerts: true,
    revenueLeakageAlerts: true,
    weeklyDigest: false
  });
  const [isLoadingRecoverySettings, setIsLoadingRecoverySettings] = useState(true);
  const [isSavingRecoverySettings, setIsSavingRecoverySettings] = useState(false);
  const [recoverySettingsNotice, setRecoverySettingsNotice] = useState<string | null>(null);
  const [recoverySettingsNoticeTone, setRecoverySettingsNoticeTone] = useState<"success" | "error">("success");

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

  function applyOnboardingPreset(presetId: OnboardingPresetId) {
    const preset = getOnboardingPresetById(presetId);

    if (!preset) {
      return;
    }

    setBusinessProfile((current) => ({
      ...current,
      solutionMode: preset.businessProfile.solutionMode,
      businessVertical: preset.businessProfile.businessVertical,
      businessHours: preset.businessProfile.businessHours
    }));

    setMissedCallRecovery((current) => ({
      ...current,
      defaultCallbackWindow: preset.missedCallRecovery.defaultCallbackWindow,
      autoFollowUpEnabled: preset.missedCallRecovery.autoFollowUpEnabled,
      smsTemplate: preset.missedCallRecovery.smsTemplate
    }));

    setRecoverySettingsNoticeTone("success");
    setRecoverySettingsNotice(`${preset.label} preset applied. Review the values and save to keep them.`);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadRecoverySettings() {
      try {
        const response = await fetch("/api/settings/missed-call-recovery", {
          method: "GET"
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              settings?: {
                businessName?: string;
                solutionMode?: SolutionMode;
                businessVertical?: BusinessVertical;
                callRoutingMode?: ServiceCallRoutingMode;
                callbackNumber?: string;
                defaultCallbackWindow?: string;
                businessHours?: string;
                autoFollowUpEnabled?: boolean;
                smsTemplate?: string;
              };
              message?: string;
            }
          | null;

        if (!response.ok || !payload?.settings) {
          throw new Error(payload?.message || "Unable to load missed call recovery settings.");
        }

        if (!isMounted) {
          return;
        }

        setBusinessProfile((current) => ({
          ...current,
          businessName: payload.settings?.businessName || current.businessName,
          solutionMode: payload.settings?.solutionMode || current.solutionMode,
          businessVertical: payload.settings?.businessVertical || current.businessVertical,
          callbackNumber: payload.settings?.callbackNumber || "",
          businessHours: payload.settings?.businessHours || current.businessHours
        }));
        setMissedCallRecovery({
          callRoutingMode:
            payload.settings?.callRoutingMode || defaultServiceCallRoutingMode,
          defaultCallbackWindow:
            payload.settings?.defaultCallbackWindow || "2 business hours",
          autoFollowUpEnabled: payload.settings?.autoFollowUpEnabled ?? true,
          smsTemplate:
            payload.settings?.smsTemplate ||
            "Sorry we missed your call. This is {{businessName}}. We’ve received your enquiry and will call you back within {{callbackWindow}}. If urgent, call us on {{phoneNumber}}."
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRecoverySettingsNoticeTone("error");
        setRecoverySettingsNotice(
          error instanceof Error
            ? error.message
            : "Unable to load missed call recovery settings."
        );
      } finally {
        if (isMounted) {
          setIsLoadingRecoverySettings(false);
        }
      }
    }

    void loadRecoverySettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const smsTemplatePreview = useMemo(() => {
    return missedCallRecovery.smsTemplate
      .replaceAll("{{businessName}}", businessProfile.businessName || "Your business")
      .replaceAll(
        "{{callbackWindow}}",
        missedCallRecovery.defaultCallbackWindow || "the next business window"
      )
      .replaceAll("{{phoneNumber}}", businessProfile.callbackNumber || "your callback number");
  }, [
    businessProfile.businessName,
    businessProfile.callbackNumber,
    missedCallRecovery.defaultCallbackWindow,
    missedCallRecovery.smsTemplate
  ]);
  const pricingReference = useMemo(
    () => getPricingReferenceContent(businessProfile.solutionMode),
    [businessProfile.solutionMode]
  );

  async function handleSaveMissedCallRecoverySettings() {
    if (!missedCallRecovery.defaultCallbackWindow.trim()) {
      setRecoverySettingsNoticeTone("error");
      setRecoverySettingsNotice("Default callback window is required.");
      return;
    }

    if (
      missedCallRecovery.callRoutingMode === "full_call_capture" &&
      !businessProfile.callbackNumber.trim()
    ) {
      setRecoverySettingsNoticeTone("error");
      setRecoverySettingsNotice("Answer / callback number is required when full call capture is enabled.");
      return;
    }

    if (missedCallRecovery.autoFollowUpEnabled && !businessProfile.callbackNumber.trim()) {
      setRecoverySettingsNoticeTone("error");
      setRecoverySettingsNotice("Callback number is required when auto follow-up is enabled.");
      return;
    }

    if (missedCallRecovery.autoFollowUpEnabled && !missedCallRecovery.smsTemplate.trim()) {
      setRecoverySettingsNoticeTone("error");
      setRecoverySettingsNotice("SMS template is required when auto follow-up is enabled.");
      return;
    }

    setIsSavingRecoverySettings(true);
    setRecoverySettingsNotice(null);

    try {
      const response = await fetch("/api/settings/missed-call-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          settings: {
            businessName: businessProfile.businessName,
            solutionMode: businessProfile.solutionMode,
            businessVertical: businessProfile.businessVertical,
            callRoutingMode: missedCallRecovery.callRoutingMode,
            callbackNumber: businessProfile.callbackNumber,
            defaultCallbackWindow: missedCallRecovery.defaultCallbackWindow,
            businessHours: businessProfile.businessHours,
            autoFollowUpEnabled: missedCallRecovery.autoFollowUpEnabled,
            smsTemplate: missedCallRecovery.smsTemplate
          }
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save missed call recovery settings.");
      }

      setRecoverySettingsNoticeTone("success");
      setRecoverySettingsNotice(payload?.message || "Missed call recovery settings saved.");
    } catch (error) {
      setRecoverySettingsNoticeTone("error");
      setRecoverySettingsNotice(
        error instanceof Error
          ? error.message
          : "Unable to save missed call recovery settings."
      );
    } finally {
      setIsSavingRecoverySettings(false);
    }
  }

  return (
    <main>
      <WorkspacePageHeader
        title="Platform Settings"
        description="Manage business profile details, notification behavior, analysis defaults, and user access across the platform."
        actions={
          <Link
            href="/settings/integrations"
            className="button-secondary-ui inline-flex h-11 items-center justify-center px-4 text-[14px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Integration Settings
          </Link>
        }
      />

      <div className="mt-5 grid gap-4 lg:mt-6 lg:gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-start">
        <section className="space-y-4">
          <SectionCard
            title="Business Profile"
            description="Maintain the core business information used throughout reporting, follow-up messaging, and operational workflows."
          >
            <div className="space-y-4">
              <div className="surface-secondary px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-[620px]">
                    <div className="type-label-text text-[12px]">Quick Setup Presets</div>
                    <p className="type-body-text mt-2 text-[14px] leading-6">
                      Apply a preset to prefill solution mode, business vertical, business hours, callback promise, and default recovery SMS copy using the same shared platform settings.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2.5 sm:min-w-[360px]">
                    {onboardingPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyOnboardingPreset(preset.id)}
                        className="button-secondary-ui inline-flex min-h-[48px] items-center justify-center px-4 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {onboardingPresets.map((preset) => (
                    <div key={`${preset.id}-detail`} className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3">
                      <div className="type-section-title text-[15px]">{preset.label}</div>
                      <p className="type-body-text mt-1.5 text-[13px] leading-6">{preset.description}</p>
                    </div>
                  ))}
                </div>
              </div>

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
                <Field label="Solution Mode">
                  <select
                    value={businessProfile.solutionMode}
                    onChange={(event) =>
                      setBusinessProfile((current) => ({
                        ...current,
                        solutionMode: event.target.value as SolutionMode
                      }))
                    }
                    className={inputClassName}
                  >
                    {solutionModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                <Field label="Business Vertical">
                  <select
                    value={businessProfile.businessVertical}
                    onChange={(event) =>
                      setBusinessProfile((current) => ({
                        ...current,
                        businessVertical: event.target.value as BusinessVertical
                      }))
                    }
                    className={inputClassName}
                  >
                    {businessVerticalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Answer / Callback Number">
                  <input
                    type="tel"
                    value={businessProfile.callbackNumber}
                    onChange={(event) =>
                      setBusinessProfile((current) => ({
                        ...current,
                        callbackNumber: event.target.value
                      }))
                    }
                    placeholder="+44 7900 261143"
                    className={inputClassName}
                  />
                </Field>
                <Field label="Business Hours">
                  <input
                    type="text"
                    value={businessProfile.businessHours}
                    onChange={(event) =>
                      setBusinessProfile((current) => ({
                        ...current,
                        businessHours: event.target.value
                      }))
                    }
                    placeholder="Mon-Fri, 08:00-18:00"
                    className={inputClassName}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Missed Call Recovery"
            description="Configure inbound call routing, the default callback promise, automated follow-up behavior, and SMS copy used when recovery actions are triggered from missed call workflows."
            actions={
              <button
                type="button"
                onClick={handleSaveMissedCallRecoverySettings}
                disabled={isLoadingRecoverySettings || isSavingRecoverySettings}
                className="button-secondary-ui inline-flex h-11 items-center justify-center px-4 text-[14px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
              >
                {isLoadingRecoverySettings
                  ? "Loading..."
                  : isSavingRecoverySettings
                    ? "Saving..."
                    : "Save Recovery Settings"}
              </button>
            }
          >
            {recoverySettingsNotice ? (
              <div
                className={`mb-4 rounded-[12px] border px-4 py-3 text-[13px] ${
                  recoverySettingsNoticeTone === "error"
                    ? "border-[#F2D8D8] bg-[#FFF6F6] text-[#A24E4E]"
                    : "border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]"
                }`}
              >
                {recoverySettingsNotice}
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] text-[#6B7280]">
                Business name, callback number, and business hours are sourced from the Business Profile section above.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Call Routing Mode">
                  <select
                    value={missedCallRecovery.callRoutingMode}
                    onChange={(event) =>
                      setMissedCallRecovery((current) => ({
                        ...current,
                        callRoutingMode: event.target.value as ServiceCallRoutingMode
                      }))
                    }
                    className={inputClassName}
                  >
                    {serviceCallRoutingModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Default Callback Window">
                  <input
                    type="text"
                    value={missedCallRecovery.defaultCallbackWindow}
                    onChange={(event) =>
                      setMissedCallRecovery((current) => ({
                        ...current,
                        defaultCallbackWindow: event.target.value
                      }))
                    }
                    placeholder="2 business hours"
                    className={inputClassName}
                  />
                </Field>
                <div className="md:pt-[28px]">
                  <SettingToggle
                    label="Auto Follow-Up"
                    description="Automatically use the saved missed-call SMS template when follow-up automation is enabled."
                    checked={missedCallRecovery.autoFollowUpEnabled}
                    onToggle={() =>
                      setMissedCallRecovery((current) => ({
                        ...current,
                        autoFollowUpEnabled: !current.autoFollowUpEnabled
                      }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-4">
                <div className="type-label-text text-[12px]">Routing mode summary</div>
                <p className="type-body-text mt-2 text-[14px] leading-6">
                  {
                    serviceCallRoutingModeOptions.find(
                      (option) => option.value === missedCallRecovery.callRoutingMode
                    )?.description
                  }
                </p>
                <p className="type-body-text mt-2 text-[13px] leading-6 text-[#6B7280]">
                  Orvelle uses the saved answer / callback number above as the live destination number when Twilio forwards or captures inbound calls for this business.
                </p>
              </div>

              <Field label="Default Missed-Call SMS Template">
                <textarea
                  value={missedCallRecovery.smsTemplate}
                  onChange={(event) =>
                    setMissedCallRecovery((current) => ({
                      ...current,
                      smsTemplate: event.target.value
                    }))
                  }
                  className={textareaClassName}
                />
              </Field>

              <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-4">
                <div className="type-label-text text-[12px]">Template Preview</div>
                <p className="type-body-text mt-2 text-[14px] leading-6">{smsTemplatePreview}</p>
              </div>
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
            title="Founder-Led Pricing Reference"
            description="Internal pricing guidance for the currently selected solution mode. This is reference content only and does not affect billing."
          >
            <div className="space-y-4">
              <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4">
                <div className="type-section-title text-[15px]">{pricingReference.title}</div>
                <p className="type-body-text mt-2 text-[13px] leading-6">{pricingReference.description}</p>
                <p className="type-body-text mt-3 text-[13px] leading-6">{pricingReference.guidance}</p>
              </div>

              <div className="space-y-3">
                {pricingReference.packages.map((pkg) => (
                  <div key={pkg.label} className="surface-secondary px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="type-section-title text-[15px]">{pkg.label}</div>
                        <p className="type-body-text mt-1 text-[13px] leading-6">{pkg.note}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                        <div className="type-label-text text-[11px]">Onboarding</div>
                        <div className="type-section-title mt-2 text-[15px]">{pkg.onboarding}</div>
                      </div>
                      <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-3">
                        <div className="type-label-text text-[11px]">Monthly</div>
                        <div className="type-section-title mt-2 text-[15px]">{pkg.monthly}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

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
