import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { items as staticItems, getItemBySlug as getStaticItem, type Item } from "@/data/items";

const itemCache = new Map<string, RichItem>();
export interface FurnitureVariant {
  id: number;
  item_id: number;
  variant_name: string;
  category: "fabric" | "leather" | "wood" | "metal" | "marble" | "other";
  color_name?: string | null;
  color_code?: string | null;       // NEW — hex color fallback when no swatch image
  material_name?: string | null;
  preview_image?: string | null;    // swatch image
  furniture_image?: string | null;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  is_default?: boolean;             // NEW — auto-selected on page load
  gallery?: GalleryImage[];
}

export interface GalleryImage {
  id: number;
  item_id: number;
  variant_id?: number | null;
  image: string;
  title?: string | null;
  alt_text?: string | null;
  sort_order: number;
}

export interface LifestyleImage {
  id: number;
  item_id: number;
  image: string;
  caption?: string | null;
  layout_type: "full" | "half" | "masonry" | "custom";
  width_percentage: number;
  sort_order: number;
}

export interface StoryCard {
  id: number;
  story_id: number;
  title: string;
  description?: string | null;
  icon?: string | null;
  sort_order: number;
}

export interface FurnitureStory {
  id: number;
  item_id: number;
  title?: string | null;
  description?: string | null;
  feature_image?: string | null;
  cards?: StoryCard[];
}

export interface CollectionRef {
  id: number;
  name: string;
  slug: string;
}

interface ApiItem {
  id: number;
  slug: string;
  title: string;
  code?: string | null;
  texture?: string | null;
  finish?: string | null;
  availability?: string | null;
  description?: string | null;
  image?: string | null;
  price?: number | null;
  original_price?: number | null;
  discount_type?: "PERCENTAGE" | "FIXED_AMOUNT" | null;
  discount_value?: number | null;
  final_price?: number | null;
  is_on_promo?: boolean;
  promo_badge_text?: string | null;
  type?: { id: number; name: string; slug: string } | null;
  collection?: CollectionRef | null;
  themes?: { id: number; name: string; slug: string }[];
  categories?: { id: number; name: string; slug: string }[];
  variants?: FurnitureVariant[];
  gallery?: GalleryImage[];
  lifestyle?: LifestyleImage[];
  story?: FurnitureStory | null;
  related?: ApiItem[];
}

export interface RichItem extends Item {
  id?: number;
  type?: { id: number; name: string; slug: string } | null;
  type_id?: number | null;
  collection?: CollectionRef | null;
  themeRefs?: { id: number; name: string; slug: string }[];
  categoryRefs?: { id: number; name: string; slug: string }[];
  variants?: FurnitureVariant[];
  gallery?: GalleryImage[];
  lifestyle?: LifestyleImage[];
  story?: FurnitureStory | null;
  related?: { slug: string; name: string; image?: string; code?: string }[];
  description?: string;
}

export const mapApiItem = (it: ApiItem): RichItem => {
  const textures = (it.texture ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    slug: it.slug,
    name: it.title,
    code: it.code ?? "",
    category: (it.type?.name ?? "Furniture").toUpperCase(),
    type: it.type ?? null,
    type_id: it.type?.id ?? null,
    specs: {
      dimensions: "—",
      material: it.texture ?? "—",
      finish: it.finish ?? "—",
      weight: "—",
      availability: it.availability ?? "Made to Order",
    },
    themes: (it.themes ?? []).map((t) => t.name),
    categories: (it.categories ?? []).map((c) => c.name),
    themeRefs: it.themes ?? [],
    categoryRefs: it.categories ?? [],
    textures: textures.length ? textures : ["Premium"],
    image: imgUrl(it.image) || undefined,
    apiId: it.id,
    original_price: it.original_price != null ? Number(it.original_price) : (it.price != null ? Number(it.price) : null),
    discount_type: it.discount_type ?? null,
    discount_value: it.discount_value != null ? Number(it.discount_value) : null,
    final_price: it.final_price != null ? Number(it.final_price) : (it.price != null ? Number(it.price) : null),
    is_on_promo: Boolean(it.is_on_promo),
    promo_badge_text: it.promo_badge_text ?? null,
    price: it.final_price != null ? Number(it.final_price) : (it.price != null ? Number(it.price) : null),
    collection: it.collection ?? null,
    variants: (it.variants ?? []).map((v) => ({
      ...v,
      preview_image: v.preview_image ? imgUrl(v.preview_image) : null,
      furniture_image: v.furniture_image ? imgUrl(v.furniture_image) : null,
      gallery: (v.gallery ?? []).map((g) => ({ ...g, image: imgUrl(g.image) })),
    })),
    gallery: (it.gallery ?? []).map((g) => ({ ...g, image: imgUrl(g.image) })),
    lifestyle: (it.lifestyle ?? []).map((l) => ({ ...l, image: imgUrl(l.image) })),
    story: it.story
      ? { ...it.story, feature_image: it.story.feature_image ? imgUrl(it.story.feature_image) : null }
      : null,
    related: (it.related ?? []).map((r) => ({
      slug: r.slug,
      name: r.title,
      image: r.image ? imgUrl(r.image) : undefined,
      code: r.code ?? "",
    })),
    description: it.description ?? undefined,
  } as RichItem;
};

const mergeBySlug = (a: Item[], b: Item[]) => {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const it of [...a, ...b]) {
    if (seen.has(it.slug)) continue;
    seen.add(it.slug);
    out.push(it);
  }
  return out;
};

let cachedAllItems: Item[] = staticItems;
let itemsFetched = false;
const itemListeners = new Set<() => void>();

const notifyItemListeners = () => itemListeners.forEach((fn) => fn());

const fetchAllItemsOnce = () => {
  if (itemsFetched) return;
  itemsFetched = true;

  api
    .get<ApiItem[]>("/items")
    .then((r) => {
      const mapped = r.data.map(mapApiItem);
      mapped.forEach((it) => itemCache.set(it.slug, it));
      cachedAllItems = mergeBySlug(staticItems, mapped);
      notifyItemListeners();
    })
    .catch(() => {
      itemsFetched = false;
    });
};

export const useAllItems = (enabled = true) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const rerender = () => setTick((t) => t + 1);
    itemListeners.add(rerender);
    fetchAllItemsOnce();
    return () => {
      itemListeners.delete(rerender);
    };
  }, [enabled]);
  return cachedAllItems;
};

export const useItemBySlug = (slug?: string) => {
  const cached = slug ? itemCache.get(slug) : undefined;
  const fromStatic = slug ? staticItems.find((i) => i.slug === slug) : undefined;
  const [item, setItem] = useState<RichItem | undefined>(
    cached ?? (fromStatic as RichItem | undefined)
  );
  const [loading, setLoading] = useState(!cached && !fromStatic);

  useEffect(() => {
    if (!slug) return;
    // Kalau udah ada di cache, tetap refresh di background tanpa nampilin loading
    if (!itemCache.get(slug)) setLoading(true);

    api.get<ApiItem>(`/items/${slug}`)
      .then((r) => {
        const mapped = mapApiItem(r.data);
        itemCache.set(slug, mapped);
        setItem(mapped);
      })
      .catch(() => {
        if (fromStatic) setItem(fromStatic as RichItem);
        else setItem(getStaticItem(slug) as RichItem);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return { item, loading };
};
