import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { rememberIntendedPath } from "@/lib/authGuard";
import {
  Activity,
  Bot,
  CheckCircle2,
  Cog,
  Home,
  LayoutDashboard,
  LineChart,
  Megaphone,
  Menu,
  MousePointerClick,
  PenLine,
  Sparkles,
  Users,
  X,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Server,
  ShieldCheck
} from "lucide-react";
import { StatusDot } from "@/components/ai/primitives";
import { MarketingAiDrawer } from "@/components/ai/MarketingAiDrawer"; // Pastikan import ini sesuai dengan lokasi file Drawer di Phase 1
import "@/styles/ai-marketing.css";

// 1. STRUKTUR NAVIGASI (Dengan sistem grup/dropdown)
const navConfig = [
  {
    isStandalone: true,
    to: "/admin/ai-marketing/overview",
    label: "Overview",
    icon: LayoutDashboard,
    end: true
  },
  {
    title: "AI Center",
    icon: Sparkles,
    defaultOpen: true,
    items: [
      { to: "/admin/ai-marketing/recommendations", label: "Recommendations" },
      { to: "/admin/ai-marketing/actions", label: "Actions Hub" }
    ]
  },
  {
    title: "Agents",
    icon: Bot,
    defaultOpen: false,
    items: [
      { to: "/admin/ai-marketing/seo", label: "SEO Agent" },
      { to: "/admin/ai-marketing/content", label: "Content Agent" },
      { to: "/admin/ai-marketing/ads", label: "Ads Agent" },
      { to: "/admin/ai-marketing/leads", label: "Lead Intelligence" },
      { to: "/admin/ai-marketing/cro", label: "CRO Agent" }
    ]
  },
  {
    title: "Workspace",
    icon: Briefcase,
    defaultOpen: false,
    items: [
      { to: "/admin/ai-marketing/campaigns", label: "Campaigns" },
      { to: "/admin/ai-marketing/impact", label: "Impact Tracking" }
    ]
  },
  {
    title: "Governance",
    icon: ShieldCheck,
    defaultOpen: false,
    items: [
      { to: "/admin/ai-marketing/approvals", label: "Approvals" },
      { to: "/admin/ai-marketing/activity", label: "Activity Log" }
    ]
  },
  {
    title: "AI System",
    icon: Server,
    defaultOpen: false,
    items: [
      { to: "/admin/ai-marketing/usage", label: "Usage & Cost" },
      { to: "/admin/ai-marketing/routing", label: "Providers & Routing" },
      { to: "/admin/ai-marketing/settings", label: "Settings" }
    ]
  }
];

// 2. KOMPONEN NAVGROUP (Sekarang "controlled" oleh parent — tidak punya state sendiri lagi)
function NavGroup({
  group,
  isOpen,
  onToggle,
  onAutoOpen,
  setMobileOpen
}: {
  group: any;
  isOpen: boolean;
  onToggle: () => void;
  onAutoOpen: () => void;
  setMobileOpen: (v: boolean) => void;
}) {
  const location = useLocation();

  // Auto-open jika route aktif berada di dalam grup ini.
  // Ini tetap memanggil setter di parent (bukan state lokal lagi), jadi tetap konsisten
  // dengan aturan "cuma satu grup yang boleh terbuka".
  useEffect(() => {
    if (group.items.some((item: any) => location.pathname.includes(item.to))) {
      onAutoOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-sm text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <group.icon className="size-3.5 text-brass" />
          {group.title}
        </div>
        {isOpen ? <ChevronDown className="size-3.5 opacity-50" /> : <ChevronRight className="size-3.5 opacity-50" />}
      </button>

      {isOpen && (
        <ul className="mt-0.5 space-y-0.5 border-l border-sidebar-border/50 ml-4 pl-3">
          {group.items.map((item: any) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-sm px-3 py-1.5 text-[13px] transition-colors duration-200 ${
                    isActive
                      ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 3. MAIN COMPONENT
export default function AiMarketingShell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Satu state di parent untuk melacak grup mana yang terbuka (accordion).
  // Inisialnya diambil dari grup yang punya defaultOpen: true di navConfig.
  const [openGroupTitle, setOpenGroupTitle] = useState<string | null>(
    () => navConfig.find((g: any) => !g.isStandalone && g.defaultOpen)?.title ?? null
  );

  // State untuk AI Drawer
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

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
    <div className="dark ai-marketing-scope min-h-screen bg-background text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <Link to="/admin/ai-marketing" className="block">
            <span className="text-display block text-xl tracking-[0.28em]">LIVORA</span>
            <span className="label-eyebrow mt-1 block">Marketing Intelligence</span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm border border-sidebar-border hover:bg-sidebar-accent text-sidebar-foreground/80"
          >
            <Home className="w-4 h-4" /> Back to Admin Panel
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-6 pb-6">
          {navConfig.map((item, index) => {
            if (item.isStandalone) {
              return (
                <div key={index} className="mb-4">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors duration-200 ${
                        isActive
                          ? "bg-purple-600/20 text-purple-400 font-medium border border-purple-500/20"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }`
                    }
                  >
                    <item.icon className="size-3.5 text-brass" />
                    {item.label}
                  </NavLink>
                </div>
              );
            }
            return (
              <NavGroup
                key={index}
                group={item}
                isOpen={openGroupTitle === item.title}
                onToggle={() =>
                  setOpenGroupTitle((prev) => (prev === item.title ? null : (item.title as string)))
                }
                onAutoOpen={() => setOpenGroupTitle(item.title as string)}
                setMobileOpen={setOpen}
              />
            );
          })}
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

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="size-4" />
          </button>

          <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <Bot className="size-3.5 text-brass" />
            AI system · <StatusDot tone="success" /> Connected
          </span>

          <div className="ml-auto flex items-center gap-4">
            {/* Tombol ASK AI - Membuka Drawer */}
            <button
              onClick={() => setIsAiDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors"
            >
              <Sparkles className="size-3.5" />
              Ask AI
            </button>

            <span className="flex size-8 items-center justify-center rounded-full border border-border-strong text-[11px] tracking-widest cursor-pointer hover:bg-sidebar-accent transition-colors">
              {(user.name || "A").charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] pb-8">
          {/* Outlet adalah tempat di mana Component Halaman (seperti Overview atau Recommendations) dirender */}
          <Outlet />
        </main>
      </div>

      {/* Komponen Drawer AI Assistant */}
      <MarketingAiDrawer isOpen={isAiDrawerOpen} onClose={() => setIsAiDrawerOpen(false)} />
    </div>
  );
}