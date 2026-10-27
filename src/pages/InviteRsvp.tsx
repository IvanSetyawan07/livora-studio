import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { AlertTriangle, CalendarDays, Check, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { inviteRsvp, inviteError, type RsvpPage } from "@/lib/invites";

/** QR tiket tamu: isinya tautan RSVP ini, dipindai panitia di lokasi untuk check-in. */
function TicketQR({ value }: { value: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) QRCode.toCanvas(ref.current, value, { width: 200, margin: 1, errorCorrectionLevel: "M" }).catch(() => {});
  }, [value]);
  return <canvas ref={ref} className="mx-auto rounded-lg bg-white p-2" />;
}
/** Halaman konfirmasi kehadiran undangan — bertoken per tamu, tanpa login, mobile-first. */
export default function InviteRsvp() {
  const { token = "" } = useParams();
  const [page, setPage] = useState<RsvpPage | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<"hadir" | "tidak" | null>(null);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    inviteRsvp.get(token).then(setPage).catch(() => setError(true));
  }, [token]);

  const answer = async (v: "hadir" | "tidak") => {
    setBusy(v);
    try {
      await inviteRsvp.answer(token, v);
      setPage((p) => (p ? { ...p, rsvp: v } : p));
      setChanging(false);
    } catch (e) {
      toast.error(inviteError(e));
    } finally {
      setBusy(null);
    }
  };

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="serif mt-4 text-2xl">Tautan tidak berlaku</p>
          <p className="mt-2 text-sm text-muted-foreground">Tautan undangan ini tidak ditemukan. Silakan hubungi tim Livora lewat WhatsApp.</p>
        </div>
      </main>
    );
  }

  if (!page) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></main>;
  }

  const answered = page.rsvp && !changing;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {page.image_url && <img src={page.image_url} alt={page.event} className="max-h-72 w-full object-cover" />}
        <div className="space-y-5 p-6">
          <div>
            <p className="text-sm text-muted-foreground">Halo, {page.name}</p>
            <h1 className="serif mt-1 text-2xl">{page.event}</h1>
          </div>

          <ul className="space-y-2 text-sm">
            {page.date_text && <li className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{page.date_text}</li>}
            {page.location && <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{page.location}</li>}
          </ul>

          {answered ? (
            <div className="space-y-3 rounded-xl bg-muted p-4 text-center">
              <Check className="mx-auto h-6 w-6" />
              <p className="font-medium">{page.rsvp === "hadir" ? "Terima kasih, kehadiran Kakak sudah kami catat!" : "Terima kasih sudah mengabari kami."}</p>
              {page.rsvp === "hadir" && (
                <div className="space-y-1 border-t border-border pt-3">
                  {page.checked_in
                    ? <p className="text-sm font-medium text-emerald-700">✓ Anda sudah check-in. Selamat menikmati acara!</p>
                    : <><TicketQR value={window.location.href} /><p className="text-xs text-muted-foreground">Tunjukkan QR ini kepada panitia saat tiba.</p></>}
                </div>
              )}
              <button type="button" onClick={() => setChanging(true)} className="text-xs underline">Ubah jawaban</button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Apakah Kakak bisa hadir?</p>
              <button type="button" disabled={!!busy} onClick={() => answer("hadir")} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm text-background disabled:opacity-60">
                {busy === "hadir" && <Loader2 className="h-4 w-4 animate-spin" />} Ya, saya hadir
              </button>
              <button type="button" disabled={!!busy} onClick={() => answer("tidak")} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm disabled:opacity-60">
                {busy === "tidak" && <Loader2 className="h-4 w-4 animate-spin" />} Maaf, tidak bisa hadir
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}