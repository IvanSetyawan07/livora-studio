import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Camera,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Minus,
  Plus,
  QrCode,
  Search,
  Store,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminShop, downloadPrivate, rupiah } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { PageHeader, AdminHelpBanner, useAdminDialog } from "@/components/admin/kit";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";

type Found = {
  id: number;
  title: string;
  code?: string;
  image?: string;
  price?: number;
  stock?: number | null;
  fulfillment_type?: string;
};
type Line = Found & { qty: number; unit_price: number; note: string };

const PPN = 0.11;
const STEPS = ["Pilih Barang", "Harga & Pembeli", "Pembayaran", "Selesai"];
const METHODS = [
  { v: "Tunai", icon: Banknote },
  { v: "Transfer Bank", icon: Wallet },
  { v: "Debit/Kredit (EDC)", icon: CreditCard },
  { v: "QRIS", icon: QrCode },
];
const num = (s: string) => Math.max(0, parseInt(s.replace(/\D/g, "") || "0", 10));
const fmt = (n: number) => (n ? n.toLocaleString("id-ID") : "");

/** Kasir showroom: scan/pilih barang → tentukan harga → terbitkan Invoice Lunas / Proforma Invoice. */
export default function AdminShopOffline() {
  const dialog = useAdminDialog();
  const { isOwner, role } = useAdminPermission();
  const canGiveExtraDiscount = isOwner || role === "finance";

  const [step, setStep] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [buyer, setBuyer] = useState({ name: "", phone: "", email: "", address: "", note: "" });
  const [fees, setFees] = useState({ shipping: 0, install: 0, other: 0 });
  const [disc, setDisc] = useState<{ type: "percent" | "amount"; value: number; reason: string }>({
    type: "amount",
    value: 0,
    reason: "",
  });
  const [fulfillment, setFulfillment] = useState<"bawa_pulang" | "diantar">("bawa_pulang");
  const [paid, setPaid] = useState(true);
  const [method, setMethod] = useState("Tunai");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Awaited<ReturnType<typeof adminShop.createOffline>> | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      adminShop
        .items(q.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
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
  const patch = (id: number, p: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const onScan = async (raw: string) => {
    setScanning(false);
    const key = raw.includes("/items/") ? raw.split("/items/")[1].split(/[?#/]/)[0] : raw.trim();
    try {
      const r: Found[] = await adminShop.items(key);
      if (r[0]) add(r[0]);
      else toast.error("Barang dari QR ini tidak ditemukan");
    } catch {
      toast.error("Gagal membaca barang");
    }
  };

  const t = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.unit_price * l.qty, 0);
    const extra =
      canGiveExtraDiscount && disc.value
        ? Math.min(
            subtotal,
            disc.type === "percent" ? Math.round((subtotal * Math.min(100, disc.value)) / 100) : disc.value,
          )
        : 0;
    const dpp = subtotal - extra;
    const ppn = Math.round(dpp * PPN);
    const delivery = fulfillment === "diantar" ? fees.shipping + fees.install : 0;
    return { subtotal, extra, dpp, ppn, total: dpp + ppn + delivery + fees.other };
  }, [lines, disc, fees, fulfillment, canGiveExtraDiscount]);

  const step1Blocker = useMemo(() => {
    if (lines.some((l) => !(l.unit_price > 0))) return "Pastikan semua barang memiliki harga lebih dari Rp 0.";
    if (buyer.name.trim().length < 2) return "Isi nama pembeli terlebih dahulu.";
    if (fulfillment === "diantar" && buyer.address.trim().length < 5) {
      return "Isi alamat pengiriman untuk pesanan yang diantar.";
    }
    if (canGiveExtraDiscount && disc.value > 0 && !disc.reason.trim()) {
      return "Alasan diskon tambahan wajib diisi.";
    }
    return null;
  }, [lines, buyer.name, buyer.address, fulfillment, canGiveExtraDiscount, disc.value, disc.reason]);

  const canNext =
    [lines.length > 0 && lines.every((l) => l.qty > 0), !step1Blocker, true][step] ?? true;

  const submit = async () => {
    const ok = await dialog.confirm({
      title: paid ? "Simpan & Terbitkan Invoice Lunas?" : "Simpan & Terbitkan Proforma Invoice?",
      description: paid
        ? `Transaksi atas nama ${buyer.name} sebesar ${rupiah(t.total)} (${method}) akan dicatat LUNAS, stok barang langsung berkurang, dan Invoice siap dicetak.`
        : `Proforma Invoice (Tagihan) atas nama ${buyer.name} sebesar ${rupiah(t.total)} akan diterbitkan untuk dibayar nanti.`,
      confirmText: paid ? "Ya, Terbitkan Invoice Lunas" : "Ya, Terbitkan Proforma",
      cancelText: "Periksa Lagi",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const r = await adminShop.createOffline({
        customer_name: buyer.name.trim(),
        customer_phone: buyer.phone || null,
        customer_email: buyer.email || null,
        address: fulfillment === "diantar" ? buyer.address.trim() : null,
        note: buyer.note || null,
        items: lines.map((l) => ({
          item_id: l.id,
          quantity: l.qty,
          unit_price: l.unit_price,
          note: l.note || null,
        })),
        shipping_fee: fulfillment === "diantar" ? fees.shipping : 0,
        installation_fee: fulfillment === "diantar" ? fees.install : 0,
        other_fee: fees.other,
        extra_discount_type: canGiveExtraDiscount && disc.value ? disc.type : null,
        extra_discount_value: canGiveExtraDiscount ? disc.value || null : null,
        extra_discount_reason: canGiveExtraDiscount && disc.value ? disc.reason : null,
        paid,
        payment_method: paid ? method : null,
        fulfillment,
      });
      setDone(r);
      setStep(3);
      toast.success(`Transaksi showroom ${r.code} berhasil disimpan.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Gagal menyimpan transaksi");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(0);
    setLines([]);
    setBuyer({ name: "", phone: "", email: "", address: "", note: "" });
    setFees({ shipping: 0, install: 0, other: 0 });
    setDisc({ type: "amount", value: 0, reason: "" });
    setDone(null);
    setPaid(true);
    setMethod("Tunai");
  };

  const docLabel = done?.document
    ? done.document.title === "Tagihan"
      ? "Proforma Invoice (Tagihan)"
      : "Invoice Lunas"
    : "";
  const docName = done?.document
    ? `${done.document.title === "Tagihan" ? "Proforma-Invoice" : done.document.title}-${done.document.number.replace(/\//g, "-")}.pdf`
    : "";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Showroom Walk-In"
        title="Kasir Showroom"
        description="Untuk pembeli yang datang langsung ke showroom. Pilih atau scan QR produk, isi data pembeli, dan cetak Invoice atau Proforma Invoice."
      />

      <AdminHelpBanner title="Perbedaan Invoice Lunas & Proforma Invoice" storageKey="admin-shop-offline-help">
        Pilih <b>Sudah Lunas</b> bila pembeli membayar langsung di tempat (stok berkurang otomatis & terbit Invoice Lunas).
        Pilih <b>Belum Bayar</b> untuk menerbitkan <b>Proforma Invoice / Tagihan</b> yang akan dibayar nanti.
      </AdminHelpBanner>

      {/* Stepper — label selalu terlihat di mobile maupun desktop */}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition-colors sm:text-sm",
              i === step
                ? "border-[#5E93B8] bg-[#EDF4F8] font-medium text-[#232528]"
                : i < step
                  ? "border-emerald-200 bg-emerald-50/70 text-[#232528]"
                  : "border-[#EAE4DA] bg-white text-[#656B73]",
            )}
          >
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold border border-[#EAE4DA]">
              {i < step ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : i + 1}
            </span>
            <span className="truncate">{s}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          {step === 0 && (
            <>
              <div className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm sm:p-5">
                <p className="mb-3 text-sm font-semibold text-[#232528]">
                  1. Scan QR pada Label Barang atau Cari Nama / Kode
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    size="lg"
                    className="gap-2 bg-[#232528] text-white hover:bg-[#35383d]"
                    onClick={() => setScanning(true)}
                  >
                    <Camera className="h-5 w-5" /> Scan QR Barang
                  </Button>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#656B73]" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Ketik nama atau kode barang…"
                      className="h-11 border-[#EAE4DA] bg-[#FAF8F4] pl-9"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#5E93B8]" />
                    )}
                  </div>
                </div>
                {results.length > 0 && (
                  <ul className="mt-3 max-h-72 divide-y divide-[#EAE4DA] overflow-auto rounded-xl border border-[#EAE4DA]">
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => add(r)}
                          className="flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-[#EDF4F8]/60"
                        >
                          <Thumb src={r.image} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#232528]">{r.title}</p>
                            <p className="text-xs text-[#656B73]">
                              {r.code ?? "—"} · {r.stock == null ? "stok tidak dicatat" : `stok ${r.stock}`}
                            </p>
                          </div>
                          <span className="text-xs font-medium text-[#232528]">
                            {r.price ? rupiah(Number(r.price)) : "Harga belum diatur"}
                          </span>
                          <Plus className="h-4 w-4 text-[#5E93B8]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm sm:p-5">
                <p className="mb-3 text-sm font-semibold text-[#232528]">Barang Dipilih ({lines.length})</p>
                {lines.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#EAE4DA] bg-[#FAF8F4] p-8 text-center text-xs text-[#656B73]">
                    Belum ada barang. Scan QR label atau cari nama produk di atas.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {lines.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center gap-3 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/50 p-2.5"
                      >
                        <Thumb src={l.image} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#232528]">{l.title}</p>
                          <p className="text-xs text-[#656B73]">
                            {l.code ?? "—"}
                            {l.fulfillment_type === "made_to_order" && " · Custom / Pre-Order"}
                          </p>
                        </div>
                        <Qty value={l.qty} onChange={(v) => patch(l.id, { qty: v })} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Hapus"
                          onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm sm:p-5">
                <p className="mb-1 text-sm font-semibold text-[#232528]">2. Tentukan Harga Satuan per Barang</p>
                <p className="mb-3 text-xs text-[#656B73]">
                  Harga katalog otomatis terisi bila tersedia. Semua harga satuan wajib lebih dari Rp 0 (belum termasuk PPN 11%).
                </p>
                <ul className="space-y-2">
                  {lines.map((l) => (
                    <li
                      key={l.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/40 p-3 sm:grid-cols-[1fr_160px_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#232528]">
                          {l.title} <span className="text-[#656B73]">× {l.qty}</span>
                        </p>
                        <Input
                          value={l.note}
                          onChange={(e) => patch(l.id, { note: e.target.value })}
                          placeholder="Catatan (warna, kain, ukuran…)"
                          className="mt-1.5 h-8 border-[#EAE4DA] bg-white text-xs"
                        />
                      </div>
                      <MoneyInput value={l.unit_price} onChange={(v) => patch(l.id, { unit_price: v })} />
                      <p className="col-span-2 text-right text-sm font-semibold text-[#232528] sm:col-span-1 sm:w-28">
                        {rupiah(l.unit_price * l.qty)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm sm:p-5">
                <p className="mb-3 text-sm font-semibold text-[#232528]">Data Pembeli</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nama Pembeli *">
                    <Input
                      value={buyer.name}
                      onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                      placeholder="Nama yang tampil di invoice"
                      className="border-[#EAE4DA] bg-[#FAF8F4]"
                    />
                  </Field>
                  <Field label="No. WhatsApp">
                    <Input
                      value={buyer.phone}
                      onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                      placeholder="08xx (opsional)"
                      inputMode="tel"
                      className="border-[#EAE4DA] bg-[#FAF8F4]"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      value={buyer.email}
                      onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                      placeholder="opsional"
                      type="email"
                      className="border-[#EAE4DA] bg-[#FAF8F4]"
                    />
                  </Field>
                  <Field label="Catatan Transaksi">
                    <Input
                      value={buyer.note}
                      onChange={(e) => setBuyer({ ...buyer, note: e.target.value })}
                      placeholder="opsional"
                      className="border-[#EAE4DA] bg-[#FAF8F4]"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm sm:p-5">
                <p className="mb-3 text-sm font-semibold text-[#232528]">Serah Terima Barang</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Choice
                    active={fulfillment === "bawa_pulang"}
                    onClick={() => setFulfillment("bawa_pulang")}
                    icon={Store}
                    title="Dibawa Pulang Langsung"
                    desc="Pembeli langsung membawa barang dari showroom"
                  />
                  <Choice
                    active={fulfillment === "diantar"}
                    onClick={() => setFulfillment("diantar")}
                    icon={Truck}
                    title="Diantar oleh Livora"
                    desc="Lanjut masuk antrean pengiriman"
                  />
                </div>
                {fulfillment === "diantar" && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Alamat Pengiriman Lengkap *" className="sm:col-span-2">
                      <Textarea
                        rows={2}
                        value={buyer.address}
                        onChange={(e) => setBuyer({ ...buyer, address: e.target.value })}
                        placeholder="Jalan, nomor rumah/gedung, kota…"
                        className="border-[#EAE4DA] bg-[#FAF8F4]"
                      />
                    </Field>
                    <Field label="Ongkos Kirim">
                      <MoneyInput value={fees.shipping} onChange={(v) => setFees({ ...fees, shipping: v })} />
                    </Field>
                    <Field label="Biaya Pemasangan">
                      <MoneyInput value={fees.install} onChange={(v) => setFees({ ...fees, install: v })} />
                    </Field>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm sm:p-5">
                <p className="mb-1 text-sm font-semibold text-[#232528]">
                  {canGiveExtraDiscount ? "Diskon Tambahan & Biaya Lain" : "Biaya Lain (Opsional)"}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {canGiveExtraDiscount && (
                    <>
                      <Field label="Jenis Diskon">
                        <div className="flex rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] p-0.5">
                          {(["amount", "percent"] as const).map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setDisc({ ...disc, type: k })}
                              className={cn(
                                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium",
                                disc.type === k ? "bg-[#232528] text-white" : "text-[#656B73]",
                              )}
                            >
                              {k === "amount" ? "Rupiah" : "Persen"}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label={disc.type === "percent" ? "Diskon (%)" : "Diskon (Rp)"}>
                        {disc.type === "percent" ? (
                          <Input
                            inputMode="numeric"
                            value={disc.value || ""}
                            onChange={(e) => setDisc({ ...disc, value: Math.min(100, num(e.target.value)) })}
                            placeholder="0"
                            className="border-[#EAE4DA] bg-[#FAF8F4]"
                          />
                        ) : (
                          <MoneyInput value={disc.value} onChange={(v) => setDisc({ ...disc, value: v })} />
                        )}
                      </Field>
                    </>
                  )}
                  <Field label="Biaya Lain">
                    <MoneyInput value={fees.other} onChange={(v) => setFees({ ...fees, other: v })} />
                  </Field>
                  {canGiveExtraDiscount && disc.value > 0 && (
                    <Field label="Alasan Diskon *" className="sm:col-span-3">
                      <Input
                        value={disc.reason}
                        onChange={(e) => setDisc({ ...disc, reason: e.target.value })}
                        placeholder="mis. display unit showroom, pelanggan lama"
                        className="border-[#EAE4DA] bg-[#FAF8F4]"
                      />
                    </Field>
                  )}
                </div>
              </div>

              {step1Blocker && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                  {step1Blocker}
                </p>
              )}
            </>
          )}

          {step === 2 && (
            <div className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm sm:p-5">
              <p className="mb-3 text-sm font-semibold text-[#232528]">3. Status Pembayaran Saat Ini</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Choice
                  active={paid}
                  onClick={() => setPaid(true)}
                  icon={CheckCircle2}
                  title="Sudah Lunas"
                  desc="Terbit Invoice Lunas, stok langsung berkurang"
                />
                <Choice
                  active={!paid}
                  onClick={() => setPaid(false)}
                  icon={FileText}
                  title="Belum Bayar (Proforma)"
                  desc="Terbit Proforma Invoice / Tagihan untuk dibayar nanti"
                />
              </div>
              {paid && (
                <>
                  <p className="mb-2 mt-5 text-sm font-semibold text-[#232528]">Metode Pembayaran</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {METHODS.map((m) => (
                      <button
                        key={m.v}
                        type="button"
                        onClick={() => setMethod(m.v)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors",
                          method === m.v
                            ? "border-[#5E93B8] bg-[#EDF4F8] text-[#232528]"
                            : "border-[#EAE4DA] bg-white text-[#656B73] hover:bg-[#FAF8F4]",
                        )}
                      >
                        <m.icon className="h-5 w-5 text-[#5E93B8]" />
                        {m.v}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="mt-5 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-4 text-xs">
                <p className="font-semibold text-[#232528]">Periksa Kembali Sebelum Menyimpan</p>
                <p className="mt-1 text-[#4C5259]">
                  Pembeli: <b>{buyer.name}</b> · {lines.reduce((s, l) => s + l.qty, 0)} unit barang ·{" "}
                  {fulfillment === "diantar" ? "Diantar Livora" : "Dibawa pulang langsung"}
                </p>
              </div>
            </div>
          )}

          {step === 3 && done && (
            <div className="rounded-2xl border border-[#EAE4DA] bg-white p-6 text-center shadow-sm sm:p-10">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <h2 className="font-header mt-3 text-2xl text-[#232528]">
                {paid ? "Pembelian Lunas Tercatat" : "Proforma Invoice Siap Dicetak"}
              </h2>
              <p className="mt-1 text-sm text-[#656B73]">
                Pesanan <b className="font-mono text-[#232528]">{done.code}</b> · {rupiah(done.grand_total)}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                {done.document && (
                  <Button
                    size="lg"
                    className="gap-2 bg-[#232528] text-white hover:bg-[#35383d]"
                    onClick={() =>
                      downloadPrivate(`/admin/shop/documents/${done.document!.id}`, docName).catch((e) =>
                        toast.error(e.message),
                      )
                    }
                  >
                    <FileText className="h-5 w-5" /> Unduh & Cetak {docLabel}
                  </Button>
                )}
                <Button size="lg" variant="outline" asChild>
                  <Link to={`/admin/shop/orders/${done.code}`}>Lihat Detail Pesanan</Link>
                </Button>
                <Button size="lg" variant="ghost" onClick={reset}>
                  Transaksi Baru
                </Button>
              </div>
            </div>
          )}

          {step < 3 && (
            <div className="flex justify-between gap-2">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Button>
              {step < 2 ? (
                <Button
                  size="lg"
                  disabled={!canNext}
                  onClick={() => setStep(step + 1)}
                  className="gap-2 bg-[#232528] text-white hover:bg-[#35383d]"
                >
                  Lanjut <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  disabled={busy}
                  onClick={submit}
                  className="gap-2 bg-[#232528] text-white hover:bg-[#35383d]"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {paid ? "Simpan & Terbitkan Invoice Lunas" : "Simpan & Terbitkan Proforma Invoice"}
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Ringkasan */}
        <aside className="h-fit rounded-2xl border border-[#EAE4DA] bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#5E93B8]">Ringkasan Tagihan</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row k="Subtotal" v={rupiah(t.subtotal)} />
            {t.extra > 0 && <Row k="Diskon Tambahan" v={`− ${rupiah(t.extra)}`} />}
            <Row k="PPN 11%" v={rupiah(t.ppn)} />
            {fulfillment === "diantar" && fees.shipping > 0 && <Row k="Ongkos Kirim" v={rupiah(fees.shipping)} />}
            {fulfillment === "diantar" && fees.install > 0 && <Row k="Pemasangan" v={rupiah(fees.install)} />}
            {fees.other > 0 && <Row k="Biaya Lain" v={rupiah(fees.other)} />}
          </dl>
          <div className="mt-4 border-t border-[#EAE4DA] pt-4">
            <p className="text-xs text-[#656B73]">Total Dibayar</p>
            <p className="font-header text-3xl text-[#232528]">{rupiah(t.total)}</p>
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
    s.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 240 },
      (text) => {
        if (fired) return;
        fired = true;
        s.stop()
          .catch(() => {})
          .finally(() => onResult(text));
      },
      () => {},
    ).catch(() => {
      toast.error("Kamera tidak bisa dibuka. Izinkan akses kamera atau cari produk secara manual.");
      onClose();
    });
    return () => {
      if (s.isScanning) s.stop().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-label="Scan QR barang"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-[#232528]">Arahkan Kamera ke QR Barang</p>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div id="offline-qr" className="overflow-hidden rounded-xl" />
      </div>
    </div>
  );
}

const Thumb = ({ src }: { src?: string }) => (
  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#EAE4DA] bg-[#FAF8F4]">
    {src && (
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    )}
  </div>
);

const Qty = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center rounded-lg border border-[#EAE4DA] bg-white">
    <button
      type="button"
      className="p-1.5 text-[#232528]"
      aria-label="Kurangi"
      onClick={() => onChange(Math.max(1, value - 1))}
    >
      <Minus className="h-3.5 w-3.5" />
    </button>
    <span className="w-7 text-center text-sm font-medium">{value}</span>
    <button
      type="button"
      className="p-1.5 text-[#232528]"
      aria-label="Tambah"
      onClick={() => onChange(Math.min(99, value + 1))}
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  </div>
);

const MoneyInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#656B73]">Rp</span>
    <Input
      inputMode="numeric"
      className="border-[#EAE4DA] bg-[#FAF8F4] pl-9 text-right"
      value={fmt(value)}
      placeholder="0"
      onChange={(e) => onChange(num(e.target.value))}
    />
  </div>
);

const Field = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <label className={cn("block space-y-1.5", className)}>
    <span className="text-xs font-medium text-[#232528]">{label}</span>
    {children}
  </label>
);

const Choice = ({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  desc: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
      active
        ? "border-[#5E93B8] bg-[#EDF4F8]"
        : "border-[#EAE4DA] bg-white hover:bg-[#FAF8F4]",
    )}
  >
    <Icon className={cn("mt-0.5 h-5 w-5", active ? "text-[#35678B]" : "text-[#656B73]")} />
    <span>
      <span className="block text-sm font-medium text-[#232528]">{title}</span>
      <span className="block text-xs text-[#656B73]">{desc}</span>
    </span>
  </button>
);

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between text-xs">
    <dt className="text-[#656B73]">{k}</dt>
    <dd className="font-medium text-[#232528]">{v}</dd>
  </div>
);
