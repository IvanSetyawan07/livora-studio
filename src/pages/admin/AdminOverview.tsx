import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { getAdminConsultations } from "@/lib/adminConsultations";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bookmark,
  Boxes,
  Clock3,
  Eye,
  Filter,
  FolderKanban,
  Mail,
  MessageCircle,
  MousePointerClick,
  RefreshCw,
  Sofa,
  Tags,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import { useThemeTokens } from "@/components/admin/overview/useThemeTokens";
import {
  CountUp,
  DonutChart,
  Panel,
  RankBars,
  Sparkline,
  TrafficChart,
  compactNumber,
} from "@/components/admin/overview/charts";

const OverviewScene = lazy(() => import("@/components/admin/overview/OverviewScene"));
const ThreeBars = lazy(() => import("@/components/admin/overview/ThreeBars"));

type Group = "all" | "catalog" | "marketing" | "audience";

const GROUPS: { value: Group; label: string }[] = [
  { value: "all", label: "All Features" },
  { value: "catalog", label: "Catalog & Collection" },
  { value: "marketing", label: "Marketing & Ads" },
  { value: "audience", label: "Audience & Support" },
];

const PERIODS = [
  { value: 7, label: "7 hari" },
  { value: 30, label: "30 hari" },
  { value: 90, label: "90 hari" },
  { value: 365, label: "1 tahun" },
];

const TYPE_LABEL: Record<string, string> = {
  item: "Items",
  project: "Projects",
  collection: "Collections",
  catalog: "Catalogs",
};

const iso = (date: Date) => date.toISOString().slice(0, 10);

