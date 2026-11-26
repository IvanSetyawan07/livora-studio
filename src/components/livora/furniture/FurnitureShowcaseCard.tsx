import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Check } from "lucide-react";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import type {
  FurnitureFinishOption,
  FurnitureShowcaseItem,
  GridColumns,
} from "./types";

const stageFitCache = new Map<string, "cover" | "contain">();

interface FurnitureShowcaseCardProps {
  item: FurnitureShowcaseItem;
  columns: GridColumns;
  saved: boolean;
  onToggleSave: (item: FurnitureShowcaseItem, activeFinish: FurnitureFinishOption | null) => void;
  onFinishChange?: (item: FurnitureShowcaseItem, activeFinish: FurnitureFinishOption) => void;
}

/**
 * Kartu furnitur arsitektural tanpa bingkai (frameless) — tanpa border luar,
 * tanpa box mengelilingi teks, dan TANPA harga/checkout di mana pun.
 * Klik kartu atau "Lihat Detail" langsung berpindah halaman ke /items/:slug.
 */
export const FurnitureShowcaseCard: React.FC<FurnitureShowcaseCardProps> = ({
  item,
  columns,
  saved,
  onToggleSave,
  onFinishChange,
}) => {
  const finishes = item.finishes;
  const defaultFinish = useMemo(
    () => finishes.find((f) => f.isDefault) ?? finishes[0],
    [finishes],
  );

  const [selectedFinishId, setSelectedFinishId] = useState<number | string>(
    defaultFinish?.id ?? "default",
  );
  const [hoveredFinishId, setHoveredFinishId] = useState<number | string | null>(null);

  useEffect(() => {
    setSelectedFinishId(defaultFinish?.id ?? "default");
  }, [defaultFinish?.id, item.slug]);

  const activeFinish = useMemo(() => {
    const targetId = hoveredFinishId ?? selectedFinishId;
    return finishes.find((f) => f.id === targetId) ?? defaultFinish;
  }, [finishes, defaultFinish, hoveredFinishId, selectedFinishId]);

  const lockedFinish = useMemo(
    () => finishes.find((f) => f.id === selectedFinishId) ?? defaultFinish,
    [finishes, defaultFinish, selectedFinishId],
  );

  const displayImage = useMemo(() => {
    return (
      activeFinish?.furnitureImage ||
      activeFinish?.previewImage ||
      item.image ||
      null
    );
  }, [activeFinish, item.image]);

  const [imageFit, setImageFit] = useState<"cover" | "contain">(
    () => (displayImage && stageFitCache.get(displayImage)) || "contain",
  );

  useEffect(() => {
    setImageFit((displayImage && stageFitCache.get(displayImage)) || "contain");
  }, [displayImage]);

  const studioFilterStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!activeFinish || activeFinish.furnitureImage || activeFinish.id === defaultFinish?.id) {
      return undefined;
    }
    const idx = finishes.findIndex((f) => f.id === activeFinish.id);
    if (idx <= 0) return undefined;
    if (idx % 2 === 1) {
      return { filter: "brightness(0.97) contrast(1.03) saturate(0.94)" };
    }
    return { filter: "brightness(1.02) contrast(1.02) sepia(0.06)" };
  }, [activeFinish, defaultFinish, finishes]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const ratio = img.naturalHeight / img.naturalWidth;
      const mode = ratio >= 1.08 ? "cover" : "contain";
      if (displayImage) stageFitCache.set(displayImage, mode);
      setImageFit(mode);
    }
  };

  const detailHref = useMemo(() => {
    const base = `/items/${item.slug}`;
    if (typeof lockedFinish?.id === "number") {
      return `${base}?variant=${lockedFinish.id}`;
    }
    return base;
  }, [item.slug, lockedFinish?.id]);

  const titleSizeClass =
    columns === 5
      ? "text-[13.5px] sm:text-[14px]"
      : columns === 3
      ? "text-[15px] sm:text-[16.5px]"
      : "text-[14px] sm:text-[15px]";

  const metaLine = useMemo(() => {
    const parts: string[] = [];
    if (item.dimensionsLabel && item.dimensionsLabel !== "Bespoke Dimensions") {
      parts.push(item.dimensionsLabel);
    }
    const finishText = activeFinish?.name || item.materialLabel;
    if (finishText) parts.push(finishText);
    if (parts.length <= 1 && item.dimensionsLabel === "Bespoke Dimensions") {
      parts.push("Custom Dimensions");
    }
    return parts.join(" · ");
  }, [item.dimensionsLabel, item.materialLabel, activeFinish?.name]);

  const visibleSwatches = finishes.slice(0, 5);
  const extraSwatches = Math.max(0, finishes.length - visibleSwatches.length);

  return (
    <article className="furniture-showcase-item group flex flex-col select-none">
      {/* 1. STUDIO PRODUCT STAGE (aspect-[4/5], rounded-2xl, #EEF1F5 -> #F4F6F8) */}
      <div
        className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, #F6F8FA 0%, #EFF2F6 70%, #E9EEF3 100%)",
        }}
      >
        <Link
          to={detailHref}
          aria-label={`Lihat detail ${item.name}`}
          className="block w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B426E] focus-visible:ring-inset"
        >
          {displayImage ? (
            <img
              key={displayImage}
              src={displayImage}
              alt={item.name}
              loading="lazy"
              decoding="async"
              onLoad={handleImageLoad}
              style={studioFilterStyle}
              className={`w-full h-full transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
                imageFit === "cover"
                  ? "object-cover object-center"
                  : "object-contain p-5 sm:p-6 drop-shadow-[0_18px_24px_rgba(11,66,110,0.11)]"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-7 transition-transform duration-500 ease-out group-hover:scale-[1.03]">
              <ItemIllustration name={item.name} size={columns === 5 ? 170 : 220} />
            </div>
          )}
        </Link>

        {/* Top-left subtle architectural series/editorial tag */}
        {item.editorialTag && (
          <span className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center rounded-full bg-white/85 backdrop-blur-sm border border-[#0B426E]/10 px-3 py-1 text-[10px] font-medium tracking-[0.06em] text-[#0B426E]">
            {item.editorialTag}
          </span>
        )}

        {/* Top-right minimal circular Bookmark / Save button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(item, lockedFinish ?? null);
          }}
          aria-label={saved ? `Hapus ${item.name} dari shortlist` : `Simpan ${item.name} ke shortlist`}
          aria-pressed={saved}
          className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/92 hover:bg-white border border-[#0B426E]/10 flex items-center justify-center transition-[opacity,color,transform] duration-300 active:scale-90 ${
            saved
              ? "opacity-100 text-[#1E88C7]"
              : "opacity-85 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 text-[#4B5E71] hover:text-[#0B426E]"
          }`}
        >
          <Bookmark
            className={`w-[15px] h-[15px] transition-colors duration-200 ${
              saved ? "fill-[#1E88C7] text-[#1E88C7]" : "stroke-[1.75]"
            }`}
          />
        </button>

        {/* Bottom Floating Frosted Action Dock: "Lihat Detail" (langsung ke page detail) | "Save Piece" */}
        <div className="pointer-events-none absolute inset-x-2.5 bottom-3.5 z-20 flex justify-center">
          <div
            className={`pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/92 backdrop-blur-md border border-[#0B426E]/10 transition-[opacity,transform] duration-300 ease-out ${
              columns === 5 ? "p-1 pl-2.5" : "p-1 pl-3 sm:p-1.5 sm:pl-3.5"
            } opacity-100 translate-y-0 md:opacity-0 md:translate-y-2.5 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-focus-within:opacity-100 md:group-focus-within:translate-y-0`}
            style={{ boxShadow: "0 10px 24px -10px rgba(11, 66, 110, 0.22)" }}
          >
            <Link
              to={detailHref}
              className={`font-medium text-[#0B426E] hover:text-[#1E88C7] transition-colors whitespace-nowrap ${
                columns === 5
                  ? "px-2 py-1 text-[11px]"
                  : "px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-[12px]"
              }`}
            >
              Lihat Detail
            </Link>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(item, lockedFinish ?? null);
              }}
              className={`inline-flex items-center justify-center gap-1 rounded-full font-medium whitespace-nowrap transition-colors duration-200 active:scale-95 ${
                columns === 5
                  ? "px-2.5 py-1 text-[11px]"
                  : "px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-[12px]"
              } ${
                saved
                  ? "bg-[#1E88C7] text-white"
                  : "bg-[#0B426E] hover:bg-[#083559] text-white"
              }`}
            >
              {saved ? (
                <>
                  <span>Saved</span>
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </>
              ) : (
                <span>Save Piece</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. OPEN METADATA DIRECTLY ON #F8F9FB CANVAS (NO box, NO border, NO price) */}
      <div className="pt-3.5 px-0.5 flex flex-col">
        <p className="text-[10.5px] uppercase tracking-[0.14em] text-[#4B5E71] font-medium truncate">
          {item.series || item.category}
        </p>

        <Link
          to={detailHref}
          className={`mt-1 text-left font-medium text-[#0B426E] hover:text-[#1E88C7] tracking-[-0.012em] leading-snug line-clamp-1 transition-colors focus:outline-none ${titleSizeClass}`}
        >
          {item.name}
        </Link>

        <p className="mt-1 text-[12px] text-[#4B5E71]/90 font-normal truncate">
          {metaLine}
        </p>

        {/* Interactive Material Swatches (14px circles + #0B426E active ring) */}
        {visibleSwatches.length > 0 && (
          <div
            className="mt-2.5 flex items-center gap-2"
            aria-label={`Pilihan material ${item.name}`}
            onMouseLeave={() => setHoveredFinishId(null)}
          >
            {visibleSwatches.map((finish) => {
              const isSelected = activeFinish?.id === finish.id;
              return (
                <button
                  key={String(finish.id)}
                  type="button"
                  title={finish.name}
                  aria-label={`Pilih finishing ${finish.name}`}
                  aria-pressed={isSelected}
                  onMouseEnter={() => setHoveredFinishId(finish.id)}
                  onFocus={() => setHoveredFinishId(finish.id)}
                  onBlur={() => setHoveredFinishId(null)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedFinishId(finish.id);
                    onFinishChange?.(item, finish);
                  }}
                  className={`w-[14px] h-[14px] rounded-full transition-transform duration-200 focus:outline-none ${
                    isSelected
                      ? "ring-[1.5px] ring-[#0B426E] ring-offset-2 ring-offset-[#F8F9FB] scale-105"
                      : "ring-1 ring-inset ring-[#0B426E]/20 hover:scale-115 hover:ring-[#1E88C7]"
                  }`}
                  style={
                    finish.previewImage
                      ? {
                          backgroundImage: `url(${finish.previewImage})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundColor: finish.hex,
                        }
                      : { backgroundColor: finish.hex }
                  }
                />
              );
            })}
            {extraSwatches > 0 && (
              <Link
                to={detailHref}
                className="text-[10.5px] font-medium text-[#4B5E71] hover:text-[#0B426E]"
              >
                +{extraSwatches}
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
