import { QrCode as QrCodeIcon } from "lucide-react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, authStorage } from "@/lib/api";
import LanguageSwitcher from "@/components/livora/LanguageSwitcher";
import {
  LayoutDashboard,
  FolderKanban,
  Sofa,
  Tags,
  Star,
  BarChart3,
  Image as ImageIcon,
  LogOut,
  BookOpen,
  Users,
  MessageCircle,
  Bookmark,
  Mail,
  Menu,
  X,
  Home,
} from "lucide-react";

const nav = [
  { to: "/admin", end: true, key: "overview", icon: LayoutDashboard },
  { to: "/admin/projects", key: "projects", icon: FolderKanban },
  { to: "/admin/items", key: "items", icon: Sofa },
  { to: "/admin/scan", key: "scan", icon: QrCodeIcon },
  { to: "/admin/collections", key: "collections", icon: BookOpen },
  { to: "/admin/catalogs", key: "catalogs", icon: BookOpen },
  { to: "/admin/taxonomies", key: "taxonomies", icon: Tags },
  { to: "/admin/landing", key: "landing", icon: Star },
  { to: "/admin/banners", key: "banners", icon: ImageIcon },
  { to: "/admin/users", key: "users", icon: Users },
  { to: "/admin/consultations", key: "consultations", icon: MessageCircle },
  { to: "/admin/wishlists", key: "wishlists", icon: Bookmark },
  { to: "/admin/support", key: "support", icon: MessageCircle },
  { to: "/admin/analytics", key: "analytics", icon: BarChart3 },
  { to: "/admin/marketing", key: "marketing", icon: Mail },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me");
        if (data?.role !== "admin") {
          alert(t("admin.access_denied"));
          navigate("/");
          return;
        }
        setUser(data);
      } catch {
        navigate("/login");
      }
    })();
    const h = setInterval(() => api.post("/heartbeat").catch(() => {}), 30000);
    api.post("/heartbeat").catch(() => {});
    return () => clearInterval(h);
  }, [navigate, t]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const logout = async () => {
    try { await api.post("/logout"); } catch {}
    authStorage.clear();
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="p-6 border-b border-border">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Livora
        </p>
        <h1 className="serif text-2xl mt-1">{t("admin.panel")}</h1>
      </div>

      <div className="px-3 pt-3">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm border border-border hover:bg-muted text-foreground/80"
        >
          <Home className="w-4 h-4" /> {t("admin.back_to_site")}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                isActive
                  ? "bg-foreground text-background"
                  : "text-foreground/80 hover:bg-muted"
              }`
            }
          >
            <n.icon className="w-4 h-4 shrink-0" />
            {t(`admin.nav.${n.key}`)}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <div className="px-3 py-1 text-xs text-muted-foreground">
          <p className="text-foreground truncate">{user.name}</p>
          <p className="truncate">{user.email}</p>
        </div>
        <div className="px-1">
          <LanguageSwitcher isLoggedIn variant="segmented" />
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-muted text-foreground/80"
        >
          <LogOut className="w-4 h-4" /> {t("admin.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          aria-label={t("admin.menu")}
          className="p-2 -ml-2 rounded hover:bg-muted"
        >
          <Menu className="w-5 h-5" />
        </button>
        <p className="serif text-lg truncate">{t("admin.panel")}</p>
        <LanguageSwitcher isLoggedIn />
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-card border-r border-border animate-slide-in-right">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-4 p-2 rounded hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-card sticky top-0 h-screen">
        {sidebar}
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
