import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, FileUp, ImagePlus, Images, Loader2, Megaphone, MessageCircle, Pencil, Plus, RefreshCw, Send, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { invites, inviteError, type InviteCategory, type InviteEvent, type InviteGuest, type InviteStatus } from "@/lib/invites";
import InviteSettingsTab from "./InviteSettingsTab";
import InviteChatTab from "./InviteChatTab";
import InviteCheckInTab from "./InviteCheckInTab";

const STATUS: Record<InviteStatus, { l: string; c: string }> = {
  draft: { l: "Draf", c: "bg-muted text-muted-foreground" },
  siap: { l: "Siap kirim", c: "bg-sky-100 text-sky-900" },
  terkirim: { l: "Terkirim", c: "bg-emerald-100 text-emerald-900" },
  gagal: { l: "Gagal", c: "bg-red-100 text-red-900" },
  dibalas: { l: "Dibalas", c: "bg-violet-100 text-violet-900" },
};
const CAT: Record<InviteCategory, string> = { rekanan: "Rekanan", pelanggan: "Pelanggan", pendaftar: "Pendaftar Form" };
const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted disabled:opacity-50";
const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground";

const chunk = <T,>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** Baca teks tempelan (Excel/CSV) → baris {name, phone, category}. Kolom dikenali dari isinya, urutan bebas. */
function parseRows(raw: string): { name: string; phone: string; category?: string }[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: { name: string; phone: string; category?: string }[] = [];
  const isPhone = (s: string) => /^\+?[\d\s\-().]{9,20}$/.test(s) && s.replace(/\D/g, "").length >= 9;
  for (const line of lines) {
    const delim = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
    const cells = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    const phone = cells.find(isPhone);
    if (!phone) continue; // baris judul / kosong
    const cat = cells.find((c) => /^(rekanan|pelanggan|pendaftar)$/i.test(c));
    const name = cells.find((c) => c && c !== phone && c !== cat);
    if (name) out.push({ name, phone, category: cat?.toLowerCase() });
  }
  return out;
}

type Tab = "tamu" | "checkin" | "acara" | "chat";

