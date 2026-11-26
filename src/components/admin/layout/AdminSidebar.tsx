import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronDown, ExternalLink, LogOut, Search, X } from "lucide-react";
import livoraMark from "@/assets/_opt/logo-livora-160.webp";
import { useAdminDialog } from "@/components/admin/kit";
import {
  ADMIN_HOME,
  ADMIN_NAV_GROUPS,
  canAccessNavItem,
  matchNav,
  type AdminNavGroup,
  type AdminNavItem,
} from "./adminNav";

const STORAGE_KEY = "livora.admin.nav.open.v2";

type Props = {
  user: { name?: string; email?: string };
  roleLabel?: string;
  isOwner: boolean;
  levelOf: (feature?: string) => string;
  badges?: Record<string, number>;
  onLogout: () => void;
  layoutIdPrefix?: string;
};

function readOpen(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

export default function AdminSidebar({
  user,
  roleLabel,
  isOwner,
  levelOf,
  badges = {},
  onLogout,
  layoutIdPrefix = "admin-nav",
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const dialog = useAdminDialog();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const activeGroupId = matchNav(location.pathname)?.group?.id;

  const [openIds, setOpenIds] = useState<string[]>(() => {
    const stored = readOpen();
    if (stored) return stored;
    // Buka grup operasional utama secara default, sembunyikan grup teknis
    const defaults = ["orders", "customers", "content"];
    if (activeGroupId && !defaults.includes(activeGroupId)) defaults.push(activeGroupId);
    return defaults;
  });

  // Grup yang berisi halaman aktif otomatis terbuka.
  useEffect(() => {
    if (activeGroupId) {
      setOpenIds((prev) => (prev.includes(activeGroupId) ? prev : [...prev, activeGroupId]));
    }
  }, [activeGroupId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openIds));
    } catch {
      /* abaikan */
    }
  }, [openIds]);

  // Ctrl/⌘ + K untuk fokus ke pencarian menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    return ADMIN_NAV_GROUPS.map((g) => {
      const base = g.items.filter((item) => canAccessNavItem(item, isOwner, levelOf));
      const items = q
        ? base.filter((i) => `${i.label} ${i.keywords ?? ""} ${g.label}`.toLowerCase().includes(q))
        : base;
      return { ...g, items };
    }).filter((g) => g.items.length > 0);
  }, [q, isOwner, levelOf]);

  const showHome = !q || `${ADMIN_HOME.label} ${ADMIN_HOME.keywords ?? ""}`.toLowerCase().includes(q);
  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allOpen = groups.length > 0 && groups.every((g) => openIds.includes(g.id));

  const submitSearch = () => {
    if (q && showHome) {
      navigate(ADMIN_HOME.to);
      setQuery("");
      return;
    }
    const first = groups[0]?.items[0];
    if (first) {
      navigate(first.to);
      setQuery("");
    }
  };

  const handleLogoutClick = async () => {
    const ok = await dialog.confirm({
      title: "Keluar dari Admin Livora?",
      text: "Pastikan seluruh perubahan yang sedang dikerjakan sudah tersimpan sebelum keluar.",
      confirmLabel: "Ya, keluar",
      cancelLabel: "Batal",
    });
    if (ok) onLogout();
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-1.5">
          <img src={livoraMark} alt="LIVORA" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#5E93B8]">LIVORA</p>
          <h1 className="font-header truncate text-lg leading-tight text-[#232528]">Studio Admin</h1>
        </div>
      </div>

      {/* Quick Menu Search */}
      <div className="px-3">
        <label className="group relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#656B73] transition-colors group-focus-within:text-[#232528]" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch();
              if (e.key === "Escape") {
                setQuery("");
                searchRef.current?.blur();
              }
            }}
            placeholder="Cari menu, fitur…"
            className="h-9 w-full rounded-lg border border-[#E6DFD4] bg-[#FAF8F4]/70 pl-9 pr-14 text-sm text-[#232528] outline-none transition-all placeholder:text-[#656B73]/75 focus:border-[#5E93B8] focus:bg-white focus:ring-2 focus:ring-[#5E93B8]/15"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Hapus pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#656B73] hover:text-[#232528]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-[#E6DFD4] bg-white px-1.5 py-0.5 text-[10px] text-[#656B73] lg:block">
              Ctrl K
            </kbd>
          )}
        </label>
      </div>

      {/* Navigation */}
      <nav className="mt-3 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 pb-3 [scrollbar-width:thin]">
        {showHome && <NavRow item={ADMIN_HOME} layoutId={`${layoutIdPrefix}-active`} />}

        {groups.length > 0 && !q && (
          <div className="flex items-center justify-between px-3 pb-1 pt-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#656B73]/80">Menu Studio</span>
            <button
              type="button"
              onClick={() => setOpenIds(allOpen ? [] : groups.map((g) => g.id))}
              className="text-[11px] text-[#5E93B8] transition-colors hover:text-[#3A6D91] hover:underline"
            >
              {allOpen ? "Tutup semua" : "Buka semua"}
            </button>
          </div>
        )}

        {groups.map((group) => (
          <Group
            key={group.id}
            group={group}
            open={!!q || openIds.includes(group.id)}
            hasActive={group.id === activeGroupId}
            badges={badges}
            layoutId={`${layoutIdPrefix}-active`}
            onToggle={() => toggle(group.id)}
          />
        ))}

        {q && groups.length === 0 && !showHome && (
          <p className="px-3 py-8 text-center text-xs text-[#656B73]">
            Menu "{query}" tidak ditemukan. Coba kata kunci lain seperti "promo", "harga", atau "pesanan".
          </p>
        )}
      </nav>

      {/* Footer */}
      <div className="space-y-2 border-t border-[#EAE4DA] bg-[#FAF8F4]/50 p-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-between rounded-lg border border-[#E6DFD4] bg-white px-3 py-2 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8]/50 hover:bg-[#EDF4F8]/50"
        >
          <span>Lihat Website Publik</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#5E93B8]" />
        </a>

        <div className="flex items-center gap-2.5 rounded-lg border border-[#EAE4DA] bg-white px-3 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#232528] text-xs font-medium uppercase text-white">
            {(user.name || user.email || "A").charAt(0)}
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-medium text-[#232528]">{user.name || "Admin Livora"}</p>
            <p className="truncate text-[11px] text-[#656B73]">{roleLabel || user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogoutClick}
            aria-label="Keluar"
            title="Keluar dari akun"
            className="rounded-md p-1.5 text-[#656B73] transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({
  group,
  open,
  hasActive,
  badges,
  layoutId,
  onToggle,
}: {
  group: AdminNavGroup & { items: AdminNavItem[] };
  open: boolean;
  hasActive: boolean;
  badges: Record<string, number>;
  layoutId: string;
  onToggle: () => void;
}) {
  const Icon = group.icon;
  const groupBadge = group.items.reduce((sum, i) => sum + (badges[i.key] ?? 0), 0);
  const isTech = group.id === "technical";

  return (
    <div className={isTech ? "mt-2 border-t border-[#F0EAE0] pt-2" : undefined}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-[#FAF8F4] ${
          hasActive ? "text-[#232528]" : isTech ? "text-[#656B73]" : "text-[#3B4046]"
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors ${
            hasActive ? "text-[#5E93B8]" : "text-[#656B73] group-hover:text-[#5E93B8]"
          }`}
        />
        <span className="flex-1 truncate text-left font-medium">{group.label}</span>
        {!open && groupBadge > 0 && (
          <span className="rounded-full bg-[#5E93B8] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {groupBadge > 99 ? "99+" : groupBadge}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[#656B73] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="relative ml-[1.1rem] space-y-0.5 border-l border-[#EAE4DA] py-1 pl-2">
              {group.items.map((item) => (
                <NavRow key={item.to} item={item} badge={badges[item.key]} layoutId={layoutId} compact />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavRow({
  item,
  badge,
  layoutId,
  compact,
}: {
  item: AdminNavItem;
  badge?: number;
  layoutId: string;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className="relative block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#5E93B8]/40"
    >
      {({ isActive }) => (
        <span
          className={`relative flex items-center gap-2.5 rounded-lg px-3 ${compact ? "py-1.5" : "py-2.5"} text-[13px] transition-colors ${
            isActive ? "text-white" : "text-[#4C5259] hover:bg-[#FAF8F4] hover:text-[#232528]"
          }`}
        >
          {isActive && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-lg bg-[#232528] shadow-sm"
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
            />
          )}
          <Icon className={`relative h-4 w-4 shrink-0 ${isActive ? "text-[#9DC2DC]" : "text-[#656B73]"}`} />
          <span className="relative flex-1 truncate">{item.label}</span>
          {item.externalWorkspace && (
            <ArrowUpRight className={`relative h-3.5 w-3.5 shrink-0 ${isActive ? "text-white/80" : "text-[#5E93B8]"}`} />
          )}
          {badge ? (
            <span
              className={`relative rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                isActive ? "bg-[#5E93B8] text-white" : "bg-[#5E93B8] text-white"
              }`}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </span>
      )}
    </NavLink>
  );
}
