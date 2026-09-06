import { Facebook, Instagram, Megaphone, Music2, Target, Youtube, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartSection, StatCard, type StatKpi } from "@/components/ai/dashboard-charts";
import { Panel, Pill, StatusDot } from "@/components/ai/primitives";
import { SectionNotice } from "@/components/ai/section-state";
import { useAdsSummary, useAnalyticsOverview, useContentSummary } from "@/hooks/useMarketing";
import type { NonDataSectionState } from "@/lib/ai/section-state";
import type { AdsSummary, ContentPlatform, ContentPlatformKey, ContentSummary, MarketingStatus } from "@/lib/ai/types";
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
const money = (n: number | null | undefined) => (n == null ? "—" : `Rp ${fmt(n)}`);
const deltaOf = (d: number | null | undefined): Pick<StatKpi, "delta" | "direction"> =>
  d == null ? {} : { delta: `${d > 0 ? "+" : ""}${d}%`, direction: d >= 0 ? "up" : "down" };

const statusTone = (s: MarketingStatus) =>
  s === "ok" ? "success" : s === "not_configured" ? "muted" : s === "rate_limited" ? "warning" : "danger";
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
    return <Panel className="col-span-full"><SectionNotice state={state} title="Ads KPI" height="h-28" provider="Meta Ads / Google Ads" connectHref="/admin/ai-marketing/settings" /></Panel>;
  }
  const k = state.data.kpis;
  const kpis: StatKpi[] = [
    { label: "Total Spend", value: money(k.spend) },
    { label: "Leads from Ads", value: fmt(k.leads, 1) },
    { label: "Cost per Lead", value: money(k.cpl) },
    { label: "ROAS", value: k.roas == null ? "—" : `${k.roas}x` },
  ];
  return <>{kpis.map((kpi, i) => <StatCard key={kpi.label} kpi={kpi} index={i} />)}</>;
}

export function SpendLeadsTrendPanel() {
  const { state } = useAdsSummary();
  return (
    <ChartSection
      title="Spend & Leads Trend" state={state} provider="Meta Ads / Google Ads" connectHref="/admin/ai-marketing/settings"
      isEmpty={(d) => d.series.length === 0}
      renderChart={(d) => (
        <LineChart data={d.series.map((r) => ({ ...r, label: shortDate(r.date) }))} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={tick} />
          <YAxis yAxisId="l" tickLine={false} axisLine={false} width={56} tick={tick} />
          <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} width={40} tick={tick} />
          <Tooltip {...tooltip} />
          <Legend verticalAlign="bottom" height={28} iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
          <Line yAxisId="l" type="monotone" dataKey="spend" name="Spend" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
          <Line yAxisId="r" type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
          <Line yAxisId="l" type="monotone" dataKey="cpl" name="CPL" stroke="hsl(var(--info))" strokeWidth={2} dot={false} connectNulls />
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
  const { state } = useAdsSummary();
  const rows: { key: "meta" | "google"; icon: LucideIcon; label: string; note: string }[] = [
    { key: "meta", icon: Megaphone, label: "Meta Ads", note: "Facebook & Instagram — ads_read" },
    { key: "google", icon: Target, label: "Google Ads", note: "Search & Performance Max" },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map(({ key, icon: Icon, label, note }) => {
        const p = state.status === "data" ? state.data.platforms[key] : undefined;
        const s: MarketingStatus = p?.status ?? "not_configured";
        return (
          <div key={key} className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Icon className="size-4 text-muted-foreground" />
              <div><p className="text-sm text-foreground">{label}</p><p className="text-[11px] text-muted-foreground">{p?.accountId ?? note}</p></div>
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
  return (
    <Panel className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h3 className="text-display rule-accent text-lg">Active Campaigns</h3></div>
      {state.status === "data" && state.data.campaigns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              {["Campaign", "Platform", "Spend", "Leads", "CPL", "Status"].map((h) => <th key={h} className="pb-2 pr-4 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {state.data.campaigns.map((c) => (
                <tr key={`${c.platform}-${c.id}`} className="border-t border-border">
                  <td className="py-2 pr-4 text-foreground">{c.name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{c.platform === "meta" ? "Meta Ads" : "Google Ads"}</td>
                  <td className="py-2 pr-4">{money(c.spend)}</td>
                  <td className="py-2 pr-4">{fmt(c.leads, 1)}</td>
                  <td className="py-2 pr-4">{money(c.cpl)}</td>
                  <td className="py-2 pr-4"><Pill tone={c.status === "active" || c.status === "enabled" ? "success" : "neutral"}>{c.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : state.status === "loading" ? (
        <LoadingBlock height="h-40" />
      ) : (
        <SectionNotice
          state={
            state.status === "data"
              ? ({ status: "empty", lastUpdatedAt: state.lastUpdatedAt, isRefreshing: state.isRefreshing, retry: state.retry } satisfies NonDataSectionState)
              : state
          }
          height="h-40" provider="Meta Ads / Google Ads" connectHref="/admin/ai-marketing/settings"
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
  { key: "youtube", icon: Youtube, label: "YouTube", color: "hsl(var(--danger))" },
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
  const { state } = useContentSummary();
  return (
    <div className="space-y-2.5">
      {socialMeta.map((m) => <SocialRow key={m.key} icon={m.icon} label={m.label} p={state.status === "data" ? state.data.platforms[m.key] : undefined} />)}
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
export type { AdsSummary };