export default function AdminInvites() {
  const [events, setEvents] = useState<InviteEvent[] | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("tamu");
  const [guests, setGuests] = useState<InviteGuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fRsvp, setFRsvp] = useState("");
  const [edit, setEdit] = useState<InviteGuest | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // label proses panjang
  const bulkImg = useRef<HTMLInputElement>(null);

  const event = useMemo(() => events?.find((e) => e.id === eventId) ?? null, [events, eventId]);

  const loadEvents = useCallback(async (selectId?: number) => {
    try {
      const list = await invites.events();
      setEvents(list);
      setEventId((cur) => selectId ?? (cur && list.some((e) => e.id === cur) ? cur : list[0]?.id ?? null));
    } catch (e) { toast.error(inviteError(e)); setEvents([]); }
  }, []);

  const loadGuests = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try { setGuests(await invites.guests(eventId)); setSel(new Set()); } catch (e) { toast.error(inviteError(e)); } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { loadGuests(); }, [loadGuests]);

  const refresh = async () => { await Promise.all([loadGuests(), loadEvents(eventId ?? undefined)]); };
  // Muat ulang senyap: tanpa spinner dan tanpa menghapus tamu yang sedang dipilih.
  const silentRefresh = useCallback(async () => {
    if (!eventId) return;
    try {
      const [g, ev] = await Promise.all([invites.guests(eventId), invites.events()]);
      setGuests(g);
      setEvents(ev);
    } catch { /* abaikan, dicoba lagi di putaran berikutnya */ }
  }, [eventId]);

  // Jawaban RSVP dan check-in baru muncul sendiri tiap 30 detik (berhenti saat sedang mengedit/mengirim atau tab browser tersembunyi).
  useEffect(() => {
    if (!eventId || (tab !== "tamu" && tab !== "checkin") || busy || edit || importing || creating) return;
    const t = setInterval(() => { if (!document.hidden) void silentRefresh(); }, 30000);
    return () => clearInterval(t);
  }, [eventId, tab, busy, edit, importing, creating, silentRefresh]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
   return guests.filter((g) => (!fCat || g.category === fCat) && (!fStatus || g.status === fStatus)
      && (!fRsvp || (fRsvp === "belum" ? !g.rsvp : g.rsvp === fRsvp))
      && (!s || g.name.toLowerCase().includes(s) || g.phone.includes(s)));
  }, [guests, q, fCat, fStatus, fRsvp]);

  const selected = useMemo(() => guests.filter((g) => sel.has(g.id)), [guests, sel]);
  const allShownSelected = shown.length > 0 && shown.every((g) => sel.has(g.id));
  const toggleAll = () => setSel(allShownSelected ? new Set() : new Set(shown.map((g) => g.id)));
  const toggle = (id: number) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const patchGuest = (g: InviteGuest) => setGuests((p) => p.map((x) => (x.id === g.id ? g : x)));

  // ───── Aksi massal ─────
  const generate = async (mode: "ai" | "format") => {
    if (!event || !selected.length) return;
    const overwrite = selected.some((g) => g.description) ? window.confirm("Sebagian tamu sudah punya deskripsi. Timpa dengan yang baru?\n\nOK = timpa, Batal = hanya isi yang kosong.") : false;
    let done = 0, aiFailed = 0;
    try {
      for (const part of chunk(selected.map((g) => g.id), 5)) {
        setBusy(`Menulis deskripsi ${done}/${selected.length}…`);
        const r = await invites.generate(event.id, part, mode, overwrite);
        done += part.length; aiFailed += r.ai_failed;
      }
            toast.success(`Deskripsi dibuat untuk ${selected.length - aiFailed} tamu`);
      if (aiFailed) toast.warning(`${aiFailed} tamu belum terisi karena AI sedang sibuk. Klik "Buat deskripsi" lagi (pilih Batal pada konfirmasi) untuk mengulang yang kosong.`);
    } catch (e) { toast.error(inviteError(e)); }
    setBusy(null); loadGuests();
  };

  const approve = async (ids: number[]) => {
    if (!event || !ids.length) return;
    try { const r = await invites.approve(event.id, ids); toast.success(`${r.approved} tamu disetujui`); } catch (e) { toast.error(inviteError(e)); }
    refresh();
  };

  const sendMany = async (list: InviteGuest[], force = false) => {
    if (!event || !list.length) return;
    if (event.bulk_ready) return sendBulk(list, force); // Fonnte (nomor sendiri) diprioritaskan; Meta hanya cadangan
    if (!event.wa_ready && !window.confirm("WhatsApp Livi belum tersambung ke Meta. Pesan hanya dicatat, tidak benar-benar terkirim. Lanjut?")) return;
    if (!window.confirm(`Kirim undangan ke ${list.length} tamu lewat nomor Livi?`)) return;
    let ok = 0; const fails: string[] = [];
    try {
      for (const part of chunk(list.map((g) => g.id), 10)) {
        setBusy(`Mengirim ${ok + fails.length}/${list.length}…`);
        const res = await invites.send(event.id, part, force);
        res.forEach((r) => (r.ok ? ok++ : fails.push(`${r.name}: ${r.error}`)));
      }
    } catch (e) { toast.error(inviteError(e)); }
    setBusy(null);
    if (ok) toast.success(`${ok} undangan terkirim`);
    if (fails.length) toast.error(`${fails.length} gagal. ${fails.slice(0, 2).join(" | ")}${fails.length > 2 ? " …" : ""}`, { duration: 10000 });
    refresh();
  };
  // Kirim massal lewat nomor WhatsApp admin sendiri (Fonnte). Server yang mengantre & memberi jeda, tab boleh ditutup.
  const sendBulk = async (list: InviteGuest[], force = false) => {
    if (!event || !list.length) return;
    if (!event.bulk_ready) return void toast.error("Kirim massal belum aktif: isi FONNTE_TOKEN di .env server, lalu hubungkan nomor WhatsApp kamu di Fonnte.");
    if (!window.confirm(`Kirim undangan ke ${list.length} tamu sekaligus lewat nomor WhatsApp yang tersambung di Fonnte?\n\nPesan dikirim bergantian dengan jeda acak 8-20 detik, jadi ${list.length} tamu butuh sekitar ${Math.ceil((list.length * 14) / 60)} menit. Tab ini boleh ditutup.`)) return;
    let ok = 0; const fails: string[] = [];
    try {
      for (const part of chunk(list.map((g) => g.id), 50)) {
        setBusy(`Menyerahkan ke antrean ${ok + fails.length}/${list.length}…`);
        const res = await invites.sendBulk(event.id, part, force);
        res.forEach((r) => (r.ok ? ok++ : fails.push(`${r.name}: ${r.error}`)));
      }
    } catch (e) { toast.error(inviteError(e)); }
    setBusy(null);
    if (ok) toast.success(`${ok} undangan masuk antrean kirim. Status akan "Terkirim"; jawaban hadir/tidak masuk otomatis lewat tautan RSVP.`, { duration: 8000 });
    if (fails.length) toast.error(`${fails.length} gagal. ${fails.slice(0, 2).join(" | ")}${fails.length > 2 ? " …" : ""}`, { duration: 10000 });
    refresh();
  };
  const removeMany = async () => {
    if (!event || !selected.length || !window.confirm(`Hapus ${selected.length} tamu terpilih?`)) return;
    try { await invites.deleteGuests(event.id, selected.map((g) => g.id)); toast.success("Tamu dihapus"); } catch (e) { toast.error(inviteError(e)); }
    refresh();
  };

  const pullSheet = async () => {
    if (!event) return;
    setBusy("Menarik data Google Sheet…");
    try {
      const r = await invites.pullSheet(event.id);
      toast.success(`Sheet: ${r.added} baru, ${r.updated} diperbarui, ${r.skipped} dilewati`);
    } catch (e) { toast.error(inviteError(e)); }
    setBusy(null); refresh();
  };

  const uploadMany = async (files: FileList | null) => {
    if (!event || !files?.length) return;
    let matched = 0; const unmatched: string[] = [];
    try {
      for (const part of chunk(Array.from(files), 15)) {
        setBusy(`Mengunggah gambar ${matched + unmatched.length}/${files.length}…`);
        const r = await invites.bulkImages(event.id, part);
        matched += r.matched; unmatched.push(...r.unmatched);
      }
      toast.success(`${matched} gambar dicocokkan ke tamu`);
      if (unmatched.length) toast.warning(`Tidak cocok: ${unmatched.slice(0, 4).join(", ")}${unmatched.length > 4 ? ` (+${unmatched.length - 4})` : ""}`, { duration: 12000 });
    } catch (e) { toast.error(inviteError(e)); }
    setBusy(null); if (bulkImg.current) bulkImg.current.value = ""; loadGuests();
  };

  // ───── Aksi per tamu ─────
  const manual = async (g: InviteGuest) => {
    if (!event) return;
    try {
      const r = await invites.manualLink(event.id, g.id);
      window.open(r.url, "_blank", "noopener");
      if (window.confirm(`Sudah dikirim manual ke ${g.name}? Tandai sebagai terkirim.`)) patchGuest(await invites.markSent(event.id, g.id));
    } catch (e) { toast.error(inviteError(e)); }
  };

  const setRsvp = async (g: InviteGuest, v: string) => {
    if (!event) return;
    try { patchGuest(await invites.updateGuest(event.id, g.id, { rsvp: (v || null) as InviteGuest["rsvp"] })); loadEvents(event.id); } catch (e) { toast.error(inviteError(e)); }
  };

  // ───── Render ─────
  if (events === null) return <Loader2 className="h-5 w-5 animate-spin" />;

  if (!events.length) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Belum ada acara. Isi info dasar di bawah untuk memulai (mis. Soft Opening Livora).</div>
        <InviteSettingsTab event={null} onSaved={(e) => { loadEvents(e.id); setTab("tamu"); }} />
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-6">
        <Header action={<button type="button" className={btn} onClick={() => setCreating(false)}>Batal</button>} />
        <InviteSettingsTab event={null} onSaved={(e) => { setCreating(false); setTab("tamu"); loadEvents(e.id); }} />
      </div>
    );
  }

  const st = event?.stats;
  return (
    <div className="space-y-5">
      <Header action={
        <div className="flex items-center gap-2">
          <select aria-label="Pilih acara" value={eventId ?? ""} onChange={(e) => setEventId(+e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button type="button" onClick={() => setCreating(true)} className={btn}><Plus className="h-4 w-4" /> Acara baru</button>
        </div>
      } />

      {event && !event.wa_ready && !event.bulk_ready && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">WhatsApp Livi (+62 851-9683-9261) belum tersambung ke Meta, jadi kirim otomatis hanya tercatat. Pakai "Kirim manual" atau isi kredensial Meta di server.</div>}

      {st && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Stat label="Total tamu" v={st.total} />
          <Stat label="Siap kirim" v={st.by_status.siap ?? 0} />
          <Stat label="Terkirim" v={(st.by_status.terkirim ?? 0) + (st.by_status.dibalas ?? 0)} />
          <Stat label="Hadir" v={st.rsvp.hadir ?? 0} good />
          <Stat label="Tidak hadir" v={st.rsvp.tidak ?? 0} />
        <Stat label="Sudah datang" v={st.checked_in ?? 0} good />
        </div>
      )}

      <div className="flex gap-1 border-b border-border" role="tablist">
        {([["tamu", "Daftar tamu"], ["checkin", "Check-in"], ["acara", "Pengaturan acara"], ["chat", "Chat AI"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === k ? "border-foreground font-medium" : "border-transparent text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {tab === "acara" && <InviteSettingsTab event={event} onSaved={(e) => loadEvents(e.id)} onDeleted={() => { setEventId(null); loadEvents(); }} />}
      {tab === "chat" && event && <InviteChatTab eventId={event.id} />}
      {tab === "checkin" && event && <InviteCheckInTab event={event} guests={guests} onChanged={silentRefresh} />}
      {tab === "tamu" && event && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btn} onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> Tambah tamu</button>
            <button type="button" className={btn} onClick={() => setImporting(true)}><FileUp className="h-4 w-4" /> Impor Excel/CSV</button>
            <button type="button" className={btn} onClick={pullSheet} disabled={!event.sheet_csv_url || !!busy} title={event.sheet_csv_url ? "" : "Isi tautan Sheet di Pengaturan acara"}><RefreshCw className="h-4 w-4" /> Tarik dari Sheet</button>
            <input ref={bulkImg} type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={(e) => uploadMany(e.target.files)} />
            <button type="button" className={btn} onClick={() => bulkImg.current?.click()} disabled={!!busy} title="Nama file = nama tamu, mis. Budi Santoso.jpg"><Images className="h-4 w-4" /> Unggah gambar massal</button>
            <button type="button" className={btn} onClick={refresh}><RefreshCw className="h-4 w-4" /></button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / nomor…" aria-label="Cari" className={`${inp} max-w-xs`} />
            <select aria-label="Kategori" value={fCat} onChange={(e) => setFCat(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-2 text-sm"><option value="">Semua kategori</option>{Object.entries(CAT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <select aria-label="Status" value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-2 text-sm"><option value="">Semua status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select>
            <select aria-label="Kehadiran" value={fRsvp} onChange={(e) => setFRsvp(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-2 text-sm"><option value="">Semua kehadiran</option><option value="hadir">Hadir</option><option value="tidak">Tidak hadir</option><option value="belum">Belum menjawab</option></select>
            
          </div>

          {(selected.length > 0 || busy) && (
            <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
              {busy ? <span className="inline-flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> {busy}</span> : (
                <>
                  <span className="mr-1 text-sm font-medium">{selected.length} dipilih</span>
                  <button type="button" className={btn} onClick={() => generate("ai")} disabled={!event.ai_ready} title={event.ai_ready ? "" : "GEMINI_API_KEY belum diisi"}><Sparkles className="h-4 w-4" /> Deskripsi AI</button>
                  <button type="button" className={btn} onClick={() => generate("format")}>Isi dari format</button>
                  <button type="button" className={btn} onClick={() => approve(selected.map((g) => g.id))}><CheckCheck className="h-4 w-4" /> Setujui</button>
                  <button type="button" className={`${btn} bg-foreground text-background hover:bg-foreground/90`} onClick={() => sendMany(selected.filter((g) => g.status === "siap" || g.status === "gagal"))}><Send className="h-4 w-4" /> Kirim ({selected.filter((g) => g.status === "siap" || g.status === "gagal").length})</button>
                  <button type="button" className={btn} onClick={() => sendBulk(selected.filter((g) => g.status === "siap" || g.status === "gagal"))} title="Kirim sekaligus lewat nomor WhatsApp sendiri (Fonnte)"><Megaphone className="h-4 w-4" /> Kirim massal ({selected.filter((g) => g.status === "siap" || g.status === "gagal").length})</button>
                  <button type="button" className={`${btn} text-destructive`} onClick={removeMany}><Trash2 className="h-4 w-4" /></button>
                </>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 p-3"><input type="checkbox" aria-label="Pilih semua" checked={allShownSelected} onChange={toggleAll} /></th>
                  <th className="p-3">Tamu</th><th className="p-3">Kategori</th><th className="p-3">Gambar</th><th className="p-3">Deskripsi</th><th className="p-3">Status</th><th className="p-3">Hadir?</th><th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && <tr><td colSpan={8} className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
                {!loading && !shown.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">{guests.length ? "Tidak ada tamu yang cocok." : "Belum ada tamu. Tambah, impor dari Excel, atau tarik dari Google Sheet."}</td></tr>}
                {shown.map((g) => (
                  <tr key={g.id} className={sel.has(g.id) ? "bg-muted/50" : ""}>
                    <td className="p-3"><input type="checkbox" aria-label={`Pilih ${g.name}`} checked={sel.has(g.id)} onChange={() => toggle(g.id)} /></td>
                    <td className="p-3"><p className="font-medium">{g.name}</p><p className="font-mono text-xs text-muted-foreground">+{g.phone}</p></td>
                    <td className="p-3 text-xs">{CAT[g.category]}{g.source === "sheet" && <span className="ml-1 text-muted-foreground">(Sheet)</span>}</td>
                    <td className="p-3">{g.image_url ? <img src={g.image_url} alt="" className={`h-10 w-10 rounded object-cover ${g.image_path ? "" : "opacity-50"}`} title={g.image_path ? "Gambar pribadi" : "Gambar umum"} /> : <span className="text-xs text-muted-foreground">-</span>}</td>
                    <td className="max-w-[220px] p-3"><p className="line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{g.description || "Kosong"}</p></td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[g.status].c}`}>{STATUS[g.status].l}</span>
                      {g.send_channel && <p className="mt-1 text-[11px] text-muted-foreground">{g.send_channel}</p>}
                      {g.status === "gagal" && g.error_note && <p className="mt-1 max-w-[200px] text-[11px] text-destructive">{g.error_note}</p>}
                    </td>
                    <td className="p-3">
                      <select aria-label={`Kehadiran ${g.name}`} value={g.rsvp ?? ""} onChange={(e) => setRsvp(g, e.target.value)} className="h-8 rounded-lg border border-border bg-background px-1 text-xs">
                        <option value="">-</option><option value="hadir">Hadir</option><option value="tidak">Tidak</option>
                      </select>
                    {g.checked_in_at && <p className="mt-1 text-[11px] text-emerald-700">✓ Sudah datang</p>}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" aria-label={`Edit ${g.name}`} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg border border-border" onClick={() => setEdit(g)}><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Kirim manual ke ${g.name}`} title="Kirim manual (wa.me)" className="grid h-8 w-8 place-items-center rounded-lg border border-border" onClick={() => manual(g)}><MessageCircle className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Kirim otomatis ke ${g.name}`} title="Kirim otomatis lewat Livi" disabled={g.status === "draft" || !!busy} className="grid h-8 w-8 place-items-center rounded-lg border border-border disabled:opacity-40" onClick={() => sendMany([g], g.status === "terkirim" || g.status === "dibalas")}><Send className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Menampilkan {shown.length} dari {guests.length} tamu. Alur: isi/buat deskripsi → cek → Setujui → Kirim (otomatis Livi / massal nomor sendiri / manual per tamu). Tombol kirim di baris hanya aktif setelah disetujui. Pesan manual & massal memuat tautan RSVP pribadi; saat tamu menjawab di sana, kolom Hadir? terisi sendiri (klik ↻ untuk memuat ulang).</p>
        </div>
      )}

      {edit && event && <GuestDialog event={event} guest={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
      {importing && event && <ImportDialog event={event} onClose={() => setImporting(false)} onDone={() => { setImporting(false); refresh(); }} />}
    </div>
  );
}

function Header({ action }: { action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Sebar Undangan</h1>
        <p className="text-sm text-muted-foreground">Kirim undangan WhatsApp personal lewat nomor Livi, pantau kehadiran, dan tanya AI.</p>
      </div>
      {action}
    </div>
  );
}

function Stat({ label, v, good }: { label: string; v: number; good?: boolean }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold ${good ? "text-emerald-700" : ""}`}>{v}</p></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-medium">{title}</h2><button type="button" aria-label="Tutup" onClick={onClose}><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  );
}

function GuestDialog({ event, guest, onClose, onSaved }: { event: InviteEvent; guest: InviteGuest | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: guest?.name ?? "", phone: guest?.phone ?? "", category: (guest?.category ?? "pelanggan") as InviteCategory, description: guest?.description ?? "", notes: guest?.notes ?? "" });
  const [cur, setCur] = useState<InviteGuest | null>(guest);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!f.name.trim() || !f.phone.trim()) return toast.error("Nama dan nomor wajib diisi");
    setSaving(true);
    try {
      if (cur) await invites.updateGuest(event.id, cur.id, f); else await invites.createGuest(event.id, f);
      toast.success("Tamu disimpan"); onSaved();
    } catch (e) { toast.error(inviteError(e)); } finally { setSaving(false); }
  };

  const ai = async () => {
    if (!cur) return toast.info("Simpan tamu dulu, lalu buat deskripsi AI.");
    setAiBusy(true);
    try {
      await invites.generate(event.id, [cur.id], "ai", true);
      const fresh = (await invites.guests(event.id)).find((g) => g.id === cur.id);
      if (fresh) { setCur(fresh); setF((p) => ({ ...p, description: fresh.description ?? "" })); }
    } catch (e) { toast.error(inviteError(e)); } finally { setAiBusy(false); }
  };

  const upload = async (file0?: File) => {
    if (!file0 || !cur) return;
    try { setCur(await invites.setGuestImage(event.id, cur.id, file0)); } catch (e) { toast.error(inviteError(e)); }
  };

  return (
    <Modal title={cur ? "Edit tamu" : "Tambah tamu"} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Nama<input className={`${inp} mt-1`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="block">Nomor WhatsApp<input className={`${inp} mt-1`} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="0812xxxxxxx" /></label>
        <label className="block">Kategori
          <select className={`${inp} mt-1`} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as InviteCategory })}>{Object.entries(CAT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
        <div>
          <div className="flex items-center justify-between"><span>Deskripsi pesan</span>
            {cur && <button type="button" disabled={aiBusy || !event.ai_ready} onClick={ai} className="inline-flex items-center gap-1 text-xs underline disabled:opacity-50">{aiBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Buat dengan AI</button>}
          </div>
          <textarea rows={7} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-foreground" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <p className="mt-1 text-xs text-muted-foreground">Maks 1000 karakter. Mengubah deskripsi tamu yang sudah siap akan mengembalikannya ke Draf.</p>
        </div>
        {cur && (
          <div className="flex items-center gap-3">
            {cur.image_url ? <img src={cur.image_url} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">Kosong</div>}
            <div className="space-y-1">
              <input ref={file} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
              <button type="button" className={btn} onClick={() => file.current?.click()}><ImagePlus className="h-4 w-4" /> {cur.image_path ? "Ganti gambar" : "Unggah gambar pribadi"}</button>
              {cur.image_path && <button type="button" className="block text-xs text-destructive" onClick={async () => setCur(await invites.removeGuestImage(event.id, cur.id))}>Hapus gambar pribadi</button>}
              {!cur.image_path && <p className="text-xs text-muted-foreground">Tanpa gambar pribadi, dipakai gambar umum acara.</p>}
            </div>
          </div>
        )}
        <label className="block">Catatan internal<input className={`${inp} mt-1`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onClose} className="h-10 flex-1 rounded-lg border border-border text-sm">Batal</button>
        <button type="button" disabled={saving} onClick={save} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-foreground text-sm text-background">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan</button>
      </div>
    </Modal>
  );
}

function ImportDialog({ event, onClose, onDone }: { event: InviteEvent; onClose: () => void; onDone: () => void }) {
  const [raw, setRaw] = useState("");
  const [cat, setCat] = useState<InviteCategory>("pelanggan");
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => parseRows(raw), [raw]);
  const file = useRef<HTMLInputElement>(null);

  const readFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setRaw(String(r.result ?? ""));
    r.readAsText(f);
  };

  const submit = async () => {
    if (!rows.length) return;
    setBusy(true);
    let added = 0, skipped = 0; const errors: string[] = [];
    try {
      for (const part of chunk(rows, 300)) {
        const r = await invites.importGuests(event.id, part, cat);
        added += r.added; skipped += r.skipped; errors.push(...r.errors);
      }
      toast.success(`${added} tamu ditambahkan${skipped ? `, ${skipped} dilewati` : ""}`);
      if (errors.length) toast.info(errors.slice(0, 3).join(" | "), { duration: 10000 });
      onDone();
    } catch (e) { toast.error(inviteError(e)); } finally { setBusy(false); }
  };

  return (
    <Modal title="Impor tamu" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">Salin kolom dari Excel (nama, nomor, kategori opsional) lalu tempel di bawah, atau pilih file .csv. Urutan kolom bebas; nomor dikenali otomatis. Baris judul dilewati.</p>
        <textarea rows={8} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"Budi Santoso\t0812xxxxxxx\trekanan\nSiti Aminah\t0857xxxxxxx"} aria-label="Data tamu" className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus:border-foreground" />
        <div className="flex flex-wrap items-center gap-3">
          <input ref={file} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
          <button type="button" className={btn} onClick={() => file.current?.click()}><Upload className="h-4 w-4" /> Pilih file CSV</button>
          <label className="flex items-center gap-2">Kategori bawaan
            <select value={cat} onChange={(e) => setCat(e.target.value as InviteCategory)} className="h-9 rounded-lg border border-border bg-background px-2">{Object.entries(CAT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
        </div>
        <p className="text-xs">{rows.length ? <b>{rows.length} baris terbaca</b> : "Belum ada baris valid."}</p>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onClose} className="h-10 flex-1 rounded-lg border border-border text-sm">Batal</button>
        <button type="button" disabled={!rows.length || busy} onClick={submit} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-foreground text-sm text-background disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Impor {rows.length || ""}</button>
      </div>
    </Modal>
  );
}