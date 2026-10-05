import { useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { adminShop } from "@/lib/shop";

type Msg = { from: "user" | "bot"; text: string };

/** Uji balasan bot dengan aturan & teks template yang sedang aktif. Tidak mengirim WA dan tidak mengubah pesanan. */
export default function AdminShopBotSimulator() {
  const [phone, setPhone] = useState("6281200000000");
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [session, setSession] = useState("bot");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const send = async (t = text) => {
    if (!t.trim()) return;
    setMsgs((m) => [...m, { from: "user", text: t }]);
    setText("");
    setBusy(true);
    try {
      const r = await adminShop.simulate(phone, t);
      setSession(r.session);
      setMsgs((m) => [...m, ...(r.replies.length ? r.replies.map((x) => ({ from: "bot" as const, text: x })) : [{ from: "bot" as const, text: r.flow ? "[Form WhatsApp Flow dikirim]" : "(bot diam — sesi dipegang tim)" }])]);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); setTimeout(() => end.current?.scrollIntoView(), 50); }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div><h1 className="text-2xl font-semibold">Simulator bot</h1><p className="text-sm text-muted-foreground">Coba percakapan memakai aturan dan teks template yang aktif. Tidak ada pesan yang benar-benar terkirim.</p></div>
      <label className="block text-sm"><span className="text-muted-foreground">Nomor pengirim (pakai nomor pelanggan untuk menguji pesanan nyata)</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm" aria-label="Nomor pengirim" /></label>
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-sm text-white"><span>Livora (asisten AI)</span><span className="text-xs opacity-80">sesi: {session}</span></div>
        <div className="h-[420px] space-y-2 overflow-y-auto bg-[#efeae2] p-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <p className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow-sm ${m.from === "user" ? "bg-[#d9fdd3] text-neutral-900" : "bg-white text-neutral-900"}`}>{m.text}</p>
            </div>
          ))}
          {busy && <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />}
          <div ref={end} />
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-border p-2">
          {["Halo", "LVR-AB12CD", "STATUS", "Berapa lama produksi sofa custom?", "Bisa nego?", "TIM"].map((q) => <button key={q} type="button" onClick={() => send(q)} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs">{q}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-border p-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ketik pesan…" aria-label="Pesan" className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm" />
          <button type="submit" disabled={busy} aria-label="Kirim" className="h-10 w-10 rounded-full bg-emerald-700 text-white"><Send className="mx-auto h-4 w-4" /></button>
        </form>
      </div>
      <button type="button" onClick={() => { setMsgs([]); setSession("bot"); }} className="text-sm text-muted-foreground underline">Mulai ulang</button>
    </div>
  );
}
