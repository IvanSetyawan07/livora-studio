import type { ThemeBanner } from "@/lib/themeBanners";
import type { ThemeThumbnail } from "@/lib/themeThumbnails";

import sofaAsset from "@/assets/landing-furniture/sofa.webp";
import chairAsset from "@/assets/landing-furniture/chair.webp";
import tableAsset from "@/assets/landing-furniture/table.webp";
import bedAsset from "@/assets/landing-furniture/bed.webp";
import accessoriesAsset from "@/assets/landing-furniture/accecories.webp";
import newArrivalAsset from "@/assets/landing-furniture/new-arrival.webp";

import sofaAssetSm from "@/assets/_opt/fur-sofa-600.webp";
import chairAssetSm from "@/assets/_opt/fur-chair-600.webp";
import tableAssetSm from "@/assets/_opt/fur-table-600.webp";
import bedAssetSm from "@/assets/_opt/fur-bed-600.webp";
import accessoriesAssetSm from "@/assets/_opt/fur-accecories-600.webp";
import newArrivalAssetSm from "@/assets/_opt/fur-new-arrival-600.webp";

export interface DefaultFurnitureCategoryMeta {
  name: string;
  slug: string;
  tagline: string;
  image: string;
  imageSm: string;
  order: number;
}

export const DEFAULT_FURNITURE_CATEGORIES: DefaultFurnitureCategoryMeta[] = [
  {
    name: "Sofa",
    slug: "sofa",
    tagline: "Generous silhouettes built for slow living.",
    image: sofaAsset,
    imageSm: sofaAssetSm,
    order: 1,
  },
  {
    name: "Chair",
    slug: "chair",
    tagline: "Sculpted seating for quiet moments.",
    image: chairAsset,
    imageSm: chairAssetSm,
    order: 2,
  },
  {
    name: "Table",
    slug: "table",
    tagline: "Considered surfaces in stone, brass, and wood.",
    image: tableAsset,
    imageSm: tableAssetSm,
    order: 3,
  },
  {
    name: "Bed",
    slug: "bed",
    tagline: "Restful architectural proportions for private sanctuaries.",
    image: bedAsset,
    imageSm: bedAssetSm,
    order: 4,
  },
  {
    name: "Accessories",
    slug: "accessories",
    tagline: "Tactile objects and lighting that complete the room.",
    image: accessoriesAsset,
    imageSm: accessoriesAssetSm,
    order: 5,
  },
];

const SINGULAR_ALIAS: Record<string, string> = {
  sofas: "sofa",
  sofa: "sofa",
  chairs: "chair",
  chair: "chair",
  seating: "chair",
  tables: "table",
  table: "table",
  beds: "bed",
  bed: "bed",
  bedroom: "bed",
  accessories: "accessories",
  accessory: "accessories",
  accecories: "accessories",
  "new-arrivals": "new-arrival",
  "new-arrival": "new-arrival",
  "new arrivals": "new-arrival",
};

/**
 * Normalizes category slugs and display names across singular/plural variants
 * (e.g. "Sofas" -> "sofa", "Chairs" -> "chair", "Tables" -> "table").
 */
export function normalizeCategoryKey(value?: string | null): string {
  const clean = (value ?? "").toLowerCase().trim();
  if (!clean) return "";
  if (SINGULAR_ALIAS[clean]) return SINGULAR_ALIAS[clean];
  if (clean.endsWith("ies")) return clean;
  if (clean.endsWith("s") && clean.length > 3) {
    return SINGULAR_ALIAS[clean.slice(0, -1)] ?? clean.slice(0, -1);
  }
  return clean;
}

export function categoriesMatch(
  a?: string | null,
  b?: string | null,
): boolean {
  const na = normalizeCategoryKey(a);
  const nb = normalizeCategoryKey(b);
  if (!na || !nb) return false;
  return na === nb;
}

export function getFallbackCategoryMeta(
  nameOrSlug?: string | null,
): DefaultFurnitureCategoryMeta | null {
  const key = normalizeCategoryKey(nameOrSlug);
  if (!key) return null;

  if (key === "sofa" || key.includes("sofa") || key === "living") {
    return DEFAULT_FURNITURE_CATEGORIES[0];
  }
  if (key === "chair" || key.includes("chair") || key === "dining") {
    return DEFAULT_FURNITURE_CATEGORIES[1];
  }
  if (
    key === "table" ||
    key.includes("table") ||
    key.includes("desk") ||
    key.includes("console") ||
    key === "storage-media"
  ) {
    return DEFAULT_FURNITURE_CATEGORIES[2];
  }
  if (key === "bed" || key.includes("bed")) {
    return DEFAULT_FURNITURE_CATEGORIES[3];
  }
  if (
    key === "accessories" ||
    key.includes("accessor") ||
    key.includes("accec") ||
    key.includes("light") ||
    key.includes("decor")
  ) {
    return DEFAULT_FURNITURE_CATEGORIES[4];
  }
  if (key === "new-arrival") {
    return {
      name: "New Arrivals",
      slug: "new-arrivals",
      tagline: "Freshly crafted pieces from the studio.",
      image: newArrivalAsset,
      imageSm: newArrivalAssetSm,
      order: 0,
    };
  }
  return null;
}

