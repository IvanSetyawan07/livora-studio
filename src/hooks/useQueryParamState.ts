/**
 * useQueryParamState — normalizes "filter behavior" across AI Marketing
 * pages so a filter/segment control is always:
 *   1. reflected in the URL (refresh-safe, shareable, back/forward works)
 *   2. the single source of truth a hook's queryKey reads from
 *
 * Phase 1 audit: Activity / Insights / Approvals / Recommendations each
 * re-implemented the same "selected chip -> local useState -> filter
 * array" pattern slightly differently, and none of them survived a page
 * refresh. This hook replaces the bare `useState` those pages used,
 * without changing how the value is consumed (still just a string).
 */
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useQueryParamState<T extends string>(
  param: string,
  defaultValue: T,
  allowed?: readonly T[],
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(param);
  const value = (raw && (!allowed || (allowed as readonly string[]).includes(raw)) ? raw : defaultValue) as T;

  const setValue = useCallback(
    (next: T) => {
      setSearchParams(
        (prev) => {
          const merged = new URLSearchParams(prev);
          if (next === defaultValue) {
            merged.delete(param);
          } else {
            merged.set(param, next);
          }
          return merged;
        },
        { replace: true },
      );
    },
    [param, defaultValue, setSearchParams],
  );

  return [value, setValue];
}