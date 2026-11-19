import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Heart, Plus } from "lucide-react";
import { toast } from "sonner";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { addPublicCartLine } from "@/lib/shopPublic";
import { trackLivoraEvent } from "@/lib/analytics";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "@/lib/wishlist";
import { authStorage } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import type { FurnitureVariant } from "@/lib/itemsApi";
import {
  getVariantDisplayLabel,
  resolveSwatchHex,
} from "@/lib/furnitureColors";

export interface FurnitureCardItem {
  id?: number;
  apiId?: number;
  slug: string;
  name?: string;
  title?: string;
  code?: string | null;
  image?: string | null;
  category?: string | null;
  type?: { id?: number; name: string; slug: string } | null;
  collection?: { id?: number; name: string; slug: string } | null;
  specs?: {
    material?: string;
    finish?: string;
    availability?: string;
  };
  texture?: string | null;
  finish?: string | null;
  availability?: string | null;
  is_on_promo?: boolean;
  promo_badge_text?: string | null;
  variants?: FurnitureVariant[];
}

export type CatalogColumns = 3 | 4 | 5;

export function getCatalogGridClass(columns: CatalogColumns): string {
  switch (columns) {
    case 3:
      return "grid grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-8 sm:gap-y-11";
    case 5:
      return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 sm:gap-x-5 gap-y-8 sm:gap-y-10";
    case 4:
    default:
      return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-11";
  }
}

export function CatalogColumnToggle({
  value,
  onChange,
  className = "",
}: {
  value: CatalogColumns;
  onChange: (cols: CatalogColumns) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Jumlah kolom tampilan"
      className={`hidden lg:inline-flex items-center rounded-full bg-[#F3EFE8] border border-[#E6E0D6] p-1 ${className}`}
    >
      {([3, 4, 5] as CatalogColumns[]).map((cols) => {
        const active = value === cols;
        return (
          <button
            key={cols}
            type="button"
            onClick={() => onChange(cols)}
            aria-pressed={active}
            className={`px-3.5 py-1.5 rounded-full text-[12px] tracking-[0.01em] transition-all duration-200 whitespace-nowrap ${
              active
                ? "bg-[#181614] text-[#FAF8F5] font-medium shadow-sm"
                : "text-[#6D665D] hover:text-[#181614]"
            }`}
          >
            {cols} Kolom
          </button>
        );
      })}
    </div>
  );
}

interface FurnitureCardProps {
  item: FurnitureCardItem;
  detailHref?: string;
  badgeOverride?: string | null;
  countBadge?: number;
  highlighted?: boolean;
  compact?: boolean;
  className?: string;
}

const fitModeCache = new Map<string, "cover" | "contain">();

function normalizeImageSrc(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("blob:") || src.startsWith("data:")) {
    return src;
  }
  return imgUrl(src) || src;
}

/**
 * Kartu furnitur editorial quiet-luxury LIVORA:
 * - Bingkai portrait 4:5 melengkung elegan
 * - Badge pill frosted kiri atas + tombol wishlist hati kanan atas
 * - Interaksi hover: dock kaca buram "Lihat Detail" & "+ Tas" (langsung masuk keranjang)
 * - Pilihan swatch warna interaktif di kanan bawah + nama warna/material di kiri bawah
 * - TANPA harga publik (harga dikelola eksklusif di backoffice/penawaran)
 */
