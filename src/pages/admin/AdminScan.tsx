import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, QrCode, Search } from "lucide-react";

/**
 * Admin-only QR scanner.
 * Scan QR item -> masuk ke halaman RINCIAN INTERNAL item (bukan halaman publik).
 */
export default function AdminScan() {
  const navigate = useNavigate();
  const regionId = "admin-qr-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const slugFromText = (text: string): string | null => {
    let t = text.trim();
    try {
      if (/^https?:\/\//i.test(t)) t = new URL(t).pathname;
    } catch {
      /* noop */
    }
    const m = t.match(/\/items?\/([^/?#]+)/i);
    if (m) return decodeURIComponent(m[1]);
    if (/^[a-z0-9-_]+$/i.test(t)) return t;
    return null;
  };

  const stop = async () => {
    // Kalau start() masih berjalan, tunggu bentar biar nggak race dengan play().
    let tries = 0;
    while (startingRef.current && tries < 20) {
      await new Promise((r) => setTimeout(r, 50));
      tries++;
    }
    try {
      await scannerRef.current?.stop();
      await scannerRef.current?.clear();
    } catch {
      /* noop */
    }
    scannerRef.current = null;
    setScanning(false);
  };

  const start = async () => {
    setError(null);
    startingRef.current = true;
    try {
      const scanner = new Html5Qrcode(regionId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => {
          const slug = slugFromText(decoded);
          if (!slug) return;
          stop().then(() => navigate(`/admin/items/${slug}/detail`));
        },
        () => {},
      );
      setScanning(true);
    } catch (e: any) {
      setError(e?.message ?? "Kamera tidak bisa diakses. Pastikan izin kamera diberikan.");
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

  const goManual = () => {
    const slug = slugFromText(manual);
    if (slug) navigate(`/admin/items/${slug}/detail`);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <QrCode className="w-5 h-5" />
        <h1 className="text-xl font-medium">QR Scanner (Admin)</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Scan QR furniture untuk membuka rincian internal: stok, dimensi, material, berat, harga,
        dan daftar item serupa.
      </p>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="relative w-full min-h-[280px] bg-muted/40">
          <div id={regionId} className="w-full h-full" />
          {!scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-muted-foreground">Kamera belum aktif</span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-wrap gap-2 items-center border-t border-border">
          {!scanning ? (
            <button
              onClick={start}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.15em] bg-foreground text-background rounded"
            >
              <Camera className="w-4 h-4" /> Mulai scan
            </button>
          ) : (
            <button
              onClick={stop}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.15em] border border-border rounded"
            >
              <CameraOff className="w-4 h-4" /> Berhenti
            </button>
          )}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </div>

      <div className="mt-6">
        <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Atau masukkan slug / kode item
        </label>
        <div className="flex gap-2 mt-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goManual()}
            placeholder="mis. sofa-calma atau https://.../items/sofa-calma"
            className="flex-1 border border-border rounded px-3 py-2 text-sm bg-background"
          />
          <button onClick={goManual} className="px-4 py-2 border border-border rounded text-sm inline-flex items-center gap-2">
            <Search className="w-4 h-4" /> Buka
          </button>
        </div>
      </div>
    </div>
  );
}