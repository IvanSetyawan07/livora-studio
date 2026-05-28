import { api, API_BASE_URL } from "@/lib/api";

// Backend base URL (strip /api). Used to absolutize "/storage/..." image paths.
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export const imgUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return BACKEND_ORIGIN + path;
};

export const trackClick = (target_type: "item" | "project", target_id: number) => {
  api.post("/track/click", { target_type, target_id }).catch(() => {});
};

export const trackView = (target_type: "item" | "project", target_id: number, duration_seconds: number) => {
  if (!target_id) return;
  // Use sendBeacon-like robustness: axios still fires on unmount
  api.post("/track/view", { target_type, target_id, duration_seconds }).catch(() => {});
};
