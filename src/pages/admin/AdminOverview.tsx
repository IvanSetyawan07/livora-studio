import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Eye,
  FolderKanban,
  Inbox,
  Mail,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sofa,
  Sparkles,
  Star,
  Store,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAdminConsultations } from "@/lib/adminConsultations";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  CardGridSkeleton,
  ErrorState,
  MetricCard,
  PageHeader,
  StatusBadge,
} from "@/components/admin/kit";
import { useThemeTokens } from "@/components/admin/overview/useThemeTokens";
import { DonutChart, Panel, RankBars, TrafficChart } from "@/components/admin/overview/charts";

const PERIODS = [
  { value: 7, label: "7 hari" },
  { value: 30, label: "30 hari" },
  { value: 90, label: "90 hari" },
  { value: 365, label: "1 tahun" },
];

const TYPE_LABEL: Record<string, string> = {
  item: "Produk Furnitur",
  project: "Portofolio Proyek",
  collection: "Koleksi",
  catalog: "Lookbook",
};

const iso = (date: Date) => date.toISOString().slice(0, 10);

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const palette = useThemeTokens();
  const { user, canView, canEdit } = useAdminPermission();

  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsFailed, setAnalyticsFailed] = useState(false);

  const [shopSummary, setShopSummary] = useState<{
    chat_menunggu?: number;
    perlu_harga?: number;
    verifikasi?: number;
    bermasalah?: number;
    fulfillment?: number;
  } | null>(null);
  const [newConsultations, setNewConsultations] = useState<number>(0);
  const [pendingSupport, setPendingSupport] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  const allowAnalytics = canView("analytics");
  const allowShopOrders = canView("shop_orders");
  const allowShopPayments = canView("shop_payments");
  const allowShopInbox = canView("shop_inbox");
  const allowConsult = canView("consultations");
  const allowSupport = canView("support");

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    const jobs: Promise<void>[] = [];

    if (allowAnalytics) {
      setAnalyticsLoading(true);
      const to = iso(new Date());
      const from = iso(new Date(Date.now() - (days - 1) * 86400000));
      jobs.push(
        api
          .get("/admin/analytics/overview", { params: { from, to } })
          .then((r) => {
            setAnalytics(r.data);
            setAnalyticsFailed(false);
          })
          .catch(() => setAnalyticsFailed(true))
          .finally(() => setAnalyticsLoading(false)),
      );
    }

    if (allowShopOrders) {
      jobs.push(
        api
          .get("/admin/shop/summary")
          .then((r) => setShopSummary(r.data ?? null))
          .catch(() => {}),
      );
    }

    if (allowConsult) {
      jobs.push(
        getAdminConsultations()
          .then((list) => setNewConsultations(list.filter((c) => c.status === "new_inquiry").length))
          .catch(() => {}),
      );
    }

    if (allowSupport) {
      jobs.push(
        api
          .get("/admin/support/sessions", { params: { status: "pending_cs" } })
          .then((r) => {
            const list = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
            setPendingSupport(list.length);
          })
          .catch(() => {}),
      );
    }

    await Promise.all(jobs);
    setRefreshing(false);
  }, [allowAnalytics, allowShopOrders, allowConsult, allowSupport, days]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Aksi cepat yang hanya muncul jika peran admin memang bisa mengedit fitur terkait
  const quickActions = useMemo(
    () =>
      [
        canEdit("catalog") && {
          label: "Tambah Produk Furnitur",
          to: "/admin/items",
          icon: Plus,
          primary: true,
        },
        canEdit("landing") && {
          label: "Buat Pop-up Promo",
          to: "/admin/promo-banners",
          icon: Megaphone,
        },
        canEdit("landing") && {
          label: "Atur Halaman Depan",
          to: "/admin/landing",
          icon: Star,
        },
        canEdit("shop_orders") && {
          label: "Kasir Showroom",
          to: "/admin/shop/offline",
          icon: Store,
        },
      ].filter(Boolean) as Array<{ label: string; to: string; icon: any; primary?: boolean }>,
    [canEdit],
  );

  // Daftar antrian operasional harian yang butuh perhatian
  const actionQueues = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      hint: string;
      count: number;
      to: string;
      icon: any;
      urgent?: boolean;
    }> = [];

    if (allowShopPayments && shopSummary) {
      items.push({
        key: "payments",
        label: "Verifikasi Bukti Bayar",
        hint: "Bukti transfer menunggu dicek",
        count: Number(shopSummary.verifikasi ?? 0),
        to: "/admin/shop/payments",
        icon: Wallet,
        urgent: true,
      });
    }
    if (allowShopInbox && shopSummary) {
      items.push({
        key: "wa",
        label: "Chat WhatsApp (Livi)",
        hint: "Pelanggan menunggu balasan CS",
        count: Number(shopSummary.chat_menunggu ?? 0),
        to: "/admin/shop/inbox",
        icon: Inbox,
        urgent: true,
      });
    }
    if (allowSupport) {
      items.push({
        key: "webchat",
        label: "Chat Website (Livi)",
        hint: "Percakapan web menunggu CS",
        count: pendingSupport,
        to: "/admin/support",
        icon: MessageCircle,
        urgent: true,
      });
    }
    if (allowConsult) {
      items.push({
        key: "consult",
        label: "Konsultasi Baru",
        hint: "Permintaan janji temu baru masuk",
        count: newConsultations,
        to: "/admin/consultations",
        icon: MessageCircle,
      });
    }
    if (allowShopOrders && shopSummary) {
      const orderTodo = Number(shopSummary.perlu_harga ?? 0) + Number(shopSummary.bermasalah ?? 0);
      items.push({
        key: "orders",
        label: "Pesanan Perlu Tindakan",
        hint: "Butuh input harga, review, atau solusi",
        count: orderTodo,
        to: "/admin/shop/orders",
        icon: ShoppingBag,
      });
    }
    return items;
  }, [allowShopPayments, allowShopInbox, allowSupport, allowConsult, allowShopOrders, shopSummary, pendingSupport, newConsultations]);

  const totalPendingWork = actionQueues.reduce((sum, q) => sum + q.count, 0);

  // Pintasan modul — hanya tampilkan modul yang boleh diakses peran ini
  const moduleShortcuts = useMemo(() => {
    const inventory = analytics?.inventory ?? {};
    const all = [
      {
        feature: "shop_orders",
        label: "Pesanan & Proses",
        desc: shopSummary ? `${shopSummary.fulfillment ?? 0} pesanan dalam proses` : "Kelola semua pesanan",
        to: "/admin/shop/orders",
        icon: ShoppingBag,
      },
      {
        feature: "catalog",
        label: "Produk Furnitur",
        desc: inventory.items != null ? `${inventory.items} produk di katalog` : "Tambah & atur furnitur",
        to: "/admin/items",
        icon: Sofa,
      },
      {
        feature: "catalog",
        label: "Koleksi & Lookbook",
        desc:
          inventory.collections != null
            ? `${inventory.collections} koleksi · ${inventory.catalogs ?? 0} lookbook`
            : "Kelola koleksi & katalog",
        to: "/admin/collections",
        icon: BookOpen,
      },
      {
        feature: "catalog",
        label: "Kategori & Foto Galeri",
        desc: "Atur foto Permanent Gallery & kategori",
        to: "/admin/taxonomies",
        icon: Tags,
      },
      {
        feature: "projects",
        label: "Portofolio Proyek",
        desc: inventory.projects != null ? `${inventory.projects} proyek terdaftar` : "Kelola proyek interior",
        to: "/admin/projects",
        icon: FolderKanban,
      },
      {
        feature: "marketing",
        label: "Broadcast Email",
        desc: "Kirim newsletter & pengumuman promo",
        to: "/admin/marketing",
        icon: Mail,
      },
      {
        feature: "marketing",
        label: "AI Marketing Studio",
        desc: "Workspace SEO, Iklan, Konten & Prospek",
        to: "/admin/ai-marketing",
        icon: Sparkles,
      },
      {
        feature: "users",
        label: "Data Pelanggan",
        desc: analytics?.usersTotal != null ? `${analytics.usersTotal} akun terdaftar` : "Lihat daftar pelanggan",
        to: "/admin/users",
        icon: Users,
      },
      {
        feature: "wishlists",
        label: "Wishlist Pelanggan",
        desc: "Lihat produk yang paling sering disimpan",
        to: "/admin/wishlists",
        icon: Bookmark,
      },
    ];
    return all.filter((m) => canView(m.feature));
  }, [analytics, shopSummary, canView]);

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totals = analytics?.totals ?? {};
  const donutData = useMemo(
    () =>
      (analytics?.clicksByType ?? []).map((row: any) => ({
        label: TYPE_LABEL[row.type] ?? row.type,
        value: Number(row.clicks ?? 0),
      })),
    [analytics],
  );
  const topItems = useMemo(
    () =>
      (analytics?.topItems ?? []).map((r: any) => ({
        label: r.title ?? "Tanpa nama",
        value: Number(r.clicks ?? 0),
      })),
    [analytics],
  );
  const topProjects = useMemo(
    () =>
      (analytics?.topProjects ?? []).map((r: any) => ({
        label: r.title ?? "Tanpa nama",
        value: Number(r.clicks ?? 0),
      })),
    [analytics],
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={todayStr}
        title={`${greetingByHour()}, ${user?.name?.split(" ")[0] || "Admin"}`}
        description="Pantau antrian pelanggan hari ini dan akses pekerjaan studio Anda dari satu tempat."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-3.5 py-2 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#5E93B8] ${refreshing ? "animate-spin" : ""}`} />
              Muat ulang
            </button>
            {allowAnalytics && (
              <Link
                to="/admin/analytics"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#34383D]"
              >
                <BarChart3 className="h-3.5 w-3.5 text-[#9DC2DC]" />
                Laporan Lengkap
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        }
      />

      {/* Aksi Cepat */}
      {quickActions.length > 0 && (
        <section aria-label="Aksi Cepat">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="mr-1 text-xs font-medium uppercase tracking-[0.16em] text-[#656B73]">Aksi Cepat:</span>
            {quickActions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.to}
                  type="button"
                  onClick={() => navigate(act.to)}
                  className={
                    act.primary
                      ? "inline-flex items-center gap-2 rounded-full bg-[#5E93B8] px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#4A7FA5]"
                      : "inline-flex items-center gap-2 rounded-full border border-[#E2DACF] bg-white px-4 py-2 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {act.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Antrian Perlu Tindakan Hari Ini */}
      {actionQueues.length > 0 && (
        <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-header text-lg text-[#232528]">Perlu Tindakan Hari Ini</h2>
              <p className="text-xs text-[#656B73]">
                Klik kartu mana saja untuk langsung menindaklanjuti permintaan pelanggan.
              </p>
            </div>
            {totalPendingWork > 0 ? (
              <StatusBadge tone="warning">{totalPendingWork} antrian menunggu</StatusBadge>
            ) : (
              <StatusBadge tone="success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Semua antrian terkendali
              </StatusBadge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {actionQueues.map((q) => {
              const Icon = q.icon;
              const active = q.count > 0;
              return (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => navigate(q.to)}
                  className={`group flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                    active
                      ? q.urgent
                        ? "border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50/70"
                        : "border-[#5E93B8]/35 bg-[#EDF4F8]/50 hover:border-[#5E93B8] hover:bg-[#EDF4F8]"
                      : "border-[#EFEAE2] bg-[#FAF8F4]/60 hover:border-[#DED7CC] hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-lg ${
                        active
                          ? q.urgent
                            ? "bg-amber-100 text-amber-800"
                            : "bg-[#5E93B8]/15 text-[#3B7096]"
                          : "bg-white text-[#656B73]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[#656B73] opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                  </div>
                  <div className="mt-3">
                    <p className="font-header text-3xl leading-none text-[#232528]">{q.count}</p>
                    <p className="mt-1.5 text-sm font-medium text-[#232528]">{q.label}</p>
                    <p className="mt-0.5 text-[11px] text-[#656B73]">{q.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Ringkasan Performa Website */}
      {allowAnalytics && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-header text-xl text-[#232528]">Ringkasan Performa Website</h2>
              <p className="text-xs text-[#656B73]">
                Gambaran kunjungan, ketertarikan produk, dan prospek yang masuk dari website Livora.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-[#E2DACF] bg-white p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setDays(p.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    days === p.value ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {analyticsFailed && !analytics ? (
            <ErrorState
              title="Ringkasan performa gagal dimuat"
              description="Data statistik sementara tidak bisa diambil dari server."
              onRetry={() => void loadAll()}
            />
          ) : analyticsLoading && !analytics ? (
            <CardGridSkeleton count={4} />
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard
                  label="Total Tayangan"
                  value={Number(totals.views ?? 0).toLocaleString("id-ID")}
                  note={`Dalam ${days} hari terakhir`}
                  icon={Eye}
                  index={0}
                  onClick={() => navigate("/admin/analytics")}
                />
                <MetricCard
                  label="Klik Konten & Produk"
                  value={Number(totals.clicks ?? 0).toLocaleString("id-ID")}
                  note="Produk, koleksi, lookbook & proyek"
                  icon={MousePointerClick}
                  index={1}
                  onClick={() => navigate("/admin/analytics")}
                />
                <MetricCard
                  label="Konsultasi Masuk"
                  value={Number(totals.leads ?? 0).toLocaleString("id-ID")}
                  note={`${newConsultations} belum ditindaklanjuti`}
                  icon={MessageCircle}
                  index={2}
                  onClick={allowConsult ? () => navigate("/admin/consultations") : undefined}
                />
                <MetricCard
                  label="Pengguna Terdaftar"
                  value={Number(analytics.usersTotal ?? 0).toLocaleString("id-ID")}
                  note={`${analytics.usersActive ?? 0} aktif sekarang · +${analytics.usersNew ?? 0} baru`}
                  icon={Users}
                  index={3}
                  onClick={canView("users") ? () => navigate("/admin/users") : undefined}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Panel
                  title="Tren Kunjungan & Klik"
                  subtitle={`Pergerakan harian selama ${days} hari terakhir`}
                  className="lg:col-span-2"
                >
                  <TrafficChart
                    data={analytics.timeline ?? []}
                    series={[
                      { key: "views", label: "Tayangan", color: "#5E93B8" },
                      { key: "clicks", label: "Klik Konten", color: "#232528" },
                    ]}
                    height={260}
                  />
                </Panel>

                <Panel title="Minat Pengunjung" subtitle="Bagian website yang paling banyak diklik">
                  <DonutChart data={donutData} palette={palette} size={184} />
                </Panel>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel
                  title="Produk Furnitur Terpopuler"
                  subtitle="Paling sering dibuka pengunjung"
                  right={
                    canView("catalog") ? (
                      <Link to="/admin/items" className="text-xs font-medium text-[#5E93B8] hover:underline">
                        Kelola produk →
                      </Link>
                    ) : null
                  }
                >
                  <RankBars
                    data={topItems}
                    color="#5E93B8"
                    max={5}
                    onSelect={canView("catalog") ? () => navigate("/admin/items") : undefined}
                    emptyLabel="Belum ada klik produk pada periode ini."
                  />
                </Panel>

                <Panel
                  title="Portofolio Proyek Terpopuler"
                  subtitle="Proyek interior yang paling banyak dilihat"
                  right={
                    canView("projects") ? (
                      <Link to="/admin/projects" className="text-xs font-medium text-[#5E93B8] hover:underline">
                        Kelola proyek →
                      </Link>
                    ) : null
                  }
                >
                  <RankBars
                    data={topProjects}
                    color="#232528"
                    max={5}
                    onSelect={canView("projects") ? () => navigate("/admin/projects") : undefined}
                    emptyLabel="Belum ada klik proyek pada periode ini."
                  />
                </Panel>
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* Pintasan Modul Studio */}
      {moduleShortcuts.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-header text-xl text-[#232528]">Pintasan Modul Studio</h2>
            <span className="text-xs text-[#656B73]">Tekan Ctrl+K kapan saja untuk cari menu cepat</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {moduleShortcuts.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.to}
                  type="button"
                  onClick={() => navigate(m.to)}
                  className="group flex items-center gap-3.5 rounded-xl border border-[#EAE4DA] bg-white p-4 text-left transition-all hover:border-[#5E93B8]/60 hover:shadow-sm"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EDF4F8] text-[#5E93B8] transition-colors group-hover:bg-[#5E93B8] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#232528]">{m.label}</p>
                    <p className="truncate text-xs text-[#656B73]">{m.desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#656B73] opacity-50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#5E93B8] group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
