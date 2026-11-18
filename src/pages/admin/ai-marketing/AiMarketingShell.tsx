import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { rememberIntendedPath } from "@/lib/authGuard";
import { AI_DATE_RANGE_PRESETS, formatRangeLabel } from "@/lib/ai/date-range";
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Boxes,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Cog,
  FolderKanban,
  Gauge,
  Home,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Megaphone,
  Menu,
  MousePointerClick,
  PenLine,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AskAIDrawer } from "@/components/ai/ask-ai-drawer";
import { Pill, StatusDot } from "@/components/ai/primitives";
import { AiMarketingProvider, useAiMarketingContext } from "@/context/AiMarketingContext";
import {
  useAiActivity,
  useMarkActivityRead,
  useMarkAllActivityRead,
  useProviders,
} from "@/hooks/useAiDashboard";
import type { AIActivity } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import "@/styles/ai-marketing.css";

type LinkItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
type AskItem = { action: "ask-ai"; label: string; icon: LucideIcon };
type NavItem = LinkItem | AskItem;

interface NavGroup {
  key: string;
  label: string | null;
  collapsible: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    key: "overview",
    label: null,
    collapsible: false,
    items: [{ to: "/admin/ai-marketing", label: "Overview", icon: LayoutDashboard, end: true }],
  },
  {
    key: "ai-center",
    label: "AI Center",
    collapsible: true,
    items: [
      { action: "ask-ai", label: "Ask AI", icon: Sparkles },
      { to: "/admin/ai-marketing/ai-center/recommendations", label: "Recommendations", icon: Lightbulb },
      { to: "/admin/ai-marketing/ai-center/actions", label: "Actions", icon: Zap },
      { to: "/admin/ai-marketing/insights", label: "Insights", icon: Search },
    ],
  },
  {
    key: "agents",
    label: "Agents",
    collapsible: true,
    items: [
      { to: "/admin/ai-marketing/seo", label: "SEO Agent", icon: LineChart },
      { to: "/admin/ai-marketing/content", label: "Content Agent", icon: PenLine },
      { to: "/admin/ai-marketing/ads", label: "Ads Agent", icon: Megaphone },
      { to: "/admin/ai-marketing/leads", label: "Lead Intelligence", icon: Users },
      { to: "/admin/ai-marketing/cro", label: "CRO Agent", icon: MousePointerClick },
    ],
  },
  {
    key: "workspace",
    label: "Workspace",
    collapsible: true,
    items: [
      { to: "/admin/ai-marketing/campaigns", label: "Campaigns", icon: FolderKanban },
      { to: "/admin/ai-marketing/impact", label: "Impact", icon: TrendingUp },
    ],
  },
  {
    key: "governance",
    label: "Governance",
    collapsible: true,
    items: [
      { to: "/admin/ai-marketing/approvals", label: "Approvals", icon: CheckCircle2 },
      { to: "/admin/ai-marketing/activity", label: "Activity", icon: Activity },
    ],
  },
  {
    key: "system",
    label: "AI System",
    collapsible: true,
    items: [
      { to: "/admin/ai-marketing/usage", label: "Usage & Cost", icon: Gauge },
      { to: "/admin/ai-marketing/providers", label: "Providers & Routing", icon: Boxes },
      { to: "/admin/ai-marketing/settings", label: "Settings", icon: Cog },
    ],
  },
];

function isLink(item: NavItem): item is LinkItem {
  return "to" in item;
}

