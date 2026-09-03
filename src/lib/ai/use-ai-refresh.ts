/**
 * Hook refresh generik untuk section AI Marketing.
 *
 * Dipakai tombol "Refresh" di header dashboard: cukup oper queryKey milik
 * section-nya, hook ini mengembalikan callback yang meng-invalidate query
 * tersebut sehingga React Query melakukan refetch nyata (bukan re-render).
 */
import { useCallback } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

export function useAiRefresh(queryKey: QueryKey) {
  const qc = useQueryClient();
  return useCallback(() => void qc.invalidateQueries({ queryKey }), [qc, queryKey]);
}
