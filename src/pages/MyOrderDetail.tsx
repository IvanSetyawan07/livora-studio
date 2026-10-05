import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Download, Loader2, MessageCircle, QrCode, Upload, Landmark, Copy } from "lucide-react";
import { toast } from "sonner";
import { authStorage } from "@/lib/api";
import { rememberIntendedPath } from "@/lib/authGuard";
import { imgUrl } from "@/lib/adminApi";
import {
  ORDER_STEPS, approveQuote, cancelOrder, downloadPrivate, getOrder, getWaLink, rupiah, startQris, stepIndex, uploadPaymentProof, type ShopOrder,
} from "@/lib/shop";
import StatusBadge from "@/components/shop/StatusBadge";

export default function MyOrderDetail() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [qr, setQr] = useState<{ qr_url: string | null; amount: number; expires_at: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => getOrder(code).then(setOrder).catch(() => setMissing(true)), [code]);

  useEffect(() => {
    if (!authStorage.getToken()) { rememberIntendedPath(); navigate("/login", { replace: true }); return; }
    load();
  }, [load, navigate]);

  // Pantau status saat menunggu pembayaran QRIS
  useEffect(() => {
    if (order?.status !== "menunggu_bayar") return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [order?.status, load]);

  const run = async (key: string, fn: () => Promise<ShopOrder | void>, ok?: string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (r) setOrder(r);
      if (ok) toast.success(ok);
    } catch (e: any) {
      toast.error(e?.message || "Terjadi kesalahan");
    } finally {
      setBusy(null);
    }
  };

  if (missing) return <main className="min-h-screen px-4 pt-32 text-center"><p className="serif text-2xl">Pesanan tidak ditemukan</p><Link to="/profile/orders" className="mt-4 inline-block underline">Kembali ke Pesanan Saya</Link></main>;
  if (!order) return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></main>;

  const idx = stepIndex(order.status);
  const closed = ["dibatalkan", "kedaluwarsa"].includes(order.status);
  const payment = order.payments?.find((p) => p.status === "menunggu") ?? null;
  const pendingProof = payment?.proofs.some((p) => p.status === "menunggu");
  const rejectedProof = payment?.proofs.find((p) => p.status === "ditolak");
  const q = order.quote;

  return (
    <main className="min-h-screen bg-background pt-28 pb-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Link to="/profile/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Pesanan Saya</Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl sm:text-3xl">{order.code}</h1>
          <StatusBadge status={order.status} label={order.status_label} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Dibuat {new Date(order.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>

        {!closed && (
          <ol className="mt-8 grid grid-cols-7 gap-1" aria-label="Tahap pesanan">
            {ORDER_STEPS.map((s, i) => (
              <li key={s.key} className="text-center">
                <div className={`mx-auto h-1.5 rounded-full ${i <= idx ? "bg-foreground" : "bg-border"}`} />
                <p className={`mt-2 hidden text-[11px] sm:block ${i === idx ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
              </li>
            ))}
          </ol>
        )}

        {/* Kartu tindakan utama */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          {closed ? (
            <p className="text-sm text-muted-foreground">Pesanan ini sudah {order.status_label.toLowerCase()}. Silakan buat pesanan baru dari keranjang bila masih berminat.</p>
          ) : order.status === "menunggu_wa" || order.status === "wa_terhubung" ? (
            <Action title="Kirim kode ke WhatsApp" text="Tim kami menunggu chat Anda untuk mulai konsultasi dan menyiapkan penawaran.">
              <button type="button" onClick={async () => window.open(await getWaLink(order.code), "_blank", "noopener")} className="btn-primary bg-emerald-600"><MessageCircle className="h-4 w-4" /> Buka WhatsApp</button>
            </Action>
          ) : order.status === "menunggu_data" ? (
            <Action title="Isi data pengiriman" text="Tautan form sudah kami kirim lewat WhatsApp & email. Buka tautan itu untuk mengisi alamat dan detail lokasi." />
          ) : ["data_lengkap", "menunggu_review_admin"].includes(order.status) ? (
            <Action title="Penawaran sedang disiapkan" text="Tim kami menghitung ongkir dan biaya lain. Anda akan mendapat kabar lewat WhatsApp & email." />
          ) : order.status === "penawaran" && q ? (
            <div>
              <h2 className="serif text-xl">Penawaran harga</h2>
              <p className="mt-1 text-sm text-muted-foreground">Berlaku sampai {order.quote_expires_at ? new Date(order.quote_expires_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—"}.</p>
              <Totals q={q} />
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button type="button" disabled={!!busy} onClick={() => run("approve", () => approveQuote(order.code), "Penawaran disetujui. Tagihan sudah terbit.")} className="btn-primary flex-1">
                  {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Setujui & lanjut bayar
                </button>
                <button type="button" onClick={async () => window.open(await getWaLink(order.code), "_blank", "noopener")} className="btn-ghost flex-1">Tanya / minta revisi</button>
              </div>
            </div>
          ) : order.status === "menunggu_bayar" ? (
            <div>
              <h2 className="serif text-xl">Bayar {rupiah(payment?.amount ?? order.grand_total)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pembayaran lunas. Batas waktu {payment?.expires_at ? new Date(payment.expires_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—"}.</p>
              {pendingProof ? (
                <p className="mt-4 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">Bukti transfer sedang diperiksa tim Keuangan. Biasanya selesai dalam 1 hari kerja.</p>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {order.payment_options?.qris && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="flex items-center gap-2 font-medium"><QrCode className="h-4 w-4" /> QRIS</p>
                      <p className="mt-1 text-xs text-muted-foreground">Scan dengan aplikasi bank atau e-wallet apa pun. Status otomatis terkonfirmasi.</p>
                      {qr?.qr_url ? (
                        <img src={qr.qr_url} alt="Kode QRIS pembayaran" className="mx-auto mt-3 w-48 rounded-lg bg-white p-2" />
                      ) : (
                        <button type="button" disabled={!!busy} onClick={() => run("qris", async () => setQr(await startQris(order.code)))} className="btn-primary mt-3 w-full">
                          {busy === "qris" && <Loader2 className="h-4 w-4 animate-spin" />} Tampilkan QRIS
                        </button>
                      )}
                    </div>
                  )}
                  <div className="rounded-xl border border-border p-4">
                    <p className="flex items-center gap-2 font-medium"><Landmark className="h-4 w-4" /> Transfer {order.payment_options?.bank.name ?? "BCA"}</p>
                    {order.payment_options?.bank.account ? (
                      <button type="button" onClick={() => { navigator.clipboard.writeText(order.payment_options!.bank.account!); toast.success("Nomor rekening disalin"); }} className="mt-2 flex items-center gap-2 font-mono text-lg">
                        {order.payment_options.bank.account} <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ) : <p className="mt-2 text-sm text-muted-foreground">Nomor rekening dikirim lewat WhatsApp.</p>}
                    <p className="text-xs text-muted-foreground">a.n. {order.payment_options?.bank.holder ?? "Livora"}</p>
                    {rejectedProof && <p className="mt-2 text-xs text-red-600">Bukti sebelumnya ditolak: {rejectedProof.reason}</p>}
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) run("proof", () => uploadPaymentProof(order.code, f), "Bukti transfer terkirim"); e.target.value = ""; }} />
                    <button type="button" disabled={!!busy} onClick={() => fileRef.current?.click()} className="btn-ghost mt-3 w-full">
                      {busy === "proof" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Unggah bukti transfer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Action title={ORDER_STEPS[idx]?.label ?? order.status_label} text={ORDER_STEPS[idx]?.hint ?? ""}>
              {order.tracking_number && <p className="text-sm">Kurir: <b>{order.courier}</b> · Resi: <span className="font-mono">{order.tracking_number}</span></p>}
              {order.delivery_date && <p className="text-sm">Jadwal kirim: {new Date(order.delivery_date).toLocaleDateString("id-ID", { dateStyle: "long" })}</p>}
            </Action>
          )}
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="serif text-lg">Barang</h2>
            <ul className="mt-3 divide-y divide-border">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-3 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">{i.image && <img src={imgUrl(i.image)} alt={i.title} className="h-full w-full object-cover" loading="lazy" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.title}</p>
                    <p className="text-xs text-muted-foreground">{i.variant_name ?? "Tanpa varian"} · {i.quantity} unit{i.fulfillment_type === "made_to_order" ? " · Dibuat sesuai pesanan" : ""}</p>
                    {i.note && <p className="mt-0.5 text-xs text-muted-foreground">“{i.note}”</p>}
                  </div>
                  {i.unit_price !== undefined && <p className="text-sm">{rupiah(i.unit_price * i.quantity)}</p>}
                </li>
              ))}
            </ul>
            {order.status !== "penawaran" && q && <Totals q={q} />}
          </section>

          <aside className="space-y-4">
            {!!order.documents?.length && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="serif text-lg">Dokumen</h2>
                <ul className="mt-3 space-y-2">
                  {order.documents.map((d) => (
                    <li key={d.id}>
                      <button type="button" onClick={() => downloadPrivate(`/orders/${order.code}/documents/${d.id}`, `${d.title}-${d.number.replace(/\//g, "-")}.pdf`).catch((e) => toast.error(e.message))}
                        className="flex w-full items-center gap-2 rounded-xl border border-border p-3 text-left text-sm hover:bg-muted">
                        <Download className="h-4 w-4 shrink-0" />
                        <span className="min-w-0"><span className="block font-medium">{d.title}</span><span className="block truncate font-mono text-[11px] text-muted-foreground">{d.number}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {order.shipping && (
              <section className="rounded-2xl border border-border bg-card p-5 text-sm">
                <h2 className="serif text-lg">Pengiriman</h2>
                <p className="mt-2 font-medium">{order.shipping.method === "pickup" ? "Ambil di showroom" : order.shipping.recipient}</p>
                {order.shipping.method !== "pickup" && <p className="text-muted-foreground">{[order.shipping.street, order.shipping.district, order.shipping.city, order.shipping.province].filter(Boolean).join(", ")}</p>}
              </section>
            )}
            {["menunggu_wa", "wa_terhubung", "menunggu_data", "data_lengkap", "menunggu_review_admin", "penawaran"].includes(order.status) && (
              <button type="button" disabled={!!busy} onClick={() => { if (confirm("Batalkan pesanan ini?")) run("cancel", () => cancelOrder(order.code), "Pesanan dibatalkan"); }}
                className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">Batalkan pesanan</button>
            )}
          </aside>
        </div>
      </div>
      <style>{`.btn-primary{display:inline-flex;height:3rem;align-items:center;justify-content:center;gap:.5rem;border-radius:999px;background:hsl(var(--foreground));color:hsl(var(--background));padding:0 1.5rem;font-size:.875rem;font-weight:500}.btn-primary.bg-emerald-600{background:#059669;color:#fff}.btn-primary:disabled,.btn-ghost:disabled{opacity:.5}.btn-ghost{display:inline-flex;height:3rem;align-items:center;justify-content:center;gap:.5rem;border-radius:999px;border:1px solid hsl(var(--border));padding:0 1.5rem;font-size:.875rem}`}</style>
    </main>
  );
}

function Action({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div>
      <h2 className="serif text-xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      {children && <div className="mt-4 space-y-1">{children}</div>}
    </div>
  );
}

function Totals({ q }: { q: NonNullable<ShopOrder["quote"]> }) {
  const rows: [string, number, boolean?][] = [
    ["Subtotal", q.subtotal],
    ["Diskon produk", -q.product_discount],
    ["Diskon tambahan", -q.extra_discount],
    ["DPP", q.dpp],
    ["PPN 11%", q.ppn],
    ["Ongkos kirim", q.shipping_fee],
    ["Biaya pemasangan", q.installation_fee],
    ["Biaya lain", q.other_fee],
  ];
  return (
    <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
      {rows.filter(([, v], i) => i < 1 || i === 3 || i === 4 || v !== 0).map(([k, v]) => (
        <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd>{v < 0 ? `− ${rupiah(-v)}` : rupiah(v)}</dd></div>
      ))}
      <div className="flex justify-between border-t border-border pt-2 text-base font-medium"><dt>Total</dt><dd>{rupiah(q.grand_total)}</dd></div>
    </dl>
  );
}
