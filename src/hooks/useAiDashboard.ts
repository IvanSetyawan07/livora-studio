/**
 * Hook data AI Marketing — satu tempat untuk semua query dashboard.
 *
 * Pakai @tanstack/react-query (QueryClientProvider sudah dipasang di App.tsx).
 * Semua hook di sini lewat `aiServices`, jadi otomatis ikut mode live/mock.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiServices } from "@/lib/ai/services";
import type {
  AIAgent,
  AIKpi,
  AIRecommendation,
  BusinessHealth,
  PriorityItem,
} from "@/lib/ai/types";

const STALE = 60_000; // 1 menit — dashboard tidak perlu real-time per detik

export const aiKeys = {
  health: ["ai", "dashboard", "health"] as const,
  kpis: ["ai", "dashboard", "kpis"] as const,
  priorities: ["ai", "dashboard", "priorities"] as const,
  agents: ["ai", "agents"] as const,
  recommendations: (status?: string) => ["ai", "recommendations", status ?? "all"] as const,
};

export function useBusinessHealth() {
  return useQuery<BusinessHealth>({
    queryKey: aiKeys.health,
    queryFn: () => aiServices.dashboard.getBusinessHealth(),
    staleTime: STALE,
  });
}

export function useOverviewKpis() {
  return useQuery<AIKpi[]>({
    queryKey: aiKeys.kpis,
    queryFn: () => aiServices.dashboard.getOverviewKpis(),
    staleTime: STALE,
  });
}

export function usePriorities() {
  return useQuery<PriorityItem[]>({
    queryKey: aiKeys.priorities,
    queryFn: () => aiServices.dashboard.getPriorities(),
    staleTime: STALE,
  });
}

export function useAiAgents() {
  return useQuery<AIAgent[]>({
    queryKey: aiKeys.agents,
    queryFn: () => aiServices.dashboard.getAgents(),
    staleTime: STALE,
  });
}

export function useRecommendations(status?: "pending" | "approved" | "rejected") {
  return useQuery<AIRecommendation[]>({
    queryKey: aiKeys.recommendations(status),
    queryFn: () => aiServices.recommendations.list(status ? { status } : undefined),
    staleTime: STALE,
  });
}

/** Approve / reject rekomendasi + invalidasi semua data dashboard yang terpengaruh. */
export function useRecommendationDecision() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ai"] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => aiServices.recommendations.approve(id),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (id: string) => aiServices.recommendations.reject(id),
    onSuccess: invalidate,
  });

  return { approve, reject };
}
