import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { CategoryBar } from "@/components/livora/CategoryBar";
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
    [category]
  );

  // When scoped to a package, restrict items to that package's contents and
  // fold duplicates into a "× N pcs" count.
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
    document.title = `${activeTab.label} — ${collection?.name ?? "Collection"} — LIVORA`;
  }, [activeTab, collection]);


  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24" />

      {/* CATEGORY BAR — icon dock (in-flow → bottom-docked on scroll) */}
      <div className="py-6 flex justify-center border-b border-border/60 bg-background/95">
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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-2 flex flex-wrap items-center gap-2">
              <Link to={`/collection/${slug}`} className="hover:text-foreground">
                {collection?.name ?? "Collection"}
              </Link>
              {activePackage && (
                <>
                  <span className="opacity-40">/</span>
                  <span>{activePackage.name}</span>
                </>
              )}
            </p>
            <h1 className="serif font-light text-3xl md:text-5xl">{activeTab.label}</h1>
            <p className="text-xs text-muted-foreground mt-2">
              {loading
                ? "Loading…"
                : `${displayItems.length} item${displayItems.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Thoughtfully designed pieces that bring comfort, elegance, and harmony to your space.
          </p>
        </div>

        {!loading && displayItems.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No items in this category yet.
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {displayItems.map((it, i) => (
            <motion.div
              key={it.id}
              id={`item-${it.slug}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 6) * 0.05 }}
              className="scroll-mt-32"
            >
              <Link
                to={`/items/${it.slug}`}
                className={`group block bg-card border rounded-lg overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_15px_40px_-15px_rgba(0,0,0,0.2)] ${
                  highlightSlug === it.slug
                    ? "border-foreground ring-2 ring-foreground/70 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
                    : "border-border/70"
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-white">
                  {highlightSlug === it.slug && (
                    <span className="absolute top-3 left-3 z-10 text-[10px] tracking-[0.15em] uppercase bg-foreground text-background px-2.5 py-1 rounded-full">
                      Your pick
                    </span>
                  )}
                  {it.image ? (
                    <img
                      src={it.image}
                      alt={it.title}
                      className="w-full h-full object-contain p-3 transition-transform duration-[800ms] group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
                  )}
                  {it.count > 1 && (
                    <span className="absolute top-3 right-3 text-[10px] tracking-[0.15em] uppercase bg-foreground text-background px-2.5 py-1 rounded-full">
                      × {it.count} pcs
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={14} />
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium">{it.title}</p>
                  <p className="text-[11px] tracking-[0.15em] text-muted-foreground mt-1 uppercase">
                    {it.type?.name ?? ""} {it.code ? `· ${it.code}` : ""}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="py-16" />
      <Footer />
    </div>
  );
}
