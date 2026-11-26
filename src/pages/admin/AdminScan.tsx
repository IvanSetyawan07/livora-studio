import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, FileText, Loader2, Package, QrCode, Search } from "lucide-react";
import { toast } from "sonner";
import { adminShop, rupiah } from "@/lib/shop";
import { PageHeader, AdminHelpBanner } from "@/components/admin/kit";

type FoundItem = {
  id: number;
  title: string;
  slug?: string;
  code?: string | null;
  image?: string | null;
  price?: number | null;
  stock?: number | null;
};

/**
 * Pemindai QR Serbaguna (Produk + Invoice/Proforma/Pesanan).
 * Menggunakan html5-qrcode agar berjalan stabil di Android, iPhone Safari, maupun Desktop.
 */
export default function AdminScan() {
  const navigate = useNavigate();
  const regionId = "admin-unified-qr-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [resolving, setResolving] = useState(false);
  const [suggestions, setSuggestions] = useState<FoundItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Pencarian produk secara langsung saat admin mengetik di kotak manual
  useEffect(() => {
    const q = manual.trim();
    if (!q || q.includes("/") || /^lvr-/i.test(q) || /^https?:\/\//i.test(q)) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      adminShop
        .items(q)
        .then((res) => setSuggestions(Array.isArray(res) ? res : []))
        .catch(() => setSuggestions([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(t);
  }, [manual]);

  const stop = async () => {
    let tries = 0;
    while (startingRef.current && tries < 20) {
      await new Promise((r) => setTimeout(r, 50));
      tries++;
    }
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      await scannerRef.current?.clear();
    } catch {
      /* abaikan error cleanup kamera */
    }
    scannerRef.current = null;
    setScanning(false);
  };

  /**
   * Deteksi otomatis hasil scan QR / input manual:
   * 1) Kode Pesanan (`LVR-...` atau URL `/orders/LVR-...`) -> detail pesanan
   * 2) Nomor Dokumen PDF (`001/INV/...` / `001/PRO/...`) -> cari via findDocument -> detail pesanan
   * 3) URL Produk (`/items/{slug}`) atau slug/kode produk -> rincian internal produk
   */
  const resolveAndOpen = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setResolving(true);
    setError(null);

    try {
      // 1. Cek URL atau kode pesanan langsung (LVR-XXXXXX)
      const orderMatch = text.match(/\b(LVR-[A-Z0-9]{4,})\b/i);
      if (orderMatch) {
        const code = orderMatch[1].toUpperCase();
        toast.success(`Membuka pesanan ${code}`);
        navigate(`/admin/shop/orders/${code}`);
        return;
      }

      // 2. Cek URL produk (/items/slug)
      let pathname = text;
      if (/^https?:\/\//i.test(text)) {
        try {
          pathname = new URL(text).pathname;
        } catch {
          pathname = text;
        }
      }
      const itemUrlMatch = pathname.match(/\/items?\/([^/?#]+)/i);
      if (itemUrlMatch) {
        const slug = decodeURIComponent(itemUrlMatch[1]);
        navigate(`/admin/items/${slug}/detail`);
        return;
      }

      // 3. Cek nomor dokumen Tagihan / Invoice (mengandung '/' seperti 001/INV/LCR-...)
      if (text.includes("/")) {
        try {
          const doc = await adminShop.findDocument(text);
          if (doc?.order_code) {
            toast.success(`Dokumen ditemukan — membuka pesanan ${doc.order_code}`);
            navigate(`/admin/shop/orders/${doc.order_code}`);
            return;
          }
        } catch {
          toast.error(`Dokumen "${text}" tidak ditemukan.`);
          return;
        }
      }

      // 4. Cari produk berdasarkan kode / slug / nama
      const found: FoundItem[] = await adminShop.items(text).catch(() => []);
      if (found.length === 1) {
        const key = found[0].slug || found[0].code || String(found[0].id);
        navigate(`/admin/items/${key}/detail`);
        return;
      }
      if (found.length > 1) {
        setSuggestions(found);
        toast.info(`Ditemukan ${found.length} produk. Pilih salah satu dari daftar di bawah.`);
        return;
      }

      // 5. Fallback: coba cari sebagai nomor dokumen, jika gagal arahkan ke slug langsung
      try {
        const doc = await adminShop.findDocument(text);
        if (doc?.order_code) {
          navigate(`/admin/shop/orders/${doc.order_code}`);
          return;
        }
      } catch {
        /* bukan dokumen */
      }

      if (/^[a-z0-9-_]+$/i.test(text)) {
        navigate(`/admin/items/${text}/detail`);
      } else {
        toast.error("Kode QR tidak dikenali sebagai produk maupun dokumen pesanan.");
      }
    } finally {
      setResolving(false);
    }
  };

  const start = async () => {
    setError(null);
    startingRef.current = true;
    try {
      const scanner = new Html5Qrcode(regionId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          stop().then(() => resolveAndOpen(decoded));
        },
        () => {},
      );
      setScanning(true);
    } catch (e: any) {
      setError(e?.message ?? "Kamera tidak bisa diakses. Pastikan izin kamera diaktifkan pada browser.");
      setScanning(false);
    } finally {
      startingRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Alat Cepat Showroom"
        title="Scan QR Serbaguna"
        description="Satu pemindai untuk semua kebutuhan: scan QR label produk untuk melihat stok & rincian internal, atau scan QR pada Proforma/Invoice untuk membuka pesanannya."
      />

      <AdminHelpBanner title="Apa saja yang bisa dipindai?" storageKey="admin-scan-unified-help">
        <span className="inline-flex items-center gap-1 font-medium text-[#232528]">
          <Package className="h-3.5 w-3.5 text-[#5E93B8]" /> QR Label Furnitur
        </span>{" "}
        membuka detail stok, dimensi, material, dan harga.{" "}
        <span className="inline-flex items-center gap-1 font-medium text-[#232528]">
          <FileText className="h-3.5 w-3.5 text-[#5E93B8]" /> QR Invoice / Proforma / Kode LVR
        </span>{" "}
        langsung membuka halaman detail pesanan terkait.
      </AdminHelpBanner>

      {/* Area Kamera */}
      <div className="overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white shadow-sm">
        <div className="relative min-h-[280px] w-full bg-[#FAF8F4]">
          <div id={regionId} className="h-full w-full" />
          {!scanning && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#656B73]">
              <QrCode className="h-10 w-10 text-[#5E93B8]/60" />
              <span className="text-xs">Kamera belum aktif — klik tombol di bawah untuk mulai memindai</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE4DA] p-4">
          <div className="flex items-center gap-2">
            {!scanning ? (
              <button
                type="button"
                onClick={start}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#232528] px-4 text-xs font-medium text-white hover:bg-[#35383d]"
              >
                <Camera className="h-4 w-4" /> Aktifkan Kamera
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                <CameraOff className="h-4 w-4" /> Hentikan Kamera
              </button>
            )}
          </div>
          {error && <span className="text-xs text-rose-600">{error}</span>}
        </div>
      </div>

      {/* Pencarian Manual Produk / Nomor Dokumen / Kode Pesanan */}
      <div className="rounded-2xl border border-[#EAE4DA] bg-white p-5 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#5E93B8]">
          Atau Cari Manual (Produk, Kode Pesanan, atau Nomor Dokumen)
        </label>
        <p className="mt-1 text-xs text-[#656B73]">
          Contoh: <span className="font-mono text-[#232528]">sofa calma</span>,{" "}
          <span className="font-mono text-[#232528]">LVR-AB12CD</span>, atau{" "}
          <span className="font-mono text-[#232528]">001/INV/LCR-LF-AH/X/2026</span>
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resolveAndOpen(manual);
          }}
          className="mt-3 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#656B73]" />
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Ketik nama produk, kode barang, LVR-…, atau nomor invoice…"
              className="h-10 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] pl-9 pr-9 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#5E93B8]" />
            )}
          </div>
          <button
            type="submit"
            disabled={resolving || !manual.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#232528] px-4 text-xs font-medium text-white hover:bg-[#35383d] disabled:opacity-40"
          >
            {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buka
          </button>
        </form>

        {suggestions.length > 0 && (
          <ul className="mt-3 max-h-64 divide-y divide-[#EAE4DA] overflow-y-auto rounded-xl border border-[#EAE4DA]">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/items/${item.slug || item.code || item.id}/detail`)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-[#EDF4F8]/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#232528]">{item.title}</p>
                    <p className="text-[11px] text-[#656B73]">
                      {item.code || "Tanpa kode"} · {item.stock == null ? "Stok tidak dicatat" : `Stok ${item.stock}`}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-[#35678B]">
                    {item.price ? rupiah(Number(item.price)) : "Lihat Detail →"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
