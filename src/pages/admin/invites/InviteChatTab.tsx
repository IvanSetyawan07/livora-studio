import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { invites, inviteError, type InviteChatMessage } from "@/lib/invites";

const SUGGESTIONS = [
  "Berapa yang sudah konfirmasi hadir?",
  "Siapa rekanan yang belum dikirimi?",
  "Siapa saja yang gagal terkirim dan kenapa?",
  "Buatkan pesan pengingat H-1",
];

/** Chat AI khusus admin: menjawab dari seluruh data tamu & acara. */
export default function InviteChatTab({ eventId }: { eventId: number }) {
  const [msgs, setMsgs] = useState<InviteChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(() => { invites.chatHistory(eventId).then(setMsgs).catch(() => {}); }, [eventId]);
  useEffect(() => { setMsgs([]); load(); }, [load]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const ask = async (q: string) => {
    const message = q.trim();
    if (!message || busy) return;
    setText("");
    setMsgs((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const r = await invites.chat(eventId, message);
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e) {
      toast.error(inviteError(e));
      setMsgs((m) => m.slice(0, -1));
      setText(message);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!window.confirm("Hapus riwayat chat AI untuk acara ini?")) return;
    await invites.clearChat(eventId).catch(() => {});
    setMsgs([]);
  };

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium"><Bot className="h-4 w-4" /> Asisten undangan</p>
        {msgs.length > 0 && <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /> Hapus riwayat</button>}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Tanyakan apa saja soal data tamu & undangan. Jawaban dihitung dari data terbaru.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={m.id ?? `t${i}`} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-foreground text-background" : "bg-muted"}`}>{m.content}</div>
          </div>
        ))}
        {busy && <div className="flex justify-start"><div className="rounded-2xl bg-muted px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex gap-2 border-t border-border p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis pertanyaan…" aria-label="Pertanyaan" className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Kirim" className="grid h-10 w-10 place-items-center rounded-lg bg-foreground text-background disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}