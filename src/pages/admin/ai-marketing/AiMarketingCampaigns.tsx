// src/pages/admin/ai-marketing/AiMarketingCampaigns.tsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Loader2, Plus, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel, Pill, Sparkline } from "@/components/ai/primitives";
import { QueryError } from "@/components/ai/query-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePageContext } from "@/context/AiMarketingContext";
import {
  extractApiErrorMessage,
  useCampaigns,
  useCreateCampaign,
  useSyncCampaigns,
} from "@/hooks/useAiDashboard";
import type { CampaignHealth } from "@/lib/ai/types";

const healthTone: Record<CampaignHealth, "success" | "warning" | "danger"> = {
  Good: "success",
  Fair: "warning",
  "Needs Attention": "danger",
};

export default function AiMarketingCampaigns() {
  usePageContext("campaigns");
  const navigate = useNavigate();
  const { data: campaigns, isLoading, isError, refetch } = useCampaigns();
  const syncCampaigns = useSyncCampaigns();
  const createCampaign = useCreateCampaign();

  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | CampaignHealth>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    channel: "Meta Ads + Instagram",
    summary: "",
    budget_daily: "",
    status: "Active" as "Active" | "Paused" | "Draft",
  });

  const channels = useMemo(() => {
    const s = new Set<string>();
    for (const c of campaigns ?? []) s.add(c.channel);
    return [...s];
  }, [campaigns]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (campaigns ?? []).filter((c) => {
      if (healthFilter !== "all" && c.health !== healthFilter) return false;
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      if (q && !`${c.name} ${c.summary} ${c.channel}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [campaigns, healthFilter, channelFilter, search]);

  async function handleSync() {
    try {
      const res = await syncCampaigns.mutateAsync();
      toast.success(`Sinkronisasi selesai (${res.synced} campaign).`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyinkronkan campaign."));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const created = await createCampaign.mutateAsync({
        name: form.name.trim(),
        channel: form.channel.trim() || "Omnichannel",
        summary: form.summary.trim() || undefined,
        budget_daily: form.budget_daily.trim() || undefined,
        status: form.status,
      });
      toast.success("Campaign baru dibuat.");
      setCreateOpen(false);
      setForm({ name: "", channel: "Meta Ads + Instagram", summary: "", budget_daily: "", status: "Active" });
      if (created?.id) navigate(`/admin/ai-marketing/campaigns/${created.id}`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal membuat campaign baru."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Campaigns"
        description="Not just analytics — AI helps plan the fix, track progress, and manage active initiatives."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncCampaigns.isPending}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-2 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              <RefreshCcw className={`size-3.5 ${syncCampaigns.isPending ? "animate-spin" : ""}`} />
              {syncCampaigns.isPending ? "Syncing…" : "Sync"}
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-sm bg-ai px-3 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
            >
              <Plus className="size-3.5" /> Buat Campaign
            </button>
          </div>
        }
      />

      {campaigns && campaigns.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "Good", "Fair", "Needs Attention"] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHealthFilter(h)}
                className={`rounded-sm border px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors ${
                  healthFilter === h
                    ? "border-ai/40 bg-ai/12 text-ai"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {h === "all" ? "All Health" : h}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari campaign..."
                className="h-8 w-44 rounded-sm border border-border bg-secondary/60 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
              />
            </div>
            {channels.length > 1 ? (
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
              >
                <option value="all">Semua Channel</option>
                {channels.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-shimmer h-64 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <QueryError message="Campaigns tidak bisa dimuat dari server." onRetry={() => refetch()} />
      ) : visible.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-muted-foreground">
          {campaigns && campaigns.length > 0
            ? "Tidak ada campaign yang cocok dengan filter aktif."
            : "Belum ada AI campaign. Klik Buat Campaign atau jalankan agent AI."}
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {visible.map((c, i) => {
            const done = c.plan.filter((s) => s.state === "done").length;
            return (
              <Link
                key={c.id}
                to={`/admin/ai-marketing/campaigns/${c.id}`}
                className="animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both] block"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Panel hover className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="label-eyebrow">{c.channel}</p>
                        {c.status ? (
                          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground uppercase">
                            {c.status}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-display mt-1.5 text-base leading-snug">{c.name}</h3>
                    </div>
                    <Pill tone={healthTone[c.health]}>{c.health}</Pill>
                  </div>

                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.summary}</p>

                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="label-eyebrow">{c.metric.label}</span>
                      <span
                        className={
                          c.metric.deltaDirection === "up"
                            ? "text-[11px] text-success"
                            : c.metric.deltaDirection === "down"
                              ? "text-[11px] text-destructive"
                              : "text-[11px] text-muted-foreground"
                        }
                      >
                        {c.metric.deltaLabel}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <p className="num text-display text-2xl">{c.metric.value}</p>
                      {c.budgetDaily ? (
                        <span className="font-mono text-[11px] text-muted-foreground">{c.budgetDaily}</span>
                      ) : null}
                    </div>
                    {c.spark.length > 1 ? (
                      <Sparkline
                        points={c.spark}
                        tone={c.health === "Good" ? "success" : c.health === "Fair" ? "warning" : "danger"}
                        className="mt-2"
                      />
                    ) : null}
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="text-muted-foreground">
                      {done}/{c.plan.length} plan steps done
                    </span>
                    <span className="flex items-center gap-1 text-ai">
                      Open <ArrowUpRight className="size-3" />
                    </span>
                  </div>
                </Panel>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-border-strong bg-popover text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-display text-lg">Buat Campaign Marketing</DialogTitle>
            <DialogDescription>Inisiatif baru akan dipantau bersama rencana langkah eksekusi AI.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label-eyebrow mb-1 block">Nama Campaign *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Mis. Campaign Interior Apartemen Jakarta Selatan Q4"
                className="w-full rounded border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-eyebrow mb-1 block">Channel *</label>
                <input
                  required
                  value={form.channel}
                  onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                  placeholder="Meta Ads / Google / IG"
                  className="w-full rounded border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:border-ai focus:outline-none"
                />
              </div>
              <div>
                <label className="label-eyebrow mb-1 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "Active" | "Paused" | "Draft" }))}
                  className="w-full rounded border border-border bg-secondary px-2.5 py-2 text-sm text-foreground focus:border-ai focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Budget Harian (opsional)</label>
              <input
                value={form.budget_daily}
                onChange={(e) => setForm((f) => ({ ...f, budget_daily: e.target.value }))}
                placeholder="Rp 150.000/hari"
                className="w-full rounded border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div>
              <label className="label-eyebrow mb-1 block">Ringkasan Target</label>
              <textarea
                rows={3}
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Fokus target audiens, produk utama, dan CTA..."
                className="w-full rounded border border-border bg-secondary/60 p-3 text-sm text-foreground focus:border-ai focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={createCampaign.isPending || !form.name.trim()}
                className="inline-flex items-center gap-1.5 rounded bg-ai px-3.5 py-1.5 text-xs font-semibold text-background disabled:opacity-50"
              >
                {createCampaign.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Buat Campaign
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}