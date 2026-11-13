import { useEffect, useState, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface LightboxImage {
  src: string;
  alt?: string;
}

interface Props {
  open: boolean;
  images: LightboxImage[];
  startIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({ open, images, startIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setIndex(startIndex);
      setZoomed(false);
    }
  }, [open, startIndex]);

  useEffect(() => {
    setZoomed(false);
    const activeThumb = thumbsRef.current?.children[index] as HTMLElement | undefined;
    activeThumb?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % images.length),
    [images.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, prev, next, onClose]);

  if (!images.length) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] h-[100dvh] bg-white flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-2 z-10">
            <span className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
              {index + 1} / {images.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                aria-label={zoomed ? "Zoom out" : "Zoom in"}
                className="w-11 h-11 rounded-full border border-black/10 bg-white/90 backdrop-blur flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-11 h-11 rounded-full border border-black/10 bg-white/90 backdrop-blur flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Desktop Prev / Next */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous"
                className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full border border-black/10 bg-white/85 backdrop-blur items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full border border-black/10 bg-white/85 backdrop-blur items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* Main image (swipeable on mobile + tap to toggle zoom) */}
          <div
            data-lenis-prevent
            onTouchStart={(e) => {
              if (e.touches.length !== 1) return;
              touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }}
            onTouchEnd={(e) => {
              const start = touchStartRef.current;
              touchStartRef.current = null;
              if (!start || zoomed || images.length <= 1) return;
              const dx = e.changedTouches[0].clientX - start.x;
              const dy = e.changedTouches[0].clientY - start.y;
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) next();
                else prev();
              }
            }}
            onClick={() => setZoomed((z) => !z)}
            className={`flex-1 flex items-center justify-center px-3 sm:px-6 md:px-20 py-2 overflow-auto ${
              zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={images[index].src}
                src={images[index].src}
                alt={images[index].alt ?? ""}
                className={`select-none transition-transform duration-300 ${
                  zoomed ? "max-w-none max-h-none w-[165%] sm:w-[140%] object-contain" : "max-w-full max-h-full object-contain"
                }`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                draggable={false}
              />
            </AnimatePresence>
          </div>

          {/* Mobile prev/next + Thumbnails */}
          <div className="pb-4 pt-1 flex flex-col items-center gap-2.5 z-10">
            {images.length > 1 && (
              <div className="w-full flex items-center gap-2 px-3 sm:px-6">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous"
                  className="md:hidden shrink-0 w-11 h-11 rounded-full border border-black/10 bg-white flex items-center justify-center active:scale-95 transition-transform"
                >
                  <ChevronLeft size={18} />
                </button>
                <div ref={thumbsRef} className="flex-1 flex justify-start md:justify-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {images.map((img, i) => (
                    <button
                      type="button"
                      key={img.src + i}
                      onClick={() => setIndex(i)}
                      className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-md overflow-hidden border transition-all ${
                        i === index
                          ? "border-foreground opacity-100 ring-1 ring-foreground"
                          : "border-black/10 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img.src}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next"
                  className="md:hidden shrink-0 w-11 h-11 rounded-full border border-black/10 bg-white flex items-center justify-center active:scale-95 transition-transform"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
