export type DateRangeKey = "7d" | "30d" | "90d";

export const dateRangeOptions: Array<{ key: DateRangeKey; label: string }> = [
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" }
];

export function getDateRangeLabel(range: DateRangeKey) {
  return dateRangeOptions.find((option) => option.key === range)?.label ?? "Last 30 Days";
}
