import { useEffect, useState } from "react";
import { Menu, X, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from '@/components/livora/LanguageSwitcher';

type NavLink = { label: string; to?: string; hash?: string; key: string };

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
    { key: "furniture", label: t("nav.furniture"), to: "/furniture" },
    { key: "contact", label: t("nav.contact"), hash: "contact" },
  ];

  const isLanding = location.pathname === "/";
  const transparentTop = isLanding && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (l: NavLink) => {
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
    const baseCls = mobile ? "" : `underline-grow transition-colors ${
      transparentTop ? "text-white/90 hover:text-white"
        : isActive(l) ? "text-foreground" : "text-foreground/80 hover:text-foreground"
    }`;
    if (l.to) return <Link to={l.to} className={baseCls} onClick={() => setOpen(false)}>{l.label}</Link>;
    return <a href={`/#${l.hash}`} className={baseCls} onClick={handleHashClick(l.hash!)}>{l.label}</a>;
  };

  return (
    <header className={`fixed top-0 left-0 right-0 transition-all duration-500 ${
      scrolled ? "bg-background/85 backdrop-blur-md border-b border-border/60 py-4" : "bg-transparent border-b border-transparent py-6"
    }`} style={{ zIndex: 1000 }}>
      <nav className="container-livora flex items-center justify-between">
        <Link to="/" className={`serif text-2xl tracking-[0.35em] font-light transition-colors duration-500 ${transparentTop ? "text-white" : "text-foreground"}`}>
          LIVORA
        </Link>
        <ul className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em]">
          {links.map((l) => <li key={l.key}>{renderLink(l)}</li>)}
        </ul>
        <div className="flex items-center gap-3 md:gap-5">
          <span className={`transition-opacity duration-500 ${transparentTop ? "opacity-80 hover:opacity-100" : ""}`}>
            <LanguageSwitcher isLoggedIn={false} transparentTop={transparentTop} />
          </span>
          <Link to="/login" aria-label="Login" className={`p-2 transition-colors duration-500 ${
            transparentTop ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground"
          }`}>
            <User size={20} />
          </Link>
          <button aria-label="Toggle menu" onClick={() => setOpen((v) => !v)} className={`md:hidden p-2 transition-colors duration-500 ${transparentTop ? "text-white" : "text-foreground"}`}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="md:hidden bg-background border-t border-border mt-4">
          <ul className="container-livora py-6 flex flex-col gap-5 text-sm uppercase tracking-[0.2em]">
            {links.map((l) => <li key={l.key}>{renderLink(l, true)}</li>)}
            <li className="pt-2 border-t border-border/40">
              <LanguageSwitcher isLoggedIn={false} />
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};