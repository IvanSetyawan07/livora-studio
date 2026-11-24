import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import type { FurnitureVariant } from "@/lib/itemsApi";

export interface CollectionItemRef {
  id: number;
  slug: string;
  title: string;
  code?: string | null;
  image?: string | null;
  texture?: string | null;
  finish?: string | null;
  availability?: string | null;
  is_on_promo?: boolean;
  promo_badge_text?: string | null;
  type?: { id: number; name: string; slug: string } | null;
  collection?: { id: number; name: string; slug: string } | null;
  variants?: FurnitureVariant[];
}

export interface CollectionPackage {
  id: number;
  collection_id: number;
  name: string;
  slug: string;
  description?: string | null;
  banner?: string | null;
  sort_order: number;
  items?: CollectionItemRef[];
}

export interface CollectionStory {
  id: number;
  collection_id: number;
  story_banner?: string | null;
  story_description?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  hero_banner?: string | null;
  card_banner?: string | null;
  featured_image?: string | null;
  display_order?: number;
  status?: string;
  is_featured?: boolean;
  items_count?: number;
  packages_count?: number;
  seo_title?: string | null;
  seo_description?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
  story?: CollectionStory | null;
  packages?: CollectionPackage[];
  items?: CollectionItemRef[];
}

const normalizeItemRef = (it: CollectionItemRef): CollectionItemRef => ({
  ...it,
  image: it.image ? imgUrl(it.image) : null,
  variants: (it.variants ?? []).map((v) => ({
    ...v,
    preview_image: v.preview_image ? imgUrl(v.preview_image) : null,
    furniture_image: v.furniture_image ? imgUrl(v.furniture_image) : null,
  })),
});

const withUrls = (c: Collection): Collection => ({
  ...c,
  hero_banner: c.hero_banner ? imgUrl(c.hero_banner) : null,
  card_banner: c.card_banner ? imgUrl(c.card_banner) : null,
  featured_image: c.featured_image ? imgUrl(c.featured_image) : null,
  story: c.story
    ? { ...c.story, story_banner: c.story.story_banner ? imgUrl(c.story.story_banner) : null }
    : null,
  packages: (c.packages ?? []).map((p) => ({
    ...p,
    banner: p.banner ? imgUrl(p.banner) : null,
    items: (p.items ?? []).map(normalizeItemRef),
  })),
  items: (c.items ?? []).map(normalizeItemRef),
});

export const listCollections = async (opts?: { featured?: boolean }): Promise<Collection[]> => {
  const params = opts?.featured ? { featured: 1 } : undefined;
  const r = await api.get<Collection[]>("/collections", { params });
  return r.data.map(withUrls);
};

export const getCollection = async (slug: string): Promise<Collection> => {
  const r = await api.get<Collection>(`/collections/${slug}`);
  return withUrls(r.data);
};

export const getCollectionItems = async (
  collectionSlug: string,
  typeSlug?: string
): Promise<CollectionItemRef[]> => {
  const params: any = { collection: collectionSlug };
  if (typeSlug && typeSlug !== "all") params.type = typeSlug;
  const r = await api.get<CollectionItemRef[]>("/items", { params });
  return r.data.map(normalizeItemRef);
};

export const CATEGORY_TABS: { slug: string; label: string }[] = [
  { slug: "all", label: "All" },
  { slug: "sofa", label: "Sofa" },
  { slug: "chair", label: "Chair" },
  { slug: "table", label: "Table" },
  { slug: "cabinet", label: "Cabinet" },
  { slug: "bed", label: "Bedroom" },
  { slug: "decor", label: "Decor" },
  { slug: "lighting", label: "Lighting" },
];
