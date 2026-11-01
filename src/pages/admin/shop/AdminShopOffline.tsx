import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Banknote, Camera, CheckCircle2, CreditCard, FileText, Loader2, Minus, Plus,
  QrCode, Search, Store, Trash2, Truck, Wallet, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminShop, downloadPrivate, rupiah } from "@/lib/shop";
import { cn } from "@/lib/utils";

type Found = { id: number; title: string; code?: string; image?: string; price?: number; stock?: number | null; fulfillment_type?: string };
type Line = Found & { qty: number; unit_price: number; note: string };

const PPN = 0.11;
const STEPS = ["Pilih barang", "Harga & pembeli", "Pembayaran", "Selesai"];
const METHODS = [
  { v: "Tunai", icon: Banknote },
  { v: "Transfer Bank", icon: Wallet },
  { v: "Debit/Kredit (EDC)", icon: CreditCard },
  { v: "QRIS", icon: QrCode },
];
const num = (s: string) => Math.max(0, parseInt(s.replace(/\D/g, "") || "0", 10));
const fmt = (n: number) => (n ? n.toLocaleString("id-ID") : "");

/** Kasir showroom: scan/pilih barang → tentukan harga → terbitkan Invoice/Proforma. */
export default function AdminShopOffline() {
  const [step, setStep] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [buyer, setBuyer] = useState({ name: "", phone: "", email: "", address: "", note: "" });
  const [fees, setFees] = useState({ shipping: 0, install: 0, other: 0 });
  const [disc, setDisc] = useState<{ type: "percent" | "amount"; value: number; reason: string }>({ type: "amount", value: 0, reason: "" });
  const [fulfillment, setFulfillment] = useState<"bawa_pulang" | "diantar">("bawa_pulang");
  const [paid, setPaid] = useState(true);
  const [method, setMethod] = useState("Tunai");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Awaited<ReturnType<typeof adminShop.createOffline>> | null>(null);

  // Cari barang (debounce)
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      adminShop.items(q.trim()).then(setResults).catch(() => setResults([])).finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const add = (it: Found) => {
    setLines((ls) => {
      const ex = ls.find((l) => l.id === it.id);
      if (ex) return ls.map((l) => (l.id === it.id ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { ...it, qty: 1, unit_price: Math.round(Number(it.price) || 0), note: "" }];
    });
    toast.success(`${it.title} ditambahkan`);
    setQ("");
  };
  const patch = (id: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const onScan = async (raw: string) => {
    setScanning(false);
    const key = raw.includes("/items/") ? raw.split("/items/")[1].split(/[?#/]/)[0] : raw.trim();
    try {
      const r: Found[] = await adminShop.items(key);
      if (r[0]) add(r[0]); else toast.error("Barang dari QR ini tidak ditemukan");
    } catch { toast.error("Gagal membaca barang"); }
  };

  const t = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.unit_price * l.qty, 0);
    const extra = disc.value ? Math.min(subtotal, disc.type === "percent" ? Math.round((subtotal * Math.min(100, disc.value)) / 100) : disc.value) : 0;
    const dpp = subtotal - extra;
    const ppn = Math.round(dpp * PPN);
    const delivery = fulfillment === "diantar" ? fees.shipping + fees.install : 0;
    return { subtotal, extra, dpp, ppn, total: dpp + ppn + delivery + fees.other };
  }, [lines, disc, fees, fulfillment]);

  const canNext = [lines.length > 0 && lines.every((l) => l.qty > 0), buyer.name.trim().length > 1 && (!disc.value || disc.reason.trim()), true][step] ?? true;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await adminShop.createOffline({
        customer_name: buyer.name.trim(), customer_phone: buyer.phone || null, customer_email: buyer.email || null,
        address: fulfillment === "diantar" ? buyer.address : null, note: buyer.note || null,
        items: lines.map((l) => ({ item_id: l.id, quantity: l.qty, unit_price: l.unit_price, note: l.note || null })),
        shipping_fee: fulfillment === "diantar" ? fees.shipping : 0, installation_fee: fulfillment === "diantar" ? fees.install : 0, other_fee: fees.other,
        extra_discount_type: disc.value ? disc.type : null, extra_discount_value: disc.value || null, extra_discount_reason: disc.value ? disc.reason : null,
        paid, payment_method: paid ? method : null, fulfillment,
      });
      setDone(r);
      setStep(3);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Gagal menyimpan pembelian");
    } finally { setBusy(false); }
  };

  const reset = () => {
    setStep(0); setLines([]); setBuyer({ name: "", phone: "", email: "", address: "", note: "" });
    setFees({ shipping: 0, install: 0, other: 0 }); setDisc({ type: "amount", value: 0, reason: "" }); setDone(null); setPaid(true); setMethod("Tunai");
  };

  const docName = done?.document ? `${done.document.title === "Tagihan" ? "Proforma-Invoice" : done.document.title}-${done.document.number.replace(/\//g, "-")}.pdf` : "";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"><Store className="h-4 w-4" /> Kasir showroom</p>
          <h1 className="mt-1 font-serif text-3xl">Pembelian offline</h1>
          <p className="text-sm text-muted-foreground">Untuk pembeli yang datang langsung. Invoice dicetak saat itu juga.</p>
        </div>
      </header>

      {/* Stepper */}
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("rounded-xl border px-3 py-2 text-xs sm:text-sm transition-colors",
            i === step ? "border-primary bg-primary/10 text-foreground" : i < step ? "border-border bg-muted text-foreground" : "border-border text-muted-foreground")}>
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background text-[11px] font-semibold">
              {i < step ? <CheckCircle2 className="h-4 w-4 text-primary" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{s}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          {step === 0 && (
            <>
              <div className="rounded-2xl border bg-card p-4 sm:p-5">
                <p className="mb-3 text-sm font-medium">1. Scan QR di label barang, atau cari nama/kode</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" size="lg" className="gap-2" onClick={() => setScanning(true)}><Camera className="h-5 w-5" /> Scan QR barang</Button>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik nama atau kode barang…" className="h-11 pl-9" />
                    {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                  </div>
                </div>
                {results.length > 0 && (
                  <ul className="mt-3 max-h-72 divide-y overflow-auto rounded-xl border">
                    {results.map((r) => (
                      <li key={r.id}>
                        <button type="button" onClick={() => add(r)} className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-muted">
                          <Thumb src={r.image} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{r.title}</p>
                            <p className="text-xs text-muted-foreground">{r.code ?? "—"} · {r.stock == null ? "stok tidak dicatat" : `stok ${r.stock}`}</p>
                          </div>
                          <span className="text-sm">{r.price ? rupiah(Number(r.price)) : "Harga belum diatur"}</span>
                          <Plus className="h-4 w-4 text-primary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border bg-card p-4 sm:p-5">
                <p className="mb-3 text-sm font-medium">Barang dibeli ({lines.length})</p>
                {lines.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada barang. Scan QR atau cari di atas.</div>
                ) : (
                  <ul className="space-y-2">
                    {lines.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                        <Thumb src={l.image} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{l.title}</p>
                          <p className="text-xs text-muted-foreground">{l.code ?? "—"}{l.fulfillment_type === "made_to_order" && " · dibuat dulu"}</p>
                        </div>
                        <Qty value={l.qty} onChange={(v) => patch(l.id, { qty: v })} />
                        <Button type="button" variant="ghost" size="icon" aria-label="Hapus" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}><Trash2 className="h-4 w-4" /></Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="rounded-2xl border bg-card p-4 sm:p-5">
                <p className="mb-1 text-sm font-medium">2. Tentukan harga final per barang</p>
                <p className="mb-3 text-xs text-muted-foreground">Harga katalog sudah terisi. Ubah jika ada harga khusus showroom. Harga belum termasuk PPN 11%.</p>
                <ul className="space-y-2">
                  {lines.map((l) => (
                    <li key={l.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_160px_auto]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{l.title} <span className="text-muted-foreground">× {l.qty}</span></p>
                        <Input value={l.note} onChange={(e) => patch(l.id, { note: e.target.value })} placeholder="Catatan (warna, ukuran…)" className="mt-1.5 h-8 text-xs" />
                      </div>
                      <MoneyInput value={l.unit_price} onChange={(v) => patch(l.id, { unit_price: v })} />
                      <p className="col-span-2 text-right text-sm font-medium sm:col-span-1 sm:w-28">{rupiah(l.unit_price * l.qty)}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border bg-card p-4 sm:p-5">
                <p className="mb-3 text-sm font-medium">Data pembeli</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nama pembeli *"><Input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} placeholder="Nama di invoice" /></Field>
                  <Field label="No. WhatsApp"><Input value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} placeholder="08xx (opsional)" inputMode="tel" /></Field>
                  <Field label="Email"><Input value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} placeholder="opsional" type="email" /></Field>
                  <Field label="Catatan"><Input value={buyer.note} onChange={(e) => setBuyer({ ...buyer, note: e.target.value })} placeholder="opsional" /></Field>
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-4 sm:p-5">
                <p className="mb-3 text-sm font-medium">Barang dibawa ke mana?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Choice active={fulfillment === "bawa_pulang"} onClick={() => setFulfillment("bawa_pulang")} icon={Store} title="Dibawa langsung" desc="Pembeli bawa pulang hari ini" />
                  <Choice active={fulfillment === "diantar"} onClick={() => setFulfillment("diantar")} icon={Truck} title="Diantar Livora" desc="Lanjut ke Pantau Proses" />
                </div>
                {fulfillment === "diantar" && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Alamat pengiriman" className="sm:col-span-2"><Textarea rows={2} value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} /></Field>
                    <Field label="Ongkir"><MoneyInput value={fees.shipping} onChange={(v) => setFees({ ...fees, shipping: v })} /></Field>
                    <Field label="Biaya pasang"><MoneyInput value={fees.install} onChange={(v) => setFees({ ...fees, install: v })} /></Field>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border bg-card p-4 sm:p-5">
                <p className="mb-1 text-sm font-medium">Diskon tambahan & biaya lain</p>
                <p className="mb-3 text-xs text-muted-foreground">Diskon hanya bisa disimpan oleh Owner atau Keuangan, dan wajib diberi alasan.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Jenis diskon">
                    <div className="flex rounded-md border p-0.5">
                      {(["amount", "percent"] as const).map((k) => (
                        <button key={k} type="button" onClick={() => setDisc({ ...disc, type: k })} className={cn("flex-1 rounded px-2 py-1.5 text-xs", disc.type === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{k === "amount" ? "Rupiah" : "Persen"}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label={disc.type === "percent" ? "Diskon (%)" : "Diskon (Rp)"}>
                    {disc.type === "percent"
                      ? <Input inputMode="numeric" value={disc.value || ""} onChange={(e) => setDisc({ ...disc, value: Math.min(100, num(e.target.value)) })} placeholder="0" />
                      : <MoneyInput value={disc.value} onChange={(v) => setDisc({ ...disc, value: v })} />}
                  </Field>
                  <Field label="Biaya lain"><MoneyInput value={fees.other} onChange={(v) => setFees({ ...fees, other: v })} /></Field>
                  {disc.value > 0 && <Field label="Alasan diskon *" className="sm:col-span-3"><Input value={disc.reason} onChange={(e) => setDisc({ ...disc, reason: e.target.value })} placeholder="mis. display unit, pelanggan lama" /></Field>}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="rounded-2xl border bg-card p-4 sm:p-5">
              <p className="mb-3 text-sm font-medium">3. Apakah pembeli sudah bayar sekarang?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Choice active={paid} onClick={() => setPaid(true)} icon={CheckCircle2} title="Sudah lunas" desc="Terbit Invoice lunas, stok langsung berkurang" />
                <Choice active={!paid} onClick={() => setPaid(false)} icon={FileText} title="Belum bayar" desc="Terbit Proforma Invoice untuk dibayar nanti" />
              </div>
              {paid && (
                <>
                  <p className="mb-2 mt-5 text-sm font-medium">Metode pembayaran</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {METHODS.map((m) => (
                      <button key={m.v} type="button" onClick={() => setMethod(m.v)}
                        className={cn("flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-colors", method === m.v ? "border-primary bg-primary/10" : "hover:bg-muted")}>
                        <m.icon className="h-5 w-5" />{m.v}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="mt-5 rounded-xl bg-muted p-4 text-sm">
                <p className="font-medium">Periksa lagi sebelum menyimpan</p>
                <p className="mt-1 text-muted-foreground">{buyer.name} · {lines.reduce((s, l) => s + l.qty, 0)} barang · {fulfillment === "diantar" ? "diantar" : "dibawa langsung"}</p>
              </div>
            </div>
          )}

          {step === 3 && done && (
            <div className="rounded-2xl border bg-card p-6 text-center sm:p-10">
              <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
              <h2 className="mt-3 font-serif text-2xl">{paid ? "Pembelian lunas tercatat" : "Proforma Invoice siap"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pesanan <b className="text-foreground">{done.code}</b> · {rupiah(done.grand_total)}</p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                {done.document && (
                  <Button size="lg" className="gap-2" onClick={() => downloadPrivate(`/admin/shop/documents/${done.document!.id}`, docName).catch((e) => toast.error(e.message))}>
                    <FileText className="h-5 w-5" /> Unduh & cetak {done.document.title === "Tagihan" ? "Proforma Invoice" : "Invoice"}
                  </Button>
                )}
                <Button size="lg" variant="outline" asChild><Link to={`/admin/shop/orders/${done.code}`}>Lihat detail pesanan</Link></Button>
                <Button size="lg" variant="ghost" onClick={reset}>Pembelian baru</Button>
              </div>
            </div>
          )}

          {step < 3 && (
            <div className="flex justify-between gap-2">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Kembali</Button>
              {step < 2
                ? <Button size="lg" disabled={!canNext} onClick={() => setStep(step + 1)} className="gap-2">Lanjut <ArrowRight className="h-4 w-4" /></Button>
                : <Button size="lg" disabled={busy} onClick={submit} className="gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{paid ? "Simpan & terbitkan Invoice" : "Simpan & terbitkan Proforma"}</Button>}
            </div>
          )}
        </section>

        {/* Ringkasan */}
        <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ringkasan</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row k="Subtotal" v={rupiah(t.subtotal)} />
            {t.extra > 0 && <Row k="Diskon tambahan" v={`− ${rupiah(t.extra)}`} />}
            <Row k="PPN 11%" v={rupiah(t.ppn)} />
            {fulfillment === "diantar" && fees.shipping > 0 && <Row k="Ongkir" v={rupiah(fees.shipping)} />}
            {fulfillment === "diantar" && fees.install > 0 && <Row k="Pasang" v={rupiah(fees.install)} />}
            {fees.other > 0 && <Row k="Biaya lain" v={rupiah(fees.other)} />}
          </dl>
          <div className="mt-4 border-t pt-4">
            <p className="text-xs text-muted-foreground">Total dibayar</p>
            <p className="font-serif text-3xl">{rupiah(t.total)}</p>
          </div>
        </aside>
      </div>

      {scanning && <Scanner onResult={onScan} onClose={() => setScanning(false)} />}
    </div>
  );
}

function Scanner({ onResult, onClose }: { onResult: (s: string) => void; onClose: () => void }) {
  const ref = useRef<Html5Qrcode | null>(null);
  useEffect(() => {
    const s = new Html5Qrcode("offline-qr");
    ref.current = s;
    let fired = false;
    s.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (text) => {
      if (fired) return; fired = true;
      s.stop().catch(() => {}).finally(() => onResult(text));
    }, () => {}).catch(() => { toast.error("Kamera tidak bisa dibuka. Izinkan akses kamera atau cari manual."); onClose(); });
    return () => { if (s.isScanning) s.stop().catch(() => {}); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur" role="dialog" aria-label="Scan QR barang">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-medium">Arahkan kamera ke QR barang</p>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup"><X className="h-4 w-4" /></Button>
        </div>
        <div id="offline-qr" className="overflow-hidden rounded-xl" />
      </div>
    </div>
  );
}

const Thumb = ({ src }: { src?: string }) => (
  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">{src && <img src={src} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />}</div>
);
const Qty = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center rounded-lg border">
    <button type="button" className="p-1.5" aria-label="Kurangi" onClick={() => onChange(Math.max(1, value - 1))}><Minus className="h-3.5 w-3.5" /></button>
    <span className="w-7 text-center text-sm">{value}</span>
    <button type="button" className="p-1.5" aria-label="Tambah" onClick={() => onChange(Math.min(99, value + 1))}><Plus className="h-3.5 w-3.5" /></button>
  </div>
);
const MoneyInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
    <Input inputMode="numeric" className="pl-9 text-right" value={fmt(value)} placeholder="0" onChange={(e) => onChange(num(e.target.value))} /></div>
);
const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={cn("block space-y-1.5", className)}><span className="text-xs text-muted-foreground">{label}</span>{children}</label>
);
const Choice = ({ active, onClick, icon: Icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ElementType; title: string; desc: string }) => (
  <button type="button" onClick={onClick} className={cn("flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors", active ? "border-primary bg-primary/10" : "hover:bg-muted")}>
    <Icon className={cn("mt-0.5 h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
    <span><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{desc}</span></span>
  </button>
);
const Row = ({ k, v }: { k: string; v: string }) => (<div className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>);
