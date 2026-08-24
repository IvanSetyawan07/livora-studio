import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { rememberIntendedPath } from "@/lib/authGuard";
import {
  Activity,
  Bell,
  Boxes,
  CalendarDays,
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
import { activity } from "@/lib/ai/data";
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

const dateRangeOptions = ["Last 7 days", "Last 14 days", "Last 30 days", "This month"];

function ShellHeader({ user, onOpenNav }: { user: any; onOpenNav: () => void }) {
  const { openAsk } = useAiMarketingContext();
  const [dateRange, setDateRange] = useState(dateRangeOptions[0]);
  const recentActivity = activity.slice(0, 4);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md sm:px-6">
      <button className="lg:hidden" onClick={onOpenNav} aria-label="Open navigation">
        <Menu className="size-4" />
      </button>

      <span className="hidden items-center gap-2 sm:flex">
        <span className="flex size-6 items-center justify-center rounded-md bg-ai/12">
          <Sparkles className="size-3 text-ai" />
        </span>
        <span className="label-eyebrow">AI System</span>
        <Pill tone="warning">
          <StatusDot tone="warning" pulse />
          Preview
        </Pill>
      </span>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="hidden items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex">
            <CalendarDays className="size-3.5" />
            {dateRange}
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Date range</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {dateRangeOptions.map((opt) => (
              <DropdownMenuItem key={opt} onClick={() => setDateRange(opt)}>
                {opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={openAsk}
          className="flex items-center gap-1.5 rounded-sm bg-ai px-3 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
        >
          <Sparkles className="size-3.5" />
          Ask AI
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex size-8 items-center justify-center rounded-full border border-border-strong text-muted-foreground transition-colors hover:text-foreground">
            <Bell className="size-3.5" />
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-insight" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentActivity.map((a) => (
              <DropdownMenuItem key={a.id} className="flex flex-col items-start gap-0.5 whitespace-normal">
                <span className="text-xs text-foreground/90">{a.message}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(a.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </DropdownMenuItem>
            ))}
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

        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <StatusDot tone="warning" /> Claude orchestration
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting Laravel API integration</p>
        </div>
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

  if (!user) return null;

  return (
    <AiMarketingProvider>
      <ShellBody user={user}>
        <Outlet />
      </ShellBody>
    </AiMarketingProvider>
  );
}
