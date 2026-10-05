import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Download, ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { adminShop, downloadPrivate, openPrivate, rupiah, type Quote } from "@/lib/shop";
import StatusBadge from "@/components/shop/StatusBadge";
import { useConfirm } from "@/components/shop/useConfirm";

const NEXT: Record<string, { to: string; label: string }> = {
  dibayar: { to: "diproses", label: "Mulai proses" },
  diproses: { to: "siap_kirim", label: "Tandai siap kirim" },
  perlu_tindakan: { to: "diproses", label: "Lanjutkan proses" },
  siap_kirim: { to: "dikirim", label: "Tandai dikirim" },
  dikirim: { to: "diterima", label: "Tandai diterima" },
  diterima: { to: "selesai", label: "Selesaikan pesanan" },
};
const CANCELABLE = ["menunggu_wa", "wa_terhubung", "menunggu_data", "data_lengkap", "menunggu_review_admin", "penawaran", "menunggu_bayar"];

export default function AdminShopOrderDetail() {
  const { code = "" } = useParams();
  const [o, setO] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const confirm = useConfirm();
  const load = useCallback(() => adminShop.order(code).then(setO).catch((e) => toast.error(e.message)), [code]);
  useEffect(() => { load(); }, [load]);

  const run = async (key: string, fn: () => Promise<any>, ok: string) => {
    setBusy(key);
    try { const r = await fn(); if (r && r.code) setO(r); else await load(); toast.success(ok); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  if (!o) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  const s = o.shipping ?? null;

  return (
    <div className="space-y-6">
      <Link to="/admin/shop/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Semua pesanan</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold">{o.code}</h1>
        <StatusBadge status={o.status} label={o.status_label} />
        <span className="text-xs text-muted-foreground">sumber: {o.source}</span>
      </div>

      {/* Tindakan berikutnya */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Tindakan berikutnya</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={o.wa_url} target="_blank" rel="noopener noreferrer" className="btn"><MessageCircle className="h-4 w-4" /> Chat {o.customer_phone}</a>
          {o.status === "menunggu_wa" && <button type="button" className="btn" disabled={!!busy} onClick={() => run("wa", () => adminShop.waConnected(o.code), "Ditandai terhubung")}>Tandai sudah chat</button>}
          {["menunggu_wa", "wa_terhubung", "menunggu_data"].includes(o.status) && (
            <button type="button" className="btn btn-dark" disabled={!!busy} onClick={() => run("form", async () => {
              const { form_url } = await adminShop.sendForm(o.code);
              await navigator.clipboard.writeText(form_url).catch(() => {});
            }, "Tautan form dikirim & disalin")}>{busy === "form" && <Loader2 className="h-4 w-4 animate-spin" />} Kirim form data</button>
          )}
          {o.form_url && <button type="button" className="btn" onClick={() => { navigator.clipboard.writeText(o.form_url); toast.success("Tautan form disalin"); }}><Copy className="h-4 w-4" /> Salin tautan form</button>}
          {NEXT[o.status] && <AdvanceButton o={o} busy={busy} run={run} />}
          {CANCELABLE.includes(o.status) && (
            <button type="button" className="btn text-red-600" disabled={!!busy} onClick={async () => {
              const reason = await confirm.ask({ title: `Batalkan ${o.code}?`, text: "Alasan akan dikirim ke pelanggan.", inputLabel: "Alasan pembatalan", confirmLabel: "Batalkan pesanan", danger: true });
              if (typeof reason === "string") run("cancel", () => adminShop.cancel(o.code, reason), "Pesanan dibatalkan");
            }}>Batalkan</button>
          )}
        </div>
      </section>

      {["data_lengkap", "menunggu_review_admin", "penawaran", "wa_terhubung", "menunggu_data"].includes(o.status) && <QuoteEditor o={o} onSent={setO} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 text-sm">
          <h2 className="font-semibold">Pelanggan</h2>
          <p className="mt-2">{o.customer_name}</p>
          <p className="text-muted-foreground">{o.customer_phone} · {o.customer_email ?? "tanpa email"}</p>
          {o.note && <p className="mt-2 rounded-lg bg-muted p-3">“{o.note}”</p>}
          <h3 className="mt-4 font-semibold">Pengiriman</h3>
          {s ? (
            <div className="mt-1 space-y-0.5 text-muted-foreground">
              <p className="text-foreground">{s.method === "pickup" ? "Ambil di showroom" : `${s.recipient} · ${s.phone}`}</p>
              {s.method !== "pickup" && <p>{[s.street, s.rt && `RT ${s.rt}`, s.rw && `RW ${s.rw}`, s.village, s.district, s.city, s.province, s.postal_code].filter(Boolean).join(", ")}</p>}
              {s.landmark && <p>Patokan: {s.landmark}</p>}
              {s.map_url && <a href={s.map_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Google Maps <ExternalLink className="h-3 w-3" /></a>}
              <p>{[s.building_type, s.floor && `lantai ${s.floor}`, s.has_lift ? "ada lift" : null, s.door_width_cm && `pintu ${s.door_width_cm} cm`, s.needs_installation ? "perlu pasang" : null].filter(Boolean).join(" · ")}</p>
              {s.preferred_date && <p>Ingin dikirim: {s.preferred_date}</p>}
              {s.wants_tax_invoice && <p>Faktur pajak: {s.company} {s.npwp ? `· NPWP ${s.npwp}` : ""}</p>}
            </div>
          ) : <p className="mt-1 text-muted-foreground">Belum diisi.</p>}
          {o.tracking_number && <p className="mt-2">Kurir {o.courier} · resi <span className="font-mono">{o.tracking_number}</span></p>}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 text-sm">
          <h2 className="font-semibold">Pembayaran & dokumen</h2>
          {!o.payments?.length && <p className="mt-2 text-muted-foreground">Belum ada tagihan.</p>}
          {o.payments?.map((p: any) => (
            <div key={p.id} className="mt-3 rounded-lg border border-border p-3">
              <div className="flex justify-between"><span>{rupiah(p.amount)} · {p.method ?? "belum dipilih"}</span><span className="text-xs">{p.status}</span></div>
              {p.proofs?.map((pr: any) => (
                <div key={pr.id} className="mt-2 flex items-center justify-between text-xs">
                  <button type="button" className="underline" onClick={() => openPrivate(`/admin/shop/proofs/${pr.id}/file`).catch((e) => toast.error(e.message))}>Bukti #{pr.id}</button>
                  <span>{pr.status}{pr.reason ? ` — ${pr.reason}` : ""}</span>
                </div>
              ))}
            </div>
          ))}
          <ul className="mt-3 space-y-2">
            {o.documents?.map((d: any) => (
              <li key={d.id}>
                <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left hover:bg-muted"
                  onClick={() => downloadPrivate(`/admin/shop/documents/${d.id}`, `${d.title}-${d.number.replace(/\//g, "-")}.pdf`).catch((e) => toast.error(e.message))}>
                  <Download className="h-4 w-4" /> <span className="flex-1">{d.title} v{d.version}</span><span className="font-mono text-[11px] text-muted-foreground">{d.number}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 text-sm">
        <h2 className="font-semibold">Riwayat</h2>
        <ul className="mt-3 space-y-2">
          {o.audit?.map((a: any) => (
            <li key={a.id} className="flex gap-3"><span className="w-36 shrink-0 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span><span>{a.action}{a.user ? ` · ${a.user.name}` : ""}</span></li>
          ))}
          {!o.audit?.length && <li className="text-muted-foreground">Belum ada riwayat.</li>}
        </ul>
      </section>
      {confirm.node}
      <style>{`.btn{display:inline-flex;align-items:center;gap:.4rem;height:2.5rem;padding:0 1rem;border-radius:.5rem;border:1px solid hsl(var(--border));font-size:.875rem;background:hsl(var(--card))}.btn:disabled{opacity:.5}.btn-dark{background:hsl(var(--foreground));color:hsl(var(--background));border-color:transparent}`}</style>
    </div>
  );
}

function AdvanceButton({ o, busy, run }: { o: any; busy: string | null; run: (k: string, fn: () => Promise<any>, ok: string) => void }) {
  const n = NEXT[o.status];
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [date, setDate] = useState("");
  const needShip = n.to === "dikirim";
  const needDate = n.to === "siap_kirim";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {needShip && <><input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Kurir" aria-label="Kurir" value={courier} onChange={(e) => setCourier(e.target.value)} /><input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="No. resi" aria-label="Nomor resi" value={tracking} onChange={(e) => setTracking(e.target.value)} /></>}
      {needDate && <input type="date" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" aria-label="Jadwal kirim" value={date} onChange={(e) => setDate(e.target.value)} />}
      <button type="button" className="btn btn-dark" disabled={!!busy || (needShip && !courier)}
        onClick={() => run("adv", () => adminShop.advance(o.code, { to: n.to, courier: courier || undefined, tracking_number: tracking || undefined, delivery_date: date || undefined }), "Status diperbarui")}>
        {busy === "adv" && <Loader2 className="h-4 w-4 animate-spin" />} {n.label}
      </button>
    </div>
  );
}

function QuoteEditor({ o, onSent }: { o: any; onSent: (x: any) => void }) {
  const [prices, setPrices] = useState<Record<number, number>>(() => Object.fromEntries(o.items.map((i: any) => [i.id, i.unit_price ?? 0])));
  const [fees, setFees] = useState({ shipping_fee: o.shipping_fee ?? 0, installation_fee: o.installation_fee ?? 0, other_fee: o.other_fee ?? 0 });
  const [disc, setDisc] = useState({ extra_discount_type: o.extra_discount_type ?? "amount", extra_discount_value: o.extra_discount_value ?? 0, extra_discount_reason: o.extra_discount_reason ?? "" });
  const [preview, setPreview] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const body = useMemo(() => ({ unit_prices: prices, ...fees, ...disc }), [prices, fees, disc]);

  useEffect(() => {
    const t = setTimeout(() => adminShop.previewQuote(o.code, body).then(setPreview).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [o.code, body]);

  const send = async () => {
    setBusy(true);
    try { onSent(await adminShop.sendQuote(o.code, body)); toast.success("Penawaran dikirim ke pelanggan"); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const num = (v: number, set: (n: number) => void, label: string) => (
    <input type="number" min={0} value={v} aria-label={label} onChange={(e) => set(Math.max(0, Number(e.target.value)))} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-right text-sm" />
  );

  return (
    <section className="rounded-xl border border-border bg-card p-5 text-sm">
      <h2 className="font-semibold">{o.status === "penawaran" ? "Revisi penawaran" : "Susun penawaran"}</h2>
      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          {o.items.map((i: any) => (
            <div key={i.id} className="grid grid-cols-[1fr_140px] items-center gap-3">
              <span className="truncate">{i.title} <span className="text-muted-foreground">{i.variant_name ? `· ${i.variant_name}` : ""} ×{i.quantity}</span></span>
              {num(prices[i.id] ?? 0, (n) => setPrices((p) => ({ ...p, [i.id]: n })), `Harga satuan ${i.title}`)}
            </div>
          ))}
          <div className="grid grid-cols-[1fr_140px] items-center gap-3 pt-2"><span>Ongkos kirim</span>{num(fees.shipping_fee, (n) => setFees({ ...fees, shipping_fee: n }), "Ongkos kirim")}</div>
          <div className="grid grid-cols-[1fr_140px] items-center gap-3"><span>Biaya pemasangan</span>{num(fees.installation_fee, (n) => setFees({ ...fees, installation_fee: n }), "Biaya pemasangan")}</div>
          <div className="grid grid-cols-[1fr_140px] items-center gap-3"><span>Biaya lain</span>{num(fees.other_fee, (n) => setFees({ ...fees, other_fee: n }), "Biaya lain")}</div>
          <div className="grid grid-cols-[1fr_80px_140px] items-center gap-3 pt-2">
            <span>Diskon tambahan <span className="text-xs text-muted-foreground">(Owner/Keuangan)</span></span>
            <select aria-label="Jenis diskon" value={disc.extra_discount_type} onChange={(e) => setDisc({ ...disc, extra_discount_type: e.target.value })} className="h-9 rounded-lg border border-border bg-background px-2"><option value="amount">Rp</option><option value="percent">%</option></select>
            {num(disc.extra_discount_value, (n) => setDisc({ ...disc, extra_discount_value: n }), "Nilai diskon")}
          </div>
          {Number(disc.extra_discount_value) > 0 && <input className="h-9 w-full rounded-lg border border-border bg-background px-3" placeholder="Alasan diskon (wajib)" aria-label="Alasan diskon" value={disc.extra_discount_reason} onChange={(e) => setDisc({ ...disc, extra_discount_reason: e.target.value })} />}
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          {preview ? (
            <dl className="space-y-1">
              {([["Subtotal", preview.subtotal], ["Diskon produk", -preview.product_discount], ["Diskon tambahan", -preview.extra_discount], ["DPP", preview.dpp], ["PPN 11%", preview.ppn], ["Ongkir", preview.shipping_fee], ["Pasang", preview.installation_fee], ["Lain", preview.other_fee]] as [string, number][]).map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd>{v < 0 ? `− ${rupiah(-v)}` : rupiah(v)}</dd></div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Total</dt><dd>{rupiah(preview.grand_total)}</dd></div>
            </dl>
          ) : <Loader2 className="h-4 w-4 animate-spin" />}
          <button type="button" disabled={busy} onClick={send} className="mt-4 h-10 w-full rounded-lg bg-foreground text-sm text-background disabled:opacity-50">{busy ? "Mengirim…" : "Kirim penawaran"}</button>
          <p className="mt-2 text-xs text-muted-foreground">Pelanggan menerima WA & email. Berlaku 3 hari.</p>
        </div>
      </div>
    </section>
  );
}
