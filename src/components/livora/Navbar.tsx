import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#about", label: "About" },
  { href: "#mission", label: "Mission" },
  { href: "#style", label: "Style" },
  { href: "#scope", label: "Scope" },
  { href: "#projects", label: "Projects" },
  { href: "#furniture", label: "Furniture" },
  { href: "#contact", label: "Contact" },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-background/85 backdrop-blur-md border-b border-border/60 py-4" : "bg-transparent py-6"}`}
    >
      <nav className="container-livora flex items-center justify-between">
        <a href="#top" className="serif text-2xl tracking-[0.35em] font-light">
          LIVORA
        </a>

        <ul className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em]">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="underline-grow text-foreground/80 hover:text-foreground transition-colors">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#contact"
          className="hidden md:inline-flex items-center text-xs uppercase tracking-[0.2em] border border-foreground/30 px-5 py-2.5 hover:bg-foreground hover:text-background transition-all duration-500"
        >
          Start Project
        </a>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-background border-t border-border mt-4">
          <ul className="container-livora py-6 flex flex-col gap-5 text-sm uppercase tracking-[0.2em]">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
};
