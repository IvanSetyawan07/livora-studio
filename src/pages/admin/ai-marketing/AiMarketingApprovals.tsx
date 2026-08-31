import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  ConfidenceBar,
  Panel,
  Pill,
  StatusDot,
} from "@/components/ai/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionDecision, useAiActions, useRecommendations } from "@/hooks/useAiDashboard";
import type { AIApproval, AIApprovalStatus, AIRisk } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const statusTone: Record<AIApprovalStatus, "warning" | "success" | "danger" | "brass" | "neutral"> = {
  pending: "warning",
  approved: "brass",
  rejected: "danger",
  executed: "success",
  failed: "danger",
};

const riskTone: Record<AIRisk, "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

const filters: (AIApprovalStatus | "all")[] = ["all", "pending", "approved", "rejected", "executed"];

export default function ApprovalsPage() {
  const [filter, setFilter] = useState<AIApprovalStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useAiActions();
  const { data: allRecs } = useRecommendations();
  const { approveAndExecute, reject } = useActionDecision();

  const approvals = data ?? [];
  const selected: AIApproval | null = approvals.find((a) => a.id === selectedId) ?? null;

  const visible = useMemo(
    () => approvals.filter((a) => filter === "all" || a.status === filter),
    [approvals, filter],
  );

  const pendingCount = approvals.filter((a) => a.status === "pending").length;
  const busy = approveAndExecute.isPending || reject.isPending;

  async function onApprove(a: AIApproval) {
    try {
      await approveAndExecute.mutateAsync(a.id);
      toast.success("Approval dieksekusi", { description: a.title });
      setSelectedId(null);
    } catch {
      toast.error("Gagal mengeksekusi approval");
    }
  }

  async function onReject(a: AIApproval) {
    try {
      await reject.mutateAsync(a.id);
      toast("Approval ditolak", { description: a.title });
      setSelectedId(null);
    } catch {
      toast.error("Gagal menolak approval");
    }
  }

  const selectedRec = selected
    ? (allRecs ?? []).find((r) => r.id === selected.recommendationId)
    : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Approvals"
        description="Every AI recommendation is a proposal, never an action. Nothing executes against the live site or campaigns without an explicit approval recorded here."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="label-eyebrow">Pending review</p>
          <p className="text-display mt-2 text-2xl">{isLoading ? "—" : pendingCount}</p>
        </Panel>
        <Panel className="p-5">
          <p className="label-eyebrow">Total recommendations</p>
          <p className="text-display mt-2 text-2xl">{isLoading ? "—" : approvals.length}</p>
        </Panel>
        <Panel className="p-5">
          <p className="label-eyebrow">Approval execution</p>
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <StatusDot tone={error ? "danger" : "success"} /> {error ? "Backend unreachable" : "Live — Laravel"}
          </p>
        </Panel>
      </div>

      <div className="scroll-rail mb-6 flex gap-2 pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-sm border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-200",
              filter === f
                ? "border-brass/50 bg-brass/10 text-brass"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="scroll-rail">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Recommendation", "Agent", "Risk", "Status", "Requested"].map((h) => (
                  <th key={h} className="label-eyebrow px-5 py-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="cursor-pointer border-b border-border transition-colors duration-200 last:border-0 hover:bg-accent/40"
                >
                  <td className="px-5 py-4">{a.title}</td>
                  <td className="px-5 py-4 text-muted-foreground capitalize">{a.agent}</td>
                  <td className="px-5 py-4">
                    <Pill tone={riskTone[a.risk]}>{a.risk}</Pill>
                  </td>
                  <td className="px-5 py-4">
                    <Pill tone={statusTone[a.status]}>
                      <StatusDot tone={statusTone[a.status]} pulse={a.status === "pending"} />
                      {a.status}
                    </Pill>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {new Date(a.requestedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Memuat approvals…</p>
        ) : error ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Approvals tidak bisa dimuat dari server.
          </p>
        ) : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Belum ada approval{filter === "all" ? "" : " di kategori ini"}.
          </p>
        ) : null}
      </Panel>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="border-border-strong bg-popover sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-display text-xl font-light">{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.agent} agent · requested{" "}
                  {new Date(selected.requestedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-foreground/85">{selected.summary}</p>

                {selectedRec ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={riskTone[selectedRec.risk]}>{selectedRec.risk} risk</Pill>
                      <span className="label-eyebrow">{selectedRec.actionType}</span>
                    </div>
                    <ConfidenceBar value={selectedRec.confidence} />
                    <div>
                      <p className="label-eyebrow">Expected impact</p>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedRec.expectedImpact}</p>
                    </div>
                  </>
                ) : null}

                {selected.decidedBy ? (
                  <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    Decided by {selected.decidedBy}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={() => onApprove(selected)}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-brass px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {approveAndExecute.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Approve &amp; execute
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => onReject(selected)}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-50"
                    >
                      {reject.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
