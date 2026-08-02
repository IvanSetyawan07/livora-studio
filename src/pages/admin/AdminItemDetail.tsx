import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { ArrowLeft, Boxes, Loader2, QrCode, Save } from "lucide-react";
import ItemQRCode from "@/components/livora/ItemQRCode";

type Item = any;

const NUM_FIELDS = ["stock", "price", "weight_kg", "width_cm", "depth_cm", "height_cm"] as const;

const fmtIDR = (v: any) =>
  v === null || v === undefined || v === "" ? "—" : `Rp ${Number(v).toLocaleString("id-ID")}`;

export default function AdminItemDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [similar, setSimilar] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [qr, setQr] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const { data } = await api.get(`/admin/items/lookup/${slug}`);
      setItem(data.item);
      setSimilar(data.similar ?? []);
      setForm({
        stock: data.item.stock ?? "",
        price: data.item.price ?? "",
        weight_kg: data.item.weight_kg ?? "",
        width_cm: data.item.width_cm ?? "",
        depth_cm: data.item.depth_cm ?? "",
        height_cm: data.item.height_cm ?? "",
        material_detail: data.item.material_detail ?? "",
        warehouse_note: data.item.warehouse_note ?? "",
        availability: data.item.availability ?? "",
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const save = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", item.title ?? "");
      if (item.code) fd.append("code", item.code);
      if (item.type_id) fd.append("type_id", String(item.type_id));
      if (item.collection_id) fd.append("collection_id", String(item.collection_id));
      Object.entries(form).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) fd.append(k, String(v));
      });
      await api.post(`/admin/items/${item.id}`, fd);
      await load();
    } catch {
      alert("Gagal menyimpan rincian item.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat rincian item…
      </div>
    );

  if (notFound || !item)
    return (
      <div className="max-w-md">
        <p className="text-sm">Item dengan kode/slug "{slug}" tidak ditemukan.</p>
        <Link to="/admin/scan" className="text-sm underline mt-3 inline-block">
          Kembali ke scanner
        </Link>
      </div>
    );

  const dim =
    [form.width_cm, form.depth_cm, form.height_cm].some(Boolean)
      ? `${form.width_cm || "-"} × ${form.depth_cm || "-"} × ${form.height_cm || "-"} cm`
      : "—";

  return (
    <div className="max-w-5xl">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <div>
          <div className="aspect-square bg-muted rounded-xl overflow-hidden">
            {item.image && <img src={imgUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />}
          </div>
          <button
            onClick={() => setQr(true)}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.15em] border border-border rounded"
          >
            <QrCode className="w-4 h-4" /> Lihat QR
          </button>
          <Link
            to={`/items/${item.slug}`}
            className="mt-2 block text-center text-[11px] text-muted-foreground underline"
          >
            Buka halaman publik
          </Link>
        </div>

        <div>
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Internal Product Sheet</p>
          <h1 className="text-2xl font-medium">{item.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {item.code ? `${item.code} · ` : ""}
            {item.type?.name ?? "—"}
            {item.collection?.name ? ` · ${item.collection.name}` : ""}
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-5">
            <Stat label="Stok tersisa" value={form.stock === "" ? "—" : `${form.stock} unit`} />
            <Stat label="Harga" value={fmtIDR(form.price)} />
            <Stat label="Berat" value={form.weight_kg ? `${form.weight_kg} kg` : "—"} />
            <Stat label="Dimensi (W×D×H)" value={dim} />
            <Stat label="Ketersediaan" value={form.availability || "—"} />
            <Stat label="Finish / Texture" value={[item.finish, item.texture].filter(Boolean).join(" · ") || "—"} />
          </div>

          <div className="mt-8 rounded-xl border border-border p-4">
            <h2 className="text-sm font-medium mb-3">Edit rincian internal</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Stok" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} type="number" />
              <Field label="Harga (IDR)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" />
              <Field label="Berat (kg)" value={form.weight_kg} onChange={(v) => setForm({ ...form, weight_kg: v })} type="number" />
              <Field label="Lebar (cm)" value={form.width_cm} onChange={(v) => setForm({ ...form, width_cm: v })} type="number" />
              <Field label="Kedalaman (cm)" value={form.depth_cm} onChange={(v) => setForm({ ...form, depth_cm: v })} type="number" />
              <Field label="Tinggi (cm)" value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: v })} type="number" />
              <Field label="Ketersediaan" value={form.availability} onChange={(v) => setForm({ ...form, availability: v })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Area
                label="Material lengkap (leather, kayu, foam, dll)"
                value={form.material_detail}
                onChange={(v) => setForm({ ...form, material_detail: v })}
              />
              <Area
                label="Catatan gudang"
                value={form.warehouse_note}
                onChange={(v) => setForm({ ...form, warehouse_note: v })}
              />
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.15em] bg-foreground text-background rounded disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
            </button>
          </div>
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
                to={`/admin/items/${s.slug}/detail`}
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

      {qr && <ItemQRCode slug={item.slug} name={item.title} code={item.code} onClose={() => setQr(false)} />}
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border p-3">
    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
    <p className="text-sm mt-1">{value}</p>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full border border-border rounded px-3 py-2 text-sm bg-background"
    />
  </label>
);

const Area = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
    <textarea
      rows={4}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full border border-border rounded px-3 py-2 text-sm bg-background"
    />
  </label>
);
