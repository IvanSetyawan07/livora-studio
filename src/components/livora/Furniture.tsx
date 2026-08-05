import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, VariantLabels, Variants } from "framer-motion";
import accessories from "@/assets/landing-furniture/accecories.png";
import beds from "@/assets/landing-furniture/bed.png";
import chairs from "@/assets/landing-furniture/chair.png";
import sofas from "@/assets/landing-furniture/sofa.png";
import tables from "@/assets/landing-furniture/table.png";
import newArrival from "@/assets/landing-furniture/new-arrival.png";
import furnitureImg from "@/assets/furniture-hompage.png";

const categories = [
  { id: 1, label: "New arrivals", slug: "new-arrivals", image: newArrival },
  { id: 2, label: "Sofas", slug: "sofas", image: sofas },
  { id: 3, label: "Chairs", slug: "chairs", image: chairs },
  { id: 4, label: "Tables", slug: "tables", image: tables },
  { id: 5, label: "Beds", slug: "beds", image: beds },
  { id: 6, label: "Accessories", slug: "accessories", image: accessories },
];

// Custom easing function
const customEasing = [0.25, 0.46, 0.45, 0.94];

// Variants dengan proper typing
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

const imageVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
      delay: 0.1,
    },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
      delay: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      delay: 0.3 + i * 0.08,
    },
  }),
};

const iconVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      delay: 0.5 + i * 0.1,
    },
  }),
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      delay: 0.1 + i * 0.05,
    },
  }),
};

