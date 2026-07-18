import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { listCollections, Collection } from "@/lib/collectionsApi";

export default function CollectionLanding() {
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 800], [0, 120]);
  const heroScale = useTransform(scrollY, [0, 800], [1, 1.08]);

  useEffect(() => {
    document.title = "Our Collections — LIVORA";
    listCollections()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // Static hero image — intentionally NOT tied to admin CRUD data.
  const heroImage =
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1920&q=80";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative w-full overflow-hidden"
        style={{ height: "85vh" }}
      >
        <motion.div
          style={{ y: heroY, scale: heroScale }}
          className="absolute inset-0"
        >
          <img
            src={heroImage}
            alt="Livora Collections"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        </motion.div>

        <div className="relative z-10 h-full flex items-center">
          <div className="container-livora">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-[11px] tracking-[0.35em] uppercase text-white/80 mb-6"
            >
              Collection
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="serif font-light text-white text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-6"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
            >
              Our
              <br />
              Collections
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="text-white/85 text-sm md:text-base max-w-md leading-relaxed"
            >
              Discover timeless furniture collections designed to inspire and
              elevate your space.
            </motion.p>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="container-livora py-24 md:py-32">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-3">
              Collections
            </p>
            <h2 className="serif font-light text-3xl md:text-5xl">
              Explore Our Collections
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Each collection is thoughtfully curated to suit different lifestyles,
            aesthetics, and spaces.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No collections yet. Add one from the admin dashboard.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {items.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.08 }}
              >
                <Link
                  to={`/collection/${c.slug}`}
                  className="group block bg-card border border-border/60 rounded-xl overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {c.card_banner || c.featured_image ? (
                      <img
                        src={c.card_banner || c.featured_image || ""}
                        alt={c.name}
                        className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
                    )}
                  </div>
                  <div className="p-7">
                    <h3 className="serif text-2xl font-light mb-2">
                      {c.name} Collection
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
                      {c.short_description || c.description || ""}
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-foreground">
                      Explore Collection
                      <ArrowRight
                        size={14}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
