import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoBadge, Panel, Pill, RiskPill, StatusDot } from "@/components/ai/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageContext } from "@/context/AiMarketingContext";
import { aiServices } from "@/lib/ai/services";
import { agentById, recommendations } from "@/lib/ai/data";
import type { AIApproval } from "@/lib/ai/types";

type TabKey = "needs_review" | "scheduled" | "running" | "completed" | "failed";

const tabs: { key: TabKey; label: string }[] = [
  { key: "needs_review", label: "Needs Review" },
  { key: "scheduled", label: "Scheduled" },
  { key: "running", label: "Running" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

export default function AiMarketingActions() {
  usePageContext("actions");
  const [items, setItems] = useState<AIApproval[] | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const data = await aiServices.actions.list();
    setItems(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleApproveExecute(a: AIApproval) {
    setBusyId(a.id);
    setRunningIds((prev) => new Set(prev).add(a.id));
    try {
      await aiServices.actions.approveAndExecute(a.id);
      toast.success("Action executed successfully", { description: `${a.title} updated.` });
      await refresh();
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(a.id);
        return next;
      });
      setBusyId(null);
    }
  }

  async function handleReject(a: AIApproval) {
    setBusyId(a.id);
    try {
      await aiServices.actions.reject(a.id);
      toast("Action rejected", { description: `${a.title} will not be executed.` });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  function itemsFor(tab: TabKey): AIApproval[] {
    if (!items) return [];
    if (tab === "needs_review") return items.filter((a) => a.status === "pending");
    if (tab === "scheduled") return items.filter((a) => a.status === "approved" && !runningIds.has(a.id));
    if (tab === "running") return items.filter((a) => runningIds.has(a.id));
    if (tab === "completed") return items.filter((a) => a.status === "executed");
    return items.filter((a) => a.status === "failed");
  }

  return (
    <>
      <PageHeader
        eyebrow="AI Center"
        title="Actions"
        description="Every AI-recommended action, from first review to execution, in one place."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
        <DemoBadge />
        Approve & Execute mutates in-memory demo state for this session only. Nothing here reaches a real ad
        platform, CMS, or inbox until the Laravel API is connected.
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
            {!items ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="skeleton-shimmer h-40 rounded-lg" />
                ))}
              </div>
            ) : itemsFor(t.key).length === 0 ? (
              <Panel className="p-8 text-center text-sm text-muted-foreground">Nothing in {t.label.toLowerCase()} right now.</Panel>
            ) : (
              itemsFor(t.key).map((a) => {
                const agent = agentById(a.agent);
                const rec = recommendations.find((r) => r.id === a.recommendationId);
                const running = runningIds.has(a.id);
                return (
                  <Panel key={a.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="label-eyebrow">{agent?.name ?? a.agent}</span>
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
                          <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-foreground/80">{rec.change.from}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="rounded-sm bg-ai/12 px-1.5 py-0.5 text-ai">{rec.change.to}</span>
                          </div>
                        ) : null}
                        {rec?.expectedImpact ? (
                          <p className="text-xs text-success">Expected impact: {rec.expectedImpact}</p>
                        ) : null}
                      </div>

                      {t.key === "needs_review" ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => handleReject(a)}
                            disabled={busyId === a.id}
                            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                          >
                            <X className="size-3.5" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveExecute(a)}
                            disabled={busyId === a.id}
                            className="flex items-center gap-1.5 rounded-md bg-ai px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
                          >
                            {busyId === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                            Approve & Execute
                          </button>
                        </div>
                      ) : t.key === "completed" ? (
                        <Pill tone="success">
                          <StatusDot tone="success" />
                          Executed
                        </Pill>
                      ) : t.key === "failed" ? (
                        <Pill tone="danger">Failed</Pill>
                      ) : null}
                    </div>
                  </Panel>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
