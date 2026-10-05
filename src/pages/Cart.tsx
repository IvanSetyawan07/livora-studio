import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, Loader2, ShoppingBag, MessageCircle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { authStorage } from "@/lib/api";
import { rememberIntendedPath } from "@/lib/authGuard";
import { imgUrl } from "@/lib/adminApi";
import { getCart, updateCartLine, removeCartLine, createOrder, type CartLine } from "@/lib/shop";
import Seo from "@/components/Seo.jsx";

const COUNTRIES = [
  { dial: "62", label: "🇮🇩 +62" },
  { dial: "65", label: "🇸🇬 +65" },
  { dial: "60", label: "🇲🇾 +60" },
];

export default function Cart() {
  const navigate = useNavigate();
  const [lines, setLines] = useState<CartLine[] | null>(null);
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phoneSheet, setPhoneSheet] = useState(false);
  const [dial, setDial] = useState("62");
  const [phone, setPhone] = useState("");
  const idemRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!authStorage.getToken()) {
      rememberIntendedPath("/cart");
      navigate("/login", { replace: true });
      return;
    }
    getCart().then(setLines).catch(() => setLines([]));
  }, [navigate]);

  const selectable = (l: CartLine) => l.availability !== "out_of_stock";
  const chosen = useMemo(() => (lines ?? []).filter((l) => l.selected && selectable(l)), [lines]);

  const patch = async (l: CartLine, body: Partial<CartLine>) => {
    setLines((prev) => prev?.map((x) => (x.id === l.id ? { ...x, ...body } : x)) ?? null);
    try {
      await updateCartLine(l.id, body);
    } catch {
      toast.error("Gagal memperbarui keranjang");
    }
  };

  const remove = async (l: CartLine) => {
    setLines((prev) => prev?.filter((x) => x.id !== l.id) ?? null);
    await removeCartLine(l.id).catch(() => toast.error("Gagal menghapus"));
  };

  const submit = async (withPhone?: string) => {
    if (!chosen.length) return toast.error("Pilih minimal satu barang");
    if (!consent) return toast.error("Centang persetujuan dihubungi via WhatsApp");
    setSubmitting(true);
    try {
      const { order, wa_url } = await createOrder(
        { cart_item_ids: chosen.map((l) => l.id), note: note || undefined, wa_consent: true, phone: withPhone },
        idemRef.current,
      );
      sessionStorage.setItem(`livora_wa_${order.code}`, wa_url);
      navigate(`/order/${order.code}/whatsapp`);
    } catch (e: any) {
      const code = e?.details?.code ?? e?.details?.errors?.phone?.[0];
      if (code === "phone_required") {
        setPhoneSheet(true);
      } else {
        toast.error(e?.message || "Pesanan gagal dibuat");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPhone = () => {
    const digits = phone.replace(/\D/g, "").replace(/^0/, "");
    if (digits.length < 8) return toast.error("Nomor WhatsApp belum lengkap");
    setPhoneSheet(false);
    submit(dial + digits);
  };

  return (
    <main className="min-h-screen bg-background pt-28 pb-24">
      <Seo title="Keranjang | Livora" description="Keranjang pesanan Livora" noindex />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Pesanan furnitur</p>
        <h1 className="serif mt-2 text-3xl sm:text-4xl">Keranjang</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Harga diberikan langsung oleh tim kami saat konsultasi di WhatsApp, sesuai varian, jumlah, dan lokasi pengiriman Anda.
        </p>

        {lines === null ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat keranjang…</div>
        ) : lines.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="serif mt-4 text-xl">Keranjang masih kosong</p>
            <p className="mt-1 text-sm text-muted-foreground">Pilih furnitur dan variannya, lalu tekan "Tambah ke Keranjang".</p>
            <Link to="/furniture" className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm text-background">Jelajahi furnitur</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <ul className="space-y-3">
              {lines.map((l) => {
                const disabled = !selectable(l);
                return (
                  <li key={l.id} className={`flex gap-4 rounded-2xl border border-border bg-card p-4 ${disabled ? "opacity-60" : ""}`}>
                    <button
                      type="button"
                      aria-label={l.selected ? "Batalkan pilihan" : "Pilih barang"}
                      disabled={disabled}
                      onClick={() => patch(l, { selected: !l.selected })}
                      className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${l.selected && !disabled ? "border-foreground bg-foreground text-background" : "border-border"}`}
                    >
                      {l.selected && !disabled && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <Link to={`/items/${l.item?.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {l.item?.image && <img src={imgUrl(l.item.image)} alt={l.item.title} className="h-full w-full object-cover" loading="lazy" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{l.item?.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {l.variant?.name ?? "Tanpa varian"}{l.item?.code ? ` · ${l.item.code}` : ""}
                            {l.item?.fulfillment_type === "made_to_order" && " · Dibuat sesuai pesanan"}
                          </p>
                          {l.availability === "out_of_stock" && <p className="mt-1 text-xs font-medium text-red-600">Stok habis — tidak bisa dipesan</p>}
                          {l.availability === "limited" && <p className="mt-1 text-xs font-medium text-amber-700">Stok terbatas</p>}
                        </div>
                        <button type="button" aria-label="Hapus" onClick={() => remove(l)} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center rounded-full border border-border">
                          <button type="button" aria-label="Kurangi" className="h-9 w-9 rounded-full hover:bg-muted disabled:opacity-40" disabled={l.quantity <= 1} onClick={() => patch(l, { quantity: l.quantity - 1 })}><Minus className="mx-auto h-3.5 w-3.5" /></button>
                          <span className="w-8 text-center text-sm">{l.quantity}</span>
                          <button type="button" aria-label="Tambah" className="h-9 w-9 rounded-full hover:bg-muted" onClick={() => patch(l, { quantity: l.quantity + 1 })}><Plus className="mx-auto h-3.5 w-3.5" /></button>
                        </div>
                        <input
                          defaultValue={l.note ?? ""}
                          onBlur={(e) => e.target.value !== (l.note ?? "") && patch(l, { note: e.target.value })}
                          placeholder="Catatan (opsional)"
                          aria-label="Catatan barang"
                          className="h-9 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-28">
              <p className="serif text-lg">Ringkasan</p>
              <p className="mt-1 text-sm text-muted-foreground">{chosen.length} barang dipilih · {chosen.reduce((s, l) => s + l.quantity, 0)} unit</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Catatan untuk tim Livora (opsional)" aria-label="Catatan pesanan"
                className="mt-4 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-foreground" />
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-current" />
                Saya setuju dihubungi tim Livora melalui WhatsApp untuk konsultasi, penawaran harga, dan status pesanan.
              </label>
              <button type="button" onClick={() => submit()} disabled={submitting || !chosen.length || !consent}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background transition disabled:opacity-40">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                Konsultasi & Pesan
              </button>
              <ol className="mt-5 space-y-1.5 text-xs text-muted-foreground">
                <li>1. Kami buat kode pesanan untuk Anda.</li>
                <li>2. Kirim kode itu ke WhatsApp Livora.</li>
                <li>3. Terima penawaran harga, setujui, lalu bayar.</li>
              </ol>
            </aside>
          </div>
        )}
      </div>

      {phoneSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="phone-title">
          <div className="w-full max-w-md rounded-t-3xl bg-card p-6 sm:rounded-3xl">
            <div className="flex items-start justify-between">
              <h2 id="phone-title" className="serif text-xl">Nomor WhatsApp Anda</h2>
              <button type="button" aria-label="Tutup" onClick={() => setPhoneSheet(false)} className="rounded-full p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Kami perlu nomor ini untuk mengirim penawaran harga dan kabar pesanan. Nomor hanya dipakai untuk pesanan Anda.</p>
            <div className="mt-4 flex gap-2">
              <select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Kode negara" className="h-12 rounded-xl border border-border bg-background px-3 text-sm">
                {COUNTRIES.map((c) => <option key={c.dial} value={c.dial}>{c.label}</option>)}
              </select>
              <input autoFocus inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="812 3456 7890" aria-label="Nomor WhatsApp"
                className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-foreground" />
            </div>
            <button type="button" onClick={confirmPhone} className="mt-5 h-12 w-full rounded-full bg-foreground text-sm font-medium text-background">Simpan & lanjutkan</button>
          </div>
        </div>
      )}
    </main>
  );
}
