import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  ConfidenceBar,
  Panel,
  Pill,
  StatusDot,
} from "@/components/ai/primitives";
import { QueryError } from "@/components/ai/query-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePageContext } from "@/context/AiMarketingContext";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import { useAdminDialog } from "@/components/admin/kit";
import { extractApiErrorMessage, useActionDecision, useAiActions, useRecommendations } from "@/hooks/useAiDashboard";
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

const filters: (AIApprovalStatus | "all")[] = ["all", "pending", "approved", "executed", "failed", "rejected"];

export default function ApprovalsPage() {
  usePageContext("approvals");
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("marketing");
  const [filter, setFilter] = useState<AIApprovalStatus | "all">("all");
  const [riskFilter, setRiskFilter] = useState<"all" | AIRisk>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highRiskAck, setHighRiskAck] = useState(false);

  const { data, isLoading, error, refetch } = useAiActions();
  const { data: allRecs } = useRecommendations();
  const { approveAndExecute, reject } = useActionDecision();

  const approvals = data ?? [];
  const selected: AIApproval | null = approvals.find((a) => a.id === selectedId) ?? null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return approvals.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (riskFilter !== "all" && a.risk !== riskFilter) return false;
      if (q && !`${a.title} ${a.summary} ${a.agent}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [approvals, filter, riskFilter, search]);

  const pendingCount = approvals.filter((a) => a.status === "pending").length;
  const busy = approveAndExecute.isPending || reject.isPending;

  async function onApprove(a: AIApproval) {
    if (!editable) {
      toast.error("Anda berada dalam mode lihat saja.");
      return;
    }
    const ok = await dialog.confirm({
      title: `Jalankan Aksi "${a.title}"?`,
      description:
        a.risk === "high"
          ? "Aksi ini berisiko tinggi dan akan langsung diterapkan ke sistem/platform terkait. Pastikan Anda sudah memeriksa detailnya."
          : "Aksi akan disetujui dan langsung dijalankan oleh mesin AI Marketing.",
      confirmText: "Ya, Setujui & Jalankan",
      cancelText: "Batal",
      tone: a.risk === "high" ? "danger" : "default",
    });
    if (!ok) return;
    try {
      await approveAndExecute.mutateAsync(a.id);
      toast.success("Persetujuan dieksekusi", { description: a.title });
      setSelectedId(null);
      setHighRiskAck(false);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Gagal mengeksekusi persetujuan"));
    }
  }

  async function onReject(a: AIApproval) {
    if (!editable) {
      toast.error("Anda berada dalam mode lihat saja.");
      return;
    }
    const ok = await dialog.confirm({
      title: `Tolak Usulan "${a.title}"?`,
      description: "Usulan ini akan ditandai ditolak dan tidak akan dieksekusi.",
      confirmText: "Ya, Tolak",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await reject.mutateAsync(a.id);
      toast("Persetujuan ditolak", { description: a.title });
      setSelectedId(null);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menolak persetujuan"));
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
          <p className="label-eyebrow">Total actions</p>
          <p className="text-display mt-2 text-2xl">{isLoading ? "—" : approvals.length}</p>
        </Panel>
        <Panel className="p-5">
          <p className="label-eyebrow">Approval execution</p>
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <StatusDot tone={error ? "danger" : "success"} /> {error ? "Backend unreachable" : "Live — Laravel"}
          </p>
        </Panel>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="scroll-rail flex gap-2 pb-1">
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari approval..."
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

      {error ? (
        <QueryError message="Approvals tidak bisa dimuat dari server." onRetry={() => void refetch()} />
      ) : (
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
                      {new Date(a.requestedAt).toLocaleDateString("id-ID", {
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
          ) : visible.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Belum ada approval{filter === "all" && !search && riskFilter === "all" ? "" : " di filter ini"}.
            </p>
          ) : null}
        </Panel>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedId(null);
            setHighRiskAck(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border-strong bg-popover text-foreground sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-display text-xl font-light">{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.agent} agent · requested{" "}
                  {new Date(selected.requestedAt).toLocaleDateString("id-ID", {
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
                ) : null}

                {selected.status === "pending" || selected.status === "approved" || selected.status === "failed" ? (
                  <div className="space-y-3">
                    {selected.risk === "high" ? (
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                        <input
                          type="checkbox"
                          checked={highRiskAck}
                          onChange={(e) => setHighRiskAck(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>Saya memahami aksi berisiko tinggi ini akan langsung dijalankan.</span>
                      </label>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={busy || !editable || (selected.risk === "high" && !highRiskAck)}
                        onClick={() => onApprove(selected)}
                        className="inline-flex items-center gap-1.5 rounded-sm bg-brass px-3.5 py-2 text-xs font-medium text-background disabled:opacity-40"
                      >
                        {approveAndExecute.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        {selected.status === "failed"
                          ? "Coba Jalankan Ulang"
                          : selected.status === "approved"
                            ? "Jalankan Sekarang"
                            : "Setujui & Jalankan"}
                      </button>
                      <button
                        disabled={busy || !editable}
                        onClick={() => onReject(selected)}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3.5 py-2 text-xs text-muted-foreground disabled:opacity-40"
                      >
                        {reject.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        Tolak
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
