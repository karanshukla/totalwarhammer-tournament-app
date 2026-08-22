export type StatsRange = "7d" | "30d" | "90d" | "all";

export const RANGE_OPTIONS: { range: StatsRange; label: string }[] = [
  { range: "7d", label: "7d" },
  { range: "30d", label: "30d" },
  { range: "90d", label: "90d" },
  { range: "all", label: "All-time" },
];

export const RANGE_DESCRIPTIONS: Record<StatsRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};
