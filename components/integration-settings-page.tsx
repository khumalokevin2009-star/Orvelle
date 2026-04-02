"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import type { TwilioIntegrationSnapshot } from "@/lib/integrations/twilio-settings";

type IntegrationSettingsPageProps = TwilioIntegrationSnapshot;

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
    <section className="surface-primary p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="type-section-title text-[18px] sm:text-[19px]">{title}</h2>
          <p className="type-body-text mt-2 max-w-[620px] text-[14px]">{description}</p>
        </div>
        {actions ? <div className="w-full self-start sm:w-auto">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatusIndicator({
  status,
  connectionHealth,
  description
}: {
  status: "connected" | "waiting_for_data" | "error";
  connectionHealth: "healthy" | "waiting" | "error";
  description: string;
}) {
  const toneClasses =
    connectionHealth === "healthy"
      ? "bg-[#10B981]"
      : connectionHealth === "error"
        ? "bg-[#DC2626]"
        : "bg-[#F59E0B]";
  const statusLabel =
    status === "connected"
      ? "Connected"
      : status === "error"
        ? "Error"
        : "Waiting for data";

  return (
    <div className="surface-secondary flex items-start gap-3 px-4 py-4">
      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${toneClasses}`} aria-hidden="true" />
      <div>
        <div className="type-section-title text-[15px]">{statusLabel}</div>
        <p className="type-body-text mt-1 text-[13px]">{description}</p>
      </div>
    </div>
  );
}

function ValueField({
  label,
  value,
  onCopy,
  copyLabel,
  copied
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copyLabel?: string;
  copied?: boolean;
}) {
  return (
    <div className="surface-secondary p-4">
      <div className="type-label-text text-[12px]">{label}</div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 overflow-x-auto">
          <code className="block whitespace-nowrap text-[14px] font-medium text-[#111827]">
            {value}
          </code>
        </div>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="button-secondary-ui inline-flex h-10 shrink-0 items-center justify-center px-4 text-[13px] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            {copied ? "Copied" : copyLabel ?? "Copy"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatEventTime(value: string | null) {
  if (!value) {
    return "No webhook events received yet";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf())) {
    return "No webhook events received yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
}

export function IntegrationSettingsPage({
  accountIdentifier,
  webhookUrl,
  status,
  connectionHealth,
  statusDescription,
  endpointReady,
  lastEventAt,
  lastErrorMessage,
  instructions
}: IntegrationSettingsPageProps) {
  const [copiedField, setCopiedField] = useState<"webhook" | "account" | null>(null);
  const [testState, setTestState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string>(
    endpointReady
      ? "Run a connection check before sending your first live webhook."
      : "Webhook testing becomes available once the server-side configuration is complete."
  );

  const connectionSummary = useMemo(
    () => [
      {
        label: "Connection Status",
        value:
          status === "connected"
            ? "Connected"
            : status === "error"
              ? "Error"
              : "Waiting for data"
      },
      {
        label: "Connection Health",
        value:
          connectionHealth === "healthy"
            ? "Healthy"
            : connectionHealth === "error"
              ? "Attention required"
              : "Awaiting first event"
      },
      {
        label: "Latest Event",
        value: formatEventTime(lastEventAt)
      }
    ],
    [connectionHealth, lastEventAt, status]
  );

  async function handleCopy(value: string, field: "webhook" | "account") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1600);
    } catch {
      console.error("[integrations] Clipboard write failed.");
    }
  }

  async function handleTestWebhook() {
    if (!endpointReady || testState === "loading") {
      return;
    }

    setTestState("loading");
    setTestMessage("Running Twilio webhook connection check...");

    try {
      const response = await fetch("/api/integrations/twilio/test", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        }
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || "Webhook verification failed.");
      }

      setTestState("success");
      setTestMessage(payload?.message || "Twilio webhook endpoint is ready to receive events.");
    } catch (error) {
      setTestState("error");
      setTestMessage(
        error instanceof Error
          ? error.message
          : "Webhook testing is temporarily unavailable. Please try again later."
      );
    }
  }

  return (
    <main>
      <WorkspacePageHeader
        title="Integration Settings"
        description="Connect Orvelle to the call systems your team already uses and keep webhook setup clear, secure, and operationally simple."
        actions={
          <Link
            href="/settings"
            className="button-secondary-ui inline-flex h-11 items-center justify-center px-4 text-[14px] no-underline transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Back to settings
          </Link>
        }
      />

      <div className="mt-5 grid gap-4 lg:mt-6 lg:gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-start">
        <section className="space-y-4">
          <SectionCard
            title="Twilio"
            description="Use Twilio status callbacks and recording callbacks to send completed call activity directly into Orvelle."
            actions={
              <span className="inline-flex rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[12px] font-medium text-[#6B7280]">
                Provider ready
              </span>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ValueField
                label="Your Webhook URL"
                value={webhookUrl}
                onCopy={() => handleCopy(webhookUrl, "webhook")}
                copyLabel="Copy URL"
                copied={copiedField === "webhook"}
              />
              <ValueField
                label="Your Account Identifier"
                value={accountIdentifier}
                onCopy={() => handleCopy(accountIdentifier, "account")}
                copyLabel="Copy ID"
                copied={copiedField === "account"}
              />
            </div>

            <div className="mt-5 rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4 sm:px-5">
              <div className="type-label-text text-[12px]">Instructions</div>
              <ol className="mt-3 space-y-3 pl-5 text-[14px] text-[#6B7280]">
                {instructions.map((instruction) => (
                  <li key={instruction}>{instruction}</li>
                ))}
              </ol>
            </div>
          </SectionCard>
        </section>

        <aside className="space-y-4 sm:space-y-5 xl:border-l xl:border-[#E5E7EB] xl:pl-5">
          <SectionCard
            title="Connection Status"
            description="Use this panel to confirm the webhook endpoint is configured and ready before sending live Twilio traffic."
          >
            <StatusIndicator
              status={status}
              connectionHealth={connectionHealth}
              description={statusDescription}
            />

            <div className="mt-4 grid gap-3">
              {connectionSummary.map((item) => (
                <div
                  key={item.label}
                  className="surface-secondary flex items-start justify-between gap-3 px-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="type-label-text text-[11px]">{item.label}</div>
                    <div className="type-section-title mt-2 break-words text-[15px] leading-6">
                      {item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {lastErrorMessage ? (
              <div className="mt-4 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-4 text-[13px] text-[#991B1B]">
                {lastErrorMessage}
              </div>
            ) : null}

            <div className="mt-5 rounded-[12px] border border-[#E5E7EB] bg-[#FFFFFF] p-4">
              <div className="type-section-title text-[15px]">Test webhook</div>
              <p className="type-body-text mt-2 text-[13px]">
                Run a connection check against the Twilio validation path before you point live callbacks at this endpoint.
              </p>
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={!endpointReady || testState === "loading"}
                className="button-primary-accent mt-4 inline-flex h-11 items-center justify-center px-4 text-[14px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testState === "loading" ? "Testing..." : "Test webhook"}
              </button>
              <p
                className={`mt-3 text-[13px] ${
                  testState === "error"
                    ? "text-[#B91C1C]"
                    : testState === "success"
                      ? "text-[#047857]"
                      : "text-[#6B7280]"
                }`}
              >
                {testMessage}
              </p>
            </div>
          </SectionCard>
        </aside>
      </div>
    </main>
  );
}
