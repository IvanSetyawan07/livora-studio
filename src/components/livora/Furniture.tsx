import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import accessories from "@/assets/landing-furniture/accecories.png";
import beds from "@/assets/landing-furniture/bed.png";
import chairs from "@/assets/landing-furniture/chair.png";
import sofas from "@/assets/landing-furniture/sofa.png";
import tables from "@/assets/landing-furniture/table.png";
import newArrival from "@/assets/landing-furniture/new-arrival.png";
import furnitureImg from "@/assets/furniture-hompage.png";

const categories = [
  { id: 1, label: "New arrivals", slug: "newArrivals", image: newArrival },
  { id: 2, label: "Sofas", slug: "sofas", image: sofas },
  { id: 3, label: "Chairs", slug: "chairs", image: chairs },
  { id: 4, label: "Tables", slug: "tables", image: tables },
  { id: 5, label: "Beds", slug: "beds", image: beds },
  { id: 6, label: "Accessories", slug: "accessories", image: accessories },
];

const WhatAreYouLookingForSection = () => {
  const containerRef = useRef(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [shouldExit, setShouldExit] = useState(false);

  useEffect(() => {
    setHasEntered(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      setShouldExit(!isVisible);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* HEADING */}
      <div className="px-8 md:px-14 lg:px-20 pb-8 md:pb-12">
        <h3 className="serif text-4xl md:text-5xl font-light text-foreground">
          What are you looking for?
        </h3>
      </div>

      {/* GRID + LABELS - ANIMASI SLIDE */}
      <motion.div
        ref={containerRef}
        initial={{ x: "-100%" }}
        animate={{
          x: hasEntered && !shouldExit ? 0 : "-100%",
        }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
        className="w-full bg-secondary/20"
      >
        <div
          className="category-scroll overflow-x-auto"
          style={{
            overflowX: hasEntered && !shouldExit ? "auto" : "hidden",
          }}
        >
          <style>{`
            .category-scroll::-webkit-scrollbar {
              height: 1px;
            }
            .category-scroll::-webkit-scrollbar-track {
              background: #D9D4CE;
            }
            .category-scroll::-webkit-scrollbar-thumb {
              background: #1A1A1A;
              border-radius: 2px;
            }
            .category-scroll::-webkit-scrollbar-thumb:hover {
              background: #000000;
            }
            html, body {
              scrollbar-width: thin;
            }
          `}</style>

          <div className="px-8 md:px-14 lg:px-20 pb-8 md:pb-12">
            {/* Grid Container */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "28px",
                marginTop: "32px",
                minWidth: "100%",
                paddingBottom: "20px",
              }}
            >
              {categories.map((category, idx) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                  className="cursor-pointer group reveal"
                >
                  <Link
                    to={`/furniture?category=${category.slug}`}
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <motion.div
                      whileHover={{ scale: 1.02, y: -6 }}
                      className="space-y-5"
                    >
                      {/* Image Card */}
                      <div
                        style={{
                          background: "#FAFAF8",
                          border: "1px solid #E8E4DF",
                          borderRadius: "10px",
                          overflow: "hidden",
                          height: "340px",
                          width: "300px",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#C9A97A";
                          e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(201, 169, 122, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#E8E4DF";
                          e.currentTarget.style.boxShadow =
                            "0 2px 10px rgba(0,0,0,0.04)";
                        }}
                      >
                        <img
                          src={category.image}
                          alt={category.label}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Label */}
                      <motion.h4
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: hasEntered && !shouldExit ? 1 : 0,
                        }}
                        transition={{
                          delay: 0.3,
                          duration: 0.4,
                        }}
                        className="text-base md:text-lg font-light text-foreground text-center group-hover:text-accent transition-colors"
                      >
                        {category.label}
                      </motion.h4>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export const Furniture = () => (
  <section id="furniture" className="relative bg-secondary/40">
    {/* Furniture Collection Section */}
    <div className="py-28 md:py-40">
      <div className="container-livora grid md:grid-cols-12 gap-10 md:gap-16 items-center">
        <Link
          to="/furniture"
          aria-label="Explore furniture collection"
          className="reveal md:col-span-6 hover-zoom block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src={furnitureImg}
            alt="Curated furniture collection"
            width={1280}
            height={896}
            loading="lazy"
            className="w-full aspect-[4/3] object-cover rounded-lg"
          />
        </Link>
        <div className="reveal md:col-span-6 space-y-6">
          <p className="text-[10px] uppercase tracking-[0.45em] text-foreground/60">
            <span className="divider-line" />
            Furniture Collection
          </p>
          <h2 className="serif text-4xl md:text-6xl font-light leading-[1.05]">
            A wide variety of{" "}
            <em className="italic">textures, forms and tones.</em>
          </h2>
          <p className="text-foreground/75 leading-relaxed font-light text-base md:text-lg max-w-lg">
            From high-quality suppliers across Europe and Asia, our collection
            is curated for the balance between premium craftsmanship and
            considered value.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
            {[
              { n: "∞", l: "Suppliers" },
              { n: "∞", l: "Collections" },
              { n: "∞", l: "Possibilities" },
            ].map((s) => (
              <div key={s.l}>
                <p className="serif text-3xl md:text-4xl font-light">{s.n}</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/60 mt-1">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* What Are You Looking For Section */}
    <WhatAreYouLookingForSection />
  </section>
);