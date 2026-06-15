const STORAGE_KEY = "livora.themeBanners.v1";
const EVENT = "livora:themeBanners:changed";

export type ThemeBannerKey = string; // ← tidak hardcoded lagi

export type ThemeBanner = {
  image: string;
  title?: string;
  updatedAt: number;
};

type Store = Record<string, ThemeBanner>;

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

export function getAllBanners(): Store { return read(); }
export function getBanner(key: string): ThemeBanner | undefined { return read()[key]; }
export function saveBanner(key: string, banner: ThemeBanner) {
  const store = read();
  store[key] = banner;
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