import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getOrderForm, submitOrderForm, type OrderItem } from "@/lib/shop";

type FormData = Awaited<ReturnType<typeof getOrderForm>>;

const input = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-foreground";

/** Form data pengiriman publik (dibuka dari tautan WhatsApp, tanpa login). */
export default function OrderForm() {
  const { code = "" } = useParams();
  const [sp] = useSearchParams();
  const token = sp.get("token") ?? "";
  const [meta, setMeta] = useState<FormData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<Record<string, any>>({ method: "delivery", has_lift: false, needs_installation: false, large_vehicle_parking: true, wants_tax_invoice: false, consent: false });
  const [spec, setSpec] = useState<Record<number, Record<string, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getOrderForm(code, token)
      .then((m) => { setMeta(m); setF((p) => ({ ...p, ...m.prefill })); })
      .catch((e) => setErr(e?.message || "Tautan tidak valid atau sudah kedaluwarsa."));
  }, [code, token]);

  const set = (k: string, v: any) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.consent) return toast.error("Centang persetujuan terlebih dahulu");
    if (meta?.has_mto && !f.mto_terms) return toast.error("Setujui syarat pesanan custom terlebih dahulu");
    setBusy(true);
    try {
      const custom_spec = Object.entries(spec).map(([id, s]) => ({ order_item_id: Number(id), ...s }));
      await submitOrderForm(code, token, { ...f, custom_spec: custom_spec.length ? custom_spec : undefined });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      const errs = e?.details?.errors as Record<string, string[]> | undefined;
      if (errs) setErrors(Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])));
      toast.error(e?.message || "Gagal mengirim data");
    } finally {
      setBusy(false);
    }
  };

  if (err) return <Shell><p className="serif text-2xl">Tautan tidak bisa dibuka</p><p className="mt-2 text-sm text-muted-foreground">{err} Minta tautan baru ke tim Livora lewat WhatsApp.</p></Shell>;
  if (!meta) return <Shell><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></Shell>;
  if (done)
    return (
      <Shell>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-6 w-6" /></div>
        <p className="serif mt-4 text-2xl">Terima kasih!</p>
        <p className="mt-2 text-sm text-muted-foreground">Data pesanan {code} sudah kami terima. Penawaran harga akan dikirim lewat WhatsApp & email.</p>
      </Shell>
    );

  const delivery = f.method === "delivery";
  const field = (k: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={`${input} ${errors[k] ? "border-red-400" : ""}`} {...props} />
      {errors[k] && <span className="mt-1 block text-xs text-red-600">{errors[k]}</span>}
    </label>
  );
  const toggle = (k: string, label: string) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={!!f[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4" /> {label}</label>
  );

  return (
    <main className="min-h-screen bg-background px-4 pt-28 pb-24">
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Pesanan {code}</p>
          <h1 className="serif mt-2 text-3xl">Data pengiriman</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sekitar 2 menit. Data ini dipakai untuk menghitung ongkir dan menyiapkan pengiriman.</p>
        </header>

        <Card title="Barang dipesan">
          <ul className="space-y-1 text-sm">{meta.items.map((i: OrderItem) => <li key={i.id}>{i.title} — {i.variant_name ?? "Tanpa varian"} × {i.quantity}</li>)}</ul>
        </Card>

        <Card title="Cara terima">
          <div className="grid grid-cols-2 gap-2">
            {[["delivery", "Dikirim ke alamat"], ["pickup", "Ambil di showroom"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set("method", v)} className={`h-11 rounded-xl border text-sm ${f.method === v ? "border-foreground bg-foreground text-background" : "border-border"}`}>{l}</button>
            ))}
          </div>
        </Card>

        <Card title="Penerima">
          <div className="grid gap-3 sm:grid-cols-2">
            {field("recipient", "Nama penerima", { required: true, autoComplete: "name" })}
            {field("phone", "No. HP penerima", { required: true, inputMode: "tel", autoComplete: "tel" })}
          </div>
        </Card>

        {delivery && (
          <>
            <Card title="Alamat">
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-6">{field("street", "Jalan, nomor, blok", { required: true, autoComplete: "street-address" })}</div>
                <div className="sm:col-span-1">{field("rt", "RT")}</div>
                <div className="sm:col-span-1">{field("rw", "RW")}</div>
                <div className="sm:col-span-4">{field("village", "Kelurahan")}</div>
                <div className="sm:col-span-3">{field("district", "Kecamatan", { required: true })}</div>
                <div className="sm:col-span-3">{field("city", "Kota / Kabupaten", { required: true })}</div>
                <div className="sm:col-span-4">{field("province", "Provinsi", { required: true })}</div>
                <div className="sm:col-span-2">{field("postal_code", "Kode pos", { inputMode: "numeric" })}</div>
                <div className="sm:col-span-6">{field("landmark", "Patokan (opsional)")}</div>
                <div className="sm:col-span-6">{field("map_url", "Tautan Google Maps (opsional)", { type: "url", placeholder: "https://maps.app.goo.gl/…" })}</div>
              </div>
            </Card>
            <Card title="Kondisi lokasi">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm"><span className="mb-1 block text-muted-foreground">Jenis bangunan</span>
                  <select value={f.building_type ?? ""} onChange={(e) => set("building_type", e.target.value)} className={input}>
                    <option value="">Pilih</option><option>Rumah</option><option>Apartemen</option><option>Ruko</option><option>Kantor</option>
                  </select>
                </label>
                {field("floor", "Lantai")}
                {field("door_width_cm", "Lebar pintu (cm)", { inputMode: "numeric" })}
              </div>
              <div className="mt-3 space-y-2">
                {toggle("has_lift", "Ada lift barang")}
                {toggle("large_vehicle_parking", "Truk/mobil besar bisa parkir dekat lokasi")}
                {toggle("needs_installation", "Perlu jasa pemasangan")}
              </div>
              <div className="mt-3 sm:w-1/2">{field("preferred_date", "Tanggal kirim yang diinginkan", { type: "date", min: new Date().toISOString().slice(0, 10) })}</div>
            </Card>
          </>
        )}

        {meta.has_mto && (
          <Card title="Spesifikasi barang custom">
            {meta.items.filter((i) => i.fulfillment_type === "made_to_order").map((i) => (
              <div key={i.id} className="mb-4 grid gap-2 sm:grid-cols-3">
                <p className="text-sm font-medium sm:col-span-3">{i.title}</p>
                {["dimensions", "material", "color"].map((k) => (
                  <input key={k} placeholder={{ dimensions: "Ukuran (P×L×T cm)", material: "Material", color: "Warna" }[k]} aria-label={k}
                    value={spec[i.id]?.[k] ?? ""} onChange={(e) => setSpec((s) => ({ ...s, [i.id]: { ...s[i.id], [k]: e.target.value } }))} className={input} />
                ))}
              </div>
            ))}
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={!!f.mto_terms} onChange={(e) => set("mto_terms", e.target.checked)} className="mt-0.5 h-4 w-4" />
              Saya memahami barang custom dibuat setelah lunas, dan pesanan custom tidak bisa dibatalkan atau dikembalikan dananya setelah produksi dimulai. Perubahan spesifikasi dapat dikenakan biaya tambahan.
            </label>
            {errors.mto_terms && <p className="mt-1 text-xs text-red-600">{errors.mto_terms}</p>}
          </Card>
        )}

        <Card title="Faktur pajak (opsional)">
          {toggle("wants_tax_invoice", "Saya butuh faktur pajak atas nama perusahaan")}
          {f.wants_tax_invoice && <div className="mt-3 grid gap-3 sm:grid-cols-2">{field("company", "Nama perusahaan")}{field("npwp", "NPWP")}</div>}
        </Card>

        <Card title="Catatan">
          <textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} maxLength={1000} aria-label="Catatan" className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-foreground" />
        </Card>

        <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4" />
          Data di atas benar dan saya setuju data ini dipakai Livora untuk memproses pesanan.
        </label>
        <button type="submit" disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kirim data
        </button>
      </form>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-3 font-medium">{title}</h2>{children}</section>;
}
function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center">{children}</div></main>;
}
