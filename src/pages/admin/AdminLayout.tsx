import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Eye, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { clearSession, rememberIntendedPath } from "@/lib/authGuard";
import AdminNotificationCenter from "@/components/admin/layout/AdminNotificationCenter";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import AdminTopbar from "@/components/admin/layout/AdminTopbar";
import { matchNav } from "@/components/admin/layout/adminNav";
import { AdminDialogProvider, ErrorState } from "@/components/admin/kit";
import LanguageSwitcher from "@/components/livora/LanguageSwitcher";
import {
  getAdminActivities,
  getAdminActivitiesUnread,
  markAdminActivitiesRead,
} from "@/lib/adminConsultations";
import type { ConsultationActivity } from "@/lib/consultations";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authRetry, setAuthRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<ConsultationActivity[]>([]);
  const [unreadActivities, setUnreadActivities] = useState(0);
  const [perm, setPerm] = useState<{ role: string; permissions: Record<string, string> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAuthError(null);
    (async () => {
      try {
        const { data } = await api.get("/me");
        if (cancelled) return;
        if (data?.role !== "admin") {
          toast.error(t("admin.access_denied"));
          navigate("/", { replace: true });
          return;
        }
        setUser(data);
        api.get("/admin/my-permissions").then((r) => !cancelled && setPerm(r.data)).catch(() => {});
      } catch (err: any) {
        if (cancelled) return;
        const status = err?.status ?? err?.response?.status;
        if (status === 401 || status === 403 || err?.kind === "unauthenticated") {
          rememberIntendedPath();
          toast.error("Silakan masuk terlebih dahulu");
          navigate("/login", { replace: true });
          return;
        }
        setAuthError(err?.message || "Server sedang bermasalah (HTTP 500). Coba muat ulang.");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, authRetry]);

  // Heartbeat hanya saat admin sudah terautentikasi dan tab browser terlihat (hemat koneksi DB).
  useEffect(() => {
    if (!user) return;
    const ping = () => {
      if (document.visibilityState === "visible") api.post("/heartbeat").catch(() => {});
    };
    ping();
    const h = window.setInterval(ping, 60000);
    return () => window.clearInterval(h);
  }, [user]);

  // Tutup drawer mobile saat pindah halaman + scroll ke atas.
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Kunci scroll body & tutup dengan Esc saat drawer terbuka.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      Promise.all([getAdminActivities(), getAdminActivitiesUnread()])
        .then(([acts, unread]) => {
          if (cancelled) return;
          setActivities(acts);
          setUnreadActivities(unread);
        })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 25000);
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

  if (authError && !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-md">
          <ErrorState
            title="Gagal terhubung ke server"
            description={authError}
            onRetry={() => setAuthRetry((n) => n + 1)}
          />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isOwner = !perm || perm.role === "owner";
  const levelOf = (f?: string) => (!f || isOwner ? "edit" : perm?.permissions?.[f] ?? "none");
  const current = matchNav(location.pathname)?.item;
  const currentLevel = current && current.to !== "/admin"
    ? (current.owner ? (isOwner ? "edit" : "none") : levelOf(current.feature))
    : "edit";

  const sidebar = (
    <AdminSidebar
      user={user}
      isOwner={isOwner}
      levelOf={levelOf}
      badges={{ consultations: unreadActivities }}
      onLogout={logout}
      panelLabel={t("admin.panel")}
      backLabel={t("admin.back_to_site")}
      logoutLabel={t("admin.logout")}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <AdminDialogProvider>
      <div className="min-h-screen bg-background lg:flex">
        {/* Desktop sticky sidebar */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border bg-card lg:flex">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
              <motion.aside
                className="relative h-full w-80 max-w-[85vw] border-r border-border bg-card shadow-2xl"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
              >
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="absolute right-3 top-5 z-10 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
                {sidebar}
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <div className="min-w-0 flex-1">
          <AdminTopbar onMenu={() => setOpen(true)} menuLabel={t("admin.menu")}>
            <AdminNotificationCenter
              activities={activities}
              unreadActivities={unreadActivities}
              onOpenActivities={handleBellOpen}
              onActivityClick={(a) => navigate(`/admin/consultations/${a.consultation_id}`)}
            />
            <div className="lg:hidden">
              <LanguageSwitcher isLoggedIn />
            </div>
          </AdminTopbar>

          <main className="overflow-x-hidden">
            <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
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
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Outlet />
                  </motion.div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
      </AdminDialogProvider>
    </MotionConfig>
  );
}
