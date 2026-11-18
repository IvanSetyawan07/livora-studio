import { useMemo, useState } from "react";
import { CheckCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActivityStream } from "@/components/ai/activity-stream";
import { QueryError } from "@/components/ai/query-error";
import { usePageContext } from "@/context/AiMarketingContext";
import { useAiActivity, useMarkAllActivityRead } from "@/hooks/useAiDashboard";
import type { AIActivity, AIAgentId } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const agentFilters: (AIAgentId | "all")[] = ["all", "seo", "content", "ads", "leads", "cro"];
const kindFilters: { key: AIActivity["kind"] | "all"; label: string }[] = [
  { key: "all", label: "All kinds" },
  { key: "agent_run", label: "Agent Runs" },
  { key: "insight", label: "Insights" },
  { key: "approval", label: "Approvals" },
  { key: "action", label: "Actions" },
  { key: "alert", label: "Alerts" },
];

export default function ActivityPage() {
  usePageContext("activity");
  const [filter, setFilter] = useState<AIAgentId | "all">("all");
  const [kindFilter, setKindFilter] = useState<AIActivity["kind"] | "all">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch } = useAiActivity(filter, kindFilter);
  const markAllRead = useMarkAllActivityRead();

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((a) => {
      if (q && !`${a.title ?? ""} ${a.message} ${a.actor}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search]);

  const unreadCount = (data ?? []).filter((a) => !a.read).length;

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Activity"
        description="Klik baris mana pun untuk langsung membuka halaman atau fitur yang terkait dengan aktivitas AI."
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              disabled={markAllRead.isPending}
              onClick={() =>
                markAllRead.mutate(undefined, {
                  onSuccess: () => toast.success("Semua notifikasi ditandai sudah dibaca."),
                })
              }
              className="inline-flex items-center gap-1.5 rounded-sm border border-ai/40 bg-ai/10 px-3 py-1.5 text-xs font-medium text-ai hover:bg-ai/20 disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" />
              Tandai semua dibaca ({unreadCount})
            </button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {agentFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 rounded-sm border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-200",
                filter === f
                  ? "border-brass/50 bg-brass/10 text-brass"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All agents" : f}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aktivitas..."
              className="h-8 w-44 rounded-sm border border-border bg-secondary/60 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ai focus:outline-none"
            />
          </div>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as AIActivity["kind"] | "all")}
            className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-ai focus:outline-none"
          >
            {kindFilters.map((kf) => (
              <option key={kf.key} value={kf.key}>
                {kf.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-sm border border-border bg-surface/40" />
          ))}
        </div>
      ) : error ? (
        <QueryError message="Activity log tidak bisa dimuat dari server." onRetry={() => void refetch()} />
      ) : (
        <>
          <ActivityStream items={visible} />

          {visible.length === 0 ? (
            <p className="mt-4 rounded-sm border border-dashed border-border-strong p-8 text-center text-sm text-muted-foreground">
              Tidak ada aktivitas yang cocok dengan filter ini.
            </p>
          ) : null}
        </>
      )}
    </>
  );
}