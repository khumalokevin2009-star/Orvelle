"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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
  tooltipLabel = "flagged interactions",
  valueFormatter
}: MissedOpportunitiesChartProps) {
  return (
    <section className="surface-secondary motion-fade-up motion-delay-3 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="type-section-title text-[18px]">{title}</h3>
          <p className="type-body-text mt-1 text-[14px]">{subtitle}</p>
        </div>
        <div className="flex min-h-[20px] items-center">
          {activeBucket ? (
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#6B7280]">
              <span>Focused period:</span>
              <button
                type="button"
                onClick={() => onBucketSelect(activeBucket)}
                className="rounded-full border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-1 text-[12px] font-semibold text-[#111827] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                {activeBucket}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="surface-primary mt-5 p-4 sm:p-5">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 14, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="missedRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111827" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#111827" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="2 8" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }}
              />
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip
                cursor={{ stroke: "#D1D5DB", strokeWidth: 1, strokeDasharray: "4 5" }}
                content={<ChartTooltip tooltipLabel={tooltipLabel} valueFormatter={valueFormatter} />}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#111827"
                strokeWidth={2.5}
                fill="url(#missedRevenueFill)"
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
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-[#E5E7EB] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="type-body-text text-[13px]">
            {activeBucket
              ? `Queue focused on ${activeBucket}. Select the same point again to return to the full operating view.`
              : "Click a point to focus the callback queue on a specific reporting period."}
          </div>
          {!activeBucket ? (
            <div className="type-label-text text-[11px]">Missed revenue trend over time</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
