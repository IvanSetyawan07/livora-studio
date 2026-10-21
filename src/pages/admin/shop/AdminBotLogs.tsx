import { useEffect, useState } from "react";
import { Loader2, Play, ThumbsDown, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

/** Log AI (jejak tiap giliran) + Uji Skenario (jalankan semua skenario tersimpan). */
export default function AdminBotLogs() {
  const [tab, setTab] = useState<"logs" | "scenarios">("logs");
  const [logs, setLogs] = useState<any[] | null>(null);
  const [flag, setFlag] = useState("");
  const [scenarios, setScenarios] = useState<any[] | null>(null);
  const [runResult, setRunResult] = useState<any | null>(null);
  const [running, setRunning] = useState(false);

  const loadLogs = () => api.get("/admin/shop/bot/logs", { params: flag ? { flag } : {} }).then((r) => setLogs(r.data.data ?? r.data)).catch(() => setLogs([]));
  const loadScenarios = () => api.get("/admin/shop/bot/scenarios").then((r) => setScenarios(r.data)).catch(() => setScenarios([]));
  useEffect(() => { loadLogs(); loadScenarios(); }, [flag]);

  const markBad = async (id: number) => {
    const note = prompt("Catatan: kenapa jawaban ini buruk?");
    if (note === null) return;
    await api.post(`/admin/shop/bot/logs/${id}/bad`, { note });
    toast.success("Ditandai");
    loadLogs();
  };

  const runAll = async () => {
    setRunning(true);
    try {
      const r = await api.post("/admin/shop/bot/scenarios/run");
      setRunResult(r.data);
      toast.success(`${r.data.passed}/${r.data.total} skenario lolos`);
    } catch {
      toast.error("Uji skenario gagal dijalankan");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="serif text-2xl">Log AI & Uji Skenario</h1>
          <p className="text-sm text-muted-foreground">Jejak tiap giliran bot Livi dan pengujian otomatis aturan keras.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("logs")} className={`h-9 rounded-full px-4 text-sm ${tab === "logs" ? "bg-foreground text-background" : "border border-border"}`}>Log AI</button>
          <button type="button" onClick={() => setTab("scenarios")} className={`h-9 rounded-full px-4 text-sm ${tab === "scenarios" ? "bg-foreground text-background" : "border border-border"}`}>Uji Skenario</button>
        </div>
      </div>

      {tab === "logs" ? (
        <>
          <div className="mt-4 flex gap-2">
            <select value={flag} onChange={(e) => setFlag(e.target.value)} aria-label="Filter flag" className="h-10 rounded-full border border-border bg-background px-4 text-sm">
              <option value="">Semua flag</option>
              <option value="ok">ok</option>
              <option value="fallback">fallback</option>
              <option value="handoff">handoff</option>
              <option value="guardrail_blocked">guardrail_blocked</option>
            </select>
          </div>
          {logs === null ? (
            <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat log…</div>
          ) : !logs.length ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Belum ada log.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{l.phone}</span>
                    <span className={`rounded-full px-2 py-0.5 ${l.flag === "ok" ? "bg-emerald-50 text-emerald-700" : l.flag === "guardrail_blocked" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{l.flag}</span>
                    <span>{new Date(l.created_at).toLocaleString("id-ID")}</span>
                  </div>
                  <p className="mt-2 text-sm"><span className="text-muted-foreground">Customer:</span> {l.input}</p>
                  {l.output && <p className="mt-1 text-sm"><span className="text-muted-foreground">Bot:</span> {l.output}</p>}
                  {l.note && <p className="mt-1 text-xs text-red-600">Catatan: {l.note}</p>}
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={() => markBad(l.id)} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">
                      <ThumbsDown className="h-3 w-3" /> Tandai jawaban buruk
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={runAll} disabled={running}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background disabled:opacity-40">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Jalankan semua skenario
            </button>
            {runResult && <p className="text-sm text-muted-foreground">{runResult.passed}/{runResult.total} lolos</p>}
          </div>
          <ul className="mt-4 space-y-2">
            {(runResult?.results ?? scenarios ?? []).map((s: any) => (
              <li key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <span className="text-sm">{s.name}</span>
                {runResult && (
                  s.pass
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    : <span className="flex items-center gap-2 text-xs text-red-600"><XCircle className="h-5 w-5" /> {(s.failures ?? []).join(", ")}</span>
                )}
              </li>
            ))}
            {scenarios !== null && !scenarios.length && <p className="py-8 text-center text-sm text-muted-foreground">Belum ada skenario. Jalankan seeder BotScenarioSeeder di server.</p>}
          </ul>
        </>
      )}
    </div>
  );
}
