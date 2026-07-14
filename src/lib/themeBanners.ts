import { api } from "@/lib/api";

const EVENT = "livora:themeBanners:changed";

export type ThemeBannerKey = string;

export type ThemeBanner = {
  id?: number;
  image: string;
  path?: string;
  title?: string;
  updatedAt: number;
};

type Store = Record<string, ThemeBanner[]>;

let cache: Store = {};
let loaded = false;
let loadingPromise: Promise<Store> | null = null;

function mapApiBanner(b: any): ThemeBanner {
  return {
    id: b.id,
    image: b.image,
    path: b.path ?? undefined,
    title: b.title ?? "",
    updatedAt: b.updated_at ? new Date(b.updated_at).getTime() : Date.now(),
  };
}

async function fetchAll(): Promise<Store> {
  try {
    const { data } = await api.get<Record<string, any[]>>("/taxonomy-banners");
    const store: Store = {};
    for (const key of Object.keys(data || {})) {
      store[key] = (data[key] || []).map(mapApiBanner);
    }
    cache = store;
    loaded = true;
    window.dispatchEvent(new Event(EVENT));
    return store;
  } catch (e) {
    console.error("Gagal memuat banner:", e);
    return cache;
  }
}

export function ensureBannersLoaded(): Promise<Store> {
  if (loaded) return Promise.resolve(cache);
  if (!loadingPromise) {
    loadingPromise = fetchAll().finally(() => {
      loadingPromise = null;
    });
  }
  return loadingPromise;
}

// Mulai load begitu module ini di-import.
ensureBannersLoaded();

/* ---------- Multi-banner API (dibaca dari cache in-memory) ---------- */
export function getBanners(key: string): ThemeBanner[] {
  return cache[key] ?? [];
}
export function getAllBannersList(): Store {
  return cache;
}
export async function addBanner(key: string, banner: ThemeBanner) {
  const { data } = await api.post("/admin/taxonomy-banners", {
    taxonomy_key: key,
    image: banner.image,
    path: banner.path,
    title: banner.title || "",
  });
  const list = cache[key] ? [...cache[key]] : [];
  list.push(mapApiBanner(data));
  cache = { ...cache, [key]: list };
  window.dispatchEvent(new Event(EVENT));
}
export async function updateBannerAt(key: string, index: number, banner: Partial<ThemeBanner>) {
  const list = cache[key] ?? [];
  const target = list[index];
  if (!target?.id) return;
  const { data } = await api.put(`/admin/taxonomy-banners/${target.id}`, {
    image: banner.image,
    path: banner.path,
    title: banner.title,
  });
  const newList = [...list];
  newList[index] = mapApiBanner(data);
  cache = { ...cache, [key]: newList };
  window.dispatchEvent(new Event(EVENT));
}
export async function removeBannerAt(key: string, index: number) {
  const list = cache[key] ?? [];
  const target = list[index];
  if (!target?.id) return;
  await api.delete(`/admin/taxonomy-banners/${target.id}`);
  const newList = list.filter((_, i) => i !== index);
  cache = { ...cache, [key]: newList };
  window.dispatchEvent(new Event(EVENT));
}

/* ---------- Backward-compatible single-banner API ---------- */
export function getAllBanners(): Record<string, ThemeBanner> {
  const out: Record<string, ThemeBanner> = {};
  for (const k of Object.keys(cache)) {
    if (cache[k][0]) out[k] = cache[k][0];
  }
  return out;
}
export function getBanner(key: string): ThemeBanner | undefined {
  return cache[key]?.[0];
}

export function subscribeBanners(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/* ---------- Helper upload (dipakai AdminTaxonomies, tidak berubah) ---------- */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}