export function getFallbackCategoryImage(nameOrSlug?: string | null): string {
  return getFallbackCategoryMeta(nameOrSlug)?.image ?? sofaAsset;
}

export function getFallbackCategoryTagline(name?: string | null): string {
  const meta = getFallbackCategoryMeta(name);
  if (meta) return meta.tagline;
  const label = (name || "furniture").toLowerCase();
  return `Curated ${label} pieces in our permanent collection.`;
}

/**
 * Looks up Admin's `Banner Dalam Kategori` entries with exact, case-insensitive,
 * and singular/plural tolerance across category name & slug.
 */
export function lookupCategoryBanners(
  store: Record<string, ThemeBanner[]>,
  categoryName?: string | null,
  categorySlug?: string | null,
): ThemeBanner[] {
  const candidates = [categoryName, categorySlug].filter(
    (c): c is string => Boolean(c && c.trim()),
  );
  for (const c of candidates) {
    if (store[c]?.length) return store[c];
  }

  const keys = Object.keys(store);
  for (const c of candidates) {
    const lower = c.toLowerCase();
    const hit = keys.find(
      (k) => k.toLowerCase() === lower && (store[k]?.length ?? 0) > 0,
    );
    if (hit) return store[hit];
  }

  for (const c of candidates) {
    const hit = keys.find(
      (k) => categoriesMatch(k, c) && (store[k]?.length ?? 0) > 0,
    );
    if (hit) return store[hit];
  }

  return [];
}

/**
 * Looks up Admin's `Thumbnail Kartu` image with exact, case-insensitive,
 * and singular/plural tolerance across category name & slug.
 */
export function lookupCategoryThumbnail(
  thumbs: Record<string, ThemeThumbnail>,
  categoryName?: string | null,
  categorySlug?: string | null,
): string | undefined {
  const candidates = [categoryName, categorySlug].filter(
    (c): c is string => Boolean(c && c.trim()),
  );
  for (const c of candidates) {
    if (thumbs[c]?.image) return thumbs[c].image;
  }

  const keys = Object.keys(thumbs);
  for (const c of candidates) {
    const lower = c.toLowerCase();
    const hit = keys.find(
      (k) => k.toLowerCase() === lower && Boolean(thumbs[k]?.image),
    );
    if (hit) return thumbs[hit].image;
  }

  for (const c of candidates) {
    const hit = keys.find(
      (k) => categoriesMatch(k, c) && Boolean(thumbs[k]?.image),
    );
    if (hit) return thumbs[hit].image;
  }

  return undefined;
}

/**
 * Semantic fallback matcher ONLY used when backend /items is offline/empty
 * and FALLBACK_SHOWCASE_ITEMS (Living/Dining/Bedroom/...) are active.
 */
export function matchesFallbackItemCategory(
  item: { name: string; category: string; categorySlug: string },
  targetSlugOrName: string,
): boolean {
  const key = normalizeCategoryKey(targetSlugOrName);
  const name = item.name.toLowerCase();
  const cat = `${item.category} ${item.categorySlug}`.toLowerCase();

  if (key === "sofa") {
    return name.includes("sofa") || name.includes("sectional");
  }
  if (key === "chair") {
    return (
      name.includes("chair") ||
      name.includes("stool") ||
      name.includes("bench")
    );
  }
  if (key === "table") {
    return (
      name.includes("table") ||
      name.includes("console") ||
      name.includes("desk") ||
      name.includes("plinth")
    );
  }
  if (key === "bed") {
    return cat.includes("bed") || name.includes("bed");
  }
  if (key === "accessories") {
    return (
      cat.includes("light") ||
      cat.includes("accent") ||
      cat.includes("storage") ||
      name.includes("lamp") ||
      name.includes("pendant") ||
      name.includes("cabinet") ||
      name.includes("credenza")
    );
  }
  return name.includes(key) || cat.includes(key);
}
