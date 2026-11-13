import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getPublicPromoBanners, type PromoBanner } from "@/lib/promoApi";
import { imgUrl } from "@/lib/adminApi";

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
          // Delay halus 450ms setelah hero preloader selesai
          const t = setTimeout(() => setIsOpen(true), 450);
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
  const imageUrl = banner.image_url ? imgUrl(banner.image_url) : "";

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
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/75 backdrop-blur-[6px]"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-label="Promosi Spesial LIVORA"
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
          title="Klik untuk melihat penawaran promo"
          className="relative w-full max-w-4xl max-h-[86vh] rounded-2xl md:rounded-[24px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/20 cursor-pointer group select-none flex items-center justify-center bg-black"
        >
          {/* Banner Pure Image (Tanpa Text Overlay & Tanpa Tombol Button) */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              <motion.img
                key={banner.id + "-" + imageUrl}
                src={imageUrl}
                alt={banner.title || "Promosi LIVORA"}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-full h-auto max-h-[86vh] object-contain transition-transform duration-700 ease-out group-hover:scale-[1.015]"
              />
            </AnimatePresence>
          </div>

          {/* Close button (✕) di pojok kanan atas dengan efek frosted glass */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label="Tutup promo"
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/75 text-white/85 hover:text-white backdrop-blur-md border border-white/25 flex items-center justify-center transition-all active:scale-95 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white/85 hover:text-white backdrop-blur-md border border-white/25 flex items-center justify-center transition-all active:scale-95 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white/85 hover:text-white backdrop-blur-md border border-white/25 flex items-center justify-center transition-all active:scale-95 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="w-6 h-6 -mr-0.5" strokeWidth={1.75} />
              </button>
            </>
          )}

          {/* Pagination dots (HANYA tampil bila banners.length > 1) */}
          {hasMultiple && (
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/35 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
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
                        ? "w-6 h-1.5 bg-white"
                        : "w-1.5 h-1.5 bg-white/40 hover:bg-white/75"
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
