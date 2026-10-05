import { useRef, useState } from "react";
import { Camera, Check, Loader2, ShieldCheck, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { openClaim, requestRefund, respondChange, rupiah, type ShopOrder } from "@/lib/shop";

const CLAIM_TYPES = [
  { v: "kerusakan", l: "Barang rusak" },
  { v: "salah_ukuran", l: "Salah ukuran / tidak sesuai" },
  { v: "garansi", l: "Klaim garansi" },
  { v: "lainnya", l: "Lainnya" },
];
const CLAIM_LABEL: Record<string, string> = { diajukan: "Diajukan", ditinjau: "Sedang ditinjau", disetujui: "Disetujui", ditolak: "Ditolak", selesai: "Selesai" };
const REFUND_LABEL: Record<string, string> = { diajukan: "Diajukan", disetujui: "Disetujui", dikirim: "Dana ditransfer", selesai: "Selesai", ditolak: "Ditolak" };

const inp = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-foreground";

/** Bagian pasca-bayar di halaman pesanan pelanggan: perubahan, pembatalan+refund, BAST, klaim. */
export default function OrderAftercare({ order, onChange }: { order: ShopOrder; onChange: (o: ShopOrder) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [rf, setRf] = useState({ reason: "", bank_name: "", account_number: "", account_holder: "" });
  const [cl, setCl] = useState({ type: "kerusakan", description: "" });
  const [photos, setPhotos] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (k: string, fn: () => Promise<ShopOrder>, ok: string) => {
    setBusy(k);
    try { onChange(await fn()); toast.success(ok); return true; }
    catch (e: any) { toast.error(e?.message || "Terjadi kesalahan"); return false; }
    finally { setBusy(null); }
  };

  const pendingChange = order.changes?.find((c) => c.status === "dikirim");
  const activeRefund = order.refunds?.find((r) => ["diajukan", "disetujui", "dikirim"].includes(r.status));
  const canRefund = !!order.paid_at && !activeRefund && ["dibayar", "diproses", "perlu_tindakan", "siap_kirim"].includes(order.status)
    && !(order.has_mto && order.production_started_at);
  const canClaim = ["diterima", "selesai"].includes(order.status) && !order.claims?.some((c) => ["diajukan", "ditinjau"].includes(c.status));
  const warrantyUntil = order.received_at && order.warranty_days ? new Date(new Date(order.received_at).getTime() + order.warranty_days * 864e5) : null;

  const hasContent = pendingChange || order.changes?.length || order.refunds?.length || order.claims?.length || order.delivery || canRefund || canClaim || order.production_started_at;
  if (!hasContent) return null;

  return (
    <div className="mt-6 space-y-4">
      {pendingChange && (
        <section className="rounded-2xl border-2 border-foreground/20 bg-card p-5">
          <h2 className="serif text-xl">Usulan perubahan pesanan</h2>
          <p className="mt-2 text-sm">{pendingChange.description}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Biaya tambahan</dt><dd>{rupiah(pendingChange.price_delta)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">PPN</dt><dd>{rupiah(pendingChange.ppn)}</dd></div>
            <div className="flex justify-between font-medium"><dt>Total tambahan</dt><dd>{rupiah(pendingChange.total)}</dd></div>
          </dl>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={!!busy} onClick={() => run("chg-y", () => respondChange(order.code, pendingChange.id, true), pendingChange.total > 0 ? "Disetujui. Tagihan tambahan sudah terbit." : "Perubahan disetujui")}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-foreground text-sm text-background disabled:opacity-50">
              {busy === "chg-y" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Setujui perubahan
            </button>
            <button type="button" disabled={!!busy} onClick={() => run("chg-n", () => respondChange(order.code, pendingChange.id, false), "Perubahan ditolak, pesanan berjalan sesuai spesifikasi awal")}
              className="h-11 flex-1 rounded-full border border-border text-sm">Tolak, tetap spesifikasi awal</button>
          </div>
        </section>
      )}

      {order.has_mto && order.production_started_at && (
        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Produksi barang custom dimulai {new Date(order.production_started_at).toLocaleDateString("id-ID", { dateStyle: "long" })}. Sesuai syarat yang disetujui, pesanan tidak lagi bisa dibatalkan.</p>
      )}

      {order.delivery?.received_at && (
        <section className="rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="serif text-lg">Berita acara serah terima</h2>
          <p className="mt-2">Diterima oleh <b>{order.delivery.receiver_name}</b> pada {new Date(order.delivery.received_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}.</p>
          {order.delivery.notes && <p className="mt-1 text-muted-foreground">{order.delivery.notes}</p>}
          {warrantyUntil && <p className="mt-3 flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Garansi berlaku sampai {warrantyUntil.toLocaleDateString("id-ID", { dateStyle: "long" })}.</p>}
        </section>
      )}

      {(order.claims?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="serif text-lg">Klaim</h2>
          <ul className="mt-3 space-y-3">
            {order.claims!.map((c) => (
              <li key={c.id} className="rounded-xl border border-border p-3">
                <div className="flex justify-between gap-2"><b>{CLAIM_TYPES.find((t) => t.v === c.type)?.l ?? c.type}</b><span className="text-xs">{CLAIM_LABEL[c.status] ?? c.status}</span></div>
                <p className="mt-1 text-muted-foreground">{c.description}</p>
                {c.resolution && <p className="mt-2 rounded-lg bg-muted p-2">Tanggapan Livora: {c.resolution}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(order.refunds?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="serif text-lg">Pengembalian dana</h2>
          {order.refunds!.map((r) => (
            <div key={r.id} className="mt-3 rounded-xl border border-border p-3">
              <div className="flex justify-between"><span>{rupiah(r.amount)} → {r.bank_name} {r.account}</span><span className="text-xs">{REFUND_LABEL[r.status] ?? r.status}</span></div>
              <p className="mt-1 text-muted-foreground">{r.reason}</p>
              {r.admin_note && <p className="mt-1">Catatan Livora: {r.admin_note}</p>}
            </div>
          ))}
        </section>
      )}

      {canClaim && !claimOpen && (
        <button type="button" onClick={() => setClaimOpen(true)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border text-sm">
          <ShieldCheck className="h-4 w-4" /> Ajukan klaim (kerusakan, salah ukuran, garansi)
        </button>
      )}
      {claimOpen && (
        <section className="rounded-2xl border border-border bg-card p-5 text-sm">
          <div className="flex items-center justify-between"><h2 className="serif text-lg">Ajukan klaim</h2><button type="button" aria-label="Tutup" onClick={() => setClaimOpen(false)}><X className="h-4 w-4" /></button></div>
          <p className="mt-1 text-xs text-muted-foreground">Kerusakan/salah ukuran maksimal {order.return_days ?? 7} hari setelah diterima. Garansi {order.warranty_days ?? 365} hari.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CLAIM_TYPES.map((t) => (
              <button key={t.v} type="button" onClick={() => setCl({ ...cl, type: t.v })} className={`h-10 rounded-xl border text-xs ${cl.type === t.v ? "border-foreground bg-foreground text-background" : "border-border"}`}>{t.l}</button>
            ))}
          </div>
          <textarea value={cl.description} onChange={(e) => setCl({ ...cl, description: e.target.value })} rows={3} maxLength={2000} placeholder="Ceritakan masalahnya (bagian mana, sejak kapan)" aria-label="Deskripsi masalah"
            className="mt-3 w-full rounded-xl border border-border bg-background p-3 outline-none focus:border-foreground" />
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { setPhotos([...photos, ...Array.from(e.target.files ?? [])].slice(0, 6)); e.target.value = ""; }} />
          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                <img src={URL.createObjectURL(p)} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" aria-label="Hapus foto" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5"><X className="h-3 w-3" /></button>
              </div>
            ))}
            {photos.length < 6 && <button type="button" onClick={() => fileRef.current?.click()} className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border" aria-label="Tambah foto"><Camera className="h-5 w-5 text-muted-foreground" /></button>}
          </div>
          <button type="button" disabled={!!busy || !cl.description.trim() || !photos.length}
            onClick={async () => { if (await run("claim", () => openClaim(order.code, cl.type, cl.description, photos), "Klaim terkirim. Tim kami akan menghubungi Anda.")) { setClaimOpen(false); setPhotos([]); } }}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm text-background disabled:opacity-40">
            {busy === "claim" && <Loader2 className="h-4 w-4 animate-spin" />} Kirim klaim
          </button>
        </section>
      )}

      {canRefund && !refundOpen && (
        <button type="button" onClick={() => setRefundOpen(true)} className="inline-flex w-full items-center justify-center gap-2 text-sm text-muted-foreground underline underline-offset-4">
          <Undo2 className="h-4 w-4" /> Ajukan pembatalan & pengembalian dana
        </button>
      )}
      {refundOpen && (
        <section className="rounded-2xl border border-border bg-card p-5 text-sm">
          <div className="flex items-center justify-between"><h2 className="serif text-lg">Pembatalan & pengembalian dana</h2><button type="button" aria-label="Tutup" onClick={() => setRefundOpen(false)}><X className="h-4 w-4" /></button></div>
          <p className="mt-1 text-xs text-muted-foreground">Pengajuan ditinjau tim Keuangan. Bila disetujui, dana ditransfer manual ke rekening di bawah. {order.has_mto && "Pesanan custom hanya bisa dibatalkan sebelum produksi dimulai."}</p>
          <textarea value={rf.reason} onChange={(e) => setRf({ ...rf, reason: e.target.value })} rows={2} placeholder="Alasan pembatalan" aria-label="Alasan pembatalan" className="mt-3 w-full rounded-xl border border-border bg-background p-3 outline-none focus:border-foreground" />
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input className={inp} placeholder="Bank" aria-label="Nama bank" value={rf.bank_name} onChange={(e) => setRf({ ...rf, bank_name: e.target.value })} />
            <input className={inp} placeholder="No. rekening" inputMode="numeric" aria-label="Nomor rekening" value={rf.account_number} onChange={(e) => setRf({ ...rf, account_number: e.target.value })} />
            <input className={inp} placeholder="Atas nama" aria-label="Nama pemilik rekening" value={rf.account_holder} onChange={(e) => setRf({ ...rf, account_holder: e.target.value })} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Nomor rekening disimpan terenkripsi dan dihapus otomatis setelah pengembalian selesai.</p>
          <button type="button" disabled={!!busy || Object.values(rf).some((v) => !v.trim())}
            onClick={async () => { if (await run("refund", () => requestRefund(order.code, rf), "Pengajuan terkirim")) setRefundOpen(false); }}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-destructive text-sm text-destructive-foreground disabled:opacity-40">
            {busy === "refund" && <Loader2 className="h-4 w-4 animate-spin" />} Ajukan pembatalan
          </button>
        </section>
      )}
    </div>
  );
}
