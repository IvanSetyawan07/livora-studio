import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Send, Sparkles as Wand, Trash2, Upload, RefreshCw, MessageSquareText, ExternalLink, ImagePlus, X, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Ev = {
  id: number; name: string; event_date: string | null; location: string | null; description_format: string | null;
  ai_instructions: string | null; knowledge: string | null; default_image_url: string | null; wa_template_name: string | null;
  wa_template_lang: string; template_has_buttons: boolean; sheet_csv_url: string | null; sheet_name_column: string | null;
  sheet_phone_column: string | null; is_active: boolean; guests_count?: number; sent_count?: number; hadir_count?: number; tidak_count?: number;
};
type Guest = {
  id: number; name: string; phone: string; category: string; source: string; description: string | null; image_url: string | null;
  image_path: string | null; status: string; send_channel: string | null; sent_at: string | null; rsvp: string | null; error_note: string | null; notes: string | null;
};

const errMsg = (e: any, f: string) => e?.response?.data?.message || f;
const STATUS: Record<string, string> = { draft: "Draf", siap: "Siap kirim", terkirim: "Terkirim", gagal: "Gagal", dibalas: "Dibalas" };
const CAT: Record<string, string> = { rekanan: "Rekanan", pelanggan: "Pelanggan", pendaftar: "Pendaftar Form" };
const input = "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm";
const area = "w-full rounded-xl border border-border bg-background p-3 text-sm";
const pill = (on: boolean) => `h-9 rounded-full px-4 text-sm ${on ? "bg-foreground text-background" : "border border-border"}`;

export default function AdminInvitations() {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [tab, setTab] = useState<"guests" | "event" | "chat">("guests");

  const loadEvents = () =>
    api.get<Ev[]>("/admin/invitations/events").then((r) => {
      setEvents(r.data);
      setEventId((cur) => cur ?? r.data[0]?.id ?? null);
    }).catch(() => setEvents([]));
  useEffect(() => { loadEvents(); }, []);
  const event = events?.find((e) => e.id === eventId) ?? null;

  const newEvent = async () => {
    const name = window.prompt("Nama acara (mis. Soft Opening Livora)");
    if (!name) return;
    try {
      const r = await api.post<Ev>("/admin/invitations/events", { name });
      await loadEvents();
      setEventId(r.data.id);
      setTab("event");
      toast.success("Acara dibuat, lengkapi detailnya");
    } catch (e) { toast.error(errMsg(e, "Gagal membuat acara")); }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="serif text-2xl">Sebar Undangan</h1>
          <p className="text-sm text-muted-foreground">Kirim undangan WhatsApp per tamu, catat kehadiran, dan tanya AI soal datanya.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {events && events.length > 0 && (
            <select aria-label="Pilih acara" value={eventId ?? ""} onChange={(e) => setEventId(Number(e.target.value))} className="h-10 rounded-full border border-border bg-background px-4 text-sm">
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
          <button type="button" onClick={newEvent} className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm text-background"><Plus className="h-4 w-4" /> Acara baru</button>
        </div>
      </div>

      {events === null ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
      ) : !event ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Belum ada acara. Klik <b>Acara baru</b> untuk mulai.</div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Total tamu", event.guests_count], ["Sudah dikirim", event.sent_count], ["Hadir", event.hadir_count], ["Tidak hadir", event.tidak_count]].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-2xl">{v ?? 0}</p></div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={pill(tab === "guests")} onClick={() => setTab("guests")}>Daftar tamu</button>
            <button type="button" className={pill(tab === "event")} onClick={() => setTab("event")}>Pengaturan acara</button>
            <button type="button" className={pill(tab === "chat")} onClick={() => setTab("chat")}>Tanya AI</button>
          </div>
          {tab === "guests" && <GuestsTab key={event.id} event={event} onChanged={loadEvents} />}
          {tab === "event" && <EventTab key={event.id} event={event} onSaved={loadEvents} onDeleted={() => { setEventId(null); loadEvents(); }} />}
          {tab === "chat" && <ChatTab key={event.id} event={event} />}
        </>
      )}
    </div>
  );
}

