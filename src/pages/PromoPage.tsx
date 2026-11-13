import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Filter, Loader2, Sparkles, Tag, Search, X, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { PromoBadge } from "@/components/livora/PromoPriceTag";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { getPromoItems } from "@/lib/promoApi";
import { api } from "@/lib/api";
import type { RichItem } from "@/lib/itemsApi";

type SortOption = "discount_desc" | "name_asc" | "newest";

export default function PromoPage() {
  const [items, setItems] = useState<RichItem[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("discount_desc");

  useEffect(() => {
    document.title = "Promo Spesial & Penawaran Terbatas | LIVORA";
    window.scrollTo(0, 0);

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

    // Filter type
    if (selectedType !== "all") {
      result = result.filter(
        (i) =>
          i.category.toLowerCase() === selectedType.toLowerCase() ||
          (i as any).type?.slug === selectedType ||
          (i as any).type?.name?.toLowerCase() === selectedType.toLowerCase()
      );
    }

    // Filter search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.code?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
      );
    }

    // Sort
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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-[#141414] text-white overflow-hidden">
          {/* Subtle architectural background texture */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none bg-cover bg-center"
            style={{ backgroundImage: `url('/assets/hero-update-800-Da07bWV0.webp')` }}
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
              Penawaran diskon terbatas untuk koleksi siap kirim maupun custom bespoke.
            </p>
          </div>
        </section>

        {/* Toolbar: Category Filter, Search & Sorting */}
        <section className="border-b border-border bg-card/50 sticky top-16 md:top-20 z-30 backdrop-blur-md">
          <div className="container-livora py-4 px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Category pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedType("all")}
                  className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-[0.14em] transition-all whitespace-nowrap min-h-[38px] ${
                    selectedType === "all"
                      ? "bg-foreground text-background font-medium"
                      : "border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua ({items.length})
                </button>
                {types.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedType(t.slug)}
                    className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-[0.14em] transition-all whitespace-nowrap min-h-[38px] ${
                      selectedType === t.slug
                        ? "bg-foreground text-background font-medium"
                        : "border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              {/* Search & Sort Dropdown */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1 md:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari item promo..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-md border border-border bg-background text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Urutkan"
                    className="py-1.5 px-2 rounded-md border border-border bg-background text-xs sm:text-sm focus:outline-none"
                  >
                    <option value="discount_desc">Diskon Terbesar</option>
                    <option value="name_asc">Nama (A → Z)</option>
                    <option value="newest">Terbaru</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Grid */}
        <section className="py-12 md:py-20">
          <div className="container-livora px-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
                <Loader2 className="w-7 h-7 animate-spin text-foreground" />
                <p className="text-sm">Memuat item promosi…</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 max-w-md mx-auto">
                <Tag className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" strokeWidth={1.5} />
                <h3 className="serif text-2xl font-light">Belum Ada Item Promo yang Sesuai</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Coba ubah kata kunci pencarian atau pilih kategori lain untuk melihat koleksi promo kami.
                </p>
                <button
                  onClick={() => {
                    setSelectedType("all");
                    setSearchQuery("");
                  }}
                  className="mt-6 px-6 py-2.5 rounded-full border border-foreground text-xs uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                {filteredItems.map((item) => (
                  <PromoItemCard key={item.slug} item={item} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Bottom Consultation Banner */}
        <section className="py-16 bg-muted/40 border-t border-border">
          <div className="container-livora text-center max-w-2xl mx-auto px-4">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Bespoke Design</p>
            <h2 className="serif text-3xl sm:text-4xl font-light">Punya Rencana Proyek Interior Khusus?</h2>
            <p className="text-sm text-foreground/75 font-light mt-3 leading-relaxed">
              Tim arsitek dan desainer LIVORA siap mendampingi Anda mewujudkan ruang hunian dan komersial dengan penawaran eksklusif.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
              <Link
                to="/appointment"
                className="px-6 py-3 rounded-full bg-foreground text-background text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
              >
                Jadwalkan Konsultasi
              </Link>
              <Link
                to="/furniture"
                className="px-6 py-3 rounded-full border border-border text-xs uppercase tracking-[0.2em] hover:bg-card transition-colors"
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

function PromoItemCard({ item }: { item: RichItem }) {
  return (
    <Link
      to={`/items/${item.slug}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className="relative active:scale-[0.98] transition-all duration-300"
        style={{
          background: "#FAFAF8",
          border: "1px solid #E8E4DF",
          borderRadius: "12px",
          overflow: "hidden",
          aspectRatio: "31 / 22",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Promo Badge at top-left corner */}
        {item.is_on_promo && (
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10">
            <PromoBadge text={item.promo_badge_text || "PROMO"} />
          </div>
        )}

        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-contain p-3 sm:p-4 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-2/3 h-2/3 transition-transform duration-500 group-hover:scale-105">
            <ItemIllustration name={item.name} size={220} />
          </div>
        )}
      </div>

      <div className="mt-3 sm:mt-4 px-1">
        <h3 className="text-sm font-medium text-foreground leading-snug group-hover:text-[#A88247] transition-colors">
          {item.name}
        </h3>
        {item.code && (
          <p className="text-[10px] uppercase tracking-[0.15em] text-foreground/50 mt-0.5">
            {item.code}
          </p>
        )}

        <div className="mt-2.5 flex items-center justify-between text-xs text-foreground/60 group-hover:text-foreground transition-colors pt-2 border-t border-border/50">
          <span className="uppercase tracking-[0.15em] text-[10px]">
            {item.category || "Furniture"}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-medium text-[#A88247]">
            Detail <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
