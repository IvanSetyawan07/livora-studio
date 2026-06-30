const STORAGE_KEY = "livora.themeBanners.v1";
const EVENT = "livora:themeBanners:changed";

export type ThemeBannerKey = string;

export type ThemeBanner = {
  image: string;
  title?: string;
  updatedAt: number;
};

// Internal storage uses arrays. Backward-compatible with old single-object shape.
type StoreRaw = Record<string, ThemeBanner | ThemeBanner[]>;
type Store = Record<string, ThemeBanner[]>;

function normalize(raw: StoreRaw): Store {
  const out: Store = {};
  for (const k of Object.keys(raw)) {
    const v = raw[k];
    if (!v) continue;
    out[k] = Array.isArray(v) ? v : [v];
  }
  return out;
}

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw) as StoreRaw) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(EVENT));
}

/* ---------- New multi-banner API ---------- */
export function getBanners(key: string): ThemeBanner[] {
  return read()[key] ?? [];
}
export function getAllBannersList(): Store { return read(); }
export function addBanner(key: string, banner: ThemeBanner) {
  const store = read();
  const list = store[key] ?? [];
  list.push(banner);
  store[key] = list;
  write(store);
}
export function updateBannerAt(key: string, index: number, banner: Partial<ThemeBanner>) {
  const store = read();
  const list = store[key] ?? [];
  if (!list[index]) return;
  list[index] = { ...list[index], ...banner, updatedAt: Date.now() };
  store[key] = list;
  write(store);
}
export function removeBannerAt(key: string, index: number) {
  const store = read();
  const list = store[key] ?? [];
  list.splice(index, 1);
  if (list.length === 0) delete store[key];
  else store[key] = list;
  write(store);
}

/* ---------- Backward-compatible single-banner API ---------- */
// Returns an object keyed by category, where each value is the FIRST banner
// (kept for older callers that expect a single banner object).
export function getAllBanners(): Record<string, ThemeBanner> {
  const all = read();
  const out: Record<string, ThemeBanner> = {};
  for (const k of Object.keys(all)) {
    if (all[k][0]) out[k] = all[k][0];
  }
  return out;
}
export function getBanner(key: string): ThemeBanner | undefined {
  return read()[key]?.[0];
}
export function saveBanner(key: string, banner: ThemeBanner) {
  const store = read();
  const list = store[key] ?? [];
  if (list.length === 0) list.push(banner);
  else list[0] = banner;
  store[key] = list;
  write(store);
}
export function deleteBanner(key: string) {
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
