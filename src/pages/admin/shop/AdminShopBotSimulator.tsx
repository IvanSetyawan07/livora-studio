import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send, Image as ImageIcon, MapPin, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader, useAdminDialog } from "@/components/admin/kit";

type Msg = {
  id: number;
  direction: "in" | "out";
  type: string;
  body: string | null;
  payload?: any;
  created_at: string;
};
type ConvState = {
  state: string;
  mode: string;
  last_intent: string | null;
  collected: Record<string, any> | null;
  fail_count: number;
} | null;

const QUICK_TESTS = [
  "Halo, mau cari sofa untuk ruang tamu",
  "Berapa harga meja makan kayu jati?",
  "Saya mau tanya custom ukuran lemari",
  "Boleh bicara dengan admin CS?",
];

/**
 * Simulator WhatsApp — menjalankan mesin bot Livi dalam mode sandbox
 * sehingga tidak mengirim pesan WA nyata dan tidak mencemari data produksi.
 */
export default function AdminShopBotSimulator() {
  const dialog = useAdminDialog();
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

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string, type = "text") => {
    if (busy || (!text.trim() && type === "text")) return;
    setBusy(true);
    setMessages((m) => [
      ...m,
      { id: Date.now(), direction: "in", type, body: text, created_at: new Date().toISOString() },
    ]);
    setInput("");
    try {
      const r = await api.post("/admin/shop/bot/chat", { phone, text, type });
      setLastResult(r.data);
      setConv(r.data.conversation);
      const replies = (r.data.replies ?? []).map((rep: any, i: number) => ({
        id: Date.now() + i + 1,
        direction: "out" as const,
        type: rep.type ?? "text",
        body: rep.body ?? "",
        payload: rep,
        created_at: new Date().toISOString(),
      }));
      setMessages((m) => [...m, ...replies]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 9,
          direction: "out",
          type: "text",
          body: "(Simulator gagal merespons — silakan coba ulang atau cek Kesehatan Sistem)",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    const ok = await dialog.confirm({
      title: "Mulai Ulang Percakapan Simulasi?",
      description: "Seluruh riwayat chat latihan untuk nomor uji ini akan dibersihkan.",
      confirmText: "Ya, Reset Simulasi",
      cancelText: "Batal",
    });
    if (!ok) return;
    await api.post("/admin/shop/bot/reset", { phone });
    setMessages([]);
    setConv(null);
    setLastResult(null);
    toast.success("Percakapan simulasi direset.");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Uji Coba Bot Livi"
        title="Simulator WhatsApp"
        description="Uji langsung jawaban Bot Livi layaknya pelanggan sungguhan sebelum mengubah pengaturan atau promo."
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-xs text-amber-950">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <span>
          <b>Mode Latihan (Sandbox)</b> — Semua pesan di halaman ini <b>tidak mengirim WhatsApp sungguhan</b> dan <b>tidak membuat pesanan nyata</b>. Aman untuk dicoba kapan saja.
        </span>
      </div>

      <div className="flex h-[calc(100dvh-290px)] min-h-[500px] gap-4">
        {/* Panel chat ala WhatsApp */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE4DA] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#232528]">Simulasi Pelanggan Uji</p>
              <p className="text-xs text-[#656B73]">Nomor uji: +62{phone.replace(/^62/, "")}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                aria-label="Nomor customer uji"
                className="h-9 w-36 rounded-full border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-xs text-[#232528] outline-none focus:border-[#5E93B8]"
                placeholder="Nomor uji"
              />
              <button
                type="button"
                onClick={reset}
                className="flex h-9 items-center gap-1.5 rounded-full border border-[#EAE4DA] bg-white px-3 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </header>

          {/* Tombol contoh cepat */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-[#EAE4DA] bg-[#FAF8F4] px-3 py-2">
            {QUICK_TESTS.map((sample) => (
              <button
                key={sample}
                type="button"
                disabled={busy}
                onClick={() => send(sample)}
                className="shrink-0 rounded-full border border-[#EAE4DA] bg-white px-3 py-1 text-[11px] text-[#232528] hover:border-[#5E93B8] hover:bg-[#EDF4F8]"
              >
                {sample}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto bg-[#EFEAE2] p-4">
            {messages.length === 0 && (
              <p className="py-12 text-center text-xs text-[#4C5259]">
                Klik salah satu contoh pertanyaan di atas atau ketik pesan di bawah untuk mulai menguji Livi.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[78%] rounded-xl px-3.5 py-2 text-sm text-[#232528] shadow-xs ${
                  m.direction === "in" ? "ml-auto bg-[#D9FDD3]" : "bg-white"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                {m.payload?.buttons && (
                  <div className="mt-2 space-y-1 border-t border-black/10 pt-2">
                    {m.payload.buttons.map((b: any) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => send(b.title)}
                        className="block w-full rounded-lg py-1 text-center text-xs font-medium text-[#35678B] hover:bg-[#EDF4F8]"
                      >
                        {b.title}
                      </button>
                    ))}
                  </div>
                )}
                {m.payload?.rows && (
                  <div className="mt-2 space-y-1 border-t border-black/10 pt-2">
                    {m.payload.rows.map((r: any) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => send(r.title)}
                        className="block w-full rounded-lg px-2 py-1 text-left text-xs text-[#35678B] hover:bg-[#EDF4F8]"
                      >
                        <span className="font-medium">{r.title}</span>
                        {r.description ? ` — ${r.description}` : ""}
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-right text-[10px] text-[#656B73]">
                  {new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <footer className="flex items-center gap-2 border-t border-[#EAE4DA] bg-white p-3">
            <button
              type="button"
              onClick={() => send("[gambar uji]", "image")}
              title="Simulasikan kirim foto (uji bukti transfer)"
              className="rounded-full p-2 text-[#656B73] hover:bg-[#FAF8F4] hover:text-[#232528]"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => send("-6.2,106.8", "location")}
              title="Simulasikan kirim titik lokasi"
              className="rounded-full p-2 text-[#656B73] hover:bg-[#FAF8F4] hover:text-[#232528]"
            >
              <MapPin className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ketik pesan sebagai pelanggan uji…"
              aria-label="Pesan uji"
              className="h-10 min-w-0 flex-1 rounded-full border border-[#EAE4DA] bg-[#FAF8F4] px-4 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={busy}
              aria-label="Kirim"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#232528] text-white disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </footer>
        </div>

        {/* Panel samping: status & detail teknis AI */}
        <aside className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto lg:flex">
          <section className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5E93B8]">Status Percakapan</p>
            {conv ? (
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-[#656B73]">Tahap</dt>
                  <dd className="font-mono font-medium text-[#232528]">{conv.state}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#656B73]">Mode</dt>
                  <dd className="font-mono font-medium text-[#232528]">{conv.mode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#656B73]">Gagal paham</dt>
                  <dd className="font-medium text-[#232528]">{conv.fail_count}×</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-[#656B73]">Belum ada percakapan.</p>
            )}
          </section>

          <section className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5E93B8]">Respons Terakhir</p>
            {lastResult ? (
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-[#656B73]">Maksud (Intent)</dt>
                  <dd className="font-mono text-[#232528]">{lastResult.intent || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#656B73]">Status</dt>
                  <dd className="font-mono text-[#232528]">{lastResult.flag || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#656B73]">Kecepatan</dt>
                  <dd className="text-[#232528]">{lastResult.latency_ms} ms</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-[#656B73]">—</p>
            )}
          </section>

          <details className="rounded-2xl border border-[#EAE4DA] bg-white p-4 text-xs shadow-sm">
            <summary className="cursor-pointer font-semibold uppercase tracking-wider text-[#656B73]">
              Detail Teknis AI (JSON)
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-medium text-[#232528]">Data Terkumpul</p>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-[#FAF8F4] p-2 text-[11px] text-[#4C5259]">
                  {conv?.collected ? JSON.stringify(conv.collected, null, 2) : "—"}
                </pre>
              </div>
              {!!lastResult?.tools?.length && (
                <div>
                  <p className="font-medium text-[#232528]">Tool Call</p>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-[#FAF8F4] p-2 text-[11px] text-[#4C5259]">
                    {JSON.stringify(lastResult.tools, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
