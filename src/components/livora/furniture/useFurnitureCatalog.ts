import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { resolveSwatchHex, getVariantDisplayLabel } from "@/lib/furnitureColors";
import type { FurnitureFinishOption, FurnitureShowcaseItem } from "./types";

import sofaAsset from "@/assets/landing-furniture/sofa.webp";
import chairAsset from "@/assets/landing-furniture/chair.webp";
import tableAsset from "@/assets/landing-furniture/table.webp";
import bedAsset from "@/assets/landing-furniture/bed.webp";
import accAsset from "@/assets/landing-furniture/accecories.webp";
import newArrivalAsset from "@/assets/landing-furniture/new-arrival.webp";

export interface FurnitureCategoryTab {
  slug: string;
  name: string;
}

const DEFAULT_FINISH_SETS: Record<string, FurnitureFinishOption[]> = {
  seating: [
    { id: "def-oat", name: "Oatmeal Linen", hex: "#D9D2C5", category: "fabric", material: "Belgian Linen", isDefault: true },
    { id: "def-ivory", name: "Ivory Bouclé", hex: "#F2EFE8", category: "fabric", material: "Textured Bouclé" },
    { id: "def-slate", name: "Architectural Slate", hex: "#5C6B79", category: "fabric", material: "Wool Blend" },
  ],
  wood: [
    { id: "def-walnut", name: "American Walnut", hex: "#5C4334", category: "wood", material: "Solid Walnut", isDefault: true },
    { id: "def-oak", name: "Natural White Oak", hex: "#CBB08D", category: "wood", material: "White Oak" },
    { id: "def-espresso", name: "Smoked Oak", hex: "#3B312B", category: "wood", material: "Smoked Oak" },
  ],
  stone: [
    { id: "def-trav", name: "Roman Travertine", hex: "#DDD5C7", category: "marble", material: "Honed Travertine", isDefault: true },
    { id: "def-cala", name: "Calacatta Viola", hex: "#EAE7E2", category: "marble", material: "Italian Marble" },
    { id: "def-char", name: "Pietra Grey", hex: "#4D5054", category: "marble", material: "Natural Stone" },
  ],
};

function defaultFinishesForCategory(category: string): FurnitureFinishOption[] {
  const c = category.toLowerCase();
  if (/(sofa|chair|seat|lounge|bed|ottoman|bench|kursi|kamar)/.test(c)) {
    return DEFAULT_FINISH_SETS.seating;
  }
  if (/(table|meja|console|coffee|marble|stone)/.test(c)) {
    return DEFAULT_FINISH_SETS.stone;
  }
  return DEFAULT_FINISH_SETS.wood;
}

function cleanText(val?: string | null): string {
  const s = (val ?? "").trim();
  return s && s !== "—" && s !== "-" ? s : "";
}

function formatDimensions(w?: number | null, d?: number | null, h?: number | null): string {
  const parts = [w, d, h].filter((n): n is number => typeof n === "number" && !Number.isNaN(n) && n > 0);
  if (parts.length === 3) {
    return `${Math.round(w!)} × ${Math.round(d!)} × ${Math.round(h!)} cm`;
  }
  if (parts.length === 2) {
    return `${Math.round(parts[0])} × ${Math.round(parts[1])} cm`;
  }
  return "Bespoke Dimensions";
}

function formatAvailability(raw?: string | null): { availability: string; leadTime: string } {
  const v = (raw || "").toLowerCase();
  if (v === "available" || v === "ready" || v === "in_stock") {
    return { availability: "Available · Showroom Ready", leadTime: "Ready Stock / 2–4 Weeks Custom Finish" };
  }
  if (v === "unavailable") {
    return { availability: "By Private Commission", leadTime: "8–10 Weeks Bespoke Production" };
  }
  return { availability: "Made to Order", leadTime: "6–8 Weeks Architectural Craftsmanship" };
}

