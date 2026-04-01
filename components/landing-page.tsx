"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BoltIcon, MoonIcon, SearchFlagIcon, StatsIcon, SunIcon, UploadIcon } from "@/components/icons";
import { OrvelleBrandIcon, OrvelleWordmark } from "@/components/orvelle-brand";
import { RequestDemoModal } from "@/components/request-demo-modal";
const SCREENSHOT_SRC = "/landing/dashboard-preview-final.png?v=20260331-premium-v5";

type Theme = "light" | "dark";
type SeriesKey = "risk" | "recovered" | "flagged";
type MetricFormat = "currency" | "percent" | "count";
type ProofTone = "danger" | "success" | "accent" | "warning";
type ThemeVars = CSSProperties & Record<`--${string}`, string>;

const landingThemeStyles: Record<Theme, ThemeVars> = {
  light: {
    colorScheme: "light",
    "--accent": "#2563EB",
    "--accent-soft": "rgba(37, 99, 235, 0.12)",
    "--landing-bg": "#F3F4F6",
    "--landing-nav": "rgba(247, 248, 251, 0.9)",
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
    "--landing-nav": "rgba(13, 18, 25, 0.88)",
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

const problemCards = [
  {
    title: "Missed follow-up burns warm demand",
    description:
      "When a high-intent caller does not get a fast callback, the job usually goes to the next company that answers."
  },
  {
    title: "Slow response quietly kills conversion",
    description:
      "Front-desk teams rarely see how much money delayed response times are costing until bookings flatten."
  },
  {
    title: "Managers know revenue is missing, not where",
    description:
      "Without call-level visibility, lost revenue looks like a vague pipeline problem instead of a fixable queue."
  }
] as const;

const solutionCards = [
  {
    title: "See which calls should have converted",
    description:
      "Flag high-intent calls that stalled, failed, or never received the follow-up they needed.",
    icon: SearchFlagIcon
  },
  {
    title: "Know how much revenue you lost",
    description:
      "Quantify the booking value tied to each missed opportunity so the team knows what matters first.",
    icon: StatsIcon
  },
  {
    title: "Get a prioritized recovery list",
    description:
      "Turn missed revenue into a ranked action queue your team can work through immediately.",
    icon: BoltIcon
  }
] as const;

const workflowSteps = [
  {
    title: "Upload your call data",
    description: "Drop in recent recordings and call history. It takes minutes, not a project plan.",
    icon: UploadIcon
  },
  {
    title: "We identify missed revenue automatically",
    description: "The platform finds the calls that should have converted and measures the financial loss.",
    icon: SearchFlagIcon
  },
  {
    title: "Your team gets a recovery list",
    description: "Every flagged call comes back with urgency, likely value, and the next action to take.",
    icon: BoltIcon
  }
] as const;

const credibilityItems = [
  "Designed for service businesses handling inbound calls all day",
  "Example 30-day snapshot: £1,120 identified, £800 recovered",
  "Built to give operators a recovery queue, not another dashboard nobody uses"
] as const;

const trendSeries: Record<
  SeriesKey,
  {
    label: string;
    summary: string;
    format: MetricFormat;
    values: number[];
  }
> = {
  risk: {
    label: "Revenue at risk",
    summary: "Shows the value currently tied to calls that should still be recovered.",
    format: "currency",
    values: [220, 280, 360, 540, 760, 1120]
  },
  recovered: {
    label: "Recovered revenue",
    summary: "Tracks the value already won back after focused follow-up on missed calls.",
    format: "currency",
    values: [0, 120, 240, 420, 620, 800]
  },
  flagged: {
    label: "Flagged calls",
    summary: "Shows how quickly the platform isolates the calls that need action from your team.",
    format: "count",
    values: [1, 2, 3, 4, 5, 6]
  }
};

const screenshotCallouts = [
  {
    title: "Revenue at risk",
    description: "The amount tied to calls that should still be recovered.",
    tone: "danger" as const,
    left: "11.26%",
    top: "23.53%",
    width: "27.27%",
    height: "21.54%"
  },
  {
    title: "Recovery rate",
    description: "Proof that follow-up effort is creating measurable revenue.",
    tone: "accent" as const,
    left: "68.15%",
    top: "23.53%",
    width: "27.27%",
    height: "21.54%"
  },
  {
    title: "Flagged calls",
    description: "A ranked queue of the calls your team should work first.",
    tone: "warning" as const,
    left: "11.26%",
    top: "70.9%",
    width: "58.95%",
    height: "22.6%"
  }
] as const;

const queueRows = [
  {
    name: "Maria Gomez",
    subtitle: "1 day ago",
    outcome: "Unclear",
    opportunity: "Yes",
    value: "£420",
    status: "Needs action",
    note: "Prioritize for revenue recovery outreach due to elevated appointment value."
  },
  {
    name: "Adam Spencer",
    subtitle: "2 days ago",
    outcome: "Unclear",
    opportunity: "Yes",
    value: "£250",
    status: "Needs action",
    note: "Queue as action required and assign same-day follow-up ownership."
  },
  {
    name: "Sarah Lee",
    subtitle: "3 days ago",
    outcome: "Unclear",
    opportunity: "Yes",
    value: "£200",
    status: "Needs action",
    note: "Escalated for front desk follow-up and same-day management review."
  }
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function formatMetric(value: number, format: MetricFormat) {
  if (format === "currency") {
    return formatCurrency(value);
  }

  if (format === "percent") {
    return `${value}%`;
  }

  return `${Math.round(value)}`;
}

function getProofTone(theme: Theme, tone: ProofTone) {
  const dark = theme === "dark";

  const tones = {
    danger: {
      badgeBackground: dark ? "rgba(248, 113, 113, 0.16)" : "rgba(239, 68, 68, 0.12)",
      badgeColor: dark ? "#FCA5A5" : "#B91C1C",
      borderColor: dark ? "rgba(248, 113, 113, 0.22)" : "rgba(239, 68, 68, 0.18)",
      glowColor: dark ? "rgba(248, 113, 113, 0.10)" : "rgba(239, 68, 68, 0.06)"
    },
    success: {
      badgeBackground: dark ? "rgba(74, 222, 128, 0.14)" : "rgba(34, 197, 94, 0.10)",
      badgeColor: dark ? "#86EFAC" : "#15803D",
      borderColor: dark ? "rgba(74, 222, 128, 0.20)" : "rgba(34, 197, 94, 0.16)",
      glowColor: dark ? "rgba(74, 222, 128, 0.08)" : "rgba(34, 197, 94, 0.05)"
    },
    accent: {
      badgeBackground: dark ? "rgba(96, 165, 250, 0.16)" : "rgba(37, 99, 235, 0.10)",
      badgeColor: dark ? "#93C5FD" : "#1D4ED8",
      borderColor: dark ? "rgba(96, 165, 250, 0.22)" : "rgba(37, 99, 235, 0.16)",
      glowColor: dark ? "rgba(96, 165, 250, 0.08)" : "rgba(37, 99, 235, 0.05)"
    },
    warning: {
      badgeBackground: dark ? "rgba(251, 191, 36, 0.16)" : "rgba(245, 158, 11, 0.12)",
      badgeColor: dark ? "#FCD34D" : "#B45309",
      borderColor: dark ? "rgba(251, 191, 36, 0.22)" : "rgba(245, 158, 11, 0.18)",
      glowColor: dark ? "rgba(251, 191, 36, 0.08)" : "rgba(245, 158, 11, 0.05)"
    }
  } as const;

  return tones[tone];
}

function getProofOverlayTone(tone: ProofTone) {
  const tones = {
    danger: {
      fillColor: "rgba(239, 68, 68, 0.03)",
      borderColor: "rgba(239, 68, 68, 0.52)",
      shadowColor: "rgba(239, 68, 68, 0.10)"
    },
    success: {
      fillColor: "rgba(34, 197, 94, 0.03)",
      borderColor: "rgba(34, 197, 94, 0.52)",
      shadowColor: "rgba(34, 197, 94, 0.10)"
    },
    accent: {
      fillColor: "rgba(59, 130, 246, 0.03)",
      borderColor: "rgba(59, 130, 246, 0.52)",
      shadowColor: "rgba(59, 130, 246, 0.10)"
    },
    warning: {
      fillColor: "rgba(245, 158, 11, 0.025)",
      borderColor: "rgba(245, 158, 11, 0.48)",
      shadowColor: "rgba(245, 158, 11, 0.08)"
    }
  } as const;

  return tones[tone];
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function useRevealOnce<T extends HTMLElement>(disabled: boolean, rootMargin = "0px 0px 12% 0px") {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(disabled);

  useEffect(() => {
    if (disabled) {
      setVisible(true);
      return;
    }

    if (visible) {
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    const revealIfNearViewport = () => {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const rect = node.getBoundingClientRect();

      if (rect.top <= viewportHeight * 0.96 && rect.bottom >= viewportHeight * -0.12) {
        setVisible(true);
        return true;
      }

      return false;
    };

    if (revealIfNearViewport()) {
      return;
    }

    if (typeof window.IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        setVisible(true);
        observer.disconnect();
      },
      {
        threshold: 0.01,
        rootMargin
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [disabled, rootMargin, visible]);

  return { ref, visible };
}

function useCountUp(target: number, active: boolean, prefersReducedMotion: boolean, duration = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let frame = 0;
    let startTime = 0;

    const tick = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(target * eased);

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    setValue(0);
    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [active, duration, prefersReducedMotion, target]);

  return value;
}

function buildChartGeometry(values: number[], width = 360, height = 220) {
  const paddingX = 18;
  const paddingTop = 16;
  const paddingBottom = 26;
  const innerHeight = height - paddingTop - paddingBottom;
  const stepX = (width - paddingX * 2) / Math.max(values.length - 1, 1);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || max || 1;

  const points = values.map((value, index) => {
    const x = paddingX + stepX * index;
    const normalized = (value - min) / range;
    const y = height - paddingBottom - normalized * innerHeight;

    return {
      x,
      y
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? paddingX} ${height - paddingBottom} L ${points[0]?.x ?? paddingX} ${height - paddingBottom} Z`;

  return {
    points,
    linePath,
    areaPath
  };
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <div className="type-label-text text-[12px]">{children}</div>;
}

function LandingSection({
  children,
  className,
  id,
  prefersReducedMotion
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  prefersReducedMotion: boolean;
}) {
  const { ref, visible } = useRevealOnce<HTMLElement>(prefersReducedMotion);

  return (
    <section
      id={id}
      ref={ref}
      data-visible={visible}
      className={`landing-reveal ${className ?? ""}`.trim()}
    >
      {children}
    </section>
  );
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

function HeroVisual({ theme }: { theme: Theme }) {
  return (
    <div className="landing-proof-frame surface-primary relative overflow-hidden p-4 sm:p-5" style={{ boxShadow: "var(--landing-shadow)" }}>
      <div className="grid gap-3 sm:grid-cols-[1.2fr_0.9fr]">
        <div className="surface-secondary p-4">
          <SectionEyebrow>Live revenue snapshot</SectionEyebrow>
          <div className="type-metric-text mt-3 text-[38px]">{formatCurrency(1120)}</div>
          <p className="type-body-text mt-2 text-[14px]">
            Revenue currently sitting in calls that should still be recovered this week.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="surface-secondary p-4">
            <div className="type-section-title text-[15px]">4 high-intent calls need action</div>
            <p className="type-body-text mt-2 text-[13px]">
              Prioritized by likely booking value and urgency.
            </p>
          </div>
          <div className="surface-secondary p-4">
            <div className="type-section-title text-[15px]">{formatCurrency(800)} recovered</div>
            <p className="type-body-text mt-2 text-[13px]">
              Example account win-back from the same 30-day window.
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-2">
        <div className="absolute left-4 top-4 z-10 hidden rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] shadow-sm md:block">
          Revenue at risk: {formatCurrency(1120)}
        </div>
        <div className="absolute bottom-4 left-4 z-10 hidden rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] shadow-sm md:block">
          Recovery queue ready for follow-up
        </div>
        <img
          src={SCREENSHOT_SRC}
          alt="Dashboard preview showing revenue at risk, recovery metrics, and a call recovery queue."
          className={`block w-full rounded-[16px] border border-[var(--border-subtle)] ${
            theme === "dark" ? "opacity-[0.96]" : ""
          }`}
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  );
}

function ProofSection({
  prefersReducedMotion,
  theme
}: {
  prefersReducedMotion: boolean;
  theme: Theme;
}) {
  const [activeSeries, setActiveSeries] = useState<SeriesKey>("risk");
  const { ref, visible } = useRevealOnce<HTMLDivElement>(prefersReducedMotion, "0px 0px 16% 0px");
  const riskValue = useCountUp(1120, visible, prefersReducedMotion);
  const recoveredValue = useCountUp(800, visible, prefersReducedMotion);
  const rateValue = useCountUp(42, visible, prefersReducedMotion);
  const flaggedValue = useCountUp(6, visible, prefersReducedMotion);
  const activeMetricValue = useCountUp(
    trendSeries[activeSeries].values[trendSeries[activeSeries].values.length - 1] ?? 0,
    visible,
    prefersReducedMotion,
    1200
  );

  const geometry = useMemo(() => buildChartGeometry(trendSeries[activeSeries].values), [activeSeries]);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pathLength, setPathLength] = useState(1);
  const [lineVisible, setLineVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (!pathRef.current) {
      return;
    }

    setPathLength(pathRef.current.getTotalLength());
  }, [geometry.linePath]);

  useEffect(() => {
    if (!visible) {
      setLineVisible(false);
      return;
    }

    if (prefersReducedMotion) {
      setLineVisible(true);
      return;
    }

    setLineVisible(false);
    const frame = window.requestAnimationFrame(() => setLineVisible(true));

    return () => window.cancelAnimationFrame(frame);
  }, [activeSeries, prefersReducedMotion, visible]);

  const proofMetrics = [
    {
      label: "Revenue at risk",
      value: formatCurrency(riskValue),
      description: "Value still available for follow-up and recovery.",
      tone: "danger" as const
    },
    {
      label: "Recovered revenue",
      value: formatCurrency(recoveredValue),
      description: "Revenue already won back from the same queue.",
      tone: "success" as const
    },
    {
      label: "Recovery rate",
      value: `${Math.round(rateValue)}%`,
      description: "How much exposed revenue has already been recovered.",
      tone: "accent" as const
    },
    {
      label: "Flagged calls",
      value: `${Math.round(flaggedValue)}`,
      description: "Calls requiring review, outreach, or follow-up action.",
      tone: "warning" as const
    }
  ];

  return (
    <LandingSection prefersReducedMotion={prefersReducedMotion} className="border-b border-[var(--border-subtle)]">
      <div ref={ref} className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="max-w-[760px]">
          <SectionEyebrow>Product proof</SectionEyebrow>
          <h2 className="type-page-title mt-4 text-[34px] sm:text-[44px]">
            One view shows the revenue at risk, the recovery queue, and what is already being won back.
          </h2>
          <p className="type-body-text mt-5 max-w-[700px] text-[17px]">
            Managers do not need more reporting. They need a single operational view that tells the team what money is
            missing, which calls caused it, and what to do next.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_360px]">
          <div
            className="landing-proof-frame surface-primary relative flex flex-col overflow-hidden p-4 sm:p-5"
            style={{ boxShadow: "var(--landing-shadow)" }}
          >
            <div className="mb-5 flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="type-section-title text-[20px]">Dashboard preview</div>
                <p className="type-body-text mt-2 text-[14px]">
                  The highlighted proof image shows where revenue is at risk, how recovery is improving, and where the
                  live queue starts.
                </p>
              </div>
              <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2 text-[12px] font-medium text-[var(--text-label)]">
                Example 30-day account snapshot
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-2">
              <div className="relative aspect-[2860/1360] overflow-hidden rounded-[16px] border border-[var(--border-subtle)]">
                <img
                  src={SCREENSHOT_SRC}
                  alt="Dashboard screenshot showing revenue at risk, recovery rate, and flagged call activity."
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />

                <div className="pointer-events-none absolute inset-0">
                  {screenshotCallouts.map((callout) => {
                    const tone = getProofOverlayTone(callout.tone);

                    return (
                      <div
                        key={`${callout.title}-overlay`}
                        className="landing-proof-annotation"
                        style={{
                          left: callout.left,
                          top: callout.top,
                          width: callout.width,
                          height: callout.height
                        }}
                      >
                        <div
                          className="landing-proof-annotation-outline"
                          style={{
                            borderColor: tone.borderColor,
                            backgroundColor: tone.fillColor,
                            boxShadow: `0 0 0 1px ${tone.shadowColor}, inset 0 0 0 1px ${tone.fillColor}`
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {screenshotCallouts.map((callout, index) => {
                const tone = getProofTone(theme, callout.tone);

                return (
                <div
                  key={callout.title}
                  className={`surface-secondary relative overflow-hidden p-4 transition-transform duration-300 hover:-translate-y-1 ${
                    prefersReducedMotion ? "" : "motion-fade-up"
                  }`}
                  style={{
                    borderColor: tone.borderColor,
                    boxShadow: `inset 0 1px 0 ${tone.glowColor}`,
                    animationDelay: `${120 + index * 90}ms`
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${tone.badgeColor}, transparent)`,
                      opacity: 0.9
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold"
                      style={{
                        backgroundColor: tone.badgeBackground,
                        color: tone.badgeColor
                      }}
                    >
                      {index + 1}
                    </span>
                    <div className="type-section-title text-[15px]">{callout.title}</div>
                  </div>
                  <p className="type-body-text mt-3 text-[13px]">{callout.description}</p>
                </div>
                );
              })}
            </div>

            <div
              className={`mt-4 flex flex-1 flex-col rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 ${
                prefersReducedMotion ? "" : "motion-fade-up"
              }`}
              style={{ animationDelay: "360ms" }}
            >
              <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="type-section-title text-[18px]">Flagged calls queue</div>
                  <p className="type-body-text mt-2 text-[13px]">
                    A closer view of the action queue your team should work first.
                  </p>
                </div>
                <div
                  className="inline-flex rounded-full px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    backgroundColor: getProofTone(theme, "warning").badgeBackground,
                    color: getProofTone(theme, "warning").badgeColor
                  }}
                >
                  Priority follow-up
                </div>
              </div>

              <div className="relative mt-4 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3 sm:p-4">
                <div className="overflow-hidden rounded-[16px] border border-[#D1D5DB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
                  <div className="border-b border-[#E5E7EB] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <div className="text-[17px] font-semibold tracking-[-0.01em] text-[#111827]">
                          Flagged Call Interactions
                        </div>
                        <p className="mt-1 text-[13px] leading-6 text-[#6B7280]">
                          Calls requiring review due to conversion failure or response gap
                        </p>
                      </div>
                      <div className="inline-flex rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-[12px] font-semibold text-[#1D4ED8]">
                        Unconverted High-Intent Leads
                      </div>
                    </div>
                  </div>

                  <div className="hidden grid-cols-[minmax(0,1.2fr)_0.8fr_0.9fr_0.9fr_1.35fr_0.8fr] gap-4 border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] md:grid">
                    <div>Caller ID</div>
                    <div>Call Outcome</div>
                    <div>Action Status</div>
                    <div>Revenue Impact</div>
                    <div>Analyst Note</div>
                    <div className="text-right">Actions</div>
                  </div>

                  <div className="divide-y divide-[#E5E7EB]">
                    {queueRows.map((row, index) => {
                      const needsAction = row.status === "Needs action";

                      return (
                        <div
                          key={row.name}
                          className={`grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1.2fr)_0.8fr_0.9fr_0.9fr_1.35fr_0.8fr] md:items-center ${
                            prefersReducedMotion ? "" : "motion-fade-up"
                          }`}
                          style={{ animationDelay: `${420 + index * 90}ms` }}
                        >
                          <div>
                            <div className="text-[16px] font-semibold tracking-[-0.01em] text-[#111827]">{row.name}</div>
                            <div className="mt-1 text-[13px] text-[#9CA3AF]">{row.subtitle}</div>
                          </div>

                          <div>
                            <div className="text-[16px] font-semibold tracking-[-0.01em] text-[#111827]">{row.outcome}</div>
                            <div className="mt-1 text-[13px] leading-6 text-[#6B7280]">Unconverted high-intent lead</div>
                          </div>

                          <div>
                            <span
                              className={`inline-flex rounded-full px-3 py-2 text-[12px] font-semibold ${
                                needsAction
                                  ? "bg-[#EEF2FF] text-[#1E3A8A]"
                                  : "border border-[#E5E7EB] bg-white text-[#374151]"
                              }`}
                            >
                              {row.status}
                            </span>
                            <div className="mt-2 text-[13px] leading-6 text-[#6B7280]">
                              Missed opportunity:
                              <span className="ml-1 font-semibold text-[#1D4ED8]">{row.opportunity}</span>
                            </div>
                          </div>

                          <div className="inline-flex w-fit rounded-[14px] border border-[#D1D5DB] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <div>
                              <div className="text-[18px] font-bold tracking-[-0.02em] text-[#111827]">{row.value}</div>
                              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                                Revenue impact
                              </div>
                            </div>
                          </div>

                          <div className="text-[13px] leading-7 text-[#6B7280] md:text-right">{row.note}</div>

                          <div className="flex md:justify-end">
                            <button
                              type="button"
                              className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#2563EB] px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                            >
                              Recover Call
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div
                  className="landing-proof-highlight pointer-events-none absolute inset-3 rounded-[16px] border-2"
                  style={{
                    borderColor: getProofTone(theme, "warning").badgeColor,
                    backgroundColor: "transparent",
                    boxShadow: `0 0 0 1px ${getProofTone(theme, "warning").borderColor}, inset 0 0 0 1px ${getProofTone(
                      theme,
                      "warning"
                    ).glowColor}`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface-primary p-5" style={{ boxShadow: "var(--landing-panel-shadow)" }}>
              <div className="grid gap-4 sm:grid-cols-2">
                {proofMetrics.map((metric, index) => {
                  const tone = getProofTone(theme, metric.tone);

                  return (
                    <div
                      key={metric.label}
                      className={`surface-secondary relative overflow-hidden p-4 transition-transform duration-300 hover:-translate-y-1 ${
                        prefersReducedMotion ? "" : "motion-fade-up"
                      }`}
                      style={{
                        borderColor: tone.borderColor,
                        boxShadow: `inset 0 1px 0 ${tone.glowColor}`,
                        animationDelay: `${200 + index * 90}ms`
                      }}
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-[2px]"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${tone.badgeColor}, transparent)`,
                          opacity: 0.9
                        }}
                      />
                      <div
                        className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                        style={{
                          backgroundColor: tone.badgeBackground,
                          color: tone.badgeColor
                        }}
                      >
                        {metric.label}
                      </div>
                      <div className="type-metric-text mt-3 text-[32px]">{metric.value}</div>
                      <p className="type-body-text mt-2 text-[13px]">{metric.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="surface-secondary p-5">
              <div className="flex flex-wrap gap-2">
                {(
                  Object.entries(trendSeries) as Array<
                    [SeriesKey, { label: string; summary: string; format: MetricFormat; values: number[] }]
                  >
                ).map(([seriesKey, series]) => {
                  const isActive = activeSeries === seriesKey;

                  return (
                    <button
                      key={seriesKey}
                      type="button"
                      onClick={() => setActiveSeries(seriesKey)}
                      className={`rounded-full border px-3 py-2 text-[12px] font-medium transition ${
                        isActive
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {series.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <div className="type-label-text text-[12px]">Interactive trend</div>
                <div className="type-metric-text mt-3 text-[34px]">
                  {formatMetric(activeMetricValue, trendSeries[activeSeries].format)}
                </div>
                <p className="type-body-text mt-2 text-[13px]">{trendSeries[activeSeries].summary}</p>
              </div>

              <div className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
                <svg viewBox="0 0 360 220" className="h-[220px] w-full" role="img" aria-label={`${trendSeries[activeSeries].label} trend`}>
                  {[48, 88, 128, 168].map((y) => (
                    <line
                      key={y}
                      x1="18"
                      x2="342"
                      y1={y}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeDasharray="4 8"
                      strokeWidth="1"
                    />
                  ))}

                  <path d={geometry.areaPath} fill="var(--accent-soft)" />
                  <path
                    ref={pathRef}
                    d={geometry.linePath}
                    fill="none"
                    stroke="var(--accent)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    strokeDasharray={pathLength}
                    strokeDashoffset={lineVisible ? 0 : pathLength}
                    style={{
                      transition: prefersReducedMotion ? "none" : "stroke-dashoffset 920ms cubic-bezier(0.22, 1, 0.36, 1)"
                    }}
                  />

                  {geometry.points.map((point, index) => (
                    <g
                      key={`${activeSeries}-${index}`}
                      style={{
                        opacity: lineVisible ? 1 : 0,
                        transform: lineVisible ? "scale(1)" : "scale(0.65)",
                        transformOrigin: `${point.x}px ${point.y}px`,
                        transition: prefersReducedMotion
                          ? "none"
                          : `opacity 260ms ease ${180 + index * 80}ms, transform 320ms cubic-bezier(0.22, 1, 0.36, 1) ${
                              180 + index * 80
                            }ms`
                      }}
                    >
                      <circle cx={point.x} cy={point.y} r="6" fill="var(--surface-primary)" stroke="var(--accent)" strokeWidth="3" />
                    </g>
                  ))}
                </svg>

                <div className="mt-2 grid grid-cols-6 text-center text-[11px] font-medium text-[var(--text-muted)]">
                  {["W1", "W2", "W3", "W4", "W5", "W6"].map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}

function VisualSection({
  eyebrow,
  title,
  copy,
  side,
  prefersReducedMotion,
  visual
}: {
  eyebrow: string;
  title: string;
  copy: string;
  side: "left" | "right";
  prefersReducedMotion: boolean;
  visual: ReactNode;
}) {
  return (
    <LandingSection prefersReducedMotion={prefersReducedMotion} className="border-b border-[var(--border-subtle)]">
      <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div
          className={`grid gap-10 lg:grid-cols-2 lg:items-center ${
            side === "left" ? "" : ""
          }`}
        >
          <div className={side === "left" ? "order-1" : "order-2 lg:order-1"}>{visual}</div>
          <div className={side === "left" ? "order-2" : "order-1 lg:order-2"}>
            <SectionEyebrow>{eyebrow}</SectionEyebrow>
            <h2 className="type-page-title mt-4 text-[32px] sm:text-[40px]">{title}</h2>
            <p className="type-body-text mt-5 max-w-[560px] text-[17px]">{copy}</p>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}

export function LandingPage() {
  const [theme, setTheme] = useState<Theme>("light");
  const prefersReducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const themeStyle = landingThemeStyles[theme];
  const roiReveal = useRevealOnce<HTMLDivElement>(prefersReducedMotion, "0px 0px 16% 0px");
  const weeklyLower = useCountUp(600, roiReveal.visible, prefersReducedMotion);
  const weeklyUpper = useCountUp(1200, roiReveal.visible, prefersReducedMotion);
  const annualUpper = useCountUp(62400, roiReveal.visible, prefersReducedMotion, 1500);

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
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 text-[var(--text-primary)] no-underline">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--landing-panel-shadow)]">
              <OrvelleBrandIcon size={28} priority />
            </span>
            <OrvelleWordmark theme={theme} priority />
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === "light" ? "dark" : "light"))} />
            <Link href="/login" className="hidden text-[14px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] md:inline-flex">
              Platform Login
            </Link>
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="button-primary-accent inline-flex h-11 items-center justify-center px-5 text-[14px]"
            >
              Request Demo
            </button>
          </div>
        </div>
      </header>

      <main>
        <LandingSection prefersReducedMotion={prefersReducedMotion} className="border-b border-[var(--border-subtle)]">
          <div className="landing-hero-grid">
            <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
              <div className="grid gap-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(520px,0.98fr)] lg:items-center">
                <div>
                  <SectionEyebrow>Revenue recovery for inbound call teams</SectionEyebrow>
                  <h1 className="type-page-title mt-5 max-w-[760px] text-[44px] sm:text-[58px] lg:text-[64px]">
                    See Exactly Which Calls Cost You Revenue — And Recover Them Fast.
                  </h1>
                  <p className="type-body-text mt-6 max-w-[690px] text-[18px]">
                    Identify missed revenue, quantify the financial loss from failed or delayed calls, and give your
                    team a prioritized recovery queue within minutes.
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setIsDemoModalOpen(true)}
                      className="button-primary-accent inline-flex h-12 items-center justify-center px-6 text-[15px]"
                    >
                      Request Demo
                    </button>
                    <a
                      href="#how-it-works"
                      className="button-secondary-ui inline-flex h-12 items-center justify-center px-6 text-[15px] no-underline"
                    >
                      See How It Works
                    </a>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <div className="surface-secondary p-4">
                      <div className="type-label-text text-[11px]">Revenue at risk</div>
                      <div className="type-metric-text mt-3 text-[30px]">{formatCurrency(1120)}</div>
                      <p className="type-body-text mt-2 text-[13px]">Identified from missed and failed calls in the example account.</p>
                    </div>
                    <div className="surface-secondary p-4">
                      <div className="type-label-text text-[11px]">Flagged calls</div>
                      <div className="type-metric-text mt-3 text-[30px]">6</div>
                      <p className="type-body-text mt-2 text-[13px]">High-intent callers already ranked for follow-up action.</p>
                    </div>
                    <div className="surface-secondary p-4">
                      <div className="type-label-text text-[11px]">Recovered</div>
                      <div className="type-metric-text mt-3 text-[30px]">{formatCurrency(800)}</div>
                      <p className="type-body-text mt-2 text-[13px]">Recovered revenue from the same 30-day recovery window.</p>
                    </div>
                  </div>
                </div>

                <HeroVisual theme={theme} />
              </div>
            </div>
          </div>
        </LandingSection>

        <LandingSection prefersReducedMotion={prefersReducedMotion} className="border-b border-[var(--border-subtle)]">
          <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid gap-3 lg:grid-cols-3">
              {credibilityItems.map((item) => (
                <div key={item} className="surface-secondary px-4 py-4">
                  <div className="type-section-title text-[15px]">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </LandingSection>

        <LandingSection prefersReducedMotion={prefersReducedMotion} className="border-b border-[var(--border-subtle)]">
          <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="max-w-[520px]">
                <SectionEyebrow>The problem</SectionEyebrow>
                <h2 className="type-page-title mt-4 text-[34px] sm:text-[44px]">
                  Missed calls are not a service issue. They are lost money.
                </h2>
                <p className="type-body-text mt-5 text-[17px]">
                  Many service teams find that a meaningful share of inbound demand never converts because follow-up is
                  slow, inconsistent, or missing entirely. The revenue disappears long before anyone sees it in a report.
                </p>
                <div className="surface-primary mt-6 p-5" style={{ boxShadow: "var(--landing-panel-shadow)" }}>
                  <div className="type-label-text text-[11px]">Estimated impact</div>
                  <div className="type-section-title mt-3 text-[22px]">
                    Up to 30% of inbound opportunities can stall when response and follow-up break down.
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {problemCards.map((card) => (
                  <div key={card.title} className="surface-primary p-6" style={{ boxShadow: "var(--landing-panel-shadow)" }}>
                    <div className="type-section-title text-[19px]">{card.title}</div>
                    <p className="type-body-text mt-4 text-[15px]">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </LandingSection>

        <LandingSection prefersReducedMotion={prefersReducedMotion} className="border-b border-[var(--border-subtle)]">
          <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
            <div className="max-w-[720px]">
              <SectionEyebrow>The solution</SectionEyebrow>
              <h2 className="type-page-title mt-4 text-[34px] sm:text-[44px]">
                Turn failed calls into a recovery queue your team can work today.
              </h2>
              <p className="type-body-text mt-5 text-[17px]">
                The platform does not give you abstract “insights.” It tells you which calls should have converted, how
                much money was left behind, and which actions to take first.
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {solutionCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div key={card.title} className="surface-primary p-6" style={{ boxShadow: "var(--landing-panel-shadow)" }}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--accent)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="type-section-title mt-6 text-[22px]">{card.title}</div>
                    <p className="type-body-text mt-4 text-[15px]">{card.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </LandingSection>

        <ProofSection prefersReducedMotion={prefersReducedMotion} theme={theme} />

        <VisualSection
          prefersReducedMotion={prefersReducedMotion}
          side="left"
          eyebrow="Benefit 01"
          title="Revenue at risk is visible immediately, not after the month is gone."
          copy="Instead of guessing where bookings were lost, leaders get a clear money view: what is still recoverable, what has already been won back, and what the team should tackle before the opportunity cools."
          visual={
            <div className="surface-primary p-5" style={{ boxShadow: "var(--landing-shadow)" }}>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="surface-secondary p-4">
                  <SectionEyebrow>At risk</SectionEyebrow>
                  <div className="type-metric-text mt-3 text-[34px]">{formatCurrency(1120)}</div>
                  <p className="type-body-text mt-2 text-[13px]">Still available if the team follows up quickly.</p>
                </div>
                <div className="surface-secondary p-4">
                  <SectionEyebrow>Recovered</SectionEyebrow>
                  <div className="type-metric-text mt-3 text-[34px]">{formatCurrency(800)}</div>
                  <p className="type-body-text mt-2 text-[13px]">Already won back from calls that were previously lost.</p>
                </div>
                <div className="surface-secondary p-4">
                  <SectionEyebrow>Recovery rate</SectionEyebrow>
                  <div className="type-metric-text mt-3 text-[34px]">42%</div>
                  <p className="type-body-text mt-2 text-[13px]">Proof that focused follow-up produces revenue, not noise.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="surface-secondary p-4">
                  <div className="type-section-title text-[16px]">Top missed opportunity</div>
                  <p className="type-body-text mt-2 text-[13px]">Maria called for urgent service, asked for pricing, and never got a same-day callback.</p>
                  <div className="type-metric-text mt-4 text-[28px]">{formatCurrency(420)}</div>
                </div>
                <div className="surface-secondary p-4">
                  <div className="type-section-title text-[16px]">What the team does next</div>
                  <p className="type-body-text mt-2 text-[13px]">Call back first, reference the original issue, confirm availability, and close the booking window before the lead goes cold.</p>
                </div>
              </div>
            </div>
          }
        />

        <VisualSection
          prefersReducedMotion={prefersReducedMotion}
          side="right"
          eyebrow="Benefit 02"
          title="Give the team a recovery queue that feels operational, not theoretical."
          copy="Every missed opportunity comes back with a value estimate, action status, and next step. That keeps the sales or front-desk team focused on revenue recovery instead of reading notes and guessing priorities."
          visual={
            <div className="surface-primary overflow-hidden p-0" style={{ boxShadow: "var(--landing-shadow)" }}>
              <div className="border-b border-[var(--border-subtle)] px-5 py-4">
                <div className="type-section-title text-[20px]">Recovery queue</div>
                <p className="type-body-text mt-2 text-[14px]">Calls sorted by likely value and urgency.</p>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {queueRows.map((row) => {
                  const needsAction = row.status === "Needs action";

                  return (
                    <div key={row.name} className="grid gap-4 px-5 py-4 sm:grid-cols-[1.2fr_0.6fr_0.9fr] sm:items-center">
                      <div>
                        <div className="type-section-title text-[16px]">{row.name}</div>
                        <p className="type-body-text mt-2 text-[13px]">{row.note}</p>
                      </div>
                      <div className="rounded-[12px] border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-4 py-3">
                        <div className="type-label-text text-[11px]">Revenue value</div>
                        <div className="type-metric-text mt-2 text-[28px]">{row.value}</div>
                      </div>
                      <div className="flex flex-col gap-3 sm:items-end">
                        <span
                          className={`inline-flex rounded-full px-3 py-2 text-[12px] font-semibold ${
                            needsAction
                              ? "bg-[#EEF2FF] text-[#1E3A8A]"
                              : "border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-label)]"
                          }`}
                        >
                          {row.status}
                        </span>
                        <button
                          type="button"
                          className={`inline-flex h-10 items-center justify-center rounded-[12px] px-4 text-[13px] font-semibold ${
                            needsAction
                              ? "button-primary-accent"
                              : "button-secondary-ui"
                          }`}
                        >
                          {needsAction ? "Recover Call" : "View Notes"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          }
        />

        <VisualSection
          prefersReducedMotion={prefersReducedMotion}
          side="left"
          eyebrow="Benefit 03"
          title="Track what has been recovered so the ROI is visible to the business."
          copy="The point is not only finding missed revenue. It is proving that better follow-up wins money back. Leaders can see recovered revenue over time and decide where to keep investing operational effort."
          visual={
            <div className="surface-primary p-5" style={{ boxShadow: "var(--landing-shadow)" }}>
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="surface-secondary p-5">
                  <SectionEyebrow>30-day outcome</SectionEyebrow>
                  <div className="type-metric-text mt-3 text-[36px]">{formatCurrency(800)}</div>
                  <p className="type-body-text mt-2 text-[13px]">
                    Recovered revenue already converted back into booked work from flagged calls.
                  </p>
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-3">
                      <span className="type-body-text text-[13px]">Won back this week</span>
                      <span className="type-section-title text-[16px]">{formatCurrency(300)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-3">
                      <span className="type-body-text text-[13px]">Calls closed successfully</span>
                      <span className="type-section-title text-[16px]">2</span>
                    </div>
                  </div>
                </div>

                <div className="surface-secondary p-5">
                  <div className="type-section-title text-[18px]">Recovered revenue trend</div>
                  <p className="type-body-text mt-2 text-[13px]">Simple enough for operators, clear enough for leadership.</p>
                  <div className="mt-5 h-[210px] rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
                    <svg viewBox="0 0 320 170" className="h-full w-full" aria-hidden="true">
                      {[28, 62, 96, 130].map((y) => (
                        <line
                          key={y}
                          x1="14"
                          x2="306"
                          y1={y}
                          y2={y}
                          stroke="var(--border-subtle)"
                          strokeDasharray="4 8"
                          strokeWidth="1"
                        />
                      ))}
                      <path d="M18 138 L78 138 L138 124 L198 108 L258 82 L302 34" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
                      {[
                        [18, 138],
                        [78, 138],
                        [138, 124],
                        [198, 108],
                        [258, 82],
                        [302, 34]
                      ].map(([x, y]) => (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="var(--surface-primary)" stroke="var(--accent)" strokeWidth="3" />
                      ))}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          }
        />

        <LandingSection id="how-it-works" prefersReducedMotion={prefersReducedMotion} className="border-b border-[var(--border-subtle)]">
          <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
            <div className="max-w-[720px]">
              <SectionEyebrow>How it works</SectionEyebrow>
              <h2 className="type-page-title mt-4 text-[34px] sm:text-[44px]">
                Three steps from call data to revenue recovery.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="surface-primary p-6" style={{ boxShadow: "var(--landing-panel-shadow)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--accent)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="type-label-text text-[11px]">Step {index + 1}</div>
                    </div>
                    <div className="type-section-title mt-6 text-[22px]">{step.title}</div>
                    <p className="type-body-text mt-4 text-[15px]">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </LandingSection>

        <LandingSection prefersReducedMotion={prefersReducedMotion} className="border-b border-[var(--border-subtle)]">
          <div ref={roiReveal.ref} className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
              <div className="max-w-[560px]">
                <SectionEyebrow>ROI</SectionEyebrow>
                <h2 className="type-page-title mt-4 text-[34px] sm:text-[44px]">
                  Recover just 1–2 missed jobs a week and the platform pays for itself.
                </h2>
                <p className="type-body-text mt-5 text-[17px]">
                  If a recovered job is worth around £600, bringing back one to two missed calls each week puts
                  meaningful revenue back on the board fast. That is why the value case is operational, not theoretical.
                </p>
              </div>

              <div className="surface-primary p-6" style={{ boxShadow: "var(--landing-shadow)" }}>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="surface-secondary p-4">
                    <SectionEyebrow>Average recovered job</SectionEyebrow>
                    <div className="type-metric-text mt-3 text-[34px]">{formatCurrency(600)}</div>
                    <p className="type-body-text mt-2 text-[13px]">Illustrative service value per recovered booking.</p>
                  </div>
                  <div className="surface-secondary p-4">
                    <SectionEyebrow>Weekly upside</SectionEyebrow>
                    <div className="type-metric-text mt-3 text-[30px]">
                      {formatCurrency(weeklyLower)}–{formatCurrency(weeklyUpper)}
                    </div>
                    <p className="type-body-text mt-2 text-[13px]">Recovering just one to two missed jobs each week.</p>
                  </div>
                  <div className="surface-secondary p-4">
                    <SectionEyebrow>Annual upside</SectionEyebrow>
                    <div className="type-metric-text mt-3 text-[34px]">{formatCurrency(annualUpper)}</div>
                    <p className="type-body-text mt-2 text-[13px]">Potential annual revenue if that recovery pace is maintained.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </LandingSection>

        <LandingSection prefersReducedMotion={prefersReducedMotion}>
          <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <div className="landing-proof-frame surface-primary overflow-hidden p-8 sm:p-10 lg:p-12" style={{ boxShadow: "var(--landing-shadow)" }}>
              <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,0.75fr)] lg:items-end">
                <div>
                  <SectionEyebrow>Request a demo</SectionEyebrow>
                  <h2 className="type-page-title mt-4 max-w-[720px] text-[36px] sm:text-[48px]">
                    See What Revenue You&apos;re Missing — Request a Demo.
                  </h2>
                  <p className="type-body-text mt-5 max-w-[640px] text-[17px]">
                    We&apos;ll show you how the platform identifies missed revenue, values the loss, and gives your team
                    a recovery queue they can use immediately.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsDemoModalOpen(true)}
                    className="button-primary-accent inline-flex h-12 items-center justify-center px-6 text-[15px]"
                  >
                    Request Demo
                  </button>
                  <a
                    href="#how-it-works"
                    className="button-secondary-ui inline-flex h-12 items-center justify-center px-6 text-[15px] no-underline"
                  >
                    See How It Works
                  </a>
                </div>
              </div>
            </div>
          </div>
        </LandingSection>
      </main>

      <footer className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="type-body-text text-[13px]">
            Orvelle helps service businesses identify missed revenue from inbound calls and turn it into action.
          </p>
          <div className="flex items-center gap-4 text-[14px]">
            <Link href="/privacy" className="font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="font-medium text-[var(--text-secondary)] no-underline transition hover:text-[var(--text-primary)]">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>

      <RequestDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </div>
  );
}
