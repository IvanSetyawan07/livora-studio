import { QrCode as QrCodeIcon } from "lucide-react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { clearSession, rememberIntendedPath } from "@/lib/authGuard";
import LanguageSwitcher from "@/components/livora/LanguageSwitcher";
import NotificationBell from "@/components/livora/NotificationBell.tsx";
import {
  getAdminActivities,
  getAdminActivitiesUnread,
  markAdminActivitiesRead,
} from "@/lib/adminConsultations";
import type { ConsultationActivity } from "@/lib/consultations";
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
  ShoppingBag,
  Wallet,
  Database,
  Inbox,
  LifeBuoy,
  Settings2,
  Activity,
  Bot,
  ShieldCheck,
  Eye,
} from "lucide-react";

const nav = [
  { to: "/admin", end: true, key: "overview", icon: LayoutDashboard },
  { to: "/admin/roles", key: "roles", label: "Peran & hak akses", icon: ShieldCheck, owner: true },
  { to: "/admin/projects", key: "projects", feature: "projects", icon: FolderKanban },
  { to: "/admin/items", key: "items", feature: "catalog", icon: Sofa },
  { to: "/admin/scan", key: "scan", feature: "catalog", icon: QrCodeIcon },
  { to: "/admin/collections", key: "collections", feature: "catalog", icon: BookOpen },
  { to: "/admin/catalogs", key: "catalogs", feature: "catalog", icon: BookOpen },
  { to: "/admin/taxonomies", key: "taxonomies", feature: "catalog", icon: Tags },
  { to: "/admin/landing", key: "landing", feature: "landing", icon: Star },
  { to: "/admin/banners", key: "banners", feature: "landing", icon: ImageIcon },
  { to: "/admin/users", key: "users", feature: "users", icon: Users },
  { to: "/admin/consultations", key: "consultations", feature: "consultations", icon: MessageCircle },
  { to: "/admin/shop/board", key: "shopBoard", feature: "shop_orders", label: "Pantau Proses", icon: Activity },
  { to: "/admin/shop/orders", key: "shopOrders", feature: "shop_orders", label: "Pesanan", icon: ShoppingBag },
  { to: "/admin/shop/inbox", key: "shopInbox", feature: "shop_inbox", label: "Inbox WhatsApp", icon: Inbox },
  { to: "/admin/shop/payments", key: "shopPayments", feature: "shop_payments", label: "Verifikasi bayar", icon: Wallet },
  { to: "/admin/shop/aftercare", key: "shopAftercare", feature: "shop_aftercare", label: "Klaim & Refund", icon: LifeBuoy },
  { to: "/admin/shop/database", key: "shopDatabase", feature: "shop_database", label: "Database toko", icon: Database },
  { to: "/admin/shop/scan", key: "shopScan", feature: "shop_orders", label: "Scan dokumen", icon: QrCodeIcon },
  { to: "/admin/shop/health", key: "shopHealth", feature: "shop_system", label: "Kesehatan & funnel", icon: Activity },
  { to: "/admin/shop/settings", key: "shopSettings", feature: "shop_system", label: "Pengaturan toko", icon: Settings2 },
  { to: "/admin/shop/bot-simulator", key: "shopBot", feature: "shop_system", label: "Simulator bot", icon: Bot },
  { to: "/admin/shop/bot-logs", key: "shopBotLogs", feature: "shop_system", label: "Log AI & uji", icon: FileText },
  { to: "/admin/wishlists", key: "wishlists", feature: "wishlists", icon: Bookmark },
  { to: "/admin/support", key: "support", feature: "support", icon: MessageCircle },
  { to: "/admin/analytics", key: "analytics", feature: "analytics", icon: BarChart3 },
  { to: "/admin/marketing", key: "marketing", feature: "marketing", icon: Mail },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<ConsultationActivity[]>([]);
  const [unreadActivities, setUnreadActivities] = useState(0);
  const [perm, setPerm] = useState<{ role: string; permissions: Record<string, string> } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me");
        if (data?.role !== "admin") {
          toast.error(t("admin.access_denied"));
          navigate("/", { replace: true });
          return;
        }
        setUser(data);
        api.get("/admin/my-permissions").then((r) => setPerm(r.data)).catch(() => {});
      } catch {
        rememberIntendedPath();
        toast.error("Silakan masuk terlebih dahulu");
        navigate("/login", { replace: true });
      }
    })();
    const h = setInterval(() => api.post("/heartbeat").catch(() => {}), 30000);
    api.post("/heartbeat").catch(() => {});
    return () => clearInterval(h);
  }, [navigate, t]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () => {
      Promise.all([getAdminActivities(), getAdminActivitiesUnread()])
        .then(([acts, unread]) => {
          if (cancelled) return;
          setActivities(acts);
          setUnreadActivities(unread);
        })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 20000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [user]);

  const handleBellOpen = () => {
    if (unreadActivities === 0) return;
    markAdminActivitiesRead()
      .then(() => {
        setUnreadActivities(0);
        setActivities((prev) => prev.map((a) => ({ ...a, admin_read_at: a.admin_read_at ?? new Date().toISOString() })));
      })
      .catch(() => {});
  };

  const logout = async () => {
    try { await api.post("/logout"); } catch {}
    clearSession();
    navigate("/login");
  };

  if (!user) return null;

  const isOwner = !perm || perm.role === "owner";
  const levelOf = (f?: string) => (!f || isOwner ? "edit" : perm?.permissions?.[f] ?? "none");
  const visibleNav = nav.filter((n: any) => (n.owner ? isOwner : levelOf(n.feature) !== "none"));
  const current = [...nav].sort((a, b) => b.to.length - a.to.length).find((n: any) => n.to !== "/admin" && location.pathname.startsWith(n.to)) as any;
  const currentLevel = current ? (current.owner ? (isOwner ? "edit" : "none") : levelOf(current.feature)) : "edit";

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
        {visibleNav.map((n) => (
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
            {t(`admin.nav.${n.key}`, { defaultValue: (n as { label?: string }).label ?? n.key })}
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
        <div className="flex items-center gap-1">
          <NotificationBell
            activities={activities}
            unreadCount={unreadActivities}
            readField="admin_read_at"
            onOpen={handleBellOpen}
            onItemClick={(a) => navigate(`/admin/consultations/${a.consultation_id}`)}
            label="Notifications"
          />
          <LanguageSwitcher isLoggedIn />
        </div>
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
        <div className="hidden lg:flex justify-end px-6 pt-4">
          <NotificationBell
            activities={activities}
            unreadCount={unreadActivities}
            readField="admin_read_at"
            onOpen={handleBellOpen}
            onItemClick={(a) => navigate(`/admin/consultations/${a.consultation_id}`)}
            label="Notifications"
          />
        </div>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10">
          {currentLevel === "none" ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Peran Anda tidak memiliki akses ke halaman ini. Hubungi Owner bila perlu akses.
            </div>
          ) : (
            <>
              {currentLevel === "view" && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4 shrink-0" /> Mode lihat saja — peran Anda tidak bisa mengubah data di halaman ini.
                </div>
              )}
              <Outlet />
            </>
          )}
        </div>
      </main>
    </div>
  );
}