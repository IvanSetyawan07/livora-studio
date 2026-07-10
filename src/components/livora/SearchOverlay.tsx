import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useAllItems } from "@/lib/itemsApi";
import { useAllProjects } from "@/lib/projectsApi";
import livingCatalog from "@/assets/catalog/living-room.png";
import diningCatalog from "@/assets/catalog/dining-room.jpeg";
import bedroomsCatalog from "@/assets/catalog/bedroom.png";
import outdoorCatalog from "@/assets/catalog/outdoor-space.png";
import homeOfficeCatalog from "@/assets/catalog/home-office.jpeg";
import publicCatalog from "@/assets/catalog/public-spaces.png";

const CATALOG_ROOMS = [
  { label: "Living Rooms", to: "/catalog/living-rooms", image: livingCatalog },
  { label: "Dining Rooms", to: "/catalog/dining-rooms", image: diningCatalog },
  { label: "Bedrooms", to: "/catalog/bedrooms", image: bedroomsCatalog },
  { label: "Outdoor Spaces", to: "/catalog/outdoor-spaces", image: outdoorCatalog },
  { label: "Home Office", to: "/catalog/home-office", image: homeOfficeCatalog },
  { label: "Public Spaces", to: "/catalog/public-spaces", image: publicCatalog },
];

const POPULAR = ["sofa", "chair", "table", "bed", "lamp", "outdoor", "modern", "classic"];

type Props = { open: boolean; onClose: () => void };

export default function SearchOverlay({ open, onClose }: Props) {
  const [q, setQ] = useState("");
  const items = useAllItems();
  const projects = useAllProjects();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 60);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const query = q.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!query) return [];
    return items
      .filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.code?.toLowerCase().includes(query) ||
          i.category?.toLowerCase().includes(query)
      )
      .slice(0, 12);
  }, [items, query]);

  const filteredProjects = useMemo(() => {
    if (!query) return [];
    return projects
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.location?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      )
      .slice(0, 6);
  }, [projects, query]);

  const filteredCatalogs = useMemo(() => {
    if (!query) return CATALOG_ROOMS;
    return CATALOG_ROOMS.filter((r) => r.label.toLowerCase().includes(query));
  }, [query]);

  const featuredItems = useMemo(() => items.slice(0, 10), [items]);
  const featuredProjects = useMemo(
    () => projects.slice(0, 3),
    [projects]
  );

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] animate-in fade-in duration-300">
      {/* Backdrop with blur similar to mobile menu */}
      <div className="absolute inset-0 backdrop-blur-2xl bg-black/55" onClick={onClose} />

      <div className="relative h-full w-full flex flex-col overflow-y-auto overscroll-contain" data-lenis-prevent>
        {/* Search bar */}
        <div className="sticky top-0 z-10 backdrop-blur-md bg-black/20 border-b border-white/15">
          <div className="max-w-6xl mx-auto px-6 md:px-10 h-20 flex items-center gap-4">
            <Search size={20} className="text-white/70 shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What can we help you find?"
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/50 text-lg md:text-xl font-light tracking-wide"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="text-white/60 hover:text-white text-xs uppercase tracking-[0.2em]"
              >
                clear
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close search"
              className="text-white/80 hover:text-white transition"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto px-6 md:px-10 py-10 md:py-14 text-white">
          {/* EMPTY STATE */}
          {!query && (
            <div className="grid md:grid-cols-[220px_1fr] gap-10 md:gap-16 animate-in fade-in slide-in-from-bottom-3 duration-500">
              {/* Popular terms */}
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/60 mb-5">
                  Popular searches
                </p>
                <ul className="space-y-3">
                  {POPULAR.map((t) => (
                    <li key={t}>
                      <button
                        onClick={() => setQ(t)}
                        className="flex items-center gap-2 text-sm text-white/85 hover:text-white group"
                      >
                        <Search size={12} className="opacity-60 group-hover:opacity-100" />
                        <span className="tracking-wide">{t}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Catalog room grid (like the reference) */}
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/60 mb-5">
                  Browse the collection
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {CATALOG_ROOMS.map((r, i) => (
  <button
    key={r.to}
    onClick={() => go(r.to)}
    className="group text-left animate-in fade-in slide-in-from-bottom-2"
    style={{ animationDelay: `${i * 60}ms` }}
  >
    <div className="aspect-square overflow-hidden bg-white/5 border border-white/10">
      <img
        src={r.image}
        alt={r.label}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
      />
    </div>
    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/80 group-hover:text-white">
      {r.label}
    </p>
  </button>
))}
                </div>

                {/* Featured Projects (big cards) */}
                {featuredProjects.length > 0 && (
                  <div className="mt-12">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/60 mb-5">
                      Highlight projects
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      {featuredProjects.map((p, i) => (
                        <button
                          key={p.slug}
                          onClick={() => go(`/projects/${p.slug}`)}
                          className="group text-left animate-in fade-in slide-in-from-bottom-2"
                          style={{ animationDelay: `${i * 80}ms` }}
                        >
                          <div className="aspect-[4/5] overflow-hidden bg-white/5 border border-white/10">
                            <img
                              src={p.img}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          </div>
                          <p className="mt-3 serif text-lg text-white">{p.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                            {p.location} · {p.year}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RESULTS STATE */}
          {query && (
            <div className="space-y-14 animate-in fade-in duration-300">
              {/* Projects — large boxes */}
              {filteredProjects.length > 0 && (
                <section>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/60 mb-5">
                    Projects · {filteredProjects.length}
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    {filteredProjects.map((p, i) => (
                      <button
                        key={p.slug}
                        onClick={() => go(`/projects/${p.slug}`)}
                        className="group text-left animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <div className="aspect-[4/5] overflow-hidden bg-white/5 border border-white/10">
                          <img
                            src={p.img}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        </div>
                        <p className="mt-3 serif text-lg text-white">{p.name}</p>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                          {p.category} · {p.location}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Catalog rooms */}
              {filteredCatalogs.length > 0 && (
                <section>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/60 mb-5">
                    Catalog · {filteredCatalogs.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filteredCatalogs.map((c) => (
                      <button
                        key={c.to}
                        onClick={() => go(c.to)}
                        className="px-4 py-2 border border-white/25 text-xs uppercase tracking-[0.2em] text-white/85 hover:bg-white hover:text-black transition"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Items */}
              {filteredItems.length > 0 && (
                <section>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/60 mb-5">
                    Items · {filteredItems.length}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {filteredItems.map((it, i) => (
                      <button
                        key={it.slug}
                        onClick={() => go(`/items/${it.slug}`)}
                        className="flex items-center gap-4 p-3 border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left group animate-in fade-in slide-in-from-bottom-1"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className="w-16 h-16 shrink-0 overflow-hidden bg-white/5">
                          {it.image ? (
                            <img
                              src={it.image}
                              alt={it.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate">{it.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/55 truncate">
                            {it.category}
                            {it.code ? ` · ${it.code}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {filteredItems.length === 0 &&
                filteredProjects.length === 0 &&
                filteredCatalogs.length === 0 && (
                  <div className="py-20 text-center text-white/70">
                    <p className="serif text-2xl mb-2">No results</p>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                      Try another keyword
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
