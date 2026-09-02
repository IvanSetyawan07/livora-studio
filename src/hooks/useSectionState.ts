/**
 * useSectionState — memetakan hasil sebuah `useQuery` (React Query) jadi
 * satu `SectionState<T>` (lihat src/lib/ai/section-state.ts).
 *
 * Menangani dua sumber "status" yang berbeda:
 *  1. HTTP-level — 401/403 → permission_required, 429 → rate_limited
 *     (baca header Retry-After kalau ada), sisanya → error.
 *  2. Payload-level — endpoint yang sudah 200 tapi encode status di body-nya
 *     sendiri (`SearchConsoleSummary.connected`, `CroFunnelSummary.hasData`,
 *     status integrasi yang butuh account/property/location picker, dst).
 *     Ini lewat `deriveStatus`, dicek SEBELUM fallback ke empty/data supaya
 *     kontrak lama endpoint-endpoint itu tidak perlu diubah di backend.
 */
import { useCallback } from "react";
import axios from "axios";
import type { UseQueryResult } from "@tanstack/react-query";
import type {
  NonDataSectionState,
  SectionState,
  SectionStateBase,
  SectionStateError,
  SectionStatePermissionRequired,
  SectionStateRateLimited,
} from "@/lib/ai/section-state";

/** Apa yang `deriveStatus` perlu kembalikan — status-nya saja, tanpa field dasar (retry/lastUpdatedAt/isRefreshing) yang selalu diisi hook ini sendiri. */
export type DerivedNonDataStatus = Omit<NonDataSectionState, keyof SectionStateBase>;

export interface UseSectionStateOptions<T> {
  /** Tentukan "kosong" dari payload. Default: array length 0, atau null/undefined. */
  isEmpty?: (data: T) => boolean;
  /**
   * Baca payload sukses dan alihkan ke status non-"data" SEBELUM empty-check
   * jalan — untuk endpoint yang encode not_connected / selection_required /
   * syncing di dalam response 200, bukan lewat HTTP error.
   */
  deriveStatus?: (data: T) => DerivedNonDataStatus | null;
  /** Label provider dipakai kalau error 401/403 tidak menyebutkan provider-nya sendiri. */
  provider?: string;
}

type MinimalQueryResult<T> = Pick<
  UseQueryResult<T, unknown>,
  "data" | "isLoading" | "isFetching" | "isError" | "error" | "dataUpdatedAt" | "refetch"
>;

export function useSectionState<T>(
  query: MinimalQueryResult<T>,
  options: UseSectionStateOptions<T> = {},
): SectionState<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const retry = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  const lastUpdatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : null;
  const isRefreshing = query.isFetching && !query.isLoading;
  const base: SectionStateBase = { lastUpdatedAt, isRefreshing, retry };

  if (query.isLoading) {
    return { status: "loading", ...base };
  }

  if (query.isError) {
    return { ...describeError(query.error, options.provider), ...base };
  }

  if (query.data !== undefined) {
    const derived = options.deriveStatus?.(query.data);
    if (derived) {
      return { ...derived, ...base } as SectionState<T>;
    }
    const empty = options.isEmpty ? options.isEmpty(query.data) : defaultIsEmpty(query.data);
    if (empty) {
      return { status: "empty", ...base };
    }
    return { status: "data", data: query.data, ...base };
  }

  // Tidak loading, tidak error, tapi data juga belum ada — kondisi defensif
  // (mis. query masih `idle` karena `enabled: false`). Perlakukan sebagai
  // empty, bukan diam-diam merender apa pun.
  return { status: "empty", ...base };
}

function defaultIsEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  return false;
}

function describeError(
  error: unknown,
  provider?: string,
): SectionStatePermissionRequired | SectionStateRateLimited | SectionStateError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = (error.response?.data as { message?: string } | undefined)?.message;

    if (status === 401 || status === 403) {
      return {
        status: "permission_required",
        provider,
        message: serverMessage,
      } as SectionStatePermissionRequired;
    }

    if (status === 429) {
      const header = error.response?.headers?.["retry-after"];
      const parsed = header ? Number(header) : undefined;
      return {
        status: "rate_limited",
        retryAfterSeconds: Number.isFinite(parsed) ? parsed : undefined,
      } as SectionStateRateLimited;
    }

    return {
      status: "error",
      message: serverMessage ?? "Data tidak bisa dimuat dari server. Coba muat ulang.",
      retriable: !status || status >= 500,
    } as SectionStateError;
  }

  return {
    status: "error",
    message: "Data tidak bisa dimuat. Periksa koneksi Anda dan coba lagi.",
    retriable: true,
  } as SectionStateError;
}
