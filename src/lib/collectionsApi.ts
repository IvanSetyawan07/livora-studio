import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";

export interface CollectionItemRef {
  id: number;
  slug: string;
  title: string;
  code?: string | null;
  image?: string | null;
  type?: { id: number; name: string; slug: string } | null;
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
  seo_title?: string | null;
  seo_description?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
  story?: CollectionStory | null;
  packages?: CollectionPackage[];
  items?: CollectionItemRef[];
}

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
    items: (p.items ?? []).map((it) => ({ ...it, image: it.image ? imgUrl(it.image) : null })),
  })),
  items: (c.items ?? []).map((it) => ({ ...it, image: it.image ? imgUrl(it.image) : null })),
});

export const listCollections = async (): Promise<Collection[]> => {
  const r = await api.get<Collection[]>("/collections");
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
  return r.data.map((it) => ({ ...it, image: it.image ? imgUrl(it.image) : null }));
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
