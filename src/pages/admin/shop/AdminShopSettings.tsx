import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminShop, rupiah } from "@/lib/shop";

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const TPL: Record<string, string> = {
  greeting: "Sapaan awal", form_link: "Kirim tautan form ({nama}, {kode}, {link})", handoff: "Saat diserahkan ke tim",
  off_hours: "Di luar jam kerja", session_closed: "Sesi tim ditutup", unknown: "Bot tidak paham",
};
const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm";

/** Pengaturan toko tanpa deploy (Owner). */
export default function AdminShopSettings() {
  const [s, setS] = useState<Record<string, any> | null>(null);
  const [zones, setZones] = useState<[string, number][]>([]);
  const [block, setBlock] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminShop.settings().then((d) => { setS(d); setZones(Object.entries(d.shipping_zones ?? {}) as [string, number][]); setBlock((d.blocklist ?? []).join("\n")); })
      .catch((e) => toast.error(e.message));
  }, []);
  if (!s) return <Loader2 className="h-5 w-5 animate-spin" />;
  const set = (k: string, v: any) => setS({ ...s, [k]: v });

  const save = async () => {
    setBusy(true);
    try {
      const d = await adminShop.saveSettings({
        bot_enabled: s.bot_enabled, ai_answers_enabled: s.ai_answers_enabled, business_hours: s.business_hours, templates: s.templates,
        shipping_zones: Object.fromEntries(zones.filter(([k]) => k.trim()).map(([k, v]) => [k.trim().toLowerCase(), Number(v) || 0])),
        blocklist: block.split(/[\n,]/).map((x) => x.trim()).filter(Boolean),
        review_threshold: Number(s.review_threshold), quote_valid_days: Number(s.quote_valid_days), sla_hours: Number(s.sla_hours),
        warranty_days: Number(s.warranty_days), return_days: Number(s.return_days), retention_days: Number(s.retention_days),
      });
      setS(d); toast.success("Pengaturan disimpan");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const Num = ({ k, label, suffix }: { k: string; label: string; suffix?: string }) => (
    <label className="block text-sm"><span className="mb-1 block text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2"><input type="number" min={0} value={s[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={inp} aria-label={label} />{suffix && <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>}</div>
    </label>
  );

  return (
    <div className="max-w-3xl space-y-6 pb-20">
      <div><h1 className="text-2xl font-semibold">Pengaturan toko</h1><p className="text-sm text-muted-foreground">Berlaku langsung tanpa perlu deploy. Semua perubahan tercatat di catatan aktivitas.</p></div>

      <Sec title="Bot WhatsApp">
        <Toggle label="Bot aktif (matikan = semua chat langsung ke tim)" checked={!!s.bot_enabled} onChange={(v) => set("bot_enabled", v)} />
        <Toggle label="Jawab pertanyaan bebas dengan AI (bot tetap menyatakan dirinya asisten AI)" checked={!!s.ai_answers_enabled} onChange={(v) => set("ai_answers_enabled", v)} />
        <p className="text-xs text-muted-foreground">Form pengiriman di dalam WhatsApp (WhatsApp Flows): {s.wa_flow_configured ? "aktif" : "belum aktif — isi SHOP_WA_FLOW_ID di server"}.</p>
      </Sec>

      <Sec title="Jam operasional">
        <div className="flex flex-wrap gap-1">
          {DAYS.map((d, i) => {
            const day = i + 1, on = s.business_hours?.days?.includes(day);
            return <button key={d} type="button" aria-pressed={on} onClick={() => set("business_hours", { ...s.business_hours, days: on ? s.business_hours.days.filter((x: number) => x !== day) : [...(s.business_hours?.days ?? []), day] })}
              className={`h-9 w-12 rounded-lg text-sm ${on ? "bg-foreground text-background" : "border border-border"}`}>{d}</button>;
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <input type="time" value={s.business_hours?.start ?? "09:00"} onChange={(e) => set("business_hours", { ...s.business_hours, start: e.target.value })} className="h-10 rounded-lg border border-border bg-background px-2" aria-label="Jam buka" />
          <span>sampai</span>
          <input type="time" value={s.business_hours?.end ?? "17:00"} onChange={(e) => set("business_hours", { ...s.business_hours, end: e.target.value })} className="h-10 rounded-lg border border-border bg-background px-2" aria-label="Jam tutup" />
          <span className="text-muted-foreground">WIB</span>
        </div>
      </Sec>

      <Sec title="Teks template bot">
        {Object.entries(TPL).map(([k, l]) => (
          <label key={k} className="block text-sm"><span className="mb-1 block text-muted-foreground">{l}</span>
            <textarea rows={2} value={s.templates?.[k] ?? ""} onChange={(e) => set("templates", { ...s.templates, [k]: e.target.value })} className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
          </label>
        ))}
        <p className="text-xs text-muted-foreground">Pesan di luar jendela 24 jam wajib memakai template yang disetujui Meta; status approval dicek di WhatsApp Manager.</p>
      </Sec>

      <Sec title="Zona & tarif ongkir">
        <p className="text-xs text-muted-foreground">Nama kota atau provinsi persis seperti diisi pelanggan. Kota dicocokkan lebih dulu. Wilayah di luar daftar dihitung manual oleh admin.</p>
        {zones.map(([k, v], i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={inp} placeholder="mis. Jakarta Selatan" aria-label="Kota atau provinsi" value={k} onChange={(e) => setZones(zones.map((z, j) => j === i ? [e.target.value, z[1]] : z))} />
            <input className={`${inp} w-40 text-right`} type="number" min={0} aria-label="Tarif" value={v} onChange={(e) => setZones(zones.map((z, j) => j === i ? [z[0], +e.target.value] : z))} />
            <span className="w-28 shrink-0 text-xs text-muted-foreground">{rupiah(v)}</span>
            <button type="button" aria-label="Hapus zona" onClick={() => setZones(zones.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setZones([...zones, ["", 0]])} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm"><Plus className="h-4 w-4" /> Tambah zona</button>
      </Sec>

      <Sec title="Aturan pesanan">
        <div className="grid gap-3 sm:grid-cols-3">
          <Num k="review_threshold" label="Batas nilai wajib review" suffix="Rp" />
          <Num k="quote_valid_days" label="Masa berlaku penawaran" suffix="hari" />
          <Num k="sla_hours" label="Target waktu review" suffix="jam" />
          <Num k="return_days" label="Batas klaim rusak/salah ukuran" suffix="hari" />
          <Num k="warranty_days" label="Masa garansi" suffix="hari" />
          <Num k="retention_days" label="Simpan chat WA selama" suffix="hari" />
        </div>
        <p className="text-xs text-muted-foreground">Masa garansi, retur, dan retensi data sebaiknya dikonfirmasi dengan penasihat hukum (UU PDP).</p>
      </Sec>

      <Sec title="Daftar blokir">
        <textarea rows={3} value={block} onChange={(e) => setBlock(e.target.value)} placeholder="Satu nomor per baris (08… atau 62…)" aria-label="Nomor diblokir" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
      </Sec>

      <div className="sticky bottom-4">
        <button type="button" disabled={busy} onClick={save} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm text-background shadow-lg disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan pengaturan</button>
      </div>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">{title}</h2>{children}</section>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-foreground" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
