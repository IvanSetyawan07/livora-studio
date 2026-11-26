import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import gsap from "gsap";
import {
  ArrowLeft,
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
import {
  ensureBannersLoaded,
  getAllBannersList,
  subscribeBanners,
  type ThemeBanner,
} from "@/lib/themeBanners";
import {
  getAllThumbnails,
  subscribeThumbnails,
  type ThemeThumbnail,
} from "@/lib/themeThumbnails";
import {
  categoriesMatch,
  getFallbackCategoryImage,
  getFallbackCategoryMeta,
  lookupCategoryBanners,
  lookupCategoryThumbnail,
  matchesFallbackItemCategory,
} from "@/lib/furnitureCategoryMedia";
import { prefersReducedMotion } from "@/lib/motionTokens";
import { scrollToTarget } from "@/components/SmoothScroll";

type SortKey = "curated" | "newest" | "name_asc" | "name_desc";

function parseInitialCategoryParam(rawParam: string | null): string {
  const clean = (rawParam || "").toLowerCase().trim();
  if (!clean || clean === "all" || clean === "new-arrivals") return "all";
  return clean;
}

function formatCategoryFallbackLabel(slug: string): string {
  const preset = getFallbackCategoryMeta(slug);
  if (preset) return preset.name;
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

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
  const { items, categories, loading, usingFallback } = useFurnitureCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const shortlist = useShortlist();

  const [activeCategory, setActiveCategory] = useState<string>(() =>
    parseInitialCategoryParam(searchParams.get("category")),
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("curated");
  const [columns, setColumns] = useState<GridColumns>(4);
  const [navbarHidden, setNavbarHidden] = useState(false);
  const [barStuck, setBarStuck] = useState(false);
  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [bannersStore, setBannersStore] = useState<Record<string, ThemeBanner[]>>(() =>
    getAllBannersList(),
  );
  const [thumbnailsStore, setThumbnailsStore] = useState<
    Record<string, ThemeThumbnail>
  >({});

  const stickySentinelRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    void ensureBannersLoaded().then((store) => {
      if (alive) setBannersStore({ ...store });
    });
    const unsubBanners = subscribeBanners(() => {
      setBannersStore({ ...getAllBannersList() });
    });

    getAllThumbnails()
      .then((thumbs) => {
        if (alive) setThumbnailsStore(thumbs);
      })
      .catch(() => {});
    const unsubThumbs = subscribeThumbnails(() => {
      getAllThumbnails()
        .then((thumbs) => {
          if (alive) setThumbnailsStore(thumbs);
        })
        .catch(() => {});
    });

    return () => {
      alive = false;
      unsubBanners();
      unsubThumbs();
    };
  }, []);

  // Sinkron posisi sticky filter bar dengan perilaku auto-hide/reveal Navbar saat scroll (GPU transform)
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

  useEffect(() => {
    const sentinel = stickySentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setBarStuck(!entry.isIntersecting);
      },
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
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

  // Sinkron query ?category= dari halaman Home / Permanent Gallery / menu navbar
  useEffect(() => {
    const raw = parseInitialCategoryParam(searchParams.get("category"));
    if (raw === "all") {
      setActiveCategory("all");
      return;
    }

    const matched = categories.find(
      (c) =>
        c.slug.toLowerCase() === raw ||
        c.name.toLowerCase() === raw ||
        categoriesMatch(c.slug, raw) ||
        categoriesMatch(c.name, raw),
    );
    if (matched) {
      setActiveCategory(matched.slug);
    } else {
      setActiveCategory(raw);
    }
  }, [searchParams, categories]);

  const activeCategoryName = useMemo(() => {
    if (activeCategory === "all") return null;
    const matched = categories.find(
      (c) =>
        c.slug === activeCategory ||
        categoriesMatch(c.slug, activeCategory) ||
        categoriesMatch(c.name, activeCategory),
    );
    return matched?.name ?? formatCategoryFallbackLabel(activeCategory);
  }, [activeCategory, categories]);

  useEffect(() => {
    document.title = activeCategoryName
      ? `${activeCategoryName} Collection — Livora Furniture | LIVORA`
      : "Livora Furniture — Architectural Collection | LIVORA";
  }, [activeCategoryName]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (activeCategory !== "all") {
      const strictMatches = list.filter(
        (it) =>
          categoriesMatch(it.categorySlug, activeCategory) ||
          categoriesMatch(it.category, activeCategory) ||
          (activeCategoryName
            ? categoriesMatch(it.category, activeCategoryName)
            : false),
      );

      if (strictMatches.length > 0 || !usingFallback) {
        list = strictMatches;
      } else {
        list = list.filter((it) =>
          matchesFallbackItemCategory(it, activeCategoryName || activeCategory),
        );
      }
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
  }, [items, activeCategory, activeCategoryName, usingFallback, searchQuery, sortBy]);

  /**
   * Lifestyle Category Banners (Admin -> Taxonomies -> Banner Dalam Kategori,
   * falling back to Thumbnail Kartu or curated category interior scene).
   * Shown inside a specific category view when search is empty, creating the
   * iconic 2x2 editorial banner + product grid rhythm.
   */
  const activeBanners = useMemo<ThemeBanner[]>(() => {
    if (activeCategory === "all" || searchQuery.trim().length > 0) return [];
    const adminBanners = lookupCategoryBanners(
      bannersStore,
      activeCategoryName,
      activeCategory,
    );
    if (adminBanners.length > 0) return adminBanners;

    const thumbFallback = lookupCategoryThumbnail(
      thumbnailsStore,
      activeCategoryName,
      activeCategory,
    );
    const lifestyleFallback =
      thumbFallback || getFallbackCategoryImage(activeCategoryName || activeCategory);

    return [
      {
        image: lifestyleFallback,
        title: "",
        updatedAt: 0,
      },
    ];
  }, [activeCategory, activeCategoryName, searchQuery, bannersStore, thumbnailsStore]);

  // Transisi grid halus berbasis GSAP saat filter / sort / densitas kolom berubah (dibatasi total 0.22s & hormati reduced-motion)
  useEffect(() => {
    if (loading || !gridRef.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const cards = gridRef.current?.querySelectorAll(".furniture-showcase-item");
      if (!cards || cards.length === 0) return;
      const visibleBatch = Array.from(cards).slice(0, 20);
      gsap.fromTo(
        visibleBatch,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.38,
          stagger: { amount: 0.2 },
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
    activeFinish: FurnitureFinishOption | null,
  ) => {
    const result = shortlist.toggle({
      slug: item.slug,
      apiId: item.apiId,
      name: item.name,
      code: item.code,
      category: item.category,
      image: activeFinish?.furnitureImage || activeFinish?.previewImage || item.image || null,
      finishId: activeFinish?.id ?? null,
      finishName: activeFinish?.name || "",
      finishHex: activeFinish?.hex || "",
      dimensionsLabel: item.dimensionsLabel,
      materialLabel: activeFinish?.material || item.materialLabel,
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
      toast.success(
        `${item.name}${activeFinish?.name ? ` (${activeFinish.name})` : ""} disimpan ke shortlist`,
        {
          action: {
            label: "Lihat Shortlist",
            onClick: () => setShortlistOpen(true),
          },
        },
      );
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
          onScrollToCatalog={() => {
            if (catalogRef.current) {
              scrollToTarget(catalogRef.current, { offset: -80 });
            }
          }}
        />

        {/* Sentinel untuk deteksi sticky tanpa getBoundingClientRect di scroll */}
        <div ref={stickySentinelRef} className="h-px w-full" aria-hidden />

        {/* B. STICKY FILTER, SEARCH & GRID DENSITY BAR (GPU translateY, zero backdrop-blur) */}
        <div
          ref={catalogRef}
          className={`sticky top-0 z-30 bg-[#F8F9FB]/92 backdrop-blur-md border-b border-[#0B426E]/10 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
            barStuck && !navbarHidden ? "translate-y-20" : "translate-y-0"
          }`}
        >
          <div className="container-livora py-3.5 md:py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Pill Category Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 lg:pb-0 -mx-1 px-1">
                <button
                  type="button"
                  onClick={() => handleSelectCategory("all")}
                  className={`px-4 py-2 rounded-full text-[12.5px] tracking-[0.02em] transition-colors duration-200 whitespace-nowrap shrink-0 ${
                    activeCategory === "all"
                      ? "bg-[#0B426E] text-white font-medium"
                      : "bg-white border border-[#0B426E]/12 text-[#4B5E71] hover:border-[#1E88C7]/50 hover:text-[#0B426E]"
                  }`}
                >
                  All Collection
                </button>

                {categories.map((cat) => {
                  const active =
                    activeCategory === cat.slug ||
                    categoriesMatch(activeCategory, cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => handleSelectCategory(cat.slug)}
                      className={`px-4 py-2 rounded-full text-[12.5px] tracking-[0.02em] transition-colors duration-200 whitespace-nowrap shrink-0 ${
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
                    placeholder={
                      activeCategoryName
                        ? `Filter ${activeCategoryName.toLowerCase()}...`
                        : "Cari karya / material..."
                    }
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] transition-colors duration-200 whitespace-nowrap ${
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
            {/* Editorial Category Header (`← Back to All Categories` like Screenshot 2) */}
            {activeCategory !== "all" ? (
              <div className="mb-7 md:mb-9 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectCategory("all");
                      setSearchQuery("");
                    }}
                    className="group inline-flex items-center gap-2 py-1.5 text-[10.5px] uppercase tracking-[0.28em] font-medium text-[#4B5E71] hover:text-[#0B426E] transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                    <span>Back to Themes</span>
                  </button>

                  <span
                    aria-hidden
                    className="hidden sm:inline-block h-4 w-px bg-[#0B426E]/15"
                  />

                  <span className="text-xs text-[#4B5E71]">
                    <strong className="font-medium text-[#0B426E]">
                      {activeCategoryName}
                    </strong>{" "}
                    · {filteredItems.length}{" "}
                    {filteredItems.length === 1 ? "piece" : "pieces"}
                    {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ""}
                  </span>
                </div>

                {shortlist.count > 0 && (
                  <button
                    type="button"
                    onClick={() => setShortlistOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#0B426E]/12 px-3.5 py-1.5 text-[11.5px] font-medium text-[#0B426E] hover:border-[#1E88C7] transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-[#1E88C7] text-[#1E88C7]" />
                    <span>Shortlist ({shortlist.count})</span>
                  </button>
                )}
              </div>
            ) : (
              (hasFilters || shortlist.count > 0) && (
                <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#EAF4FA]/70 border border-[#1E88C7]/15 px-4 py-2.5 text-xs">
                  <div className="flex items-center flex-wrap gap-2 text-[#0B426E]">
                    <span>
                      Menampilkan <strong>{filteredItems.length}</strong> karya
                      koleksi LIVORA
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
              )
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
              <>
                {activeBanners.length > 0 && (
                  <style>{`
                    .furniture-category-grid { grid-auto-flow: dense; }
                    @media (min-width: 1024px) {
                      ${activeBanners
                        .map((_, i) => {
                          const n = i + 1;
                          const rightColStart =
                            columns === 3 ? 2 : columns === 5 ? 4 : 3;
                          const colStart = n % 2 === 1 ? 1 : rightColStart;
                          const rowStart = 1 + i * 5;
                          const rowSpan = filteredItems.length >= 3 ? 2 : 1;
                          return `.furniture-category-grid [data-banner="${n}"]{grid-column:${colStart} / span 2;grid-row:${rowStart} / span ${rowSpan};}`;
                        })
                        .join("\n")}
                    }
                  `}</style>
                )}

                <div
                  ref={gridRef}
                  className={`${
                    activeBanners.length > 0 ? "furniture-category-grid " : ""
                  }${gridColsClass}`}
                >
                  {(() => {
                    const nodes: React.ReactNode[] = filteredItems.map((item) => (
                      <FurnitureShowcaseCard
                        key={item.slug}
                        item={item}
                        columns={columns}
                        saved={shortlist.isSaved(item.slug)}
                        onToggleSave={handleToggleSave}
                        onFinishChange={handleFinishChange}
                      />
                    ));

                    activeBanners.forEach((b, i) => {
                      const insertIdx = Math.min(i * 12, nodes.length);
                      const bannerEl = (
                        <div
                          key={`__cat_banner_${activeCategory}_${i}__`}
                          data-banner={i + 1}
                          className="furniture-showcase-item col-span-2 relative overflow-hidden rounded-2xl border border-[#0B426E]/8 bg-[#EEF1F5] aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[380px]"
                        >
                          <img
                            src={b.image}
                            alt={
                              b.title ||
                              `${activeCategoryName || "Furniture"} editorial banner ${i + 1}`
                            }
                            loading={i === 0 ? "eager" : "lazy"}
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover object-center"
                          />
                          {b.title && (
                            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                              <p className="serif text-2xl sm:text-3xl text-white font-light">
                                {b.title}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                      nodes.splice(insertIdx, 0, bannerEl);
                    });

                    return nodes;
                  })()}
                </div>
              </>
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
