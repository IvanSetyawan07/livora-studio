// import { useEffect, useRef, useState } from "react";
// import { Link } from "react-router-dom";
// import { CATALOG_CATEGORIES, CatalogCategory } from "@/types/catalog";
// import livingCatalog from "@/assets/catalog/living-room.png";
// import diningCatalog from "@/assets/catalog/dining-room.jpeg";
// import bedroomsCatalog from "@/assets/catalog/bedroom.png";
// import outdoorCatalog from "@/assets/catalog/outdoor-space.png";
// import homeOfficeCatalog from "@/assets/catalog/home-office.jpeg";
// import publicCatalog from "@/assets/catalog/public-spaces.png";

// const CATEGORY_IMAGES: Record<CatalogCategory, string> = {
//   "living-rooms": livingCatalog,
//   "dining-rooms": diningCatalog,
//   "bedrooms": bedroomsCatalog,
//   "outdoor-spaces": outdoorCatalog,
//   "home-office": homeOfficeCatalog,
//   "public-spaces": publicCatalog,
// };

// const AUTOPLAY_MS = 4500;
// const ROW_HEIGHT = 44; // px — keep in sync with the <li> height below

// export function CatalogPreview() {
//   const total = CATALOG_CATEGORIES.length;

//   const [active, setActive] = useState(0);
//   const [paused, setPaused] = useState(false);
//   const [scrollDriven, setScrollDriven] = useState(false);
//   const [progress, setProgress] = useState(0);

//   // Buffered caption so the text fades out, swaps, then fades in —
//   // instead of snapping the instant `active` changes.
//   const [captionIndex, setCaptionIndex] = useState(0);
//   const [captionVisible, setCaptionVisible] = useState(true);
//   const [cursorReady, setCursorReady] = useState(false);
//   const swapTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

//   const sectionRef = useRef<HTMLDivElement>(null);
//   const pinRef = useRef<HTMLDivElement>(null);
//   const cursorRef = useRef<HTMLDivElement>(null);

//   // ── Scroll-driven slide changes (GSAP ScrollTrigger, pinned stage) ──
//   // Only kicks in on large screens with no reduced-motion preference;
//   // otherwise the autoplay fallback below takes over.
//   useEffect(() => {
//     let cleanup = () => {};
//     let cancelled = false;

//     (async () => {
//       const mq = window.matchMedia("(min-width: 1024px)");
//       if (!mq.matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

//       const { gsap } = await import("gsap");
//       const { ScrollTrigger } = await import("gsap/ScrollTrigger");
//       if (cancelled) return;
//       gsap.registerPlugin(ScrollTrigger);
//       setScrollDriven(true);

//       const trigger = ScrollTrigger.create({
//         trigger: sectionRef.current,
//         start: "top top",
//         end: `+=${total * 90}%`,
//         pin: pinRef.current,
//         pinSpacing: true,
//         scrub: true,
//         onUpdate: (self) => {
//           setProgress(self.progress);
//           const i = Math.min(total - 1, Math.floor(self.progress * total * 0.999));
//           setActive(i);
//         },
//       });

//       cleanup = () => trigger.kill();
//     })();

//     return () => {
//       cancelled = true;
//       cleanup();
//     };
//   }, [total]);

//   // ── Autoplay fallback when scroll isn't driving the stage ──
//   useEffect(() => {
//     if (scrollDriven || paused) return;
//     const id = setInterval(() => setActive((i) => (i + 1) % total), AUTOPLAY_MS);
//     return () => clearInterval(id);
//   }, [paused, total, scrollDriven]);

//   // ── Crossfade the caption whenever the active category changes ──
//   useEffect(() => {
//     setCaptionVisible(false);
//     clearTimeout(swapTimeout.current);
//     swapTimeout.current = setTimeout(() => {
//       setCaptionIndex(active);
//       setCaptionVisible(true);
//     }, 280);
//     return () => clearTimeout(swapTimeout.current);
//   }, [active]);

//   // ── Magnetic cursor dot inside the stage ──
//   const onStageMove = (e: React.MouseEvent<HTMLDivElement>) => {
//     const el = cursorRef.current;
//     if (!el) return;
//     const rect = e.currentTarget.getBoundingClientRect();
//     el.style.transform = `translate3d(${e.clientX - rect.left}px, ${e.clientY - rect.top}px, 0) translate(-50%, -50%)`;
//     if (!cursorReady) setCursorReady(true);
//   };

