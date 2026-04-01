"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BoltIcon, MoonIcon, SearchFlagIcon, StatsIcon, SunIcon, UploadIcon } from "@/components/icons";
import { OrvelleBrandIcon, OrvelleWordmark } from "@/components/orvelle-brand";
import { RequestDemoModal } from "@/components/request-demo-modal";

const SCREENSHOT_SRC = "/landing/dashboard-preview-final.png";

type Theme = "light" | "dark";
type PublicPageKey = "home" | "product" | "integrations" | "how-it-works" | "security";
type ThemeVars = CSSProperties & Record<`--${string}`, string>;

const PUBLIC_NAV = [
  { key: "home", label: "Home", href: "/" },
  { key: "product", label: "Product", href: "/product" },
  { key: "integrations", label: "Integrations", href: "/integrations" },
  { key: "how-it-works", label: "How It Works", href: "/how-it-works" },
  { key: "security", label: "Security", href: "/security" }
] as const;

const INTEGRATION_LABELS = [
  "Twilio",
  "Aircall",
  "RingCentral",
  "Zapier",
  "Call recordings via email",
  "CRM / workflow integrations"
] as const;

const HOME_VALUE_CARDS = [
  {
    title: "Missed revenue becomes visible",
    description:
      "Surface the calls, failed outcomes, and follow-up gaps most likely tied to lost jobs."
  },
  {
    title: "High-intent leads are prioritised",
    description:
      "Separate the callbacks that matter from the admin noise sitting in the backlog."
  },
  {
    title: "Teams know what to do next",
    description:
      "Give operators a clear recovery queue instead of another dashboard full of passive metrics."
  }
] as const;

const HOME_FLOW = [
  {
    title: "Connect or send call data",
    description: "Bring in call logs, recordings, exports, or forwarded audio from the systems you already use.",
    icon: UploadIcon
  },
  {
    title: "Analyse calls",
    description: "Orvelle structures conversations, call outcomes, and operational signals into one usable view.",
    icon: SearchFlagIcon
  },
  {
    title: "Identify missed revenue",
    description: "The platform detects which calls likely should have converted and where revenue was lost.",
    icon: StatsIcon
  },
  {
    title: "Take action",
    description: "Teams get the follow-up queue, value context, and next action needed to recover more jobs.",
    icon: BoltIcon
  }
] as const;

const PRODUCT_PILLARS = [
  {
    title: "Call analysis engine",
    description:
      "Orvelle brings together recordings, call history, and operational outcomes so teams can review call performance in context."
  },
  {
    title: "Revenue detection layer",
    description:
      "The platform highlights which calls likely should have converted, where follow-up failed, and what value may have been lost."
  },
  {
    title: "Action layer",
    description:
      "Every missed opportunity feeds into a clear operational queue so the team knows who to call back first and why."
  }
] as const;

const PRODUCT_BREAKDOWN = [
  {
    title: "Revenue at risk",
    description: "Shows the value still sitting inside missed calls, missed callbacks, and unresolved opportunities."
  },
  {
    title: "Recovery rate",
    description: "Tracks how much exposed revenue has already been won back through focused follow-up."
  },
  {
    title: "Priority callbacks",
    description: "Ranks the calls most likely to produce revenue if the team acts quickly."
  },
  {
    title: "Operational status",
    description: "Keeps outcome, intent, and follow-up state visible across the queue instead of spread across tools."
  }
] as const;

const PRODUCT_OUTCOMES = [
  "Faster follow-up on the calls that matter most",
  "Clearer visibility into where revenue is leaking",
  "A repeatable recovery workflow the team can actually use"
] as const;

const INTEGRATION_SECTIONS = [
  {
    title: "Direct integrations",
    description:
      "Designed to fit with telephony systems such as Twilio, Aircall, and RingCentral as Orvelle expands live connectors.",
    items: ["Twilio", "Aircall", "RingCentral"]
  },
  {
    title: "Email ingestion",
    description:
      "Forward call recordings or exported audio into Orvelle when teams need a lightweight starting point.",
    items: ["Forwarded recordings", "Shared inbox workflows", "Audio attachments"]
  },
  {
    title: "Manual upload fallback",
    description:
      "Start with exports and uploads today, then scale into deeper ingestion once the workflow proves value.",
    items: ["Bulk call logs", "Recording archives", "Operational exports"]
  }
] as const;

