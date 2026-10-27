import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, Check, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { invites, inviteError, type InviteEvent, type InviteGuest } from "@/lib/invites";

const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted disabled:opacity-50";
const REGION = "invite-checkin-region";

/** Check-in hari acara: scan QR tiket tamu (dari halaman RSVP) atau cari nama lalu tekan "Datang". */
export default function InviteCheckInTab({ event, guests, onChanged }: { event: InviteEvent; guests: InviteGuest[]; onChanged: () => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const busyRef = useRef(false);
  const lastCode = useRef("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{ name: string; already: boolean } | null>(null);
  const [q, setQ] = useState("");
  const [working, setWorking] = useState<number | null>(null);

  const handle = async (code: string) => {
    if (busyRef.current || code === lastCode.current) return;
    busyRef.current = true;
    lastCode.current = code;
    try {
      const r = await invites.checkInScan(event.id, code);
      setLast({ name: r.guest.name, already: r.already });
      onChanged();
    } catch (e) {
      setLast(null);
      toast.error(inviteError(e));
    } finally {
      busyRef.current = false;
      // QR yang sama baru dibaca lagi setelah 4 detik, supaya tidak terhitung dobel.
      setTimeout(() => { if (lastCode.current === code) lastCode.current = ""; }, 4000);
    }
  };

  const stop = async () => {
    let tries = 0;
    while (startingRef.current && tries < 20) { await new Promise((r) => setTimeout(r, 50)); tries++; }
    try { await scannerRef.current?.stop(); await scannerRef.current?.clear(); } catch { /* noop */ }
    scannerRef.current = null;
    setScanning(false);
  };

  const start = async () => {
    setError(null);
    startingRef.current = true;
    try {
      const scanner = new Html5Qrcode(REGION);
      scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (decoded) => { void handle(decoded); }, () => {});
      setScanning(true);
    } catch (e: any) {
      setError(e?.message ?? "Kamera tidak bisa diakses. Pastikan izin kamera diberikan.");
      setScanning(false);
    } finally {
      startingRef.current = false;
    }
  };

  useEffect(() => () => { void stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (g: InviteGuest) => {
    setWorking(g.id);
    try {
      await invites.checkIn(event.id, g.id, !g.checked_in_at);
      onChanged();
    } catch (e) { toast.error(inviteError(e)); } finally { setWorking(null); }
  };

  const arrived = guests.filter((g) => g.checked_in_at).length;
  const waiting = guests.filter((g) => g.rsvp === "hadir" && !g.checked_in_at).length;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return guests
      .filter((g) => !s || g.name.toLowerCase().includes(s) || g.phone.includes(s))
      .sort((a, b) => Number(!!a.checked_in_at) - Number(!!b.checked_in_at) || a.name.localeCompare(b.name))
      .slice(0, 50);
  }, [guests, q]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Sudah datang</p><p className="mt-1 text-2xl font-semibold text-emerald-700">{arrived}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Konfirmasi hadir, belum datang</p><p className="mt-1 text-2xl font-semibold">{waiting}</p></div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="relative min-h-[260px] w-full bg-muted/40">
          <div id={REGION} className="h-full w-full" />
          {!scanning && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="text-xs text-muted-foreground">Kamera belum aktif</span></div>}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border p-4">
          {!scanning
            ? <button type="button" className={btn} onClick={start}><Camera className="h-4 w-4" /> Mulai scan QR tamu</button>
            : <button type="button" className={btn} onClick={stop}><CameraOff className="h-4 w-4" /> Berhenti</button>}
          {error && <span className="text-xs text-destructive">{error}</span>}
          {last && (
            <span className={`rounded-full px-3 py-1 text-sm ${last.already ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
              {last.already ? `${last.name} sudah check-in sebelumnya` : `Selamat datang, ${last.name}!`}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Atau cari nama / nomor tamu…" aria-label="Cari tamu" className="h-10 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground" />
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {!list.length && <p className="p-4 text-sm text-muted-foreground">Tidak ada tamu yang cocok.</p>}
          {list.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.rsvp === "hadir" ? "Konfirmasi hadir" : g.rsvp === "tidak" ? "Konfirmasi tidak hadir" : "Belum konfirmasi"}
                  {g.checked_in_at && ` · datang ${new Date(g.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </div>
              <button type="button" disabled={working === g.id} onClick={() => toggle(g)} className={btn}>
                {g.checked_in_at ? <><Undo2 className="h-4 w-4" /> Batal</> : <><Check className="h-4 w-4" /> Datang</>}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Tamu yang datang otomatis dihitung "Hadir" walaupun sebelumnya belum konfirmasi. Menampilkan maksimal 50 tamu; ketik nama untuk menyaring.</p>
      </div>
    </div>
  );
}