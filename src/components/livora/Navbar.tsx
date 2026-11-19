import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X, User, ChevronDown, ChevronRight, Plus, Search, ArrowLeft, Package, LogOut, Bookmark, ClipboardList, Shield, Camera, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/livora/LanguageSwitcher";
import SearchOverlay from "@/components/livora/SearchOverlay";
import CartNavButton from "@/components/shop/CartNavButton";
import NotificationBell from "@/components/livora/NotificationBell.tsx";
import { getMyActivities, markMyActivitiesRead, type ConsultationActivity } from "@/lib/consultations";
import { api, authStorage } from "@/lib/api";
import { getAllThumbnails, subscribeThumbnails } from "@/lib/themeThumbnails";
import { openShortlistDrawer, useShortlist } from "@/components/livora/furniture/shortlistStore";
import livoraMark from "@/assets/_opt/logo-livora-160.webp";
import { toast } from "sonner";
type NavLink = {
  label: string;
  to?: string;
  hash?: string;
  key: string;
  dropdown?: { label: string; to: string }[];
};

type FurnitureType = { id: number; name: string; slug: string; image?: string | null };

let cachedFurnitureTypes: FurnitureType[] | null = null;
let furnitureTypesPromise: Promise<FurnitureType[]> | null = null;

function loadFurnitureTypes(): Promise<FurnitureType[]> {
  if (cachedFurnitureTypes) return Promise.resolve(cachedFurnitureTypes);
  if (!furnitureTypesPromise) {
    furnitureTypesPromise = api
      .get<FurnitureType[]>("/taxonomies/furniture-types")
      .then((r) => {
        cachedFurnitureTypes = r.data ?? [];
        return cachedFurnitureTypes;
      })
      .catch(() => {
        furnitureTypesPromise = null;
        return [];
      });
  }
  return furnitureTypesPromise;
}

type OverlayView = "main" | "furniture";

