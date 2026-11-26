import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { rememberIntendedPath } from "@/lib/authGuard";
import { AI_DATE_RANGE_PRESETS, formatRangeLabel } from "@/lib/ai/date-range";
import livoraMark from "@/assets/_opt/logo-livora-160.webp";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Bot,
  Boxes,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Cog,
  Eye,
  FlaskConical,
  FolderKanban,
  Gauge,
  Home,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Lock,
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
  useAiAgents,
  useMarkActivityRead,
  useMarkAllActivityRead,
  useProviders,
} from "@/hooks/useAiDashboard";
import type { AIActivity } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { AdminDialogProvider, ErrorState } from "@/components/admin/kit";
import {
  AdminPermissionProvider,
  fetchAdminBootstrap,
  getCachedAdminBootstrap,
  type PermissionLevel,
} from "@/components/admin/AdminPermissionContext";
import "@/styles/ai-marketing.css";

const IS_MOCK_BACKEND = import.meta.env.VITE_AI_BACKEND === "mock";

type LinkItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
type AskItem = { action: "ask-ai"; label: string; icon: LucideIcon };
type NavItem = LinkItem | AskItem;

interface NavGroup {
  key: string;
  label: string;
  defaultOpen: boolean;
  items: NavItem[];
}

/**
 * 3 grup terbuka dengan label Bahasa Indonesia yang ramah admin studio.
 * Seluruh 17 rute di App.tsx tetap aktif dan dapat diakses.
 */
