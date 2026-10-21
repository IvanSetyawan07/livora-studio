import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Check, Loader2, MessageCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { confirmOrder, getConfirmPage, reviseOrder, type ConfirmPage } from "@/lib/shopPublic";
import { rupiah } from "@/lib/shop";

/** Halaman Konfirmasi Pesanan — bertoken, tanpa login, mobile-first. */
export default function OrderConfirm() {
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [page, setPage] = useState<ConfirmPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<"confirmed" | "revised" | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);

  useEffect(() => {
    getConfirmPage(code, token).then(setPage).catch(() => setError("Tautan tidak valid atau sudah tidak berlaku."));
  }, [code, token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await confirmOrder(code, token);
      setPayUrl(r.payment_url);
      setDone("confirmed");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Konfirmasi gagal");
    } finally {
      setBusy(false);
    }
  };

  const revise = async () => {
    if (!note.trim()) return toast.error("Tulis catatan revisi/nego Anda");
    setBusy(true);
    try {
      await reviseOrder(code, token, note.trim());
      setDone("revised");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal mengirim catatan");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="serif mt-4 text-2xl">Tautan tidak berlaku</p>
          <p className="mt-2 text-sm text-muted-foreground">{error} Silakan hubungi kami lewat WhatsApp untuk tautan baru.</p>
        </div>
      </main>
    );
  }
  if (!page) return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;

  if (done === "confirmed") {
    return (
      <main className="min-h-screen bg-background px-4 pt-24 pb-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-6 w-6" /></div>
          <h1 className="serif mt-5 text-3xl">Pesanan dikonfirmasi</h1>
          <p className="mt-2 text-sm text-muted-foreground">Terima kasih! Tagihan untuk {page.code} sudah terbit. Lanjutkan ke ringkasan pembayaran.</p>
          {payUrl && (
            <a href={payUrl} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
              Lihat Pembayaran
            </a>
          )}
        </div>
      </main>
    );
  }
  if (done === "revised") {
    return (
      <main className="min-h-screen bg-background px-4 pt-24 pb-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-6 w-6" /></div>
          <h1 className="serif mt-5 text-3xl">Catatan terkirim</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tim kami akan meninjau catatan Anda dan menghubungi lewat WhatsApp.</p>
        </div>
      </main>
    );
  }

  const q = page.quote;

  return (
    <main className="min-h-screen bg-background px-4 pt-24 pb-16">
      <div className="mx-auto max-w-lg">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Penawaran resmi</p>
        <h1 className="serif mt-2 text-3xl">Konfirmasi Pesanan</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{page.code}</p>

        {page.expired && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Penawaran ini sudah kedaluwarsa atau digantikan versi baru. Silakan hubungi kami lewat WhatsApp untuk penawaran terbaru.
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Barang</p>
          <ul className="mt-3 space-y-2 text-sm">
            {page.items.map((i, n) => (
              <li key={n} className="flex justify-between gap-3">
                <span>{i.title}{i.variant_name ? ` (${i.variant_name})` : ""} ×{i.quantity}</span>
                {q && <span className="shrink-0">{rupiah((i.unit_price - i.unit_discount) * i.quantity)}</span>}
              </li>
            ))}
          </ul>
        </section>

        {page.shipping && (
          <section className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Penerima & pengiriman</p>
            <p className="mt-2 font-medium">{page.shipping.recipient ?? page.customer_name}</p>
            <p className="mt-1 text-muted-foreground">{[page.shipping.street, page.shipping.city].filter(Boolean).join(", ")}</p>
            {page.shipping_method && <p className="mt-1 text-muted-foreground">Metode: {page.shipping_method}</p>}
          </section>
        )}

        {q && (
          <section className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Rincian biaya</p>
            <dl className="mt-3 space-y-1.5">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupiah(q.subtotal)}</dd></div>
              {q.product_discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Diskon produk</dt><dd>-{rupiah(q.product_discount)}</dd></div>}
              {q.extra_discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Diskon</dt><dd>-{rupiah(q.extra_discount)}</dd></div>}
              <div className="flex justify-between"><dt>PPN 11%</dt><dd>{rupiah(q.ppn)}</dd></div>
              {q.shipping_fee > 0 && <div className="flex justify-between"><dt>Ongkos kirim</dt><dd>{rupiah(q.shipping_fee)}</dd></div>}
              {q.installation_fee > 0 && <div className="flex justify-between"><dt>Biaya pasang</dt><dd>{rupiah(q.installation_fee)}</dd></div>}
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd>{rupiah(q.grand_total)}</dd></div>
            </dl>
            {page.quote_expires_at && (
              <p className="mt-3 text-xs text-muted-foreground">Berlaku sampai {new Date(page.quote_expires_at).toLocaleString("id-ID")}</p>
            )}
          </section>
        )}

        {page.confirmable ? (
          <div className="mt-6 space-y-3">
            <button type="button" onClick={confirm} disabled={busy}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Konfirmasi Pesanan
            </button>
            <button type="button" onClick={() => setReviseOpen(true)}
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border text-sm">
              Minta Revisi / Nego
            </button>
            <p className="text-center text-xs text-muted-foreground">Dengan menekan Konfirmasi, Anda menyetujui penawaran ini dan tagihan akan diterbitkan.</p>
          </div>
        ) : (
          !page.expired && (
            <p className="mt-6 rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              Status pesanan: {page.status_label}
              {page.payment_url && <> · <a href={page.payment_url} className="underline">Lihat pembayaran</a></>}
            </p>
          )
        )}

        <Link to="/" className="mt-8 block text-center text-sm underline underline-offset-4">Kembali ke Livora</Link>
      </div>

      {reviseOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-3xl bg-card p-6 sm:rounded-3xl">
            <h2 className="serif text-xl">Minta Revisi / Nego</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tulis bagian yang ingin diubah atau harga yang Anda harapkan. Tim kami akan membalas lewat WhatsApp.</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={1000} autoFocus
              className="mt-4 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-foreground"
              placeholder="Contoh: ongkirnya bisa dikurangi? atau ukurannya mau saya ubah…" />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setReviseOpen(false)} className="h-11 flex-1 rounded-full border border-border text-sm">Batal</button>
              <button type="button" onClick={revise} disabled={busy} className="h-11 flex-1 rounded-full bg-foreground text-sm font-medium text-background disabled:opacity-40">
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
