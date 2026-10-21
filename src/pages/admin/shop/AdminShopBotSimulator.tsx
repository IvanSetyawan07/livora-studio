import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send, Image as ImageIcon, MapPin } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Simulator WhatsApp — menjalankan mesin bot Livi sungguhan terhadap nomor uji.
 * Panel samping menampilkan state, mode, intent terakhir, tool call, dan konteks AI.
 */
type Msg = { id: number; direction: "in" | "out"; type: string; body: string | null; payload?: any; created_at: string };
type ConvState = { state: string; mode: string; last_intent: string | null; collected: Record<string, any> | null; fail_count: number } | null;

export default function AdminShopBotSimulator() {
  const [phone, setPhone] = useState("8120000001");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conv, setConv] = useState<ConvState>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const r = await api.get("/admin/shop/bot/conversation", { params: { phone } });
    setMessages(r.data.messages ?? []);
    setConv(r.data.conversation);
  };
  useEffect(() => { load().catch(() => {}); }, [phone]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text: string, type = "text") => {
    if (busy || (!text.trim() && type === "text")) return;
    setBusy(true);
    setMessages((m) => [...m, { id: Date.now(), direction: "in", type, body: text, created_at: new Date().toISOString() }]);
    setInput("");
    try {
      const r = await api.post("/admin/shop/bot/chat", { phone, text, type });
      setLastResult(r.data);
      setConv(r.data.conversation);
      const replies = (r.data.replies ?? []).map((rep: any, i: number) => ({
        id: Date.now() + i + 1, direction: "out" as const, type: rep.type ?? "text",
        body: rep.body ?? "", payload: rep, created_at: new Date().toISOString(),
      }));
      setMessages((m) => [...m, ...replies]);
    } catch {
      setMessages((m) => [...m, { id: Date.now() + 9, direction: "out", type: "text", body: "(simulator gagal — cek log server)", created_at: new Date().toISOString() }]);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    await api.post("/admin/shop/bot/reset", { phone });
    setMessages([]);
    setConv(null);
    setLastResult(null);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Panel chat ala WhatsApp */}
      <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Simulator WhatsApp</p>
            <p className="text-xs text-muted-foreground">Customer uji: +62{phone.replace(/^62/, "")}</p>
          </div>
          <div className="flex items-center gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} aria-label="Nomor customer uji"
              className="h-9 w-36 rounded-full border border-border bg-background px-3 text-xs outline-none" placeholder="Nomor uji" />
            <button type="button" onClick={reset} className="flex h-9 items-center gap-1 rounded-full border border-border px-3 text-xs hover:bg-muted">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto bg-[#ece5dd] p-4">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[75%] rounded-xl px-3 py-2 text-sm shadow-sm ${m.direction === "in" ? "ml-auto bg-[#d9fdd3]" : "bg-white"}`}>
              <p className="whitespace-pre-wrap">{m.body}</p>
              {m.payload?.buttons && (
                <div className="mt-2 space-y-1 border-t border-black/10 pt-2">
                  {m.payload.buttons.map((b: any) => (
                    <button key={b.id} type="button" onClick={() => send(b.title)}
                      className="block w-full rounded-lg py-1 text-center text-xs font-medium text-sky-700 hover:bg-sky-50">{b.title}</button>
                  ))}
                </div>
              )}
              {m.payload?.rows && (
                <div className="mt-2 space-y-1 border-t border-black/10 pt-2">
                  {m.payload.rows.map((r: any) => (
                    <button key={r.id} type="button" onClick={() => send(r.title)}
                      className="block w-full rounded-lg py-1 text-left text-xs text-sky-700 hover:bg-sky-50">
                      <span className="font-medium">{r.title}</span>{r.description ? ` — ${r.description}` : ""}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1 text-right text-[10px] text-black/40">{new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <footer className="flex items-center gap-2 border-t border-border p-3">
          <button type="button" onClick={() => send("[gambar uji]", "image")} title="Kirim foto (uji bukti transfer)" className="rounded-full p-2 hover:bg-muted"><ImageIcon className="h-4 w-4" /></button>
          <button type="button" onClick={() => send("-6.2,106.8", "location")} title="Kirim lokasi palsu" className="rounded-full p-2 hover:bg-muted"><MapPin className="h-4 w-4" /></button>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ketik pesan sebagai customer…" aria-label="Pesan uji"
            className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground" />
          <button type="button" onClick={() => send(input)} disabled={busy} aria-label="Kirim"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </footer>
      </div>

      {/* Panel samping: state & konteks AI langsung */}
      <aside className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto lg:flex">
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">State percakapan</p>
          {conv ? (
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">State</dt><dd className="font-mono">{conv.state}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Mode</dt><dd className="font-mono">{conv.mode}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Gagal paham</dt><dd>{conv.fail_count}×</dd></div>
            </dl>
          ) : <p className="mt-2 text-xs text-muted-foreground">Belum ada percakapan.</p>}
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data terkumpul</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{conv?.collected ? JSON.stringify(conv.collected, null, 2) : "—"}</pre>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Giliran terakhir</p>
          {lastResult ? (
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Intent</dt><dd className="font-mono">{lastResult.intent}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Flag</dt><dd className="font-mono">{lastResult.flag}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Latensi</dt><dd>{lastResult.latency_ms} ms</dd></div>
            </dl>
          ) : <p className="mt-2 text-xs text-muted-foreground">—</p>}
          {!!lastResult?.tools?.length && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tool call</p>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(lastResult.tools, null, 2)}</pre>
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
