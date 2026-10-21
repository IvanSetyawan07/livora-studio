import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Check, Copy, Loader2, MessageCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getPayPage, invoicePdfUrl, type PayPage } from "@/lib/shopPublic";
import { rupiah } from "@/lib/shop";

/** Halaman Ringkasan Pembayaran — bertoken, tanpa login. Transfer BCA + kode unik; QRIS segera hadir. */
export default function OrderPay() {
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [page, setPage] = useState<PayPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getPayPage(code, token).then(setPage).catch(() => setError("Tautan tidak valid atau sudah tidak berlaku."));
  }, [code, token]);

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    toast.success("Disalin");
    setTimeout(() => setCopied(null), 2000);
  };

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="serif mt-4 text-2xl">Tautan tidak berlaku</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!page) return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;

  const waText = encodeURIComponent(`Halo Livora, saya sudah transfer untuk pesanan ${page.code}. Ini bukti transfernya.`);

  return (
    <main className="min-h-screen bg-background px-4 pt-24 pb-16">
      <div className="mx-auto max-w-md">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Pembayaran</p>
        <h1 className="serif mt-2 text-3xl">{page.paid ? "Pembayaran lunas" : "Ringkasan Pembayaran"}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{page.code}</p>

        {page.paid ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-6 w-6" /></div>
            <p className="serif mt-3 text-xl">Lunas</p>
            <p className="mt-1 text-sm text-emerald-900">Terima kasih! Pesanan Anda sedang kami siapkan.</p>
            {page.invoice_id && (
              <a href={invoicePdfUrl(page.code, token)} className="mt-4 inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background">
                Unduh Invoice {page.invoice_number}
              </a>
            )}
          </div>
        ) : (
          <>
            <section className="mt-6 rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Total transfer</p>
              <p className="serif mt-1 text-3xl">{rupiah(page.transfer_total)}</p>
              {page.unique_code ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sudah termasuk kode unik <span className="font-mono font-semibold">{page.unique_code}</span> — kode ini bagian dari total agar pembayaran Anda mudah kami kenali. Transfer tepat sampai 3 digit terakhir.
                </p>
              ) : null}
              {page.payment_due_at && (
                <p className="mt-2 text-xs text-muted-foreground">Batas bayar: {new Date(page.payment_due_at).toLocaleString("id-ID")}</p>
              )}
            </section>

            <section className="mt-4 rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Transfer {page.bank.name}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xl tracking-wider">{page.bank.account ?? "(menyusul)"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">a.n. {page.bank.holder ?? "-"}</p>
                </div>
                {page.bank.account && (
                  <button type="button" onClick={() => copy("rek", page.bank.account!)} aria-label="Salin nomor rekening"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border hover:bg-muted">
                    {copied === "rek" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => copy("total", String(page.transfer_total))}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border text-sm hover:bg-muted">
                {copied === "total" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Salin nominal transfer
              </button>
            </section>

            <section className="mt-4 rounded-2xl border border-dashed border-border p-5 text-center">
              <p className="text-sm font-medium text-muted-foreground">QRIS</p>
              <p className="mt-1 text-xs text-muted-foreground">Segera hadir</p>
            </section>

            <section className="mt-4 rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-medium">Setelah transfer</p>
              <p className="mt-1 text-sm text-muted-foreground">Kirim foto bukti transfer ke WhatsApp kami. Tim akan memverifikasi, lalu invoice lunas dikirim ke chat Anda.</p>
              {page.wa_number && (
                <a href={`https://wa.me/${page.wa_number}?text=${waText}`} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-sm font-medium text-white">
                  <MessageCircle className="h-4 w-4" /> Kirim bukti via WhatsApp
                </a>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
