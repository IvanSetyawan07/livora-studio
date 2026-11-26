import { useCallback, useEffect, useState } from "react";
import TranslationPanel from "@/components/admin/TranslationPanel";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { toast } from "sonner";
import {
  ArrowLeft,
  Boxes,
  ExternalLink,
  Loader2,
  Lock,
  QrCode,
  Save,
  Settings2,
} from "lucide-react";
import ItemQRCode from "@/components/livora/ItemQRCode";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import { ErrorState, PageHeader, StatusBadge, TableSkeleton } from "@/components/admin/kit";

type Item = any;

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Tersedia (Ready Stock)" },
  { value: "made_to_order", label: "Made to Order (Pre-order)" },
  { value: "unavailable", label: "Tidak Tersedia" },
];

const fmtIDR = (v: any) =>
  v === null || v === undefined || v === "" ? "—" : `Rp ${Number(v).toLocaleString("id-ID")}`;

export default function AdminItemDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("catalog");

  const [item, setItem] = useState<Item | null>(null);
  const [similar, setSimilar] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [qr, setQr] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
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
        availability: data.item.availability ?? "available",
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!item || !editable) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", item.title ?? "");
      if (item.code) fd.append("code", item.code);
      if (item.type_id) fd.append("type_id", String(item.type_id));
      if (item.collection_id) fd.append("collection_id", String(item.collection_id));
      // Kirim semua field (termasuk string kosong) agar field yang dikosongkan bisa benar-benar di-reset ke null di backend
      Object.entries(form).forEach(([k, v]) => {
        fd.append(k, String(v ?? ""));
      });
      await api.post(`/admin/items/${item.id}`, fd);
      toast.success("Rincian internal produk berhasil disimpan");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan rincian internal.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TableSkeleton rows={6} cols={3} />;

  if (notFound || !item) {
    return (
      <ErrorState
        title="Produk tidak ditemukan"
        description={`Produk dengan kode/slug "${slug}" tidak ditemukan di database.`}
        onRetry={() => navigate("/admin/items")}
      />
    );
  }

  const dim = [form.width_cm, form.depth_cm, form.height_cm].some(Boolean)
    ? `${form.width_cm || "-"} × ${form.depth_cm || "-"} × ${form.height_cm || "-"} cm`
    : "—";

  const availLabel =
    AVAILABILITY_OPTIONS.find((a) => a.value === form.availability)?.label ?? (form.availability || "—");

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Detail Internal Produk"
        title={item.title}
        description={`${item.code ? `${item.code} · ` : ""}${item.type?.name ?? "Furnitur"}${item.collection?.name ? ` · ${item.collection.name}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/items"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-4 py-2 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Daftar Produk
            </Link>
            <Link
              to={`/admin/items/${item.id}/experience`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#5E93B8]/35 bg-[#EDF4F8] px-4 py-2 text-xs font-medium text-[#35678B] hover:bg-[#DFECF4]"
            >
              <Settings2 className="h-3.5 w-3.5" /> Galeri &amp; Experience
            </Link>
          </div>
        }
      />

      <div className="flex items-center gap-2.5 rounded-xl border border-[#5E93B8]/30 bg-[#EDF4F8]/80 px-4 py-3 text-xs text-[#35678B]">
        <Lock className="h-4 w-4 shrink-0" />
        <span>
          <strong>Data Internal Studio &amp; Sales</strong> — Harga, stok, dan catatan gudang di halaman ini{" "}
          <strong>tidak tampil di website publik</strong>. Hanya digunakan untuk tim sales, kasir showroom, dan bot
          Livi.
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white p-3">
            {item.image ? (
              <img src={imgUrl(item.image)} alt={item.title} className="h-full w-full object-contain" />
            ) : (
              <div className="grid h-full place-items-center text-xs text-[#656B73]">Tanpa foto</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setQr(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E2DACF] bg-white px-4 py-2.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
          >
            <QrCode className="h-4 w-4 text-[#5E93B8]" /> Tampilkan &amp; Cetak QR
          </button>
          <a
            href={`/items/${item.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs text-[#5E93B8] hover:underline"
          >
            Lihat halaman publik <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Stok Tersisa" value={form.stock === "" ? "—" : `${form.stock} unit`} />
            <Stat label="Harga Internal" value={fmtIDR(form.price)} />
            <Stat label="Berat" value={form.weight_kg ? `${form.weight_kg} kg` : "—"} />
            <Stat label="Dimensi (L×D×T)" value={dim} />
            <Stat label="Ketersediaan" value={availLabel} />
            <Stat label="Finish / Tekstur" value={[item.finish, item.texture].filter(Boolean).join(" · ") || "—"} />
          </div>

          <div className="rounded-2xl border border-[#EAE4DA] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-header text-lg text-[#232528]">Ubah Rincian Internal</h2>
              <StatusBadge tone="accent" dot={false}>
                Privat (Backoffice)
              </StatusBadge>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Stok (unit)" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} type="number" disabled={!editable} />
              <Field label="Harga (IDR)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" disabled={!editable} />
              <Field label="Berat (kg)" value={form.weight_kg} onChange={(v) => setForm({ ...form, weight_kg: v })} type="number" disabled={!editable} />
              <Field label="Lebar (cm)" value={form.width_cm} onChange={(v) => setForm({ ...form, width_cm: v })} type="number" disabled={!editable} />
              <Field label="Kedalaman (cm)" value={form.depth_cm} onChange={(v) => setForm({ ...form, depth_cm: v })} type="number" disabled={!editable} />
              <Field label="Tinggi (cm)" value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: v })} type="number" disabled={!editable} />
              <label className="block sm:col-span-3">
                <span className="text-xs font-medium text-[#232528]">Status Ketersediaan</span>
                <select
                  disabled={!editable}
                  value={form.availability}
                  onChange={(e) => setForm({ ...form, availability: e.target.value })}
                  className="ui-input mt-1"
                >
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Area
                label="Detail Material (kulit, kayu, busa, rangka)"
                value={form.material_detail}
                onChange={(v) => setForm({ ...form, material_detail: v })}
                disabled={!editable}
              />
              <Area
                label="Catatan Gudang / Pengiriman"
                value={form.warehouse_note}
                onChange={(v) => setForm({ ...form, warehouse_note: v })}
                disabled={!editable}
              />
            </div>

            {editable && (
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#232528] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Menyimpan…" : "Simpan Rincian Internal"}
              </button>
            )}
          </div>
        </div>
      </div>

      {item?.id ? <TranslationPanel type="item" id={item.id} /> : null}

      <div className="rounded-2xl border border-[#EAE4DA] bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Boxes className="h-4 w-4 text-[#5E93B8]" />
          <h2 className="font-header text-lg text-[#232528]">Produk Serupa ({similar.length})</h2>
        </div>
        {similar.length === 0 ? (
          <p className="text-xs text-[#656B73]">Belum ada produk serupa.</p>
        ) : (
          <div className="divide-y divide-[#F1ECE4] overflow-hidden rounded-xl border border-[#EAE4DA]">
            {similar.map((s) => (
              <Link
                key={s.id}
                to={`/admin/items/${s.slug}/detail`}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-[#FAF8F4]"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#FAF8F4]">
                  {s.image && <img src={imgUrl(s.image)} alt={s.title} className="h-full w-full object-contain p-1" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#232528]">{s.title}</p>
                  <p className="truncate text-xs text-[#656B73]">
                    {s.code ? `${s.code} · ` : ""}
                    {s.type?.name ?? "—"}
                    {s.collection?.name ? ` · ${s.collection.name}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-[#656B73]">
                  <p>Stok: {s.stock ?? "—"}</p>
                  <p className="font-medium text-[#232528]">{fmtIDR(s.price)}</p>
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
  <div className="rounded-xl border border-[#EAE4DA] bg-white p-3.5">
    <p className="text-[11px] uppercase tracking-[0.14em] text-[#656B73]">{label}</p>
    <p className="mt-1 text-sm font-medium text-[#232528]">{value}</p>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) => (
  <label className="block">
    <span className="text-xs font-medium text-[#232528]">{label}</span>
    <input
      type={type}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="ui-input mt-1"
    />
  </label>
);

const Area = ({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) => (
  <label className="block">
    <span className="text-xs font-medium text-[#232528]">{label}</span>
    <textarea
      rows={3}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="ui-input mt-1"
    />
  </label>
);
