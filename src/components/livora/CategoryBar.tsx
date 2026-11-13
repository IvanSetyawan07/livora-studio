import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Sofa,
  Armchair,
  Table,
  Archive,
  Bed,
  Flower2,
  Lamp,
  type LucideIcon,
} from "lucide-react";

export interface CategoryTab {
  slug: string;
  label: string;
}

const ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  sofa: Sofa,
  chair: Armchair,
  table: Table,
  cabinet: Archive,
  bed: Bed,
  decor: Flower2,
  lighting: Lamp,
};

interface Props {
  tabs: CategoryTab[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}

/**
 * Icon-pill category bar. In-flow at natural position; when scrolled past,
 * a compact clone docks to the bottom of the viewport.
 *
 * Mobile: in-flow bar renders in a smaller size so all icons fit; docked bar
 * becomes an Instagram-style dark pill with an animated bubble behind the
 * active icon.
 */
export function CategoryBar({ tabs, activeSlug, onSelect }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setDocked(entry.boundingClientRect.top < 0 && !entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} />
      {/* In-flow bar */}
      <div className="container-livora flex justify-center">
        <div className="max-w-full overflow-x-auto no-scrollbar py-1" data-lenis-prevent>
          <BarInner tabs={tabs} activeSlug={activeSlug} onSelect={onSelect} variant="flow" />
        </div>
      </div>

      {/* Docked (bottom) */}
      <AnimatePresence>
        {docked && (
          <motion.div
            key="docked-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 z-40 flex justify-center pointer-events-none px-3"
            style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="pointer-events-auto max-w-full">
              {/* Mobile: dark bubble pill with safe horizontal scroll. Desktop: light pill. */}
              <div className="md:hidden">
                <BarInner tabs={tabs} activeSlug={activeSlug} onSelect={onSelect} variant="dock-mobile" />
              </div>
              <div className="hidden md:block">
                <BarInner tabs={tabs} activeSlug={activeSlug} onSelect={onSelect} variant="dock-desktop" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type Variant = "flow" | "dock-mobile" | "dock-desktop";

function BarInner({
  tabs,
  activeSlug,
  onSelect,
  variant,
}: Props & { variant: Variant }) {
  if (variant === "dock-mobile") {
    // Instagram-style dark pill with horizontal scroll safety on 375px viewports.
    return (
      <div
        data-lenis-prevent
        className="flex items-center max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar bg-neutral-900/95 backdrop-blur-md rounded-full shadow-[0_18px_50px_-18px_rgba(0,0,0,0.55)] px-2 py-1.5 gap-1"
      >
        {tabs.map((t) => {
          const Icon = ICONS[t.slug] ?? LayoutGrid;
          const active = t.slug === activeSlug;
          return (
            <button
              key={t.slug}
              onClick={() => onSelect(t.slug)}
              aria-label={t.label}
              title={t.label}
              className="relative shrink-0 flex items-center justify-center rounded-full px-3 min-w-[44px] h-[44px]"
            >
              {active && (
                <motion.span
                  layoutId="cat-dock-bubble"
                  className="absolute inset-0 rounded-full bg-white/15"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  aria-hidden
                />
              )}
              <Icon
                size={18}
                strokeWidth={1.6}
                className={`relative z-10 transition-colors shrink-0 ${
                  active ? "text-white" : "text-white/60"
                }`}
              />
              {active && (
                <span className="relative z-10 ml-1.5 text-[10px] uppercase tracking-[0.14em] text-white whitespace-nowrap">
                  {t.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  const compact = variant === "dock-desktop";
  return (
    <div
      className={`inline-flex items-stretch bg-white/95 backdrop-blur-md border border-black/[0.06] rounded-2xl ${
        compact
          ? "shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)]"
          : "shadow-[0_12px_40px_-20px_rgba(0,0,0,0.25)]"
      }`}
      style={{ padding: compact ? 6 : 8 }}
    >
      <div className="flex items-stretch gap-1">
        {tabs.map((t) => {
          const Icon = ICONS[t.slug] ?? LayoutGrid;
          const active = t.slug === activeSlug;
          return (
            <button
              key={t.slug}
              onClick={() => onSelect(t.slug)}
              className="relative shrink-0 group flex flex-col items-center justify-center rounded-xl transition-colors px-3 py-2.5 md:px-4 md:py-3 min-w-[64px]"
              style={{ minWidth: compact ? 62 : undefined }}
            >
              <span
                className="absolute inset-1 rounded-lg bg-black/[0.04] opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300"
                aria-hidden
              />
              <Icon
                size={compact ? 18 : 20}
                strokeWidth={1.4}
                className={`relative z-10 transition-colors md:!size-[22px] ${
                  active ? "text-foreground" : "text-neutral-500 group-hover:text-foreground"
                }`}
              />
              <span
                className={`relative z-10 uppercase transition-colors mt-1 md:mt-1.5 ${
                  active ? "text-foreground" : "text-neutral-500 group-hover:text-foreground"
                }`}
                style={{
                  fontSize: compact ? 9 : 9,
                  letterSpacing: compact ? "0.12em" : "0.16em",
                }}
              >
                {t.label}
              </span>
              {active && (
                <motion.span
                  layoutId={compact ? "cat-underline-dock" : "cat-underline-flow"}
                  className="absolute left-3 right-3 bottom-1 h-px bg-foreground"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