//   // Click-to-select. When the stage is scroll-driven, clicking a label
//   // smooth-scrolls to that slide's segment instead of snapping directly.
//   const selectCategory = (i: number) => {
//     if (scrollDriven && sectionRef.current) {
//       const rect = sectionRef.current.getBoundingClientRect();
//       const top = window.scrollY + rect.top;
//       const span = sectionRef.current.offsetHeight - window.innerHeight;
//       window.scrollTo({ top: top + (span * (i + 0.5)) / total, behavior: "smooth" });
//       return;
//     }
//     setActive(i);
//     setPaused(true);
//   };

//   const activeCat = CATALOG_CATEGORIES[active];
//   const captionCat = CATALOG_CATEGORIES[captionIndex];

//   return (
//     <section className="relative w-full border-t border-border bg-background" ref={sectionRef}>
//       {/* Local keyframes — kept self-contained so no Tailwind config changes are needed */}
//       <style>{`
//         @keyframes livora-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
//         @keyframes livora-pulse-ring { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.045); opacity: 0.85; } }
//       `}</style>

//       {/* Section kicker, shown once above the visual so the block below can bleed full width */}
//       <div className="container-livora pt-16 md:pt-20 pb-6 md:pb-8">
//         <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-light mb-3">
//           Livora &nbsp;|&nbsp; Collections
//         </p>
//         <h2 className="serif text-3xl md:text-5xl font-light leading-[1.05]">
//           Explore Our <em className="italic">Catalog</em>
//         </h2>
//       </div>

//       {/* Full-bleed, full-screen visual block — pinned while scroll drives it */}
//       <div
//         ref={pinRef}
//         className="relative left-1/2 right-1/2 -mx-[50vw] w-screen h-screen overflow-hidden"
//         onMouseMove={onStageMove}
//         onMouseEnter={() => setPaused(true)}
//         onMouseLeave={() => {
//           setPaused(false);
//           setCursorReady(false);
//         }}
//       >
//         {/* Crossfading background images with blur + slow Ken-Burns drift */}
//         {CATALOG_CATEGORIES.map((cat, i) => (
//           <div
//             key={cat.slug}
//             aria-hidden={i !== active}
//             className={`absolute inset-0 transition-[opacity,filter] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
//               i === active ? "opacity-100 blur-0" : "opacity-0 blur-[6px]"
//             }`}
//           >
//             <img
//               src={CATEGORY_IMAGES[cat.slug]}
//               alt={cat.label}
//               className={`w-full h-full object-cover transition-transform duration-[7000ms] ease-out ${
//                 i === active ? "scale-100" : "scale-[1.12]"
//               }`}
//             />
//           </div>
//         ))}

//         {/* Legibility overlays */}
//         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" aria-hidden />
//         <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/45" aria-hidden />

//         {/* Trailing magnetic cursor dot */}
//         <div
//           ref={cursorRef}
//           className={`pointer-events-none absolute left-0 top-0 hidden h-16 w-16 rounded-full border border-white/40 transition-[transform,opacity] duration-500 ease-out lg:block z-30 ${
//             cursorReady ? "opacity-100" : "opacity-0"
//           }`}
//         />

//         {/* Top-left — rotating badge */}
//         <div className="absolute top-6 left-6 md:top-10 md:left-10 z-20 w-16 h-16 md:w-[72px] md:h-[72px]">
//           <svg
//             viewBox="0 0 100 100"
//             className="w-full h-full [animation:livora-spin_20s_linear_infinite]"
//           >
//             <defs>
//               <path id="livora-badge-path" d="M 50,50 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
//             </defs>
//             <text fill="white" fontSize="8.2" letterSpacing="2.5">
//               <textPath href="#livora-badge-path">
//                 LIVORA • COLLECTIONS • LIVORA • COLLECTIONS •
//               </textPath>
//             </text>
//           </svg>
//           <div className="absolute inset-0 flex items-center justify-center">
//             <span className="serif italic text-white text-sm">L</span>
//           </div>
//         </div>

