import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Factory, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { adminShop, openPrivate, rupiah } from "@/lib/shop";

const box = "rounded-xl border border-border bg-card p-5 text-sm";
const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm";
const btn = "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm disabled:opacity-50";

/** Panel Tahap 3 di detail pesanan admin. */
export default function AdminOrderAftercare({ o, reload }: { o: any; reload: () => void }) {
  const [x, setX] = useState<any>(null);
  const [projects, setProjects] = useState<{ id: number; title: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [chg, setChg] = useState({ description: "", price_delta: 0 });
  const [bast, setBast] = useState<{ photos: File[]; signature: File | null; receiver: string; notes: string }>({ photos: [], signature: null, receiver: "", notes: "" });
  const [rf, setRf] = useState({ reason: "", amount: 0 });

  const load = useCallback(() => adminShop.extras(o.code).then(setX).catch(() => {}), [o.code]);
  useEffect(() => { load(); adminShop.projects().then(setProjects).catch(() => {}); }, [load]);

  const run = async (k: string, fn: () => Promise<any>, ok: string) => {
    setBusy(k);
    try { await fn(); toast.success(ok); await load(); reload(); return true; }
    catch (e: any) { toast.error(e?.message || "Gagal"); return false; } finally { setBusy(null); }
  };

  if (!x) return null;
  const slaOver = o.status === "menunggu_review_admin" && x.sla_due_at && new Date(x.sla_due_at) < new Date();
  const paidStage = ["dibayar", "diproses", "perlu_tindakan"].includes(o.status);
  const viewFile = (path: string) => openPrivate(`/admin/shop/files?path=${encodeURIComponent(path)}`).catch((e) => toast.error(e.message));

  return (
    <div className="space-y-6">
      {o.status === "menunggu_review_admin" && x.sla_due_at && (
        <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${slaOver ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted"}`}>
          <AlertTriangle className="h-4 w-4" /> Target review: {new Date(x.sla_due_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}{slaOver && " — terlambat"}
        </div>
      )}

      {x.has_mto && (
        <section className={box}>
          <h2 className="font-semibold">Barang custom (MTO)</h2>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {o.items.filter((i: any) => i.fulfillment_type === "made_to_order").map((i: any) => {
              const s = x.custom_spec?.find((c: any) => c.order_item_id === i.id);
              return <li key={i.id}><span className="text-foreground">{i.title}</span>: {[s?.dimensions, s?.material, s?.color].filter(Boolean).join(" · ") || "belum ada spesifikasi khusus"}{s?.notes ? ` — ${s.notes}` : ""}</li>;
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Spesifikasi disetujui pelanggan: {x.spec_approved_at ? new Date(x.spec_approved_at).toLocaleString("id-ID") : "belum"} · Produksi: {x.production_started_at ? new Date(x.production_started_at).toLocaleString("id-ID") : "belum dimulai"}
          </p>
          {paidStage && !x.production_started_at && (
            <button type="button" disabled={!!busy} onClick={() => run("prod", () => adminShop.startProduction(o.code), "Produksi dimulai. Pesanan tidak bisa dibatalkan lagi.")} className={`${btn} mt-3 bg-foreground text-background`}>
              {busy === "prod" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />} Mulai produksi
            </button>
          )}
        </section>
      )}

      {["siap_kirim", "dikirim"].includes(o.status) && (
        <section className={box}>
          <h2 className="font-semibold">Berita acara serah terima (BAST)</h2>
          <p className="mt-1 text-xs text-muted-foreground">Unggah foto barang di lokasi + foto tanda terima. Pesanan otomatis berstatus Diterima.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">Foto serah terima (maks 8)
              <input type="file" accept="image/*" multiple className="mt-1 block w-full text-sm" onChange={(e) => setBast({ ...bast, photos: Array.from(e.target.files ?? []).slice(0, 8) })} />
            </label>
            <label className="text-xs text-muted-foreground">Foto tanda terima / TTD (opsional)
              <input type="file" accept="image/*" className="mt-1 block w-full text-sm" onChange={(e) => setBast({ ...bast, signature: e.target.files?.[0] ?? null })} />
            </label>
            <input className={inp} placeholder="Nama penerima" aria-label="Nama penerima" value={bast.receiver} onChange={(e) => setBast({ ...bast, receiver: e.target.value })} />
            <input className={inp} placeholder="Catatan (opsional)" aria-label="Catatan BAST" value={bast.notes} onChange={(e) => setBast({ ...bast, notes: e.target.value })} />
          </div>
          <button type="button" disabled={!!busy || !bast.photos.length || !bast.receiver.trim()} onClick={() => run("bast", () => adminShop.bast(o.code, bast.photos, bast.receiver, bast.signature, bast.notes), "BAST tersimpan, pesanan diterima")}
            className={`${btn} mt-3 bg-foreground text-background`}>{busy === "bast" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Simpan BAST</button>
        </section>
      )}
      {x.delivery?.received_at && (
        <section className={box}>
          <h2 className="font-semibold">BAST</h2>
          <p className="mt-1">Diterima {x.delivery.receiver_name} · {new Date(x.delivery.received_at).toLocaleString("id-ID")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {JSON.parse(x.delivery.bast_photos || "[]").map((p: string, i: number) => <button key={p} type="button" onClick={() => viewFile(p)} className="underline">Foto {i + 1}</button>)}
            {x.delivery.bast_signature_path && <button type="button" onClick={() => viewFile(x.delivery.bast_signature_path)} className="underline">Tanda terima</button>}
          </div>
        </section>
      )}

      {paidStage && (
        <section className={box}>
          <h2 className="font-semibold">Change order</h2>
          <p className="mt-1 text-xs text-muted-foreground">Revisi spesifikasi setelah lunas. Pelanggan menyetujui di halaman pesanan; selisih ditagih dengan nomor tagihan baru yang merujuk tagihan awal.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px]">
            <input className={inp} placeholder="Perubahan (mis. ukuran meja jadi 200 cm)" aria-label="Deskripsi perubahan" value={chg.description} onChange={(e) => setChg({ ...chg, description: e.target.value })} />
            <input className={`${inp} text-right`} type="number" min={0} aria-label="Selisih harga sebelum PPN" placeholder="Selisih (sebelum PPN)" value={chg.price_delta} onChange={(e) => setChg({ ...chg, price_delta: Math.max(0, +e.target.value) })} />
          </div>
          <button type="button" disabled={!!busy || !chg.description.trim()} onClick={async () => { if (await run("chg", () => adminShop.createChange(o.code, chg.description, chg.price_delta), "Usulan perubahan dikirim ke pelanggan")) setChg({ description: "", price_delta: 0 }); }}
            className={`${btn} mt-3 border border-border`}>Kirim usulan ({rupiah(Math.round(chg.price_delta * 1.11))} termasuk PPN)</button>
        </section>
      )}
      {x.changes?.length > 0 && (
        <section className={box}>
          <h2 className="font-semibold">Riwayat perubahan</h2>
          <ul className="mt-2 space-y-1">{x.changes.map((c: any) => <li key={c.id} className="flex justify-between gap-3"><span>{c.description}</span><span className="shrink-0 text-muted-foreground">{rupiah(c.total)} · {c.status}</span></li>)}</ul>
        </section>
      )}

      {(x.refunds?.length > 0 || (o.paid_at && !["dibatalkan", "selesai"].includes(o.status))) && (
        <section className={box}>
          <h2 className="font-semibold">Refund</h2>
          {x.refunds?.map((r: any) => <p key={r.id} className="mt-1">{rupiah(r.amount)} · {r.status} · {r.reason} <span className="text-muted-foreground">({r.bank_name} {r.account_number} a.n. {r.account_holder})</span></p>)}
          {!x.refunds?.some((r: any) => ["diajukan", "disetujui", "dikirim"].includes(r.status)) && o.paid_at && !["dibatalkan", "selesai"].includes(o.status) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px_auto]">
              <input className={inp} placeholder="Alasan refund (mis. stok habis)" aria-label="Alasan refund" value={rf.reason} onChange={(e) => setRf({ ...rf, reason: e.target.value })} />
              <input className={`${inp} text-right`} type="number" min={0} aria-label="Nominal refund" placeholder="Nominal (kosong = penuh)" value={rf.amount || ""} onChange={(e) => setRf({ ...rf, amount: +e.target.value })} />
              <button type="button" disabled={!!busy || !rf.reason.trim()} onClick={() => run("rf", () => adminShop.createRefund(o.code, { reason: rf.reason, amount: rf.amount || undefined }), "Pengajuan refund dibuat. Proses di menu Klaim & Refund.")} className={`${btn} border border-border`}>Buat refund</button>
            </div>
          )}
        </section>
      )}

      {x.claims?.length > 0 && (
        <section className={box}>
          <h2 className="font-semibold">Klaim</h2>
          <ul className="mt-2 space-y-1">{x.claims.map((c: any) => <li key={c.id}>{c.type} · <b>{c.status}</b> · {c.description}</li>)}</ul>
          <p className="mt-2 text-xs text-muted-foreground">Tangani klaim di menu Klaim & Refund.</p>
        </section>
      )}

      <section className={box}>
        <h2 className="font-semibold">Tautkan ke proyek</h2>
        <select aria-label="Proyek" value={x.project_id ?? ""} onChange={(e) => run("prj", () => adminShop.linkProject(o.code, e.target.value ? +e.target.value : null), "Tautan proyek disimpan")} className={`${inp} mt-2 max-w-sm`}>
          <option value="">Tidak ditautkan</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </section>
    </div>
  );
}
