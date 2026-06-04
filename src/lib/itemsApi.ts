import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { items as staticItems, getItemBySlug as getStaticItem, type Item } from "@/data/items";

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
  type?: { id: number; name: string; slug: string } | null;
  themes?: { id: number; name: string; slug: string }[];
  categories?: { id: number; name: string; slug: string }[];
}

export const mapApiItem = (it: ApiItem): Item => {
  const textures = (it.texture ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    slug: it.slug,
    name: it.title,
    code: it.code ?? "",
    category: (it.type?.name ?? "Furniture").toUpperCase(),
    specs: {
      dimensions: "—",
      material: it.texture ?? "—",
      finish: it.finish ?? "—",
      weight: "—",
      availability: it.availability ?? "Made to Order",
    },
    themes: (it.themes ?? []).map((t) => t.name),
    categories: (it.categories ?? []).map((c) => c.name),
    textures: textures.length ? textures : ["Premium"],
    image: imgUrl(it.image) || undefined,
    apiId: it.id,
  };
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

export const useAllItems = () => {
  const [list, setList] = useState<Item[]>(staticItems);
  useEffect(() => {
    api
      .get<ApiItem[]>("/items")
      .then((r) => setList(mergeBySlug(staticItems, r.data.map(mapApiItem))))
      .catch(() => {});
  }, []);
  return list;
};

export const useItemBySlug = (slug?: string) => {
  const fromStatic = slug ? staticItems.find((i) => i.slug === slug) : undefined;
  const [item, setItem] = useState<Item | undefined>(fromStatic);
  const [loading, setLoading] = useState(!fromStatic);

  useEffect(() => {
    if (!slug) return;
    if (fromStatic) {
      setItem(fromStatic);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<ApiItem>(`/items/${slug}`)
      .then((r) => setItem(mapApiItem(r.data)))
      .catch(() => setItem(getStaticItem(slug))) // fallback to titleized stub
      .finally(() => setLoading(false));
  }, [slug, fromStatic]);

  return { item, loading };
};