export const FurnitureCard: React.FC<FurnitureCardProps> = ({
  item,
  detailHref,
  badgeOverride,
  countBadge,
  highlighted = false,
  compact = false,
  className = "",
}) => {
  const navigate = useNavigate();

  const itemId = item.apiId ?? item.id;
  const title = item.name || item.title || "Furniture";

  const activeVariants = useMemo(() => {
    const list = (item.variants ?? []).filter((v) => v.is_active !== false);
    return [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [item.variants]);

  const defaultVariant = useMemo(
    () => activeVariants.find((v) => v.is_default) ?? activeVariants[0] ?? null,
    [activeVariants],
  );

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    defaultVariant?.id ?? null,
  );
  const [hoveredVariantId, setHoveredVariantId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const effectiveVariant = useMemo(() => {
    const id = hoveredVariantId ?? selectedVariantId;
    if (id == null) return defaultVariant;
    return activeVariants.find((v) => v.id === id) ?? defaultVariant;
  }, [activeVariants, defaultVariant, hoveredVariantId, selectedVariantId]);

  const displayImage = useMemo(() => {
    const raw =
      effectiveVariant?.furniture_image ||
      effectiveVariant?.preview_image ||
      item.image;
    return normalizeImageSrc(raw);
  }, [effectiveVariant, item.image]);

  const [imageFit, setImageFit] = useState<"cover" | "contain">(
    () => (displayImage && fitModeCache.get(displayImage)) || "contain",
  );

  useEffect(() => {
    setSelectedVariantId(defaultVariant?.id ?? null);
  }, [defaultVariant?.id, item.slug]);

  // Sinkron status wishlist dengan cache global (tanpa N+1 request)
  useEffect(() => {
    if (!itemId || !authStorage.getToken()) {
      setSaved(false);
      return;
    }
    let alive = true;
    const sync = () => {
      if (!authStorage.getToken()) {
        if (alive) setSaved(false);
        return;
      }
      getWishlist()
        .then((rows) => {
          if (!alive) return;
          setSaved(rows.some((r) => r.type === "item" && r.entity_id === Number(itemId)));
        })
        .catch(() => {});
    };
    sync();
    window.addEventListener("livora-wishlist-changed", sync);
    return () => {
      alive = false;
      window.removeEventListener("livora-wishlist-changed", sync);
    };
  }, [itemId]);

  useEffect(() => {
    setImageFit((displayImage && fitModeCache.get(displayImage)) || "contain");
  }, [displayImage]);

  // Label kiri bawah (warna aktif -> material -> finish -> kategori -> kode)
  const subtitleText = useMemo(() => {
    const fromVariant = getVariantDisplayLabel(effectiveVariant);
    if (fromVariant) return fromVariant;

    const clean = (val?: string | null) => {
      const s = (val ?? "").trim();
      return s && s !== "—" && s !== "-" ? s : "";
    };

    const material = clean(item.specs?.material) || clean(item.texture);
    if (material) return material.split(",")[0].trim();

    const finish = clean(item.specs?.finish) || clean(item.finish);
    if (finish) return finish;

    const typeName = clean(item.type?.name);
    if (typeName) return typeName;

    const code = clean(item.code);
    if (code) return code;

    return "Bespoke Edition";
  }, [effectiveVariant, item]);

  // Badge kiri atas (bersih, mendukung label editorial "Ikonik"/"Edisi Terbatas" maupun badge promo)
  const badgeText = useMemo(() => {
    if (badgeOverride !== undefined) return badgeOverride;
    const customBadge = item.promo_badge_text?.trim();
    if (customBadge) {
      return customBadge;
    }
    if (item.is_on_promo) {
      return "Penawaran Spesial";
    }
    if (item.collection?.name) {
      return item.collection.name;
    }
    const avail = (item.specs?.availability || item.availability || "").toLowerCase();
    if (avail === "made_to_order" || avail.includes("made to order")) {
      return "Bespoke";
    }
    return null;
  }, [badgeOverride, item]);

  const targetHref = useMemo(() => {
    const base = detailHref || `/items/${item.slug}`;
    if (!selectedVariantId) return base;
    if (base.includes("variant=")) return base;
    return `${base}${base.includes("?") ? "&" : "?"}variant=${selectedVariantId}`;
  }, [detailHref, item.slug, selectedVariantId]);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!itemId) {
      toast.info("Item ini hanya pratinjau katalog.");
      return;
    }
    if (!authStorage.getToken()) {
      toast.error("Masuk terlebih dahulu untuk menyimpan furnitur favorit Anda.");
      navigate("/login");
      return;
    }
    if (wishlistBusy) return;
    setWishlistBusy(true);
    try {
      if (saved) {
        await removeFromWishlist("item", Number(itemId));
        setSaved(false);
        toast.success("Dihapus dari daftar favorit");
      } else {
        await addToWishlist("item", Number(itemId));
        setSaved(true);
        trackLivoraEvent("add_to_wishlist", { type: "item", target_id: Number(itemId) });
        toast.success("Disimpan ke daftar favorit");
      }
    } catch {
      toast.error("Gagal memperbarui daftar favorit");
    } finally {
      setWishlistBusy(false);
    }
  };

  const handleAddToBag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!itemId) {
      navigate(targetHref);
      return;
    }
    const chosenVariant =
      activeVariants.find((v) => v.id === selectedVariantId) ?? defaultVariant;
    const colorNote = chosenVariant ? getVariantDisplayLabel(chosenVariant) : "";

    addPublicCartLine({
      item_id: Number(itemId),
      variant_id: chosenVariant?.id ?? null,
      quantity: 1,
      note: colorNote ? `Warna: ${colorNote}` : undefined,
      title,
      code: item.code ?? null,
      image: displayImage ?? null,
      slug: item.slug,
    });
    trackLivoraEvent("add_to_cart", {
      item_id: Number(itemId),
      item_title: title,
      variant_id: chosenVariant?.id ?? null,
      qty: 1,
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);

    toast.success(
      colorNote ? `${title} (${colorNote}) ditambahkan ke tas` : `${title} ditambahkan ke tas`,
      {
        action: {
          label: "Lihat Tas",
          onClick: () => navigate("/cart"),
        },
      },
    );
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const ratio = img.naturalHeight / img.naturalWidth;
      const mode = ratio >= 1.08 ? "cover" : "contain";
      if (displayImage) fitModeCache.set(displayImage, mode);
      setImageFit(mode);
    }
  };

  const visibleSwatches = activeVariants.slice(0, 5);
  const extraSwatchCount = Math.max(0, activeVariants.length - visibleSwatches.length);

  return (
    <article
      className={`group relative flex flex-col select-none ${
        highlighted ? "scroll-mt-32" : ""
      } ${className}`}
    >
      {/* ── MEDIA FRAME (4:5 Quiet Luxury Rounded Stage) ── */}
      <div
        className={`relative aspect-[4/5] w-full overflow-hidden rounded-[18px] sm:rounded-[20px] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          highlighted
            ? "ring-2 ring-[#1D1B18] ring-offset-2 ring-offset-background shadow-[0_20px_50px_-18px_rgba(24,20,16,0.28)]"
            : "ring-1 ring-inset ring-black/[0.05] group-hover:shadow-[0_20px_46px_-20px_rgba(24,20,16,0.22)]"
        }`}
        style={{
          background:
            "radial-gradient(circle at 50% 40%, #FAF8F4 0%, #F2EEE7 72%, #E9E3D9 100%)",
        }}
      >
        {/* Full-card clickable image link */}
        <Link
          to={targetHref}
          aria-label={`Lihat detail ${title}`}
          className="block w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D1B18] focus-visible:ring-inset"
        >
          {displayImage ? (
            <img
              key={displayImage}
              src={displayImage}
              alt={title}
              loading="lazy"
              decoding="async"
              onLoad={handleImageLoad}
              className={`w-full h-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045] ${
                imageFit === "cover"
                  ? "object-cover object-center"
                  : "object-contain p-5 sm:p-7 drop-shadow-[0_18px_28px_rgba(24,20,16,0.13)]"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8 transition-transform duration-700 group-hover:scale-105">
              <ItemIllustration name={title} size={compact ? 180 : 240} />
            </div>
          )}

          {/* Soft bottom depth gradient on hover so frosted action dock pops against any photo */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#181614]/25 via-[#181614]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
        </Link>

        {/* Top-Left Pill Badges */}
        {(badgeText || (countBadge && countBadge > 1)) && (
          <div className="pointer-events-none absolute top-3 left-3 sm:top-3.5 sm:left-3.5 z-10 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-64px)]">
            {badgeText && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full backdrop-blur-md px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] font-medium tracking-[0.015em] shadow-[0_2px_10px_rgba(24,20,16,0.08)] border border-white/65 truncate ${
                  item.is_on_promo
                    ? "bg-[#FAF6EE]/95 text-[#7C5C2E]"
                    : "bg-[#FAF8F5]/90 text-[#1D1B18]"
                }`}
              >
                {item.is_on_promo && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C49B63] shrink-0" />
                )}
                <span className="truncate">{badgeText}</span>
              </span>
            )}
            {countBadge && countBadge > 1 && (
              <span className="inline-flex items-center rounded-full bg-[#181614]/85 backdrop-blur-md text-[#FAF8F5] px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] uppercase shadow-sm">
                × {countBadge} pcs
              </span>
            )}
          </div>
        )}

        {/* Top-Right Frosted Circular Wishlist Heart Button */}
        {itemId && (
          <button
            type="button"
            onClick={handleToggleWishlist}
            disabled={wishlistBusy}
            aria-label={saved ? `Hapus ${title} dari favorit` : `Simpan ${title} ke favorit`}
            aria-pressed={saved}
            className="group/heart absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-20 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FAF8F5]/90 hover:bg-[#FAF8F5] backdrop-blur-md border border-white/70 shadow-[0_2px_12px_rgba(24,20,16,0.08)] transition-all duration-300 hover:scale-105 active:scale-90 disabled:opacity-60"
          >
            <Heart
              className={`w-[16px] h-[16px] sm:w-[17px] sm:h-[17px] transition-all duration-300 ${
                saved
                  ? "fill-[#8C6A3E] text-[#8C6A3E] scale-105"
                  : "text-[#8A755B] stroke-[1.7] group-hover/heart:text-[#8C6A3E] group-hover/heart:fill-[#8C6A3E]/20"
              }`}
            />
          </button>
        )}

        {/* Bottom-Center Interactive Frosted Hover Dock: "Lihat Detail" | "+ Tas" */}
        <div className="pointer-events-none absolute inset-x-2.5 sm:inset-x-3 bottom-3 sm:bottom-4 z-20 flex justify-center">
          <div
            className={`pointer-events-auto inline-flex items-center gap-1 rounded-full bg-[#EFE8DE]/85 backdrop-blur-md border border-white/60 shadow-[0_12px_30px_-6px_rgba(24,20,16,0.28)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              compact
                ? "p-1 pl-2.5"
                : "p-1 pl-3 sm:p-1.5 sm:pl-4"
            } opacity-100 translate-y-0 md:opacity-0 md:translate-y-3 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-focus-within:opacity-100 md:group-focus-within:translate-y-0`}
          >
            <Link
              to={targetHref}
              className={`${
                compact
                  ? "px-2 py-1 text-[11px]"
                  : "px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-[13px]"
              } font-medium text-[#1D1B18] hover:text-[#6E5333] transition-colors whitespace-nowrap`}
            >
              Lihat Detail
            </Link>

            <button
              type="button"
              onClick={handleAddToBag}
              className={`inline-flex items-center justify-center gap-1 rounded-full font-medium tracking-[0.01em] whitespace-nowrap shadow-sm transition-all duration-200 active:scale-95 ${
                compact
                  ? "px-2.5 py-1 text-[11px]"
                  : "px-3 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-[13px]"
              } ${
                justAdded
                  ? "bg-[#7E6037] text-[#FAF8F5]"
                  : "bg-[#181614] hover:bg-[#2E2A25] text-[#FAF8F5]"
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Di Tas</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Tas</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── CARD FOOTER (Editorial Typography + Interactive Color Swatches, ZERO PRICE) ── */}
      <div className="mt-3 sm:mt-3.5 px-0.5 flex flex-col gap-1">
        <Link
          to={targetHref}
          className="text-[14px] sm:text-[15.5px] font-medium text-[#1D1B18] tracking-[-0.012em] leading-snug line-clamp-1 group-hover:text-[#7A5E3B] transition-colors"
        >
          {title}
        </Link>

        <div className="flex items-center justify-between gap-2.5 min-h-[24px]">
          <p className="text-[12.5px] sm:text-[13px] text-[#7D756B] font-normal truncate transition-colors">
            {subtitleText}
          </p>

          {visibleSwatches.length > 0 && (
            <div
              className="flex items-center gap-2 shrink-0 py-0.5 pr-0.5"
              aria-label={`Pilihan warna ${title}`}
              onMouseLeave={() => setHoveredVariantId(null)}
            >
              {visibleSwatches.map((v) => {
                const isSelected = effectiveVariant?.id === v.id;
                const swatchLabel = getVariantDisplayLabel(v) || "Varian";
                const hex = resolveSwatchHex(v);
                return (
                  <button
                    key={v.id}
                    type="button"
                    title={swatchLabel}
                    aria-label={`Pilih warna ${swatchLabel}`}
                    aria-pressed={isSelected}
                    onMouseEnter={() => setHoveredVariantId(v.id)}
                    onFocus={() => setHoveredVariantId(v.id)}
                    onBlur={() => setHoveredVariantId(null)}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedVariantId(v.id);
                    }}
                    className={`relative w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] rounded-full transition-all duration-200 focus:outline-none ${
                      isSelected
                        ? "ring-[1.5px] ring-[#1D1B18] ring-offset-[2.5px] ring-offset-background scale-[1.04]"
                        : "ring-1 ring-inset ring-black/15 hover:scale-110 hover:ring-black/35"
                    }`}
                    style={
                      v.preview_image
                        ? {
                            backgroundImage: `url(${normalizeImageSrc(v.preview_image)})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundColor: hex,
                          }
                        : { backgroundColor: hex }
                    }
                  />
                );
              })}

              {extraSwatchCount > 0 && (
                <Link
                  to={targetHref}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-medium text-[#7D756B] hover:text-[#1D1B18] pl-0.5 transition-colors"
                  title={`${extraSwatchCount} warna lainnya`}
                >
                  +{extraSwatchCount}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