function sanitizeEditorialTag(rawTag?: string | null, collectionName?: string | null): string | null {
  const t = cleanText(rawTag);
  // Jangan tampilkan tag diskon/harga persen/rupiah pada showcase arsitektural
  if (t && !/(%|off|rp|idr|hemat|diskon|promo|sale)/i.test(t)) {
    return t;
  }
  const col = cleanText(collectionName);
  if (col) return col;
  return null;
}

function mapRawApiItem(it: any): FurnitureShowcaseItem {
  const categoryName = cleanText(it.type?.name) || "Furniture";
  const categorySlug = cleanText(it.type?.slug) || categoryName.toLowerCase().replace(/\s+/g, "-");
  const w = it.width_cm != null ? Number(it.width_cm) : null;
  const d = it.depth_cm != null ? Number(it.depth_cm) : null;
  const h = it.height_cm != null ? Number(it.height_cm) : null;

  const activeVariants = ((it.variants ?? []) as any[])
    .filter((v) => v.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const finishes: FurnitureFinishOption[] =
    activeVariants.length > 0
      ? activeVariants.map((v) => ({
          id: v.id,
          name: getVariantDisplayLabel(v) || "Signature Finish",
          hex: resolveSwatchHex(v),
          category: v.category || "fabric",
          material: cleanText(v.material_name) || null,
          previewImage: v.preview_image ? imgUrl(v.preview_image) : null,
          furnitureImage: v.furniture_image ? imgUrl(v.furniture_image) : null,
          isDefault: Boolean(v.is_default),
        }))
      : defaultFinishesForCategory(categoryName);

  const primaryMaterial =
    cleanText(it.material_detail) ||
    cleanText(it.texture) ||
    cleanText(it.finish) ||
    finishes[0]?.material ||
    finishes[0]?.name ||
    "Curated Natural Materials";

  const { availability, leadTime } = formatAvailability(it.availability);

  return {
    id: it.id,
    apiId: it.id,
    slug: it.slug,
    name: it.title || "Livora Piece",
    code: cleanText(it.code) || `LVR-${String(it.id).padStart(3, "0")}`,
    category: categoryName,
    categorySlug,
    series: cleanText(it.collection?.name) || null,
    editorialTag: sanitizeEditorialTag(it.promo_badge_text, it.collection?.name),
    image: it.image ? imgUrl(it.image) : null,
    dimensionsLabel: formatDimensions(w, d, h),
    dimensionsDetail: { width: w, depth: d, height: h },
    materialLabel: primaryMaterial.split(",")[0].trim(),
    finishLabel: cleanText(it.finish) || null,
    availabilityLabel: availability,
    leadTimeLabel: leadTime,
    description:
      cleanText(it.description) ||
      `Dirancang dengan proporsi arsitektural yang tenang oleh studio LIVORA. Tersedia dalam pilihan material dan dimensi khusus sesuai karakter ruang Anda.`,
    finishes,
  };
}

/**
 * Koleksi showcase kurasi fallback (20 karya — mengisi grid 4x5 & 5x4 presisi)
 * hanya aktif jika backend /items belum berisi data atau sedang offline.
 */
const FALLBACK_SHOWCASE_ITEMS: FurnitureShowcaseItem[] = [
  {
    id: "mock-1",
    slug: "toscana-series-tv-cabinet",
    name: "Toscana Series TV Cabinet",
    code: "LVR-TS01",
    category: "Storage & Media",
    categorySlug: "storage-media",
    series: "Toscana Series",
    editorialTag: "Signature",
    image: newArrivalAsset,
    dimensionsLabel: "240 × 48 × 52 cm",
    dimensionsDetail: { width: 240, depth: 48, height: 52 },
    materialLabel: "Smoked Oak & Travertine",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "6–8 Weeks Architectural Craftsmanship",
    description: "Konsol media berprofil rendah dengan panel fluted solid oak dan permukaan honed travertine yang menyatu harmonis pada ruang keluarga kontemporer.",
    finishes: DEFAULT_FINISH_SETS.wood,
  },
  {
    id: "mock-2",
    slug: "pienza-bedside-table",
    name: "Pienza Bedside Table",
    code: "LVR-PZ02",
    category: "Bedroom",
    categorySlug: "bedroom",
    series: "Pienza Series",
    editorialTag: "Signature",
    image: bedAsset,
    dimensionsLabel: "58 × 44 × 50 cm",
    dimensionsDetail: { width: 58, depth: 44, height: 50 },
    materialLabel: "Natural White Oak & Leather",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "4–6 Weeks Architectural Craftsmanship",
    description: "Meja nakas minimalis berdetail lengkung halus dengan laci soft-close berlapis kulit nabati dan aksen tarikan kuningan satin.",
    finishes: DEFAULT_FINISH_SETS.wood,
  },
  {
    id: "mock-3",
    slug: "velluto-sculptural-sofa",
    name: "Velluto Sculptural Sofa",
    code: "LVR-VL03",
    category: "Living",
    categorySlug: "living",
    series: "Atelier Collection",
    editorialTag: "Ikonik",
    image: sofaAsset,
    dimensionsLabel: "280 × 104 × 74 cm",
    dimensionsDetail: { width: 280, depth: 104, height: 74 },
    materialLabel: "Oatmeal Belgian Linen",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "6–8 Weeks Architectural Craftsmanship",
    description: "Sofa modular bervolume rendah dengan dudukan bulu angsa berlapis dan garis jahitan arsitektural yang presisi.",
    finishes: DEFAULT_FINISH_SETS.seating,
  },
  {
    id: "mock-4",
    slug: "koma-lounge-chair",
    name: "Koma Lounge Chair",
    code: "LVR-KM04",
    category: "Living",
    categorySlug: "living",
    series: "Atelier Collection",
    editorialTag: "Ikonik",
    image: chairAsset,
    dimensionsLabel: "78 × 82 × 76 cm",
    dimensionsDetail: { width: 78, depth: 82, height: 76 },
    materialLabel: "Ivory Bouclé & Solid Ash",
    availabilityLabel: "Available · Showroom Ready",
    leadTimeLabel: "Ready Stock / 3–4 Weeks Custom Finish",
    description: "Kursi santai bersandar melengkung ergonomis dalam balutan bouclé tekstur halus dan rangka kayu solid.",
    finishes: DEFAULT_FINISH_SETS.seating,
  },
  {
    id: "mock-5",
    slug: "alba-travertine-coffee-table",
    name: "Alba Travertine Coffee Table",
    code: "LVR-AL05",
    category: "Living",
    categorySlug: "living",
    series: "Pietra Series",
    editorialTag: "Edisi Terbatas",
    image: tableAsset,
    dimensionsLabel: "140 × 85 × 34 cm",
    dimensionsDetail: { width: 140, depth: 85, height: 34 },
    materialLabel: "Roman Travertine",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "6–8 Weeks Architectural Craftsmanship",
    description: "Meja kopi monolitik dari batu travertine alam Italia dengan finishing honed matte yang menonjolkan urat mineral autentik.",
    finishes: DEFAULT_FINISH_SETS.stone,
  },
  {
    id: "mock-6",
    slug: "verona-architectural-dining-table",
    name: "Verona Architectural Dining Table",
    code: "LVR-VR06",
    category: "Dining",
    categorySlug: "dining",
    series: "Verona Series",
    editorialTag: "Signature",
    image: tableAsset,
    dimensionsLabel: "260 × 105 × 75 cm",
    dimensionsDetail: { width: 260, depth: 105, height: 75 },
    materialLabel: "American Walnut & Honed Stone",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "6–8 Weeks Architectural Craftsmanship",
    description: "Meja makan berkapasitas 8–10 kursi dengan tumpuan kolom pahatan presisi dan tepi bevel tipis yang elegan.",
    finishes: DEFAULT_FINISH_SETS.wood,
  },
  {
    id: "mock-7",
    slug: "solis-alabaster-pendant",
    name: "Solis Alabaster Pendant",
    code: "LVR-SL07",
    category: "Lighting & Accent",
    categorySlug: "lighting-accent",
    series: "Luce Series",
    editorialTag: "Edisi Terbatas",
    image: accAsset,
    dimensionsLabel: "Ø 48 × 32 cm",
    dimensionsDetail: { width: 48, depth: 48, height: 32 },
    materialLabel: "Spanish Alabaster & Brushed Brass",
    availabilityLabel: "Available · Showroom Ready",
    leadTimeLabel: "Ready Stock / 3 Weeks Custom Drop",
    description: "Lampu gantung dari piringan batu alabaster alami yang memancarkan pendar cahaya hangat dan lembut ke seluruh ruang makan.",
    finishes: DEFAULT_FINISH_SETS.stone,
  },
  {
    id: "mock-8",
    slug: "siena-platform-bed",
    name: "Siena Upholstered Bed",
    code: "LVR-SN08",
    category: "Bedroom",
    categorySlug: "bedroom",
    series: "Siena Series",
    editorialTag: "Ikonik",
    image: bedAsset,
    dimensionsLabel: "212 × 230 × 108 cm",
    dimensionsDetail: { width: 212, depth: 230, height: 108 },
    materialLabel: "Warm Linen & Smoked Oak",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "6–8 Weeks Architectural Craftsmanship",
    description: "Ranjang platform rendah dengan sandaran kepala berlapis kain linen Belgian yang empuk dan bingkai kayu solid tersembunyi.",
    finishes: DEFAULT_FINISH_SETS.seating,
  },
  {
    id: "mock-9",
    slug: "brera-fluted-credenza",
    name: "Brera Fluted Credenza",
    code: "LVR-BR09",
    category: "Storage & Media",
    categorySlug: "storage-media",
    series: "Brera Series",
    editorialTag: "Signature",
    image: newArrivalAsset,
    dimensionsLabel: "200 × 46 × 78 cm",
    dimensionsDetail: { width: 200, depth: 46, height: 78 },
    materialLabel: "American Walnut & Bronze",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "6–8 Weeks Architectural Craftsmanship",
    description: "Credenza penyimpanan bergaris vertikal halus dengan kompartemen terorganisir dan detail kaki logam perunggu matte.",
    finishes: DEFAULT_FINISH_SETS.wood,
  },
  {
    id: "mock-10",
    slug: "cortina-dining-chair",
    name: "Cortina Dining Chair",
    code: "LVR-CT10",
    category: "Dining",
    categorySlug: "dining",
    series: "Cortina Series",
    editorialTag: null,
    image: chairAsset,
    dimensionsLabel: "54 × 56 × 79 cm",
    dimensionsDetail: { width: 54, depth: 56, height: 79 },
    materialLabel: "Full-Grain Leather & Ash",
    availabilityLabel: "Available · Showroom Ready",
    leadTimeLabel: "Ready Stock / 3–4 Weeks Custom Finish",
    description: "Kursi makan dengan sandaran melengkung menyangga punggung secara alami untuk kenyamanan percakapan panjang di meja makan.",
    finishes: DEFAULT_FINISH_SETS.seating,
  },
  {
    id: "mock-11",
    slug: "como-modular-sectional",
    name: "Como Modular Sectional",
    code: "LVR-CM11",
    category: "Living",
    categorySlug: "living",
    series: "Como Series",
    editorialTag: "Signature",
    image: sofaAsset,
    dimensionsLabel: "340 × 175 × 72 cm",
    dimensionsDetail: { width: 340, depth: 175, height: 72 },
    materialLabel: "Performance Bouclé",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "6–8 Weeks Architectural Craftsmanship",
    description: "Sistem sofa sectional fleksibel yang dapat dikustomisasi mengikuti denah ruang tamu terbuka maupun hunian penthouse.",
    finishes: DEFAULT_FINISH_SETS.seating,
  },
  {
    id: "mock-12",
    slug: "lucca-console-table",
    name: "Lucca Sculpted Console",
    code: "LVR-LC12",
    category: "Storage & Media",
    categorySlug: "storage-media",
    series: "Lucca Series",
    editorialTag: null,
    image: tableAsset,
    dimensionsLabel: "160 × 40 × 80 cm",
    dimensionsDetail: { width: 160, depth: 40, height: 80 },
    materialLabel: "Honed Limestone & Oak",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "5–7 Weeks Architectural Craftsmanship",
    description: "Meja konsol foyer berkarakter arsitektural yang menciptakan kesan pertama penuh ketenangan saat memasuki hunian.",
    finishes: DEFAULT_FINISH_SETS.stone,
  },
  {
    id: "mock-13",
    slug: "modena-bar-cabinet",
    name: "Modena Vitrine Cabinet",
    code: "LVR-MD13",
    category: "Storage & Media",
    categorySlug: "storage-media",
    series: "Modena Series",
    editorialTag: "Edisi Terbatas",
    image: newArrivalAsset,
    dimensionsLabel: "110 × 45 × 175 cm",
    dimensionsDetail: { width: 110, depth: 45, height: 175 },
    materialLabel: "Smoked Oak & Fluted Glass",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "8 Weeks Architectural Craftsmanship",
    description: "Lemari pajangan dengan pintu kaca beralur dan pencahayaan interior LED hangat terintegrasi.",
    finishes: DEFAULT_FINISH_SETS.wood,
  },
  {
    id: "mock-14",
    slug: "bellagio-accent-armchair",
    name: "Bellagio Accent Armchair",
    code: "LVR-BL14",
    category: "Living",
    categorySlug: "living",
    series: "Bellagio Series",
    editorialTag: null,
    image: chairAsset,
    dimensionsLabel: "74 × 78 × 74 cm",
    dimensionsDetail: { width: 74, depth: 78, height: 74 },
    materialLabel: "Woven Linen & Walnut",
    availabilityLabel: "Available · Showroom Ready",
    leadTimeLabel: "Ready Stock / 3 Weeks Custom Finish",
    description: "Kursi aksen berbingkai kayu walnut ekspos dengan proporsi ringan yang ideal untuk sudut baca maupun ruang keluarga.",
    finishes: DEFAULT_FINISH_SETS.seating,
  },
  {
    id: "mock-15",
    slug: "ravenna-round-dining-table",
    name: "Ravenna Round Dining Table",
    code: "LVR-RV15",
    category: "Dining",
    categorySlug: "dining",
    series: "Ravenna Series",
    editorialTag: "Ikonik",
    image: tableAsset,
    dimensionsLabel: "Ø 150 × 75 cm",
    dimensionsDetail: { width: 150, depth: 150, height: 75 },
    materialLabel: "Calacatta Marble & Oak",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "6–8 Weeks Architectural Craftsmanship",
    description: "Meja makan bundar berpermukaan marmer Calacatta yang mempererat kehangatan setiap momen bersantap.",
    finishes: DEFAULT_FINISH_SETS.stone,
  },
  {
    id: "mock-16",
    slug: "aurelia-floor-lamp",
    name: "Aurelia Architectural Floor Lamp",
    code: "LVR-AU16",
    category: "Lighting & Accent",
    categorySlug: "lighting-accent",
    series: "Luce Series",
    editorialTag: null,
    image: accAsset,
    dimensionsLabel: "36 × 36 × 168 cm",
    dimensionsDetail: { width: 36, depth: 36, height: 168 },
    materialLabel: "Travertine Base & Linen Shade",
    availabilityLabel: "Available · Showroom Ready",
    leadTimeLabel: "Ready Stock",
    description: "Lampu lantai bertumpuan silinder travertine solid dengan kap linen halus yang meredam silau secara elegan.",
    finishes: DEFAULT_FINISH_SETS.stone,
  },
  {
    id: "mock-17",
    slug: "parma-bedroom-bench",
    name: "Parma End-of-Bed Bench",
    code: "LVR-PM17",
    category: "Bedroom",
    categorySlug: "bedroom",
    series: "Pienza Series",
    editorialTag: null,
    image: bedAsset,
    dimensionsLabel: "150 × 45 × 44 cm",
    dimensionsDetail: { width: 150, depth: 45, height: 44 },
    materialLabel: "Ivory Bouclé & White Oak",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "4–6 Weeks Architectural Craftsmanship",
    description: "Bangku ujung ranjang dengan detail bantalan lembut dan siluet kaki ramping yang menyempurnakan kamar utama.",
    finishes: DEFAULT_FINISH_SETS.seating,
  },
  {
    id: "mock-18",
    slug: "amalfi-travertine-plinth",
    name: "Amalfi Monolith Side Table",
    code: "LVR-AM18",
    category: "Lighting & Accent",
    categorySlug: "lighting-accent",
    series: "Pietra Series",
    editorialTag: "Signature",
    image: accAsset,
    dimensionsLabel: "40 × 40 × 48 cm",
    dimensionsDetail: { width: 40, depth: 40, height: 48 },
    materialLabel: "Honed Roman Travertine",
    availabilityLabel: "Available · Showroom Ready",
    leadTimeLabel: "Ready Stock",
    description: "Meja samping pahatan geometris dari batu alam murni yang tampil menawan sebagai aksen fungsional di sisi sofa.",
    finishes: DEFAULT_FINISH_SETS.stone,
  },
  {
    id: "mock-19",
    slug: "novara-dressing-console",
    name: "Novara Vanity & Mirror Desk",
    code: "LVR-NV19",
    category: "Bedroom",
    categorySlug: "bedroom",
    series: "Pienza Series",
    editorialTag: null,
    image: bedAsset,
    dimensionsLabel: "130 × 48 × 76 cm",
    dimensionsDetail: { width: 130, depth: 48, height: 76 },
    materialLabel: "Natural White Oak & Satin Brass",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "5–7 Weeks Architectural Craftsmanship",
    description: "Meja rias minimalis dengan kompartemen tersembunyi berlapis suede dan proporsi ringan untuk kamar tidur modern.",
    finishes: DEFAULT_FINISH_SETS.wood,
  },
  {
    id: "mock-20",
    slug: "treviso-counter-stool",
    name: "Treviso Architectural Bar Stool",
    code: "LVR-TR20",
    category: "Dining",
    categorySlug: "dining",
    series: "Cortina Series",
    editorialTag: null,
    image: chairAsset,
    dimensionsLabel: "48 × 50 × 94 cm",
    dimensionsDetail: { width: 48, depth: 50, height: 94 },
    materialLabel: "Saddle Leather & Smoked Oak",
    availabilityLabel: "Made to Order",
    leadTimeLabel: "4–6 Weeks Architectural Craftsmanship",
    description: "Kursi pantry berketinggian ideal untuk kitchen island marmer dengan pijakan kaki logam matte tahan lama.",
    finishes: DEFAULT_FINISH_SETS.seating,
  },
];

export function useFurnitureCatalog() {
  const [items, setItems] = useState<FurnitureShowcaseItem[]>([]);
  const [categories, setCategories] = useState<FurnitureCategoryTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([
      api.get<any[]>("/items").then((r) => r.data ?? []).catch(() => null),
      api.get<FurnitureCategoryTab[]>("/taxonomies/furniture-types").then((r) => r.data ?? []).catch(() => []),
    ])
      .then(([rawItems, rawTypes]) => {
        if (!alive) return;

        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const mapped = rawItems.map(mapRawApiItem);
          setItems(mapped);
          setUsingFallback(false);

          if (Array.isArray(rawTypes) && rawTypes.length > 0) {
            setCategories(
              rawTypes.map((t) => ({
                slug: t.slug,
                name: t.name,
              })),
            );
          } else {
            const uniq = new Map<string, string>();
            mapped.forEach((m) => uniq.set(m.categorySlug, m.category));
            setCategories(Array.from(uniq.entries()).map(([slug, name]) => ({ slug, name })));
          }
        } else {
          setItems(FALLBACK_SHOWCASE_ITEMS);
          setUsingFallback(true);
          setCategories([
            { slug: "living", name: "Living" },
            { slug: "dining", name: "Dining" },
            { slug: "bedroom", name: "Bedroom" },
            { slug: "storage-media", name: "Storage & Media" },
            { slug: "lighting-accent", name: "Lighting & Accent" },
          ]);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { items, categories, loading, usingFallback };
}
