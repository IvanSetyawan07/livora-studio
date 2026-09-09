import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel } from "@/components/ai/primitives";
import { RecommendationCard } from "@/components/ai/recommendation-card";
import { QueryError } from "@/components/ai/query-error";
import { usePageContext } from "@/context/AiMarketingContext";
import { useRecommendationDecision, useRecommendations } from "@/hooks/useAiDashboard";
import type { AIApprovalStatus } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const filters: (AIApprovalStatus | "all")[] = ["all", "pending", "approved", "executed", "rejected"];

export default function AiMarketingRecommendations() {
  usePageContext("recommendations");
  const [filter, setFilter] = useState<AIApprovalStatus | "all">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { data: items, isLoading, isError, refetch } = useRecommendations();
  // Mutation ini sudah meng-invalidate seluruh cache ["ai"], jadi Overview dan
  // Actions langsung ikut terbarui tanpa reload manual.
  const { approve: approveMutation, reject: rejectMutation } = useRecommendationDecision();

  function approve(id: string) {
    setPendingId(id);
    approveMutation.mutate(id, {
      onSuccess: (rec) =>
        toast.success("Recommendation approved", { description: `${rec.title} moved to Actions.` }),
      onError: (e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Gagal menyetujui recommendation."),
      onSettled: () => setPendingId(null),
    });
  }

  function reject(id: string) {
    setPendingId(id);
    rejectMutation.mutate(id, {
      onSuccess: (rec) => toast("Recommendation rejected", { description: rec.title }),
      onError: (e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Gagal menolak recommendation."),
      onSettled: () => setPendingId(null),
    });
  }

  const visible = (items ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <>
      <PageHeader
        eyebrow="AI Center"
        title="Recommendations"
        description="Actionable proposals from every agent. Approving one moves it to Actions for execution."
      />

      <div className="mb-5 flex flex-wrap gap-2">
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-sm border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors",
              filter === f
                ? "border-ai/40 bg-ai/12 text-ai"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isError ? (
        <QueryError message="Recommendations tidak bisa dimuat dari server." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-56 rounded-lg" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-muted-foreground">Nothing here for this filter.</Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              variant="full"
              onApprove={approve}
              onReject={reject}
              pending={pendingId === rec.id}
            />
          ))}
        </div>
      )}
    </>
  );
}
