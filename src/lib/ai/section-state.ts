/**
 * SectionState — satu kontrak status untuk setiap section/komponen data di
 * AI Marketing dashboard.
 *
 * KENAPA INI ADA (lihat Phase 0 audit §5 dan defect P3 #16):
 * sebelum ini ada 3 pola berbeda untuk hal yang sama — `Block()` ad hoc di
 * Overview, spinner + `if (loading) return null` di halaman `useEffect`,
 * dan field custom per endpoint (`SearchConsoleSummary.connected`,
 * `CroFunnelSummary.hasData`). Setiap page menghitung ulang loading / empty
 * / error dengan bentuk yang berbeda-beda, dan status yang lebih spesifik —
 * permission required, perlu pilih akun/properti, kena rate limit, sedang
 * sinkron — tidak punya tempat sama sekali sehingga sering disamarkan jadi
 * "not connected" atau silent-fail.
 *
 * SectionState menyatukan sembilan kemungkinan status jadi satu union.
 * Prinsip yang WAJIB dipegang oleh setiap pemakai:
 *   1. Status ini dirender DI DALAM kerangka komponen aslinya (KpiCard,
 *      chart panel, table, platform row) — tidak pernah menggantikan
 *      komponen itu dengan shell generik (itu justru regresi yang sedang
 *      diperbaiki: lihat defect P1 #1–6).
 *   2. "data" selalu membawa data asli dari backend. Tidak ada fixture,
 *      tidak ada angka contoh yang menyamar sebagai "data".
 *   3. Setiap status membawa `retry` yang sudah terpasang ke query aslinya,
 *      supaya tombol Retry di UI manapun tidak perlu wiring manual.
 */

export type SectionStatus =
  | "loading"
  | "data"
  | "empty"
  | "not_connected"
  | "permission_required"
  | "selection_required"
  | "rate_limited"
  | "syncing"
  | "error";

export interface SectionStateBase {
  /** ISO timestamp fetch sukses terakhir, kalau diketahui. Dipakai renderer untuk "As of Xm ago". */
  lastUpdatedAt: string | null;
  /** True selagi ada background refetch — dipakai untuk indikator "Refreshing" TANPA mengosongkan section yang sudah punya data. */
  isRefreshing: boolean;
  /** refetch yang sudah terikat ke query aslinya. Selalu aman dipanggil dari tombol Retry manapun. */
  retry: () => void;
}

export interface SectionStateLoading extends SectionStateBase {
  status: "loading";
}

export interface SectionStateData<T> extends SectionStateBase {
  status: "data";
  data: T;
}

export interface SectionStateEmpty extends SectionStateBase {
  status: "empty";
  message?: string;
}

export interface SectionStateNotConnected extends SectionStateBase {
  status: "not_connected";
  /** Nama provider/integrasi yang dibutuhkan, mis. "GA4 Data API", "Meta Ads". */
  provider?: string;
  message?: string;
  /** Ke mana tombol "Connect" mengarah — biasanya Settings atau Providers. */
  connectHref?: string;
}

export interface SectionStatePermissionRequired extends SectionStateBase {
  status: "permission_required";
  provider?: string;
  message?: string;
}

export interface SectionStateSelectionRequired extends SectionStateBase {
  status: "selection_required";
  /** Apa yang perlu dipilih dulu, mis. "GA4 property", "Ads account", "GBP location". */
  label: string;
  message?: string;
}

export interface SectionStateRateLimited extends SectionStateBase {
  status: "rate_limited";
  retryAfterSeconds?: number;
}

export interface SectionStateSyncing extends SectionStateBase {
  status: "syncing";
  message?: string;
}

export interface SectionStateError extends SectionStateBase {
  status: "error";
  message: string;
  /** False untuk error yang retry-nya percuma (mis. 4xx non-auth selain rate limit). */
  retriable: boolean;
}

export type SectionState<T> =
  | SectionStateLoading
  | SectionStateData<T>
  | SectionStateEmpty
  | SectionStateNotConnected
  | SectionStatePermissionRequired
  | SectionStateSelectionRequired
  | SectionStateRateLimited
  | SectionStateSyncing
  | SectionStateError;

/**
 * Anggota union tanpa "loading" dan "data" — tidak ada generic T karena
 * tidak satupun dari status ini membawa payload. Ini tipe yang dipakai
 * komponen notice generik (`SectionNotice`) supaya bisa dipakai untuk
 * `SectionState<AIKpi>`, `SectionState<Campaign[]>`, dst tanpa peduli T.
 */
export type NonDataSectionState =
  | SectionStateEmpty
  | SectionStateNotConnected
  | SectionStatePermissionRequired
  | SectionStateSelectionRequired
  | SectionStateRateLimited
  | SectionStateSyncing
  | SectionStateError;

/** Narrowing helper: "apakah section ini punya data untuk dirender". */
export function hasData<T>(s: SectionState<T>): s is SectionStateData<T> {
  return s.status === "data";
}

/**
 * Factory untuk status yang TIDAK datang dari sebuah query React Query
 * (mis. slot KPI yang backend-nya memang belum ada sama sekali, bukan
 * error/loading dari sebuah endpoint). `retry` di sini sengaja no-op
 * kecuali dioper eksplisit — slot semacam ini tidak punya apa-apa untuk
 * di-retry sampai integrasinya benar-benar dipasang.
 */
export function notConnectedState(
  provider: string,
  opts: { message?: string; connectHref?: string; retry?: () => void } = {},
): SectionStateNotConnected {
  return {
    status: "not_connected",
    provider,
    message: opts.message,
    connectHref: opts.connectHref,
    lastUpdatedAt: null,
    isRefreshing: false,
    retry: opts.retry ?? (() => {}),
  };
}
