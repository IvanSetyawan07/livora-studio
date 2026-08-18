// Helper terpusat untuk auth: simpan tujuan awal + bersihkan sesi konsisten.
import { authStorage } from "@/lib/api";

const REDIRECT_KEY = "redirectAfterLogin";

export const rememberIntendedPath = (path?: string) => {
  const target = path ?? window.location.pathname + window.location.search;
  if (target && !target.startsWith("/login") && !target.startsWith("/register")) {
    sessionStorage.setItem(REDIRECT_KEY, target);
  }
};

export const takeIntendedPath = (): string | null => {
  const v = sessionStorage.getItem(REDIRECT_KEY);
  if (v) sessionStorage.removeItem(REDIRECT_KEY);
  return v;
};

export const clearSession = () => {
  authStorage.clear();
  localStorage.removeItem("user");
  sessionStorage.removeItem(REDIRECT_KEY);
};

export const homeForRole = (role?: string) =>
  role === "admin" ? "/admin" : role === "sales" ? "/sales/scan" : "/";
