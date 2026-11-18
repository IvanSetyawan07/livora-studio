import { PageHeader } from "@/components/admin/PageHeader";
import { CategoryBarChart, StatGrid, type StatKpi } from "@/components/ai/dashboard-charts";
import { Panel } from "@/components/ai/primitives";
import { QueryError } from "@/components/ai/query-error";
import { usePageContext } from "@/context/AiMarketingContext";
import {
  useAiAgents,
  useUsageByAgent,
  useUsageByProvider,
  useUsageTotals,
} from "@/hooks/useAiDashboard";

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export default function AiMarketingUsage() {
  usePageContext("usage");
  const { data: agents } = useAiAgents();
  const totalsQuery = useUsageTotals();
  const byAgentQuery = useUsageByAgent();
  const byProviderQuery = useUsageByProvider();
  const totals = totalsQuery.data ?? null;
  const byAgent = byAgentQuery.data ?? null;
  const byProvider = byProviderQuery.data ?? null;
  const isError = totalsQuery.isError || byAgentQuery.isError || byProviderQuery.isError;

  function retryAll() {
    totalsQuery.refetch();
    byAgentQuery.refetch();
    byProviderQuery.refetch();
  }

  /**
   * Biaya hanya ditampilkan kalau semua request-nya punya harga model yang
   * terdaftar. Kalau ada yang belum, jangan pura-pura "$0" — sebut apa adanya.
   */
  function costLabel(cost: number, untracked?: number) {
    return untracked && untracked > 0 ? "not tracked yet" : `$${cost.toFixed(2)}`;
  }

  function agentName(key: string) {
    return agents?.find((a) => a.id === key)?.name ?? key;
  }

  const stats: StatKpi[] | null = totals
    ? [
        { label: "Requests", value: totals.requests.toLocaleString(), delta: totals.requestsDeltaLabel, direction: "up" },
        {
          label: "Tokens",
          value: formatTokens(totals.inputTokens + totals.outputTokens),
          delta: `${formatTokens(totals.inputTokens)} in · ${formatTokens(totals.outputTokens)} out`,
        },
        { label: "Cost Today", value: costLabel(totals.costToday, totals.untrackedToday) },
        { label: "Cost This Month", value: costLabel(totals.costMonth, totals.untrackedMonth) },
      ]
    : null;

  return (
    <>
      <PageHeader
        eyebrow="AI System"
        title="Usage & Cost"
        description="Simple enough to check at a glance, detailed enough to audit."
      />

      {totalsQuery.isError ? (
        <QueryError message="Ringkasan usage tidak bisa dimuat dari server." onRetry={() => void totalsQuery.refetch()} />
      ) : totalsQuery.isLoading || !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid kpis={stats} />
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {byAgentQuery.isError ? (
          <QueryError message="Data biaya per agent gagal dimuat." onRetry={() => void byAgentQuery.refetch()} />
        ) : byAgentQuery.isLoading || !byAgent ? (
          <div className="skeleton-shimmer h-[360px] rounded-lg" />
        ) : (
          <CategoryBarChart
            title="Cost by Agent"
            data={byAgent.map((u, i) => ({
              label: agentName(u.agent),
              value: u.cost,
              color: chartColors[i % chartColors.length],
            }))}
            height={280}
          />
        )}

        {byProviderQuery.isError ? (
          <QueryError message="Data biaya per provider gagal dimuat." onRetry={() => void byProviderQuery.refetch()} />
        ) : byProviderQuery.isLoading || !byProvider ? (
          <div className="skeleton-shimmer h-[360px] rounded-lg" />
        ) : (
          <CategoryBarChart
            title="Cost by Provider"
            data={byProvider.map((u, i) => ({
              label: u.provider,
              value: u.cost,
              color: chartColors[i % chartColors.length],
            }))}
            height={280}
          />
        )}
      </div>

      {byAgent ? (
        <Panel className="mt-4 p-5">
          <p className="label-eyebrow mb-3">Cost by Agent — detail</p>
          <div className="space-y-2">
            {byAgent.map((u) => (
              <div key={u.agent} className="flex items-center justify-between border-t border-border py-2 first:border-t-0 text-sm">
                <span className="text-foreground/80">{agentName(u.agent)}</span>
                <span className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="num">{u.requests.toLocaleString()} req</span>
                  <span className="num">{formatTokens(u.tokens)} tok</span>
                  <span className="num text-foreground">{costLabel(u.cost, u.untracked)}</span>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </>
  );
}