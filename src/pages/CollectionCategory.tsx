import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { CategoryBar } from "@/components/livora/CategoryBar";
import {
  CatalogColumnToggle,
  FurnitureCard,
  getCatalogGridClass,
  type CatalogColumns,
} from "@/components/livora/FurnitureCard";
import {
  getCollectionItems,
  CollectionItemRef,
  CATEGORY_TABS,
  getCollection,
  Collection,
} from "@/lib/collectionsApi";

interface DisplayItem extends CollectionItemRef {
  count: number;
}

export default function CollectionCategory() {
  const { slug, category } = useParams<{ slug: string; category: string }>();
  const [searchParams] = useSearchParams();
  const packageSlug = searchParams.get("package");
  const highlightSlug = searchParams.get("highlight");

  const navigate = useNavigate();
  const [items, setItems] = useState<CollectionItemRef[]>([]);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<CatalogColumns>(4);

  useEffect(() => {
    if (!slug) return;
    getCollection(slug).then(setCollection).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!slug || !category) return;
    setLoading(true);
    getCollectionItems(slug, category)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [slug, category]);

  const activeTab = useMemo(
    () => CATEGORY_TABS.find((t) => t.slug === category) ?? CATEGORY_TABS[0],
    [category],
  );

  const activePackage = useMemo(
    () => (packageSlug ? collection?.packages?.find((p) => p.slug === packageSlug) ?? null : null),
    [collection, packageSlug],
  );

  const displayItems = useMemo<DisplayItem[]>(() => {
    if (!activePackage) return items.map((it) => ({ ...it, count: 1 }));
    const map = new Map<string, DisplayItem>();
    (activePackage.items ?? []).forEach((it) => {
      if (category && category !== "all" && it.type?.slug !== category) return;
      const entry = map.get(it.slug);
      if (entry) entry.count += 1;
      else map.set(it.slug, { ...it, count: 1 });
    });
    return Array.from(map.values());
  }, [activePackage, items, category]);

  useEffect(() => {
    if (!highlightSlug || loading) return;
    const el = document.getElementById(`item-${highlightSlug}`);
    if (!el) return;
    const t = window.setTimeout(
      () => el.scrollIntoView({ behavior: "smooth", block: "center" }),
      350,
    );
    return () => window.clearTimeout(t);
  }, [highlightSlug, loading, displayItems]);

  useEffect(() => {
    document.title = `${activeTab.label} — ${collection?.name ?? "Collection"} — LIVORA`;
  }, [activeTab, collection]);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <Navbar />

      <div className="pt-24" />

      {/* CATEGORY BAR */}
      <div className="py-6 flex justify-center border-b border-[#EAE4DB] bg-[#FAF8F5]/95">
        <CategoryBar
          tabs={CATEGORY_TABS}
          activeSlug={activeTab.slug}
          onSelect={(s) =>
            navigate(
              `/collection/${slug}/${s}${packageSlug ? `?package=${packageSlug}` : ""}`,
            )
          }
        />
      </div>

      {/* CONTENT */}
      <section className="container-livora py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 pb-6 border-b border-[#EAE4DB]">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#8C7A64] mb-2 flex flex-wrap items-center gap-2">
              <Link
                to={`/collection/${slug}`}
                className="inline-flex items-center min-h-[40px] py-1 hover:text-[#1D1B18]"
              >
                {collection?.name ?? "Collection"}
              </Link>
              {activePackage && (
                <>
                  <span className="opacity-40">/</span>
                  <span>{activePackage.name}</span>
                </>
              )}
            </p>
            <h1 className="serif font-light text-3xl md:text-5xl text-[#1D1B18]">
              {activeTab.label}
            </h1>
            <p className="text-xs text-[#7D756B] mt-2">
              {loading
                ? "Memuat…"
                : `${displayItems.length} furnitur`}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-3">
            <p className="text-sm text-[#6E675E] max-w-xs leading-relaxed sm:text-right">
              Furnitur terkurasi yang dirancang menghadirkan kenyamanan, keanggunan, dan harmoni pada ruang Anda.
            </p>
            <CatalogColumnToggle value={columns} onChange={setColumns} />
          </div>
        </div>

        {!loading && displayItems.length === 0 && (
          <p className="py-16 text-center text-sm text-[#7D756B]">
            Belum ada furnitur untuk kategori ini.
          </p>
        )}

        <div className={getCatalogGridClass(columns)}>
          {displayItems.map((it, i) => (
            <motion.div
              key={it.id}
              id={`item-${it.slug}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 6) * 0.04 }}
              className="scroll-mt-32"
            >
              <FurnitureCard
                item={{
                  ...it,
                  collection:
                    it.collection ??
                    (collection
                      ? { id: collection.id, name: collection.name, slug: collection.slug }
                      : null),
                }}
                countBadge={it.count}
                highlighted={highlightSlug === it.slug}
                badgeOverride={highlightSlug === it.slug ? "Pilihan Anda" : undefined}
                compact={columns === 5}
              />
            </motion.div>
          ))}
        </div>
      </section>

      <div className="py-16" />
      <Footer />
    </div>
  );
}
