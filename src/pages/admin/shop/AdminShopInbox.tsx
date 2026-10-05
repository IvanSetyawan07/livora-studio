import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Loader2, Lock, Send, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { adminShop } from "@/lib/shop";

const STATUS: Record<string, { l: string; c: string }> = {
  menunggu_cs: { l: "Menunggu tim", c: "bg-amber-100 text-amber-900" },
  aktif: { l: "Ditangani", c: "bg-emerald-100 text-emerald-900" },
  bot: { l: "Bot", c: "bg-muted text-muted-foreground" },
  selesai: { l: "Selesai", c: "bg-muted text-muted-foreground" },
};
const QUICK = [
  "Terima kasih sudah menunggu. Saya bantu cek dulu ya.",
  "Boleh dikirim foto ruangannya agar kami bisa menyarankan ukuran yang pas?",
  "Penawaran sudah kami kirim, silakan cek di halaman Pesanan Saya.",
  "Pembayaran sudah kami terima. Pesanan sedang diproses.",
];

/** Inbox handoff WhatsApp: ambil/serahkan sesi, balas, catatan internal, jendela 24 jam. */
export default function AdminShopInbox() {
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [filter, setFilter] = useState("menunggu_cs,aktif");
  const [sel, setSel] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [note, setNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(() => adminShop.inbox(filter || undefined).then(setSessions).catch((e) => { toast.error(e.message); setSessions([]); }), [filter]);
  const loadMsgs = useCallback((id: number) => adminShop.inboxMessages(id).then((m) => { setMsgs(m); setTimeout(() => endRef.current?.scrollIntoView(), 50); }), []);

  useEffect(() => { loadSessions(); const t = setInterval(loadSessions, 15000); return () => clearInterval(t); }, [loadSessions]);
  useEffect(() => { if (!sel) return; loadMsgs(sel.id); const t = setInterval(() => loadMsgs(sel.id), 8000); return () => clearInterval(t); }, [sel, loadMsgs]);

  const action = async (a: string) => {
    try { await adminShop.inboxAction(sel.id, a); toast.success("Sesi diperbarui"); await loadSessions(); setSel((s: any) => ({ ...s, status: a === "ambil" ? "aktif" : a === "serahkan" ? "menunggu_cs" : "selesai" })); }
    catch (e: any) { toast.error(e.message); }
  };
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await adminShop.inboxReply(sel.id, text, note);
      if (r.ok === false) toast.error("Pesan gagal terkirim. Cek menu Kesehatan sistem.");
      setText(""); await loadMsgs(sel.id);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const windowOpen = sel && sel.window_left_minutes > 0;

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Inbox WhatsApp</h1><p className="text-sm text-muted-foreground">Chat yang diserahkan bot ke tim. Bot diam selama sesi ditangani, dan aktif lagi setelah sesi ditutup.</p></div>
      <div className="flex flex-wrap gap-1">
        {[["menunggu_cs,aktif", "Perlu dibalas"], ["bot", "Ditangani bot"], ["selesai", "Selesai"], ["", "Semua"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setFilter(v)} className={`h-9 rounded-full px-4 text-sm ${filter === v ? "bg-foreground text-background" : "border border-border"}`}>{l}</button>
        ))}
      </div>
      <div className="grid h-[calc(100dvh-240px)] min-h-[480px] overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[320px_1fr]">
        <ul className={`overflow-y-auto border-r border-border ${sel ? "hidden md:block" : ""}`}>
          {sessions === null ? <li className="p-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></li>
            : sessions.length === 0 ? <li className="p-6 text-center text-sm text-muted-foreground">Tidak ada chat.</li>
            : sessions.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => setSel(s)} className={`w-full border-b border-border p-3 text-left hover:bg-muted/50 ${sel?.id === s.id ? "bg-muted" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{s.customer_name || `+${s.phone}`}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS[s.status]?.c}`}>{STATUS[s.status]?.l}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.last_message}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{s.order_code ?? "tanpa pesanan"}{s.trigger ? ` · pemicu: ${s.trigger}` : ""}{s.assignee ? ` · ${s.assignee}` : ""}</p>
                </button>
              </li>
            ))}
        </ul>
        {sel ? (
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <button type="button" className="text-sm md:hidden" onClick={() => setSel(null)}>← Kembali</button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{sel.customer_name || `+${sel.phone}`}</p>
                <p className="text-xs text-muted-foreground">+{sel.phone} {sel.order_code && <>· <Link to={`/admin/shop/orders/${sel.order_code}`} className="underline">{sel.order_code}</Link></>}
                  {" · "}{windowOpen ? `jendela 24 jam: sisa ${Math.floor(sel.window_left_minutes / 60)}j ${sel.window_left_minutes % 60}m` : "jendela 24 jam tertutup"}</p>
              </div>
              {sel.status !== "aktif" && <button type="button" onClick={() => action("ambil")} className="h-9 rounded-lg bg-foreground px-3 text-sm text-background">Ambil sesi</button>}
              {sel.status === "aktif" && <button type="button" onClick={() => action("serahkan")} className="h-9 rounded-lg border border-border px-3 text-sm">Serahkan</button>}
              {sel.status !== "selesai" && <button type="button" onClick={() => action("tutup")} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm"><Bot className="h-4 w-4" /> Tutup & kembalikan ke bot</button>}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "in" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.is_note ? "border border-dashed border-amber-400 bg-amber-50 text-amber-900" : m.direction === "in" ? "bg-card" : "bg-foreground text-background"}`}>
                    {m.is_note && <p className="mb-1 flex items-center gap-1 text-[10px] font-medium"><StickyNote className="h-3 w-3" /> Catatan internal</p>}
                    {m.body}
                    <p className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleString("id-ID", { timeStyle: "short", dateStyle: "short" })}{m.sender ? ` · ${m.sender}` : m.direction === "out" && !m.is_note ? " · bot" : ""}{m.status === "failed" ? " · gagal" : ""}</p>
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