// Premium Floating Card for Furniture Collection
const FurnitureCollectionCard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={cardRef}
      variants={containerVariants}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      className="container-livora"
    >
      {/* Premium Floating Card */}
      <div
        className="rounded-[28px] md:rounded-[32px] overflow-hidden backdrop-blur-sm"
        style={{
          background: "#FCFBF8",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 min-h-[400px] md:min-h-[500px] lg:min-h-[600px]">
          {/* Image Section - 55% width */}
          <motion.div
            variants={imageVariants}
            className="md:col-span-7 w-full h-full overflow-hidden bg-neutral-100"
          >
            <Link
              to="/furniture"
              aria-label="Explore furniture collection"
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group w-full h-full"
            >
              <img
                src={furnitureImg}
                alt="Curated furniture collection"
                width={1280}
                height={896}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </Link>
          </motion.div>

          {/* Content Section - 45% width */}
          <motion.div
            variants={contentVariants}
            className="md:col-span-5 flex flex-col justify-center w-full h-full p-8 md:p-12 lg:p-16 gap-8"
          >
            {/* Label */}
            <motion.p
              custom={0}
              variants={itemVariants}
              className="text-[10px] uppercase tracking-[0.45em] text-foreground/60 font-light"
            >
              <span
                className="inline-block w-6 h-px bg-current mr-3"
                style={{ display: "inline-block", verticalAlign: "middle" }}
              />
              Furniture Collection
            </motion.p>

            {/* Heading */}
            <motion.h2
              custom={1}
              variants={itemVariants}
              className="serif text-3xl md:text-5xl font-light leading-[1.1]"
            >
              A wide variety of{" "}
              <em className="italic font-light not-italic">
                textures, forms and tones.
              </em>
            </motion.h2>

            {/* Description */}
            <motion.p
              custom={2}
              variants={itemVariants}
              className="text-foreground/75 leading-relaxed font-light text-base md:text-base max-w-sm"
            >
              From high-quality suppliers, our collection
              is curated for the balance between premium craftsmanship and
              considered value.
            </motion.p>

            {/* Divider */}
            <motion.div
              custom={3}
              variants={itemVariants}
              className="h-px"
              style={{ background: "rgba(0, 0, 0, 0.08)" }}
            />

            {/* Feature Icons */}
            <motion.div
              custom={4}
              variants={itemVariants}
              className="grid grid-cols-3 gap-4 md:gap-6"
            >
              {[
                {
                  Icon: Gem,
                  label: "Premium",
                  description: "Suppliers",
                },
                {
                  Icon: Leaf,
                  label: "Curated",
                  description: "Collections",
                },
                {
                  Icon: Infinity,
                  label: "Endless",
                  description: "Possibilities",
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={iconVariants}
                  className="flex flex-col items-center gap-2.5 group"
                >
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-500 group-hover:scale-105"
                    style={{
                      background:
                        "linear-gradient(145deg, rgba(201,169,122,0.18), rgba(201,169,122,0.05))",
                      border: "1px solid rgba(201,169,122,0.35)",
                      color: "#9A7B45",
                    }}
                  >
                    <feature.Icon size={19} strokeWidth={1.3} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-foreground tracking-wide">
                      {feature.label}
                    </p>
                    <p className="text-[10px] text-foreground/55 tracking-wide">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// What Are You Looking For Section
const WhatAreYouLookingForSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <motion.section
      ref={containerRef}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      className="py-20 md:py-28 lg:py-32"
    >
      {/* Header with Title and View All */}
      <div className="px-4 md:px-8 lg:px-20 mb-12 md:mb-16">
        <div className="flex items-center justify-between gap-8">
          <motion.h3
            variants={titleVariants}
            className="serif text-4xl md:text-5xl font-light text-foreground"
          >
            What are you looking for?
          </motion.h3>
          <motion.div
            variants={titleVariants}
            className="whitespace-nowrap"
          >
            <Link
              to="/furniture"
              className="inline-flex items-center gap-2 text-sm md:text-base text-foreground/70 hover:text-foreground transition-colors duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View All Categories{" "}
              <span className="transform group-hover:translate-x-1 transition-transform duration-300">
                →
              </span>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="px-4 md:px-8 lg:px-20">
        {/* Desktop & Tablet Grid */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
          {categories.map((category, idx) => (
            <motion.div
              key={category.id}
              custom={idx}
              variants={cardVariants}
              className="group"
            >
              <Link
                to={`/furniture?category=${category.slug}`}
                className="flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[20px]"
              >
                {/* Card Container */}
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-4 md:space-y-5"
                >
                  {/* Image Container */}
                  <div
                    className="overflow-hidden rounded-[20px] md:rounded-[22px]"
                    style={{
                      background: "#FAFAF8",
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div className="relative w-full pt-[125%]">
                      <img
                        src={category.image}
                        alt={category.label}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  </div>

                  {/* Text Container */}
                  <div className="flex items-center justify-between gap-3 px-1">
                    <h4 className="serif text-base md:text-lg font-light text-foreground group-hover:text-foreground/80 transition-colors duration-300">
                      {category.label}
                    </h4>
                    {/* Arrow Button */}
                    <motion.div
                      whileHover={{ x: 3 }}
                      transition={{ duration: 0.3 }}
                      className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full transition-all duration-300 flex-shrink-0"
                      style={{
                        background: "rgba(201, 169, 122, 0.08)",
                      }}
                    >
                      <span className="text-sm md:text-base">→</span>
                    </motion.div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile Horizontal Scroll Carousel */}
        <div className="sm:hidden">
          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <style>{`
              .mobile-carousel {
                display: flex;
                gap: 16px;
                min-width: min-content;
              }
              .mobile-carousel::-webkit-scrollbar {
                height: 4px;
              }
              .mobile-carousel::-webkit-scrollbar-track {
                background: transparent;
              }
              .mobile-carousel::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.1);
                border-radius: 2px;
              }
              .mobile-carousel::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 0, 0, 0.2);
              }
            `}</style>
            <div className="mobile-carousel">
              {categories.map((category, idx) => (
                <motion.div
                  key={category.id}
                  custom={idx}
                  variants={cardVariants}
                  className="flex-shrink-0 w-56"
                >
                  <Link
                    to={`/furniture?category=${category.slug}`}
                    className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[20px]"
                  >
                    <motion.div
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3"
                    >
                      {/* Image */}
                      <div
                        className="overflow-hidden rounded-[20px]"
                        style={{
                          background: "#FAFAF8",
                          border: "1px solid rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <div className="relative w-full pt-[125%]">
                          <img
                            src={category.image}
                            alt={category.label}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      </div>

                      {/* Text */}
                      <div className="flex items-center justify-between gap-2 px-1">
                        <h4 className="serif text-base font-light text-foreground group-hover:text-foreground/80 transition-colors duration-300 flex-1">
                          {category.label}
                        </h4>
                        <motion.div
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.3 }}
                          className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
                          style={{
                            background: "rgba(201, 169, 122, 0.08)",
                          }}
                        >
                          <span className="text-sm">→</span>
                        </motion.div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

// Main Furniture Section
export const Furniture = () => (
  <section id="furniture" className="relative bg-secondary/">
    {/* Furniture Collection - Premium Floating Card */}
    <div className="py-20 md:py-28 lg:py-32">
      <FurnitureCollectionCard />
    </div>

    {/* What Are You Looking For Section */}
    <WhatAreYouLookingForSection />
  </section>
);