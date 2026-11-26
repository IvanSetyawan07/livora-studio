import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, ThumbsDown, CheckCircle2, XCircle, Bot } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  PageHeader,
  AdminHelpBanner,
  EmptyState,
  StatusBadge,
  useAdminDialog,
  type Tone,
} from "@/components/admin/kit";

const FLAG_META: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Dijawab Normal", tone: "success" },
  fallback: { label: "Kurang Paham (Fallback)", tone: "warning" },
  handoff: { label: "Dialihkan ke Tim CS", tone: "info" },
  guardrail_blocked: { label: "Dibatasi Aturan Keamanan", tone: "danger" },
};

/** Log AI (jejak tiap giliran Bot Livi) + Uji Skenario otomatis. */
export default function AdminBotLogs() {
  const dialog = useAdminDialog();
  const [tab, setTab] = useState<"logs" | "scenarios">("logs");
  const [logs, setLogs] = useState<any[] | null>(null);
  const [flag, setFlag] = useState("");
  const [scenarios, setScenarios] = useState<any[] | null>(null);
  const [runResult, setRunResult] = useState<any | null>(null);
  const [running, setRunning] = useState(false);

  const loadLogs = useCallback(
    () =>
      api
        .get("/admin/shop/bot/logs", { params: flag ? { flag } : {} })
        .then((r) => setLogs(r.data.data ?? r.data))
        .catch(() => setLogs([])),
    [flag],
  );

  const loadScenarios = useCallback(
    () =>
      api
        .get("/admin/shop/bot/scenarios")
        .then((r) => setScenarios(r.data))
        .catch(() => setScenarios([])),
    [],
  );

  useEffect(() => {
    loadLogs();
    loadScenarios();
  }, [loadLogs, loadScenarios]);

  const markBad = async (id: number) => {
    const note = await dialog.prompt({
      title: "Tandai Jawaban Livi Kurang Tepat",
      description: "Tuliskan alasan singkat agar tim dapat menyempurnakan pengetahuan Bot Livi.",
      label: "Catatan Evaluasi",
      placeholder: "mis. Salah menyebut estimasi waktu pengiriman",
      confirmText: "Simpan Catatan",
      cancelText: "Batal",
      required: true,
    });
    if (typeof note !== "string" || !note.trim()) return;
    try {
      await api.post(`/admin/shop/bot/logs/${id}/bad`, { note: note.trim() });
      toast.success("Catatan evaluasi berhasil disimpan.");
      loadLogs();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan catatan");
    }
  };

  const runAll = async () => {
    setRunning(true);
    try {
      const r = await api.post("/admin/shop/bot/scenarios/run");
      setRunResult(r.data);
      toast.success(`${r.data.passed}/${r.data.total} skenario uji lolos.`);
    } catch {
      toast.error("Uji skenario gagal dijalankan.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Evaluasi Bot Livi"
        title="Riwayat Jawaban Livi & Uji Skenario"
        description="Tinjau jawaban Bot Livi kepada pelanggan nyata (chat simulasi tidak dicatat di sini) dan jalankan pengujian aturan bot."
        actions={
          <div className="inline-flex rounded-xl border border-[#EAE4DA] bg-white p-1">
            <button
              type="button"
              onClick={() => setTab("logs")}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === "logs" ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
              }`}
            >
              Riwayat Jawaban
            </button>
            <button
              type="button"
              onClick={() => setTab("scenarios")}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === "scenarios" ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
              }`}
            >
              Uji Skenario
            </button>
          </div>
        }
      />

      <AdminHelpBanner title="Cara Memanfaatkan Evaluasi Livi" storageKey="admin-bot-logs-help">
        Saring berdasarkan <b>Kurang Paham (Fallback)</b> atau <b>Dialihkan ke Tim CS</b> untuk melihat pertanyaan pelanggan yang paling sering belum bisa dijawab Livi. Klik <b>Tandai Jawaban Kurang Tepat</b> untuk memberi masukan.
      </AdminHelpBanner>

      {tab === "logs" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <select
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              aria-label="Filter status jawaban"
              className="h-9 rounded-full border border-[#EAE4DA] bg-white px-4 text-xs text-[#232528]"
            >
              <option value="">Semua status jawaban</option>
              {Object.entries(FLAG_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {logs === null ? (
            <div className="flex items-center gap-2 py-12 text-sm text-[#656B73]">
              <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat riwayat jawaban…
            </div>
          ) : !logs.length ? (
            <EmptyState
              icon={Bot}
              title="Belum ada riwayat jawaban"
              description="Riwayat percakapan pelanggan nyata dengan Bot Livi akan tampil di sini."
            />
          ) : (
            <ul className="space-y-3">
              {logs.map((l) => {
                const fm = FLAG_META[l.flag] ?? { label: l.flag, tone: "neutral" as Tone };
                return (
                  <li key={l.id} className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#656B73]">
                      <span className="font-mono font-medium text-[#232528]">{l.phone}</span>
                      <StatusBadge tone={fm.tone}>{fm.label}</StatusBadge>
                      <span>{new Date(l.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                    <p className="mt-2.5 text-sm text-[#232528]">
                      <span className="font-medium text-[#656B73]">Pelanggan:</span> {l.input}
                    </p>
                    {l.output && (
                      <p className="mt-1.5 rounded-xl bg-[#FAF8F4] p-3 text-sm text-[#232528]">
                        <span className="font-medium text-[#35678B]">Livi:</span> {l.output}
                      </p>
                    )}
                    {l.note && <p className="mt-2 text-xs font-medium text-rose-600">Catatan evaluasi: {l.note}</p>}
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => markBad(l.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE4DA] bg-white px-3 py-1 text-xs text-[#656B73] hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <ThumbsDown className="h-3 w-3" /> Tandai Jawaban Kurang Tepat
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runAll}
              disabled={running || !scenarios?.length}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#232528] px-5 text-xs font-medium text-white hover:bg-[#35383d] disabled:opacity-40"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Jalankan Semua Skenario Uji
            </button>
            {runResult && (
              <span className="text-xs font-medium text-[#232528]">
                Hasil: <b>{runResult.passed}</b> dari <b>{runResult.total}</b> skenario lolos
              </span>
            )}
          </div>

          {scenarios !== null && !scenarios.length ? (
            <EmptyState
              icon={Bot}
              title="Belum ada skenario uji tersimpan"
              description="Skenario pengujian otomatis belum disiapkan oleh tim pengembang. Anda tetap dapat menguji Livi secara langsung di menu Simulator WhatsApp."
            />
          ) : (
            <ul className="space-y-2.5">
              {(runResult?.results ?? scenarios ?? []).map((s: any) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm"
                >
                  <span className="text-sm font-medium text-[#232528]">{s.name}</span>
                  {runResult &&
                    (s.pass ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> Lolos
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600">
                        <XCircle className="h-4 w-4" /> {(s.failures ?? []).join(", ")}
                      </span>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
