import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import gsap from "gsap";
import {
  Bookmark,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { FurnitureSkyHero } from "@/components/livora/furniture/FurnitureSkyHero";
import { FurnitureShowcaseCard } from "@/components/livora/furniture/FurnitureShowcaseCard";
import { FurnitureShortlistDrawer } from "@/components/livora/furniture/FurnitureShortlistDrawer";
import { FurnitureShowroomBanner } from "@/components/livora/furniture/FurnitureShowroomBanner";
import { useFurnitureCatalog } from "@/components/livora/furniture/useFurnitureCatalog";
import {
  SHORTLIST_OPEN_EVENT,
  updateShortlistFinish,
  useShortlist,
} from "@/components/livora/furniture/shortlistStore";
import type {
  FurnitureFinishOption,
  FurnitureShowcaseItem,
  GridColumns,
} from "@/components/livora/furniture/types";
import { authStorage } from "@/lib/api";
import { addToWishlist, removeFromWishlist } from "@/lib/wishlist";

type SortKey = "curated" | "newest" | "name_asc" | "name_desc";

function DensityIcon({ cols }: { cols: GridColumns }) {
  return (
    <span className="inline-flex items-center gap-[2px]" aria-hidden>
      {Array.from({ length: cols }).map((_, idx) => (
        <span
          key={idx}
          className="block w-[2.5px] h-[11px] rounded-[1px] bg-current opacity-85"
        />
      ))}
    </span>
  );
}

const Furniture: React.FC = () => {
  const { items, categories, loading } = useFurnitureCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const shortlist = useShortlist();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("curated");
  const [columns, setColumns] = useState<GridColumns>(4);
  const [navbarHidden, setNavbarHidden] = useState(false);
  const [shortlistOpen, setShortlistOpen] = useState(false);

  const catalogRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Livora Furniture — Architectural Collection | LIVORA";
  }, []);

  // Sinkron posisi sticky filter bar dengan perilaku auto-hide/reveal Navbar saat scroll
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 5) {
        if (y > lastY && y > 80) setNavbarHidden(true);
        else setNavbarHidden(false);
        lastY = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dengarkan event buka Shortlist Drawer dari Navbar & query ?shortlist=1
  useEffect(() => {
    const openHandler = () => setShortlistOpen(true);
    window.addEventListener(SHORTLIST_OPEN_EVENT, openHandler);
    return () => window.removeEventListener(SHORTLIST_OPEN_EVENT, openHandler);
  }, []);

  useEffect(() => {
    if (searchParams.get("shortlist") === "1") {
      setShortlistOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("shortlist");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Sinkron query ?category= dari halaman Home / menu navbar
  useEffect(() => {
    const raw = (searchParams.get("category") || "").toLowerCase().trim();
    if (!raw || raw === "all" || raw === "new-arrivals") {
      setActiveCategory("all");
      return;
    }
    const matched = categories.find(
      (c) =>
        c.slug.toLowerCase() === raw ||
        c.name.toLowerCase() === raw ||
        `${c.slug.toLowerCase()}s` === raw ||
        `${c.name.toLowerCase()}s` === raw,
    );
    if (matched) {
      setActiveCategory(matched.slug);
      return;
    }
    const alias: Record<string, string> = {
      sofas: "sofa",
      chairs: "chair",
      tables: "table",
      beds: "bed",
      accessories: "accessories",
    };
    const mappedAlias = alias[raw];
    if (mappedAlias) {
      const byAlias = categories.find(
        (c) =>
          c.slug.toLowerCase().includes(mappedAlias) ||
          c.name.toLowerCase().includes(mappedAlias),
      );
      if (byAlias) setActiveCategory(byAlias.slug);
    }
  }, [searchParams, categories]);

  const activeCategoryName = useMemo(() => {
    if (activeCategory === "all") return null;
    return (
      categories.find((c) => c.slug === activeCategory)?.name ?? activeCategory
    );
  }, [activeCategory, categories]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (activeCategory !== "all") {
      const catKey = activeCategory.toLowerCase();
      const catLabel = (activeCategoryName || "").toLowerCase();
      list = list.filter(
        (it) =>
          it.categorySlug.toLowerCase() === catKey ||
          it.category.toLowerCase() === catLabel ||
          it.category.toLowerCase().includes(catKey),
      );
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((it) => {
        const finishHit = it.finishes.some(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            (f.material || "").toLowerCase().includes(q),
        );
        return (
          it.name.toLowerCase().includes(q) ||
          it.code.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          (it.series || "").toLowerCase().includes(q) ||
          it.materialLabel.toLowerCase().includes(q) ||
          finishHit
        );
      });
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "newest":
          return (b.apiId ?? 0) - (a.apiId ?? 0);
        case "curated":
        default: {
          const scoreA = (a.editorialTag ? 2 : 0) + (a.finishes.length > 0 ? 1 : 0);
          const scoreB = (b.editorialTag ? 2 : 0) + (b.finishes.length > 0 ? 1 : 0);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (b.apiId ?? 0) - (a.apiId ?? 0);
        }
      }
    });

    return sorted;
  }, [items, activeCategory, activeCategoryName, searchQuery, sortBy]);

  // Transisi grid halus berbasis GSAP saat filter / sort / densitas kolom berubah
  useEffect(() => {
    if (loading || !gridRef.current) return;
    const ctx = gsap.context(() => {
      const cards = gridRef.current?.querySelectorAll(".furniture-showcase-item");
      if (!cards || cards.length === 0) return;
      gsap.fromTo(
        cards,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.44,
          stagger: 0.022,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
      );
    }, gridRef);

    return () => ctx.revert();
  }, [activeCategory, sortBy, columns, searchQuery, loading, filteredItems.length]);

  const handleSelectCategory = (slug: string) => {
    setActiveCategory(slug);
    const next = new URLSearchParams(searchParams);
    if (slug === "all") next.delete("category");
    else next.set("category", slug);
    setSearchParams(next, { replace: true });
  };

  const handleToggleSave = (
    item: FurnitureShowcaseItem,
    activeFinish: FurnitureFinishOption,
  ) => {
    const result = shortlist.toggle({
      slug: item.slug,
      apiId: item.apiId,
      name: item.name,
      code: item.code,
      category: item.category,
      image: activeFinish.furnitureImage || activeFinish.previewImage || item.image || null,
      finishId: activeFinish.id,
      finishName: activeFinish.name,
      finishHex: activeFinish.hex,
      dimensionsLabel: item.dimensionsLabel,
      materialLabel: activeFinish.material || item.materialLabel,
    });

    // Sinkron opsional dengan wishlist server jika user sedang login
    if (item.apiId && authStorage.getToken()) {
      if (result.saved) {
        addToWishlist("item", item.apiId).catch(() => {});
      } else {
        removeFromWishlist("item", item.apiId).catch(() => {});
      }
    }

    if (result.saved) {
      toast.success(`${item.name} (${activeFinish.name}) disimpan ke shortlist`, {
        action: {
          label: "Lihat Shortlist",
          onClick: () => setShortlistOpen(true),
        },
      });
    } else {
      toast.info(`${item.name} dihapus dari shortlist`);
    }
  };

  const handleFinishChange = (
    item: FurnitureShowcaseItem,
    finish: FurnitureFinishOption,
  ) => {
    if (shortlist.isSaved(item.slug)) {
      updateShortlistFinish(item.slug, {
        id: finish.id,
        name: finish.name,
        hex: finish.hex,
        image: finish.furnitureImage || finish.previewImage || item.image || null,
      });
    }
  };

  const gridColsClass =
    columns === 3
      ? "grid grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-9 sm:gap-y-12"
      : columns === 5
      ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 sm:gap-x-5 gap-y-8 sm:gap-y-10"
      : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-9 sm:gap-y-11";

  const hasFilters = activeCategory !== "all" || searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] text-[#0B426E]">
      <Navbar />

      <main className="flex-1">
        {/* A. ATMOSPHERIC SKY-TO-STONE HERO */}
        <FurnitureSkyHero
          activeCategoryLabel={activeCategoryName}
          totalCount={items.length}
          onScrollToCatalog={() =>
            catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />

        {/* B. STICKY FILTER, SEARCH & GRID DENSITY BAR */}
        <div
          ref={catalogRef}
          className={`sticky z-30 bg-[#F8F9FB]/92 backdrop-blur-md border-b border-[#0B426E]/10 transition-[top] duration-500 ${
            navbarHidden ? "top-0" : "top-20"
          }`}
        >
          <div className="container-livora py-3.5 md:py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Pill Category Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 lg:pb-0 -mx-1 px-1">
                <button
                  type="button"
                  onClick={() => handleSelectCategory("all")}
                  className={`px-4 py-2 rounded-full text-[12.5px] tracking-[0.02em] transition-all duration-200 whitespace-nowrap shrink-0 ${
                    activeCategory === "all"
                      ? "bg-[#0B426E] text-white font-medium"
                      : "bg-white border border-[#0B426E]/12 text-[#4B5E71] hover:border-[#1E88C7]/50 hover:text-[#0B426E]"
                  }`}
                >
                  All Collection
                </button>

                {categories.map((cat) => {
                  const active = activeCategory === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => handleSelectCategory(cat.slug)}
                      className={`px-4 py-2 rounded-full text-[12.5px] tracking-[0.02em] transition-all duration-200 whitespace-nowrap shrink-0 ${
                        active
                          ? "bg-[#0B426E] text-white font-medium"
                          : "bg-white border border-[#0B426E]/12 text-[#4B5E71] hover:border-[#1E88C7]/50 hover:text-[#0B426E]"
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {/* Right: Search, Piece Count, Sort & 3/4/5 Column Density Switcher */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
                {/* Compact Inline Search */}
                <div className="relative flex-1 min-w-[155px] sm:w-44">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5E71]/70" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari karya / material..."
                    aria-label="Cari furnitur atau material"
                    className="w-full h-9 pl-9 pr-7 rounded-full border border-[#0B426E]/12 bg-white text-[12.5px] text-[#0B426E] placeholder:text-[#4B5E71]/65 outline-none focus:border-[#1E88C7] transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Bersihkan pencarian"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4B5E71] hover:text-[#0B426E]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Subtle Piece Count */}
                <span className="hidden sm:inline-block text-xs text-[#4B5E71] tabular-nums px-1">
                  {loading
                    ? "Memuat…"
                    : `${filteredItems.length} ${filteredItems.length === 1 ? "Piece" : "Pieces"}`}
                </span>

                <span
                  aria-hidden
                  className="hidden sm:inline-block h-4 w-px bg-[#0B426E]/12"
                />

                {/* Sort Select (STRICTLY NO PRICE SORT) */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    aria-label="Urutkan koleksi"
                    className="appearance-none h-9 pl-3.5 pr-8 rounded-full border border-[#0B426E]/12 bg-white text-[12.5px] text-[#0B426E] outline-none hover:border-[#1E88C7]/50 focus:border-[#1E88C7] transition-colors cursor-pointer"
                  >
                    <option value="curated">Kurasi LIVORA</option>
                    <option value="newest">Terbaru</option>
                    <option value="name_asc">Nama A – Z</option>
                    <option value="name_desc">Nama Z – A</option>
                  </select>
                  <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-[#4B5E71] absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                {/* Desktop Grid Density Switcher: 3 | 4 (Default) | 5 Columns */}
                <div
                  role="group"
                  aria-label="Kepadatan kolom katalog"
                  className="hidden lg:inline-flex items-center rounded-full bg-[#EEF1F5] border border-[#0B426E]/10 p-1"
                >
                  {([3, 4, 5] as GridColumns[]).map((cols) => {
                    const active = columns === cols;
                    return (
                      <button
                        key={cols}
                        type="button"
                        onClick={() => setColumns(cols)}
                        aria-pressed={active}
                        title={`${cols} Kolom`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] transition-all duration-200 whitespace-nowrap ${
                          active
                            ? "bg-[#0B426E] text-white font-medium"
                            : "text-[#4B5E71] hover:text-[#0B426E]"
                        }`}
                      >
                        <DensityIcon cols={cols} />
                        <span>{cols} Kolom</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* C. FRAMELESS ARCHITECTURAL FURNITURE GRID */}
        <section className="py-8 sm:py-12 md:py-14 bg-[#F8F9FB]">
          <div className="container-livora">
            {/* Subtle Active Filter / Shortlist Strip */}
            {(hasFilters || shortlist.count > 0) && (
              <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#EAF4FA]/70 border border-[#1E88C7]/15 px-4 py-2.5 text-xs">
                <div className="flex items-center flex-wrap gap-2 text-[#0B426E]">
                  <span>
                    Menampilkan <strong>{filteredItems.length}</strong> karya
                    {activeCategoryName ? ` dalam kategori ${activeCategoryName}` : " koleksi LIVORA"}
                    {searchQuery.trim() ? ` untuk "${searchQuery.trim()}"` : ""}.
                  </span>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectCategory("all");
                        setSearchQuery("");
                      }}
                      className="inline-flex items-center gap-1 text-[#1E88C7] hover:text-[#0B426E] font-medium underline underline-offset-4 ml-1"
                    >
                      <X className="w-3 h-3" /> Tampilkan Semua
                    </button>
                  )}
                </div>

                {shortlist.count > 0 && (
                  <button
                    type="button"
                    onClick={() => setShortlistOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#0B426E]/12 px-3.5 py-1 text-[11.5px] font-medium text-[#0B426E] hover:border-[#1E88C7] transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-[#1E88C7] text-[#1E88C7]" />
                    <span>Shortlist ({shortlist.count})</span>
                  </button>
                )}
              </div>
            )}

            {/* Loading Skeletons */}
            {loading ? (
              <div className={gridColsClass}>
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="animate-pulse">
                    <div className="aspect-[4/5] w-full rounded-2xl bg-[#EEF1F5]" />
                    <div className="pt-3.5 space-y-2">
                      <div className="h-2.5 w-20 rounded bg-[#E6ECF2]" />
                      <div className="h-4 w-3/4 rounded bg-[#DDE5EE]" />
                      <div className="h-3 w-2/3 rounded bg-[#E6ECF2]" />
                      <div className="flex gap-2 pt-1">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#DDE5EE]" />
                        <div className="w-3.5 h-3.5 rounded-full bg-[#DDE5EE]" />
                        <div className="w-3.5 h-3.5 rounded-full bg-[#DDE5EE]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-24 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#EAF4FA] text-[#1E88C7] mx-auto mb-4 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <h2 className="serif text-3xl font-light text-[#0B426E]">
                  Belum Ada Karya yang Sesuai
                </h2>
                <p className="text-sm text-[#4B5E71] mt-2 leading-relaxed">
                  Coba ubah kategori atau kata kunci material untuk menelusuri seluruh kurasi furnitur LIVORA.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectCategory("all");
                    setSearchQuery("");
                  }}
                  className="mt-6 rounded-full bg-[#0B426E] hover:bg-[#083559] text-white px-6 py-2.5 text-xs uppercase tracking-[0.18em] transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div ref={gridRef} className={gridColsClass}>
                {filteredItems.map((item) => (
                  <FurnitureShowcaseCard
                    key={item.slug}
                    item={item}
                    columns={columns}
                    saved={shortlist.isSaved(item.slug)}
                    onToggleSave={handleToggleSave}
                    onFinishChange={handleFinishChange}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* E. SIGNATURE BOTTOM BANNER: "Designing Better Spaces Together." */}
        <FurnitureShowroomBanner />
      </main>

      {/* D. SAVED SHORTLIST DRAWER */}
      <FurnitureShortlistDrawer
        open={shortlistOpen}
        items={shortlist.items}
        onClose={() => setShortlistOpen(false)}
        onRemove={shortlist.remove}
        onClear={() => {
          shortlist.clear();
          toast.info("Shortlist dibersihkan");
        }}
      />

      <Footer />
    </div>
  );
};

export default Furniture;
