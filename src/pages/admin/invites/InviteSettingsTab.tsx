import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { invites, inviteError, type InviteEvent } from "@/lib/invites";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const SAMPLE_FORMAT = `Halo Kak {nama} 👋

Dengan senang hati kami mengundang Kakak ke {acara}.

📅 {tanggal}
📍 {lokasi}

Konfirmasi kehadiran Kakak lewat tombol di bawah ya. Sampai jumpa di Livora! ✨`;

const input = "mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground";
const area = "mt-1 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-foreground";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Pengaturan acara: info acara, format deskripsi, pengetahuan Livi, template Meta, Google Sheet, gambar umum. */
export default function InviteSettingsTab({ event, onSaved, onDeleted }: { event: InviteEvent | null; onSaved: (e: InviteEvent) => void; onDeleted?: () => void }) {
  const [f, setF] = useState({
    name: "", event_date: "", location: "", description_format: "", ai_instructions: "", knowledge: "",
    wa_template_name: "", wa_template_lang: "id", template_has_buttons: true,
    sheet_csv_url: "", sheet_name_column: "", sheet_phone_column: "", is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!event) return;
    setF({
      name: event.name, event_date: toLocalInput(event.event_date), location: event.location ?? "",
      description_format: event.description_format ?? "", ai_instructions: event.ai_instructions ?? "", knowledge: event.knowledge ?? "",
      wa_template_name: event.wa_template_name ?? "", wa_template_lang: event.wa_template_lang || "id", template_has_buttons: event.template_has_buttons,
      sheet_csv_url: event.sheet_csv_url ?? "", sheet_name_column: event.sheet_name_column ?? "", sheet_phone_column: event.sheet_phone_column ?? "",
      is_active: event.is_active,
    });
  }, [event]);

  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.name.trim()) return toast.error("Nama acara wajib diisi");
    setSaving(true);
    try {
      const body: any = { ...f };
      const saved = event ? await invites.updateEvent(event.id, body) : await invites.createEvent(body);
      toast.success(event ? "Pengaturan disimpan" : "Acara dibuat");
      onSaved(saved);
    } catch (e) {
      toast.error(inviteError(e));
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file?: File) => {
    if (!file || !event) return;
    setImgBusy(true);
    try { onSaved(await invites.setEventImage(event.id, file)); toast.success("Gambar umum disimpan"); }
    catch (e) { toast.error(inviteError(e)); }
    finally { setImgBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const removeImage = async () => {
    if (!event) return;
    setImgBusy(true);
    try { onSaved(await invites.removeEventImage(event.id)); } catch (e) { toast.error(inviteError(e)); } finally { setImgBusy(false); }
  };

  const destroy = async () => {
    if (!event || !window.confirm(`Hapus acara "${event.name}" beserta seluruh daftar tamunya? Ini tidak bisa dibatalkan.`)) return;
    try { await invites.deleteEvent(event.id); toast.success("Acara dihapus"); onDeleted?.(); } catch (e) { toast.error(inviteError(e)); }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Info acara</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nama acara"><input className={input} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Soft Opening Livora" /></Field>
          <Field label="Tanggal & jam (WIB)"><input type="datetime-local" className={input} value={f.event_date} onChange={(e) => set("event_date", e.target.value)} /></Field>
        </div>
        <Field label="Lokasi"><input className={input} value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Alamat lengkap / tautan Google Maps" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Acara aktif (Livi menjawab tamu & Sheet ditarik otomatis tiap 10 menit)</label>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Format deskripsi undangan</h2>
          <button type="button" onClick={() => set("description_format", SAMPLE_FORMAT)} className="h-8 rounded-lg border border-border px-3 text-xs">Pakai contoh</button>
        </div>
        <Field label="Format pesan" hint="Placeholder: {nama} {acara} {tanggal} {lokasi}. AI menulis ulang per tamu dengan struktur & fakta yang sama persis.">
          <textarea rows={9} className={area} value={f.description_format} onChange={(e) => set("description_format", e.target.value)} />
        </Field>
        <Field label="Arahan gaya untuk AI (opsional)" hint="Contoh: hangat & santai untuk pelanggan, lebih formal untuk rekanan, jangan lebih dari 6 baris.">
          <textarea rows={3} className={area} value={f.ai_instructions} onChange={(e) => set("ai_instructions", e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Yang Livi ketahui tentang acara</h2>
        <Field label="Info acara" hint="Dress code, parkir, rundown, hadiah, cara konfirmasi, kontak panitia, dll. Livi hanya menjawab dari sini; kalau tidak ada, pertanyaan diteruskan ke admin.">
          <textarea rows={8} className={area} value={f.knowledge} onChange={(e) => set("knowledge", e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Template WhatsApp (Meta)</h2>
        <p className="text-sm text-muted-foreground">
          Pesan pertama ke orang yang belum chat 24 jam terakhir wajib memakai template yang sudah disetujui Meta. Buat template kategori <b>Marketing</b>, bahasa Indonesia,
          header <b>Gambar</b>, isi memuat satu variabel <code>{"{{1}}"}</code> (nama tamu), dan (opsional) 2 tombol Quick Reply: <b>Hadir</b> dan <b>Tidak bisa hadir</b>.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nama template" hint="Huruf kecil, angka, underscore."><input className={input} value={f.wa_template_name} onChange={(e) => set("wa_template_name", e.target.value.toLowerCase())} placeholder="undangan_soft_opening" /></Field>
          <Field label="Kode bahasa"><input className={input} value={f.wa_template_lang} onChange={(e) => set("wa_template_lang", e.target.value)} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={f.template_has_buttons} onChange={(e) => set("template_has_buttons", e.target.checked)} /> Template punya 2 tombol Hadir/Tidak</label>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Pendaftar Google Form (Sheet)</h2>
        <Field label="Tautan Google Sheet" hint='Share → "Anyone with the link" (Viewer), atau File → Share → Publish to web → CSV. Tempel tautannya di sini.'>
          <input className={input} value={f.sheet_csv_url} onChange={(e) => set("sheet_csv_url", e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Judul kolom nama (opsional)" hint="Kosong = dicari otomatis (nama/name)."><input className={input} value={f.sheet_name_column} onChange={(e) => set("sheet_name_column", e.target.value)} /></Field>
          <Field label="Judul kolom WhatsApp (opsional)" hint="Kosong = dicari otomatis (whatsapp/wa/telepon/hp)."><input className={input} value={f.sheet_phone_column} onChange={(e) => set("sheet_phone_column", e.target.value)} /></Field>
        </div>
      </section>

      {event && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Gambar umum</h2>
          <p className="text-sm text-muted-foreground">Dipakai tamu yang tidak punya gambar pribadi, terutama pendaftar Google Form. JPG/PNG maks 5 MB.</p>
          <div className="flex flex-wrap items-center gap-4">
            {event.default_image_url ? <img src={event.default_image_url} alt="Gambar umum" className="h-28 w-28 rounded-lg border border-border object-cover" /> : <div className="grid h-28 w-28 place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">Belum ada</div>}
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} />
              <button type="button" disabled={imgBusy} onClick={() => fileRef.current?.click()} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm">
                {imgBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {event.default_image_url ? "Ganti" : "Unggah"}
              </button>
              {event.default_image_url && <button type="button" disabled={imgBusy} onClick={removeImage} className="h-9 rounded-lg px-3 text-sm text-destructive">Hapus</button>}
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" disabled={saving} onClick={save} className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-5 text-sm text-background disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {event ? "Simpan pengaturan" : "Buat acara"}
        </button>
        {event && <button type="button" onClick={destroy} className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm text-destructive"><Trash2 className="h-4 w-4" /> Hapus acara</button>}
      </div>
    </div>
  );
}