const SECURITY_CARDS = [
  {
    title: "Data handling",
    description:
      "Orvelle is designed to process call data in a controlled application environment with clear operational workflows."
  },
  {
    title: "Access control",
    description:
      "Authentication and protected internal routes help ensure only authorised users can access the operational workspace."
  },
  {
    title: "Secure processing",
    description:
      "Analysis workflows are built to move call data through structured application routes instead of ad hoc handling."
  },
  {
    title: "Infrastructure reliability",
    description:
      "The platform is designed to support stable ingestion, retrievable records, and scalable operational usage as integrations grow."
  }
] as const;

const landingThemeStyles: Record<Theme, ThemeVars> = {
  light: {
    colorScheme: "light",
    "--accent": "#2563EB",
    "--accent-soft": "rgba(37, 99, 235, 0.12)",
    "--landing-bg": "#F3F4F6",
    "--landing-nav": "rgba(247, 248, 251, 0.92)",
    "--landing-grid": "rgba(17, 24, 39, 0.05)",
    "--landing-shadow": "0 24px 60px rgba(15, 23, 42, 0.08)",
    "--landing-panel-shadow": "0 1px 2px rgba(15, 23, 42, 0.06)",
    "--text-primary": "#111827",
    "--text-label": "#374151",
    "--text-secondary": "#6B7280",
    "--text-muted": "#9CA3AF",
    "--border-strong": "#D1D5DB",
    "--border-subtle": "#E5E7EB",
    "--surface-primary": "#FFFFFF",
    "--surface-secondary": "#F9FAFB"
  },
  dark: {
    colorScheme: "dark",
    "--accent": "#4F7CFF",
    "--accent-soft": "rgba(79, 124, 255, 0.18)",
    "--landing-bg": "#0A0E14",
    "--landing-nav": "rgba(13, 18, 25, 0.9)",
    "--landing-grid": "rgba(255, 255, 255, 0.04)",
    "--landing-shadow": "0 28px 70px rgba(2, 6, 23, 0.55)",
    "--landing-panel-shadow": "0 1px 2px rgba(2, 6, 23, 0.28)",
    "--text-primary": "#F5F7FB",
    "--text-label": "#D3DAE5",
    "--text-secondary": "#97A3B6",
    "--text-muted": "#667085",
    "--border-strong": "#2A3442",
    "--border-subtle": "#1C2430",
    "--surface-primary": "#101722",
    "--surface-secondary": "#0D141D"
  }
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <div className="type-label-text text-[12px]">{children}</div>;
}

function ThemeToggle({
  theme,
  onToggle
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      className="button-secondary-ui relative inline-flex h-11 w-[78px] items-center px-1.5"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-1.5 w-[34px] rounded-full bg-[var(--accent)] transition-transform duration-300"
        style={{
          transform: isDark ? "translateX(32px)" : "translateX(0)"
        }}
      />
      <span className="relative z-10 grid w-full grid-cols-2 place-items-center">
        <SunIcon className={`h-4 w-4 transition-colors ${isDark ? "text-[var(--text-muted)]" : "text-white"}`} />
        <MoonIcon className={`h-4 w-4 transition-colors ${isDark ? "text-white" : "text-[var(--text-muted)]"}`} />
      </span>
    </button>
  );
}

function PageSection({
  children,
  className = "",
  id
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`border-b border-[var(--border-subtle)] ${className}`.trim()}>
      <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">{children}</div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  centered = false
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-[760px] text-center" : "max-w-[760px]"}>
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <h2 className="type-page-title mt-4 text-[32px] sm:text-[42px]">{title}</h2>
      <p className="type-body-text mt-5 text-[17px]">{description}</p>
    </div>
  );
}

function MarketingCard({
  title,
  description,
  icon
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="surface-primary p-6" style={{ boxShadow: "var(--landing-panel-shadow)" }}>
      {icon ? <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--accent)]">{icon}</div> : null}
      <div className="type-section-title text-[20px]">{title}</div>
      <p className="type-body-text mt-4 text-[15px]">{description}</p>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  description
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="surface-secondary p-4">
      <div className="type-label-text text-[11px]">{label}</div>
      <div className="type-metric-text mt-3 text-[30px]">{value}</div>
      <p className="type-body-text mt-2 text-[13px]">{description}</p>
    </div>
  );
}

