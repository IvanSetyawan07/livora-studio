/** Phase 1 — satu sumber kebenaran untuk date range global. */

export type AiDateRangeKey = "7d" | "28d" | "90d" | "custom";

export interface AiDateRange {
  key: AiDateRangeKey;
  /** ISO yyyy-mm-dd — wajib terisi juga untuk preset (dihitung dari hari ini). */
  from: string;
  to: string;
  /** Dikirim ke endpoint lama yang masih menerima `days`. */
  days: number;
}

export const AI_DATE_RANGE_PRESETS: { key: AiDateRangeKey; label: string; days: number }[] = [
  { key: "7d", label: "7D", days: 7 },
  { key: "28d", label: "28D", days: 28 },
  { key: "90d", label: "90D", days: 90 },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function rangeFromDays(key: AiDateRangeKey, days: number): AiDateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { key, from: iso(from), to: iso(to), days };
}

export function customRange(from: string, to: string): AiDateRange {
  const days =
    Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1) || 1;
  return { key: "custom", from, to, days };
}

export const DEFAULT_AI_DATE_RANGE: AiDateRange = rangeFromDays("28d", 28);

/** Bagian range yang masuk ke query key + query params. Stabil & serializable. */
export function rangeParams(r: AiDateRange) {
  return { from: r.from, to: r.to, days: r.days };
}

/** Dipakai di query key supaya perubahan range = refetch, bukan cache yang sama. */
export function rangeKey(r: AiDateRange) {
  return `${r.from}_${r.to}`;
}

export function formatRangeLabel(r: AiDateRange) {
  const preset = AI_DATE_RANGE_PRESETS.find((p) => p.key === r.key);
  return preset ? preset.label : `${r.from} → ${r.to}`;
}
