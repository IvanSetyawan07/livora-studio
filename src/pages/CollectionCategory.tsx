import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import {
  getCollectionItems,
  CollectionItemRef,
  CATEGORY_TABS,
  getCollection,
  Collection,
} from "@/lib/collectionsApi";

export default function CollectionCategory() {
  const { slug, category } = useParams<{ slug: string; category: string }>();
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

  useEffect(() => {
    document.title = `${activeTab.label} — ${collection?.name ?? "Collection"} — LIVORA`;
  }, [activeTab, collection]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24" />

      {/* STICKY TABS */}
      <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="container-livora">
          <div className="flex items-center justify-between gap-6 py-4">
            <div className="flex gap-6 md:gap-8 overflow-x-auto no-scrollbar">
              {CATEGORY_TABS.map((tab) => {
                const active = tab.slug === activeTab.slug;
                return (
                  <button
                    key={tab.slug}
                    onClick={() => navigate(`/collection/${slug}/${tab.slug}`)}
                    className={`relative text-[11px] tracking-[0.25em] uppercase whitespace-nowrap transition-colors ${
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <motion.span
                        layoutId="collection-cat-underline"
                        className="absolute left-0 right-0 -bottom-[13px] h-px bg-foreground"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <section className="container-livora py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-2">
              <Link to={`/collection/${slug}`} className="hover:text-foreground">
                {collection?.name ?? "Collection"}
              </Link>
            </p>
            <h1 className="serif font-light text-3xl md:text-5xl">{activeTab.label}</h1>
            <p className="text-xs text-muted-foreground mt-2">
              {loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Thoughtfully designed pieces that bring comfort, elegance, and harmony to your space.
          </p>
        </div>

        {!loading && items.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No items in this category yet.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {items.map((it, i) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 6) * 0.05 }}
            >
              <Link
                to={`/items/${it.slug}`}
                className="group block bg-card border border-border/70 rounded-lg overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_15px_40px_-15px_rgba(0,0,0,0.2)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {it.image ? (
                    <img
                      src={it.image}
                      alt={it.title}
                      className="w-full h-full object-cover transition-transform duration-[800ms] group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
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