export const Navbar = () => {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [overlayView, setOverlayView] = useState<OverlayView>("main");
  const [furnitureMounted, setFurnitureMounted] = useState(false);
  const [furnitureShown, setFurnitureShown] = useState(false);
  const [furnitureTypes, setFurnitureTypes] = useState<FurnitureType[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, any>>({});
  const [authUser, setAuthUser] = useState<{ name: string; email?: string; role?: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activities, setActivities] = useState<ConsultationActivity[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { count: shortlistCount } = useShortlist();
  const isFurniturePage = location.pathname === "/furniture";

  // Shortcut keyboard Cmd/Ctrl + K untuk Search Overlay
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Halaman login/register: di mobile navbar menimpa foto hero (teks putih),
  // di desktop berada di strip putih (teks gelap).
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsMobileView(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";


  // Links shown inside the hamburger overlay (both desktop & mobile).
  const menuLinks: NavLink[] = [
  { key: "promo", label: "PROMO SPESIAL", to: "/promo" },
  { key: "furniture", label: t("nav.furniture"), to: "/furniture" },
  { key: "projects", label: t("nav.projects"), to: "/projects" },
  {
    key: "catalog",
    label: t("nav.catalog"),
    dropdown: [
      { label: t("nav.catalog_items.living_rooms"), to: "/catalog/living-rooms" },
      { label: t("nav.catalog_items.dining_rooms"), to: "/catalog/dining-rooms" },
      { label: t("nav.catalog_items.bedrooms"), to: "/catalog/bedrooms" },
      { label: t("nav.catalog_items.outdoor_spaces"), to: "/catalog/outdoor-spaces" },
      { label: t("nav.catalog_items.office_spaces"), to: "/catalog/office-spaces" },
      { label: t("nav.catalog_items.public_spaces"), to: "/catalog/public-spaces" },
    ],
  },
  { key: "collection", label: t("nav.collection"), to: "/collection" },
  { key: "appointment", label: t("nav.appointment"), to: "/appointment" },
];

  // Quick links always visible on desktop header (brand continuity with livoralcr.com).
  const desktopQuickLinks: NavLink[] = [
    { key: "promo", label: "PROMO", to: "/promo" },
    { key: "about", label: t("nav.about"), to: "/about" },
    { key: "style", label: t("nav.style"), hash: "style" },
    { key: "furniture", label: t("nav.furniture"), to: "/furniture" },
    { key: "scope", label: t("nav.scope"), hash: "scope" },
    { key: "contact", label: t("nav.contact"), hash: "contact" },
  ];

  const transparentTop = !scrolled;
  const lightText =
    !scrolled &&
    (location.pathname === "/" ||
      location.pathname === "/furniture" ||
      (isAuthPage && isMobileView) ||
      location.pathname === "/appointment" ||
      location.pathname === "/promo" ||
      /^\/catalog\/[^/]+$/.test(location.pathname) ||
      /^\/catalog\/[^/]+\/[^/]+$/.test(location.pathname) ||
      /^\/projects\/[^/]+$/.test(location.pathname) ||
      location.pathname === "/collection" ||
      /^\/collection\/[^/]+$/.test(location.pathname) ||
      /^\/collection\/[^/]+\/[^/]+$/.test(location.pathname));

  const headerTransparent = open ? true : transparentTop;
  const headerLight = open ? true : lightText;

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      if (Math.abs(y - lastY) > 5) {
        if (y > lastY && y > 80) setHidden(true);
        else setHidden(false);
        lastY = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) setHidden(false);
  }, [open]);

  useEffect(() => {
    if (!open) setCatalogOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) setOverlayView("main");
  }, [open]);

  // Kontrol animasi buka/tutup panel FURNITUR (clip-path reveal dari garis batas navbar).
  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout>;
    if (overlayView === "furniture") {
      setFurnitureMounted(true);
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => setFurnitureShown(true));
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    } else {
      setFurnitureShown(false);
      hideTimeout = setTimeout(() => setFurnitureMounted(false), 500);
      return () => clearTimeout(hideTimeout);
    }
  }, [overlayView]);

  // Furniture taxonomy & thumbnails for the FURNITUR drill-down panel (lazy-loaded when menu opens).
  useEffect(() => {
    if (!open) return;
    loadFurnitureTypes().then(setFurnitureTypes);
    getAllThumbnails().then(setThumbnails);
    const unsub = subscribeThumbnails(() => getAllThumbnails().then(setThumbnails));
    return () => {
      unsub();
    };
  }, [open]);

  useEffect(() => {
    if (!authStorage.getToken()) {
      setAuthUser(null);
      return;
    }
    api
      .get("/me")
      .then((r) => setAuthUser({ name: r.data?.name ?? "Account", email: r.data?.email, role: r.data?.role }))
      .catch(() => setAuthUser(null));
  }, []);

  // Poll unread consultation messages for logged-in users
  useEffect(() => {
    if (!authUser) { setUnreadCount(0); return; }
    let cancelled = false;
    const load = () => {
      api.get<{ unread: number }>("/my/consultations/unread")
        .then((r) => { if (!cancelled) setUnreadCount(r.data?.unread ?? 0); })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 20000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [authUser]);

  // Poll consultation activities (existing activity system) for the notification bell
  useEffect(() => {
    if (!authUser) { setActivities([]); return; }
    let cancelled = false;
    const load = () => {
      getMyActivities()
        .then((data) => { if (!cancelled) setActivities(data); })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 25000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [authUser]);

  const activityUnreadCount = activities.filter((a) => !a.user_read_at).length;

  const handleBellOpen = () => {
    if (activityUnreadCount === 0) return;
    markMyActivitiesRead()
      .then(() => setActivities((prev) => prev.map((a) => ({ ...a, user_read_at: a.user_read_at ?? new Date().toISOString() }))))
      .catch(() => {});
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [profileOpen]);

  const handleLogout = async () => {
    try { await api.post("/logout"); } catch { /* ignore */ }
    authStorage.clear();
    setAuthUser(null);
    setProfileOpen(false);
    toast.success("Berhasil logout");
    navigate("/");
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (l: NavLink) => {
    if (l.dropdown) return location.pathname.startsWith("/catalog");
    if (l.to) {
      if (l.to === "/about") return location.pathname.startsWith("/about");
      if (l.to === "/projects") return location.pathname.startsWith("/projects");
      if (l.to === "/furniture") return location.pathname.startsWith("/furniture");
      return location.pathname === l.to;
    }
    if (l.hash) return location.pathname === "/" && location.hash === `#${l.hash}`;
    return false;
  };

  const handleHashClick = (hash: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (location.pathname === "/") {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      window.history.replaceState(null, "", `/#${hash}`);
    } else {
      navigate(`/#${hash}`);
    }
  };

  // Renders a link inside the overlay menu with white-on-blur styling.
  const renderOverlayLink = (l: NavLink) => {
    if (l.dropdown) {
      const active = location.pathname.startsWith("/catalog");
      return (
        <div>
          <button
            type="button"
            onClick={() => setCatalogOpen((v) => !v)}
            className={`underline-grow w-full flex items-center justify-between group transition-colors duration-300 ${
              active || catalogOpen ? "text-white is-active" : "text-white/85 hover:text-white"
            }`}
          >
            <Plus
              size={16}
              className={`transition-transform duration-300 ${
                catalogOpen ? "rotate-45 text-white" : "text-white/60 group-hover:text-white"
              }`}
            />
            <span
              className={`transition-transform duration-300 ${
                catalogOpen ? "-translate-x-1" : "group-hover:-translate-x-1"
              }`}
            >
              CATALOG
            </span>
          </button>

          <div
            className={`overflow-hidden transition-all duration-500 ease-out ${
              catalogOpen ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
            }`}
          >
            <ul className="pl-3 space-y-3 border-l border-white/25">
              {l.dropdown.map((d, i) => (
                <li
                  key={d.to}
                  className={catalogOpen ? "animate-in fade-in slide-in-from-left-2" : ""}
                  style={catalogOpen ? { animationDelay: `${i * 40}ms`, animationFillMode: "backwards" } : undefined}
                >
                  <Link
                    to={d.to}
                    onClick={() => setOpen(false)}
                    className={`underline-grow inline-flex items-center min-h-[40px] py-1.5 text-[11px] uppercase tracking-[0.15em] font-light transition-all duration-300 hover:translate-x-1 ${
                      location.pathname === d.to
                        ? "text-white is-active"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {d.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    if (l.key === "furniture") {
      const active = overlayView === "furniture" || location.pathname.startsWith("/furniture");
      return (
        <button
          type="button"
          onClick={() => setOverlayView((v) => (v === "furniture" ? "main" : "furniture"))}
          className={`underline-grow w-full flex items-center justify-between group transition-colors duration-300 ${
            active ? "text-white is-active" : "text-white/85 hover:text-white"
          }`}
        >
          <ChevronRight
            size={16}
            className={`transition-transform duration-300 ${
              overlayView === "furniture" ? "rotate-180 text-white" : "text-white/60 group-hover:text-white"
            }`}
          />
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            {l.label}
          </span>
        </button>
      );
    }

    const baseCls = `underline-grow inline-block transition-all duration-300 hover:translate-x-1 ${
      isActive(l) ? "text-white is-active" : "text-white/85 hover:text-white"
    }`;

    if (l.to)
      return (
        <Link to={l.to} className={baseCls} onClick={() => setOpen(false)}>
          {l.label}
        </Link>
      );
    return (
      <a href={`/#${l.hash}`} className={baseCls} onClick={handleHashClick(l.hash!)}>
        {l.label}
      </a>
    );
  };

  // Small hash-link renderer for desktop quick links (LIVORA Deep Navy / Sky palette).
  const renderQuickLink = (l: NavLink) => {
    const active = isActive(l);
    const cls = `underline-grow relative py-1 transition-colors duration-300 whitespace-nowrap ${
      lightText
        ? active
          ? "text-white font-medium"
          : "text-white/90 hover:text-white"
        : active
        ? "text-[#0B426E] font-semibold"
        : "text-[#4B5E71] hover:text-[#0B426E]"
    }`;
    const shadow = lightText ? { textShadow: "0 1px 10px rgba(11,66,110,0.45)" } : undefined;
    const activeDot = active ? (
      <span
        aria-hidden
        className={`absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-4 h-[2px] rounded-full transition-colors ${
          lightText ? "bg-white" : "bg-[#0B426E]"
        }`}
      />
    ) : null;

    if (l.to) {
      return (
        <Link to={l.to} className={cls} style={shadow}>
          {l.label}
          {activeDot}
        </Link>
      );
    }
    return (
      <a href={`/#${l.hash}`} className={cls} style={shadow} onClick={handleHashClick(l.hash!)}>
        {l.label}
        {activeDot}
      </a>
    );
  };

  const handleShortlistTrigger = () => {
    setOpen(false);
    if (isFurniturePage) {
      openShortlistDrawer();
    } else {
      navigate("/furniture?shortlist=1");
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          headerTransparent
            ? "bg-transparent"
            : "bg-white/88 backdrop-blur-md border-b border-[#0B426E]/10 shadow-[0_8px_28px_-20px_rgba(11,66,110,0.18)]"
        } ${hidden ? "-translate-y-full" : "translate-y-0"}`}
      >
        <div className="container-livora h-20 flex items-center justify-between gap-4 relative">
          {/* Logo: Faceted Hexagonal LIVORA Mark + Serif Wordmark */}
          <Link
            to="/"
            className={`inline-flex items-center gap-2.5 shrink-0 transition-colors duration-500 ${
              headerLight ? "text-white" : "text-[#0B426E]"
            }`}
            style={headerLight ? { textShadow: "0 1px 10px rgba(11,66,110,0.45)" } : undefined}
            onClick={() => setOpen(false)}
          >
            <img
              src={livoraMark}
              alt=""
              width={26}
              height={26}
              className="w-[26px] h-[26px] object-contain shrink-0 drop-shadow-[0_1px_4px_rgba(11,66,110,0.22)]"
            />
            <span className="serif text-xl sm:text-2xl tracking-[0.32em] font-light leading-none">
              LIVORA
            </span>
          </Link>

          {/* Desktop Center Navigation Links */}
          <ul className="hidden lg:flex items-center gap-5 xl:gap-7 text-[11px] xl:text-xs uppercase tracking-[0.15em]">
            {desktopQuickLinks.map((l) => (
              <li key={l.key}>{renderQuickLink(l)}</li>
            ))}
            <li>
              <Link
                to="/appointment"
                className={`underline-grow relative py-1 transition-colors duration-300 whitespace-nowrap ${
                  lightText
                    ? location.pathname === "/appointment"
                      ? "text-white font-medium"
                      : "text-white/90 hover:text-white"
                    : location.pathname === "/appointment"
                    ? "text-[#0B426E] font-semibold"
                    : "text-[#4B5E71] hover:text-[#0B426E]"
                }`}
                style={lightText ? { textShadow: "0 1px 10px rgba(11,66,110,0.45)" } : undefined}
              >
                {t("nav.appointment_full")}
                {location.pathname === "/appointment" && (
                  <span
                    aria-hidden
                    className={`absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-4 h-[2px] rounded-full ${
                      lightText ? "bg-white" : "bg-[#0B426E]"
                    }`}
                  />
                )}
              </Link>
            </li>
          </ul>

          {/* Right Utility Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            {/* Search Trigger */}
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className={`inline-flex items-center justify-center gap-2 rounded-full transition-all duration-300 min-w-[40px] min-h-[40px] xl:px-3.5 xl:h-9 xl:border ${
                headerLight
                  ? "text-white/95 hover:text-white xl:bg-white/12 xl:hover:bg-white/20 xl:border-white/25 xl:backdrop-blur-sm"
                  : "text-[#0B426E]/85 hover:text-[#0B426E] xl:bg-[#F4F6F8] xl:hover:bg-[#EAF4FA] xl:border-[#0B426E]/12"
              }`}
            >
              <Search size={17} />
              <span className="hidden xl:inline text-[11px] tracking-[0.04em] font-normal">
                Cari
              </span>
            </button>

            {/* Saved Pieces / Shortlist Drawer Trigger */}
            <button
              type="button"
              onClick={handleShortlistTrigger}
              aria-label={`Saved pieces${shortlistCount ? ` (${shortlistCount})` : ""}`}
              title="Saved Pieces / Shortlist"
              className={`relative min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full transition-all duration-300 ${
                headerLight
                  ? "text-white/95 hover:text-white hover:bg-white/12"
                  : "text-[#0B426E]/85 hover:text-[#0B426E] hover:bg-[#EAF4FA]"
              }`}
            >
              <Bookmark
                size={18}
                className={shortlistCount > 0 ? "fill-current" : ""}
              />
              {shortlistCount > 0 && (
                <span className="absolute top-1 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#1E88C7] text-white text-[9.5px] font-semibold flex items-center justify-center shadow-sm">
                  {shortlistCount > 99 ? "99+" : shortlistCount}
                </span>
              )}
            </button>

            {/* Existing Cart button preserved on non-Furniture pages only */}
            {authUser && !isFurniturePage && <CartNavButton light={headerLight} />}

            {authUser && (
              <NotificationBell
                activities={activities}
                unreadCount={activityUnreadCount}
                readField="user_read_at"
                onOpen={handleBellOpen}
                onItemClick={() => navigate("/profile/consultations")}
                light={headerLight}
                label="Notifications"
              />
            )}
            {authUser ? (() => {
              // Ambil nama depan dari user.name; kalau kosong / kebetulan berbentuk email, jatuhkan ke bagian sebelum "@".
              const rawName = (authUser.name || "").trim();
              const firstName = rawName.includes("@")
                ? rawName.split("@")[0].split(/[._\s]/)[0]
                : rawName.split(/\s+/)[0] || "Account";
              const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
              const initial = displayName.charAt(0).toUpperCase();
              return (
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-label="Account menu"
                  className={`p-1.5 flex items-center gap-2 transition-colors duration-500 ${
                    headerLight ? "text-white/95 hover:text-white" : "text-[#0B426E]/85 hover:text-[#0B426E]"
                  }`}
                >
                  <span className="relative">
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-[11px] font-medium tracking-wide transition-colors ${
                        headerLight
                          ? "bg-white/18 border border-white/40 text-white backdrop-blur-sm"
                          : "bg-[#0B426E] text-white"
                      }`}
                    >
                      {initial}
                    </span>
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#1E88C7] text-white text-[9px] font-semibold flex items-center justify-center border-2 border-white"
                        aria-label={`${unreadCount} unread messages`}
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  <span
                    className="hidden xl:inline text-xs tracking-[0.06em] max-w-[110px] truncate"
                    style={headerLight ? { textShadow: "0 1px 8px rgba(11,66,110,0.45)" } : undefined}
                  >
                    {displayName}
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#0B426E]/12 rounded-2xl shadow-[0_20px_50px_-20px_rgba(11,66,110,0.28)] overflow-hidden z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-[#0B426E]/10 bg-[#F8F9FB]">
                      <p className="text-sm font-medium text-[#0B426E] truncate">{rawName || displayName}</p>
                      {authUser.email && (
                        <p className="text-xs text-[#4B5E71] truncate">{authUser.email}</p>
                      )}
                    </div>
                    <div className="py-1 text-sm text-[#0B426E]">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#EAF4FA]/70 transition-colors"
                      >
                        <User size={16} className="text-[#1E88C7]" /> Profile Detail
                      </Link>
                      <Link
                        to="/profile/saved"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#EAF4FA]/70 transition-colors"
                      >
                        <Bookmark size={16} className="text-[#1E88C7]" /> Saved Items
                      </Link>
                      <Link
                        to="/profile/consultations"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#EAF4FA]/70 transition-colors"
                      >
                        <span className="flex items-center gap-3"><ClipboardList size={16} className="text-[#1E88C7]" /> My Consultations</span>
                        {unreadCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#1E88C7] text-white text-[10px] font-semibold flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </Link>
                      {authUser.role === "sales" && (
                      <Link
                        to="/sales/scan"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#EAF4FA]/70 border-t border-[#0B426E]/10 transition-colors"
                      >
                        <Camera size={16} className="text-[#1E88C7]" /> Scan QR
                      </Link>
                    )}
                      {authUser.role === "admin" && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#EAF4FA]/70 border-t border-[#0B426E]/10 transition-colors"
                        >
                          <Shield size={16} className="text-[#1E88C7]" /> Admin Panel
                        </Link>
                      )}
                      {authUser.role === "admin" && (
                        <Link
                          to="/admin/ai-marketing"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#EAF4FA]/70 transition-colors"
                        >
                          <Sparkles size={16} className="text-[#1E88C7]" /> AI Marketing
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 border-t border-[#0B426E]/10 text-red-600 transition-colors"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })() : (
              <Link
                to="/login"
                aria-label="Login"
                className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full gap-2 transition-all duration-300 ${
                  headerLight
                    ? "text-white/95 hover:text-white hover:bg-white/12"
                    : "text-[#0B426E]/85 hover:text-[#0B426E] hover:bg-[#EAF4FA]"
                }`}
                onClick={() => setOpen(false)}
              >
                <User size={19} />
              </Link>
            )}
            <button
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
              className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full transition-all duration-300 relative z-[70] ${
                headerLight
                  ? "text-white hover:bg-white/12"
                  : "text-[#0B426E] hover:bg-[#EAF4FA]"
              }`}
            >
              <span className="relative inline-block w-[22px] h-[22px]">
                <Menu
                  size={22}
                  className={`absolute inset-0 transition-all duration-300 ${
                    open ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
                  }`}
                />
                <X
                  size={22}
                  className={`absolute inset-0 transition-all duration-300 ${
                    open ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
                  }`}
                />
              </span>
            </button>
          </div>

          {!open && transparentTop && (
            <div className="absolute bottom-0 left-8 right-8 lg:left-16 lg:right-16 h-px bg-white/25 transition-colors duration-500" />
          )}
        </div>
      </header>

      {/* Full-screen overlay menu (mobile) / Right drawer (desktop) */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[55]">
            {/* Backdrop — Deep Livora Navy glass tint */}
            <div
              className="absolute inset-0 backdrop-blur-2xl bg-[#07243D]/65 md:bg-[#07243D]/25 md:backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setOpen(false)}
            />

            {/* Wrapper: anchored kanan, flex-row-reverse supaya drawer utama tetap di kanan
                dan panel furniture (kalau ada) nempel pas di sisi kirinya, otomatis mengikuti lebar asli */}
            <div className="w-full md:w-auto md:absolute md:inset-auto md:top-0 md:right-0 h-[100dvh] flex flex-row-reverse">
              <div
                data-lenis-prevent
                className="nav-overlay relative z-0 h-full w-full md:w-[420px] lg:w-[460px] md:bg-[#0B426E]/88 md:backdrop-blur-3xl md:border-l md:border-white/15 flex flex-col justify-between px-6 sm:px-8 md:px-10 pt-24 pb-[max(2.5rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain max-w-5xl md:max-w-none mx-auto md:mx-0 animate-in fade-in md:slide-in-from-right duration-500"
              >
                <ul className="flex flex-col gap-5 sm:gap-7 text-lg md:text-2xl uppercase tracking-[0.25em] font-light text-right">
                  {menuLinks.map((l, i) => (
                    <li
                      key={l.key}
                      className="animate-in fade-in slide-in-from-left-4"
                      style={{ animationDelay: `${i * 80}ms`, animationDuration: "500ms", animationFillMode: "backwards" }}
                    >
                      {renderOverlayLink(l)}
                    </li>
                  ))}

                  {/* Also include quick links inside overlay for completeness */}
                  <li className="pt-4 mt-2 border-t border-white/15" />
                  {desktopQuickLinks.map((l, i) => (
                    <li
                      key={l.key}
                      className="animate-in fade-in slide-in-from-left-4 text-sm md:text-base text-white/75"
                      style={{
                        animationDelay: `${(menuLinks.length + i) * 80}ms`,
                        animationDuration: "500ms",
                        animationFillMode: "backwards",
                      }}
                    >
                      {l.to ? (
                        <Link
                          to={l.to}
                          onClick={() => setOpen(false)}
                          className="underline-grow hover:text-white transition-all duration-300 hover:translate-x-1 inline-flex items-center min-h-[40px]"
                        >
                          {l.label}
                        </Link>
                      ) : (
                        <a
                          href={`/#${l.hash}`}
                          onClick={handleHashClick(l.hash!)}
                          className="underline-grow hover:text-white transition-all duration-300 hover:translate-x-1 inline-flex items-center min-h-[40px]"
                        >
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>

                <div
                  className="flex justify-center pt-8 text-white/80 animate-in fade-in duration-500"
                  style={{ animationDelay: "500ms", animationFillMode: "backwards" }}
                >
                  <LanguageSwitcher />
                </div>
              </div>

              {/* Furniture drill-down panel — reveal dari GARIS BATAS KIRI drawer utama (bukan geser posisi) */}
              {furnitureMounted && (
                <div
                  data-lenis-prevent
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    (e.currentTarget as any)._swipeX = t.clientX;
                  }}
                  onTouchEnd={(e) => {
                    const startX = (e.currentTarget as any)._swipeX;
                    if (typeof startX === "number" && e.changedTouches[0].clientX - startX > 65) {
                      setOverlayView("main");
                    }
                  }}
                  className="fixed inset-0 md:relative md:inset-auto z-10 h-[100dvh] md:h-full w-full md:w-[380px] lg:w-[420px] bg-[#083154]/95 md:bg-[#083154]/85 backdrop-blur-3xl md:border-l md:border-white/15 flex flex-col px-6 sm:px-8 md:px-10 pt-24 pb-[max(2.5rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain transition-[clip-path,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    clipPath: furnitureShown ? "inset(0 0 0 0%)" : "inset(0 0 0 100%)",
                    opacity: furnitureShown ? 1 : 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOverlayView("main")}
                    className="underline-grow inline-flex items-center gap-2 self-start min-h-[44px] py-2 text-[11px] uppercase tracking-[0.25em] text-white/75 hover:text-white transition-colors duration-300 mb-6"
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>

                  <div className="mb-6">
                    <h3 className="serif text-2xl md:text-3xl font-light text-white">
                      {t("nav.furniture")}
                    </h3>
                    <Link
                      to="/furniture"
                      onClick={() => setOpen(false)}
                      className="underline-grow inline-block mt-2 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors duration-300"
                    >
                      See all our furniture
                    </Link>
                  </div>

                  <ul className="flex flex-col gap-4">
                    {furnitureTypes.map((ft, i) => {
                      const thumb = ft.image || thumbnails[ft.name]?.image;
                      return (
                        <li
                          key={ft.id}
                          className="animate-in fade-in slide-in-from-right-2"
                          style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
                        >
                          <Link
                            to={`/furniture?category=${ft.slug}`}
                            onClick={() => setOpen(false)}
                            className="group flex items-center gap-4 transition-transform duration-300 hover:translate-x-1"
                          >
                            <span className="w-14 h-14 shrink-0 rounded bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={ft.name}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <Package size={20} className="text-white/50" />
                              )}
                            </span>
                            <span className="underline-grow text-sm uppercase tracking-[0.15em] font-light text-white/85 group-hover:text-white transition-colors duration-300">
                              {ft.name}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};