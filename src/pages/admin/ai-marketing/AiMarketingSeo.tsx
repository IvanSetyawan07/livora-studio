import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Globe, Loader2, Unlink } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AgentPageShell } from "@/components/ai/agent-page";
import { ChartSection } from "@/components/ai/dashboard-charts";
import {
  ConfidenceBar,
  NotConnected,
  Panel,
  Pill,
  Reveal,
  SectionHeading,
  StatusDot,
} from "@/components/ai/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  extractApiErrorMessage,
  useAgent,
  useAiInsights,
  useGoogleAuthorize,
  useGoogleDisconnect,
  useGoogleIntegrationStatus,
  useSearchConsoleSites,
  useSearchConsoleSummary,
  useSelectSearchConsoleSite,
} from "@/hooks/useAiDashboard";
import { LocalSeoSection } from "./AiMarketingSeoLocal";
import { useAiMarketingContext, usePageContext } from "@/context/AiMarketingContext";
import type { AIInsight, AISeverity } from "@/lib/ai/types";

/**
 * Fase 7 — halaman SEO Agent disambungkan ke data asli.
 *
 * Dua sumber, sengaja dipisah:
 *  - 4 kartu KPI  → angka mentah Search Console (GET /ai/seo/search-console-summary),
 *                   TIDAK lewat AI, supaya angkanya bisa dicocokkan 1:1 dengan
 *                   search.google.com/search-console.
 *  - AI opportunities → hasil `php artisan ai:run-agent seo` yang tersimpan di
 *                   tabel ai_insights (agent_key = 'seo').
 *
 * Section Local SEO membaca Google Business Profile lewat LocalSeoSection —
 * angka listing asli, dengan keadaan "belum tersambung" / "belum ada data"
 * dinyatakan eksplisit. Tidak ada angka contoh di halaman ini.
 */

const severityTone: Record<AISeverity, "brass" | "info" | "neutral" | "danger"> = {
  critical: "danger",
  high: "brass",
  medium: "info",
  low: "neutral",
};

const googleCallbackMessage: Record<string, { tone: "success" | "danger"; text: string }> = {
  connected: { tone: "success", text: "Google Search Console connected." },
  denied: { tone: "danger", text: "Google connection was denied." },
  invalid_state: { tone: "danger", text: "Connection attempt expired — please try again." },
  missing_code: { tone: "danger", text: "Google did not return an authorization code." },
  exchange_failed: { tone: "danger", text: "Google rejected the token exchange — please try again." },
};

/**
 * Status koneksi Google memakai hook react-query bersama (aiKeys.googleStatus),
 * sama seperti halaman Settings. Connect/disconnect dari sini otomatis
 * menyegarkan badge status di Settings dan Overview — sebelumnya kartu ini
 * punya useState/useEffect sendiri sehingga halaman lain jadi basi.
 */
function GoogleSearchConsoleCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [callbackResult] = useState(() => searchParams.get("google"));
  const { data: status, isLoading: loading } = useGoogleIntegrationStatus();
  const disconnect = useGoogleDisconnect();
  const authorize = useGoogleAuthorize();
  const sitesQuery = useSearchConsoleSites(Boolean(status?.connected));
  const selectSite = useSelectSearchConsoleSite();
  const busy = disconnect.isPending || authorize.isPending;

  useEffect(() => {
    if (searchParams.get("google")) {
      const params = new URLSearchParams(searchParams);
      params.delete("google");
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = () =>
    authorize.mutate(undefined, {
      onError: (e) => toast.error(extractApiErrorMessage(e, "Gagal mengambil authorize URL Google.")),
    });

  const handleDisconnect = () =>
    disconnect.mutate(undefined, {
      onSuccess: () => toast.success("Google Search Console berhasil diputus."),
      onError: (e) => toast.error(extractApiErrorMessage(e, "Gagal memutus koneksi Google.")),
    });

  const sites = sitesQuery.data?.sites ?? [];

  return (
    <>
      {callbackResult && googleCallbackMessage[callbackResult] ? (
        <Reveal>
          <Panel
            className={`mb-4 flex items-center gap-2 p-4 text-sm ${
              googleCallbackMessage[callbackResult].tone === "success"
                ? "border-success/40 text-success"
                : "border-destructive/40 text-destructive"
            }`}
          >
            <StatusDot tone={googleCallbackMessage[callbackResult].tone === "success" ? "success" : "danger"} />
            {googleCallbackMessage[callbackResult].text}
          </Panel>
        </Reveal>
      ) : null}

      {loading ? (
        <Panel className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking Google connection…
        </Panel>
      ) : status?.connected ? (
        <Panel className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-success" />
              <div>
                <p className="text-sm font-medium">Google Search Console connected</p>
                <p className="text-xs text-muted-foreground">
                  {status.email ?? "Unknown account"}
                  {status.connectedAt ? ` · since ${new Date(status.connectedAt).toLocaleDateString("id-ID")}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sites.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <Globe className="size-3.5 text-muted-foreground" />
                  <select
                    value={sitesQuery.data?.selected ?? ""}
                    disabled={selectSite.isPending}
                    onChange={(e) =>
                      selectSite.mutate(e.target.value || null, {
                        onSuccess: () => toast.success("Properti Search Console diperbarui."),
                        onError: (err) => toast.error(extractApiErrorMessage(err, "Gagal memilih properti.")),
                      })
                    }
                    className="h-8 rounded-md border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
                    aria-label="Pilih properti Search Console"
                  >
                    <option value="">Otomatis (prioritas livora)</option>
                    {sites.map((s) => (
                      <option key={s.siteUrl} value={s.siteUrl}>
                        {s.siteUrl} ({s.permissionLevel})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <button
                onClick={handleDisconnect}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
                Disconnect
              </button>
            </div>
          </div>
          {status.hasAnalyticsScope === false ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              Scope Google Analytics 4 (<span className="font-mono">analytics.readonly</span>) belum aktif pada token Google ini. Klik Disconnect lalu Connect ulang agar grafik GA4 ikut terisi.
            </p>
          ) : null}
        </Panel>

      ) : (
        <NotConnected
          title="Google Search Console is not connected"
          description="Connect a Google account with Search Console access to pull real organic clicks, impressions, position and CTR into this dashboard."
        >
          <button
            onClick={handleConnect}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-ai px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Connect Google
          </button>
        </NotConnected>
      )}
    </>
  );
}

/** Satu kartu KPI. Tiga keadaan (loading / tidak ada angka / ada angka) dibedakan jujur. */
function KpiCard({
  label,
  value,
  note,
  delay,
}: {
  label: string;
  value: string | null;
  note: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <Panel className="p-5">
        <p className="label-eyebrow">{label}</p>
        <p className={`text-display mt-2 text-2xl ${value ? "" : "text-muted-foreground"}`}>
          {value ?? "—"}
        </p>
        <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {note}
        </p>
      </Panel>
    </Reveal>
  );
}

function SeoKpiCards() {
  const { data, isLoading, isError } = useSearchConsoleSummary();

  // Catatan "kenapa": kita TIDAK menampilkan angka apapun kalau datanya tidak
  // ada. Lebih baik kartu kosong dengan alasan yang jelas daripada angka nol
  // yang terlihat seperti data asli.
  const note = isLoading
    ? "Loading Search Console…"
    : isError
      ? "Gagal memuat data Search Console"
      : !data?.connected
        ? "Search Console not connected"
        : !data.hasData
          ? "Connected · belum ada data 28 hari terakhir"
          : `Last 28 days · ${data.siteUrl ?? ""}`;

  const totals = data?.hasData ? data.totals : null;

  const cards: { label: string; value: string | null }[] = [
    { label: "Organic clicks", value: totals ? totals.clicks.toLocaleString() : null },
    { label: "Impressions", value: totals ? totals.impressions.toLocaleString() : null },
    { label: "Average position", value: totals ? totals.position.toFixed(1) : null },
    { label: "CTR", value: totals ? `${totals.ctr.toFixed(2)}%` : null },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <KpiCard key={card.label} label={card.label} value={card.value} note={note} delay={i * 60} />
      ))}
    </div>
  );
}

export default function SeoAgentPage() {
  usePageContext("seo");
  const { dateRange } = useAiMarketingContext();
  const { agent, isLoading: agentLoading } = useAgent("seo");
  const [selected, setSelected] = useState<AIInsight | null>(null);
  const { data: seoInsights, isLoading: insightsLoading } = useAiInsights("all", "seo");
  const sc = useSearchConsoleSummary();
  const topQueries = sc.data?.topQueries ?? [];
  const topPages = sc.data?.topPages ?? [];

  return (
    <AgentPageShell agent={agent} loading={agentLoading}>
      <section className="mt-10">
        <SectionHeading
          title="SEO overview"
          description={`Organic clicks, impressions, average position dan CTR dari Google Search Console (${dateRange.days} hari terakhir).`}
        />
        <div className="mb-4">
          <GoogleSearchConsoleCard />
        </div>
        <SeoKpiCards />

        {sc.data?.series && sc.data.series.length > 0 ? (
          <div className="mt-4">
            <ChartSection
              title="Search Console Daily Trend"
              state={sc.section}
              provider="Google Search Console"
              connectHref="/admin/ai-marketing/settings"
              isEmpty={(d) => !d.series || d.series.length === 0}
              renderChart={(d) => (
                <LineChart
                  data={(d.series ?? []).map((r) => ({ ...r, label: r.date.slice(5).replace("-", "/") }))}
                  margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
                >
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis yAxisId="l" tickLine={false} axisLine={false} width={48} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} width={52} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border-strong))",
                      borderRadius: 4,
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={28} iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="l" type="monotone" dataKey="clicks" name="Clicks" stroke="hsl(var(--ai))" strokeWidth={2} dot={false} />
                  <Line yAxisId="r" type="monotone" dataKey="impressions" name="Impressions" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                </LineChart>
              )}
            />
          </div>
        ) : null}

        {topQueries.length > 0 || topPages.length > 0 ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel className="overflow-hidden p-5">
              <h3 className="text-display rule-accent mb-3 text-base">Top Search Queries</h3>
              {topQueries.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada data query Search Console.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-[10px] tracking-wider text-muted-foreground uppercase">
                        <th className="pb-2 pr-3 font-medium">Keyword</th>
                        <th className="pb-2 pr-3 text-right font-medium">Clicks</th>
                        <th className="pb-2 pr-3 text-right font-medium">Impr.</th>
                        <th className="pb-2 pr-3 text-right font-medium">CTR</th>
                        <th className="pb-2 text-right font-medium">Pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topQueries.slice(0, 10).map((q) => (
                        <tr key={q.query} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-3 font-medium text-foreground">{q.query}</td>
                          <td className="num py-2 pr-3 text-right">{q.clicks.toLocaleString("id-ID")}</td>
                          <td className="num py-2 pr-3 text-right text-muted-foreground">{q.impressions.toLocaleString("id-ID")}</td>
                          <td className="num py-2 pr-3 text-right">{q.ctr.toFixed(1)}%</td>
                          <td className="num py-2 text-right text-muted-foreground">{q.position.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel className="overflow-hidden p-5">
              <h3 className="text-display rule-accent mb-3 text-base">Top Landing Pages</h3>
              {topPages.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada data halaman Search Console.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-[10px] tracking-wider text-muted-foreground uppercase">
                        <th className="pb-2 pr-3 font-medium">URL Page</th>
                        <th className="pb-2 pr-3 text-right font-medium">Clicks</th>
                        <th className="pb-2 pr-3 text-right font-medium">Impr.</th>
                        <th className="pb-2 text-right font-medium">Pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPages.slice(0, 10).map((pg) => (
                        <tr key={pg.page} className="border-b border-border/50 last:border-0">
                          <td className="max-w-[220px] truncate py-2 pr-3 font-mono text-[11px] text-foreground/90" title={pg.page}>
                            {pg.page.replace(/^https?:\/\/[^/]+/, "") || "/"}
                          </td>
                          <td className="num py-2 pr-3 text-right">{pg.clicks.toLocaleString("id-ID")}</td>
                          <td className="num py-2 pr-3 text-right text-muted-foreground">{pg.impressions.toLocaleString("id-ID")}</td>
                          <td className="num py-2 text-right text-muted-foreground">{pg.position.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        ) : null}
      </section>

      {/* Local SEO: data asli Google Business Profile. */}
      <LocalSeoSection />

      <section className="mt-10">
        <SectionHeading
          title="AI opportunities"
          description="Findings from the SEO Agent, generated from real Search Console query and page data. Select a row to inspect the reasoning."
        />
        <Panel className="overflow-hidden">
          {insightsLoading ? (
            <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading SEO insights…
            </div>
          ) : (seoInsights?.length ?? 0) === 0 ? (
            <div className="p-5">
              <NotConnected
                title="SEO Agent belum pernah menghasilkan insight"
                description="Klik tombol Run Analysis di kanan atas untuk mengaudit metadata on-page katalog Livora serta Search Console & Google Business Profile."
              />
            </div>
          ) : (
            <div className="scroll-rail">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Opportunity", "Severity", "Confidence", "Source", "Status"].map((h) => (
                      <th key={h} className="label-eyebrow px-5 py-3 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seoInsights!.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelected(o)}
                      className="cursor-pointer border-b border-border transition-colors duration-200 last:border-0 hover:bg-accent/40"
                    >
                      <td className="px-5 py-4">{o.title}</td>
                      <td className="px-5 py-4">
                        <Pill tone={severityTone[o.severity]}>{o.severity}</Pill>
                      </td>
                      <td className="num px-5 py-4 text-brass">{o.confidence}%</td>
                      <td className="px-5 py-4 text-muted-foreground">{o.source.join(", ")}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {o.recommendationId ? "Recommendation created" : "Observation"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <SectionHeading title="Content opportunities" />
          <NotConnected
            title="Content gap analysis belum dipisah dari insight umum"
            description="Untuk sekarang temuan content gap ikut muncul di tabel AI opportunities di atas."
          />
        </Panel>
        <Panel className="p-6">
          <SectionHeading title="Technical issues" />
          <NotConnected
            title="Site crawl is not scheduled yet"
            description="The Laravel backend will run the crawl and pass structured findings to the SEO Agent for reasoning."
          />
        </Panel>
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="border-border-strong bg-popover sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-display text-xl font-light">
                  {selected.title}
                </DialogTitle>
                <DialogDescription>
                  {selected.severity} severity · source: {selected.source.join(", ")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="label-eyebrow">What happened</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {selected.whatHappened}
                  </p>
                </div>
                <div>
                  <p className="label-eyebrow">AI reasoning</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {selected.reasoning}
                  </p>
                </div>
                <div>
                  <p className="label-eyebrow">Why it matters</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {selected.whyItMatters}
                  </p>
                </div>
                <ConfidenceBar value={selected.confidence} />
                {selected.recommendationId ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-xs text-muted-foreground">
                      Rekomendasi dari insight ini sudah menunggu keputusan.
                    </p>
                    <Link
                      to="/admin/ai-marketing/ai-center/recommendations"
                      className="text-xs font-medium text-ai hover:underline"
                    >
                      Buka Recommendations →
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Insight ini murni observasi — AI tidak menemukan langkah konkret yang cukup jelas
                    untuk dijadikan rekomendasi.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AgentPageShell>
  );
}