function NavGroupBlock({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const { openAsk } = useAiMarketingContext();
  const groupActive = group.items.some((item) => isLink(item) && pathname.startsWith(item.to) && item.to !== "/admin/ai-marketing");
  const [open, setOpen] = useState(groupActive || !group.collapsible);

  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);

  const list = (
    <ul className="space-y-0.5">
      {group.items.map((item) =>
        isLink(item) ? (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )
              }
            >
              <item.icon className="size-3.5 text-ai" />
              {item.label}
            </NavLink>
          </li>
        ) : (
          <li key={item.label}>
            <button
              onClick={() => {
                openAsk();
                onNavigate();
              }}
              className="group flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-sidebar-foreground/70 transition-colors duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <item.icon className="size-3.5 text-ai" />
              {item.label}
            </button>
          </li>
        ),
      )}
    </ul>
  );

  if (!group.collapsible || !group.label) {
    return (
      <div>
        {group.label ? <p className="label-eyebrow px-3 pb-2">{group.label}</p> : null}
        {list}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 pb-2 text-left">
        <span className="label-eyebrow">{group.label}</span>
        <ChevronDown className={cn("size-3 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-[rise_0.25s_ease-out] data-[state=closed]:hidden">
        {list}
      </CollapsibleContent>
    </Collapsible>
  );
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultActivityHref(a: AIActivity): string {
  if (a.href) return a.href;
  const agentRoutes: Record<string, string> = {
    seo: "/admin/ai-marketing/seo",
    content: "/admin/ai-marketing/content",
    ads: "/admin/ai-marketing/ads",
    leads: "/admin/ai-marketing/leads",
    cro: "/admin/ai-marketing/cro",
  };
  if (a.kind === "approval") return "/admin/ai-marketing/ai-center/recommendations";
  if (a.kind === "action") return "/admin/ai-marketing/ai-center/actions";
  if (a.kind === "insight") return "/admin/ai-marketing/insights";
  return agentRoutes[a.agent] ?? "/admin/ai-marketing/activity";
}

function activityKindMeta(kind: AIActivity["kind"]): {
  icon: LucideIcon;
  tone: string;
  label: string;
} {
  switch (kind) {
    case "approval":
      return { icon: CheckCircle2, tone: "bg-success/15 text-success", label: "Approval" };
    case "action":
      return { icon: Zap, tone: "bg-ai/15 text-ai", label: "Action" };
    case "insight":
      return { icon: Lightbulb, tone: "bg-insight/15 text-insight", label: "Insight" };
    case "alert":
      return { icon: AlertTriangle, tone: "bg-warning/15 text-warning", label: "Alert" };
    default:
      return { icon: Bot, tone: "bg-info/15 text-info", label: "Agent" };
  }
}

function formatActivityStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ShellHeader({ user, onOpenNav }: { user: any; onOpenNav: () => void }) {
  const navigate = useNavigate();
  const {
    openAsk,
    dateRange,
    setDateRangePreset,
    setCustomDateRange,
    refreshAll,
    isRefreshing,
  } = useAiMarketingContext();
  const { data: recentActivity = [] } = useAiActivity();
  const { data: providers = [] } = useProviders();
  const markRead = useMarkActivityRead();
  const markAllRead = useMarkAllActivityRead();
  const [notifOpen, setNotifOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(dateRange.from);
  const [customTo, setCustomTo] = useState(dateRange.to);

  useEffect(() => {
    setCustomFrom(dateRange.from);
    setCustomTo(dateRange.to);
  }, [dateRange.from, dateRange.to]);

  const activeProviders = providers.filter((p) => p.status === "connected" || p.status === "degraded");
  const isLive = activeProviders.length > 0;
  const unreadCount = recentActivity.filter((a) => !a.read).length;
  const visibleActivity = recentActivity.slice(0, 8);

  const thisMonth = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    setCustomDateRange(localIsoDate(from), localIsoDate(now));
    setDateOpen(false);
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) {
      toast.error("Tanggal mulai harus sebelum tanggal selesai.");
      return;
    }
    setCustomDateRange(customFrom, customTo);
    setDateOpen(false);
  };

  const handleNotificationClick = (item: AIActivity) => {
    if (!item.read) {
      markRead.mutate(item.id);
    }
    setNotifOpen(false);
    navigate(defaultActivityHref(item));
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md sm:gap-3 sm:px-6">
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-sm border border-border text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </button>

      <span className="hidden items-center gap-2 sm:flex">
        <span className="flex size-6 items-center justify-center rounded-md bg-ai/12">
          <Sparkles className="size-3 text-ai" />
        </span>
        <span className="label-eyebrow">AI System</span>
        <Pill tone={isLive ? "success" : "warning"}>
          <StatusDot tone={isLive ? "success" : "warning"} pulse={isLive} />
          {isLive ? "Live" : "Offline"}
        </Pill>
      </span>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={isRefreshing}
          title="Muat ulang semua data dashboard"
          className="flex size-8 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-ai")} />
        </button>

        <DropdownMenu open={dateOpen} onOpenChange={setDateOpen}>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3 sm:py-2">
            <CalendarDays className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {dateRange.key === "custom" ? `${dateRange.from} → ${dateRange.to}` : `Last ${dateRange.days} days`}
            </span>
            <span className="sm:hidden">
              {dateRange.key === "custom" ? `${dateRange.days}d` : `${dateRange.days}D`}
            </span>
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Rentang tanggal</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {AI_DATE_RANGE_PRESETS.map((p) => (
              <DropdownMenuItem
                key={p.key}
                onClick={() => {
                  setDateRangePreset(p.key);
                  setDateOpen(false);
                }}
                className="flex items-center justify-between"
              >
                <span>Last {p.days} days</span>
                {formatRangeLabel(dateRange) === p.label ? (
                  <span className="text-ai">✓</span>
                ) : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={thisMonth}>Bulan ini (MTD)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <div
              className="space-y-2 px-2 py-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <p className="label-eyebrow">Custom range</p>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded border border-border bg-secondary px-1.5 py-1 text-[11px] text-foreground focus:border-ai focus:outline-none"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded border border-border bg-secondary px-1.5 py-1 text-[11px] text-foreground focus:border-ai focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={applyCustomRange}
                className="w-full rounded bg-ai px-2.5 py-1.5 text-[11px] font-semibold text-background transition-opacity hover:opacity-90"
              >
                Terapkan Tanggal
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={openAsk}
          className="flex items-center gap-1.5 rounded-sm bg-ai px-2.5 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 sm:px-3 sm:py-2"
        >
          <Sparkles className="size-3.5" />
          <span className="hidden xs:inline sm:inline">Ask AI</span>
        </button>

        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger
            className="relative flex size-8 items-center justify-center rounded-full border border-border-strong text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
            aria-label={unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Notifikasi"}
          >
            <Bell className="size-3.5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-w-[16px] items-center justify-center rounded-full bg-ai px-1 py-[1px] font-mono text-[9px] font-bold leading-none text-background shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[340px] p-0 sm:w-[380px]">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Notifikasi</span>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-ai/15 px-2 py-0.5 font-mono text-[10px] font-medium text-ai">
                    {unreadCount} baru
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Semua terbaca</span>
                )}
              </div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  disabled={markAllRead.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    markAllRead.mutate(undefined, {
                      onSuccess: () => toast.success("Semua notifikasi ditandai sudah dibaca."),
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-ai transition-colors hover:bg-ai/10 disabled:opacity-50"
                >
                  <CheckCheck className="size-3" />
                  Tandai semua
                </button>
              ) : null}
            </div>

            <div className="max-h-[360px] divide-y divide-border/50 overflow-y-auto">
              {visibleActivity.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="mx-auto mb-2 size-5 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">Belum ada notifikasi aktivitas AI.</p>
                </div>
              ) : (
                visibleActivity.map((a) => {
                  const meta = activityKindMeta(a.kind);
                  const KindIcon = meta.icon;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleNotificationClick(a)}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-accent/70",
                        !a.read ? "bg-ai/[0.04]" : "opacity-80",
                      )}
                    >
                      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", meta.tone)}>
                        <KindIcon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-foreground">
                            {a.title || `${a.agent.toUpperCase()} · ${meta.label}`}
                          </span>
                          {!a.read ? <span className="size-1.5 shrink-0 rounded-full bg-ai" /> : null}
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                          {a.message}
                        </p>
                        <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground/80">
                          <span className="font-mono uppercase">{a.agent}</span>
                          <span>{formatActivityStamp(a.time)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-border bg-secondary/40 px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(false);
                  navigate("/admin/ai-marketing/activity");
                }}
                className="w-full rounded py-1 text-center text-[11px] font-medium text-ai transition-colors hover:bg-ai/10"
              >
                Lihat seluruh riwayat aktivitas →
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-full border border-border-strong text-[11px] tracking-widest transition-colors hover:bg-accent">
            {(user?.name || "A").charAt(0).toUpperCase()}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="truncate">{user?.name ?? "Admin"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin">
                <Home className="mr-2 size-3.5" />
                Back to Admin Panel
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function ShellBody({ user, children }: { user: any; children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { data: providers = [] } = useProviders();
  const connectedNames = providers
    .filter((p) => p.status === "connected")
    .map((p) => `${p.provider.toUpperCase()} (${p.model})`);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="dark ai-marketing-scope min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <Link to="/admin/ai-marketing" className="block">
            <span className="text-display block text-xl tracking-[0.1em]">LIVORA</span>
            <span className="label-eyebrow mt-1 block">Marketing Intelligence</span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={() => navigate("/admin")}
            className="flex w-full items-center gap-2 rounded border border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            <Home className="h-4 w-4" /> Back to Admin Panel
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pt-4 pb-6">
          {navGroups.map((group) => (
            <NavGroupBlock key={group.key} group={group} pathname={pathname} onNavigate={() => setOpen(false)} />
          ))}
        </nav>

        <Link
          to="/admin/ai-marketing/providers"
          onClick={() => setOpen(false)}
          className="block border-t border-sidebar-border px-5 py-4 transition-colors hover:bg-sidebar-accent/40"
        >
          <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <StatusDot tone={connectedNames.length > 0 ? "success" : "warning"} pulse={connectedNames.length > 0} />
            Multi-LLM Orchestration
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {connectedNames.length > 0 ? connectedNames.join(" · ") : "Periksa API key provider di Settings"}
          </p>
        </Link>
      </aside>

      {open ? (
        <button
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation overlay"
        />
      ) : null}

      <div className="lg:pl-[252px]">
        <ShellHeader user={user} onOpenNav={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>

      <AskAIDrawer />
    </div>
  );
}

export default function AiMarketingShell() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const hadDark = document.body.classList.contains("dark");
    const hadScope = document.body.classList.contains("ai-marketing-scope");
    document.body.classList.add("dark", "ai-marketing-scope");
    return () => {
      if (!hadDark) document.body.classList.remove("dark");
      if (!hadScope) document.body.classList.remove("ai-marketing-scope");
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me");
        if (data?.role !== "admin") {
          toast.error("Akses ditolak. Khusus admin.");
          navigate("/", { replace: true });
          return;
        }
        setUser(data);
      } catch {
        rememberIntendedPath();
        toast.error("Silakan masuk terlebih dahulu");
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate]);

  if (!user) {
    return (
      <div className="dark ai-marketing-scope flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <span className="flex size-10 items-center justify-center rounded-xl bg-ai/15 text-ai">
          <Sparkles className="size-5 animate-pulse" />
        </span>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Memuat Livora Marketing Intelligence...
        </p>
      </div>
    );
  }

  return (
    <AiMarketingProvider>
      <ShellBody user={user}>
        <Outlet />
      </ShellBody>
    </AiMarketingProvider>
  );
}