import type { UseQueryResult } from "@tanstack/react-query";
import { ApiError, isApiConfigured } from "@/lib/api";
import type { SectionState } from "./section-state";

interface Options {
  /** Dianggap empty kalau true. Default: array kosong / null / undefined. */
  isEmpty?: (data: unknown) => boolean;
  emptyMessage?: string;
  provider?: string;
  connectHref?: string;
  selectionLabel?: string;
}

const defaultIsEmpty = (d: unknown) =>
  d === null || d === undefined || (Array.isArray(d) && d.length === 0);

export function toSectionState<T>(
  q: Pick<
    UseQueryResult<T>,
    "data" | "error" | "isPending" | "isFetching" | "dataUpdatedAt" | "refetch"
  >,
  opts: Options = {},
): SectionState<T> {
  const retry = () => void q.refetch();
  const base = {
    lastUpdatedAt: q.dataUpdatedAt ? new Date(q.dataUpdatedAt).toISOString() : null,
    isRefreshing: q.isFetching && !q.isPending,
    retry,
  };

  if (q.error) {
    const e = q.error as ApiError;
    const kind = e instanceof ApiError ? e.kind : "unknown";

    if (kind === "not_connected" || (!isApiConfigured && kind === "network"))
      return { ...base, status: "not_connected", provider: opts.provider, connectHref: opts.connectHref, message: e.message };
    if (kind === "permission_required" || kind === "unauthenticated" || kind === "invalid_credentials")
      return { ...base, status: "permission_required", provider: opts.provider, message: e.message };
    if (kind === "selection_required")
      return { ...base, status: "selection_required", label: opts.selectionLabel ?? "akun/properti", message: e.message };
    if (kind === "rate_limited")
      return { ...base, status: "rate_limited", retryAfterSeconds: e.retryAfterSeconds };

    return {
      ...base,
      status: "error",
      message: e?.message ?? "Terjadi kesalahan.",
      retriable: e instanceof ApiError ? e.retriable : true,
    };
  }

  if (q.isPending) return { ...base, status: "loading" };

  const empty = (opts.isEmpty ?? defaultIsEmpty)(q.data);
  if (empty) return { ...base, status: "empty", message: opts.emptyMessage };

  return { ...base, status: "data", data: q.data as T };
}
