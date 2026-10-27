import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bot, Loader2, Lock, Send, StickyNote, UserRound } from "lucide-react";
import { toast } from "sonner";
import { adminShop } from "@/lib/shop";
import PriceInquiryPanel from "@/components/shop/PriceInquiryPanel";

const MODE: Record<string, { l: string; c: string }> = {
  menunggu_admin: { l: "Menunggu tim", c: "bg-amber-100 text-amber-900" },
  dipegang_admin: { l: "Ditangani", c: "bg-emerald-100 text-emerald-900" },
  bot: { l: "Bot", c: "bg-muted text-muted-foreground" },
};
const STATE: Record<string, string> = {
  sapaan: "Baru menyapa", menu: "Memilih menu", tanya_jawab: "Tanya jawab", kumpul_data: "Mengisi data",
  konfirmasi_data: "Konfirmasi data", pilih_kirim: "Memilih metode kirim", menunggu_penawaran: "Menunggu penawaran",
  cek_harga: "Menunggu harga dari tim", setelah_harga: "Setelah info harga",
};
const REASON: Record<string, string> = {
  tim: "minta tim", admin: "minta admin", nego: "nego", komplain: "komplain", keluhan: "keluhan", rusak: "barang rusak",
  custom: "minta custom", gagal_paham: "bot gagal paham", ai_eskalasi: "di luar jawaban bot", dokumen_masuk: "kirim dokumen",
  foto_masuk: "kirim foto", gambar_gagal_dibaca: "gambar gagal dibuka", minta_tim_saat_data: "minta tim saat isi data", buat_pesanan_gagal: "pesanan gagal dibuat",
};
const QUICK = [
  "Terima kasih sudah menunggu Bapak/Ibu. Saya bantu cek dulu ya.",
  "Boleh dikirim foto ruangannya agar kami bisa menyarankan ukuran yang pas?",
  "Baik Bapak/Ibu, harganya kami hitungkan dulu, nanti penawaran resmi kami kirim di chat ini.",
  "Pembayaran sudah kami terima. Pesanan sedang diproses.",
];

