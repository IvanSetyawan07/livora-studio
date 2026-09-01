// src/pages/admin/ai-marketing/AiMarketingCro.tsx
import { AgentPageShell } from "@/components/ai/agent-page";
import { InsightCard } from "@/components/ai/insight-card";
import { NotConnected, Panel, Reveal, SectionHeading } from "@/components/ai/primitives";
import { useAgent, useAiInsights, useCroFunnelSummary } from "@/hooks/useAiDashboard";

export default function CroAgentPage() {
  const { agent } = useAgent("cro");
  const { data: agentInsights = [], isLoading } = useAiInsights("all", "cro");
  const funnel = useCroFunnelSummary();

  return (
    <AgentPageShell agent={agent}>
      <section className="mt-10">
        <SectionHeading
          title="Conversion overview"
          description="Dihitung langsung dari tabel konsultasi (bukan estimasi AI). Metrik yang sumbernya belum tersambung tidak ditampilkan sebagai angka."
        />
        {funnel.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              role="status"
              aria-label="Loading funnel"
            />
          </div>
        ) : funnel.isError ? (
          <NotConnected
            title="Gagal memuat funnel"
            description="Endpoint /ai/cro/funnel-summary tidak bisa dibaca. Coba muat ulang halaman."
          />
        ) : !funnel.data?.hasData ? (
          <NotConnected
            title="Data funnel belum cukup"
            description={funnel.data?.message ?? "Belum ada cukup konsultasi untuk dihitung."}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Consultation starts",
                value: String(funnel.data.totals!.consultations),
                note: "total konsultasi tercatat",
              },
              {
                label: "Funnel completion",
                value:
                  funnel.data.totals!.completionRate === null
                    ? "—"
                    : `${funnel.data.totals!.completionRate}%`,
                note: `${funnel.data.totals!.completed} selesai`,
              },
              {
                label: "Top drop-off stage",
                value: funnel.data.totals!.topDropOffStage ?? "—",
                note:
                  funnel.data.totals!.topDropOffCount !== null
                    ? `${funnel.data.totals!.topDropOffCount} batal/ditolak`
                    : "belum ada pembatalan tercatat",
              },
              {
                label: "Lost (30 hari)",
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
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="label-eyebrow px-5 py-3">Stage</th>
                  <th className="label-eyebrow px-5 py-3">Reached</th>
                  <th className="label-eyebrow px-5 py-3">Rate</th>
                  <th className="label-eyebrow px-5 py-3">Avg. jam di stage</th>
                  <th className="label-eyebrow px-5 py-3">Lost</th>
                </tr>
              </thead>
              <tbody>
                {funnel.data.stages.map((st) => (
                  <tr key={st.key} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-3">{st.label}</td>
                    <td className="px-5 py-3 font-mono">{st.reached}</td>
                    <td className="px-5 py-3 font-mono">{st.rate === null ? "—" : `${st.rate}%`}</td>
                    <td className="px-5 py-3 font-mono">
                      {st.avgHoursInStage === null ? "—" : st.avgHoursInStage}
                    </td>
                    <td className="px-5 py-3 font-mono">{st.lost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}

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
          title="AI insights"
          description="Funnel drop-off, anomalies and UX friction detected across the site."
        />
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              role="status"
              aria-label="Loading insights"
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
            title="No conversion insights yet"
            description="The CRO Agent will surface funnel and UX friction findings here once it runs."
          />
        )}
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <SectionHeading title="Page performance" />
          <NotConnected
            title="Per-page conversion breakdown is not enabled"
            description="Page-level conversion and drop-off rates will populate from Web Analytics once the CRO Agent is running."
          />
        </Panel>
        <Panel className="p-6">
          <SectionHeading title="Session behaviour" />
          <NotConnected
            title="Session behaviour capture is not connected"
            description="Scroll depth, rage clicks and form abandonment need a client-side capture layer in the Laravel backend."
          />
        </Panel>
      </section>
    </AgentPageShell>
  );
}