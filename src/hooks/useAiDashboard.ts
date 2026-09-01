/**
 * React Query hooks untuk AI Marketing.
 *
 * Semua halaman AI Marketing sebaiknya lewat sini, bukan memanggil
 * aiServices langsung di useEffect — supaya caching, refetch dan
 * invalidasi setelah approve/reject konsisten di seluruh dashboard.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiServices } from "@/lib/ai/services";
import type {
  AIActivity,
  AIAgent,
  AIAgentId,
  AIApproval,
  AIApprovalStatus,
  AIInsight,
  AIInsightType,
  AIKpi,
  AIRecommendation,
  BusinessHealth,
  PriorityItem,
  SearchConsoleSummary,
  CroFunnelSummary,
} from "@/lib/ai/types";
import { agentMeta } from "@/lib/ai/agent-catalog";

export const aiKeys = {
  health: ["ai", "dashboard", "health"] as const,
  kpis: ["ai", "dashboard", "kpis"] as const,
  priorities: ["ai", "dashboard", "priorities"] as const,
  agents: ["ai", "agents"] as const,
  recommendations: (status?: AIApprovalStatus) => ["ai", "recommendations", status ?? "all"] as const,
  actions: ["ai", "actions"] as const,
  insights: (type?: AIInsightType | "all", agent?: AIAgentId | "all") =>
    ["ai", "insights", type ?? "all", agent ?? "all"] as const,
  activity: (agent?: AIAgentId | "all") => ["ai", "activity", agent ?? "all"] as const,
  searchConsole: (days: number) => ["ai", "seo", "search-console", days] as const,
  croFunnel: () => ["ai", "cro", "funnel"] as const,
};

const STALE = 60_000;

export function useBusinessHealth() {
  return useQuery<BusinessHealth>({
    queryKey: aiKeys.health,
    queryFn: () => aiServices.dashboard.getBusinessHealth(),
    staleTime: STALE,
  });
}
export function useSearchConsoleSummary(days = 28) {
  return useQuery<SearchConsoleSummary>({
    queryKey: aiKeys.searchConsole(days),
    queryFn: () => aiServices.seo.getSearchConsoleSummary(days),
    staleTime: 10 * 60_000, // backend sudah cache 20 menit; ini cuma cegah refetch tiap mount
  });
}

/** KPI funnel CRO — dihitung backend dari tabel consultations (bukan LLM, bukan fixture). */
export function useCroFunnelSummary() {
  return useQuery<CroFunnelSummary>({
    queryKey: aiKeys.croFunnel(),
    queryFn: () => aiServices.cro.getFunnelSummary(),
    staleTime: 5 * 60_000,
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

/**
 * Satu agent, digabung dari data LIVE backend + katalog statis (identitas saja).
 * Kalau backend belum mengembalikan agent tsb, kita tetap render identitasnya
 * dengan status paling konservatif ("coming_soon") — bukan angka karangan.
 */
export function useAgent(id: AIAgentId) {
  const { data: agents = [], isLoading, isError } = useAiAgents();
  const meta = agentMeta(id);
  const live = agents.find((a) => a.id === id);

  const agent: AIAgent = live ?? {
    id,
    name: meta?.name ?? id,
    purpose: meta?.purpose ?? "",
    status: "coming_soon",
    connection: "not_connected",
    lastRun: null,
    tasks: 0,
    insightsCount: 0,
    recommendationsCount: 0,
    pendingApprovals: 0,
    capabilities: [],
    dependencies: [],
    href: meta?.href ?? `/admin/ai-marketing/${id}`,
  };

  return { agent, isLive: Boolean(live), isLoading, isError };
}

/** Satu recommendation by id — dipakai InsightCard untuk menampilkan aksi terkait. */
export function useRecommendation(id?: string | null) {
  return useQuery<AIRecommendation | undefined>({
    queryKey: ["ai", "recommendation", id ?? "none"] as const,
    queryFn: () => aiServices.recommendations.getById(id as string),
    enabled: Boolean(id),
    staleTime: STALE,
  });
}

export function useRecommendations(status?: AIApprovalStatus) {
  return useQuery<AIRecommendation[]>({
    queryKey: aiKeys.recommendations(status),
    queryFn: () => aiServices.recommendations.list(status ? { status } : undefined),
    staleTime: STALE,
  });
}

export function useAiActions() {
  return useQuery<AIApproval[]>({
    queryKey: aiKeys.actions,
    queryFn: () => aiServices.actions.list(),
    staleTime: STALE,
  });
}

export function useAiInsights(type?: AIInsightType | "all", agent?: AIAgentId | "all") {
  return useQuery<AIInsight[]>({
    queryKey: aiKeys.insights(type, agent),
    queryFn: () =>
      aiServices.insights.list({
        ...(type && type !== "all" ? { type } : {}),
        ...(agent && agent !== "all" ? { agent } : {}),
      }),
    staleTime: STALE,
  });
}

export function useAiActivity(agent?: AIAgentId | "all") {
  return useQuery<AIActivity[]>({
    queryKey: aiKeys.activity(agent),
    queryFn: () => aiServices.activity.list(agent && agent !== "all" ? { agent } : undefined),
    staleTime: 30_000,
  });
}

/** Approve / reject sebuah recommendation, lalu invalidasi semua turunannya. */
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

/** Approve+execute / reject sebuah action (AIApproval). */
export function useActionDecision() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ai"] });

  const approveAndExecute = useMutation({
    mutationFn: (id: string) => aiServices.actions.approveAndExecute(id),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (id: string) => aiServices.actions.reject(id),
    onSuccess: invalidate,
  });
  

  return { approveAndExecute, reject };
}
