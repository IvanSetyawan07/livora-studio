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
 * Icon-pill category bar. Renders in-flow at its natural position; when the
 * user scrolls past it, a compact clone docks to the bottom of the viewport
 * and returns to its original spot once scrolled back up.
 */
export function CategoryBar({ tabs, activeSlug, onSelect }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // If the natural bar is scrolled ABOVE the viewport, show the docked one.
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
      <div className="container-livora">
        <BarInner tabs={tabs} activeSlug={activeSlug} onSelect={onSelect} compact={false} />
      </div>

      {/* Docked (bottom, compact) */}
      <AnimatePresence>
        {docked && (
          <motion.div
            key="docked-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-4 z-40 flex justify-center pointer-events-none px-4"
          >
            <div className="pointer-events-auto">
              <BarInner
                tabs={tabs}
                activeSlug={activeSlug}
                onSelect={onSelect}
                compact
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function BarInner({
  tabs,
  activeSlug,
  onSelect,
  compact,
}: Props & { compact: boolean }) {
  return (
    <div
      className={`inline-flex items-stretch bg-white/95 backdrop-blur-md border border-black/[0.06] rounded-2xl overflow-hidden ${
        compact
          ? "shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)] gap-0"
          : "shadow-[0_12px_40px_-20px_rgba(0,0,0,0.25)]"
      }`}
      style={{ padding: compact ? "6px" : "10px" }}
    >
      <div className="flex items-stretch gap-1">
        {tabs.map((t) => {
          const Icon = ICONS[t.slug] ?? LayoutGrid;
          const active = t.slug === activeSlug;
          return (
            <button
              key={t.slug}
              onClick={() => onSelect(t.slug)}
              className="relative group flex flex-col items-center justify-center rounded-xl transition-colors"
              style={{
                padding: compact ? "8px 12px" : "12px 18px",
                minWidth: compact ? 62 : 84,
              }}
            >
              {/* Hover bubble */}
              <span
                className="absolute inset-1 rounded-lg bg-black/[0.04] opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300"
                aria-hidden
              />

              <Icon
                size={compact ? 18 : 22}
                strokeWidth={1.4}
                className={`relative z-10 transition-colors ${
                  active ? "text-foreground" : "text-neutral-500 group-hover:text-foreground"
                }`}
              />
              <span
                className={`relative z-10 uppercase tracking-[0.18em] transition-colors ${
                  active ? "text-foreground" : "text-neutral-500 group-hover:text-foreground"
                }`}
                style={{
                  fontSize: compact ? 9 : 10,
                  marginTop: compact ? 3 : 6,
                  letterSpacing: compact ? "0.12em" : "0.18em",
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
