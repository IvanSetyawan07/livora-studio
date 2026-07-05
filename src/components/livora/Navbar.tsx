import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X, User, ChevronDown, Plus, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/livora/LanguageSwitcher";
import SearchOverlay from "@/components/livora/SearchOverlay";

type NavLink = {
  label: string;
  to?: string;
  hash?: string;
  key: string;
  dropdown?: { label: string; to: string }[];
};

export const Navbar = () => {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Links shown inside the hamburger overlay (both desktop & mobile).
  const menuLinks: NavLink[] = [
    { key: "about", label: t("nav.about"), to: "/about" },
    { key: "projects", label: t("nav.projects"), to: "/projects" },
    {
      key: "catalog",
      label: "CATALOG",
      dropdown: [
        { label: "Living Rooms", to: "/catalog/living-rooms" },
        { label: "Dining Rooms", to: "/catalog/dining-rooms" },
        { label: "Bedrooms", to: "/catalog/bedrooms" },
        { label: "Outdoor Spaces", to: "/catalog/outdoor-spaces" },
        { label: "Home Office", to: "/catalog/home-office" },
        { label: "Public Spaces", to: "/catalog/public-spaces" },
      ],
    },
    { key: "furniture", label: t("nav.furniture"), to: "/furniture" },
  ];

  // Quick links always visible on desktop header.
  const desktopQuickLinks: NavLink[] = [
    { key: "style", label: t("nav.style"), hash: "style" },
    { key: "scope", label: t("nav.scope"), hash: "scope" },
    { key: "contact", label: t("nav.contact"), hash: "contact" },
  ];

  const transparentTop = !scrolled;
  const lightText =
    !scrolled &&
    (location.pathname === "/" ||
      /^\/catalog\/[^/]+$/.test(location.pathname) ||
      /^\/catalog\/[^/]+\/[^/]+$/.test(location.pathname) ||
      /^\/projects\/[^/]+$/.test(location.pathname));

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
            <span
              className={`transition-transform duration-300 ${
                catalogOpen ? "translate-x-1" : "group-hover:translate-x-1"
              }`}
            >
              CATALOG
            </span>
            <Plus
              size={16}
              className={`transition-transform duration-300 ${
                catalogOpen ? "rotate-45 text-white" : "text-white/60 group-hover:text-white"
              }`}
            />
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
                    className={`underline-grow inline-block text-[10px] uppercase tracking-[0.15em] font-light transition-all duration-300 hover:translate-x-1 ${
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

  // Small hash-link renderer for desktop quick links.
  const renderQuickLink = (l: NavLink) => {
    const cls = `underline-grow transition-colors ${
      lightText
        ? "text-white/90 hover:text-white"
        : isActive(l)
        ? "text-foreground is-active"
        : "text-foreground/80 hover:text-foreground"
    }`;
    const shadow = lightText ? { textShadow: "0 1px 8px rgba(0,0,0,0.5)" } : undefined;
    return (
      <a href={`/#${l.hash}`} className={cls} style={shadow} onClick={handleHashClick(l.hash!)}>
        {l.label}
      </a>
    );
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          headerTransparent ? "bg-transparent" : "bg-background/75 backdrop-blur-[6px]"
        } ${hidden ? "-translate-y-full" : "translate-y-0"}`}
      >
        <div className="max-w-7xl md:max-w-none mx-auto px-8 lg:px-16 h-20 flex items-center justify-between relative">
          {/* Logo */}
          <Link
            to="/"
            className={`serif text-2xl tracking-[0.35em] font-light transition-colors duration-500 ${
              headerLight ? "text-white" : "text-foreground"
            }`}
            style={headerLight ? { textShadow: "0 1px 8px rgba(0,0,0,0.5)" } : undefined}
            onClick={() => setOpen(false)}
          >
            LIVORA
          </Link>

          {/* Desktop quick links: Style · Scope · Contact only */}
          <ul className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em]">
            {desktopQuickLinks.map((l) => (
              <li key={l.key}>{renderQuickLink(l)}</li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className={`p-2 transition-colors duration-500 ${
                headerLight ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground"
              }`}
            >
              <Search size={20} />
            </button>
            <Link
              to="/login"
              aria-label="Login"
              className={`p-2 transition-colors duration-500 ${
                headerLight ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground"
              }`}
              onClick={() => setOpen(false)}
            >
              <User size={20} />
            </Link>
            <button
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
              className={`p-2 transition-all duration-500 relative z-[60] ${
                headerLight ? "text-white" : "text-foreground"
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

          {!open && (
            <div
              className={`absolute bottom-0 left-8 right-8 lg:left-16 lg:right-16 h-px transition-colors duration-500 ${
                transparentTop ? "bg-white/25" : "bg-foreground/15"
              }`}
            />
          )}
        </div>
      </header>

      {/* Full-screen overlay menu (desktop + mobile) */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 backdrop-blur-2xl bg-black/45 animate-in fade-in duration-300" />

            <div className="relative h-full flex flex-col justify-between px-8 md:px-16 pt-28 pb-10 overflow-y-auto max-w-5xl mx-auto">
              <ul className="flex flex-col gap-7 text-lg md:text-2xl uppercase tracking-[0.25em] font-light">
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
                    className="animate-in fade-in slide-in-from-left-4 text-sm md:text-base text-white/70"
                    style={{
                      animationDelay: `${(menuLinks.length + i) * 80}ms`,
                      animationDuration: "500ms",
                      animationFillMode: "backwards",
                    }}
                  >
                    <a
                      href={`/#${l.hash}`}
                      onClick={handleHashClick(l.hash!)}
                      className="underline-grow hover:text-white transition-all duration-300 hover:translate-x-1 inline-block"
                    >
                      {l.label}
                    </a>
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
          </div>,
          document.body
        )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
