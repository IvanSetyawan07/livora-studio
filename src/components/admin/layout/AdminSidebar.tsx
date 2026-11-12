import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Home, LogOut, Search, X } from "lucide-react";
import LanguageSwitcher from "@/components/livora/LanguageSwitcher";
import { ADMIN_HOME, ADMIN_NAV_GROUPS, matchNav, type AdminNavGroup, type AdminNavItem } from "./adminNav";

const STORAGE_KEY = "livora.admin.nav.open";

type Props = {
  user: { name?: string; email?: string };
  isOwner: boolean;
  levelOf: (feature?: string) => string;
  badges?: Record<string, number>;
  onLogout: () => void;
  panelLabel: string;
  backLabel: string;
  logoutLabel: string;
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
  isOwner,
  levelOf,
  badges = {},
  onLogout,
  panelLabel,
  backLabel,
  logoutLabel,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const activeGroupId = matchNav(location.pathname)?.group?.id;
  const [openIds, setOpenIds] = useState<string[]>(() => readOpen() ?? (activeGroupId ? [activeGroupId] : []));

  // Grup yang berisi halaman aktif otomatis terbuka.
  useEffect(() => {
    if (activeGroupId) setOpenIds((prev) => (prev.includes(activeGroupId) ? prev : [...prev, activeGroupId]));
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

  const allowed = (item: AdminNavItem) => (item.owner ? isOwner : levelOf(item.feature) !== "none");

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    return ADMIN_NAV_GROUPS.map((g) => {
      const base = g.items.filter(allowed);
      const items = q
        ? base.filter((i) => `${i.label} ${i.keywords ?? ""} ${g.label}`.toLowerCase().includes(q))
        : base;
      return { ...g, items };
    }).filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, isOwner, levelOf]);

  const showHome = !q || ADMIN_HOME.label.toLowerCase().includes(q);
  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allOpen = groups.length > 0 && groups.every((g) => openIds.includes(g.id));

  const submitSearch = () => {
    const first = groups[0]?.items[0];
    if (first) {
      navigate(first.to);
      setQuery("");
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pb-4 pt-6">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-foreground text-background">
          <span className="serif text-lg leading-none">L</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Livora</p>
          <h1 className="serif truncate text-xl leading-tight">{panelLabel}</h1>
        </div>
      </div>

      {/* Search */}
      <div className="px-3">
        <label className="group relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
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
            placeholder="Cari menu…"
            className="h-9 w-full rounded-lg border border-border bg-background/60 pl-9 pr-14 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:bg-background focus:ring-2 focus:ring-foreground/5"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Hapus pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground lg:block">
              Ctrl K
            </kbd>
          )}
        </label>
      </div>

      {/* Nav */}
      <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 pb-3 [scrollbar-width:thin]">
        {showHome && <NavRow item={ADMIN_HOME} />}

        {groups.length > 0 && !q && (
          <div className="flex items-center justify-between px-3 pb-1 pt-4">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">Menu</span>
            <button
              type="button"
              onClick={() => setOpenIds(allOpen ? [] : groups.map((g) => g.id))}
              className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
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
            onToggle={() => toggle(group.id)}
          />
        ))}

        {q && groups.length === 0 && !showHome && (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">Menu "{query}" tidak ditemukan.</p>
        )}
      </nav>

      {/* Footer */}
      <div className="space-y-2 border-t border-border p-3">
        <button
          onClick={() => navigate("/")}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted"
        >
          <Home className="h-4 w-4" /> {backLabel}
        </button>
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground text-xs uppercase text-background">
            {(user.name || user.email || "A").charAt(0)}
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate text-foreground">{user.name}</p>
            <p className="truncate text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            aria-label={logoutLabel}
            title={logoutLabel}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="px-1">
          <LanguageSwitcher isLoggedIn variant="segmented" />
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
  onToggle,
}: {
  group: AdminNavGroup & { items: AdminNavItem[] };
  open: boolean;
  hasActive: boolean;
  badges: Record<string, number>;
  onToggle: () => void;
}) {
  const Icon = group.icon;
  const groupBadge = group.items.reduce((sum, i) => sum + (badges[i.key] ?? 0), 0);
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted ${
          hasActive ? "text-foreground" : "text-foreground/80"
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${hasActive ? "text-[hsl(var(--livora-bronze))]" : ""}`} />
        <span className="flex-1 truncate text-left font-medium">{group.label}</span>
        {!open && groupBadge > 0 && (
          <span className="rounded-full bg-[hsl(var(--livora-bronze))] px-1.5 py-0.5 text-[10px] leading-none text-white">
            {groupBadge}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="relative ml-[1.15rem] space-y-0.5 border-l border-border py-1 pl-2">
              {group.items.map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.22 }}
                >
                  <NavRow item={item} badge={badges[item.key]} compact />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavRow({ item, badge, compact }: { item: AdminNavItem; badge?: number; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.end} className="relative block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-foreground/20">
      {({ isActive }) => (
        <span
          className={`relative flex items-center gap-3 rounded-lg px-3 ${compact ? "py-2" : "py-2.5"} text-sm transition-colors ${
            isActive ? "text-background" : "text-foreground/75 hover:bg-muted hover:text-foreground"
          }`}
        >
          {isActive && (
            <motion.span
              layoutId="admin-nav-active"
              className="absolute inset-0 rounded-lg bg-foreground shadow-sm"
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
            />
          )}
          <Icon className="relative h-4 w-4 shrink-0" />
          <span className="relative flex-1 truncate">{item.label}</span>
          {badge ? (
            <span
              className={`relative rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                isActive ? "bg-background text-foreground" : "bg-[hsl(var(--livora-bronze))] text-white"
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
