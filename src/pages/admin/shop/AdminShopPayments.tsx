import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Eye, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { adminShop, openPrivate, rupiah } from "@/lib/shop";
import { useConfirm } from "@/components/shop/useConfirm";

/** Antrean verifikasi bukti transfer (peran Keuangan). */
export default function AdminShopPayments() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const confirm = useConfirm();
  const load =
   useCallback(() => adminShop.proofs().then(setRows).catch((e) => { toast.error(e.message); setRows([]); }), []);
  useEffect(() => { load(); }, [load]);

  // Bukti yang belum tertaut ke pesanan (mis. bot tidak yakin ini untuk pesanan yang mana)
  const assign = async (id: number) => {
    const code = await confirm.ask({ title: "Tautkan bukti ke pesanan", text: "Masukkan kode pesanan yang benar (mis. LVR-AB12CD).", inputLabel: "Kode pesanan", confirmLabel: "Tautkan" });
    if (typeof code !== "string" || !code.trim()) return;
    setBusy(id);
    try { await adminShop.assignProof(id, code.trim().toUpperCase()); toast.success("Bukti ditautkan ke pesanan"); load(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const review = async (id: number, accept: boolean) => {
    let reason: string | undefined;
    if (accept) {
      if (!(await confirm.ask({ title: "Terima pembayaran ini?", text: "Pastikan dana sudah masuk di mutasi rekening. Invoice LUNAS akan langsung terbit dan stok dikurangi.", confirmLabel: "Ya, terima" }))) return;
    } else {
      const r = await confirm.ask({ title: "Tolak bukti transfer?", text: "Alasan dikirim ke pelanggan agar bisa mengunggah ulang.", inputLabel: "Alasan menolak", confirmLabel: "Tolak", danger: true });
      if (typeof r !== "string") return;
      reason = r;
    }
    setBusy(id);
    try { await adminShop.reviewProof(id, accept, reason); toast.success(accept ? "Pembayaran diterima. Invoice LUNAS terbit." : "Bukti ditolak"); load(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      {confirm.node}
      <div>
        <h1 className="text-2xl font-semibold">Verifikasi pembayaran</h1>
        <p className="text-sm text-muted-foreground">Cocokkan nominal & nama di mutasi rekening sebelum menerima.</p>
      </div>
      {rows === null ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">Tidak ada bukti transfer yang menunggu.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            // Total transfer = total tagihan + kode unik (bukan hanya nominal tagihan)
            const mismatch = !!p.amount && !!p.expected && p.amount !== p.expected;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="min-w-0 flex-1">
                  {p.order
                    ? <Link to={`/admin/shop/orders/${p.order.code}`} className="font-mono font-medium hover:underline">{p.order.code}</Link>
                    : <span className="font-medium text-red-600">Belum tertaut ke pesanan</span>}
                  <p className="text-sm">{p.order?.customer_name ?? "Pengirim"} · {p.order?.customer_phone ?? `+${p.phone ?? "?"}`}</p>
                  {p.ai_read?.nominal ? (
                    <p className="text-xs text-muted-foreground">
                      Dibaca AI: {rupiah(p.ai_read.nominal)}
                      {p.ai_read.bank ? ` · ${p.ai_read.bank}` : ""}
                      {p.ai_read.nama_pengirim ? ` · ${p.ai_read.nama_pengirim}` : ""} (keyakinan {p.ai_read.keyakinan ?? "?"})
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {p.expected ? `Harus transfer ${rupiah(p.expected)}` : "Tagihan —"}
                    {p.document_number ? ` · ${p.document_number}` : ""} · diunggah {new Date(p.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                  {mismatch && <p className="text-xs font-medium text-red-600">Nominal di bukti ({rupiah(p.amount)}) berbeda dari total transfer {rupiah(p.expected)}</p>}
                </div>
                <button type="button" onClick={() => openPrivate(`/admin/shop/proofs/${p.id}/file`).catch((e) => toast.error(e.message))} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm"><Eye className="h-4 w-4" /> Lihat bukti</button>
                {!p.order && (
                  <button type="button" disabled={busy === p.id} onClick={() => assign(p.id)} className="inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm">Tautkan ke pesanan</button>
                )}
                <button type="button" disabled={busy === p.id} onClick={() => review(p.id, false)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-red-600"><X className="h-4 w-4" /> Tolak</button>
                <button type="button" disabled={busy === p.id || !p.order} onClick={() => review(p.id, true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-3 text-sm text-background disabled:opacity-50">
                  {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Terima
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}