//         {/* Top-right — primary CTA with sliding underline */}
//         <Link
//           to="/catalog"
//           className="group absolute top-6 right-6 md:top-10 md:right-10 z-20 text-right text-white"
//         >
//           <span className="serif block text-lg md:text-2xl font-light leading-tight">
//             View Full
//             <br />
//             Catalog
//           </span>
//           <span className="mt-1 block h-px w-full origin-right scale-x-0 bg-white transition-transform duration-500 group-hover:scale-x-100" />
//         </Link>

//         {/* Right-middle — category list, click to switch image */}
//         <div className="hidden md:flex absolute right-12 lg:right-20 top-1/2 -translate-y-1/2 z-20">
//           <div className="relative pr-6">
//             <div className="absolute right-0 top-0 bottom-0 w-px bg-white/20" aria-hidden />
//             <div
//               className="absolute right-0 w-px bg-white transition-transform duration-500 ease-out"
//               style={{ height: ROW_HEIGHT - 10, transform: `translateY(${active * ROW_HEIGHT + 5}px)` }}
//               aria-hidden
//             />
//             <ul className="flex flex-col items-end">
//               {CATALOG_CATEGORIES.map((cat, i) => (
//                 <li key={cat.slug} className="flex items-center" style={{ height: ROW_HEIGHT }}>
//                   <button
//                     type="button"
//                     onClick={() => selectCategory(i)}
//                     className={`serif text-right uppercase tracking-[0.04em] transition-all duration-500 ease-out ${
//                       i === active
//                         ? "text-white text-2xl lg:text-3xl font-semibold"
//                         : "text-white/40 text-lg lg:text-xl font-light hover:text-white/70"
//                     }`}
//                   >
//                     {cat.label}
//                   </button>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         </div>

//         {/* Bottom-left — crossfading caption, tied to the active category */}
//         <div className="absolute left-6 md:left-10 bottom-8 md:bottom-16 z-20 max-w-[85%] md:max-w-md">
//           <p
//             className={`text-[10px] md:text-xs uppercase tracking-[0.25em] text-white/70 font-light mb-2 md:mb-3 transition-all duration-300 ${
//               captionVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
//             }`}
//           >
//             {String(captionIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} — {captionCat.label}
//           </p>
//           <h3
//             className={`serif text-2xl md:text-4xl font-light text-white leading-[1.08] transition-all duration-500 ease-out ${
//               captionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
//             }`}
//           >
//             {captionCat.title} <em className="italic">{captionCat.titleItalic}</em>
//           </h3>
//         </div>

//         {/* Bottom-right — circular CTA, points at whichever category is showing */}
//         <Link
//           to={`/catalog/${activeCat.slug}`}
//           className="absolute right-6 md:right-16 bottom-8 md:bottom-20 z-20 relative flex items-center justify-center w-20 h-20 md:w-32 md:h-32 rounded-full border border-white/50 text-white hover:bg-white/10 transition-colors duration-300 [animation:livora-pulse-ring_4s_ease-in-out_infinite]"
//         >
//           <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] leading-tight text-center px-2">
//             Discover
//             <br />
//             Collection
//           </span>
//           <span className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-white/60 rotate-45" aria-hidden />
//           <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l border-white/60 rotate-45" aria-hidden />
//         </Link>

//         {/* Scroll / autoplay progress rail */}
//         <div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/15 z-20">
//           <div
//             className="h-full bg-white transition-[width] duration-200 ease-out"
//             style={{
//               width: `${(scrollDriven ? progress : (active + 1) / total) * 100}%`,
//             }}
//           />
//         </div>
//       </div>

//       {/* Mobile — pill selector replaces the click list, plus the standard CTA */}
//       <div className="flex md:hidden gap-2 overflow-x-auto px-6 pt-5 pb-2">
//         {CATALOG_CATEGORIES.map((cat, i) => (
//           <button
//             key={cat.slug}
//             onClick={() => selectCategory(i)}
//             className={`shrink-0 text-[10px] uppercase tracking-[0.15em] px-3.5 py-2 border rounded-full transition-colors duration-300 ${
//               i === active
//                 ? "border-foreground text-foreground bg-foreground/5"
//                 : "border-border text-muted-foreground"
//             }`}
//           >
//             {cat.label}
//           </button>
//         ))}
//       </div>
//       <div className="flex md:hidden justify-center py-8">
//         <Link
//           to="/catalog"
//           className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] font-light text-background bg-foreground px-8 py-3.5"
//         >
//           View Full Catalog
//           <span>→</span>
//         </Link>
//       </div>
//     </section>
//   );
// }