export default function AdminShopInbox() {
  const [sp, setSp] = useSearchParams();
  const wantedId = Number(sp.get("c")) || null; // tautan notifikasi N1/N16: /admin/shop/inbox?c=<id>
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [filter, setFilter] = useState(wantedId ? "" : "menunggu_admin,dipegang_admin");
  const [selId, setSelId] = useState<number | null>(wantedId);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [note, setNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sel = sessions?.find((s) => s.id === selId) ?? null;

  const loadSessions = useCallback(
    () => adminShop.inbox(filter || undefined).then(setSessions).catch((e) => { toast.error(e.message); setSessions([]); }),
    [filter],
  );
  const loadMsgs = useCallback(
    (id: number) => adminShop.inboxMessages(id).then((m) => { setMsgs(m); setTimeout(() => endRef.current?.scrollIntoView(), 50); }).catch(() => {}),
    [],
  );

  useEffect(() => { loadSessions(); const t = setInterval(loadSessions, 15000); return () => clearInterval(t); }, [loadSessions]);
  useEffect(() => {
    if (!selId) { setMsgs([]); return; }
    loadMsgs(selId);
    const t = setInterval(() => loadMsgs(selId), 8000);
    return () => clearInterval(t);
  }, [selId, loadMsgs]);

  const pick = (id: number | null) => {
    setSelId(id);
    const n = new URLSearchParams(sp);
    id ? n.set("c", String(id)) : n.delete("c");
    setSp(n, { replace: true });
  };

  const action = async (a: "ambil" | "serahkan" | "tutup") => {
    if (!sel) return;
    try {
      await adminShop.inboxAction(sel.id, a);
      toast.success(a === "ambil" ? "Chat kamu ambil. Bot diam." : a === "serahkan" ? "Chat dikembalikan ke antrean tim." : "Chat dikembalikan ke bot.");
      await loadSessions();
    } catch (e: any) { toast.error(e.message); }
  };
  const send = async () => {
    if (!sel || !text.trim()) return;
    setBusy(true);
    try {
      const r = await adminShop.inboxReply(sel.id, text, note);
      if (r.ok === false) toast.error("Pesan gagal terkirim. Cek menu Kesehatan sistem.");
      setText("");
      await Promise.all([loadMsgs(sel.id), loadSessions()]);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const windowOpen = !!sel && sel.window_left_minutes > 0;
  const c = sel?.collected_data ?? {};

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Inbox WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Semua chat pelanggan dengan bot Livi. Bot diam selama chat dipegang tim, dan aktif lagi setelah chat dikembalikan ke bot.</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {[["menunggu_admin,dipegang_admin", "Perlu dibalas"], ["bot", "Ditangani bot"], ["", "Semua"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setFilter(v)} className={`h-9 rounded-full px-4 text-sm ${filter === v ? "bg-foreground text-background" : "border border-border"}`}>{l}</button>
        ))}
      </div>
      <div className="grid h-[calc(100dvh-240px)] min-h-[480px] overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[340px_1fr]">
        <ul className={`overflow-y-auto border-r border-border ${selId ? "hidden md:block" : ""}`}>
          {sessions === null ? <li className="p-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></li>
            : sessions.length === 0 ? <li className="p-6 text-center text-sm text-muted-foreground">Tidak ada chat.</li>
            : sessions.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => pick(s.id)} className={`w-full border-b border-border p-3 text-left hover:bg-muted/50 ${selId === s.id ? "bg-muted" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{s.display_name}</span>
                    {s.price_pending && <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-900">Cek harga</span>}
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${MODE[s.mode]?.c}`}>{MODE[s.mode]?.l ?? s.mode}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.last_message}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {s.identified ? `+${s.phone} · ` : ""}{s.order_code ?? s.cart_code ?? "belum ada pesanan"}
                    {s.mode === "menunggu_admin" && s.handoff_reason ? ` · pemicu: ${REASON[s.handoff_reason] ?? s.handoff_reason}` : ""}
                    {s.assignee ? ` · dipegang ${s.assignee}` : ""}
                  </p>
                </button>
              </li>
            ))}
        </ul>
        {sel ? (
          <div className="flex min-h-0 flex-col">
            <div className="space-y-2 border-b border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="text-sm md:hidden" onClick={() => pick(null)}>← Kembali</button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{sel.display_name} <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${MODE[sel.mode]?.c}`}>{MODE[sel.mode]?.l}</span></p>
                  <p className="text-xs text-muted-foreground">
                    +{sel.phone}{sel.wa_name && sel.wa_name !== sel.display_name ? ` · profil WA: ${sel.wa_name}` : ""}
                    {" · "}{windowOpen ? `jendela 24 jam: sisa ${Math.floor(sel.window_left_minutes / 60)}j ${sel.window_left_minutes % 60}m` : "jendela 24 jam tertutup"}
                  </p>
                </div>
                {sel.mode !== "dipegang_admin" && <button type="button" onClick={() => action("ambil")} className="h-9 rounded-lg bg-foreground px-3 text-sm text-background">Ambil chat</button>}
                {sel.mode === "dipegang_admin" && <button type="button" onClick={() => action("serahkan")} className="h-9 rounded-lg border border-border px-3 text-sm">Serahkan ke tim</button>}
                {sel.mode !== "bot" && <button type="button" onClick={() => action("tutup")} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm"><Bot className="h-4 w-4" /> Kembalikan ke bot</button>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" /> {sel.assignee ? `Dipegang: ${sel.assignee}` : sel.mode === "bot" ? "Dipegang: bot Livi" : "Belum ada yang memegang"}</span>
                <span>Tahap bot: {STATE[sel.state] ?? sel.state}</span>
                {sel.handoff_reason && <span>Pemicu: {REASON[sel.handoff_reason] ?? sel.handoff_reason}</span>}
                {sel.cart_code && <span>Keranjang: <span className="font-mono">{sel.cart_code}</span></span>}
                {sel.order_code && <span>Pesanan: <Link to={`/admin/shop/orders/${sel.order_code}`} className="font-mono underline">{sel.order_code}</Link></span>}
                {c.city && <span>Kota: {c.city}</span>}
                {c.address && <span className="truncate">Alamat: {c.address}</span>}
                {c.pin_location && <a href={c.pin_location} target="_blank" rel="noopener noreferrer" className="underline">Pin lokasi</a>}
              </div>
            </div>
            <PriceInquiryPanel conversationId={sel.id} windowOpen={windowOpen} onSent={() => { loadMsgs(sel.id); loadSessions(); }} />
            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "in" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.is_note ? "border border-dashed border-amber-400 bg-amber-50 text-amber-900" : m.direction === "in" ? "bg-card" : "bg-foreground text-background"}`}>
                    {m.is_note && <p className="mb-1 flex items-center gap-1 text-[10px] font-medium"><StickyNote className="h-3 w-3" /> Catatan internal</p>}
                    {m.body}
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(m.created_at).toLocaleString("id-ID", { timeStyle: "short", dateStyle: "short" })}
                      {m.direction === "in" ? ` · ${sel.display_name}` : m.sender ? ` · ${m.sender}` : !m.is_note ? " · bot Livi / sistem" : ""}
                      {m.status === "failed" ? " · gagal terkirim" : ""}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="border-t border-border p-3">
              <div className="mb-2 flex gap-1 overflow-x-auto">
                {QUICK.map((q) => <button key={q} type="button" onClick={() => setText(q)} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs">{q.slice(0, 32)}…</button>)}
              </div>
              {!windowOpen && !note && <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Lewat 24 jam: WhatsApp hanya mengizinkan pesan template. Minta pelanggan mengirim pesan dulu, atau tulis catatan internal.</p>}
              {sel.mode === "bot" && !note && <p className="mb-2 text-xs text-muted-foreground">Chat ini masih ditangani bot. Mengirim balasan akan otomatis mengambil chat dan membuat bot diam.</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setNote(!note)} aria-pressed={note} title="Catatan internal" className={`h-11 w-11 shrink-0 rounded-lg border ${note ? "border-amber-400 bg-amber-50" : "border-border"}`}><StickyNote className="mx-auto h-4 w-4" /></button>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder={note ? "Catatan internal (tidak terkirim ke pelanggan)" : "Tulis balasan…"} aria-label="Balasan"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  className="min-h-11 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                <button type="button" disabled={busy || !text.trim() || (!windowOpen && !note)} onClick={send} aria-label="Kirim" className="h-11 w-11 shrink-0 rounded-lg bg-foreground text-background disabled:opacity-40">{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <Send className="mx-auto h-4 w-4" />}</button>
              </div>
            </div>
          </div>
        ) : <div className="hidden items-center justify-center text-sm text-muted-foreground md:flex">Pilih chat di sebelah kiri.</div>}
      </div>
    </div>
  );
}