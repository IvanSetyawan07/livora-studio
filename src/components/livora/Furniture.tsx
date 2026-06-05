import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import furnitureImg from "@/assets/furniture-hompage.png";

// Categories untuk "What are you looking for?"
const categories = [
  { id: 1, label: "New arrivals", slug: "new-arrivals" },
  { id: 2, label: "Sofas", slug: "sofas" },
  { id: 3, label: "Chairs", slug: "chairs" },
  { id: 4, label: "Tables", slug: "tables" },
  { id: 5, label: "Beds", slug: "beds" },
  { id: 6, label: "Storage", slug: "storage" },
  { id: 7, label: "New arrivals", slug: "new-arrivals" },
  { id: 8, label: "Sofas", slug: "sofas" },
  { id: 9, label: "Chairs", slug: "chairs" },
  { id: 10, label: "Tables", slug: "tables" },
  { id: 11, label: "Beds", slug: "beds" },
  { id: 12, label: "Storage", slug: "storage" },
];

// What Are You Looking For Sub-Component
const WhatAreYouLookingForSection = () => {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  
  // Animation states
  const [hasEntered, setHasEntered] = useState(false); // Track entrance
  const [shouldExit, setShouldExit] = useState(false); // Track exit

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        scrollElement.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, []);

  // Handle page load entrance animation
  useEffect(() => {
    setHasEntered(true);
  }, []);

  // Handle scroll exit animation
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

      // Section is out of view
      if (!isVisible) {
        setShouldExit(true);
      } else {
        setShouldExit(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ x: "-100%" }}
      animate={{
        x: hasEntered && !shouldExit ? 0 : "-100%",
      }}
      transition={{ type: "spring", stiffness: 80, damping: 20 }}
      className="w-full bg-secondary/20 border-t border-border"
    >
      <div className="py-16 md:py-20">
        {/* Heading */}
        <div className="px-8 md:px-16 lg:px-20 pb-8 md:pb-10">
          <h3 className="serif text-3xl md:text-4xl font-light text-foreground">
            What are you looking for?
          </h3>
        </div>

        {/* Scroll Container */}
        <div className="relative w-full">
          {/* Left Overflow Indicator */}
          {canScrollLeft && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-secondary/20 to-transparent pointer-events-none z-10"
            />
          )}

          {/* Right Overflow Indicator */}
          {canScrollRight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-secondary/20 to-transparent pointer-events-none z-10"
            />
          )}

          {/* Scroll Content */}
          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden px-8 md:px-16 lg:px-20 pb-2 scrollbar-thin scrollbar-thumb-foreground/40 scrollbar-track-transparent"
            onScroll={checkScroll}
          >
            <style>{`
              div::-webkit-scrollbar {
                height: 3px;
              }
              div::-webkit-scrollbar-track {
                background: transparent;
              }
              div::-webkit-scrollbar-thumb {
                background: #1A1A1A;
                border-radius: 2px;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: #000000;
              }
            `}</style>

            {categories.map((category, idx) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                className="flex-shrink-0 w-40 md:w-48 cursor-pointer group reveal"
              >
                {/* Category Card */}
                <Link
                  to={`/furniture?category=${category.slug}`}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <motion.div
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="space-y-3"
                  >
                    {/* Placeholder Image */}
                    <div className="relative w-full aspect-square rounded-md overflow-hidden bg-secondary border border-border">
                      <div className="w-full h-full bg-gradient-to-br from-foreground/5 to-foreground/10 flex items-center justify-center">
                        <span className="text-foreground/30 text-xs uppercase tracking-wider">
                          {category.label}
                        </span>
                      </div>
                    </div>

                    {/* Label */}
                    <h4 className="text-sm font-light text-foreground text-center group-hover:text-accent transition-colors">
                      {category.label}
                    </h4>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        {(canScrollLeft || canScrollRight) && (
          <div className="flex gap-3 px-8 md:px-16 lg:px-20 pt-6 justify-start">
            {canScrollLeft && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scroll("left")}
                className="w-10 h-10 rounded-full border border-accent/60 bg-transparent hover:bg-accent/10 flex items-center justify-center text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Scroll left"
              >
                ←
              </motion.button>
            )}

            {canScrollRight && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scroll("right")}
                className="w-10 h-10 rounded-full border border-accent/60 bg-transparent hover:bg-accent/10 flex items-center justify-center text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Scroll right"
              >
                →
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Main Furniture Component
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
            A wide variety of <em className="italic">textures, forms and tones.</em>
          </h2>
          <p className="text-foreground/75 leading-relaxed font-light text-base md:text-lg max-w-lg">
            From high-quality suppliers across Europe and Asia, our collection is curated for the balance between
            premium craftsmanship and considered value.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
            {[
              { n: "∞", l: "Suppliers" },
              { n: "∞", l: "Collections" },
              { n: "∞", l: "Possibilities" },
            ].map((s) => (
              <div key={s.l}>
                <p className="serif text-3xl md:text-4xl font-light">{s.n}</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/60 mt-1">{s.l}</p>
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