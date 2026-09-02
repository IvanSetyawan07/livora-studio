import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import type { AiChatContextKey } from "@/lib/ai/types";
import {
  DEFAULT_AI_DATE_RANGE, rangeFromDays, customRange,
  AI_DATE_RANGE_PRESETS, type AiDateRange, type AiDateRangeKey,
} from "@/lib/ai/date-range";

export interface AiFilters {
  agent?: string;
  status?: string;
  platform?: string;
  search?: string;
}

interface Ctx {
  context: AiChatContextKey;
  askOpen: boolean;
  openAsk: () => void;
  closeAsk: () => void;

  dateRange: AiDateRange;
  setDateRangePreset: (key: AiDateRangeKey) => void;
  setCustomDateRange: (from: string, to: string) => void;

  filters: AiFilters;
  setFilter: (k: keyof AiFilters, v?: string) => void;
  resetFilters: () => void;

  /** Refetch SEMUA query "ai" — dipakai tombol Refresh di header. */
  refreshAll: () => Promise<void>;
  isRefreshing: boolean;
  lastRefreshedAt: string | null;
}

const AiMarketingCtx = createContext<Ctx | null>(null);
const SetterCtx = createContext<((k: AiChatContextKey) => void) | null>(null);

export function AiMarketingProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [context, setContextState] = useState<AiChatContextKey>("overview");
  const [askOpen, setAskOpen] = useState(false);
  const [dateRange, setDateRange] = useState<AiDateRange>(DEFAULT_AI_DATE_RANGE);
  const [filters, setFilters] = useState<AiFilters>({});
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  const inFlight = useIsFetching({ queryKey: ["ai"] });

  const setDateRangePreset = useCallback((key: AiDateRangeKey) => {
    const preset = AI_DATE_RANGE_PRESETS.find((p) => p.key === key);
    if (preset) setDateRange(rangeFromDays(preset.key, preset.days));
  }, []);

  const setCustomDateRange = useCallback(
    (from: string, to: string) => setDateRange(customRange(from, to)),
    [],
  );

  const setFilter = useCallback(
    (k: keyof AiFilters, v?: string) =>
      setFilters((p) => ({ ...p, [k]: v && v !== "all" ? v : undefined })),
    [],
  );

  const refreshAll = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["ai"] });
    setLastRefreshedAt(new Date().toISOString());
  }, [qc]);

  const value = useMemo<Ctx>(
    () => ({
      context, askOpen,
      openAsk: () => setAskOpen(true),
      closeAsk: () => setAskOpen(false),
      dateRange, setDateRangePreset, setCustomDateRange,
      filters, setFilter, resetFilters: () => setFilters({}),
      refreshAll, isRefreshing: inFlight > 0, lastRefreshedAt,
    }),
    [context, askOpen, dateRange, filters, inFlight, lastRefreshedAt,
     setDateRangePreset, setCustomDateRange, setFilter, refreshAll],
  );

  const setter = useCallback((k: AiChatContextKey) => setContextState(k), []);

  return (
    <AiMarketingCtx.Provider value={value}>
      <SetterCtx.Provider value={setter}>{children}</SetterCtx.Provider>
    </AiMarketingCtx.Provider>
  );
}

export function useAiMarketingContext() {
  const ctx = useContext(AiMarketingCtx);
  if (!ctx) throw new Error("useAiMarketingContext must be used within AiMarketingProvider");
  return ctx;
}

export function usePageContext(key: AiChatContextKey) {
  const setter = useContext(SetterCtx);
  useEffect(() => { setter?.(key); }, [setter, key]);
}
