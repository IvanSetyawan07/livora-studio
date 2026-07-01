import { useEffect, useState } from "react";
import { Menu, X, User, ChevronDown, Plus } from "lucide-react";
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
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
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
  const lightText = !scrolled && (
    location.pathname === "/" ||
    /^\/catalog\/[^/]+$/.test(location.pathname) ||
    /^\/catalog\/[^/]+\/[^/]+$/.test(location.pathname) ||
    /^\/projects\/[^/]+$/.test(location.pathname)
  );

  // Saat menu mobile terbuka, header selalu tampil sebagai "light"
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

  // Kunci scroll body saat menu mobile terbuka
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
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

  const renderLink = (l: NavLink, mobile = false) => {
    // ── Dropdown desktop ──
    if (l.dropdown && !mobile) {
      const active = location.pathname.startsWith("/catalog");
      return (
        <div className="relative group/nav">
          <button
            className={`underline-grow flex items-center gap-1 transition-colors ${
              lightText
                ? "text-white/90 hover:text-white"
                : active
                ? "text-foreground is-active"
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
                  className={`underline-grow block px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-light transition-colors duration-200 ${
                    location.pathname === d.to
                      ? "text-foreground is-active"
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

    // ── Dropdown mobile (accordion, teks putih di atas overlay blur) ──
    if (l.dropdown && mobile) {
      const active = location.pathname.startsWith("/catalog");
      return (
        <div>
          <button
            type="button"
            onClick={() => setCatalogOpen((v) => !v)}
            className={`underline-grow w-full flex items-center justify-between group transition-colors duration-300 ${
              active || catalogOpen ? "text-white is-active" : "text-white/80 hover:text-white"
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
            className={`overflow-hidden transition-all duration-300 ease-out ${
              catalogOpen ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
            }`}
          >
            <ul className="pl-3 space-y-3 border-l border-white/25">
              {l.dropdown.map((d) => (
                <li key={d.to}>
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

    // ── Link biasa ──
    const baseCls = mobile
      ? `underline-grow inline-block text-white/90 hover:text-white transition-colors ${
          isActive(l) ? "is-active" : ""
        }`
      : `underline-grow transition-colors ${
          lightText
            ? "text-white/90 hover:text-white"
            : isActive(l)
            ? "text-foreground is-active"
            : "text-foreground/80 hover:text-foreground"
        }`;
    const shadowStyle = !mobile && lightText ? { textShadow: "0 1px 8px rgba(0,0,0,0.5)" } : undefined;

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
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          headerTransparent ? "bg-transparent" : "bg-background/75 backdrop-blur-[6px]"
        } ${hidden ? "-translate-y-full" : "translate-y-0"}`}
      >
        <div className="max-w-7xl mx-auto px-8 lg:px-16 h-20 flex items-center justify-between relative">
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

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em]">
            {links.map((l) => (
              <li key={l.key}>{renderLink(l)}</li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex items-center gap-3 md:gap-5">
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
              className={`md:hidden p-2 transition-colors duration-500 relative z-[60] ${
                headerLight ? "text-white" : "text-foreground"
              }`}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Bottom border */}
          {!open && (
            <div
              className={`absolute bottom-0 left-8 right-8 lg:left-16 lg:right-16 h-px transition-colors duration-500 ${
                transparentTop ? "bg-white/25" : "bg-foreground/15"
              }`}
            />
          )}
        </div>
      </header>

      {/* Mobile full-screen overlay menu */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Background: blur apapun yang ada di belakang + dark overlay */}
          <div className="absolute inset-0 backdrop-blur-2xl bg-black/45" />

          {/* Content */}
          <div className="relative h-full flex flex-col justify-between px-8 pt-28 pb-10 overflow-y-auto">
            <ul className="flex flex-col gap-7 text-sm uppercase tracking-[0.2em] font-light">
              {links.map((l) => (
                <li key={l.key}>{renderLink(l, true)}</li>
              ))}
            </ul>

            <div className="flex justify-center pt-8 text-white/80">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </>
  );
};