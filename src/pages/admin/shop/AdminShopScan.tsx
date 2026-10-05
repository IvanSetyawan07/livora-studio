import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { adminShop } from "@/lib/shop";

/** Pindai QR di Tagihan/Invoice untuk langsung membuka pesanannya. */
export default function AdminShopScan() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;

  const open = async (n: string) => {
    if (!n.trim()) return;
    setBusy(true);
    try { const r = await adminShop.findDocument(n.trim()); navigate(`/admin/shop/orders/${r.order_code}`); }
    catch { toast.error(`Dokumen ${n} tidak ditemukan`); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stop || !videoRef.current) return;
          const codes = await detector.detect(videoRef.current).catch(() => []);
          if (codes[0]?.rawValue) { setScanning(false); setNumber(codes[0].rawValue); open(codes[0].rawValue); return; }
          requestAnimationFrame(tick);
        };
        tick();
      } catch {
        toast.error("Kamera tidak bisa dibuka. Ketik nomor dokumen secara manual.");
        setScanning(false);
      }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div><h1 className="text-2xl font-semibold">Scan dokumen</h1><p className="text-sm text-muted-foreground">Arahkan kamera ke QR di pojok kanan bawah Tagihan atau Invoice.</p></div>
      {supported && (
        scanning ? (
          <div className="overflow-hidden rounded-xl border border-border bg-black"><video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline /></div>
        ) : (
          <button type="button" onClick={() => setScanning(true)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm text-background"><Camera className="h-4 w-4" /> Buka kamera</button>
        )
      )}
      <form onSubmit={(e) => { e.preventDefault(); open(number); }} className="flex gap-2">
        <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="001/INV/LCR-LF-AH/X/2026" aria-label="Nomor dokumen" className="h-11 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-sm" />
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buka</button>
      </form>
      {!supported && <p className="text-xs text-muted-foreground">Browser ini belum mendukung pemindai bawaan. Gunakan Chrome di HP Android, atau ketik nomornya.</p>}
    </div>
  );
}
