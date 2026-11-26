import { useMemo, useState } from "react";
import { Facebook, Instagram, Megaphone, Music2, Search, Target, Youtube, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartSection, StatCard, type StatKpi } from "@/components/ai/dashboard-charts";
import { KpiCard } from "@/components/ai/kpi-card";
import { Panel, Pill, StatusDot } from "@/components/ai/primitives";
import { SectionNotice } from "@/components/ai/section-state";
import { useAdsSummary, useAnalyticsOverview, useContentSummary, useLeadsFunnel } from "@/hooks/useMarketing";
import { notConnectedState, type NonDataSectionState, type SectionState } from "@/lib/ai/section-state";
import type { AdsSummary, AIKpi, ContentPlatform, ContentPlatformKey, ContentSummary, MarketingStatus } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

/** Skeleton kecil dipakai slot KPI/table selagi query "loading" — SectionNotice sendiri tidak menerima status "loading" (lihat NonDataSectionState). */
function LoadingBlock({ height = "h-28" }: { height?: string }) {
  return <div className={cn("animate-pulse rounded-sm bg-muted/40", height)} />;
}

const tick = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };
const tooltip = {
  contentStyle: { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border-strong))", borderRadius: 4, fontSize: 12, color: "hsl(var(--foreground))" },
  labelStyle: { color: "hsl(var(--muted-foreground))", fontSize: 11 },
} as const;
const shortDate = (d: string) => d.slice(5).replace("-", "/");
const fmt = (n: number | null | undefined, digits = 0) =>
  n == null ? "—" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(n);
const money = (n: number | null | undefined, currency = "IDR") => {
  if (n == null) return "—";
  if (currency.toUpperCase() === "USD") {
    return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
  }
  return `Rp ${fmt(n)}`;
};
const deltaOf = (d: number | null | undefined): Pick<StatKpi, "delta" | "direction"> =>
  d == null ? {} : { delta: `${d > 0 ? "+" : ""}${d}%`, direction: d >= 0 ? "up" : "down" };

const statusTone = (s: MarketingStatus): "success" | "neutral" | "warning" | "danger" =>
  s === "ok" ? "success" : s === "not_configured" ? "neutral" : s === "rate_limited" ? "warning" : "danger";
const statusLabel: Record<MarketingStatus, string> = {
  ok: "Connected", not_configured: "Not connected", invalid_credentials: "Invalid credentials",
  permission_required: "Permission required", rate_limited: "Rate limited", api_error: "API unavailable",
};

/* ---------------- Overview: Performance Overview (GA4) ---------------- */
export function PerformanceOverviewPanel() {
  const { state } = useAnalyticsOverview();
  const days = state.status === "data" ? state.data.period.days : null;
  return (
    <ChartSection
      title={`Performance Overview${days ? ` (${days} Days)` : ""}`}
      state={state}
      provider="Google Analytics 4"
      connectHref="/admin/ai-marketing/settings"
      isEmpty={(d) => !d.series?.length}
      renderChart={(d) => (
        <LineChart data={(d.series ?? []).map((r) => ({ ...r, label: shortDate(r.date) }))} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={tick} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={tick} />
          <Tooltip {...tooltip} />
          <Legend verticalAlign="bottom" height={28} iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="sessions" name="Traffic" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="users" name="Users" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="engagementRate" name="Engagement %" stroke="hsl(var(--ai))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="conversions" name="Conversions" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
        </LineChart>
      )}
    />
  );
}

/** KPI GA4 (dipakai Overview kalau mau mengganti slot locked). */
export function useAnalyticsKpis(): StatKpi[] | null {
  const { state } = useAnalyticsOverview();
  if (state.status !== "data" || !state.data.totals) return null;
  const t = state.data.totals; const dl = state.data.deltas;
  return [
    { label: "Sessions", value: fmt(t.sessions), ...deltaOf(dl?.sessions) },
    { label: "Users", value: fmt(t.users), ...deltaOf(dl?.users) },
    { label: "Engagement rate", value: `${t.engagementRate}%`, ...deltaOf(dl?.engagementRate) },
    { label: "Conversions", value: fmt(t.conversions, 1), ...deltaOf(dl?.conversions) },
  ];
}

