/**
 * AiDateRange — satu sumber kebenaran untuk kontrol date range global di
 * header AI Marketing Shell (lihat AiMarketingContext.dateRange).
 *
 * Phase 1 audit: dropdown date range di ShellHeader sebelumnya cuma
 * `useState` lokal di komponen header itu sendiri — memilih opsi lain
 * tidak mengubah data apa pun di halaman manapun (defect: "Date range
 * changes must update data" tidak pernah benar-benar terjadi). File ini
 * memberi tipe + helper bersama supaya context bisa menyimpan satu nilai
 * yang lalu dipakai sebagai bagian dari query key hook manapun yang
 * butuh range (mis. `useSearchConsoleSummary`).
 */

export type AiDateRangeKey = "7d" | "14d" | "30d" | "month";

export interface AiDateRangeOption {
  key: AiDateRangeKey;
  label: string;
  /** Jumlah hari yang dikirim ke endpoint yang menerima parameter `days`. */
  days: number;
}

export const AI_DATE_RANGE_OPTIONS: AiDateRangeOption[] = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "14d", label: "Last 14 days", days: 14 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "month", label: "This month", days: daysElapsedThisMonth() },
];

export const DEFAULT_AI_DATE_RANGE: AiDateRangeKey = "30d";

function daysElapsedThisMonth(): number {
  const now = new Date();
  return now.getDate();
}

export function daysForRange(key: AiDateRangeKey): number {
  return AI_DATE_RANGE_OPTIONS.find((o) => o.key === key)?.days ?? 30;
}

export function labelForRange(key: AiDateRangeKey): string {
  return AI_DATE_RANGE_OPTIONS.find((o) => o.key === key)?.label ?? key;
}