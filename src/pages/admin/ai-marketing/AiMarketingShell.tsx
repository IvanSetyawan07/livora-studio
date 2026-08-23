import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { rememberIntendedPath } from "@/lib/authGuard";
import {
  Activity,
  BarChart3,
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
} from "lucide-react";
import { StatusDot } from "@/components/ai/primitives";
import "@/styles/ai-marketing.css";

const nav = [
  {
    group: "AI Marketing",
    items: [
      { to: "/admin/ai-marketing", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/admin/ai-marketing/insights", label: "AI Insights", icon: Sparkles },
      { to: "/admin/ai-marketing/seo", label: "SEO Agent", icon: LineChart },
      { to: "/admin/ai-marketing/content", label: "Content Agent", icon: PenLine },
      { to: "/admin/ai-marketing/ads", label: "Ads Agent", icon: Megaphone },
      { to: "/admin/ai-marketing/leads", label: "Lead Intelligence", icon: Users },
      { to: "/admin/ai-marketing/cro", label: "CRO Agent", icon: MousePointerClick },
    ],
  },
  {
    group: "Governance",
    items: [
      { to: "/admin/ai-marketing/approvals", label: "Approvals", icon: CheckCircle2 },
      { to: "/admin/ai-marketing/activity", label: "Activity", icon: Activity },
      { to: "/admin/ai-marketing/settings", label: "Settings", icon: Cog },
    ],
  },
];

export default function AiMarketingShell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
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

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pt-4 pb-6">
          {nav.map((group) => (
            <div key={group.group}>
              <p className="label-eyebrow px-3 pb-2">{group.group}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={"end" in item ? item.end : false}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors duration-200 ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`
                      }
                    >
                      <item.icon className="size-3.5 text-brass" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
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

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="size-4" />
          </button>
          <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <Bot className="size-3.5 text-brass" />
            AI system · <StatusDot tone="warning" /> partial
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full border border-border-strong text-[11px] tracking-widest">
              {(user.name || "A").charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
