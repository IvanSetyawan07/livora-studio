import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL, authStorage } from "@/lib/api";
import { adminShop, rupiah } from "@/lib/shop";
import { PageHeader, AdminHelpBanner, TableSkeleton } from "@/components/admin/kit";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";

type Tab = "documents" | "orders" | "customers" | "monthly" | "audit";

const MONEY_COLS = /(total|subtotal|ppn|dpp|ongkir|diskon|harga|omzet|nominal|nilai|amount|fee|pendapatan)/i;

function formatCell(col: string, val: any) {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Ya" : "Tidak";
  if (typeof val === "number") {
    if (MONEY_COLS.test(col)) return rupiah(val);
    return val.toLocaleString("id-ID");
  }
  return String(val);
}

export default function AdminShopDatabase() {
  const navigate = useNavigate();
  const { isOwner } = useAdminPermission();

  const tabs = useMemo(() => {
    const base: { key: Tab; label: string; supportsDate: boolean }[] = [
      { key: "documents", label: "Register Dokumen", supportsDate: true },
      { key: "orders", label: "Data Pesanan", supportsDate: true },
      { key: "customers", label: "Data Pelanggan", supportsDate: false },
      { key: "monthly", label: "Rekap Bulanan", supportsDate: false },
    ];
    if (isOwner) {
      base.push({ key: "audit", label: "Catatan Aktivitas Tim", supportsDate: false });
    }
    return base;
  }, [isOwner]);

  const [tab, setTab] = useState<Tab>("documents");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Record<string, any>[] | null>(null);
  const [docNo, setDocNo] = useState("");
  const [searchingDoc, setSearchingDoc] = useState(false);

  const activeTabMeta = tabs.find((t) => t.key === tab) ?? tabs[0];

  useEffect(() => {
    setRows(null);
    const p =
      tab === "audit"
        ? adminShop.audit().then((r: any) => r.data ?? [])
        : adminShop.grid(tab, {
            ...(activeTabMeta.supportsDate && from ? { from } : {}),
            ...(activeTabMeta.supportsDate && to ? { to } : {}),
          });
    p.then(setRows).catch((e: any) => {
      toast.error(e?.response?.data?.message || e.message || "Gagal memuat data");
      setRows([]);
    });
  }, [tab, from, to, activeTabMeta.supportsDate]);

  const exportCsv = async () => {
    const qs = new URLSearchParams({
      format: "csv",
      ...(activeTabMeta.supportsDate && from ? { from } : {}),
      ...(activeTabMeta.supportsDate && to ? { to } : {}),
    });
    const res = await fetch(`${API_BASE_URL}/admin/shop/database/${tab}?${qs}`, {
      headers: { Authorization: `Bearer ${authStorage.getToken()}` },
    });
    if (!res.ok) return void toast.error("Ekspor CSV gagal");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `livora-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const findDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = docNo.trim();
    if (!q) return;
    setSearchingDoc(true);
    try {
      if (/^LVR-/i.test(q)) {
        navigate(`/admin/shop/orders/${q.toUpperCase()}`);
        return;
      }
      const r = await adminShop.findDocument(q);
      navigate(`/admin/shop/orders/${r.order_code}`);
    } catch {
      toast.error("Nomor dokumen tidak ditemukan");
    } finally {
      setSearchingDoc(false);
    }
  };

  const isGrid = tab !== "audit";
  const cols = rows?.[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Laporan & Arsip"
        title="Database & Rekap Toko"
        description="Rekap otomatis semua dokumen tagihan/invoice, pesanan, pelanggan, dan ringkasan bulanan yang siap diekspor ke Excel atau Google Sheets."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && (
              <Link
                to="/admin/roles"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#EAE4DA] bg-white px-3 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
              >
                Peran & Hak Akses <ArrowUpRight className="h-3.5 w-3.5 text-[#5E93B8]" />
              </Link>
            )}
            <form onSubmit={findDoc} className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#656B73]" />
              <input
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
                placeholder="Cari nomor dokumen / kode LVR…"
                aria-label="Nomor dokumen"
                className="h-9 w-64 rounded-lg border border-[#EAE4DA] bg-white pl-8 pr-3 text-xs text-[#232528] focus:border-[#5E93B8] focus:outline-none"
              />
              {searchingDoc && (
                <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#5E93B8]" />
              )}
            </form>
          </div>
        }
      />

      <AdminHelpBanner title="Ekspor Data ke Excel / Sheets" storageKey="admin-shop-database-help">
        Klik kode pesanan pada tabel untuk langsung membuka halaman detailnya. Gunakan tombol <b>Ekspor CSV</b> untuk mengunduh tabel aktif dalam format spreadsheet.
      </AdminHelpBanner>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl border border-[#EAE4DA] bg-white p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                tab === t.key ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isGrid && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {activeTabMeta.supportsDate && (
              <>
                <label className="flex items-center gap-1.5 text-[#656B73]">
                  Dari
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-9 rounded-lg border border-[#EAE4DA] bg-white px-2.5 text-xs text-[#232528]"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[#656B73]">
                  Sampai
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-9 rounded-lg border border-[#EAE4DA] bg-white px-2.5 text-xs text-[#232528]"
                  />
                </label>
              </>
            )}
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
            >
              <Download className="h-3.5 w-3.5 text-[#5E93B8]" /> Ekspor CSV (Excel/Sheets)
            </button>
          </div>
        )}
      </div>

      {rows === null ? (
        <TableSkeleton rows={6} cols={6} />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EAE4DA] bg-white p-10 text-center text-sm text-[#656B73]">
          Belum ada data pada tab ini.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#EAE4DA] bg-white shadow-sm">
          {tab === "audit" ? (
            <table className="w-full text-sm">
              <thead className="border-b border-[#EAE4DA] bg-[#FAF8F4] text-left text-[11px] font-medium uppercase tracking-wider text-[#656B73]">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Aktivitas</th>
                  <th className="p-3">Pelaku</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-t border-[#EAE4DA]/80">
                    <td className="w-44 p-3 text-xs text-[#656B73]">
                      {new Date(a.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="p-3 font-mono text-xs text-[#232528]">{a.action}</td>
                    <td className="p-3 text-xs text-[#4C5259]">{a.user?.name ?? "Sistem Otomatis"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[900px] text-xs">
              <thead className="border-b border-[#EAE4DA] bg-[#FAF8F4] text-left text-[11px] font-medium uppercase tracking-wider text-[#656B73]">
                <tr>
                  {cols.map((c) => (
                    <th key={c} className="whitespace-nowrap p-3">
                      {c.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-[#EAE4DA]/70 hover:bg-[#FAF8F4]/70">
                    {cols.map((c) => {
                      const isOrderCode = (c === "kode_order" || c === "kode") && typeof r[c] === "string" && /^LVR-/i.test(r[c]);
                      return (
                        <td key={c} className="max-w-[240px] truncate whitespace-nowrap p-3 text-[#232528]">
                          {isOrderCode ? (
                            <Link
                              to={`/admin/shop/orders/${r[c]}`}
                              className="font-mono font-semibold text-[#35678B] underline-offset-2 hover:underline"
                            >
                              {r[c]}
                            </Link>
                          ) : (
                            formatCell(c, r[c])
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
