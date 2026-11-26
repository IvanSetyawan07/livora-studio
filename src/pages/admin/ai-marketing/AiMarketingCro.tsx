// src/pages/admin/ai-marketing/AiMarketingCro.tsx
import { AgentPageShell } from "@/components/ai/agent-page";
import { InsightCard } from "@/components/ai/insight-card";
import { NotConnected, Panel, Pill, Reveal, SectionHeading } from "@/components/ai/primitives";
import { QueryError } from "@/components/ai/query-error";
import { useAgent, useAiInsights, useCroFunnelSummary } from "@/hooks/useAiDashboard";
import { useAiMarketingContext, usePageContext } from "@/context/AiMarketingContext";
import { cn } from "@/lib/utils";

export default function CroAgentPage() {
  usePageContext("cro");
  const { dateRange } = useAiMarketingContext();
  const { agent, isLoading: agentLoading } = useAgent("cro");
  const { data: agentInsights = [], isLoading } = useAiInsights("all", "cro");
  const funnel = useCroFunnelSummary();
  const periodDays = funnel.data?.period?.days ?? dateRange.days;
  const topDropStage = funnel.data?.totals?.topDropOffStage;

  return (
    <AgentPageShell agent={agent} loading={agentLoading}>
      <section className="mt-10">
        <SectionHeading
          title="Ringkasan Konversi & Funnel"
          description={`Dihitung langsung dari alur konsultasi & aktivitas pengunjung (${periodDays} hari terakhir).`}
        />
        {funnel.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              role="status"
              aria-label="Memuat funnel"
            />
          </div>
        ) : funnel.isError ? (
          <QueryError
            message="Ringkasan funnel belum bisa dimuat dari server."
            onRetry={() => void funnel.refetch()}
          />
        ) : !funnel.data?.hasData ? (
          <NotConnected
            title="Data funnel belum cukup"
            description={funnel.data?.message ?? "Belum ada cukup konsultasi untuk dihitung pada periode ini."}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Konsultasi Masuk",
                value: String(funnel.data.totals!.consultations),
                note: "total konsultasi tercatat",
              },
              {
                label: "Tingkat Penyelesaian",
                value:
                  funnel.data.totals!.completionRate === null
                    ? "—"
                    : `${funnel.data.totals!.completionRate}%`,
                note: `${funnel.data.totals!.completed} selesai`,
              },
              {
                label: "Tahap Paling Banyak Batal",
                value: topDropStage ?? "—",
                note:
                  funnel.data.totals!.topDropOffCount !== null
                    ? `${funnel.data.totals!.topDropOffCount} batal/ditolak`
                    : "belum ada pembatalan tercatat",
              },
              {
                label: `Batal (${periodDays} hari)`,
                value: String(funnel.data.totals!.lostLast30d),
                note: `periode sebelumnya ${funnel.data.totals!.lostPrev30d}`,
              },
            ].map((kpi, i) => (
              <Reveal key={kpi.label} delay={i * 60}>
                <Panel className="p-5">
                  <p className="label-eyebrow">{kpi.label}</p>
                  <p className="text-display mt-2 text-2xl">{kpi.value}</p>
                  <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    {kpi.note}
                  </p>
                </Panel>
              </Reveal>
            ))}
          </div>
        )}

        {funnel.data?.hasData && funnel.data.stages.length > 0 && (
          <Panel className="mt-4 overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="label-eyebrow px-5 py-3">Tahapan</th>
                  <th className="label-eyebrow px-5 py-3">Tercapai</th>
                  <th className="label-eyebrow px-5 py-3 w-48">Rasio Lanjut</th>
                  <th className="label-eyebrow px-5 py-3">Rata-rata Jam</th>
                  <th className="label-eyebrow px-5 py-3">Batal</th>
                </tr>
              </thead>
              <tbody>
                {funnel.data.stages.map((st) => {
                  const isBottleneck = Boolean(topDropStage && (st.label === topDropStage || st.key === topDropStage) && st.lost > 0);
                  const pct = st.rate ?? 0;
                  return (
                    <tr
                      key={st.key}
                      className={cn(
                        "border-b border-border/40 last:border-0",
                        isBottleneck && "bg-warning/[0.04]",
                      )}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span>{st.label}</span>
                          {isBottleneck ? <Pill tone="warning">Hambatan Utama</Pill> : null}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono">{st.reached}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn("h-full rounded-full", isBottleneck ? "bg-warning" : "bg-ai")}
                              style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
                            />
                          </div>
                          <span className="num w-11 text-right text-xs">
                            {st.rate === null ? "—" : `${st.rate}%`}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono">
                        {st.avgHoursInStage === null ? "—" : st.avgHoursInStage}
                      </td>
                      <td className={cn("px-5 py-3 font-mono", st.lost > 0 && "text-destructive")}>{st.lost}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        )}

        {funnel.data?.shopAndWa ? (
          <Panel className="mt-4 p-5">
            <p className="label-eyebrow mb-3">Shop & WhatsApp LiviBot Funnel ({periodDays}d)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-sm border border-border bg-background/40 p-3">
                <p className="text-[11px] text-muted-foreground">Keranjang Belanja</p>
                <p className="num mt-1 text-xl font-medium">{funnel.data.shopAndWa.cartItemsAdded.toLocaleString("id-ID")}</p>
              </div>
              <div className="rounded-sm border border-border bg-background/40 p-3">
                <p className="text-[11px] text-muted-foreground">Klik Konsultasi WA dari Shop</p>
                <p className="num mt-1 text-xl font-medium">{funnel.data.shopAndWa.cartToWaClicks.toLocaleString("id-ID")}</p>
              </div>
              <div className="rounded-sm border border-border bg-background/40 p-3">
                <p className="text-[11px] text-muted-foreground">Inquiry Harga WA LiviBot</p>
                <p className="num mt-1 text-xl font-medium">{funnel.data.shopAndWa.waPriceInquiries.toLocaleString("id-ID")}</p>
              </div>
            </div>
            {funnel.data.shopAndWa.conversionNote ? (
              <p className="mt-2.5 text-xs text-muted-foreground">{funnel.data.shopAndWa.conversionNote}</p>
            ) : null}
          </Panel>
        ) : null}

        {(funnel.data?.unavailable?.length ?? 0) > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {funnel.data!.unavailable.map((u) => (
              <li key={u.metric}>
                <span className="font-medium text-foreground/80">{u.metric}</span>: {u.reason}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Temuan Konversi AI"
          description="Titik hambatan pengunjung, anomali, dan peluang perbaikan pengalaman belanja di website."
        />
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              role="status"
              aria-label="Memuat temuan"
            />
          </div>
        ) : agentInsights.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {agentInsights.map((i, idx) => (
              <Reveal key={i.id} delay={idx * 70}>
                <InsightCard insight={i} />
              </Reveal>
            ))}
          </div>
        ) : (
          <NotConnected
            title="Belum ada temuan konversi baru"
            description="Agen Konversi (CRO) akan menampilkan analisis hambatan pengunjung di sini setelah siklus pemindaian berjalan."
          />
        )}
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <SectionHeading title={`Aktivitas Pengunjung Tercatat (${periodDays} hari)`} />
          {funnel.data?.funnelEvents && funnel.data.funnelEvents.length > 0 ? (
            <div className="space-y-2">
              {funnel.data.funnelEvents.map((fe) => (
                <div key={fe.event} className="flex items-center justify-between border-b border-border/50 py-2 text-sm last:border-0">
                  <span className="font-mono text-xs text-foreground/85">{fe.event}</span>
                  <span className="num font-medium">{fe.count.toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>
          ) : (
            <NotConnected
              title="Belum ada aktivitas pengunjung tercatat"
              description="Aktivitas otomatis terekam saat pengunjung melihat produk/proyek, membuka promo, menambah ke keranjang, atau mengajukan konsultasi."
            />
          )}
        </Panel>
        <Panel className="p-6">
          <SectionHeading title="Perekaman Perilaku & Analitik Eksternal" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pencatat perilaku pengunjung sudah aktif secara otomatis di website Livora dan merekam setiap langkah penting pelanggan (lihat katalog, keranjang, hingga konsultasi) untuk bahan evaluasi konversi.
          </p>
          <details className="mt-4 rounded-md border border-border bg-secondary/40 px-3.5 py-2.5 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground/85 select-none">
              Info Teknis untuk Tim IT
            </summary>
            <p className="mt-2 leading-relaxed">
              Client-side tracker pada <code className="font-mono text-[11px]">src/lib/analytics.ts</code> mengirim custom events ke tabel <code className="font-mono text-[11px]">funnel_events</code> dan meneruskannya ke Google Analytics 4 / Meta Pixel apabila variabel server <code className="font-mono text-[11px]">GA4_MEASUREMENT_ID</code> dan <code className="font-mono text-[11px]">META_PIXEL_ID</code> sudah dikonfigurasi.
            </p>
          </details>
        </Panel>
      </section>
    </AgentPageShell>
  );
}