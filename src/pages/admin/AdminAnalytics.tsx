import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { pdf } from "@react-pdf/renderer";
import { Download, CalendarRange, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AnalyticsPDF from "@/components/livora/AnalyticsPDF";
import {
  AdminHelpBanner,
  CardGridSkeleton,
  ErrorState,
  MetricCard,
  PageHeader,
  StatusBadge,
} from "@/components/admin/kit";

type Scope = "all" | "catalog" | "marketing" | "audience";

const SCOPES: { value: Scope; label: string; hint: string }[] = [
  { value: "all", label: "Semua Laporan", hint: "Ringkasan menyeluruh katalog, marketing, dan audiens" },
  { value: "catalog", label: "Katalog & Portofolio", hint: "Produk furnitur, koleksi, lookbook, dan proyek" },
  { value: "marketing", label: "Marketing & Prospek", hint: "Broadcast email, konsultasi masuk, dan wishlist" },
  { value: "audience", label: "Pengguna & Aktivitas", hint: "Pengguna terdaftar, sesi chat, dan status online" },
];

const PRESETS = [
  { label: "7 Hari", days: 7 },
  { label: "30 Hari", days: 30 },
  { label: "90 Hari", days: 90 },
  { label: "1 Tahun", days: 365 },
];

const CONSULTATION_STAGE_LABEL: Record<string, string> = {
  new_inquiry: "Permintaan Baru",
  contacted: "Sudah Dihubungi",
  scheduled: "Jadwal Terkonfirmasi",
  in_progress: "Dalam Diskusi / Penawaran",
  agreement_sent: "Perjanjian Dikirim",
  dp_pending: "Menunggu DP",
  dp_paid: "DP Diterima",
  project_running: "Proyek Berjalan",
  final_payment_pending: "Menunggu Pelunasan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  rejected: "Ditolak",
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  item: "Produk",
  project: "Proyek",
  collection: "Koleksi",
  catalog: "Lookbook",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));

