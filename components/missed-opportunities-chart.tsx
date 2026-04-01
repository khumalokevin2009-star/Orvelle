"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type TrendDatum = {
  label: string;
  value: number;
};

type MissedOpportunitiesChartProps = {
  title?: string;
  data: TrendDatum[];
  subtitle: string;
  activeBucket: string | null;
  onBucketSelect: (label: string) => void;
  peakLabel?: string;
  tooltipLabel?: string;
  valueFormatter?: (value: number) => string;
};

function ChartTooltip({
  active,
  payload,
  label,
  tooltipLabel = "flagged interactions",
  valueFormatter
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  tooltipLabel?: string;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  const rawValue = payload[0]?.value ?? 0;

  return (
    <div className="surface-primary px-3 py-2 shadow-[0_10px_22px_rgba(17,24,39,0.08)]">
      <div className="type-label-text text-[11px]">{label}</div>
      <div className="type-section-title mt-1 text-[16px]">
        {valueFormatter ? valueFormatter(rawValue) : rawValue} {tooltipLabel}
      </div>
    </div>
  );
}

function ChartDot({
  cx,
  cy,
  index,
  payload,
  activeBucket,
  onBucketSelect
}: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: TrendDatum;
  activeBucket: string | null;
  onBucketSelect: (label: string) => void;
}) {
  if (cx == null || cy == null || !payload) return null;

  const isSelected = activeBucket === payload.label;

  return (
    <g
      className="cursor-pointer"
      onClick={() => onBucketSelect(payload.label)}
      role="button"
      aria-label={`Filter calls for ${payload.label}`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? 8 : 6}
        fill={isSelected ? "#E5E7EB" : "#FFFFFF"}
        opacity={isSelected ? 1 : 0.92}
      />
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? 5 : 4}
        fill="#FFFFFF"
        stroke="#111827"
        strokeWidth={isSelected ? 3 : 2}
      />
    </g>
  );
}

export function MissedOpportunitiesChart({
  title = "Revenue Leakage Trend",
  data,
  subtitle,
  activeBucket,
  onBucketSelect,
  peakLabel = "Peak Volume",
  tooltipLabel = "flagged interactions",
  valueFormatter
}: MissedOpportunitiesChartProps) {
  const peakValue = Math.max(...data.map((item) => item.value));

  return (
    <section className="surface-secondary motion-fade-up motion-delay-3 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="type-section-title text-[18px]">{title}</h3>
          <p className="type-body-text mt-1 text-[14px]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeBucket ? (
            <button
              type="button"
              onClick={() => onBucketSelect(activeBucket)}
              className="rounded-full border border-[#2563EB] bg-[#FFFFFF] px-3 py-1 text-[12px] font-semibold text-[#2563EB] transition hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              {activeBucket}
            </button>
          ) : null}
          <div className="surface-primary px-3 py-2 text-right">
            <div className="type-label-text text-[11px]">{peakLabel}</div>
            <div className="type-metric-text mt-1 text-[18px]">
              {valueFormatter ? valueFormatter(peakValue) : peakValue}
            </div>
          </div>
        </div>
      </div>

      <div className="surface-primary mt-5 p-4">
        <div className="h-[176px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 6" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }}
              />
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip
                cursor={{ stroke: "#D1D5DB", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                content={<ChartTooltip tooltipLabel={tooltipLabel} valueFormatter={valueFormatter} />}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#111827"
                strokeWidth={2.5}
                animationDuration={450}
                animationEasing="ease-out"
                activeDot={{
                  r: 6,
                  stroke: "#111827",
                  strokeWidth: 3,
                  fill: "#FFFFFF"
                }}
                dot={(dotProps) => {
                  const dotKey = `trend-dot-${String(dotProps.payload?.label ?? "unknown")}-${
                    dotProps.index ?? 0
                  }`;

                  return (
                    <ChartDot
                      key={dotKey}
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      index={dotProps.index}
                      payload={dotProps.payload as TrendDatum}
                      activeBucket={activeBucket}
                      onBucketSelect={onBucketSelect}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
