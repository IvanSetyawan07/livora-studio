import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, MessageCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { getWaLink } from "@/lib/shop";

/** Layar setelah pesanan dibuat: dorong pelanggan membuka WhatsApp. */
export default function OrderWhatsApp() {
  const { code = "" } = useParams();
  const [url, setUrl] = useState<string | null>(sessionStorage.getItem(`livora_wa_${code}`));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) getWaLink(code).then(setUrl).catch(() => {});
  }, [code, url]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Kode pesanan disalin");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-background px-4 pt-32 pb-24">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-6 w-6" /></div>
        <h1 className="serif mt-5 text-3xl">Pesanan dibuat</h1>
        <p className="mt-2 text-sm text-muted-foreground">Langkah berikutnya: kirim kode ini ke WhatsApp Livora. Tim kami akan membalas dengan penawaran harga.</p>
        <button type="button" onClick={copy} className="mx-auto mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4">
          <span className="font-mono text-2xl tracking-widest">{code}</span>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
        </button>
        <a href={url ?? "#"} target="_blank" rel="noopener noreferrer" aria-disabled={!url}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-sm font-medium text-white">
          <MessageCircle className="h-4 w-4" /> Buka WhatsApp
        </a>
        <p className="mt-3 text-xs text-muted-foreground">Pesan sudah terisi otomatis. Cukup tekan kirim. Pesanan tanpa chat akan otomatis ditutup dalam 3 hari.</p>
        <Link to={`/profile/orders/${code}`} className="mt-8 inline-block text-sm underline underline-offset-4">Lihat status pesanan</Link>
      </div>
    </main>
  );
}