/* ---------------- Ads: KPIs, trend, split, campaigns ---------------- */
export function AdsKpiGrid() {
  const { state } = useAdsSummary();
  if (state.status === "loading") {
    return <Panel className="col-span-full"><LoadingBlock /></Panel>;
  }
  if (state.status !== "data") {
    return <Panel className="col-span-full"><SectionNotice state={state} title="Ads KPI" height="h-28" provider="Meta Ads / Instagram Boost" connectHref="/admin/ai-marketing/settings" /></Panel>;
  }
  const k = state.data.kpis;
  const life = state.data.metaLifetime;
  const currency = life?.currency || "IDR";
  const roiPct = k.roiPct ?? state.data.roiAttribution?.effectiveRoiPct ?? null;
  const kpis: StatKpi[] = [
    {
      label: `Biaya Iklan (${state.data.period.days} hr)`,
      value: money(k.spend, currency),
      ...(k.spend === 0 && (life?.spend ?? 0) > 0
        ? { delta: `Sepanjang waktu: ${money(life?.spend, currency)}`, direction: "flat" as const }
        : {}),
    },
    { label: "Prospek (Iklan + Funnel)", value: fmt(k.leads, 1) },
    {
      label: "Biaya per Prospek (CPL)",
      value: money(k.cpl, currency),
      hint: "Rata-rata biaya iklan untuk 1 calon klien",
    },
    {
      label: "ROAS & ROI Gabungan",
      value: k.roas == null ? "—" : `${k.roas}x`,
      hint: "Perbandingan hasil penjualan terhadap biaya iklan",
      ...(roiPct != null
        ? { delta: `ROI ${roiPct > 0 ? "+" : ""}${roiPct}%`, direction: roiPct >= 0 ? "up" : "down" }
        : {}),
    },
    {
      label: "Rasio Klik (CTR)",
      value: k.ctr == null ? "—" : `${k.ctr}%`,
      hint: "Persentase orang yang mengklik iklan",
    },
  ];
  return <>{kpis.map((kpi, i) => <StatCard key={kpi.label} kpi={kpi} index={i} />)}</>;
}