/* ---------------- Daftar tamu ---------------- */
function GuestsTab({ event, onChanged }: { event: Ev; onChanged: () => void }) {
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<Guest | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const base = `/admin/invitations/events/${event.id}`;

  const load = () => api.get<Guest[]>(`${base}/guests`, { params: { q: q || undefined, category: cat || undefined, status: status || undefined } })
    .then((r) => setGuests(r.data)).catch(() => setGuests([]));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, cat, status]);
  const refresh = () => { load(); onChanged(); };

  const ids = [...sel];
  const allOn = !!guests?.length && guests.every((g) => sel.has(g.id));
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } finally { setBusy(null); } };

  const generate = (mode: "format" | "ai") => run(mode, async () => {
    if (!ids.length) return void toast.error("Pilih tamu dulu");
    const overwrite = guests!.some((g) => sel.has(g.id) && g.description) && window.confirm("Sebagian tamu sudah punya deskripsi. Timpa juga?");
    let done = 0, failed = 0;
    for (let i = 0; i < ids.length; i += 20) {
      try {
        const r = await api.post(`${base}/generate`, { ids: ids.slice(i, i + 20), mode, overwrite });
        done += r.data.done; failed += r.data.failed;
        if (r.data.message) toast.error(r.data.message);
      } catch (e) { toast.error(errMsg(e, "Gagal membuat deskripsi")); break; }
    }
    toast.success(`${done} deskripsi dibuat${failed ? `, ${failed} gagal` : ""}`);
    refresh();
  });

  const sendAuto = () => run("send", async () => {
    if (!ids.length) return void toast.error("Pilih tamu dulu");
    if (!window.confirm(`Kirim undangan otomatis lewat nomor Livi ke ${ids.length} tamu?`)) return;
    let sent = 0; const fails: string[] = [];
    for (let i = 0; i < ids.length; i += 10) {
      try {
        const r = await api.post(`${base}/send`, { ids: ids.slice(i, i + 10) });
        sent += r.data.sent;
        r.data.results.filter((x: any) => !x.ok).forEach((x: any) => fails.push(`${x.name}: ${x.error}`));
      } catch (e) { toast.error(errMsg(e, "Gagal mengirim")); break; }
    }
    if (sent) toast.success(`${sent} undangan terkirim`);
    if (fails.length) toast.error(fails.slice(0, 3).join("\n") + (fails.length > 3 ? `\n+${fails.length - 3} lainnya` : ""), { duration: 10000 });
    setSel(new Set()); refresh();
  });

  const remove = () => run("del", async () => {
    if (!ids.length || !window.confirm(`Hapus ${ids.length} tamu?`)) return;
    await api.post(`${base}/guests/delete`, { ids });
    setSel(new Set()); refresh();
  });

  const pull = () => run("sheet", async () => {
    try {
      const r = await api.post(`${base}/pull-sheet`);
      toast.success(`Dari Sheet: ${r.data.added} baru, ${r.data.updated} diperbarui, ${r.data.skipped} dilewati`);
      refresh();
    } catch (e) { toast.error(errMsg(e, "Gagal menarik data Sheet")); }
  });

  const manual = async (g: Guest) => {
    try {
      const r = await api.get(`${base}/guests/${g.id}/manual`);
      window.open(r.data.url, "_blank", "noopener");
      if (r.data.image_url) toast.info("Jangan lupa lampirkan gambar undangannya di chat WhatsApp", { action: { label: "Buka gambar", onClick: () => window.open(r.data.image_url, "_blank") } });
      if (window.confirm(`Sudah terkirim ke ${g.name}? Tandai sebagai terkirim.`)) { await api.post(`${base}/guests/${g.id}/manual-sent`); refresh(); }
    } catch (e) { toast.error(errMsg(e, "Gagal membuka WhatsApp")); }
  };

  const B = ({ k, onClick, children, primary }: any) => (
    <button type="button" disabled={!!busy} onClick={onClick} className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm disabled:opacity-50 ${primary ? "bg-foreground text-background" : "border border-border"}`}>
      {busy === k ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{children}
    </button>
  );

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / nomor" aria-label="Cari tamu" className="h-9 min-w-[200px] flex-1 rounded-full border border-border bg-background px-4 text-sm" />
        <select aria-label="Kategori" value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-full border border-border bg-background px-3 text-sm">
          <option value="">Semua kategori</option>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-full border border-border bg-background px-3 text-sm">
          <option value="">Semua status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <B k="add" onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> Tambah tamu</B>
        <B k="imp" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Tempel / impor daftar</B>
        <B k="sheet" onClick={pull}><RefreshCw className="h-4 w-4" /> Tarik data Google Sheet</B>
      </div>
      {sel.size > 0 && (
        <div className="sticky top-2 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <span className="text-sm">{sel.size} dipilih</span>
          <B k="format" onClick={() => generate("format")}>Isi dari format</B>
          <B k="ai" onClick={() => generate("ai")}><Wand className="h-4 w-4" /> Tulis dengan AI</B>
          <B k="send" primary onClick={sendAuto}><Send className="h-4 w-4" /> Kirim otomatis (Livi)</B>
          <B k="del" onClick={remove}><Trash2 className="h-4 w-4" /> Hapus</B>
        </div>
      )}

      {guests === null ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat tamu…</div>
      ) : !guests.length ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Belum ada tamu. Tambah satu per satu, tempel daftar, atau tarik dari Google Sheet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3"><input type="checkbox" aria-label="Pilih semua" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(guests.map((g) => g.id)))} /></th>
                <th className="p-3">Tamu</th><th className="p-3">Gambar</th><th className="p-3">Deskripsi</th><th className="p-3">Status</th><th className="p-3">Kehadiran</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-t border-border align-top">
                  <td className="p-3"><input type="checkbox" aria-label={`Pilih ${g.name}`} checked={sel.has(g.id)} onChange={() => toggle(g.id)} /></td>
                  <td className="p-3"><p className="font-medium">{g.name}</p><p className="font-mono text-xs text-muted-foreground">+{g.phone}</p><p className="text-xs text-muted-foreground">{CAT[g.category] ?? g.category}</p></td>
                  <td className="p-3">{g.image_url ? <img src={g.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <span className="text-xs text-muted-foreground">—</span>}{g.image_url && !g.image_path && <p className="text-[10px] text-muted-foreground">umum</p>}</td>
                  <td className="max-w-[320px] p-3"><p className="line-clamp-3 whitespace-pre-line text-xs">{g.description || <span className="text-muted-foreground">Belum ada</span>}</p></td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${g.status === "gagal" ? "bg-destructive/10 text-destructive" : g.status === "terkirim" || g.status === "dibalas" ? "bg-primary/10 text-primary" : "bg-muted"}`}>{STATUS[g.status] ?? g.status}</span>
                    {g.send_channel && <p className="mt-1 text-[11px] text-muted-foreground">via {g.send_channel}</p>}
                    {g.error_note && <p className="mt-1 max-w-[200px] text-[11px] text-destructive">{g.error_note}</p>}
                  </td>
                  <td className="p-3 text-xs">{g.rsvp === "hadir" ? "✅ Hadir" : g.rsvp === "tidak" ? "❌ Tidak" : "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => setEdit(g)} className="rounded-full border border-border px-3 py-1 text-xs">Ubah</button>
                      <button type="button" onClick={() => manual(g)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"><ExternalLink className="h-3 w-3" /> Kirim manual</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <GuestDialog event={event} guest={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
      {importOpen && <ImportDialog base={base} onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); refresh(); }} />}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-background p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="serif text-xl">{title}</h2><button type="button" aria-label="Tutup" onClick={onClose}><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  );
}

