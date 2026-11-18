import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Eye, Loader2, RotateCcw, Search, ShieldAlert, X } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { AgentFilter, toggleAgent } from "@/components/ai/agent-filter";
import { Panel, Pill, RiskPill, StatusDot } from "@/components/ai/primitives";
import { QueryError } from "@/components/ai/query-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageContext } from "@/context/AiMarketingContext";
import {
  extractApiErrorMessage,
  useActionDecision,
  useAiActions,
  useAiAgents,
  useRecommendations,
} from "@/hooks/useAiDashboard";
import type { AIAgentId, AIApproval, AIRisk } from "@/lib/ai/types";

type TabKey = "needs_review" | "scheduled" | "running" | "completed" | "failed" | "rejected";

const tabs: { key: TabKey; label: string }[] = [
  { key: "needs_review", label: "Needs Review" },
  { key: "scheduled", label: "Scheduled" },
  { key: "running", label: "Running" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
  { key: "rejected", label: "Rejected" },
];

export default function AiMarketingActions() {
  usePageContext("actions");
  const qc = useQueryClient();
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<Set<AIAgentId>>(new Set());
  const [riskFilter, setRiskFilter] = useState<"all" | AIRisk>("all");
  const [search, setSearch] = useState("");
  const [detailAction, setDetailAction] = useState<AIApproval | null>(null);
  const [confirmHighRisk, setConfirmHighRisk] = useState<AIApproval | null>(null);

  const { data: items, isLoading, error, refetch } = useAiActions();
  const { data: agents } = useAiAgents();
  const { data: recommendations } = useRecommendations();
  const { approveAndExecute, reject } = useActionDecision();

  function agentName(key: string) {
    return agents?.find((a) => a.id === key)?.name ?? key;
  }

  async function executeAction(a: AIApproval) {
    setBusyId(a.id);
    setRunningIds((prev) => new Set(prev).add(a.id));
    try {
      const res = (await approveAndExecute.mutateAsync(a.id)) as unknown as
        | { changed_platform?: boolean; summary?: string }
        | undefined;
      if (res?.changed_platform === false) {
        toast.message("Checklist dibuat — belum ada perubahan di platform", {
          description: "Tipe aksi ini dikerjakan manual. Lihat checklist di Activity.",
        });
      } else {
        toast.success("Aksi dijalankan di platform", {
          description: res?.summary?.split("\n")[0] ?? `${a.title} diterapkan.`,
        });
      }
      setDetailAction(null);
      setConfirmHighRisk(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menjalankan aksi."));
      qc.invalidateQueries({ queryKey: ["ai"] });
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(a.id);
        return next;
      });
      setBusyId(null);
    }
  }

  function handleApproveExecute(a: AIApproval) {
    if (a.risk === "high" && !confirmHighRisk) {
      setConfirmHighRisk(a);
      return;
    }
    void executeAction(a);
  }

  async function handleReject(a: AIApproval) {
    setBusyId(a.id);
    try {
      await reject.mutateAsync(a.id);
      toast("Action rejected", { description: `${a.title} tidak akan dieksekusi.` });
      setDetailAction(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menolak action."));
    } finally {
      setBusyId(null);
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter((a) => {
      if (selectedAgents.size > 0 && !selectedAgents.has(a.agent)) return false;
      if (riskFilter !== "all" && a.risk !== riskFilter) return false;
      if (q && !`${a.title} ${a.summary}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, selectedAgents, riskFilter, search]);

  const agentCounts = useMemo(() => {
    const counts: Partial<Record<AIAgentId, number>> = {};
    for (const a of items ?? []) counts[a.agent] = (counts[a.agent] ?? 0) + 1;
    return counts;
  }, [items]);

  function itemsFor(tab: TabKey): AIApproval[] {
    if (tab === "needs_review") return filteredItems.filter((a) => a.status === "pending");
    if (tab === "scheduled") return filteredItems.filter((a) => a.status === "approved" && !runningIds.has(a.id));
    if (tab === "running") return filteredItems.filter((a) => runningIds.has(a.id));
    if (tab === "completed") return filteredItems.filter((a) => a.status === "executed");
    if (tab === "failed") return filteredItems.filter((a) => a.status === "failed");
    return filteredItems.filter((a) => a.status === "rejected");
  }

  const detailRec = detailAction
    ? recommendations?.find((r) => r.id === detailAction.recommendationId)
    : undefined;

  return (
    <>
      <PageHeader
        eyebrow="AI Center"
        title="Actions"
        description="Every AI-recommended action, from first review to execution, in one place."
      />

      {error ? (
        <div className="mb-6">
          <QueryError message="Actions tidak bisa dimuat dari server." onRetry={() => void refetch()} />
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <AgentFilter
          selected={selectedAgents}
          onToggle={(id) => setSelectedAgents((prev) => toggleAgent(prev, id))}
          onClear={() => setSelectedAgents(new Set())}
          counts={agentCounts}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari action..."
              className="h-8 w-44 rounded-sm border border-border bg-secondary/60 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
            />
          </div>
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

      <Tabs defaultValue="needs_review">
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          {tabs.map((t) => {
            const count = itemsFor(t.key).length;
            return (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="rounded-sm border border-border data-[state=active]:border-ai/40 data-[state=active]:bg-ai/12 data-[state=active]:text-ai"
              >
                {t.label}
                {count > 0 ? <span className="ml-1.5 num text-[10px] text-muted-foreground">{count}</span> : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-5 space-y-3">
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="skeleton-shimmer h-40 rounded-lg" />
                ))}
              </div>
            ) : itemsFor(t.key).length === 0 ? (
              <Panel className="p-8 text-center text-sm text-muted-foreground">
                Tidak ada item di tab {t.label.toLowerCase()}
                {selectedAgents.size > 0 || search || riskFilter !== "all" ? " untuk filter yang dipilih." : "."}
              </Panel>
            ) : (
              itemsFor(t.key).map((a) => {
                const rec = recommendations?.find((r) => r.id === a.recommendationId);
                const running = runningIds.has(a.id);
                return (
                  <Panel key={a.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="label-eyebrow">{agentName(a.agent)}</span>
                          <RiskPill risk={a.risk} />
                          {running ? (
                            <Pill tone="info">
                              <Loader2 className="size-2.5 animate-spin" />
                              Running
                            </Pill>
                          ) : null}
                        </div>
                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.summary}</p>
                        {rec?.change ? (
                          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-foreground/80">{rec.change.from}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="rounded-sm bg-ai/12 px-1.5 py-0.5 text-ai">{rec.change.to}</span>
                          </div>
                        ) : null}
                        {rec?.expectedImpact ? (
                          <p className="text-xs text-success">Expected impact: {rec.expectedImpact}</p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailAction(a)}
                          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Eye className="size-3.5" /> Detail
                        </button>

                        {t.key === "needs_review" || t.key === "scheduled" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReject(a)}
                              disabled={busyId === a.id}
                              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                            >
                              <X className="size-3.5" />
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveExecute(a)}
                              disabled={busyId === a.id}
                              className="flex items-center gap-1.5 rounded-md bg-ai px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
                            >
                              {busyId === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                              {t.key === "scheduled" ? "Execute" : "Approve & Execute"}
                            </button>
                          </>
                        ) : t.key === "failed" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReject(a)}
                              disabled={busyId === a.id}
                              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                            >
                              <X className="size-3.5" /> Tolak
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveExecute(a)}
                              disabled={busyId === a.id}
                              className="flex items-center gap-1.5 rounded-md border border-ai/40 bg-ai/12 px-3 py-1.5 text-xs font-medium text-ai hover:bg-ai/20 disabled:opacity-50"
                            >
                              {busyId === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                              Retry Execute
                            </button>
                          </>
                        ) : t.key === "completed" ? (
                          <Pill tone="success">
                            <StatusDot tone="success" />
                            Executed
                          </Pill>
                        ) : t.key === "rejected" ? (
                          <Pill tone="danger">Rejected</Pill>
                        ) : null}
                      </div>
                    </div>
                  </Panel>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!detailAction} onOpenChange={(o) => !o && setDetailAction(null)}>
        <DialogContent className="border-border-strong bg-popover text-foreground sm:max-w-lg">
          {detailAction ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-display text-lg">{detailAction.title}</DialogTitle>
                <DialogDescription>
                  {agentName(detailAction.agent)} · Status: {detailAction.status} · Risk: {detailAction.risk}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="leading-relaxed text-foreground/90">{detailAction.summary}</p>
                {detailRec?.suggestedAction ? (
                  <div className="rounded-sm border border-border bg-secondary/40 p-3 text-xs text-foreground/85">
                    <p className="label-eyebrow mb-1">Instruksi Aksi</p>
                    {detailRec.suggestedAction}
                  </div>
                ) : null}
                {detailRec?.expectedImpact ? (
                  <p className="text-xs text-success">Dampak diharapkan: {detailRec.expectedImpact}</p>
                ) : null}
                {detailAction.decidedBy ? (
                  <p className="text-xs text-muted-foreground">
                    Diputuskan oleh {detailAction.decidedBy}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmHighRisk} onOpenChange={(o) => !o && setConfirmHighRisk(null)}>
        <DialogContent className="border-border-strong bg-popover text-foreground sm:max-w-md">
          {confirmHighRisk ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base text-warning">
                  <ShieldAlert className="size-4 shrink-0" />
                  Konfirmasi Aksi High Risk
                </DialogTitle>
                <DialogDescription>
                  Aksi "{confirmHighRisk.title}" ditandai berisiko tinggi dan akan langsung dijalankan ke sistem/platform terkait.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmHighRisk(null)}
                  className="rounded-sm border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={busyId === confirmHighRisk.id}
                  onClick={() => void executeAction(confirmHighRisk)}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
                >
                  {busyId === confirmHighRisk.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Ya, Jalankan Sekarang
                </button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}