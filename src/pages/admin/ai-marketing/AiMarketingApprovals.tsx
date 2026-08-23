import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  ConfidenceBar,
  DemoBadge,
  NotConnected,
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
import { approvals as allApprovals, recommendationById } from "@/lib/ai/data";
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
  const [selected, setSelected] = useState<AIApproval | null>(null);

  const visible = useMemo(
    () => allApprovals.filter((a) => filter === "all" || a.status === filter),
    [filter],
  );

  const pendingCount = allApprovals.filter((a) => a.status === "pending").length;

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Approvals"
        description="Every AI recommendation is a proposal, never an action. Nothing executes against the live site or campaigns without an explicit approval recorded here."
        action={<DemoBadge />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="label-eyebrow">Pending review</p>
          <p className="text-display mt-2 text-2xl">{pendingCount}</p>
        </Panel>
        <Panel className="p-5">
          <p className="label-eyebrow">Total recommendations</p>
          <p className="text-display mt-2 text-2xl">{allApprovals.length}</p>
        </Panel>
        <Panel className="p-5">
          <p className="label-eyebrow">Approval execution</p>
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <StatusDot tone="neutral" /> Not wired to Laravel yet
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
                  onClick={() => setSelected(a)}
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
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No approvals in this category.
          </p>
        ) : null}
      </Panel>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="border-border-strong bg-popover sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-display text-xl font-light">
                  {selected.title}
                </DialogTitle>
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

                {(() => {
                  const rec = recommendationById(selected.recommendationId);
                  return rec ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={riskTone[rec.risk]}>{rec.risk} risk</Pill>
                        <span className="label-eyebrow">{rec.actionType}</span>
                      </div>
                      <ConfidenceBar value={rec.confidence} />
                      <div>
                        <p className="label-eyebrow">Expected impact</p>
                        <p className="mt-1 text-sm text-muted-foreground">{rec.expectedImpact}</p>
                      </div>
                    </>
                  ) : null;
                })()}

                {selected.decidedBy ? (
                  <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    Decided by {selected.decidedBy}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled
                      className="cursor-not-allowed rounded-sm bg-brass/40 px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    >
                      Approve
                    </button>
                    <button
                      disabled
                      className="cursor-not-allowed rounded-sm border border-border-strong px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      Reject
                    </button>
                  </div>
                )}

                <NotConnected
                  state="coming_soon"
                  title="Approval actions are not wired to the backend"
                  description="Approving or rejecting here will call the Laravel orchestration endpoint once it exists. Nothing executes from this preview."
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