export function SpendLeadsTrendPanel() {
  const { state } = useAdsSummary();
  const [rightMetric, setRightMetric] = useState<"leads" | "cpl">("leads");

  return (
    <ChartSection
      title="Spend & Leads Trend"
      state={state}
      provider="Meta Ads / Google Ads"
      connectHref="/admin/ai-marketing/settings"
      action={
        <div className="flex items-center gap-1 rounded-sm border border-border p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setRightMetric("leads")}
            className={cn(
              "rounded-sm px-2 py-0.5 transition-colors",
              rightMetric === "leads" ? "bg-ai/15 text-ai font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Leads
          </button>
          <button
            type="button"
            onClick={() => setRightMetric("cpl")}
            className={cn(
              "rounded-sm px-2 py-0.5 transition-colors",
              rightMetric === "cpl" ? "bg-ai/15 text-ai font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            CPL
          </button>
        </div>
      }
      isEmpty={(d) => d.series.length === 0}
      renderChart={(d) => (
        <LineChart data={d.series.map((r) => ({ ...r, label: shortDate(r.date) }))} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={tick} />
          <YAxis yAxisId="l" tickLine={false} axisLine={false} width={58} tick={tick} />
          <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} width={52} tick={tick} />
          <Tooltip {...tooltip} />
          <Legend verticalAlign="bottom" height={28} iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
          <Line yAxisId="l" type="monotone" dataKey="spend" name="Spend (Rp)" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
          {rightMetric === "leads" ? (
            <Line yAxisId="r" type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
          ) : (
            <Line yAxisId="r" type="monotone" dataKey="cpl" name="CPL (Rp)" stroke="hsl(var(--info))" strokeWidth={2} dot={false} connectNulls />
          )}
        </LineChart>
      )}
    />
  );
}

const splitColor: Record<string, string> = { meta: "hsl(var(--info))", google: "hsl(var(--warning))" };

export function BudgetSplitPanel({ height = 224 }: { height?: number }) {
  const { state } = useAdsSummary();
  return (
    <ChartSection
      title="Budget Split" state={state} height={height} provider="Meta Ads / Google Ads" connectHref="/admin/ai-marketing/settings"
      isEmpty={(d) => d.budgetSplit.every((s) => s.spend === 0)}
      renderChart={(d) => (
        <PieChart>
          <Tooltip {...tooltip} formatter={(v: number) => money(v)} />
          <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 11 }} />
          <Pie data={d.budgetSplit} dataKey="spend" nameKey="label" innerRadius="55%" outerRadius="80%" paddingAngle={3} stroke="none">
            {d.budgetSplit.map((s) => <Cell key={s.platform} fill={splitColor[s.platform]} />)}
          </Pie>
        </PieChart>
      )}
    />
  );
}

export function AdsPlatformRows() {
  const { query, state } = useAdsSummary();
  const rows: { key: "meta" | "google"; icon: LucideIcon; label: string; note: string }[] = [
    { key: "meta", icon: Megaphone, label: "Meta Ads", note: "Facebook & Instagram — ads_read" },
    { key: "google", icon: Target, label: "Google Ads", note: "Search & Performance Max" },
  ];
  const platformsData = query.data?.platforms ?? (state.status === "data" ? state.data.platforms : undefined);
  return (
    <div className="space-y-2.5">
      {rows.map(({ key, icon: Icon, label, note }) => {
        const p = platformsData?.[key];
        const s: MarketingStatus = p?.status ?? "not_configured";
        return (
          <div key={key} className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Icon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {s === "ok" ? (p?.accountId ?? note) : (p?.message ?? note)}
                </p>
              </div>
            </div>
            <Pill tone={statusTone(s) as never}><StatusDot tone={statusTone(s) as never} />{statusLabel[s]}</Pill>
          </div>
        );
      })}
    </div>
  );
}

export function ActiveCampaignsTable() {
  const { state } = useAdsSummary();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"auto" | "period" | "lifetime">("auto");
  const [platformFilter, setPlatformFilter] = useState<"all" | "meta" | "google">("all");
  const [sortBy, setSortBy] = useState<"spend" | "leads" | "cpl">("spend");

  const periodCampaigns = state.status === "data" ? state.data.campaigns : [];
  const lifetimeCampaigns = state.status === "data" ? (state.data.metaLifetime?.campaigns ?? []) : [];
  const currency = state.status === "data" ? (state.data.metaLifetime?.currency || "IDR") : "IDR";

  const activeScope: "period" | "lifetime" =
    scope === "auto"
      ? (periodCampaigns.length > 0 ? "period" : (lifetimeCampaigns.length > 0 ? "lifetime" : "period"))
      : scope;

  const sourceRows = activeScope === "lifetime" ? lifetimeCampaigns : periodCampaigns;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...sourceRows]
      .filter((c) => {
        if (platformFilter !== "all" && c.platform !== platformFilter) return false;
        if (q && !c.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "leads") return (b.leads ?? 0) - (a.leads ?? 0);
        if (sortBy === "cpl") return (a.cpl ?? Infinity) - (b.cpl ?? Infinity);
        return (b.spend ?? 0) - (a.spend ?? 0);
      });
  }, [sourceRows, search, platformFilter, sortBy]);

  return (
    <Panel className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-display rule-accent text-lg">
              {activeScope === "lifetime" ? "Riwayat Semua Pengeluaran Boost & Campaign (All-Time)" : "Active Campaigns"}
            </h3>
            {lifetimeCampaigns.length > 0 ? (
              <div className="inline-flex rounded-sm border border-border p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setScope("period")}
                  className={cn(
                    "rounded-sm px-2 py-0.5 transition-colors",
                    activeScope === "period" ? "bg-ai/15 font-medium text-ai" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Periode ({periodCampaigns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope("lifetime")}
                  className={cn(
                    "rounded-sm px-2 py-0.5 transition-colors",
                    activeScope === "lifetime" ? "bg-ai/15 font-medium text-ai" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  All-Time ({lifetimeCampaigns.length})
                </button>
              </div>
            ) : null}
          </div>
          {activeScope === "lifetime" && periodCampaigns.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Menampilkan riwayat seluruh IG Boost & Meta campaign sepanjang waktu karena belum ada transaksi Boost di jendela tanggal periode terpilih.
            </p>
          ) : null}
        </div>
        {state.status === "data" && sourceRows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari campaign / boost..."
                className="h-8 w-44 rounded-sm border border-border bg-secondary/60 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
              />
            </div>
            {(["all", "meta", "google"] as const).map((pf) => (
              <button
                key={pf}
                type="button"
                onClick={() => setPlatformFilter(pf)}
                className={cn(
                  "rounded-sm border px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] uppercase transition-colors",
                  platformFilter === pf
                    ? "border-ai/40 bg-ai/12 text-ai"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {pf === "all" ? "All" : pf === "meta" ? "Meta" : "Google"}
              </button>
            ))}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "spend" | "leads" | "cpl")}
              className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
              aria-label="Urutkan campaign"
            >
              <option value="spend">Sort: Spend tertinggi</option>
              <option value="leads">Sort: Leads terbanyak</option>
              <option value="cpl">Sort: CPL termurah</option>
            </select>
          </div>
        ) : null}
      </div>
      {state.status === "data" && sourceRows.length > 0 ? (
        rows.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Tidak ada campaign atau IG Boost yang cocok dengan filter "{search}".
          </p>
        ) : (
          <div className="scroll-rail overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  {["Boost / Campaign", "Platform", "Periode", "Spend", "Impr.", "Clicks", "CTR", "Leads / DM", "CPL", "Status"].map((h) => (
                    <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : null;
                  const normalizedStatus = (c.status || "unknown").toLowerCase();
                  const dateLabel = c.dateStart
                    ? (c.dateStop && c.dateStop !== c.dateStart ? `${c.dateStart} → ${c.dateStop}` : c.dateStart)
                    : "—";
                  return (
                    <tr key={`${activeScope}-${c.platform}-${c.id}`} className="border-t border-border hover:bg-accent/30">
                      <td className="max-w-[260px] py-2.5 pr-4 font-medium text-foreground">{c.name}</td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                        {c.platform === "meta" ? "Meta / IG Boost" : "Google Ads"}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{dateLabel}</td>
                      <td className="num py-2.5 pr-4 font-semibold text-foreground">{money(c.spend, currency)}</td>
                      <td className="num py-2.5 pr-4 text-xs text-muted-foreground">{fmt(c.impressions)}</td>
                      <td className="num py-2.5 pr-4 text-xs text-muted-foreground">{fmt(c.clicks)}</td>
                      <td className="num py-2.5 pr-4 text-xs">{ctr ? `${ctr}%` : "—"}</td>
                      <td className="num py-2.5 pr-4">{fmt(c.leads, 1)}</td>
                      <td className="num py-2.5 pr-4">{money(c.cpl, currency)}</td>
                      <td className="py-2.5 pr-4">
                        <Pill tone={normalizedStatus === "active" || normalizedStatus === "enabled" ? "success" : "neutral"}>
                          {c.status}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : state.status === "loading" ? (
        <LoadingBlock height="h-40" />
      ) : (
        <SectionNotice
          state={
            state.status === "data"
              ? ({ status: "empty", lastUpdatedAt: state.lastUpdatedAt, isRefreshing: state.isRefreshing, retry: state.retry } satisfies NonDataSectionState)
              : state
          }
          height="h-40"
          provider="Meta Ads / Google Ads"
          connectHref="/admin/ai-marketing/settings"
        />
      )}
    </Panel>
  );
}

/* ---------------- Content / Social ---------------- */
const socialMeta: { key: ContentPlatformKey; icon: LucideIcon; label: string; color: string }[] = [
  { key: "instagram", icon: Instagram, label: "Instagram", color: "hsl(var(--ai))" },
  { key: "facebook", icon: Facebook, label: "Facebook", color: "hsl(var(--info))" },
  { key: "tiktok", icon: Music2, label: "TikTok", color: "hsl(var(--warning))" },
  { key: "youtube", icon: Youtube, label: "YouTube", color: "hsl(var(--destructive))" },
];

function SocialRow({ icon: Icon, label, p }: { icon: LucideIcon; label: string; p?: ContentPlatform }) {
  const s: MarketingStatus = p?.status ?? "not_configured";
  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-muted-foreground" />
        <div>
          <p className="text-sm text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">
            {s === "ok" ? `${fmt(p?.followers)} followers · reach ${fmt(p?.reach)} · eng ${fmt(p?.engagements)}` : p?.message ?? statusLabel[s]}
          </p>
        </div>
      </div>
      <Pill tone={statusTone(s) as never}><StatusDot tone={statusTone(s) as never} />{statusLabel[s]}</Pill>
    </div>
  );
}

export function SocialPerformanceRows() {
  const { query, state } = useContentSummary();
  const platformsData = query.data?.platforms ?? (state.status === "data" ? state.data.platforms : undefined);
  return (
    <div className="space-y-2.5">
      {socialMeta.map((m) => <SocialRow key={m.key} icon={m.icon} label={m.label} p={platformsData?.[m.key]} />)}
    </div>
  );
}

export function ContentKpiGrid() {
  const { state } = useContentSummary();
  if (state.status === "loading") {
    return <Panel className="col-span-full"><LoadingBlock /></Panel>;
  }
  if (state.status !== "data") {
    return <Panel className="col-span-full"><SectionNotice state={state} title="Social KPI" height="h-28" provider="Meta / TikTok / YouTube" connectHref="/admin/ai-marketing/settings" /></Panel>;
  }
  const k = state.data.kpis;
  const kpis: StatKpi[] = [
    { label: "Total Followers", value: fmt(k.followers) },
    { label: "Avg Engagement", value: k.engagementRate == null ? "—" : `${k.engagementRate}%` },
    { label: "Posts / Week", value: fmt(k.postsPerWeek, 1) },
    { label: `Reach (${state.data.period.days}d)`, value: fmt(k.reach) },
  ];
  return <>{kpis.map((kpi, i) => <StatCard key={kpi.label} kpi={kpi} index={i} />)}</>;
}

export function EngagementTrendPanel() {
  const { state } = useContentSummary();
  return (
    <ChartSection
      title="Engagement Trend" state={state} provider="Meta / TikTok / YouTube" connectHref="/admin/ai-marketing/settings"
      isEmpty={(d) => d.engagementSeries.length === 0}
      renderChart={(d) => (
        <BarChart data={d.engagementSeries.map((r) => ({ ...r, label: shortDate(r.date) }))} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={tick} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={tick} />
          <Tooltip {...tooltip} />
          <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11 }} />
          {socialMeta.filter((m) => d.platforms[m.key]?.status === "ok" && m.key !== "youtube").map((m) => (
            <Bar key={m.key} dataKey={m.key} name={m.label} stackId="eng" fill={m.color} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      )}
    />
  );
}

export function contentSummaryNote(d?: ContentSummary) {
  return d?.platforms.youtube?.status === "ok"
    ? "YouTube: deret harian butuh YouTube Analytics (OAuth) — hanya agregat periode yang ditampilkan."
    : undefined;
}

/* ---------------- Slot KPI Overview yang menunggu integrasi ----------------
 * Kartu ini tampil "—/Not connected" selama kredensial belum ada, dan
 * LANGSUNG terisi angka asli begitu GA4 / akun iklan tersambung — tanpa
 * perlu ubah apa pun di halaman Overview. */

function deltaLabel(d: number | null | undefined): Pick<AIKpi, "deltaLabel" | "deltaDirection"> {
  if (d == null) return {};
  return { deltaLabel: `${d > 0 ? "+" : ""}${d}% vs periode sebelumnya`, deltaDirection: d >= 0 ? "up" : "down" };
}

export function AvgEngagementKpiCard({ index = 4 }: { index?: number }) {
  const { state } = useAnalyticsOverview();
  if (state.status !== "data" || !state.data.totals) {
    return <KpiCard label="Avg Engagement" index={index} provider="GA4 Data API" state={state.status === "loading" ? state : notConnectedState("GA4 Data API")} />;
  }
  const t = state.data.totals;
  const kpi: AIKpi = {
    id: "ga4-engagement",
    label: "Avg Engagement",
    value: t.engagementRate,
    decimals: 1,
    suffix: "%",
    spark: (state.data.series ?? []).map((r) => r.engagementRate),
    footnote: "GA4 · engagement rate",
    live: true,
    ...deltaLabel(state.data.deltas?.engagementRate),
  };
  return <KpiCard label="Avg Engagement" index={index} state={{ ...state, data: kpi }} href="/admin/ai-marketing/content" />;
}

export function AdRoasKpiCard({ index = 5 }: { index?: number }) {
  const { query, state } = useAdsSummary();
  const raw = query.data ?? (state.status === "data" ? state.data : undefined);
  const roi = raw?.roiAttribution;
  const life = raw?.metaLifetime;
  const lifeRoi = life?.roiAttribution;
  const currency = life?.currency || "IDR";
  const k = raw?.kpis;

  if (state.status === "loading") {
    return <KpiCard label="ROAS & ROI (Boost)" index={index} provider="IG Boost / Meta Ads" state={state} />;
  }

  if (k && k.roas != null) {
    const roiPct = k.roiPct ?? roi?.effectiveRoiPct ?? null;
    const kpi: AIKpi = {
      id: "ads-roas",
      label: "ROAS & ROI (Boost)",
      value: k.roas,
      decimals: 2,
      suffix: "x",
      deltaLabel: roiPct != null ? `ROI ${roiPct > 0 ? "+" : ""}${roiPct}%` : `Spend ${money(k.spend, currency)}`,
      deltaDirection: roiPct != null ? (roiPct >= 0 ? "up" : "down") : "flat",
      spark: (raw?.series ?? []).map((r) => (r.spend > 0 ? r.revenue / r.spend : 0)),
      footnote: `Spend ${money(k.spend, currency)} · CPL ${money(k.cpl, currency)}`,
      live: true,
    };
    return (
      <KpiCard
        label="ROAS & ROI (Boost)"
        index={index}
        state={{ status: "data", data: kpi, lastUpdatedAt: state.lastUpdatedAt, isRefreshing: state.isRefreshing, retry: state.retry }}
        href="/admin/ai-marketing/ads"
      />
    );
  }

  if (life && (life.spend ?? 0) > 0) {
    const lifeRoasVal = lifeRoi?.effectiveRoas ?? 0;
    const lifeRoiPct = lifeRoi?.effectiveRoiPct ?? null;
    const kpi: AIKpi = {
      id: "ads-roas-lifetime",
      label: "ROAS & ROI (All-Time)",
      value: lifeRoasVal,
      decimals: 2,
      suffix: "x",
      deltaLabel: lifeRoiPct != null ? `ROI ${lifeRoiPct > 0 ? "+" : ""}${lifeRoiPct}%` : `Total Boost ${money(life.spend, currency)}`,
      deltaDirection: lifeRoiPct != null ? (lifeRoiPct >= 0 ? "up" : "down") : "flat",
      spark: [],
      footnote: `Spend All-Time ${money(life.spend, currency)} · ${fmt(life.clicks)} klik`,
      live: true,
    };
    return (
      <KpiCard
        label="ROAS & ROI (All-Time)"
        index={index}
        state={{ status: "data", data: kpi, lastUpdatedAt: state.lastUpdatedAt, isRefreshing: state.isRefreshing, retry: state.retry }}
        href="/admin/ai-marketing/ads"
      />
    );
  }

  if (roi) {
    const pipeVal = roi.totalAttributedValueRp ?? 0;
    return (
      <KpiCard
        label="ROAS & ROI (Boost)"
        index={index}
        provider={pipeVal > 0 ? `Pipeline Rp ${fmt(pipeVal)} · catat biaya Boost untuk hitung ROAS` : "Catat biaya Boost IG"}
        state={{ status: "empty", lastUpdatedAt: state.lastUpdatedAt, isRefreshing: state.isRefreshing, retry: state.retry }}
        href="/admin/ai-marketing/ads"
      />
    );
  }

  return (
    <KpiCard
      label="ROAS & ROI (Boost)"
      index={index}
      provider="Meta / IG Boost"
      state={notConnectedState("Meta / IG Boost")}
      href="/admin/ai-marketing/ads"
    />
  );
}

/* ---------------- Ads: CTR & Impressions (dari series yang sudah ada) ------ */
export function CtrImpressionsPanel() {
  const { state } = useAdsSummary();
  return (
    <ChartSection
      title="CTR & Impressions" state={state} provider="Meta Ads / Google Ads" connectHref="/admin/ai-marketing/settings"
      isEmpty={(d) => d.series.length === 0}
      renderChart={(d) => (
        <LineChart
          data={d.series.map((r) => ({ ...r, label: shortDate(r.date), ctr: r.impressions > 0 ? +((r.clicks / r.impressions) * 100).toFixed(2) : null }))}
          margin={{ top: 8, right: 12, bottom: 0, left: -16 }}
        >
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={tick} />
          <YAxis yAxisId="l" tickLine={false} axisLine={false} width={56} tick={tick} />
          <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} width={40} tick={tick} unit="%" />
          <Tooltip {...tooltip} />
          <Legend verticalAlign="bottom" height={28} iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
          <Line yAxisId="l" type="monotone" dataKey="impressions" name="Impressions" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
          <Line yAxisId="l" type="monotone" dataKey="clicks" name="Clicks" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
          <Line yAxisId="r" type="monotone" dataKey="ctr" name="CTR %" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      )}
    />
  );
}

/* ---------------- Leads: funnel internal (konsultasi + wishlist) ----------- */
export function LeadsKpiGrid() {
  const { state } = useLeadsFunnel();
  if (state.status === "loading") {
    return <Panel className="col-span-full"><LoadingBlock /></Panel>;
  }
  if (state.status !== "data") {
    return <Panel className="col-span-full"><SectionNotice state={state} title="Leads KPI" height="h-28" provider="Database Livora" /></Panel>;
  }
  const k = state.data.kpis;
  const dl = state.data.deltas;
  const kpis: StatKpi[] = [
    { label: "New Leads", value: fmt(k.leads), ...deltaOf(dl.leads) },
    { label: "Wishlist Adds", value: fmt(k.wishlistAdds), ...deltaOf(dl.wishlistAdds) },
    { label: "Response Rate", value: k.responseRate == null ? "—" : `${k.responseRate}%`, ...deltaOf(dl.responseRate) },
    { label: "Followed Up", value: fmt(k.responded) },
  ];
  return <>{kpis.map((kpi, i) => <StatCard key={kpi.label} kpi={kpi} index={i} />)}</>;
}

export function LeadsFunnelPanel() {
  const { state } = useLeadsFunnel();
  const days = state.status === "data" ? state.data.period.days : null;
  return (
    <ChartSection
      title={`Lead Funnel${days ? ` (${days} Days)` : ""}`} state={state} provider="Database Livora"
      isEmpty={(d) => d.series.every((r) => r.leads === 0 && r.wishlistAdds === 0)}
      renderChart={(d) => (
        <LineChart data={d.series.map((r) => ({ ...r, label: shortDate(r.date) }))} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={tick} />
          <YAxis tickLine={false} axisLine={false} width={40} tick={tick} allowDecimals={false} />
          <Tooltip {...tooltip} />
          <Legend verticalAlign="bottom" height={28} iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="wishlistAdds" name="Wishlist Adds" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="leads" name="Leads (konsultasi)" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="responded" name="Followed Up" stroke="hsl(var(--ai))" strokeWidth={2} dot={false} />
        </LineChart>
      )}
    />
  );
}

const stageDisplayLabel: Record<string, string> = {
  new_inquiry: "Baru Masuk",
  under_review: "Ditinjau",
  contacted: "Dihubungi",
  meeting_scheduled: "Jadwal Meeting",
  in_progress: "Proyek Berjalan",
  agreement_pending: "Draft Perjanjian",
  dp_pending: "Menunggu DP",
  waiting_list: "Waiting List",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  pending: "WA Pending",
  replied: "WA Dibalas",
};

/** Agregat status konsultasi periode ini — di samping funnel harian. */
export function LeadsByStatusPanel() {
  const { state } = useLeadsFunnel();
  return (
    <ChartSection
      title="Leads by Stage"
      state={state}
      provider="Database Livora"
      isEmpty={(d) => d.byStatus.length === 0}
      renderChart={(d) => {
        const rows = d.byStatus.map((row) => ({
          ...row,
          label: stageDisplayLabel[row.status] ?? row.status.replace(/_/g, " "),
        }));
        return (
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tick={tick} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={128} tick={{ ...tick, fontSize: 11 }} />
            <Tooltip {...tooltip} />
            <Bar dataKey="count" name="Leads" fill="hsl(var(--brass))" radius={[0, 3, 3, 0]} />
          </BarChart>
        );
      }}
    />
  );
}
export type { AdsSummary };