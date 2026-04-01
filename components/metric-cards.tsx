export type MetricCardItem = {
  value: string;
  label: string;
  detail: string;
};

export type RevenueSummaryItem = {
  value: string;
  label: string;
  detail: string;
  tone?: "risk" | "recovered" | "neutral";
};

export function MetricCards({ metrics }: { metrics: MetricCardItem[] }) {
  return (
    <section className="surface-primary motion-fade-up motion-delay-1 overflow-hidden">
      <div className="grid divide-y divide-[#E5E7EB] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {metrics.map((metric, index) => (
          <div key={index} className="motion-fade-up bg-[#FFFFFF] px-5 py-4 sm:px-7 sm:py-5" style={{ animationDelay: `${80 + index * 50}ms` }}>
            <div className="flex min-h-[58px] flex-col items-start gap-2 sm:flex-row sm:gap-4">
              <span className="type-metric-text text-[32px] sm:text-[36px]">{metric.value}</span>
              {metric.label ? <span className="type-section-title whitespace-pre-line text-[15px] leading-[1.15] sm:pt-1.5 sm:text-[16px]">{metric.label}</span> : null}
            </div>
            <p className="type-body-text mt-2 text-[13px] sm:mt-2.5 sm:text-[14px]">{metric.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RevenueSummaryCards({
  items
}: {
  items: RevenueSummaryItem[];
}) {
  const toneClasses: Record<NonNullable<RevenueSummaryItem["tone"]>, { dot: string; value: string }> = {
    risk: {
      dot: "bg-[#111827]",
      value: "text-[#111827]"
    },
    recovered: {
      dot: "bg-[#6B7280]",
      value: "text-[#111827]"
    },
    neutral: {
      dot: "bg-[#D1D5DB]",
      value: "text-[#111827]"
    }
  };

  return (
    <section className="motion-fade-up motion-delay-1 grid gap-3 sm:gap-4 lg:grid-cols-3">
      {items.map((item) => {
        const tone = toneClasses[item.tone ?? "neutral"];

        return (
          <div
            key={item.label}
            className="surface-primary motion-fade-up px-5 py-4 sm:px-6 sm:py-5"
            style={{ animationDelay: `${100 + items.indexOf(item) * 55}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="type-label-text text-[12px]">
                  {item.label}
                </div>
                <div className={`type-metric-text mt-3 text-[32px] sm:text-[36px] ${tone.value}`}>
                  {item.value}
                </div>
                <p className="type-body-text mt-2 text-[13px]">{item.detail}</p>
              </div>
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
