import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { AgentFilter, toggleAgent } from "@/components/ai/agent-filter";
import { Panel, Pill } from "@/components/ai/primitives";
import { QueryError } from "@/components/ai/query-error";
import { usePageContext } from "@/context/AiMarketingContext";
import { extractApiErrorMessage, useAiAgents, useImpact, useRefreshImpact } from "@/hooks/useAiDashboard";
import type { AIAgentId, ImpactPeriod, ImpactResult } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const periods: ImpactPeriod[] = [7, 14, 30];

const resultTone: Record<ImpactResult, "success" | "danger" | "neutral" | "warning"> = {
  positive: "success",
  negative: "danger",
  neutral: "neutral",
  monitoring: "warning",
};

const resultLabel: Record<ImpactResult, string> = {
  positive: "Positif",
  negative: "Menurun",
  neutral: "Stabil",
  monitoring: "Sedang Dipantau",
};

export default function AiMarketingImpact() {
  usePageContext("impact");
  const [period, setPeriod] = useState<ImpactPeriod>(14);
  const [resultFilter, setResultFilter] = useState<"all" | ImpactResult>("all");
  const [selectedAgents, setSelectedAgents] = useState<Set<AIAgentId>>(new Set());
  const [search, setSearch] = useState("");
  const { data: agents } = useAiAgents();
  const { data: records, isLoading, isError, refetch } = useImpact();
  const refreshImpact = useRefreshImpact();

  function agentName(key: string) {
    return agents?.find((a) => a.id === key)?.name ?? key;
  }

  async function handleRefreshImpact() {
    try {
      const res = await refreshImpact.mutateAsync();
      toast.success(`Metrik dampak diperbarui (${res.updated} record).`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memperbarui metrik impact."));
    }
  }

  const counts = useMemo(() => {
    const list = records ?? [];
    const byResult = { total: list.length, positive: 0, monitoring: 0, negative: 0 };
    const byAgent: Partial<Record<AIAgentId, number>> = {};
    for (const r of list) {
      const effective: ImpactResult = r.after[period] ? r.result : "monitoring";
      if (effective === "positive") byResult.positive++;
      else if (effective === "negative") byResult.negative++;
      else if (effective === "monitoring") byResult.monitoring++;
      byAgent[r.agent] = (byAgent[r.agent] ?? 0) + 1;
    }
    return { byResult, byAgent };
  }, [records, period]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (records ?? []).filter((r) => {
      const effective: ImpactResult = r.after[period] ? r.result : "monitoring";
      if (resultFilter !== "all" && effective !== resultFilter) return false;
      if (selectedAgents.size > 0 && !selectedAgents.has(r.agent)) return false;
      if (q && !`${r.title} ${r.metricLabel} ${r.aiConclusion}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [records, period, resultFilter, selectedAgents, search]);

  return (
    <>
      <PageHeader
        eyebrow="Evaluasi Hasil"
        title="Evaluasi Dampak"
        description="Ukur perbandingan performa nyata sebelum & sesudah setiap rekomendasi AI disetujui dan dijalankan."
        action={
          <button
            type="button"
            onClick={handleRefreshImpact}
            disabled={refreshImpact.isPending}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-2 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            <RefreshCcw className={cn("size-3.5", refreshImpact.isPending && "animate-spin")} />
            {refreshImpact.isPending ? "Memperbarui…" : "Perbarui Metrik"}
          </button>
        }
      />

      {!isLoading && !isError && (records?.length ?? 0) > 0 ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Total Dievaluasi", value: counts.byResult.total },
            { label: "Dampak Positif", value: counts.byResult.positive },
            { label: "Sedang Dipantau", value: counts.byResult.monitoring },
            { label: "Dampak Negatif", value: counts.byResult.negative },
          ].map((stat) => (
            <Panel key={stat.label} className="p-4">
              <p className="label-eyebrow">{stat.label}</p>
              <p className="text-display num mt-1.5 text-2xl">{stat.value}</p>
            </Panel>
          ))}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-eyebrow mr-1">Jendela Evaluasi</span>
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-sm border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors",
                period === p ? "border-ai/40 bg-ai/12 text-ai" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p} hari
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari evaluasi dampak..."
              className="h-8 w-44 rounded-sm border border-border bg-secondary/60 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
            />
          </div>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as "all" | ImpactResult)}
            className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
          >
            <option value="all">Semua Hasil</option>
            <option value="positive">Positif</option>
            <option value="monitoring">Sedang Dipantau</option>
            <option value="neutral">Stabil</option>
            <option value="negative">Menurun</option>
          </select>
        </div>
      </div>

      <AgentFilter
        className="mb-6"
        selected={selectedAgents}
        onToggle={(id) => setSelectedAgents((prev) => toggleAgent(prev, id))}
        onClear={() => setSelectedAgents(new Set())}
        counts={counts.byAgent}
      />

      {isError ? (
        <QueryError message="Data impact tidak bisa dimuat dari server." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton-shimmer h-40 rounded-lg" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-muted-foreground">
          {records && records.length > 0
            ? "Tidak ada data dampak yang cocok dengan filter aktif."
            : "Belum ada rekomendasi yang dijalankan untuk diukur — setujui tindakan terlebih dahulu di halaman Tindakan untuk mulai memantau dampaknya."}
        </Panel>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const after = r.after[period];
            const changePct = r.changePct[period];
            const effectiveResult: ImpactResult = after ? r.result : "monitoring";
            const approvedDaysAgo = Math.max(
              0,
              Math.floor((Date.now() - new Date(r.approvedAt).getTime()) / 86_400_000),
            );

            return (
              <Panel key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="label-eyebrow">{agentName(r.agent)}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        · {approvedDaysAgo} hari sejak eksekusi
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.metricLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/admin/ai-marketing/ai-center/recommendations"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ai"
                    >
                      Rekomendasi <ArrowUpRight className="size-3" />
                    </Link>
                    <Pill tone={resultTone[effectiveResult]}>{resultLabel[effectiveResult]}</Pill>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
                  <div>
                    <p className="label-eyebrow">Sebelum</p>
                    <p className="num mt-1 text-sm text-foreground/80">{r.before}</p>
                  </div>
                  <div>
                    <p className="label-eyebrow">Sesudah {period} hari</p>
                    <p className={cn("num mt-1 text-sm", after ? "text-foreground" : "text-muted-foreground italic")}>
                      {after ?? (approvedDaysAgo < period ? `Menunggu periode ${period} hari (${period - approvedDaysAgo} hari lagi)` : "Belum dihitung — klik Perbarui Metrik")}
                    </p>
                  </div>
                  {typeof changePct === "number" ? (
                    <div>
                      <p className="label-eyebrow">Perubahan</p>
                      <p className={cn("num mt-1 text-sm font-semibold", changePct >= 0 ? "text-success" : "text-destructive")}>
                        {changePct >= 0 ? "+" : ""}
                        {changePct}%
                      </p>
                    </div>
                  ) : null}
                </div>

                <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-foreground/70">
                  <span className="text-ai">Kesimpulan AI — </span>
                  {after ? r.aiConclusion : "Belum cukup waktu atau sampel untuk menyimpulkan dampak secara akurat."}
                </p>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}