const PIE_COLORS = ["#232528", "#5E93B8", "#8AB4D0", "#656B73", "#C5BFB5"];

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(iso(new Date()));
  const [scope, setScope] = useState<Scope>("all");

  const activePreset = useMemo(() => {
    const today = iso(new Date());
    if (to !== today) return null;
    const hit = PRESETS.find((p) => daysAgo(p.days - 1) === from);
    return hit?.days ?? null;
  }, [from, to]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get("/admin/analytics/overview", { params: { from, to, scope } }),
      api.get("/admin/analytics/users").catch(() => ({ data: [] })),
    ])
      .then(([ovRes, usrRes]) => {
        setData(ovRes.data);
        setUsers(Array.isArray(usrRes.data) ? usrRes.data : []);
      })
      .catch((err: any) => {
        setError(err?.message || "Gagal mengambil data analitik dari server.");
      })
      .finally(() => setLoading(false));
  }, [from, to, scope]);

  useEffect(() => {
    load();
  }, [load]);

  const fmtSec = (s: number) => {
    if (!s) return "0 dtk";
    const m = Math.floor(s / 60);
    return m > 0 ? `${m} mnt ${Math.round(s % 60)} dtk` : `${Math.round(s)} dtk`;
  };

  const showCatalog = scope === "all" || scope === "catalog";
  const showMarketing = scope === "all" || scope === "marketing";
  const showAudience = scope === "all" || scope === "audience";

  const kpis = useMemo(() => {
    if (!data) return [];
    const t = data.totals ?? {};
    const base = [
      { label: "Total Klik Konten", value: Number(t.clicks ?? 0).toLocaleString("id-ID") },
      { label: "Total Tayangan", value: Number(t.views ?? 0).toLocaleString("id-ID") },
      { label: "Rata-rata Durasi Baca", value: fmtSec(t.avgDuration ?? 0) },
    ];
    const mkt = [
      { label: "Campaign Email", value: Number(data.marketing?.campaignsTotal ?? 0).toLocaleString("id-ID") },
      { label: "Email Terkirim", value: Number(data.marketing?.emailsSent ?? 0).toLocaleString("id-ID") },
      { label: "Konsultasi Baru", value: Number(t.leads ?? 0).toLocaleString("id-ID") },
      { label: "Disimpan ke Wishlist", value: Number(t.wishlist ?? 0).toLocaleString("id-ID") },
    ];
    const aud = [
      { label: "Total Pengguna", value: Number(data.usersTotal ?? 0).toLocaleString("id-ID") },
      { label: "Pengguna Baru", value: Number(data.usersNew ?? 0).toLocaleString("id-ID") },
      { label: "Sedang Aktif (5 mnt)", value: Number(data.usersActive ?? 0).toLocaleString("id-ID") },
      { label: "Sesi Chat Web", value: Number(t.chatSessions ?? 0).toLocaleString("id-ID") },
    ];
    if (scope === "catalog") return base;
    if (scope === "marketing") return mkt;
    if (scope === "audience") return aud;
    return [...base, mkt[2], aud[1]];
  }, [data, scope]);

  const clicksByTypeData = useMemo(
    () =>
      (data?.clicksByType ?? []).map((row: any) => ({
        ...row,
        label: CONTENT_TYPE_LABEL[row.type] ?? row.type,
      })),
    [data],
  );

  const leadsByStageData = useMemo(
    () =>
      (data?.leads?.byStatus ?? []).map((row: any) => ({
        ...row,
        stageLabel: CONSULTATION_STAGE_LABEL[row.status] ?? String(row.status ?? "").replace(/_/g, " "),
      })),
    [data],
  );

  const exportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const blob = await pdf(<AnalyticsPDF overview={data} users={users} scope={scope} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `livora-laporan-${scope}-${from}_${to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Laporan PDF berhasil diunduh");
    } catch (err: any) {
      toast.error(err?.message || "Gagal membuat file PDF. Coba lagi.");
    } finally {
      setExporting(false);
    }
  };

  const viewStats = Array.isArray(data?.viewStats) ? data.viewStats : [];
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];

  return (
    <div>
      <PageHeader
        eyebrow="Laporan & Statistik"
        title="Laporan Performa Website"
        description={
          data?.period
            ? `Periode laporan: ${data.period.from} s/d ${data.period.to} (${data.period.days} hari)`
            : "Pantau trafik pengunjung, produk paling diminati, konsultasi, dan unduh laporan PDF."
        }
        actions={
          <button
            type="button"
            onClick={exportPDF}
            disabled={exporting || !data}
            className="inline-flex items-center gap-2 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#34383D] disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-[#9DC2DC]" />}
            {exporting ? "Menyiapkan PDF…" : "Unduh Laporan PDF"}
          </button>
        }
      />

      <AdminHelpBanner storageKey="analytics-intro">
        Gunakan filter tanggal dan jenis laporan di bawah untuk meninjau performa website Livora. Tombol{" "}
        <strong>Unduh Laporan PDF</strong> otomatis mengikuti rentang tanggal dan jenis laporan yang sedang dipilih.
      </AdminHelpBanner>

      {/* Filter Periode & Jenis Laporan */}
      <div className="mb-7 flex flex-wrap items-end gap-4 rounded-2xl border border-[#EAE4DA] bg-white p-5">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#656B73]">
            <CalendarRange size={13} className="text-[#5E93B8]" /> Dari Tanggal
          </label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#656B73]">Sampai Tanggal</label>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const isActive = activePreset === p.days;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setFrom(daysAgo(p.days - 1));
                  setTo(iso(new Date()));
                }}
                className={`h-10 rounded-lg border px-3 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-[#232528] bg-[#232528] text-white"
                    : "border-[#E2DACF] bg-white text-[#4C5259] hover:border-[#5E93B8] hover:text-[#232528]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="min-w-[230px] flex-1">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#656B73]">
            <Filter size={13} className="text-[#5E93B8]" /> Jenis Laporan
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
            className="h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
          >
            {SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-[#656B73]">{SCOPES.find((s) => s.value === scope)?.hint}</p>
        </div>

        {loading && data && (
          <div className="flex items-center gap-1.5 pb-2 text-xs text-[#5E93B8]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memperbarui…
          </div>
        )}
      </div>

      {error && !data && (
        <ErrorState title="Gagal memuat laporan" description={error} onRetry={load} />
      )}

      {loading && !data && <CardGridSkeleton count={4} />}

      {data && (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-65" : "opacity-100"}`}>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {kpis.map((k, idx) => (
              <MetricCard key={k.label} label={k.label} value={k.value} index={idx} />
            ))}
          </div>

          {/* Traffic timeline */}
          {(showCatalog || showAudience) && (
            <Card title="Tren Kunjungan & Klik Harian">
              <div style={{ width: "100%", height: 290 }}>
                {timeline.length ? (
                  <ResponsiveContainer>
                    <AreaChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAE4DA" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#656B73" }} minTickGap={24} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#656B73" }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area
                        type="monotone"
                        dataKey="views"
                        name="Tayangan"
                        stroke="#5E93B8"
                        fill="#5E93B8"
                        fillOpacity={0.16}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        name="Klik Konten"
                        stroke="#232528"
                        fill="#232528"
                        fillOpacity={0.08}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty />
                )}
              </div>
            </Card>
          )}

          {showCatalog && (
            <>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card title="Klik per Kategori Konten">
                    <div style={{ width: "100%", height: 260 }}>
                      {timeline.length ? (
                        <ResponsiveContainer>
                          <BarChart data={timeline}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#EAE4DA" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#656B73" }} minTickGap={24} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#656B73" }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="item" name="Produk" stackId="a" fill="#232528" />
                            <Bar dataKey="collection" name="Koleksi" stackId="a" fill="#5E93B8" />
                            <Bar dataKey="catalog" name="Lookbook" stackId="a" fill="#8AB4D0" />
                            <Bar dataKey="project" name="Proyek" stackId="a" fill="#C5BFB5" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Empty />
                      )}
                    </div>
                  </Card>
                </div>

                <Card title="Proporsi Klik Pengunjung">
                  <div style={{ width: "100%", height: 260 }}>
                    {clicksByTypeData.length ? (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={clicksByTypeData}
                            dataKey="clicks"
                            nameKey="label"
                            innerRadius={52}
                            outerRadius={90}
                            paddingAngle={2}
                          >
                            {clicksByTypeData.map((_: any, i: number) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty />
                    )}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <HorizontalRankCard title="Produk Furnitur Paling Banyak Diklik" data={data.topItems} color="#232528" />
                <HorizontalRankCard title="Koleksi Paling Banyak Diklik" data={data.topCollections} color="#5E93B8" />
                <HorizontalRankCard title="Lookbook Paling Banyak Diklik" data={data.topCatalogs} color="#8AB4D0" />
                <HorizontalRankCard title="Proyek Paling Banyak Diklik" data={data.topProjects} color="#656B73" />
              </div>

              <Card title="Keterlibatan Pengunjung (Tayangan & Lama Baca)">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#EAE4DA] text-xs uppercase tracking-[0.14em] text-[#656B73]">
                      <tr>
                        <th className="p-2.5 text-left">Nama Konten</th>
                        <th className="p-2.5 text-left">Jenis</th>
                        <th className="p-2.5 text-right">Tayangan</th>
                        <th className="p-2.5 text-right">Rata-rata Baca</th>
                        <th className="p-2.5 text-right">Total Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewStats.map((v: any, i: number) => (
                        <tr key={i} className="border-b border-[#F2EDE5] last:border-0">
                          <td className="p-2.5 font-medium text-[#232528]">{v.title ?? `#${v.target_id}`}</td>
                          <td className="p-2.5 text-[#656B73]">
                            {CONTENT_TYPE_LABEL[v.target_type] ?? v.target_type}
                          </td>
                          <td className="p-2.5 text-right tabular-nums">{Number(v.views ?? 0).toLocaleString("id-ID")}</td>
                          <td className="p-2.5 text-right tabular-nums">{fmtSec(v.avg_seconds)}</td>
                          <td className="p-2.5 text-right tabular-nums">{fmtSec(v.total_seconds)}</td>
                        </tr>
                      ))}
                      {viewStats.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-[#656B73]">
                            Belum ada data tayangan pada periode ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {showMarketing && (
            <>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card title="Pengiriman Broadcast Email">
                  <div style={{ width: "100%", height: 260 }}>
                    {data.marketing?.timeline?.length ? (
                      <ResponsiveContainer>
                        <AreaChart data={data.marketing.timeline}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAE4DA" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#656B73" }} minTickGap={24} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#656B73" }} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="sent"
                            name="Email Terkirim"
                            stroke="#5E93B8"
                            fill="#5E93B8"
                            fillOpacity={0.18}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty text="Belum ada pengiriman email pada periode ini." />
                    )}
                  </div>
                </Card>

                <Card title="Konsultasi per Tahap Proyek">
                  <div style={{ width: "100%", height: 260 }}>
                    {leadsByStageData.length ? (
                      <ResponsiveContainer>
                        <BarChart data={leadsByStageData} layout="vertical" margin={{ left: 10, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAE4DA" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#656B73" }} />
                          <YAxis
                            type="category"
                            dataKey="stageLabel"
                            width={150}
                            tick={{ fontSize: 11, fill: "#232528" }}
                          />
                          <Tooltip />
                          <Bar dataKey="total" name="Jumlah Konsultasi" fill="#232528" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty text="Belum ada data konsultasi pada periode ini." />
                    )}
                  </div>
                </Card>
              </div>

              <Card title="Riwayat Broadcast Email">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#EAE4DA] text-xs uppercase tracking-[0.14em] text-[#656B73]">
                      <tr>
                        <th className="p-2.5 text-left">Nama Campaign</th>
                        <th className="p-2.5 text-left">Subjek Email</th>
                        <th className="p-2.5 text-left">Status</th>
                        <th className="p-2.5 text-right">Terkirim</th>
                        <th className="p-2.5 text-right">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.marketing?.campaigns ?? []).map((c: any) => (
                        <tr key={c.id} className="border-b border-[#F2EDE5] last:border-0">
                          <td className="p-2.5 font-medium text-[#232528]">{c.name ?? "—"}</td>
                          <td className="p-2.5 text-[#656B73]">{c.subject ?? "—"}</td>
                          <td className="p-2.5">
                            <StatusBadge tone={c.status === "sent" ? "success" : "warning"}>
                              {c.status === "sent" ? "Terkirim" : c.status === "draft" ? "Draf" : c.status}
                            </StatusBadge>
                          </td>
                          <td className="p-2.5 text-right tabular-nums">{Number(c.sent_count ?? 0).toLocaleString("id-ID")}</td>
                          <td className="p-2.5 text-right text-xs text-[#656B73]">
                            {(c.sent_at ?? c.created_at ?? "").toString().slice(0, 10)}
                          </td>
                        </tr>
                      ))}
                      {!(data.marketing?.campaigns ?? []).length && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-[#656B73]">
                            Belum ada broadcast email pada periode ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {showAudience && (
            <Card title="Aktivitas Pengguna Terkini">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#EAE4DA] text-xs uppercase tracking-[0.14em] text-[#656B73]">
                    <tr>
                      <th className="p-2.5 text-left">Nama</th>
                      <th className="p-2.5 text-left">Email</th>
                      <th className="p-2.5 text-left">Peran</th>
                      <th className="p-2.5 text-left">Status</th>
                      <th className="p-2.5 text-left">Terakhir Aktif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-[#F2EDE5] last:border-0">
                        <td className="p-2.5 font-medium text-[#232528]">{u.name}</td>
                        <td className="p-2.5 text-[#656B73]">{u.email}</td>
                        <td className="p-2.5 capitalize text-[#4C5259]">
                          {u.role === "admin" ? "Tim Admin" : "Pelanggan"}
                        </td>
                        <td className="p-2.5">
                          <StatusBadge tone={u.is_online ? "success" : "neutral"}>
                            {u.is_online ? "Online" : "Offline"}
                          </StatusBadge>
                        </td>
                        <td className="p-2.5 text-xs text-[#656B73]">
                          {u.last_seen_at ? new Date(u.last_seen_at).toLocaleString("id-ID") : "—"}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-[#656B73]">
                          Belum ada aktivitas pengguna tercatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#EAE4DA] bg-white p-5 sm:p-6">
      <h2 className="font-header mb-4 text-lg text-[#232528]">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ text = "Belum ada data pada periode ini." }: { text?: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[#656B73]">
      {text}
    </div>
  );
}

function HorizontalRankCard({ title, data, color }: { title: string; data?: any[]; color: string }) {
  const rows = Array.isArray(data) ? data.slice(0, 7) : [];
  return (
    <div className="rounded-2xl border border-[#EAE4DA] bg-white p-5 sm:p-6">
      <h2 className="font-header mb-4 text-lg text-[#232528]">{title}</h2>
      <div style={{ width: "100%", height: 260 }}>
        {rows.length > 0 ? (
          <ResponsiveContainer>
            <BarChart data={rows} layout="vertical" margin={{ left: 6, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE4DA" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#656B73" }} />
              <YAxis
                type="category"
                dataKey="title"
                width={145}
                tick={{ fontSize: 11, fill: "#232528" }}
                tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
              />
              <Tooltip />
              <Bar dataKey="clicks" name="Jumlah Klik" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </div>
    </div>
  );
}
