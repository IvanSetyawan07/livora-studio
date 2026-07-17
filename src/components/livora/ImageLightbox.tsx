import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
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

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

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
          className="fixed inset-0 z-[100] bg-white flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 z-10 w-10 h-10 rounded-md border border-black/10 bg-white/80 backdrop-blur flex items-center justify-center hover:bg-black hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* Prev / Next */}
          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Previous"
                className="absolute left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-md border border-black/10 bg-white/80 backdrop-blur flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                aria-label="Next"
                className="absolute right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-md border border-black/10 bg-white/80 backdrop-blur flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* Main image */}
          <div className="flex-1 flex items-center justify-center px-6 md:px-20 pt-16 pb-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={images[index].src}
                src={images[index].src}
                alt={images[index].alt ?? ""}
                className="max-w-full max-h-full object-contain select-none"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                draggable={false}
              />
            </AnimatePresence>
          </div>

          {/* Thumbnails + counter */}
          <div className="pb-6 flex flex-col items-center gap-3">
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-full px-6 no-scrollbar">
                {images.map((img, i) => (
                  <button
                    key={img.src + i}
                    onClick={() => setIndex(i)}
                    className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border transition-all ${
                      i === index
                        ? "border-foreground opacity-100"
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
            )}
            <p className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
              {index + 1} / {images.length}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
