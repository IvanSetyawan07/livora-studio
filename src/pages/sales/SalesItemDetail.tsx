import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { ArrowLeft, Boxes, Loader2 } from "lucide-react";

type Item = any;

const fmtIDR = (v: any) =>
  v === null || v === undefined || v === "" ? "—" : `Rp ${Number(v).toLocaleString("id-ID")}`;

export default function SalesItemDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [similar, setSimilar] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .get(`/sales/items/lookup/${slug}`)
      .then(({ data }) => {
        setItem(data.item);
        setSimilar(data.similar ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat rincian item…
      </div>
    );

  if (notFound || !item)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm">Item dengan kode/slug "{slug}" tidak ditemukan.</p>
        <Link to="/sales/scan" className="text-sm underline">
          Kembali ke scanner
        </Link>
      </div>
    );

  const dim =
    [item.width_cm, item.depth_cm, item.height_cm].some(Boolean)
      ? `${item.width_cm || "-"} × ${item.depth_cm || "-"} × ${item.height_cm || "-"} cm`
      : "—";

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          <div>
            <div className="aspect-square bg-muted rounded-xl overflow-hidden">
              {item.image && (
                <img src={imgUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />
              )}
            </div>
            <Link
              to={`/items/${item.slug}`}
              className="mt-3 block text-center text-[11px] text-muted-foreground underline"
            >
              Buka halaman publik
            </Link>
          </div>

          <div>
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              Rincian Produk
            </p>
            <h1 className="text-2xl font-medium">{item.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {item.code ? `${item.code} · ` : ""}
              {item.type?.name ?? "—"}
              {item.collection?.name ? ` · ${item.collection.name}` : ""}
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mt-5">
              <Stat label="Stok tersisa" value={item.stock !== null && item.stock !== undefined ? `${item.stock} unit` : "—"} />
              <Stat label="Harga" value={fmtIDR(item.price)} />
              <Stat label="Berat" value={item.weight_kg ? `${item.weight_kg} kg` : "—"} />
              <Stat label="Dimensi (W×D×H)" value={dim} />
              <Stat label="Ketersediaan" value={item.availability || "—"} />
              <Stat
                label="Finish / Texture"
                value={[item.finish, item.texture].filter(Boolean).join(" · ") || "—"}
              />
            </div>

            {(item.material_detail || item.warehouse_note) && (
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {item.material_detail && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                      Material lengkap
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{item.material_detail}</p>
                  </div>
                )}
                {item.warehouse_note && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                      Catatan gudang
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{item.warehouse_note}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <Boxes className="w-4 h-4" />
            <h2 className="text-sm font-medium">Item serupa ({similar.length})</h2>
          </div>
          {similar.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada item serupa.</p>
          ) : (
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {similar.map((s) => (
                <Link
                  key={s.id}
                  to={`/sales/items/${s.slug}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0">
                    {s.image && <img src={imgUrl(s.image)} alt={s.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.code ? `${s.code} · ` : ""}
                      {s.type?.name ?? "—"}
                      {s.collection?.name ? ` · ${s.collection.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground shrink-0">
                    <p>Stok: {s.stock ?? "—"}</p>
                    <p>{fmtIDR(s.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border p-3">
    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
    <p className="text-sm mt-1">{value}</p>
  </div>
);