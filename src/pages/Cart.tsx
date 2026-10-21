import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, Loader2, ShoppingBag, MessageCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { imgUrl } from "@/lib/adminApi";
import { checkoutPublicCart, clearPublicCart, getPublicCart, savePublicCart, type PublicCartLine } from "@/lib/shopPublic";
import Seo from "@/components/Seo.jsx";

/**
 * Keranjang anonim (tanpa login). "Pesan" menyimpan keranjang ke server,
 * membuat kode CRT-XXXX, lalu membuka WhatsApp dengan pesan terisi kode.
 * Harga tidak tampil di sini — diberikan tim lewat penawaran di WhatsApp.
 */
export default function Cart() {
  const [lines, setLines] = useState<PublicCartLine[]>(getPublicCart);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ code: string; wa_url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sync = () => setLines(getPublicCart());
    window.addEventListener("livora-cart-changed", sync);
    return () => window.removeEventListener("livora-cart-changed", sync);
  }, []);

  const patch = (idx: number, body: Partial<PublicCartLine>) => {
    const next = lines.map((l, i) => (i === idx ? { ...l, ...body } : l));
    savePublicCart(next);
  };
  const remove = (idx: number) => savePublicCart(lines.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!lines.length) return;
    setSubmitting(true);
    try {
      const r = await checkoutPublicCart(lines);
      setResult(r);
      clearPublicCart();
    } catch {
      toast.error("Gagal membuat kode pesanan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <main className="min-h-screen bg-background px-4 pt-32 pb-24">
        <Seo title="Lanjut ke WhatsApp | Livora" description="Kirim kode keranjang ke WhatsApp Livora" noindex />
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-6 w-6" /></div>
          <h1 className="serif mt-5 text-3xl">Satu langkah lagi</h1>
          <p className="mt-2 text-sm text-muted-foreground">Kirim kode ini ke WhatsApp Livora — asisten kami akan mengenali barang pilihan Anda dan membantu sampai selesai.</p>
          <button type="button" onClick={copyCode} className="mx-auto mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4">
            <span className="font-mono text-2xl tracking-widest">{result.code}</span>
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
          </button>
          <a href={result.wa_url} target="_blank" rel="noopener noreferrer"
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-sm font-medium text-white">
            <MessageCircle className="h-4 w-4" /> Buka WhatsApp
          </a>
          <p className="mt-3 text-xs text-muted-foreground">Pesan sudah terisi otomatis — cukup tekan kirim. Tanpa kode pun Anda bisa langsung chat kami.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-28 pb-24">
      <Seo title="Keranjang | Livora" description="Keranjang pesanan Livora" noindex />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Pesanan furnitur</p>
        <h1 className="serif mt-2 text-3xl sm:text-4xl">Keranjang</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Tidak perlu login. Harga diberikan langsung oleh tim kami lewat penawaran resmi di WhatsApp, sesuai varian, jumlah, dan lokasi pengiriman Anda.
        </p>

        {lines.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="serif mt-4 text-xl">Keranjang masih kosong</p>
            <p className="mt-1 text-sm text-muted-foreground">Pilih furnitur dan variannya, lalu tekan "Tambah ke Keranjang".</p>
            <Link to="/furniture" className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-6 text-sm text-background">Jelajahi furnitur</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <ul className="space-y-3">
              {lines.map((l, idx) => (
                <li key={`${l.item_id}-${l.variant_id ?? 0}`} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                  <Link to={`/items/${l.slug ?? ""}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {l.image && <img src={imgUrl(l.image)} alt={l.title} className="h-full w-full object-cover" loading="lazy" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{l.title}</p>
                        {l.code && <p className="text-xs text-muted-foreground">{l.code}</p>}
                      </div>
                      <button type="button" aria-label="Hapus" onClick={() => remove(idx)} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center rounded-full border border-border">
                        <button type="button" aria-label="Kurangi" className="h-9 w-9 rounded-full hover:bg-muted disabled:opacity-40" disabled={l.quantity <= 1} onClick={() => patch(idx, { quantity: l.quantity - 1 })}><Minus className="mx-auto h-3.5 w-3.5" /></button>
                        <span className="w-8 text-center text-sm">{l.quantity}</span>
                        <button type="button" aria-label="Tambah" className="h-9 w-9 rounded-full hover:bg-muted" onClick={() => patch(idx, { quantity: l.quantity + 1 })}><Plus className="mx-auto h-3.5 w-3.5" /></button>
                      </div>
                      <input
                        defaultValue={l.note ?? ""}
                        onBlur={(e) => e.target.value !== (l.note ?? "") && patch(idx, { note: e.target.value })}
                        placeholder="Catatan (opsional)"
                        aria-label="Catatan barang"
                        className="h-9 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-28">
              <p className="serif text-lg">Ringkasan</p>
              <p className="mt-1 text-sm text-muted-foreground">{lines.length} barang · {lines.reduce((s, l) => s + l.quantity, 0)} unit</p>
              <button type="button" onClick={submit} disabled={submitting || !lines.length}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background transition disabled:opacity-40">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                Pesan lewat WhatsApp
              </button>
              <ol className="mt-5 space-y-1.5 text-xs text-muted-foreground">
                <li>1. Kami buat kode keranjang untuk Anda.</li>
                <li>2. Kirim kode itu ke WhatsApp Livora.</li>
                <li>3. Asisten kami membantu sampai penawaran resmi terbit.</li>
              </ol>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
