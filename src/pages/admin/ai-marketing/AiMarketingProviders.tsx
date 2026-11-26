import { useState } from "react";
import { Loader2, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { AnimatedBar, Panel, Pill, SectionHeading, StatusDot } from "@/components/ai/primitives";
import { QueryError } from "@/components/ai/query-error";
import { usePageContext } from "@/context/AiMarketingContext";
import {
  extractApiErrorMessage,
  useProviderPreference,
  useProviderQuota,
  useProviders,
  useRoutingStrategy,
  useSetProviderPreference,
  useSyncProviders,
  useTestProvider,
} from "@/hooks/useAiDashboard";
import type { AIProviderStatus } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const statusTone: Record<AIProviderStatus, "success" | "warning" | "neutral"> = {
  connected: "success",
  degraded: "warning",
  not_connected: "neutral",
};

const statusLabel: Record<AIProviderStatus, string> = {
  connected: "Terhubung",
  degraded: "Melambat",
  not_connected: "Belum Terhubung",
};

const providerDisplayName: Record<string, string> = {
  gemini: "Gemini",
  groq: "Groq",
  anthropic: "Anthropic",
};

function formatResetIn(iso: string | null): string | null {
  if (!iso) return null;
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "kuota direset sekarang";
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "reset dalam <1 menit";
  if (mins < 60) return `reset dalam ${mins} menit`;
  return `reset dalam ${Math.round(mins / 60)} jam`;
}

export default function AiMarketingProviders() {
  usePageContext("providers");
  const providersQuery = useProviders();
  const routingQuery = useRoutingStrategy();
  const quotaQuery = useProviderQuota();
  const preferenceQuery = useProviderPreference();
  const setPreferenceMutation = useSetProviderPreference();
  const syncProvidersMutation = useSyncProviders();
  const testProviderMutation = useTestProvider();
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const providers = providersQuery.data ?? null;
  const routing = routingQuery.data ?? null;
  const quota = quotaQuery.data ?? null;
  const preference = preferenceQuery.data ?? null;
  const savingPreference = setPreferenceMutation.isPending;
  const isError =
    providersQuery.isError || routingQuery.isError || quotaQuery.isError || preferenceQuery.isError;

  function retryAll() {
    providersQuery.refetch();
    routingQuery.refetch();
    quotaQuery.refetch();
    preferenceQuery.refetch();
  }

  function handleSyncProviders() {
    syncProvidersMutation.mutate(undefined, {
      onSuccess: () => toast.success("Model & status provider berhasil disinkronkan dari server."),
      onError: (e) => toast.error(extractApiErrorMessage(e, "Gagal menyinkronkan provider.")),
    });
  }

  function handleTestProvider(providerKey: string) {
    setTestingProvider(providerKey);
    testProviderMutation.mutate(providerKey, {
      onSuccess: (res: any) => {
        if (res?.ok === false || (res?.status && res.status !== "connected")) {
          toast.error(res?.message || `Tes koneksi ${providerKey} gagal.`);
          return;
        }
        toast.success(res.message || `${providerKey} merespons (${res.latencyMs ?? 0}ms).`);
      },
      onError: (e) =>
        toast.error(extractApiErrorMessage(e, `Tes koneksi ${providerKey} gagal.`)),
      onSettled: () => setTestingProvider(null),
    });
  }

  function choosePreferred(provider: string | null) {
    setPreferenceMutation.mutate(provider, {
      onSuccess: () =>
        toast.success(
          provider
            ? `${providerDisplayName[provider] ?? provider} dipilih sebagai provider utama`
            : "Dikembalikan ke urutan cadangan otomatis",
        ),
      onError: () => toast.error("Gagal memperbarui preferensi provider."),
    });
  }

  const configuredProviders = providers?.map((p) => p.provider) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Sistem AI"
        title="Provider & Routing AI"
        description="Mesin AI Livora dilengkapi jalur cadangan otomatis agar analisis pemasaran tetap berjalan lancar meskipun salah satu provider sedang sibuk."
        action={
          <button
            type="button"
            onClick={handleSyncProviders}
            disabled={syncProvidersMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {syncProvidersMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Sinkronkan Provider
          </button>
        }
      />

      {isError ? (
        <div className="mb-6">
          <QueryError message="Data provider tidak bisa dimuat dari server." onRetry={retryAll} />
        </div>
      ) : null}

      <section>
        <SectionHeading
          title="Urutan Prioritas Provider"
          description="Pilih mesin AI yang ingin dicoba lebih dulu setiap kali agen bekerja. Jika kuota penuh atau sedang lambat, sistem otomatis beralih ke provider berikutnya."
        />
        <Panel className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={savingPreference}
              onClick={() => choosePreferred(null)}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-xs transition-colors disabled:opacity-50",
                !preference?.preferredProvider
                  ? "border-ai bg-ai/12 text-ai"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              Otomatis (Urutan Standar)
            </button>
            {configuredProviders.map((key) => (
              <button
                key={key}
                type="button"
                disabled={savingPreference}
                onClick={() => choosePreferred(key)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-xs capitalize transition-colors disabled:opacity-50",
                  preference?.preferredProvider === key
                    ? "border-ai bg-ai/12 text-ai"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {providerDisplayName[key] ?? key}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Berlaku untuk seluruh agen (SEO, Konten, Iklan, Prospek, dan Konversi). Provider lainnya tetap siaga sebagai cadangan otomatis.
          </p>
        </Panel>
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Status Koneksi Provider"
          description="Pantau kondisi koneksi, sisa kuota, dan kecepatan respons masing-masing provider AI."
        />
        {providersQuery.isError ? (
          <QueryError message="Daftar provider tidak bisa dimuat." onRetry={() => void providersQuery.refetch()} />
        ) : !providers ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-shimmer h-48 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {providers.map((p) => {
              const q = quota?.find((row) => row.provider === p.provider) ?? null;
              const isTesting = testingProvider === p.provider;
              return (
                <Panel key={p.id} hover className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-display text-base capitalize">{providerDisplayName[p.provider] ?? p.provider}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{p.model}</p>
                    </div>
                    <Pill tone={statusTone[p.status]}>
                      <StatusDot tone={statusTone[p.status]} />
                      {statusLabel[p.status]}
                    </Pill>
                  </div>

                  <div className="mt-4">
                    <AnimatedBar label="Porsi Pemakaian" value={p.usageShare} valueLabel={`${p.usageShare}%`} tone="ai" />
                  </div>

                  <div className="mt-4 space-y-2 border-t border-border pt-3">
                    {q?.note ? (
                      <p className="text-[11px] text-muted-foreground">{q.note}</p>
                    ) : q && q.requestsUsedPct !== null ? (
                      <>
                        <AnimatedBar
                          label="Kuota Permintaan"
                          value={q.requestsUsedPct}
                          valueLabel={`${q.requestsRemaining}/${q.requestsLimit} tersisa`}
                          tone={q.requestsUsedPct > 85 ? "warning" : "info"}
                        />
                        {q.tokensUsedPct !== null && (
                          <AnimatedBar
                            label="Kuota Token"
                            value={q.tokensUsedPct}
                            valueLabel={`${q.tokensRemaining}/${q.tokensLimit} tersisa`}
                            tone={q.tokensUsedPct > 85 ? "warning" : "info"}
                          />
                        )}
                        {formatResetIn(q.requestsResetAt) && (
                          <p className="text-[10px] text-muted-foreground">{formatResetIn(q.requestsResetAt)}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Belum ada pembacaan kuota — otomatis terisi setelah provider menangani permintaan pertama.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                    <div>
                      <p className="num text-sm text-foreground">
                        {p.untrackedRequests && p.untrackedRequests > 0
                          ? "Belum tercatat"
                          : `$${p.cost.toFixed(0)}`}
                      </p>
                      <p className="label-eyebrow mt-0.5">Biaya</p>
                    </div>
                    <div>
                      <p className="num text-sm text-foreground">{p.latencyMs}ms</p>
                      <p className="label-eyebrow mt-0.5">Kecepatan</p>
                    </div>
                    <div>
                      <p className="num text-sm text-foreground">{p.successRate}%</p>
                      <p className="label-eyebrow mt-0.5">Sukses</p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border pt-3">
                    <button
                      type="button"
                      disabled={isTesting}
                      onClick={() => handleTestProvider(p.provider)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-ai/40 hover:bg-ai/10 hover:text-ai disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                      {isTesting ? "Menghubungi provider..." : "Uji Koneksi"}
                    </button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Pembagian Tugas Otomatis (Routing)"
          description="Menyesuaikan model terbaik untuk tiap jenis tugas secara seimbang antara kualitas, kecepatan, dan efisiensi biaya."
        />
        <div className="mb-4 rounded-sm border border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
          Jalur cadangan per tugas tetap mengikuti "Urutan Prioritas Provider" di atas apabila provider utama sedang melambat.
        </div>
        {routingQuery.isError ? (
          <QueryError message="Strategi routing gagal dimuat." onRetry={() => void routingQuery.refetch()} />
        ) : !routing ? (
          <div className="skeleton-shimmer h-64 rounded-lg" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label-eyebrow">Strategi</p>
                  <p className="text-display mt-1 text-xl">{routing.name}</p>
                </div>
                <Pill tone={routing.automatic ? "success" : "neutral"}>
                  <StatusDot tone={routing.automatic ? "success" : "neutral"} pulse={routing.automatic} />
                  {routing.automatic ? "Otomatis" : "Manual"}
                </Pill>
              </div>
              <div className="mt-5 space-y-4">
                <AnimatedBar label="Kualitas" value={routing.quality} tone="insight" />
                <AnimatedBar label="Kecepatan" value={routing.speed} tone="info" />
                <AnimatedBar label="Efisiensi Biaya" value={routing.costEfficiency} tone="success" />
              </div>
            </Panel>

            <Panel className="p-5">
              <p className="label-eyebrow mb-3">Pembagian model per jenis tugas</p>
              <div className="space-y-3">
                {routing.taskRouting.map((t) => (
                  <div key={t.taskType} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-foreground/90">{t.taskType}</p>
                      <span className="rounded-sm bg-ai/12 px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] text-ai uppercase">
                        {t.routedTo}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.reason}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
        <details className="mt-6 rounded-md border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground/85 select-none">
            Info Teknis untuk Tim IT
          </summary>
          <p className="mt-2 leading-relaxed">
            Kunci API provider (<code className="font-mono text-[11px]">GEMINI_API_KEY</code>, <code className="font-mono text-[11px]">GROQ_API_KEY</code>, <code className="font-mono text-[11px]">ANTHROPIC_API_KEY</code>) dikelola di sisi server pada file konfigurasi backend. Gunakan tombol <strong>Sinkronkan Provider</strong> di kanan atas setelah memperbarui konfigurasi server.
          </p>
        </details>
      </section>
    </>
  );
}