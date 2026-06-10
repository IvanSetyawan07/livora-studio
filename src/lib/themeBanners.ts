// Frontend-only CRUD store for "theme banners" — the large image slot that
// appears inside the Furniture category grid (Chair / Sofa / Table / All).
// Images are stored as base64 data URLs in localStorage so admins can manage
// them without backend changes.

export type ThemeBannerKey = "Chair" | "Sofa" | "Table" | "All";

export const THEME_BANNER_KEYS: ThemeBannerKey[] = ["Chair", "Sofa", "Table", "All"];

const STORAGE_KEY = "livora.themeBanners.v1";
const EVENT = "livora:themeBanners:changed";

export type ThemeBanner = {
  image: string; // data URL
  title?: string;
  updatedAt: number;
};

type Store = Partial<Record<ThemeBannerKey, ThemeBanner>>;

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(EVENT));
}

export function getAllBanners(): Store {
  return read();
}

export function getBanner(key: ThemeBannerKey): ThemeBanner | undefined {
  return read()[key];
}

export function saveBanner(key: ThemeBannerKey, banner: ThemeBanner) {
  const store = read();
  store[key] = banner;
  write(store);
}

export function deleteBanner(key: ThemeBannerKey) {
  const store = read();
  delete store[key];
  write(store);
}

export function subscribeBanners(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