export default function AdminOverview() {
  const navigate = useNavigate();
  const palette = useThemeTokens();

  const [data, setData] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newInquiries, setNewInquiries] = useState<number | null>(null);
  const [group, setGroup] = useState<Group>("all");
  const [days, setDays] = useState(30);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const to = iso(new Date());
    const from = iso(new Date(Date.now() - (days - 1) * 86400000));
    setLoading(true);
    api
      .get("/admin/analytics/overview", { params: { from, to } })
      .then((response) => {
        if (cancelled) return;
        setData(response.data);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, reloadKey]);

  useEffect(() => {
    getAdminConsultations()
      .then((list) => setNewInquiries(list.filter((c) => c.status === "new_inquiry").length))
      .catch(() => setNewInquiries(0));
  }, []);

  const modules = useMemo(() => {
    const totals = data?.totals ?? {};
    const inventory = data?.inventory ?? {};
    return [
      { group: "catalog", label: "Items / Furniture", value: inventory.items ?? 0, note: `${data?.topItems?.length ?? 0} item ter-klik`, to: "/admin/items", icon: Sofa },
      { group: "catalog", label: "Collections", value: inventory.collections ?? 0, note: `${data?.topCollections?.length ?? 0} collection ter-klik`, to: "/admin/collections", icon: BookOpen },
      { group: "catalog", label: "Catalogs", value: inventory.catalogs ?? 0, note: `${data?.topCatalogs?.length ?? 0} catalog ter-klik`, to: "/admin/catalogs", icon: BookOpen },
      { group: "catalog", label: "Projects", value: inventory.projects ?? 0, note: `${data?.topProjects?.length ?? 0} project ter-klik`, to: "/admin/projects", icon: FolderKanban },
      { group: "catalog", label: "Taxonomies", value: "—", note: "Type, theme, category, banner", to: "/admin/taxonomies", icon: Tags },
      { group: "marketing", label: "Email Campaigns", value: data?.marketing?.campaignsTotal ?? 0, note: `${data?.marketing?.emailsSent ?? 0} email terkirim`, to: "/admin/marketing", icon: Mail },
      { group: "marketing", label: "Consultations", value: totals.leads ?? 0, note: `${newInquiries ?? 0} inquiry baru`, to: "/admin/consultations", icon: MessageCircle, badge: newInquiries ?? 0 },
      { group: "marketing", label: "Saved (Wishlist)", value: totals.wishlist ?? 0, note: "Item disimpan user", to: "/admin/wishlists", icon: Bookmark },
      { group: "audience", label: "Users", value: data?.usersTotal ?? 0, note: `${data?.usersActive ?? 0} online sekarang`, to: "/admin/users", icon: Users },
      { group: "audience", label: "Chat Support", value: totals.chatSessions ?? 0, note: "Sesi chat periode ini", to: "/admin/support", icon: MessageCircle },
      { group: "audience", label: "Analytics", value: totals.clicks ?? 0, note: `${totals.views ?? 0} views`, to: "/admin/analytics", icon: BarChart3 },
    ].filter((module) => group === "all" || module.group === group);
  }, [data, group, newInquiries]);

  const traffic = useMemo(
    () =>
      (data?.timeline ?? []).map((point: any) => ({
        date: point.date,
        clicks: Number(point.clicks ?? 0),
        views: Number(point.views ?? 0),
      })),
    [data],
  );

  const marketingTraffic = useMemo(
    () =>
      (data?.marketing?.timeline ?? []).map((point: any) => ({
        date: point.date,
        sent: Number(point.sent ?? 0),
      })),
    [data],
  );

  const clickTypes = useMemo(
    () =>
      (data?.clicksByType ?? [])
        .map((row: any) => ({
          label: TYPE_LABEL[row.type] ?? String(row.type ?? "Lainnya"),
          value: Number(row.clicks ?? 0),
        }))
        .filter((row: { value: number }) => row.value > 0),
    [data],
  );

  const itemBars = useMemo(
    () =>
      (data?.topItems ?? [])
        .map((item: any) => ({ label: String(item.title ?? "—"), value: Number(item.clicks ?? 0) }))
        .slice(0, 8),
    [data],
  );

  const trafficSeries = useMemo(
    () => [
      { key: "clicks", label: "Clicks", color: palette.ink },
      { key: "views", label: "Views", color: palette.bronze },
    ],
    [palette.ink, palette.bronze],
  );

  const marketingSeries = useMemo(
    () => [{ key: "sent", label: "Email terkirim", color: palette.bronze }],
    [palette.bronze],
  );

  const scenePalette = useMemo(
    () => ({
      ink: palette.ink,
      bronze: palette.bronze,
      accent: palette.accent,
      border: palette.border,
    }),
    [palette.ink, palette.bronze, palette.accent, palette.border],
  );

  const energy = useMemo(() => {
    const totals = data?.totals ?? {};
    if (!traffic.length) return 0.2;
    const perDay = (Number(totals.clicks ?? 0) + Number(totals.views ?? 0)) / traffic.length;
    return Math.min(1, Math.max(0.12, perDay / 60));
  }, [data, traffic]);

  const kpis = useMemo(() => {
    if (!data) return [];
    const totals = data.totals ?? {};
    const inventory = data.inventory ?? {};
    const clicksSpark = traffic.map((point: any) => Number(point.clicks ?? 0));
    const viewsSpark = traffic.map((point: any) => Number(point.views ?? 0));

    if (group === "catalog") {
      return [
        { label: "Items", value: Number(inventory.items ?? 0), note: "Katalog furniture aktif", icon: Sofa },
        { label: "Collections", value: Number(inventory.collections ?? 0), note: "Koleksi tersusun", icon: BookOpen },
        { label: "Catalogs", value: Number(inventory.catalogs ?? 0), note: "Katalog digital", icon: Boxes },
        { label: "Projects", value: Number(inventory.projects ?? 0), note: "Project & ruang 3D", icon: FolderKanban },
      ];
    }
    if (group === "marketing") {
      return [
        { label: "Campaigns", value: Number(data.marketing?.campaignsTotal ?? 0), note: "Campaign pada periode ini", icon: Mail },
        { label: "Emails Sent", value: Number(data.marketing?.emailsSent ?? 0), note: "Total email terkirim", icon: Target },
        { label: "New Leads", value: Number(totals.leads ?? 0), note: "Konsultasi masuk", icon: MessageCircle },
        { label: "Saved Items", value: Number(totals.wishlist ?? 0), note: "Item disimpan user", icon: Bookmark },
      ];
    }
    if (group === "audience") {
      return [
        { label: "Total Users", value: Number(data.usersTotal ?? 0), note: "Akun terdaftar", icon: Users },
        { label: "New Users", value: Number(data.usersNew ?? 0), note: "Baru di periode ini", icon: UserPlus },
        { label: "Active (5 min)", value: Number(data.usersActive ?? 0), note: "Sedang online", icon: MousePointerClick },
        { label: "Chat Sessions", value: Number(totals.chatSessions ?? 0), note: "Sesi support", icon: MessageCircle },
      ];
    }
    return [
      { label: "Total Clicks", value: Number(totals.clicks ?? 0), note: "Interaksi katalog", icon: MousePointerClick, spark: clicksSpark },
      { label: "Total Views", value: Number(totals.views ?? 0), note: "Halaman dilihat", icon: Eye, spark: viewsSpark },
      { label: "New Users", value: Number(data.usersNew ?? 0), note: "Registrasi periode ini", icon: UserPlus },
      { label: "New Leads", value: Number(totals.leads ?? 0), note: "Konsultasi masuk", icon: Target },
    ];
  }, [data, group, traffic]);

  if (!data) {
    if (failed) {
      return (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="serif text-2xl">Overview belum bisa dimuat</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Koneksi ke endpoint analytics gagal. Coba muat ulang.
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] hover:bg-muted"
          >
            <RefreshCw size={13} /> Coba lagi
          </button>
        </div>
      );
    }
    return <OverviewSkeleton />;
  }

  const totals = data.totals ?? {};
  const chips = [
    { icon: Users, label: `${data.usersActive ?? 0} online` },
    { icon: MousePointerClick, label: `${compactNumber(totals.clicks ?? 0)} klik` },
    { icon: Eye, label: `${compactNumber(totals.views ?? 0)} views` },
    { icon: Clock3, label: `${totals.avgDuration ?? 0} dtk rata-rata` },
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Dashboard</p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.period?.from} → {data.period?.to}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            {PERIODS.map((period) => (
              <button
                key={period.value}
                type="button"
                onClick={() => setDays(period.value)}
                className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${
                  days === period.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Filter
              size={12}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <select
              value={group}
              onChange={(event) => setGroup(event.target.value as Group)}
              className="appearance-none rounded-full border border-border bg-card py-2 pl-8 pr-4 text-[11px] uppercase tracking-[0.14em]"
            >
              {GROUPS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            aria-label="Muat ulang data"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Hero + 3D */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary/60 via-card to-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,hsl(var(--livora-bronze)/0.16),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_45%,hsl(var(--livora-bronze)/0.06))]" />
        <div className="relative grid items-center lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--livora-bronze))] opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--livora-bronze))]" />
              </span>
              Live overview
            </p>
            <h1 className="serif mt-4 text-4xl leading-[1.05] sm:text-5xl">
              The <span className="italic">Livora</span> pulse.
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Sinyal katalog, audiens, dan marketing dalam satu pandangan —
              grafik bisa disentuh, di-hover, dan disematkan.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-[11px] backdrop-blur"
                >
                  <chip.icon size={12} className="text-muted-foreground" />
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
          <div className="relative h-[240px] sm:h-[290px] lg:h-[340px]">
            <Suspense
              fallback={
                <div className="absolute inset-0 grid place-items-center">
                  <div className="h-48 w-48 animate-pulse rounded-full bg-[radial-gradient(circle_at_35%_30%,hsl(var(--accent)/0.35),transparent_70%)]" />
                </div>
              }
            >
              <OverviewScene palette={scenePalette} isDark={palette.isDark} energy={energy} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[hsl(var(--livora-bronze)/0.5)] hover:shadow-[0_20px_45px_-28px_rgba(0,0,0,0.45)]"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--livora-bronze))] to-transparent opacity-60" />
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] uppercase leading-tight tracking-[0.22em] text-muted-foreground">
                  {kpi.label}
                </p>
                <Icon size={14} className="shrink-0 text-muted-foreground/70" />
              </div>
              <p className="serif mt-3 text-4xl leading-none">
                <CountUp value={kpi.value} />
              </p>
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{kpi.note}</p>
              {"spark" in kpi && kpi.spark && kpi.spark.length > 1 ? (
                <div className="mt-4 -mb-1 opacity-80 transition-opacity group-hover:opacity-100">
                  <Sparkline
                    values={kpi.spark as number[]}
                    color={index === 1 ? palette.bronze : palette.ink}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Traffic + distribusi */}
      {group !== "marketing" ? (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Panel
            title="Traffic over time"
            subtitle="Klik dan view harian — hover untuk detail, klik untuk menyematkan"
            right={
              <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {traffic.length} hari
              </span>
            }
          >
            <TrafficChart data={traffic} series={trafficSeries} height={320} />
          </Panel>

          <Panel title="Distribusi klik" subtitle="Per jenis konten pada periode ini">
            <DonutChart data={clickTypes} palette={palette} />
          </Panel>
        </div>
      ) : null}

      {/* 3D top items */}
      {group === "all" || group === "catalog" ? (
        <Panel
          title="Top items — ruang 3D"
          subtitle="Tinggi batang mewakili jumlah klik. Klik batang untuk membuka katalog."
          right={
            <button
              type="button"
              onClick={() => navigate("/admin/items")}
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Lihat semua <ArrowUpRight size={13} />
            </button>
          }
        >
          <div className="h-[320px] sm:h-[360px]">
            <Suspense
              fallback={
                <div className="grid h-full place-items-center">
                  <div className="h-32 w-full max-w-md animate-pulse rounded-lg bg-muted/60" />
                </div>
              }
            >
              <ThreeBars
                data={itemBars}
                palette={scenePalette}
                isDark={palette.isDark}
                onSelect={() => navigate("/admin/items")}
              />
            </Suspense>
          </div>
        </Panel>
      ) : null}

      {/* Ranking */}
      {group === "all" || group === "catalog" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Panel title="Top items" subtitle="Berdasarkan klik">
            <RankBars
              data={(data.topItems ?? []).map((item: any) => ({
                label: String(item.title ?? "—"),
                value: Number(item.clicks ?? 0),
              }))}
              color={palette.ink}
              onSelect={() => navigate("/admin/items")}
            />
          </Panel>
          <Panel title="Top collections" subtitle="Berdasarkan klik">
            <RankBars
              data={(data.topCollections ?? []).map((item: any) => ({
                label: String(item.title ?? "—"),
                value: Number(item.clicks ?? 0),
              }))}
              color={palette.bronze}
              onSelect={() => navigate("/admin/collections")}
            />
          </Panel>
          <Panel title="Top catalogs" subtitle="Berdasarkan klik">
            <RankBars
              data={(data.topCatalogs ?? []).map((item: any) => ({
                label: String(item.title ?? "—"),
                value: Number(item.clicks ?? 0),
              }))}
              color={palette.accent}
              onSelect={() => navigate("/admin/catalogs")}
            />
          </Panel>
          <Panel title="Top projects" subtitle="Berdasarkan klik">
            <RankBars
              data={(data.topProjects ?? []).map((item: any) => ({
                label: String(item.title ?? "—"),
                value: Number(item.clicks ?? 0),
              }))}
              color={palette.muted}
              onSelect={() => navigate("/admin/projects")}
            />
          </Panel>
        </div>
      ) : null}

      {/* Marketing */}
      {group === "marketing" ? (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Panel
            title="Email campaigns"
            subtitle={marketingTraffic.length ? "Email terkirim per hari" : undefined}
          >
            <TrafficChart data={marketingTraffic} series={marketingSeries} height={300} />
          </Panel>
          <Panel title="Status campaign" subtitle="Ringkasan status pada periode ini">
            {(data.marketing?.byStatus ?? []).length ? (
              <div className="space-y-2">
                {(data.marketing.byStatus ?? []).map((row: any) => (
                  <div
                    key={String(row.status)}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-background/40 px-3 py-2.5"
                  >
                    <span className="text-xs capitalize text-foreground/85">
                      {String(row.status ?? "—")}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {Number(row.total ?? 0)} campaign · {Number(row.sent ?? 0)} terkirim
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-xs text-muted-foreground">
                Belum ada campaign pada periode ini.
              </p>
            )}
          </Panel>
        </div>
      ) : null}

      {/* Feature summary */}
      <Panel title="Feature summary" subtitle="Semua modul dalam satu pandangan">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module: any) => {
            const Icon = module.icon;
            return (
              <button
                key={module.label}
                type="button"
                onClick={() => navigate(module.to)}
                className="group flex items-start gap-3 rounded-lg border border-border bg-background/40 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[hsl(var(--livora-bronze)/0.55)] hover:bg-card"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border/70 bg-card text-muted-foreground transition-colors group-hover:text-foreground">
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="serif truncate text-base leading-tight">{module.label}</span>
                    {module.badge > 0 ? (
                      <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[9px] uppercase tracking-wider text-background">
                        {module.badge} new
                      </span>
                    ) : null}
                  </span>
                  <span className="serif mt-1 block text-2xl leading-none">
                    {typeof module.value === "number" ? (
                      <CountUp value={module.value} />
                    ) : (
                      module.value
                    )}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {module.note}
                  </span>
                </span>
                <ArrowUpRight
                  size={14}
                  className="mt-1 shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground"
                />
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-40 animate-pulse rounded bg-muted/70" />
      </div>
      <div className="h-[280px] animate-pulse rounded-2xl border border-border bg-muted/40" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
    </div>
  );
}
