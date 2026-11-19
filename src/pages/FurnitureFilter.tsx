import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Search, X } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { PageBreadcrumb } from "@/components/livora/Breadcrumb";
import {
  CatalogColumnToggle,
  FurnitureCard,
  getCatalogGridClass,
  type CatalogColumns,
} from "@/components/livora/FurnitureCard";
import { api } from "@/lib/api";
import { mapApiItem, type RichItem } from "@/lib/itemsApi";

type Kind = "theme" | "category" | "collection";
type SortOption = "curated" | "newest" | "name_asc" | "name_desc";

const KIND_LABEL: Record<Kind, string> = {
  theme: "Theme",
  category: "Category",
  collection: "Collection",
};

export default function FurnitureFilter() {
  const { kind, slug } = useParams<{ kind: Kind; slug: string }>();
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<CatalogColumns>(4);
  const [sortBy, setSortBy] = useState<SortOption>("curated");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!kind || !slug) return;
    setLoading(true);
    api
      .get(`/items`, { params: { [kind]: slug } })
      .then((r) => setRawItems(r.data || []))
      .catch(() => setRawItems([]))
      .finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [kind, slug]);

  const items: RichItem[] = useMemo(() => rawItems.map(mapApiItem), [rawItems]);

  const title = useMemo(() => {
    if (!rawItems.length || !kind) return slug ?? "";
    if (kind === "collection") return rawItems[0]?.collection?.name ?? slug;
    const first = rawItems[0];
    const list = kind === "theme" ? first?.themes : first?.categories;
    const match = (list ?? []).find((x: any) => x.slug === slug);
    return match?.name ?? slug;
  }, [rawItems, kind, slug]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? items.filter(
          (it) =>
            it.name.toLowerCase().includes(q) ||
            (it.code || "").toLowerCase().includes(q) ||
            (it.variants ?? []).some((v) =>
              (v.color_name || "").toLowerCase().includes(q),
            ),
        )
      : [...items];

    list.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "newest":
          return (b.apiId ?? 0) - (a.apiId ?? 0);
        case "curated":
        default:
          return (b.apiId ?? 0) - (a.apiId ?? 0);
      }
    });
    return list;
  }, [items, searchQuery, sortBy]);

  const kindLabel = kind ? KIND_LABEL[kind] : "";

  useEffect(() => {
    document.title = `${title} — LIVORA`;
  }, [title]);

  return (
    <>
      <Navbar />
      <main className="bg-[#FAF8F5] min-h-screen">
        <PageBreadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Furniture", to: "/furniture" },
            { label: `${kindLabel}: ${title}` },
          ]}
        />

        <section className="container-livora py-8 md:py-14 pb-24">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8 md:mb-10 pb-6 border-b border-[#EAE4DB]">
            <div>
              <p className="text-[11px] text-[#9E7E52] tracking-[0.25em] uppercase mb-2 md:mb-3">
                {kindLabel}
              </p>
              <h1 className="serif font-light text-3xl sm:text-4xl md:text-5xl text-[#1D1B18] leading-[1.1] mb-2">
                {title}
              </h1>
              <p className="text-[13px] text-[#7D756B]">
                {loading
                  ? "Memuat koleksi…"
                  : `${filteredItems.length} furnitur ditemukan`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[170px] sm:w-52">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8277]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari furnitur / warna..."
                  className="w-full h-9 pl-9 pr-7 rounded-full border border-[#E6E0D6] bg-white text-[13px] outline-none focus:border-[#181614]/60"
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
                  className="appearance-none h-9 pl-3.5 pr-8 rounded-full border border-[#E6E0D6] bg-white text-[13px] text-[#2F2B26] outline-none cursor-pointer"
                >
                  <option value="curated">Pilihan Kurator</option>
                  <option value="newest">Terbaru</option>
                  <option value="name_asc">Nama A – Z</option>
                  <option value="name_desc">Nama Z – A</option>
                </select>
                <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-[#7D756B] absolute right-3 top-1/2 -translate-y-1/2" />
              </div>

              <CatalogColumnToggle value={columns} onChange={setColumns} />
            </div>
          </div>

          {!loading && filteredItems.length === 0 && (
            <p className="text-sm text-[#6E675E] py-12 text-center">
              Belum ada furnitur yang sesuai untuk kategori ini.
            </p>
          )}

          <div className={getCatalogGridClass(columns)}>
            {filteredItems.map((it) => (
              <FurnitureCard
                key={it.slug}
                item={it}
                compact={columns === 5}
              />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
