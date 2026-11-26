import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Expand,
  MessageCircle,
  Moon,
  QrCode,
  ShoppingBag,
  Sparkles,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ItemQRCode from "@/components/livora/ItemQRCode";
import { askConcierge } from "@/lib/supportChat";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { ImageLightbox, type LightboxImage } from "@/components/livora/ImageLightbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WHATSAPP_NUMBER } from "@/components/livora/WhatsAppButton";
import { FurnitureShowroomBanner } from "@/components/livora/furniture/FurnitureShowroomBanner";
import {
  updateShortlistFinish,
  useShortlist,
} from "@/components/livora/furniture/shortlistStore";
import { addPublicCartLine } from "@/lib/shopPublic";
import { items } from "@/data/items";
import {
  useItemBySlug,
  type FurnitureVariant,
  type GalleryImage,
  type RichItem,
} from "@/lib/itemsApi";
import { useProjectBySlug } from "@/lib/projectsApi";
import { trackClick, trackView } from "@/lib/adminApi";
import { trackLivoraEvent } from "@/lib/analytics";
import { authStorage } from "@/lib/api";
import { addToWishlist, removeFromWishlist } from "@/lib/wishlist";
import { getVariantDisplayLabel, resolveSwatchHex } from "@/lib/furnitureColors";

const ItemDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectSlug = searchParams.get("from");
  const variantParam = searchParams.get("variant");
  const { project } = useProjectBySlug(projectSlug ?? undefined);
  const { item, loading } = useItemBySlug(slug);
  const shortlist = useShortlist();

  const [showQR, setShowQR] = useState(false);
  const [activeVariantId, setActiveVariantId] = useState<number | null>(null);
  const [selectedGalleryUrl, setSelectedGalleryUrl] = useState<string | null>(null);
  const [ambiance, setAmbiance] = useState<"daylight" | "evening">("daylight");
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [imageFit, setImageFit] = useState<"cover" | "contain">("contain");
  const [addedToQuote, setAddedToQuote] = useState(false);

  const [showProductDetails, setShowProductDetails] = useState(false);
  const [sheetCategory, setSheetCategory] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Reset variant saat item berganti (hormati ?variant= dari klik swatch kartu, lalu is_default)
  useEffect(() => {
    const activeList = (item?.variants ?? []).filter((v) => v.is_active !== false);
    if (activeList.length > 0) {
      const requestedId = variantParam ? Number(variantParam) : null;
      const fromParam = requestedId
        ? activeList.find((v) => v.id === requestedId)
        : undefined;
      const def = activeList.find((v) => v.is_default);
      setActiveVariantId((fromParam ?? def ?? activeList[0]).id);
    } else {
      setActiveVariantId(null);
    }
    setSelectedGalleryUrl(null);
    setAmbiance("daylight");
    setZoomActive(false);
    setAddedToQuote(false);
  }, [item?.apiId, item?.slug, variantParam]);

  // SEO
  useEffect(() => {
    if (!item) return;
    document.title = `${item.name} — LIVORA`;
    const meta =
      document.querySelector('meta[name="description"]') ??
      (() => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
        return m;
      })();
    meta.setAttribute(
      "content",
      `${item.name} (${item.code}) — ${item.category} by LIVORA. ${item.specs.material}.`,
    );
    window.scrollTo(0, 0);
  }, [item]);

  // Analytics
  const startRef = useRef<number>(Date.now());
  useEffect(() => {
    const id = item?.apiId;
    if (!id) return;
    startRef.current = Date.now();
    trackClick("item", id);
    trackLivoraEvent("view_item", { item_id: id, slug: item?.slug, title: item?.name });
    return () => {
      const sec = Math.round((Date.now() - startRef.current) / 1000);
      trackView("item", id, sec);
    };
  }, [item?.apiId, item?.slug, item?.name]);

  const activeVariants = useMemo(
    () => (item?.variants ?? []).filter((v) => v.is_active !== false),
    [item?.variants],
  );

  const activeVariant: FurnitureVariant | null = useMemo(
    () => activeVariants.find((v) => v.id === activeVariantId) ?? null,
    [activeVariants, activeVariantId],
  );

  const galleryImages: GalleryImage[] = useMemo(() => item?.gallery ?? [], [item]);

  const variantMainImage =
    activeVariant?.furniture_image ||
    activeVariant?.preview_image ||
    item?.image ||
    "";

  const stageImage = selectedGalleryUrl || variantMainImage;

  useEffect(() => {
    setImageFit("contain");
  }, [stageImage]);

  const lightboxImages: LightboxImage[] = useMemo(() => {
    const list: LightboxImage[] = [];
    const seen = new Set<string>();
    const push = (src?: string | null, alt?: string) => {
      if (!src || seen.has(src)) return;
      seen.add(src);
      list.push({ src, alt: alt || item?.name || "" });
    };
    push(variantMainImage, item?.name);
    if (item?.image && item.image !== variantMainImage) {
      push(item.image, item.name);
    }
    galleryImages.forEach((g) =>
      push(g.image, g.alt_text ?? g.title ?? item?.name ?? ""),
    );
    return list;
  }, [variantMainImage, item?.image, galleryImages, item?.name]);

  const openLightbox = (i: number) => {
    if (!lightboxImages.length) return;
    setLightboxIndex(Math.max(0, Math.min(lightboxImages.length - 1, i)));
    setLightboxOpen(true);
  };

  const variantGroups = useMemo(() => {
    const groups: Record<string, FurnitureVariant[]> = {};
    activeVariants.forEach((v) => {
      (groups[v.category] ||= []).push(v);
    });
    return groups;
  }, [activeVariants]);

  const handleSelectVariant = (v: FurnitureVariant) => {
    setActiveVariantId(v.id);
    setSelectedGalleryUrl(null);
    if (item && shortlist.isSaved(item.slug)) {
      updateShortlistFinish(item.slug, {
        id: v.id,
        name: getVariantDisplayLabel(v) || v.variant_name,
        hex: resolveSwatchHex(v),
        image: v.furniture_image || v.preview_image || item.image || null,
      });
    }
  };

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F9FB]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-28 pb-16">
          <div className="text-center px-6">
            <p className="serif text-4xl font-light text-[#0B426E] mb-4">
              {loading ? "Memuat spesifikasi…" : "Furnitur tidak ditemukan"}
            </p>
            <Link
              to="/furniture"
              className="inline-flex items-center gap-2 rounded-full bg-[#0B426E] text-white px-6 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-[#083559] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Koleksi
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const saved = shortlist.isSaved(item.slug);
  const activeFinishLabel =
    getVariantDisplayLabel(activeVariant) ||
    (item.specs.finish && item.specs.finish !== "—" ? item.specs.finish : "Signature Finish");
  const activeFinishHex = activeVariant ? resolveSwatchHex(activeVariant) : "#D8CFC2";
  const materialDisplay =
    activeVariant?.material_name ||
    (item.specs.material && item.specs.material !== "—"
      ? item.specs.material
      : item.textures?.join(", ") || "Curated Natural Materials");

  const dimensionsDisplay =
    item.specs.dimensions && item.specs.dimensions !== "—"
      ? item.specs.dimensions
      : "Custom — Made to Order";

  const availabilityDisplay = (() => {
    const raw = (item.specs.availability || "").toLowerCase();
    if (raw === "available" || raw === "ready") return "Showroom Ready · Custom Available";
    if (raw === "made_to_order" || raw.includes("made to order")) return "Made to Order · Bespoke";
    return item.specs.availability || "Made to Order";
  })();

  const editorialTag =
    item.promo_badge_text &&
    !/(%|off|rp|idr|hemat|diskon|promo|sale)/i.test(item.promo_badge_text)
      ? item.promo_badge_text
      : null;

  const handleToggleSave = () => {
    const res = shortlist.toggle({
      slug: item.slug,
      apiId: item.apiId,
      name: item.name,
      code: item.code || "",
      category: item.type?.name || item.category || "Furniture",
      image: variantMainImage || item.image || null,
      finishId: activeVariant?.id ?? null,
      finishName: activeFinishLabel,
      finishHex: activeFinishHex,
      dimensionsLabel: dimensionsDisplay,
      materialLabel: materialDisplay,
    });

    if (item.apiId && authStorage.getToken()) {
      if (res.saved) {
        addToWishlist("item", Number(item.apiId)).catch(() => {});
      } else {
        removeFromWishlist("item", Number(item.apiId)).catch(() => {});
      }
    }

    if (res.saved) {
      toast.success(`${item.name} (${activeFinishLabel}) disimpan ke shortlist`);
    } else {
      toast.info(`${item.name} dihapus dari shortlist`);
    }
  };

  const handleAddToQuoteList = () => {
    if (!item.apiId) return;
    addPublicCartLine({
      item_id: item.apiId,
      variant_id: activeVariantId,
      quantity: 1,
      note: activeFinishLabel ? `Finish: ${activeFinishLabel}` : undefined,
      title: item.name,
      code: item.code ?? null,
      image: variantMainImage || item.image || null,
      slug: item.slug,
    });
    trackLivoraEvent("add_to_cart", {
      item_id: item.apiId,
      item_title: item.name,
      variant_id: activeVariantId,
      qty: 1,
    });
    setAddedToQuote(true);
    window.setTimeout(() => setAddedToQuote(false), 1800);
    toast.success(`${item.name} ditambahkan ke keranjang`, {
      action: { label: "Lihat Keranjang", onClick: () => navigate("/cart") },
    });
  };

  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Halo Tim LIVORA,\n\nSaya tertarik untuk berkonsultasi mengenai furnitur berikut:\n• Produk: ${item.name}${item.code ? ` (${item.code})` : ""}\n• Finishing pilihan: ${activeFinishLabel}\n• Dimensi: ${dimensionsDisplay}\n\nMohon informasi detail spesifikasi, pilihan material, serta jadwal kunjungan ke LIVORA Showroom.`,
  )}`;

  const related: RichItem[] =
    item.related && item.related.length > 0
      ? item.related
      : (items.filter((i) => i.slug !== item.slug).slice(0, 5) as RichItem[]);

  const stageBg =
    ambiance === "daylight"
      ? "radial-gradient(circle at 50% 38%, #F7F9FB 0%, #EFF2F6 68%, #E7EDF3 100%)"
      : "radial-gradient(circle at 52% 35%, #F8F0E4 0%, #ECE0CE 62%, #DFD1BC 100%)";

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  };

  const handleMainImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const ratio = img.naturalHeight / img.naturalWidth;
      setImageFit(ratio >= 1.1 ? "cover" : "contain");
    }
  };

  const hasTaxonomies =
    (item.themeRefs && item.themeRefs.length > 0) ||
    (item.categoryRefs && item.categoryRefs.length > 0) ||
    Boolean(item.collection);

  const variantCategoryEntries = Object.entries(variantGroups);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] text-[#0B426E]">
      <Navbar />

      <main className="flex-1">
        {/* Minimal Architectural Breadcrumb */}
        <div className="border-b border-[#0B426E]/8 bg-[#F8F9FB]">
          <nav
            aria-label="Breadcrumb"
            className="container-livora pt-24 pb-3.5 flex flex-wrap items-center gap-y-1 text-[11px] uppercase tracking-[0.16em] text-[#4B5E71]"
          >
            <Link to="/" className="py-1 hover:text-[#0B426E] transition-colors">
              Home
            </Link>
            <span className="mx-2 text-[#0B426E]/25">/</span>
            <Link to="/furniture" className="py-1 hover:text-[#0B426E] transition-colors">
              Furniture
            </Link>
            {project && (
              <>
                <span className="mx-2 text-[#0B426E]/25">/</span>
                <Link
                  to={`/projects/${project.slug}`}
                  className="py-1 hover:text-[#0B426E] transition-colors"
                >
                  {project.name}
                </Link>
              </>
            )}
            <span className="mx-2 text-[#0B426E]/25">/</span>
            <span className="py-1 text-[#0B426E] font-medium truncate max-w-[260px] sm:max-w-none">
              {item.name}
            </span>
          </nav>
        </div>

        {/* MAIN ARCHITECTURAL SHOWCASE SPLIT */}
        <section className="container-livora py-8 sm:py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 xl:gap-16 items-start">
            {/* LEFT: Clean Sticky Studio Stage (6 cols on lg, 7 cols on xl) */}
            <div className="lg:col-span-6 xl:col-span-7 lg:sticky lg:top-28 space-y-3.5">
              <div
                className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[11/10] rounded-3xl overflow-hidden transition-colors duration-500 select-none"
                style={{ background: stageBg }}
                onMouseEnter={() => setZoomActive(true)}
                onMouseLeave={() => setZoomActive(false)}
                onMouseMove={handlePointerMove}
              >
                {stageImage ? (
                  <img
                    key={stageImage}
                    src={stageImage}
                    alt={item.name}
                    onLoad={handleMainImageLoad}
                    onClick={() => {
                      const idx = lightboxImages.findIndex((x) => x.src === stageImage);
                      openLightbox(idx >= 0 ? idx : 0);
                    }}
                    style={{
                      transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                      transform: zoomActive ? "scale(1.65)" : "scale(1)",
                      filter:
                        ambiance === "evening"
                          ? "sepia(0.10) saturate(1.05) brightness(0.97) contrast(1.03)"
                          : "none",
                    }}
                    className={`w-full h-full transition-transform duration-300 ease-out cursor-zoom-in ${
                      imageFit === "cover"
                        ? "object-cover object-center"
                        : `object-contain p-8 sm:p-12 ${
                            ambiance === "daylight"
                              ? "drop-shadow-[0_24px_34px_rgba(11,66,110,0.12)]"
                              : "drop-shadow-[0_26px_38px_rgba(68,48,26,0.22)]"
                          }`
                    }`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full p-10">
                    <ItemIllustration name={item.name} size={290} strokeWidth={1.1} />
                  </div>
                )}

                {ambiance === "evening" && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 28%, rgba(255,222,175,0.22) 0%, rgba(11,66,110,0.05) 100%)",
                    }}
                  />
                )}

                {/* Minimal Top-Left Lighting Toggle */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-4 left-4 z-20 inline-flex items-center gap-0.5 rounded-full bg-white/88 backdrop-blur-md border border-[#0B426E]/10 p-1"
                >
                  <button
                    type="button"
                    onClick={() => setAmbiance("daylight")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                      ambiance === "daylight"
                        ? "bg-[#0B426E] text-white"
                        : "text-[#4B5E71] hover:text-[#0B426E]"
                    }`}
                  >
                    <Sun className="w-3 h-3" />
                    <span>Daylight</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmbiance("evening")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                      ambiance === "evening"
                        ? "bg-[#0B426E] text-white"
                        : "text-[#4B5E71] hover:text-[#0B426E]"
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                    <span>Evening</span>
                  </button>
                </div>

                {/* Minimal Bottom-Right Fullscreen Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    const idx = lightboxImages.findIndex((x) => x.src === stageImage);
                    openLightbox(idx >= 0 ? idx : 0);
                  }}
                  aria-label="Perbesar foto layar penuh"
                  className="absolute bottom-4 right-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-[#0B426E]/10 text-[#0B426E] px-3.5 py-1.5 text-[11px] font-medium transition-colors"
                >
                  <Expand className="w-3.5 h-3.5" />
                  <span>
                    {lightboxImages.length > 1 ? `${lightboxImages.length} Foto` : "Perbesar"}
                  </span>
                </button>
              </div>

              {/* Clean Thumbnail Row */}
              {lightboxImages.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                  {lightboxImages.map((imgItem, idx) => {
                    const active = stageImage === imgItem.src;
                    return (
                      <button
                        key={`${imgItem.src}-${idx}`}
                        type="button"
                        onClick={() => setSelectedGalleryUrl(imgItem.src)}
                        className={`relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 bg-[#EEF1F5] transition-all ${
                          active
                            ? "ring-2 ring-[#0B426E] ring-offset-2 ring-offset-[#F8F9FB]"
                            : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={imgItem.src}
                          alt={imgItem.alt}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT: Calm Editorial Specification & Single-Focus CTA Hierarchy */}
            <div className="lg:col-span-6 xl:col-span-5 lg:pt-2">
              {/* 1. Eyebrow + Quiet Utility Icons */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-[#4B5E71]">
                  <span className="font-medium text-[#1E88C7]">
                    {item.collection?.name ?? item.type?.name ?? item.category}
                  </span>
                  {item.code && (
                    <>
                      <span className="text-[#0B426E]/25">·</span>
                      <span className="font-mono tracking-[0.14em]">{item.code}</span>
                    </>
                  )}
                  {editorialTag && (
                    <>
                      <span className="text-[#0B426E]/25">·</span>
                      <span className="text-[#0B426E] font-medium">{editorialTag}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowQR(true)}
                    title="QR Identity"
                    aria-label="Tampilkan QR Code produk"
                    className="w-9 h-9 rounded-full hover:bg-[#EAF4FA] text-[#4B5E71] hover:text-[#0B426E] inline-flex items-center justify-center transition-colors"
                  >
                    <QrCode className="w-[17px] h-[17px] stroke-[1.7]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleSave}
                    aria-label={saved ? "Hapus dari shortlist" : "Simpan ke shortlist"}
                    aria-pressed={saved}
                    title={saved ? "Tersimpan di Shortlist" : "Simpan ke Shortlist"}
                    className={`w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors ${
                      saved
                        ? "bg-[#EAF4FA] text-[#1E88C7]"
                        : "hover:bg-[#EAF4FA] text-[#4B5E71] hover:text-[#0B426E]"
                    }`}
                  >
                    <Bookmark
                      className={`w-[17px] h-[17px] stroke-[1.7] ${saved ? "fill-[#1E88C7]" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {showQR && (
                <ItemQRCode
                  slug={item.slug}
                  name={item.name}
                  code={item.code}
                  onClose={() => setShowQR(false)}
                />
              )}

              {/* 2. High-Contrast Serif Title & Calm Description */}
              <h1 className="serif font-light text-4xl sm:text-[46px] text-[#0B426E] leading-[1.06] tracking-[-0.018em] mt-3">
                {item.name}
              </h1>

              {(activeVariant?.description || item.description) && (
                <p
                  key={activeVariant?.id ?? "desc"}
                  className="mt-4 text-[14.5px] sm:text-[15px] text-[#4B5E71] font-normal leading-[1.7] animate-fade-in"
                >
                  {activeVariant?.description || item.description}
                </p>
              )}

              {/* 3. Open Tactile Finish / Color Swatch Bar (NO box wrapper) */}
              {activeVariants.length > 0 && (
                <div className="mt-7 pt-6 border-t border-[#0B426E]/10">
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <span className="text-[10.5px] uppercase tracking-[0.2em] text-[#4B5E71]">
                      Finish &amp; Warna
                    </span>
                    <span className="text-[13px] font-medium text-[#0B426E]">
                      {activeFinishLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {activeVariants.map((v) => {
                      const isSel = v.id === activeVariantId;
                      const hex = resolveSwatchHex(v);
                      const label = getVariantDisplayLabel(v) || v.variant_name;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectVariant(v)}
                          title={label}
                          aria-label={`Pilih warna ${label}`}
                          aria-pressed={isSel}
                          className={`w-7 h-7 rounded-full transition-all duration-200 focus:outline-none ${
                            isSel
                              ? "ring-[1.75px] ring-[#0B426E] ring-offset-[3px] ring-offset-[#F8F9FB] scale-105"
                              : "ring-1 ring-inset ring-black/15 hover:scale-110 hover:ring-[#1E88C7]"
                          }`}
                          style={
                            v.preview_image
                              ? {
                                  backgroundImage: `url(${v.preview_image})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                  backgroundColor: hex,
                                }
                              : { backgroundColor: hex }
                          }
                        />
                      );
                    })}
                  </div>

                  {variantCategoryEntries.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {variantCategoryEntries.map(([cat, vs]) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSheetCategory(cat)}
                          className="inline-flex items-center gap-1 text-[12px] text-[#1E88C7] hover:text-[#0B426E] font-medium transition-colors capitalize"
                        >
                          <span>
                            Lihat katalog {cat} ({vs.length})
                          </span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Architectural Specification Ledger (Crisp Hairline Rows — ZERO SaaS Boxes) */}
              <dl className="mt-7 border-t border-b border-[#0B426E]/10 divide-y divide-[#0B426E]/8 text-[13.5px]">
                <div className="py-3.5 flex items-baseline justify-between gap-4">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-[#4B5E71] shrink-0">
                    Dimensi
                  </dt>
                  <dd className="text-right font-medium text-[#0B426E]">
                    {dimensionsDisplay}
                  </dd>
                </div>

                <div className="py-3.5 flex items-baseline justify-between gap-4">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-[#4B5E71] shrink-0">
                    Material
                  </dt>
                  <dd className="text-right font-medium text-[#0B426E]">
                    {materialDisplay}
                  </dd>
                </div>

                <div className="py-3.5 flex items-baseline justify-between gap-4">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-[#4B5E71] shrink-0">
                    Finishing
                  </dt>
                  <dd className="text-right font-medium text-[#0B426E]">
                    {activeFinishLabel}
                  </dd>
                </div>

                <div className="py-3.5 flex items-center justify-between gap-4">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-[#4B5E71] shrink-0">
                    Status
                  </dt>
                  <dd className="inline-flex items-center gap-2 text-right font-medium text-[#0B426E]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1E88C7] shrink-0" />
                    <span>{availabilityDisplay}</span>
                  </dd>
                </div>
              </dl>

              {/* 5. Clean Action Hierarchy: 1 Primary CTA + 2 Balanced Secondary Actions */}
              <div className="mt-7 space-y-3">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-[52px] inline-flex items-center justify-center gap-2.5 rounded-full bg-[#0B426E] hover:bg-[#083559] text-white px-6 text-[13.5px] font-medium tracking-[0.02em] transition-colors active:scale-[0.99]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Konsultasi Karya Ini</span>
                </a>

                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    to="/appointment"
                    state={{
                      prefillSubject: `Private Viewing: ${item.name} (${activeFinishLabel})`,
                    }}
                    className="h-11 inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#0B426E]/18 hover:border-[#0B426E] text-[#0B426E] px-4 text-[12.5px] font-medium transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#1E88C7]" />
                    <span>Showroom Visit</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleAddToQuoteList}
                    disabled={!item.apiId}
                    className={`h-11 inline-flex items-center justify-center gap-2 rounded-full px-4 text-[12.5px] font-medium border transition-colors disabled:opacity-50 ${
                      addedToQuote
                        ? "bg-[#EAF4FA] border-[#1E88C7]/40 text-[#0B426E]"
                        : "bg-white border-[#0B426E]/18 hover:border-[#0B426E] text-[#0B426E]"
                    }`}
                  >
                    {addedToQuote ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#1E88C7]" />
                        <span>Di Keranjang</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5 text-[#1E88C7]" />
                        <span>Keranjang</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quiet Editorial Concierge Link */}
                <div className="pt-1.5 flex items-center justify-between flex-wrap gap-3 text-[12px] text-[#4B5E71]">
                  <button
                    type="button"
                    onClick={() =>
                      askConcierge({
                        text: `Saya tertarik dengan ${item.name}${item.code ? ` (${item.code})` : ""} warna ${activeFinishLabel}. Bisa jelaskan detail material, finishing, dan kustomisasinya?`,
                        item_slug: item.slug,
                        item_name: item.name,
                      })
                    }
                    className="inline-flex items-center gap-1.5 hover:text-[#0B426E] transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#1E88C7]" />
                    <span>Tanya LIVORA Concierge</span>
                  </button>
                </div>

                <p className="text-[11.5px] text-[#4B5E71]/80 pt-1 leading-relaxed">
                  Seluruh dimensi, material, dan warna dapat dikustomisasi bersama desainer LIVORA. Penawaran resmi disampaikan langsung oleh konsultan kami.
                </p>
              </div>

              {/* 6. Clean Collapsible Detail & Taxonomies Accordion */}
              <div className="mt-7 pt-5 border-t border-[#0B426E]/10">
                <button
                  type="button"
                  onClick={() => setShowProductDetails((v) => !v)}
                  className="w-full flex items-center justify-between text-left py-1 group"
                >
                  <span className="text-[11.5px] uppercase tracking-[0.2em] font-medium text-[#0B426E] group-hover:text-[#1E88C7] transition-colors">
                    Spesifikasi &amp; Kategori Lengkap
                  </span>
                  <motion.span
                    animate={{ rotate: showProductDetails ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex text-[#4B5E71]"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {showProductDetails && (
                    <motion.div
                      key="product-details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-4 text-[13.5px]">
                        {item.textures?.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#4B5E71]">
                              Tekstur &amp; Material
                            </p>
                            <p className="text-[#0B426E] mt-1">{item.textures.join(", ")}</p>
                          </div>
                        )}
                        {item.specs.weight && item.specs.weight !== "—" && (
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#4B5E71]">
                              Perkiraan Bobot
                            </p>
                            <p className="text-[#0B426E] mt-1">{item.specs.weight}</p>
                          </div>
                        )}
                        {hasTaxonomies && (
                          <div className="pt-1 flex flex-wrap gap-2">
                            {item.collection && (
                              <button
                                type="button"
                                onClick={() => navigate(`/collection/${item.collection!.slug}`)}
                                className="rounded-full bg-[#0B426E] text-white px-3.5 py-1 text-[11px] font-medium hover:bg-[#083559] transition-colors"
                              >
                                {item.collection.name} Collection
                              </button>
                            )}
                            {(item.themeRefs ?? []).map((t) => (
                              <button
                                key={`th-${t.id}`}
                                type="button"
                                onClick={() => navigate(`/furniture/theme/${t.slug}`)}
                                className="rounded-full bg-white border border-[#0B426E]/15 hover:border-[#1E88C7] text-[#0B426E] px-3 py-1 text-[11px] transition-colors"
                              >
                                {t.name}
                              </button>
                            ))}
                            {(item.categoryRefs ?? []).map((c) => (
                              <button
                                key={`cat-${c.id}`}
                                type="button"
                                onClick={() => navigate(`/furniture/category/${c.slug}`)}
                                className="rounded-full bg-white border border-[#0B426E]/15 hover:border-[#1E88C7] text-[#0B426E] px-3 py-1 text-[11px] transition-colors"
                              >
                                {c.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* GALLERY — interactive show more/less */}
        {galleryImages.length > 0 && (
          <section className="py-12 md:py-16 bg-white border-t border-[#0B426E]/8">
            <div className="container-livora">
              <div
                className="flex flex-col items-center gap-3"
                style={{ marginBottom: showGallery ? 32 : 0 }}
              >
                <p className="text-[10.5px] tracking-[0.3em] uppercase text-[#4B5E71]">
                  Gallery · {galleryImages.length} Foto
                </p>
                <button
                  type="button"
                  onClick={() => setShowGallery((v) => !v)}
                  className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#0B426E]/25 bg-[#F8F9FB] hover:bg-[#EAF4FA] text-[#0B426E] px-7 py-3 text-[11px] uppercase tracking-[0.22em] font-medium transition-colors"
                >
                  <span>{showGallery ? "Tutup Galeri" : "Lihat Galeri Lengkap"}</span>
                  <motion.span
                    animate={{ rotate: showGallery ? 180 : 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                </button>
              </div>

              <AnimatePresence initial={false}>
                {showGallery && (
                  <motion.div
                    key="gallery-grid"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                      {galleryImages.map((g, i) => (
                        <motion.figure
                          key={g.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.45, delay: i * 0.05 }}
                          onClick={() => {
                            const idx = lightboxImages.findIndex((x) => x.src === g.image);
                            openLightbox(idx >= 0 ? idx : 0);
                          }}
                          className="overflow-hidden rounded-2xl cursor-zoom-in group bg-[#EEF1F5]"
                        >
                          <img
                            src={g.image}
                            alt={g.alt_text ?? g.title ?? item.name}
                            className="w-full h-auto block object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        </motion.figure>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* LIFESTYLE — Furniture In Real Spaces */}
        {item.lifestyle && item.lifestyle.length > 0 && (
          <section className="py-14 md:py-20 bg-[#F8F9FB] border-t border-[#0B426E]/8">
            <div className="container-livora">
              <div className="text-center max-w-xl mx-auto mb-10 md:mb-14">
                <p className="text-[10.5px] uppercase tracking-[0.3em] text-[#1E88C7] mb-2">
                  Architectural Context
                </p>
                <h2 className="serif font-light text-3xl sm:text-4xl text-[#0B426E]">
                  Furniture In Real Spaces
                </h2>
                <p className="text-[13.5px] text-[#4B5E71] mt-2">
                  Inspirasi penataan interior dengan karakter ruang yang tenang dan presisi.
                </p>
              </div>
              <div className="flex flex-wrap gap-5 max-w-7xl mx-auto">
                {item.lifestyle.map((l) => {
                  const w =
                    l.layout_type === "full"
                      ? 100
                      : l.layout_type === "half"
                      ? 50
                      : l.width_percentage || 50;
                  return (
                    <figure
                      key={l.id}
                      className="overflow-hidden rounded-2xl group w-full md:w-[var(--lf-w)]"
                      style={{ ["--lf-w" as any]: `calc(${w}% - 1.25rem)` }}
                    >
                      <div className="overflow-hidden rounded-2xl bg-[#EEF1F5]">
                        <img
                          src={l.image}
                          alt={l.caption ?? ""}
                          className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      </div>
                      {l.caption && (
                        <figcaption className="text-xs text-[#4B5E71] mt-2.5 tracking-[0.03em]">
                          {l.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* STORY & CRAFTSMANSHIP CARDS */}
        {item.story &&
          (item.story.title || item.story.description || item.story.feature_image) && (
            <section className="py-14 md:py-20 bg-white border-t border-[#0B426E]/8">
              <div className="container-livora">
                <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14">
                  <p className="text-[10.5px] uppercase tracking-[0.3em] text-[#1E88C7] mb-2">
                    Craftsmanship Story
                  </p>
                  {item.story.title && (
                    <h2 className="serif font-light text-3xl sm:text-4xl text-[#0B426E] leading-tight">
                      {item.story.title}
                    </h2>
                  )}
                  {item.story.description && (
                    <p className="text-sm sm:text-[15px] text-[#4B5E71] mt-4 leading-relaxed">
                      {item.story.description}
                    </p>
                  )}
                </div>

                {item.story.feature_image && (
                  <div className="max-w-5xl mx-auto mb-10 rounded-3xl overflow-hidden bg-[#EEF1F5]">
                    <img
                      src={item.story.feature_image}
                      alt={item.story.title ?? item.name}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}

                {item.story.cards && item.story.cards.length > 0 && (
                  <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {item.story.cards.map((c) => (
                      <div
                        key={c.id}
                        className="p-6 md:p-7 rounded-2xl bg-[#F8F9FB] border border-[#0B426E]/8"
                      >
                        <p className="text-[10.5px] uppercase tracking-[0.18em] text-[#1E88C7] font-medium mb-2.5">
                          {c.icon ?? "Detail"}
                        </p>
                        <h3 className="serif text-xl text-[#0B426E] leading-snug mb-2">
                          {c.title}
                        </h3>
                        {c.description && (
                          <p className="text-[13px] text-[#4B5E71] leading-relaxed">
                            {c.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

        {/* RELATED / COLLECTION */}
        {related.length > 0 && (
          <section className="py-14 md:py-20 bg-[#F8F9FB] border-t border-[#0B426E]/8">
            <div className="container-livora">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10.5px] uppercase tracking-[0.28em] text-[#1E88C7] mb-1.5">
                    Curated Companion Pieces
                  </p>
                  <h2 className="serif font-light text-3xl sm:text-4xl text-[#0B426E]">
                    {item.collection
                      ? `Explore the ${item.collection.name} Collection`
                      : "You May Also Like"}
                  </h2>
                </div>
                <Link
                  to="/furniture"
                  className="text-xs uppercase tracking-[0.18em] text-[#0B426E] hover:text-[#1E88C7] font-medium transition-colors"
                >
                  Lihat Semua Koleksi →
                </Link>
              </div>

              <div
                data-lenis-prevent
                className="flex gap-5 sm:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-5 px-5 md:mx-0 md:px-0"
              >
                {related.map((r) => {
                  const targetHref = item.collection
                    ? `/collection/${item.collection.slug}/all?highlight=${r.slug}`
                    : `/items/${r.slug}${projectSlug ? `?from=${projectSlug}` : ""}`;
                  const rVariants = (r.variants ?? []).filter((v) => v.is_active !== false);
                  return (
                    <Link
                      key={r.slug}
                      to={targetHref}
                      className="group w-[225px] sm:w-[255px] shrink-0 snap-start flex flex-col"
                    >
                      <div
                        className="aspect-[4/5] w-full rounded-2xl overflow-hidden flex items-center justify-center p-5"
                        style={{
                          background:
                            "radial-gradient(circle at 50% 38%, #F6F8FA 0%, #EFF2F6 70%, #E9EEF3 100%)",
                        }}
                      >
                        {r.image ? (
                          <img
                            src={r.image}
                            alt={r.name}
                            loading="lazy"
                            className="w-full h-full object-contain drop-shadow-[0_16px_22px_rgba(11,66,110,0.10)] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                          />
                        ) : (
                          <ItemIllustration name={r.name} size={180} />
                        )}
                      </div>
                      <div className="pt-3 px-0.5">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[#4B5E71] truncate">
                          {r.type?.name || r.category || "Furniture"}
                        </p>
                        <p className="text-[14.5px] font-medium text-[#0B426E] group-hover:text-[#1E88C7] transition-colors truncate mt-0.5">
                          {r.name}
                        </p>
                        {rVariants.length > 0 && (
                          <div className="mt-2 flex items-center gap-1.5">
                            {rVariants.slice(0, 4).map((v) => (
                              <span
                                key={v.id}
                                className="w-3.5 h-3.5 rounded-full ring-1 ring-inset ring-black/15"
                                style={{ backgroundColor: resolveSwatchHex(v) }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <FurnitureShowroomBanner />
      </main>

      {/* SLIDE-OVER: Full Material & Finish Selector per Category */}
      <Sheet open={!!sheetCategory} onOpenChange={(o) => !o && setSheetCategory(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto overscroll-contain bg-[#F8F9FB]"
          data-lenis-prevent
        >
          <SheetHeader>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1E88C7] font-medium">
              Material Selection
            </p>
            <SheetTitle className="serif text-3xl font-light capitalize text-[#0B426E]">
              {sheetCategory ?? ""}
            </SheetTitle>
            <p className="text-xs text-[#4B5E71]">
              Pilih material atau warna untuk melihat pratinjau langsung pada furnitur.
            </p>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3.5 mt-6">
            {(sheetCategory ? variantGroups[sheetCategory] ?? [] : []).map((v) => (
              <VariantCard
                key={v.id}
                v={v}
                active={v.id === activeVariantId}
                onClick={() => {
                  handleSelectVariant(v);
                  setSheetCategory(null);
                }}
                showDetails
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <ImageLightbox
        open={lightboxOpen}
        images={lightboxImages}
        startIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />

      <Footer />
    </div>
  );
};

function VariantCard({
  v,
  active,
  onClick,
  showDetails = false,
}: {
  v: FurnitureVariant;
  active: boolean;
  onClick: () => void;
  showDetails?: boolean;
}) {
  const hex = resolveSwatchHex(v);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl p-3 border transition-all hover:-translate-y-0.5 ${
        active
          ? "border-[#0B426E] bg-[#EAF4FA]/60"
          : "border-[#0B426E]/12 bg-white hover:border-[#1E88C7]"
      }`}
    >
      <div
        className="w-full aspect-square rounded-xl overflow-hidden mb-2.5 ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: hex }}
      >
        {v.preview_image && (
          <img
            src={v.preview_image}
            alt={v.variant_name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#1E88C7] font-medium">
        {v.category}
      </p>
      <p className="text-[13.5px] font-medium text-[#0B426E] mt-0.5 leading-snug">
        {v.variant_name}
      </p>
      {v.color_name && v.color_name !== v.variant_name && (
        <p className="text-[11px] text-[#4B5E71] mt-0.5">{v.color_name}</p>
      )}
      {showDetails && v.material_name && (
        <p className="text-[11px] text-[#4B5E71] mt-0.5">{v.material_name}</p>
      )}
    </button>
  );
}

export default ItemDetail;
