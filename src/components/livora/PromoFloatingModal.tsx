import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getPublicPromoBanners, type PromoBanner } from "@/lib/promoApi";

const DISMISSED_KEY = "livora_promo_modal_closed_v1";

interface PromoFloatingModalProps {
  ready?: boolean;
}

export const PromoFloatingModal: React.FC<PromoFloatingModalProps> = ({ ready = true }) => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Muat banner aktif dari backend
  useEffect(() => {
    let cancelled = false;
    getPublicPromoBanners().then((data) => {
      if (cancelled) return;
      if (data && data.length > 0) {
        setBanners(data);
        const isDismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
        if (!isDismissed && ready) {
          // Delay halus 400ms setelah ready agar transisi hero preloader mulus
          const t = setTimeout(() => setIsOpen(true), 400);
          return () => clearTimeout(t);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const hasMultiple = banners.length > 1;

  const nextSlide = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  }, []);

  // Keyboard navigation (Esc to close, Left/Right arrows for slides)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowRight") nextSlide();
      else if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose, nextSlide, prevSlide]);

  // Autoplay carousel bila ada lebih dari 1 slide dan tidak sedang di-hover
  useEffect(() => {
    if (!isOpen || !hasMultiple || isPaused) return;
    const interval = setInterval(nextSlide, 6500);
    return () => clearInterval(interval);
  }, [isOpen, hasMultiple, isPaused, nextSlide]);

  if (!isOpen || banners.length === 0) return null;

  const banner = banners[currentIndex] || banners[0];

  const handleCardClick = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setIsOpen(false);
    const link = banner.cta_link || "/promo";
    if (link.startsWith("http")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate(link);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultiple) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    touchStartX.current = null;
  };

  return (
    <AnimatePresence>
      <motion.div
        key="promo-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/65 backdrop-blur-[6px]"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-label="Promosi Spesial"
      >
        <motion.div
          key="promo-modal-card"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => {
            // Seluruh area banner langsung mengarahkan ke halaman item promo
            e.stopPropagation();
            handleCardClick();
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative w-full max-w-5xl h-[78vh] sm:h-[82vh] max-h-[640px] md:max-h-[720px] rounded-2xl md:rounded-[22px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-white/20 cursor-pointer group select-none flex flex-col justify-center items-center text-center px-6 sm:px-12 md:px-16"
        >
          {/* Background image & gradient overlay */}
          <div className="absolute inset-0 -z-10 overflow-hidden bg-black">
            <AnimatePresence initial={false} mode="wait">
              <motion.img
                key={banner.id + "-" + banner.image_url}
                src={banner.image_url}
                alt={banner.title}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
              />
            </AnimatePresence>

            {/* Dark luxury overlays for crisp typography */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/35 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/25 to-black/60 pointer-events-none" />
          </div>

          {/* Close button (✕) in top right with frosted glass */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label="Tutup promo"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 text-white/85 hover:text-white backdrop-blur-md border border-white/25 flex items-center justify-center transition-all active:scale-95 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>

          {/* Carousel arrows (HANYA tampil bila banners.length > 1) */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                aria-label="Slide sebelumnya"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/35 hover:bg-black/65 text-white/80 hover:text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all active:scale-95 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="w-6 h-6 -ml-0.5" strokeWidth={1.75} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                aria-label="Slide berikutnya"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/35 hover:bg-black/65 text-white/80 hover:text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all active:scale-95 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="w-6 h-6 -mr-0.5" strokeWidth={1.75} />
              </button>
            </>
          )}

          {/* Text Content in Center */}
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            {banner.label && (
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-[#D7B483] font-medium bg-black/30 border border-[#D7B483]/30 px-3.5 py-1 rounded-full backdrop-blur-sm mb-3 sm:mb-4">
                {banner.label}
              </span>
            )}

            <h2 className="serif font-light text-4xl sm:text-6xl md:text-7xl text-white tracking-wide leading-none drop-shadow-md">
              {banner.title}
            </h2>

            {banner.subtitle && (
              <p className="text-base sm:text-xl md:text-2xl text-stone-200 font-light tracking-wide mt-3 sm:mt-4">
                {banner.subtitle}
              </p>
            )}

            {banner.description && (
              <p className="text-xs sm:text-sm md:text-base text-stone-300/85 font-light max-w-lg mt-2 sm:mt-3 leading-relaxed">
                {banner.description}
              </p>
            )}
          </div>

          {/* Pagination dots (HANYA tampil bila banners.length > 1) */}
          {hasMultiple && (
            <div className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {banners.map((b, idx) => {
                const active = idx === currentIndex;
                return (
                  <button
                    key={b.id || idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    aria-label={`Slide ${idx + 1}`}
                    className={`transition-all duration-300 rounded-full ${
                      active
                        ? "w-7 h-1.5 bg-white"
                        : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
