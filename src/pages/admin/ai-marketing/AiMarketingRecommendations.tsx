import { useMemo, useState } from "react";
import { CheckCheck, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { AgentFilter, toggleAgent } from "@/components/ai/agent-filter";
import { Panel } from "@/components/ai/primitives";
import { RecommendationCard } from "@/components/ai/recommendation-card";
import { QueryError } from "@/components/ai/query-error";
import { usePageContext } from "@/context/AiMarketingContext";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import { useAdminDialog } from "@/components/admin/kit";
import {
  extractApiErrorMessage,
  useRecommendationDecision,
  useRecommendations,
} from "@/hooks/useAiDashboard";
import type { AIAgentId, AIApprovalStatus, AIRisk } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const filters: (AIApprovalStatus | "all")[] = ["all", "pending", "approved", "executed", "rejected", "failed"];

export default function AiMarketingRecommendations() {
  usePageContext("recommendations");
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("marketing");
  const [filter, setFilter] = useState<AIApprovalStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [riskFilter, setRiskFilter] = useState<"all" | AIRisk>("all");
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<Set<AIAgentId>>(new Set());
  const { data: items, isLoading, isError, refetch } = useRecommendations();
  const { approve: approveMutation, reject: rejectMutation } = useRecommendationDecision();

  async function approve(id: string) {
    if (!editable) {
      toast.error("Anda berada dalam mode lihat saja.");
      return;
    }
    const target = items?.find((r) => r.id === id);
    if (target?.risk === "high") {
      const ok = await dialog.confirm({
        title: `Setujui Rekomendasi Berisiko Tinggi?`,
        description: `"${target.title}" akan masuk ke Antrean Aksi. Eksekusi akhir tetap memerlukan konfirmasi lagi di halaman Aksi.`,
        confirmText: "Ya, Setujui",
        cancelText: "Batal",
        tone: "danger",
      });
      if (!ok) return;
    }
    setPendingId(id);
    approveMutation.mutate(id, {
      onSuccess: (rec) =>
        toast.success("Rekomendasi disetujui", { description: `${rec.title} dipindahkan ke Antrean Aksi.` }),
      onError: (e: unknown) =>
        toast.error(extractApiErrorMessage(e, "Gagal menyetujui rekomendasi.")),
      onSettled: () => setPendingId(null),
    });
  }

  function reject(id: string) {
    if (!editable) {
      toast.error("Anda berada dalam mode lihat saja.");
      return;
    }
    setPendingId(id);
    rejectMutation.mutate(id, {
      onSuccess: (rec) => toast("Rekomendasi ditolak", { description: rec.title }),
      onError: (e: unknown) =>
        toast.error(extractApiErrorMessage(e, "Gagal menolak rekomendasi.")),
      onSettled: () => setPendingId(null),
    });
  }

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { all: items?.length ?? 0 };
    for (const r of items ?? []) {
      map[r.status] = (map[r.status] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const statusFiltered = useMemo(
    () => (items ?? []).filter((r) => filter === "all" || r.status === filter),
    [items, filter],
  );
  const agentCounts = useMemo(() => {
    const counts: Partial<Record<AIAgentId, number>> = {};
    for (const r of statusFiltered) counts[r.agent] = (counts[r.agent] ?? 0) + 1;
    return counts;
  }, [statusFiltered]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return statusFiltered.filter((r) => {
      if (selectedAgents.size > 0 && !selectedAgents.has(r.agent)) return false;
      if (priorityFilter !== "all" && (r.priority ?? "medium") !== priorityFilter) return false;
      if (riskFilter !== "all" && r.risk !== riskFilter) return false;
      if (q && !`${r.title} ${r.description} ${r.why ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [statusFiltered, selectedAgents, priorityFilter, riskFilter, search]);

  const lowRiskPending = visible.filter((r) => r.status === "pending" && r.risk === "low");

  async function handleBulkApproveLowRisk() {
    if (!editable || lowRiskPending.length === 0 || bulkApproving) return;
    const ok = await dialog.confirm({
      title: `Setujui ${lowRiskPending.length} Rekomendasi Berisiko Rendah?`,
      description:
        "Seluruh rekomendasi berisiko rendah pada filter aktif akan disetujui dan masuk ke Antrean Aksi (belum dieksekusi ke platform sampai Anda menjalankannya).",
      confirmText: `Ya, Setujui (${lowRiskPending.length})`,
      cancelText: "Batal",
    });
    if (!ok) return;
    setBulkApproving(true);
    let okCount = 0;
    for (const r of lowRiskPending) {
      try {
        await approveMutation.mutateAsync(r.id);
        okCount++;
      } catch {
        // continue remaining
      }
    }
    setBulkApproving(false);
    toast.success(`${okCount}/${lowRiskPending.length} rekomendasi risiko rendah disetujui & dikirim ke Antrean Aksi.`);
  }

  return (
    <>
      <PageHeader
        eyebrow="AI Center"
        title="Recommendations"
        description="Actionable proposals from every agent. Approving one moves it to Actions for execution."
        action={
          lowRiskPending.length > 0 ? (
            <button
              type="button"
              onClick={handleBulkApproveLowRisk}
              disabled={bulkApproving}
              className="inline-flex items-center gap-1.5 rounded-sm border border-ai/40 bg-ai/12 px-3 py-1.5 text-xs font-medium text-ai transition-colors hover:bg-ai/20 disabled:opacity-50"
            >
              {bulkApproving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
              Approve Low-Risk ({lowRiskPending.length})
            </button>
          ) : undefined
        }
      />

      <AgentFilter
        className="mb-4"
        selected={selectedAgents}
        onToggle={(id) => setSelectedAgents((prev) => toggleAgent(prev, id))}
        onClear={() => setSelectedAgents(new Set())}
        counts={agentCounts}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const count = statusCounts[f] ?? 0;
            return (
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
                {count > 0 ? <span className="ml-1.5 opacity-70">{count}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari rekomendasi..."
              className="h-8 w-44 rounded-sm border border-border bg-secondary/60 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as "all" | "high" | "medium" | "low")}
            className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
          >
            <option value="all">Semua Priority</option>
            <option value="high">High Impact</option>
            <option value="medium">Medium Impact</option>
            <option value="low">Low Impact</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as "all" | AIRisk)}
            className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
          >
            <option value="all">Semua Risk</option>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>
        </div>
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
        <Panel className="p-10 text-center text-sm text-muted-foreground">
          Tidak ada rekomendasi yang cocok dengan filter aktif.
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              variant="full"
              onApprove={approve}
              onReject={reject}
              pending={pendingId === rec.id || bulkApproving}
            />
          ))}
        </div>
      )}
    </>
  );
}