function GuestDialog({ event, guest, onClose, onSaved }: { event: Ev; guest: Guest | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: guest?.name ?? "", phone: guest?.phone ?? "", category: guest?.category ?? "pelanggan", description: guest?.description ?? "", rsvp: guest?.rsvp ?? "", notes: guest?.notes ?? "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : guest?.image_url ?? null), [file, guest]);
  const base = `/admin/invitations/events/${event.id}/guests`;

  const save = async () => {
    setSaving(true);
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => { if (k !== "rsvp" || v) fd.append(k, v); });
    if (file) fd.append("image", file);
    try { await api.post(guest ? `${base}/${guest.id}` : base, fd); toast.success("Tersimpan"); onSaved(); }
    catch (e) { toast.error(errMsg(e, "Gagal menyimpan")); } finally { setSaving(false); }
  };
  const removeImg = async () => { if (!guest) return; await api.delete(`${base}/${guest.id}/image`); toast.success("Gambar pribadi dihapus"); onSaved(); };

  return (
    <Modal title={guest ? "Ubah tamu" : "Tambah tamu"} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">Nama<input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="block text-sm">Nomor WhatsApp<input className={input} value={f.phone} placeholder="0812xxxx atau 62812xxxx" onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label className="block text-sm">Kategori
          <select className={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <div className="text-sm">
          Gambar undangan {!guest?.image_path && event.default_image_url && <span className="text-xs text-muted-foreground">(kosong = pakai gambar umum)</span>}
          <div className="mt-1 flex items-center gap-3">
            {preview && <img src={preview} alt="" className="h-20 w-20 rounded-xl object-cover" />}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-xs"><ImagePlus className="h-4 w-4" /> Pilih gambar
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {guest?.image_path && !file && <button type="button" onClick={removeImg} className="text-xs text-destructive">Hapus gambar pribadi</button>}
          </div>
        </div>
        <label className="block text-sm">Deskripsi pesan WhatsApp<textarea rows={7} className={area} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Kosongkan lalu pakai tombol Isi dari format / Tulis dengan AI" /></label>
        <label className="block text-sm">Kehadiran
          <select className={input} value={f.rsvp} onChange={(e) => setF({ ...f, rsvp: e.target.value })}><option value="">Belum ada</option><option value="hadir">Hadir</option><option value="tidak">Tidak hadir</option></select>
        </label>
        <label className="block text-sm">Catatan internal<input className={input} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
        <button type="button" disabled={saving} onClick={save} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm text-background disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan</button>
      </div>
    </Modal>
  );
}

function ImportDialog({ base, onClose, onDone }: { base: string; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("pelanggan");
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => text.split(/\r?\n/).map((l) => l.split(/\t|;|,/).map((s) => s.trim())).filter((p) => p.length >= 2 && p[0] && p[1])
    .map(([a, b]) => (/\d{6,}/.test(a.replace(/\D/g, "")) && !/\d{6,}/.test(b.replace(/\D/g, "")) ? { name: b, phone: a } : { name: a, phone: b }))
    .filter((r) => !/^(nama|name)$/i.test(r.name)), [text]);

  const onFile = async (f?: File) => { if (f) setText(await f.text()); };
  const save = async () => {
    if (!rows.length) return void toast.error("Belum ada baris yang terbaca");
    setSaving(true);
    try {
      const r = await api.post(`${base}/guests/bulk`, { rows: rows.map((x) => ({ ...x, category })) });
      toast.success(`${r.data.added} tamu ditambahkan, ${r.data.skipped} sudah ada`);
      if (r.data.invalid.length) toast.error(`Nomor tidak valid: ${r.data.invalid.slice(0, 5).join(", ")}`, { duration: 10000 });
      onDone();
    } catch (e) { toast.error(errMsg(e, "Gagal impor")); } finally { setSaving(false); }
  };

  return (
    <Modal title="Tempel / impor daftar tamu" onClose={onClose}>
      <p className="text-sm text-muted-foreground">Satu tamu per baris: <b>Nama, Nomor</b>. Bisa disalin langsung dari Excel/Google Sheet (2 kolom), atau unggah file CSV.</p>
      <textarea rows={10} className={`${area} mt-3 font-mono`} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Budi Santoso, 081234567890\nPT Maju Jaya - Ibu Rina, 6281298765432"} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-xs"><Upload className="h-4 w-4" /> Unggah CSV<input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} /></label>
        <select aria-label="Kategori" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-full border border-border bg-background px-3 text-sm">{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <span className="text-sm text-muted-foreground">{rows.length} baris terbaca</span>
      </div>
      <button type="button" disabled={saving} onClick={save} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm text-background disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Tambahkan</button>
    </Modal>
  );
}