const navGroups: NavGroup[] = [
  {
    key: "utama",
    label: "Utama",
    defaultOpen: true,
    items: [
      { to: "/admin/ai-marketing", label: "Ringkasan", icon: LayoutDashboard, end: true },
      { action: "ask-ai", label: "Tanya AI Marketing", icon: Sparkles },
      { to: "/admin/ai-marketing/ai-center/recommendations", label: "Rekomendasi AI", icon: Lightbulb },
      { to: "/admin/ai-marketing/ai-center/actions", label: "Antrean Aksi", icon: Zap },
    ],
  },
  {
    key: "channels",
    label: "Channel Marketing",
    defaultOpen: true,
    items: [
      { to: "/admin/ai-marketing/seo", label: "SEO & Google Maps", icon: LineChart },
      { to: "/admin/ai-marketing/content", label: "Konten & Medsos", icon: PenLine },
      { to: "/admin/ai-marketing/ads", label: "Iklan & IG Boost", icon: Megaphone },
      { to: "/admin/ai-marketing/leads", label: "Prospek (Leads)", icon: Users },
      { to: "/admin/ai-marketing/campaigns", label: "Rencana Campaign", icon: FolderKanban },
    ],
  },
  {
    key: "pengaturan",
    label: "Pengaturan & Sistem",
    defaultOpen: false,
    items: [
      { to: "/admin/ai-marketing/approvals", label: "Persetujuan & Audit", icon: CheckCircle2 },
      { to: "/admin/ai-marketing/insights", label: "Temuan & Insight", icon: Search },
      { to: "/admin/ai-marketing/cro", label: "Konversi Website (CRO)", icon: MousePointerClick },
      { to: "/admin/ai-marketing/impact", label: "Hasil & Dampak", icon: TrendingUp },
      { to: "/admin/ai-marketing/activity", label: "Riwayat Aktivitas", icon: Activity },
      { to: "/admin/ai-marketing/settings", label: "Sambungan Platform", icon: Cog },
      { to: "/admin/ai-marketing/usage", label: "Biaya & Pemakaian AI", icon: Gauge },
      { to: "/admin/ai-marketing/providers", label: "Mesin & Provider AI", icon: Boxes },
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
  const groupActive = group.items.some(
    (item) => isLink(item) && pathname.startsWith(item.to) && item.to !== "/admin/ai-marketing",
  );
  const [open, setOpen] = useState(group.defaultOpen || groupActive);

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
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                  isActive
                    ? "bg-[#EDF4F8] font-medium text-[#2D5B7C]"
                    : "text-[#4C5259] hover:bg-[#FAF8F4] hover:text-[#232528]",
                )
              }
            >
              <item.icon className="size-4 shrink-0 text-[#5E93B8]" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          </li>
        ) : (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => {
                openAsk();
                onNavigate();
              }}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#4C5259] transition-colors duration-200 hover:bg-[#FAF8F4] hover:text-[#232528]"
            >
              <item.icon className="size-4 shrink-0 text-[#5E93B8]" />
              <span className="truncate">{item.label}</span>
            </button>
          </li>
        ),
      )}
    </ul>
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 pb-1.5 text-left">
        <span className="label-eyebrow text-[10px]">{group.label}</span>
        <ChevronDown
          className={cn("size-3.5 text-[#656B73] transition-transform duration-200", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:hidden">{list}</CollapsibleContent>
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
      return { icon: CheckCircle2, tone: "bg-success/12 text-success", label: "Persetujuan" };
    case "action":
      return { icon: Zap, tone: "bg-ai/12 text-ai", label: "Aksi" };
    case "insight":
      return { icon: Lightbulb, tone: "bg-insight/12 text-insight", label: "Insight" };
    case "alert":
      return { icon: AlertTriangle, tone: "bg-warning/12 text-warning", label: "Peringatan" };
    default:
      return { icon: Bot, tone: "bg-info/12 text-info", label: "Agent" };
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
  const { data: agents = [] } = useAiAgents();
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

  // Hitung berapa channel integrasi eksternal yang terhubung (X/Y Channel Terhubung)
  const channelStats = useMemo(() => {
    const map = new Map<string, string>();
    for (const ag of agents) {
      for (const dep of ag.dependencies ?? []) {
        const cur = map.get(dep.name);
        if (!cur || cur !== "connected") map.set(dep.name, dep.state);
      }
    }
    const total = map.size;
    const connected = [...map.values()].filter((s) => s === "connected").length;
    return { connected, total };
  }, [agents]);

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
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[#EAE4DA] bg-white/90 px-4 py-3 backdrop-blur-md sm:gap-3 sm:px-6">
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-lg border border-[#EAE4DA] text-[#656B73] hover:bg-[#FAF8F4] hover:text-[#232528] lg:hidden"
        onClick={onOpenNav}
        aria-label="Buka menu navigasi"
      >
        <Menu className="size-4" />
      </button>

      {/* Tombol Kembali ke Admin Livora yang selalu terlihat di desktop & mobile */}
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-1.5 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8] hover:bg-[#EDF4F8]"
      >
        <ArrowLeft className="size-3.5 text-[#5E93B8]" />
        <span className="hidden sm:inline">Kembali ke Admin Livora</span>
        <span className="sm:hidden">Admin</span>
      </Link>

      {/* Pill Status Mesin AI & Channel */}
      <span className="hidden items-center gap-2 md:flex">
        <Pill tone={isLive ? "success" : "warning"}>
          <StatusDot tone={isLive ? "success" : "warning"} pulse={isLive} />
          Mesin AI: {isLive ? "Aktif" : "Belum Aktif"}
          {channelStats.total > 0 ? ` · ${channelStats.connected}/${channelStats.total} Channel Terhubung` : ""}
        </Pill>
      </span>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={isRefreshing}
          title="Muat ulang semua data marketing"
          className="flex size-8 items-center justify-center rounded-lg border border-[#EAE4DA] text-[#656B73] transition-colors hover:bg-[#FAF8F4] hover:text-[#232528] disabled:opacity-50"
          aria-label="Muat ulang data"
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-ai")} />
        </button>

        <DropdownMenu modal={false} open={dateOpen} onOpenChange={setDateOpen}>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-2.5 py-1.5 text-xs text-[#232528] transition-colors hover:border-[#5E93B8] sm:px-3">
            <CalendarDays className="size-3.5 shrink-0 text-[#5E93B8]" />
            <span className="hidden sm:inline">
              {dateRange.key === "custom" ? `${dateRange.from} → ${dateRange.to}` : `${dateRange.days} hari terakhir`}
            </span>
            <span className="sm:hidden">{dateRange.days} hr</span>
            <ChevronDown className="size-3 text-[#656B73]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Rentang Tanggal</DropdownMenuLabel>
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
                <span>{p.days} hari terakhir</span>
                {formatRangeLabel(dateRange) === p.label ? <span className="text-ai">✓</span> : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={thisMonth}>Bulan ini (MTD)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <div
              className="space-y-2 px-2 py-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <p className="label-eyebrow">Rentang Khusus</p>
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
                className="w-full rounded bg-[#232528] px-2.5 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Terapkan Tanggal
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={openAsk}
          aria-label="Tanya AI Marketing"
          className="flex items-center gap-1.5 rounded-lg bg-[#232528] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#35383d]"
        >
          <Sparkles className="size-3.5 text-[#8BC0E4]" />
          <span className="hidden sm:inline">Tanya AI</span>
        </button>

        <DropdownMenu modal={false} open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger
            className="relative flex size-8 items-center justify-center rounded-full border border-[#EAE4DA] text-[#656B73] transition-colors hover:border-[#5E93B8] hover:text-[#232528]"
            aria-label={unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Notifikasi"}
          >
            <Bell className="size-3.5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-w-[16px] items-center justify-center rounded-full bg-[#5E93B8] px-1 py-[1px] font-mono text-[9px] font-bold leading-none text-white shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[340px] p-0 sm:w-[380px]">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Notifikasi AI</span>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-ai/12 px-2 py-0.5 text-[10px] font-medium text-ai">
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
                        !a.read ? "bg-ai/[0.05]" : "opacity-80",
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
                        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{a.message}</p>
                        <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
                          <span className="uppercase">{a.agent}</span>
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

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-full border border-[#EAE4DA] bg-[#EDF4F8] text-xs font-semibold text-[#2D5B7C] transition-colors hover:border-[#5E93B8]">
            {(user?.name || "A").charAt(0).toUpperCase()}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="truncate">{user?.name ?? "Admin"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin">
                <Home className="mr-2 size-3.5" />
                Kembali ke Admin Livora
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function ShellBody({
  user,
  readOnly,
  children,
}: {
  user: any;
  readOnly: boolean;
  children: ReactNode;
}) {
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
    <div className="ai-marketing-scope min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#EAE4DA] bg-white transition-transform duration-300 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DA] px-5 py-4">
          <Link to="/admin/ai-marketing" className="flex items-center gap-2.5">
            <img src={livoraMark} alt="Livora" className="h-8 w-8 rounded-lg object-contain" />
            <div>
              <span className="font-header block text-base tracking-[0.12em] text-[#232528]">LIVORA</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[#5E93B8]">
                AI Marketing
              </span>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1 text-[#656B73] hover:bg-[#FAF8F4] lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Tutup navigasi"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="flex w-full items-center gap-2 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-2 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8] hover:bg-[#EDF4F8]"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#5E93B8]" /> Kembali ke Admin Livora
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
          className="block border-t border-[#EAE4DA] bg-[#FAF8F4]/70 px-5 py-3.5 transition-colors hover:bg-[#EDF4F8]/50"
        >
          <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#656B73]">
            <StatusDot tone={connectedNames.length > 0 ? "success" : "warning"} pulse={connectedNames.length > 0} />
            Mesin AI Terhubung
          </p>
          <p className="mt-1 truncate text-xs text-[#232528]">
            {connectedNames.length > 0 ? connectedNames.join(" · ") : "Periksa sambungan AI di Pengaturan"}
          </p>
        </Link>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
        />
      ) : null}

      <div className="lg:pl-[260px]">
        <ShellHeader user={user} onOpenNav={() => setOpen(true)} />

        {IS_MOCK_BACKEND && (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950 sm:px-6">
            <span className="inline-flex items-center gap-1.5">
              <FlaskConical className="size-3.5 text-amber-700" />
              MODE SIMULASI / DEMO — Data pada AI Marketing sedang menggunakan contoh mock (bukan data produksi).
            </span>
          </div>
        )}

        {readOnly && (
          <div className="border-b border-[#5E93B8]/30 bg-[#EDF4F8] px-4 py-2 text-center text-xs text-[#2D5B7C] sm:px-6">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="size-3.5" />
              <b>Mode Lihat Saja</b> — Anda dapat meninjau semua laporan marketing, namun perubahan/eksekusi hanya untuk akun dengan izin ubah.
            </span>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8">{children}</main>
      </div>

      <AskAIDrawer />
    </div>
  );
}

export default function AiMarketingShell() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const initialCache = getCachedAdminBootstrap();
  const [user, setUser] = useState<any>(() => initialCache?.user ?? null);
  const [permState, setPermState] = useState<{
    role: string;
    isOwner: boolean;
    permissions: Record<string, string>;
  } | null>(() =>
    initialCache
      ? {
          role: initialCache.perm?.role ?? initialCache.user?.admin_role ?? "viewer",
          isOwner: Boolean(initialCache.perm?.is_owner ?? initialCache.perm?.role === "owner"),
          permissions: initialCache.perm?.permissions ?? {},
        }
      : null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const hadScope = document.body.classList.contains("ai-marketing-scope");
    document.body.classList.add("ai-marketing-scope");
    return () => {
      if (!hadScope) document.body.classList.remove("ai-marketing-scope");
    };
  }, []);

  const bootstrap = useCallback(async (force = false) => {
    setLoadError(null);
    try {
      const boot = await fetchAdminBootstrap(force);
      const me = boot.user;
      const perm = boot.perm;
      setUser((prev: any) => (prev?.id === me?.id && prev?.admin_role === me?.admin_role ? prev : me));
      setPermState({
        role: perm?.role ?? me?.admin_role ?? "viewer",
        isOwner: Boolean(perm?.is_owner ?? perm?.role === "owner"),
        permissions: perm?.permissions ?? {},
      });
    } catch (err: any) {
      if (err?.code === "NOT_ADMIN") {
        toast.error("Akses ditolak. Khusus tim admin Livora.");
        navigateRef.current("/", { replace: true });
        return;
      }
      const status = err?.status ?? err?.response?.status;
      if (status === 401 || status === 403 || err?.kind === "unauthenticated") {
        rememberIntendedPath();
        toast.error("Sesi berakhir. Silakan masuk kembali.");
        navigateRef.current("/login", { replace: true });
        return;
      }
      setLoadError(err?.response?.data?.message || err?.message || "Gagal memuat panel AI Marketing. Silakan coba lagi.");
    }
  }, []);

  useEffect(() => {
    void bootstrap(false);
  }, [bootstrap]);

  const permissionContextValue = useMemo(() => {
    const role = permState?.role ?? "viewer";
    const isOwner = Boolean(permState?.isOwner);
    const permissions = permState?.permissions ?? {};
    const levelOf = (feature?: string): PermissionLevel => {
      if (isOwner) return "edit";
      if (!feature) return "view";
      const lv = permissions[feature];
      if (lv === "edit" || lv === "view" || lv === "none") return lv;
      return "none";
    };
    const marketingLevel = levelOf("marketing");
    return {
      user,
      role,
      isOwner,
      permissions,
      levelOf,
      canView: (f?: string) => levelOf(f) !== "none",
      canEdit: (f?: string) => levelOf(f) === "edit",
      currentLevel: marketingLevel,
    };
  }, [user, permState]);

  if (loadError) {
    return (
      <div className="ai-marketing-scope flex min-h-screen items-center justify-center bg-[#FAF8F4] p-6">
        <div className="w-full max-w-md space-y-4">
          <ErrorState message={loadError} onRetry={() => void bootstrap(true)} />
          <div className="text-center">
            <Link to="/admin" className="text-xs font-medium text-[#35678B] hover:underline">
              ← Kembali ke Admin Livora
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !permState) {
    return (
      <div className="ai-marketing-scope flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF8F4] text-[#232528]">
        <span className="flex size-11 items-center justify-center rounded-2xl border border-[#EAE4DA] bg-white shadow-sm">
          <Sparkles className="size-5 animate-pulse text-[#5E93B8]" />
        </span>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#656B73]">
          Memuat Livora AI Marketing…
        </p>
      </div>
    );
  }

  if (permissionContextValue.currentLevel === "none") {
    return (
      <div className="ai-marketing-scope flex min-h-screen items-center justify-center bg-[#FAF8F4] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#EAE4DA] bg-white p-8 text-center shadow-sm">
          <Lock className="mx-auto size-8 text-[#5E93B8]" />
          <h1 className="font-header mt-4 text-xl text-[#232528]">Akses AI Marketing Dibatasi</h1>
          <p className="mt-2 text-sm text-[#656B73]">
            Peran Anda saat ini belum memiliki izin membuka menu Marketing & AI Marketing. Hubungi Owner jika Anda membutuhkan akses.
          </p>
          <Link
            to="/admin"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#232528] px-5 text-xs font-medium text-white hover:bg-[#35383d]"
          >
            <ArrowLeft className="size-3.5" /> Kembali ke Admin Livora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdminDialogProvider>
      <AdminPermissionProvider value={permissionContextValue}>
        <AiMarketingProvider>
          <ShellBody user={user} readOnly={permissionContextValue.currentLevel === "view"}>
            <Suspense
              fallback={
                <div className="space-y-4 py-4" aria-busy="true" aria-label="Memuat halaman">
                  <div className="h-8 w-56 animate-pulse rounded-lg bg-[#EAE4DA]/70" />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-24 animate-pulse rounded-xl bg-white border border-[#EAE4DA]" />
                    ))}
                  </div>
                  <div className="h-64 animate-pulse rounded-xl bg-white border border-[#EAE4DA]" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ShellBody>
        </AiMarketingProvider>
      </AdminPermissionProvider>
    </AdminDialogProvider>
  );
}
