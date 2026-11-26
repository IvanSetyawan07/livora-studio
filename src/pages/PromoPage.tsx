import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Loader2, Sparkles, Tag, Search, X } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import {
  CatalogColumnToggle,
  FurnitureCard,
  getCatalogGridClass,
  type CatalogColumns,
} from "@/components/livora/FurnitureCard";
import { getPromoItems } from "@/lib/promoApi";
import { api } from "@/lib/api";
import { trackLivoraEvent } from "@/lib/analytics";
import type { RichItem } from "@/lib/itemsApi";
import promoHeroBg from "@/assets/_opt/hero-update-800.webp";

type SortOption = "discount_desc" | "name_asc" | "newest";

export default function PromoPage() {
  const [items, setItems] = useState<RichItem[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("discount_desc");
  const [columns, setColumns] = useState<CatalogColumns>(4);

  useEffect(() => {
    document.title = "Promo Spesial & Penawaran Terbatas | LIVORA";
    window.scrollTo(0, 0);
    trackLivoraEvent("view_promo");

    let cancelled = false;
    setLoading(true);

    Promise.all([
      getPromoItems(),
      api.get("/taxonomies/furniture-types").then((r) => r.data).catch(() => []),
    ])
      .then(([promoItems, fetchedTypes]) => {
        if (cancelled) return;
        setItems(promoItems);
        setTypes(fetchedTypes);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (selectedType !== "all") {
      result = result.filter(
        (i) =>
          i.category.toLowerCase() === selectedType.toLowerCase() ||
          i.type?.slug === selectedType ||
          i.type?.name?.toLowerCase() === selectedType.toLowerCase(),
      );
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.code?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q) ||
          (i.variants ?? []).some((v) =>
            (v.color_name || "").toLowerCase().includes(q),
          ),
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "discount_desc":
          return (Number(b.discount_value) || 0) - (Number(a.discount_value) || 0);
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "");
        case "newest":
        default:
          return (b.apiId || 0) - (a.apiId || 0);
      }
    });

    return result;
  }, [items, selectedType, searchQuery, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1D1B18]">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-[#141414] text-white overflow-hidden">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none bg-cover bg-center"
            style={{ backgroundImage: `url(${promoHeroBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-[#141414]/90 pointer-events-none" />

          <div className="container-livora relative z-10 text-center max-w-3xl mx-auto px-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-[#D7B483]/40 text-[#D7B483] text-[11px] uppercase tracking-[0.25em] mb-4 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Special Offers & Limited Deals
            </div>

            <h1 className="serif font-light text-4xl sm:text-5xl md:text-6xl tracking-wide leading-tight">
              Koleksi Furnitur & Desain <em className="italic text-[#E5C396]">Promo</em>
            </h1>

            <p className="mt-4 md:mt-6 text-sm sm:text-base text-stone-300 font-light leading-relaxed max-w-xl mx-auto">
              Wujudkan interior impian dengan furnitur pilihan kurasi LIVORA.
              Penawaran eksklusif untuk koleksi siap kirim maupun custom bespoke.
            </p>
          </div>
        </section>

        {/* Toolbar: Category Pills, Search, Sort & Column Switcher */}
        <section className="border-b border-[#EAE4DB] bg-[#FAF8F5]/92 sticky top-20 z-30 backdrop-blur-md">
          <div className="container-livora py-3.5 md:py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Category pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 lg:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedType("all")}
                  className={`px-4 py-2 rounded-full text-[13px] transition-all whitespace-nowrap shrink-0 ${
                    selectedType === "all"
                      ? "bg-[#181614] text-[#FAF8F5] font-medium shadow-sm"
                      : "bg-white border border-[#E6E0D6] text-[#4C4740] hover:border-[#181614]/40 hover:text-[#181614]"
                  }`}
                >
                  Semua ({items.length})
                </button>
                {types.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedType(t.slug)}
                    className={`px-4 py-2 rounded-full text-[13px] transition-all whitespace-nowrap shrink-0 ${
                      selectedType === t.slug
                        ? "bg-[#181614] text-[#FAF8F5] font-medium shadow-sm"
                        : "bg-white border border-[#E6E0D6] text-[#4C4740] hover:border-[#181614]/40 hover:text-[#181614]"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              {/* Search, Sort & Columns */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="relative flex-1 min-w-[160px] sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8277]" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari item promo..."
                    className="w-full h-9 pl-9 pr-7 rounded-full border border-[#E6E0D6] bg-white text-[13px] focus:outline-none focus:border-[#181614]/60"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8277] hover:text-[#1D1B18]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Urutkan"
                    className="appearance-none h-9 pl-3.5 pr-8 rounded-full border border-[#E6E0D6] bg-white text-[13px] text-[#2F2B26] focus:outline-none cursor-pointer"
                  >
                    <option value="discount_desc">Penawaran Terbaik</option>
                    <option value="name_asc">Nama A – Z</option>
                    <option value="newest">Terbaru</option>
                  </select>
                  <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-[#7D756B] absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <CatalogColumnToggle value={columns} onChange={setColumns} />
              </div>
            </div>
          </div>
        </section>

        {/* Product Grid */}
        <section className="py-10 md:py-16">
          <div className="container-livora">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#7D756B]">
                <Loader2 className="w-7 h-7 animate-spin text-[#1D1B18]" />
                <p className="text-sm">Memuat item promosi…</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 max-w-md mx-auto">
                <Tag className="w-12 h-12 mx-auto text-[#8A8277]/40 mb-3" strokeWidth={1.5} />
                <h3 className="serif text-2xl font-light">Belum Ada Item Promo yang Sesuai</h3>
                <p className="text-sm text-[#7D756B] mt-2">
                  Coba ubah kata kunci pencarian atau pilih kategori lain untuk melihat koleksi promo kami.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType("all");
                    setSearchQuery("");
                  }}
                  className="mt-6 px-6 py-2.5 rounded-full bg-[#181614] text-[#FAF8F5] text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className={getCatalogGridClass(columns)}>
                {filteredItems.map((item) => (
                  <FurnitureCard
                    key={item.slug}
                    item={item}
                    compact={columns === 5}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Bottom Consultation Banner */}
        <section className="py-16 bg-[#F3EFE8] border-t border-[#E6E0D6]">
          <div className="container-livora text-center max-w-2xl mx-auto px-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8C7A64] mb-2">Bespoke Design</p>
            <h2 className="serif text-3xl sm:text-4xl font-light">Punya Rencana Proyek Interior Khusus?</h2>
            <p className="text-sm text-[#6E675E] font-light mt-3 leading-relaxed">
              Tim arsitek dan desainer LIVORA siap mendampingi Anda mewujudkan ruang hunian dan komersial dengan penawaran eksklusif.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
              <Link
                to="/appointment"
                className="px-6 py-3 rounded-full bg-[#181614] text-[#FAF8F5] text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
              >
                Jadwalkan Konsultasi
              </Link>
              <Link
                to="/furniture"
                className="px-6 py-3 rounded-full border border-[#D8D0C4] bg-white text-[#1D1B18] text-xs uppercase tracking-[0.2em] hover:border-[#181614] transition-colors"
              >
                Lihat Seluruh Katalog
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
