import { useEffect, useState } from "react";
import { Menu, X, User, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from '@/components/livora/LanguageSwitcher';

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
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const links: NavLink[] = [
    { key: "about", label: t("nav.about"), to: "/about" },
    { key: "style", label: t("nav.style"), hash: "style" },
    { key: "scope", label: t("nav.scope"), hash: "scope" },
    { key: "projects", label: t("nav.projects"), to: "/projects" },
    {
      key: "catalog",
      label: "CATALOG",
      dropdown: [
        { label: "Living Rooms",   to: "/catalog/living-rooms" },
        { label: "Dining Rooms",   to: "/catalog/dining-rooms" },
        { label: "Bedrooms",       to: "/catalog/bedrooms" },
        { label: "Outdoor Spaces", to: "/catalog/outdoor-spaces" },
        { label: "Home Office",    to: "/catalog/home-office" },
        { label: "Public Spaces",  to: "/catalog/public-spaces" },
      ],
    },
    { key: "furniture", label: t("nav.furniture"), to: "/furniture" },
    { key: "contact", label: t("nav.contact"), hash: "contact" },
  ];

const transparentTop = !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const renderLink = (l: NavLink, mobile = false) => {
    // ── Dropdown desktop ──
    if (l.dropdown && !mobile) {
      const active = location.pathname.startsWith("/catalog");
      return (
        <div className="relative group/nav">
          <button
            className={`flex items-center gap-1 underline-grow transition-colors ${
              transparentTop
                ? "text-white/90 hover:text-white"
                : active
                ? "text-foreground"
                : "text-foreground/80 hover:text-foreground"
            }`}
          >
            {l.label}
            <ChevronDown
              size={11}
              className="opacity-60 group-hover/nav:rotate-180 transition-transform duration-300"
            />
          </button>

          {/* Dropdown panel */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-300 z-50">
            <div className="bg-background border border-border py-2 min-w-[160px] shadow-sm">
              {l.dropdown.map((d) => (
                <Link
                  key={d.to}
                  to={d.to}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-light transition-colors duration-200 ${
                    location.pathname === d.to
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {d.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── Dropdown mobile (accordion style) ──
    if (l.dropdown && mobile) {
      return (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            CATALOG
          </p>
          <ul className="pl-3 space-y-2 border-l border-border/40">
            {l.dropdown.map((d) => (
              <li key={d.to}>
                <Link
                  to={d.to}
                  onClick={() => setOpen(false)}
                  className={`text-[10px] uppercase tracking-[0.15em] font-light transition-colors ${
                    location.pathname === d.to
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // ── Link biasa ──
    const baseCls = mobile
      ? ""
      : `underline-grow transition-colors ${
          transparentTop
            ? "text-white/90 hover:text-white"
            : isActive(l)
            ? "text-foreground"
            : "text-foreground/80 hover:text-foreground"
        }`;
        const shadowStyle = transparentTop ? { textShadow: "0 1px 8px rgba(0,0,0,0.5)" } : undefined;
    if (l.to)
  return (
    <Link to={l.to} className={baseCls} style={shadowStyle} onClick={() => setOpen(false)}>
      {l.label}
    </Link>
  );
return (
  <a href={`/#${l.hash}`} className={baseCls} style={shadowStyle} onClick={handleHashClick(l.hash!)}>
    {l.label}
  </a>
);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        transparentTop
          ? "bg-transparent"
          : "bg-background/75 backdrop-blur-[6px]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 lg:px-16 h-20 flex items-center justify-between relative">
        {/* Logo */}
        <Link
          to="/"
          className={`serif text-2xl tracking-[0.35em] font-light transition-colors duration-500 ${
            transparentTop ? "text-white" : "text-foreground"
          }`}
          style={transparentTop ? { textShadow: "0 1px 8px rgba(0,0,0,0.5)" } : undefined}
        >
          LIVORA
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em]">
          {links.map((l) => (
            <li key={l.key}>{renderLink(l)}</li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex items-center gap-3 md:gap-5">
          <span
            className={`transition-opacity duration-500 ${
              transparentTop ? "opacity-80 hover:opacity-100" : ""
            }`}
          >
            <LanguageSwitcher isLoggedIn={false} transparentTop={transparentTop} />
          </span>
          <Link
            to="/login"
            aria-label="Login"
            className={`p-2 transition-colors duration-500 ${
              transparentTop
                ? "text-white/90 hover:text-white"
                : "text-foreground/80 hover:text-foreground"
            }`}
          >
            <User size={20} />
          </Link>
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className={`md:hidden p-2 transition-colors duration-500 ${
              transparentTop ? "text-white" : "text-foreground"
            }`}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Bottom border — tidak mentok kiri-kanan */}
        <div
          className={`absolute bottom-0 left-8 right-8 lg:left-16 lg:right-16 h-px transition-colors duration-500 ${
            transparentTop ? "bg-white/25" : "bg-foreground/15"
          }`}
        />
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-background border-t border-border mt-4">
          <ul className="container-livora py-6 flex flex-col gap-5 text-sm uppercase tracking-[0.2em]">
            {links.map((l) => (
              <li key={l.key}>{renderLink(l, true)}</li>
            ))}
            <li className="pt-2 border-t border-border/40">
              <LanguageSwitcher isLoggedIn={false} />
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};