function DashboardPreview({
  title,
  description,
  showMetrics = true
}: {
  title: string;
  description: string;
  showMetrics?: boolean;
}) {
  return (
    <div className="landing-proof-frame surface-primary overflow-hidden p-4 sm:p-5" style={{ boxShadow: "var(--landing-shadow)" }}>
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[620px]">
          <div className="type-section-title text-[20px]">{title}</div>
          <p className="type-body-text mt-2 text-[14px]">{description}</p>
        </div>
        <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-[12px] font-medium text-[var(--text-label)]">
          Example operational workspace
        </div>
      </div>

      {showMetrics ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <PreviewMetric
            label="Revenue at risk"
            value={formatCurrency(1120)}
            description="Calls that still need follow-up or conversion recovery."
          />
          <PreviewMetric
            label="Recovered revenue"
            value={formatCurrency(800)}
            description="Revenue already won back through structured follow-up."
          />
          <PreviewMetric
            label="Flagged calls"
            value="6"
            description="High-intent calls currently sitting in the recovery queue."
          />
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-2">
        <Image
          src={SCREENSHOT_SRC}
          alt="Orvelle dashboard preview showing call intelligence, revenue at risk, recovery rate, and follow-up priorities."
          width={1792}
          height={1024}
          priority
          className="h-auto w-full rounded-[16px] border border-[var(--border-subtle)]"
        />
      </div>
    </div>
  );
}

function FlowGrid() {
  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-4">
      {HOME_FLOW.map((step, index) => {
        const Icon = step.icon;

        return (
          <div key={step.title} className="surface-primary p-6" style={{ boxShadow: "var(--landing-panel-shadow)" }}>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="type-label-text text-[11px]">Step {index + 1}</div>
            </div>
            <div className="type-section-title mt-6 text-[20px]">{step.title}</div>
            <p className="type-body-text mt-4 text-[15px]">{step.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function FinalCta({
  title,
  description,
  onOpenDemo
}: {
  title: string;
  description: string;
  onOpenDemo: () => void;
}) {
  return (
    <PageSection className="border-b-0">
      <div className="landing-proof-frame surface-primary overflow-hidden p-8 sm:p-10 lg:p-12" style={{ boxShadow: "var(--landing-shadow)" }}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,0.75fr)] lg:items-end">
          <div>
            <SectionEyebrow>Request a demo</SectionEyebrow>
            <h2 className="type-page-title mt-4 max-w-[720px] text-[34px] sm:text-[46px]">{title}</h2>
            <p className="type-body-text mt-5 max-w-[620px] text-[17px]">{description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <button
              type="button"
              onClick={onOpenDemo}
              className="button-primary-accent inline-flex h-12 items-center justify-center px-6 text-[15px]"
            >
              Request Demo
            </button>
            <Link
              href="/product"
              className="button-secondary-ui inline-flex h-12 items-center justify-center px-6 text-[15px] no-underline"
            >
              Explore Product
            </Link>
          </div>
        </div>
      </div>
    </PageSection>
  );
}

function PublicSiteShell({
  activePage,
  children,
  onOpenDemo
}: {
  activePage: PublicPageKey;
  children: ReactNode;
  onOpenDemo: () => void;
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const themeStyle = landingThemeStyles[theme];

  useEffect(() => {
    setMounted(true);
    const storedTheme = window.localStorage.getItem("call-revenue-landing-theme");

    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    window.localStorage.setItem("call-revenue-landing-theme", theme);
  }, [mounted, theme]);

  return (
    <div className="landing-root min-h-screen" style={themeStyle}>
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--landing-nav)] backdrop-blur-xl">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3 text-[var(--text-primary)] no-underline">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--landing-panel-shadow)]">
                  <OrvelleBrandIcon size={28} priority />
                </span>
                <OrvelleWordmark theme={theme} priority />
              </Link>

              <div className="flex items-center gap-2 lg:hidden">
                <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === "light" ? "dark" : "light"))} />
                <button
                  type="button"
                  onClick={onOpenDemo}
                  className="button-primary-accent inline-flex h-11 items-center justify-center px-4 text-[14px]"
                >
                  Request Demo
                </button>
              </div>
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === "light" ? "dark" : "light"))} />
              <Link
                href="/login"
                className="button-secondary-ui inline-flex h-11 items-center justify-center px-4 text-[14px] no-underline"
              >
                Login
              </Link>
              <button
                type="button"
                onClick={onOpenDemo}
                className="button-primary-accent inline-flex h-11 items-center justify-center px-5 text-[14px]"
              >
                Request Demo
              </button>
            </div>
          </div>

          <nav className="hidden items-center gap-6 border-t border-[var(--border-subtle)] py-4 lg:flex">
            {PUBLIC_NAV.map((item) => {
              const isActive = item.key === activePage;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`text-[14px] font-medium no-underline transition ${
                    isActive
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <nav className="ui-scrollbar-x -mx-4 overflow-x-auto px-4 pb-4 lg:hidden">
            <div className="flex min-w-max gap-2">
              {PUBLIC_NAV.map((item) => {
                const isActive = item.key === activePage;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-full border px-3 py-2 text-[13px] font-medium no-underline transition ${
                      isActive
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/login"
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]"
              >
                Login
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="type-body-text text-[13px]">
            Orvelle is a call intelligence and integration platform for service businesses that depend on inbound calls.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[14px]">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/privacy" className="font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

function HomePageContent({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <>
      <PageSection>
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)] lg:items-center">
          <div>
            <SectionEyebrow>Call intelligence platform</SectionEyebrow>
            <h1 className="type-page-title mt-5 max-w-[760px] text-[42px] sm:text-[58px] lg:text-[64px]">
              Recover lost revenue from your inbound calls. Automatically.
            </h1>
            <p className="type-body-text mt-6 max-w-[700px] text-[18px]">
              Orvelle helps service businesses connect call systems, detect high-intent calls that did not convert,
              and turn missed conversations into clear recovery action.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onOpenDemo}
                className="button-primary-accent inline-flex h-12 items-center justify-center px-6 text-[15px]"
              >
                Request Demo
              </button>
              <Link
                href="/product"
                className="button-secondary-ui inline-flex h-12 items-center justify-center px-6 text-[15px] no-underline"
              >
                Explore Product
              </Link>
            </div>

            <p className="type-body-text mt-5 text-[14px]">
              Built for service businesses that rely on inbound calls to win work.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <PreviewMetric
                label="Revenue at risk"
                value={formatCurrency(1120)}
                description="Example value surfaced from missed and unresolved inbound calls."
              />
              <PreviewMetric
                label="Priority callbacks"
                value="6"
                description="High-intent calls already ranked for the next follow-up action."
              />
              <PreviewMetric
                label="Recovered"
                value={formatCurrency(800)}
                description="Revenue already won back from the same operational queue."
              />
            </div>
          </div>

          <DashboardPreview
            title="See the operational picture in one place"
            description="Missed revenue, priority callbacks, and recovery metrics in a single call intelligence workspace."
          />
        </div>
      </PageSection>

      <PageSection>
        <SectionHeader
          eyebrow="Core value"
          title="A platform for missed revenue, not just missed calls."
          description="Orvelle gives teams one place to connect call activity, prioritise the right opportunities, and turn lost conversations into follow-up action."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {HOME_VALUE_CARDS.map((card) => (
            <MarketingCard key={card.title} title={card.title} description={card.description} />
          ))}
        </div>
      </PageSection>

      <PageSection>
        <SectionHeader
          eyebrow="How it works"
          title="A simple path from call activity to recovery action."
          description="Start with the data you already have. Orvelle helps turn it into something operationally useful."
        />
        <FlowGrid />
        <div className="mt-8">
          <Link href="/how-it-works" className="button-secondary-ui inline-flex h-11 items-center justify-center px-5 text-[14px] no-underline">
            See How It Works
          </Link>
        </div>
      </PageSection>

      <PageSection>
        <SectionHeader
          eyebrow="Integrations"
          title="Built to fit the systems you already use."
          description="Start with call recordings, logs, or exports today. Scale into deeper integrations as your workflow matures."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {INTEGRATION_LABELS.map((label) => (
            <div key={label} className="surface-primary flex min-h-[88px] items-center px-5 py-4" style={{ boxShadow: "var(--landing-panel-shadow)" }}>
              <div className="type-section-title text-[18px]">{label}</div>
            </div>
          ))}
        </div>
        <p className="type-body-text mt-6 text-[15px]">
          No change to your current workflow required.
        </p>
      </PageSection>

      <PageSection>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div className="max-w-[560px]">
            <SectionEyebrow>ROI</SectionEyebrow>
            <h2 className="type-page-title mt-4 text-[32px] sm:text-[42px]">
              Recovering one missed job can justify the platform.
            </h2>
            <p className="type-body-text mt-5 text-[17px]">
              For service businesses, a single missed call can mean hundreds or thousands in lost revenue. Orvelle
              helps teams focus on the highest-value opportunities first so recovery work actually gets done.
            </p>
          </div>

          <div className="surface-primary p-6" style={{ boxShadow: "var(--landing-shadow)" }}>
            <div className="grid gap-4 md:grid-cols-3">
              <PreviewMetric
                label="Average recovered job"
                value={formatCurrency(600)}
                description="Illustrative service value per recovered booking."
              />
              <PreviewMetric
                label="Weekly upside"
                value={`${formatCurrency(600)}–${formatCurrency(1200)}`}
                description="Potential value from recovering one to two jobs each week."
              />
              <PreviewMetric
                label="Annual upside"
                value={formatCurrency(62400)}
                description="Illustrative annual value when recovery becomes repeatable."
              />
            </div>
          </div>
        </div>
      </PageSection>

      <FinalCta
        title="Stop letting valuable calls disappear into the backlog."
        description="See how Orvelle can help your team identify missed revenue and act on the calls most likely to recover jobs."
        onOpenDemo={onOpenDemo}
      />
    </>
  );
}

function ProductPageContent({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <>
      <PageSection>
        <SectionHeader
          eyebrow="Product"
          title="Call intelligence built for teams that live on inbound demand."
          description="Orvelle is designed to turn call activity, recordings, and follow-up state into one operational workspace for service businesses."
        />
      </PageSection>

      <PageSection>
        <div className="grid gap-4 lg:grid-cols-3">
          {PRODUCT_PILLARS.map((pillar, index) => {
            const icons = [<UploadIcon key="upload" className="h-5 w-5" />, <StatsIcon key="stats" className="h-5 w-5" />, <BoltIcon key="bolt" className="h-5 w-5" />];

            return (
              <MarketingCard
                key={pillar.title}
                title={pillar.title}
                description={pillar.description}
                icon={icons[index]}
              />
            );
          })}
        </div>
      </PageSection>

      <PageSection>
        <SectionHeader
          eyebrow="Dashboard"
          title="One view for call performance, missed revenue, and next action."
          description="The dashboard is designed for operators who need to understand what happened, what it cost, and which calls need action next."
        />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_360px]">
          <DashboardPreview
            title="Operational dashboard"
            description="A single workspace for revenue at risk, recovery rate, and the live callback queue."
            showMetrics={false}
          />
          <div className="space-y-4">
            {PRODUCT_BREAKDOWN.map((item) => (
              <MarketingCard key={item.title} title={item.title} description={item.description} />
            ))}
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="max-w-[560px]">
            <SectionEyebrow>Outcome</SectionEyebrow>
            <h2 className="type-page-title mt-4 text-[32px] sm:text-[42px]">
              The value is operational clarity, not just another analytics layer.
            </h2>
            <p className="type-body-text mt-5 text-[17px]">
              Orvelle helps teams move from scattered call data to a practical recovery workflow, with clearer visibility
              into which conversations likely cost the business real jobs.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {PRODUCT_OUTCOMES.map((item) => (
              <div key={item} className="surface-primary p-5" style={{ boxShadow: "var(--landing-panel-shadow)" }}>
                <div className="type-section-title text-[19px]">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </PageSection>

      <FinalCta
        title="See how Orvelle turns call activity into revenue intelligence."
        description="We’ll walk through the analysis layer, the dashboard, and how the action queue fits into real operational workflows."
        onOpenDemo={onOpenDemo}
      />
    </>
  );
}

function IntegrationsPageContent({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <>
      <PageSection>
        <SectionHeader
          eyebrow="Integrations"
          title="Designed to fit into your existing call workflow."
          description="Orvelle is built to work with the systems service businesses already rely on for telephony, recordings, and follow-up operations."
        />
        <div className="surface-primary mt-8 p-6" style={{ boxShadow: "var(--landing-shadow)" }}>
          <div className="type-section-title text-[22px]">No change to your current workflow required</div>
          <p className="type-body-text mt-3 text-[15px]">
            Start with the data you already have today. Move into deeper integrations only when it makes operational sense.
          </p>
        </div>
      </PageSection>

      <PageSection>
        <div className="grid gap-4 lg:grid-cols-3">
          {INTEGRATION_SECTIONS.map((section) => (
            <div key={section.title} className="surface-primary p-6" style={{ boxShadow: "var(--landing-panel-shadow)" }}>
              <div className="type-section-title text-[20px]">{section.title}</div>
              <p className="type-body-text mt-4 text-[15px]">{section.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {section.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-[12px] font-medium text-[var(--text-label)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <SectionHeader
          eyebrow="Approach"
          title="Start simple, then scale into deeper operational automation."
          description="Exports, forwarded recordings, and uploads are often enough to prove value quickly. Once the workflow is working, Orvelle is designed to support more integrated ingestion and recovery operations."
        />
      </PageSection>

      <FinalCta
        title="See how Orvelle fits into your existing call stack."
        description="We’ll show the simplest starting path for your current systems and how that can evolve over time."
        onOpenDemo={onOpenDemo}
      />
    </>
  );
}

function HowItWorksPageContent({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <>
      <PageSection>
        <SectionHeader
          eyebrow="How it works"
          title="A clear path from call data to recovery action."
          description="Orvelle is designed to make call intelligence operationally useful, not just informational."
        />
      </PageSection>

      <PageSection>
        <FlowGrid />
      </PageSection>

      <PageSection>
        <div className="grid gap-4 lg:grid-cols-3">
          <MarketingCard
            title="What teams see"
            description="Priority callbacks, missed revenue indicators, and recovery progress in one operational view."
          />
          <MarketingCard
            title="What leaders get"
            description="Clearer visibility into where call-driven revenue is being lost and where follow-up is working."
          />
          <MarketingCard
            title="What improves"
            description="Response prioritisation, follow-up consistency, and the ability to recover more jobs from existing demand."
          />
        </div>
      </PageSection>

      <FinalCta
        title="See the workflow from connected calls to recovered jobs."
        description="We’ll show how Orvelle fits into the real operating rhythm of a service business, from ingestion to follow-up."
        onOpenDemo={onOpenDemo}
      />
    </>
  );
}

function SecurityPageContent({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <>
      <PageSection>
        <SectionHeader
          eyebrow="Security"
          title="Built for controlled access and operational reliability."
          description="Orvelle is designed to support secure handling of call data and reliable internal access for the teams using it."
        />
      </PageSection>

      <PageSection>
        <div className="grid gap-4 lg:grid-cols-2">
          {SECURITY_CARDS.map((card) => (
            <MarketingCard key={card.title} title={card.title} description={card.description} />
          ))}
        </div>
      </PageSection>

      <PageSection>
        <SectionHeader
          eyebrow="Trust"
          title="Serious enough for operational use."
          description="The platform is designed to support authenticated access, protected internal routes, structured processing workflows, and a credible operational foundation as Orvelle evolves."
        />
      </PageSection>

      <FinalCta
        title="Review the platform with security and operations in mind."
        description="We’ll walk through how Orvelle is designed to support controlled access, reliable workflows, and scalable operational usage."
        onOpenDemo={onOpenDemo}
      />
    </>
  );
}

export function PublicSitePage({ page }: { page: PublicPageKey }) {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const openDemoModal = () => setIsDemoModalOpen(true);

  const content =
    page === "home" ? (
      <HomePageContent onOpenDemo={openDemoModal} />
    ) : page === "product" ? (
      <ProductPageContent onOpenDemo={openDemoModal} />
    ) : page === "integrations" ? (
      <IntegrationsPageContent onOpenDemo={openDemoModal} />
    ) : page === "how-it-works" ? (
      <HowItWorksPageContent onOpenDemo={openDemoModal} />
    ) : (
      <SecurityPageContent onOpenDemo={openDemoModal} />
    );

  return (
    <>
      <PublicSiteShell activePage={page} onOpenDemo={openDemoModal}>
        {content}
      </PublicSiteShell>
      <RequestDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </>
  );
}

export function HomeMarketingPage() {
  return <PublicSitePage page="home" />;
}
