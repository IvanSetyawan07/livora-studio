import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Eye, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { clearSession, rememberIntendedPath } from "@/lib/authGuard";
import AdminNotificationCenter from "@/components/admin/layout/AdminNotificationCenter";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import AdminTopbar, { resolveAdminPageTitle } from "@/components/admin/layout/AdminTopbar";
import { matchNav, resolveNavItemLevel } from "@/components/admin/layout/adminNav";
import { AdminDialogProvider, ErrorState } from "@/components/admin/kit";
import {
  AdminPermissionProvider,
  fetchAdminBootstrap,
  getCachedAdminBootstrap,
  type PermissionLevel,
} from "@/components/admin/AdminPermissionContext";
import {
  getAdminActivities,
  getAdminActivitiesUnread,
  markAdminActivitiesRead,
} from "@/lib/adminConsultations";
import type { ConsultationActivity } from "@/lib/consultations";
import { Skeleton } from "@/components/ui/skeleton";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  cs: "Customer Service",
  finance: "Keuangan",
  warehouse: "Gudang & Pengiriman",
  content: "Konten & Katalog",
  marketing: "Marketing",
  viewer: "Lihat Saja",
};

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches);
    setDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

function AdminPageSuspenseFallback() {
  return (
    <div className="space-y-5 py-2" aria-busy="true" aria-label="Memuat halaman">
      <Skeleton className="h-8 w-56 rounded-lg" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const location = useLocation();
  const isDesktop = useIsDesktop();

  const initialCache = getCachedAdminBootstrap();
  const [user, setUser] = useState<any>(() => initialCache?.user ?? null);
  const [perm, setPerm] = useState<{ role: string; permissions: Record<string, string> } | null>(
    () => initialCache?.perm ?? null,
  );
  const [loadingAuth, setLoadingAuth] = useState(() => !initialCache);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authRetry, setAuthRetry] = useState(0);
  const [open, setOpen] = useState(false);

  const [activities, setActivities] = useState<ConsultationActivity[]>([]);
  const [unreadActivities, setUnreadActivities] = useState(0);
  const [liveBadges, setLiveBadges] = useState<Record<string, number>>({});

  // Cek sesi login + hak akses SEKALI saat masuk Admin (tidak diulang tiap klik menu!).
  // Catatan penting: jangan masukkan `navigate` ke dependency array karena di React Router v6
  // referensi `useNavigate()` berubah setiap pindah URL dan akan me-reset seluruh layout.
  useEffect(() => {
    let cancelled = false;
    const cached = getCachedAdminBootstrap();
    if (!cached || authRetry > 0) {
      setLoadingAuth(true);
    }
    setAuthError(null);
    (async () => {
      try {
        const boot = await fetchAdminBootstrap(authRetry > 0);
        if (cancelled) return;
        setUser((prev: any) => (prev?.id === boot.user?.id && prev?.admin_role === boot.user?.admin_role ? prev : boot.user));
        setPerm((prev) =>
          prev && prev.role === boot.perm.role && JSON.stringify(prev.permissions) === JSON.stringify(boot.perm.permissions)
            ? prev
            : boot.perm,
        );
      } catch (err: any) {
        if (cancelled) return;
        if (err?.code === "NOT_ADMIN") {
          toast.error("Anda tidak memiliki akses ke halaman Admin.");
          navigateRef.current("/", { replace: true });
          return;
        }
        const status = err?.status ?? err?.response?.status;
        if (status === 401 || status === 403 || err?.kind === "unauthenticated") {
          rememberIntendedPath();
          toast.error("Silakan masuk terlebih dahulu");
          navigateRef.current("/login", { replace: true });
          return;
        }
        setAuthError(err?.message || "Server sedang bermasalah. Coba muat ulang.");
      } finally {
        if (!cancelled) setLoadingAuth(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authRetry]);

  // Heartbeat saat admin aktif di tab browser
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

  // Kunci scroll body & tutup dengan Esc saat drawer mobile terbuka.
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

  const isOwner = perm?.role === "owner";

  const levelOf = useCallback(
    (feature?: string): PermissionLevel => {
      if (!perm) return "none";
      if (!feature || isOwner) return "edit";
      const val = perm.permissions?.[feature];
      return val === "edit" || val === "view" ? val : "none";
    },
    [perm, isOwner],
  );

  // Poll aktivitas konsultasi & badge antrian (hanya untuk fitur yang boleh diakses peran ini)
  useEffect(() => {
    if (!user || !perm) return;
    let cancelled = false;

    const canConsult = levelOf("consultations") !== "none";
    const canShopSummary = levelOf("shop_orders") !== "none";
    const canSupport = levelOf("support") !== "none";

    const loadAll = () => {
      if (document.visibilityState !== "visible") return;

      if (canConsult) {
        Promise.all([getAdminActivities(), getAdminActivitiesUnread()])
          .then(([acts, unread]) => {
            if (cancelled) return;
            setActivities(acts);
            setUnreadActivities(unread);
          })
          .catch(() => {});
      }

      if (canShopSummary) {
        api
          .get("/admin/shop/summary")
          .then((r) => {
            if (cancelled || !r.data) return;
            const d = r.data;
            setLiveBadges((prev) => ({
              ...prev,
              shopInbox: Number(d.chat_menunggu ?? 0),
              shopPayments: Number(d.verifikasi ?? 0),
              shopOrders: Number(d.perlu_harga ?? 0) + Number(d.bermasalah ?? 0),
            }));
          })
          .catch(() => {});
      }

      if (canSupport) {
        api
          .get("/admin/support/sessions", { params: { status: "pending_cs" } })
          .then((r) => {
            if (cancelled) return;
            const list = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
            setLiveBadges((prev) => ({ ...prev, support: list.length }));
          })
          .catch(() => {});
      }
    };

    loadAll();
    const id = window.setInterval(loadAll, 25000);
    const onVis = () => {
      if (document.visibilityState === "visible") loadAll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user, perm, levelOf]);

  const handleMarkAllConsultRead = () => {
    if (unreadActivities === 0) return;
    markAdminActivitiesRead()
      .then(() => {
        setUnreadActivities(0);
        setActivities((prev) => prev.map((a) => ({ ...a, admin_read_at: a.admin_read_at ?? new Date().toISOString() })));
      })
      .catch(() => {});
  };

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch {
      /* abaikan */
    }
    clearSession();
    navigate("/login");
  };

  const currentMatch = matchNav(location.pathname);
  const currentItem = currentMatch?.item;
  const currentLevel: PermissionLevel = useMemo(() => {
    if (!perm) return "none";
    if (!currentItem || currentItem.to === "/admin") return "edit";
    return resolveNavItemLevel(currentItem, isOwner, levelOf);
  }, [perm, currentItem, isOwner, levelOf]);

  const permissionContextValue = useMemo(
    () => ({
      user,
      role: perm?.role ?? "viewer",
      isOwner,
      permissions: perm?.permissions ?? {},
      levelOf,
      canView: (f?: string) => levelOf(f) !== "none",
      canEdit: (f?: string) => levelOf(f) === "edit",
      currentLevel,
    }),
    [user, perm, isOwner, levelOf, currentLevel],
  );

  if (authError && !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAF8F4] p-6">
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

  if (loadingAuth || !user || !perm) {
    return (
      <div className="flex min-h-screen bg-[#FAF8F4]">
        <div className="hidden w-72 shrink-0 border-r border-[#EAE4DA] bg-white p-5 lg:block">
          <Skeleton className="h-10 w-44 rounded-lg" />
          <Skeleton className="mt-4 h-9 w-full rounded-lg" />
          <div className="mt-6 space-y-2.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6 lg:p-10">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-6 h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const allBadges: Record<string, number> = {
    ...liveBadges,
    consultations: unreadActivities,
  };

  const roleLabel = ROLE_LABEL[perm.role] ?? perm.role;
  const pageTitle = resolveAdminPageTitle(location.pathname);

  return (
    <MotionConfig reducedMotion="user">
      <AdminDialogProvider>
        <AdminPermissionProvider value={permissionContextValue}>
          <div className="min-h-screen bg-[#FAF8F4] text-[#232528] lg:flex">
            {/* Desktop sticky sidebar (hanya di-mount saat desktop agar 1 Ctrl+K & 1 layoutId) */}
            {isDesktop && (
              <aside className="sticky top-0 flex h-screen w-72 shrink-0 border-r border-[#EAE4DA] bg-white">
                <AdminSidebar
                  user={user}
                  roleLabel={roleLabel}
                  isOwner={isOwner}
                  levelOf={levelOf}
                  badges={allBadges}
                  onLogout={logout}
                  layoutIdPrefix="admin-nav-desktop"
                />
              </aside>
            )}

            {/* Mobile drawer */}
            {!isDesktop && (
              <AnimatePresence>
                {open && (
                  <div className="fixed inset-0 z-50 flex">
                    <motion.div
                      className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setOpen(false)}
                    />
                    <motion.aside
                      className="relative h-full w-80 max-w-[85vw] border-r border-[#EAE4DA] bg-white shadow-2xl"
                      initial={{ x: "-100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "-100%" }}
                      transition={{ type: "spring", stiffness: 380, damping: 38 }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Tutup menu"
                        className="absolute right-3 top-4 z-10 rounded-lg p-2 text-[#656B73] transition-colors hover:bg-[#FAF8F4] hover:text-[#232528]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <AdminSidebar
                        user={user}
                        roleLabel={roleLabel}
                        isOwner={isOwner}
                        levelOf={levelOf}
                        badges={allBadges}
                        onLogout={logout}
                        layoutIdPrefix="admin-nav-mobile"
                      />
                    </motion.aside>
                  </div>
                )}
              </AnimatePresence>
            )}

            <div className="min-w-0 flex-1">
              <AdminTopbar onMenu={() => setOpen(true)} menuLabel="Buka menu navigasi">
                <AdminNotificationCenter
                  activities={activities}
                  unreadActivities={unreadActivities}
                  pageTitle={pageTitle}
                  onMarkAllActivitiesRead={handleMarkAllConsultRead}
                  onActivityClick={(a) => navigate(`/admin/consultations/${a.consultation_id}`)}
                />
              </AdminTopbar>

              <main className="overflow-x-hidden">
                <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-9">
                  {currentLevel === "none" ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#EAE4DA] bg-white px-6 py-14 text-center">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#EDF4F8] text-[#5E93B8]">
                        <ShieldAlert className="h-6 w-6" />
                      </div>
                      <h2 className="font-header mt-4 text-xl text-[#232528]">Akses Halaman Terbatas</h2>
                      <p className="mt-1.5 max-w-md text-sm text-[#656B73]">
                        Peran Anda ({roleLabel}) belum memiliki izin untuk membuka halaman ini. Hubungi Owner jika Anda
                        memerlukan akses.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/admin")}
                        className="mt-5 rounded-full bg-[#232528] px-5 py-2 text-sm text-white hover:bg-[#34383D]"
                      >
                        Kembali ke Ringkasan Harian
                      </button>
                    </div>
                  ) : (
                    <>
                      {currentLevel === "view" && (
                        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#5E93B8]/30 bg-[#EDF4F8]/70 px-4 py-2.5 text-sm text-[#35678B]">
                          <Eye className="h-4 w-4 shrink-0" />
                          <span>
                            <strong>Mode lihat saja</strong> — Peran Anda ({roleLabel}) dapat melihat data ini namun
                            tidak bisa mengubah atau menghapusnya.
                          </span>
                        </div>
                      )}
                      <Suspense fallback={<AdminPageSuspenseFallback />}>
                        <motion.div
                          key={location.pathname}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <Outlet />
                        </motion.div>
                      </Suspense>
                    </>
                  )}
                </div>
              </main>
            </div>
          </div>
        </AdminPermissionProvider>
      </AdminDialogProvider>
    </MotionConfig>
  );
}
