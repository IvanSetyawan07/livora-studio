import axios from "axios";

// Base URL backend Laravel. Ganti via VITE_API_URL saat deploy.
export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

// Sisipkan token otomatis ke setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    (config.headers as unknown as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authStorage = {
  setToken: (t: string) => localStorage.setItem("token", t),
  getToken: () => localStorage.getItem("token"),
  clear: () => localStorage.removeItem("token"),
};