/* ---------------- Pengaturan acara ---------------- */
function EventTab({ event, onSaved, onDeleted }: { event: Ev; onSaved: () => void; onDeleted: () => void }) {
  const [f, setF] = useState({
    name: event.name, event_date: event.event_date ? event.event_date.slice(0, 16).replace(" ", "T") : "", location: event.location ?? "",
    description_format: event.description_format ?? "", ai_instructions: event.ai_instructions ?? "", knowledge: event.knowledge ?? "",
    wa_template_name: event.wa_template_name ?? "", wa_template_lang: event.wa_template_lang ?? "id", template_has_buttons: event.template_has_buttons,
    sheet_csv_url: event.sheet_csv_url ?? "", sheet_name_column: event.sheet_name_column ?? "", sheet_phone_column: event.sheet_phone_column ?? "", is_active: event.is_active,
  });
  const [img, setImg] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, typeof v === "boolean" ? (v ? "1" : "0") : v));
    if (img) fd.append("default_image", img);
    try { await api.post(`/admin/invitations/events/${event.id}`, fd); toast.success("Pengaturan acara tersimpan"); onSaved(); }
    catch (e) { toast.error(errMsg(e, "Gagal menyimpan")); } finally { setSaving(false); }
  };
  const del = async () => {
    if (!window.confirm(`Hapus acara "${event.name}" beserta seluruh tamunya?`)) return;
    await api.delete(`/admin/invitations/events/${event.id}`); toast.success("Acara dihapus"); onDeleted();
  };

  const Sec = ({ title, hint, children }: any) => (
    <section className="rounded-2xl border border-border bg-card p-4"><h3 className="font-medium">{title}</h3>{hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}<div className="mt-3 space-y-3">{children}</div></section>
  );

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Sec title="Detail acara">
        <label className="block text-sm">Nama acara<input className={input} value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="block text-sm">Tanggal & jam<input type="datetime-local" className={input} value={f.event_date} onChange={(e) => set("event_date", e.target.value)} /></label>
        <label className="block text-sm">Lokasi<input className={input} value={f.location} onChange={(e) => set("location", e.target.value)} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Acara aktif (Livi menjawab pertanyaan tamu)</label>
        <div className="text-sm">Gambar umum <span className="text-xs text-muted-foreground">(dipakai tamu yang tidak punya gambar pribadi, mis. pendaftar Form)</span>
          <div className="mt-1 flex items-center gap-3">
            {(img || event.default_image_url) && <img src={img ? URL.createObjectURL(img) : event.default_image_url!} alt="" className="h-20 w-20 rounded-xl object-cover" />}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-xs"><ImagePlus className="h-4 w-4" /> Pilih gambar<input type="file" accept="image/*" className="hidden" onChange={(e) => setImg(e.target.files?.[0] ?? null)} /></label>
          </div>
        </div>
      </Sec>
      <Sec title="Format deskripsi" hint="Tulis contoh pesan. Pakai {nama}, {acara}, {tanggal}, {lokasi} — otomatis diganti per tamu.">
        <textarea rows={9} className={area} value={f.description_format} onChange={(e) => set("description_format", e.target.value)} placeholder={"Halo Kak {nama} ✨\n\nDengan senang hati kami mengundang Kakak ke {acara} pada {tanggal} di {lokasi}.\n\nSampai jumpa!\nTim Livora"} />
        <label className="block text-sm">Arahan gaya untuk AI (opsional)<textarea rows={3} className={area} value={f.ai_instructions} onChange={(e) => set("ai_instructions", e.target.value)} placeholder="mis. Rekanan pakai Bapak/Ibu, singkat dan elegan" /></label>
      </Sec>
      <Sec title="Pengetahuan untuk Livi" hint="Semua info yang boleh Livi jawab ke tamu: dress code, parkir, susunan acara, kontak, dll. Livi tidak akan menjawab di luar ini.">
        <textarea rows={9} className={area} value={f.knowledge} onChange={(e) => set("knowledge", e.target.value)} placeholder={"Dress code: smart casual, nuansa earth tone\nParkir: tersedia di depan showroom\nBoleh bawa pasangan/keluarga\nKontak: ..."} />
      </Sec>
      <Sec title="Kirim otomatis (nomor Livi)" hint="Untuk tamu yang belum chat Livi dalam 24 jam, WhatsApp mewajibkan template yang disetujui Meta: header gambar, isi memakai {{1}} untuk nama, tombol balas cepat 'Hadir' dan 'Tidak bisa hadir'.">
        <label className="block text-sm">Nama template Meta<input className={input} value={f.wa_template_name} onChange={(e) => set("wa_template_name", e.target.value)} placeholder="undangan_soft_opening" /></label>
        <label className="block text-sm">Kode bahasa template<input className={input} value={f.wa_template_lang} onChange={(e) => set("wa_template_lang", e.target.value)} placeholder="id" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.template_has_buttons} onChange={(e) => set("template_has_buttons", e.target.checked)} /> Template punya 2 tombol (Hadir / Tidak bisa hadir)</label>
      </Sec>
      <Sec title="Google Sheet pendaftar" hint="Tempel tautan Sheet hasil Google Form. Atur Share → 'Anyone with the link' (Viewer). Lalu klik 'Tarik data Google Sheet' di Daftar tamu.">
        <label className="block text-sm">Tautan Google Sheet<input className={input} value={f.sheet_csv_url} onChange={(e) => set("sheet_csv_url", e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Judul kolom nama<input className={input} value={f.sheet_name_column} onChange={(e) => set("sheet_name_column", e.target.value)} placeholder="Nama Lengkap" /></label>
          <label className="block text-sm">Judul kolom nomor<input className={input} value={f.sheet_phone_column} onChange={(e) => set("sheet_phone_column", e.target.value)} placeholder="Nomor WhatsApp" /></label>
        </div>
      </Sec>
      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <button type="button" disabled={saving} onClick={save} className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm text-background disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Simpan pengaturan</button>
        <button type="button" onClick={del} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-6 text-sm text-destructive"><Trash2 className="h-4 w-4" /> Hapus acara</button>
      </div>
    </div>
  );
}

/* ---------------- Tanya AI ---------------- */
function ChatTab({ event }: { event: Ev }) {
  const [msgs, setMsgs] = useState<{ role: string; content: string }[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const base = `/admin/invitations/events/${event.id}/chat`;
  useEffect(() => { api.get(base).then((r) => setMsgs(r.data)).catch(() => setMsgs([])); }, [base]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, sending]);

  const send = async (q = text) => {
    q = q.trim(); if (!q || sending) return;
    setText(""); setMsgs((m) => [...(m ?? []), { role: "user", content: q }]); setSending(true);
    try { const r = await api.post(base, { message: q }); setMsgs((m) => [...(m ?? []), { role: "assistant", content: r.data.reply }]); }
    catch (e) { toast.error(errMsg(e, "AI gagal menjawab")); setMsgs((m) => (m ?? []).slice(0, -1)); setText(q); }
    finally { setSending(false); }
  };
  const clear = async () => { if (!window.confirm("Hapus riwayat chat?")) return; await api.delete(base); setMsgs([]); };
  const ideas = ["Berapa tamu yang sudah konfirmasi hadir?", "Siapa rekanan yang belum dikirimi undangan?", "Daftar undangan yang gagal terkirim dan alasannya", "Buatkan pesan pengingat H-1 acara"];

  return (
    <div className="mt-4 flex h-[70vh] flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm"><MessageSquareText className="h-4 w-4" /> Tanya AI tentang data undangan "{event.name}"</p>
        {!!msgs?.length && <button type="button" onClick={clear} className="text-xs text-muted-foreground">Hapus riwayat</button>}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs === null ? <Loader2 className="h-4 w-4 animate-spin" /> : !msgs.length && (
          <div className="flex flex-wrap gap-2">{ideas.map((i) => <button key={i} type="button" onClick={() => send(i)} className="rounded-full border border-border px-3 py-1.5 text-xs">{i}</button>)}</div>
        )}
        {msgs?.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[80%] rounded-2xl bg-foreground px-4 py-2 text-sm text-background" : "max-w-[90%] whitespace-pre-line text-sm"}>{m.content}</div>
        ))}
        {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Menganalisis data…</div>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tanyakan apa saja soal tamu & undangan…" aria-label="Pesan" className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm" />
        <button type="submit" disabled={sending || !text.trim()} aria-label="Kirim" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
