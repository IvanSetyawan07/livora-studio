import axios from "axios";
export type ApiErrorKind =
  | "not_connected"      // base URL belum diisi / backend tidak reachable
  | "unauthenticated"    // 401
  | "permission_required" // 403
  | "not_found"          // 404
  | "selection_required" // 409 / 422 dengan code SELECTION_REQUIRED
  | "invalid_credentials" // 401/403 dari provider pihak ketiga
  | "rate_limited"       // 429
  | "validation"         // 422
  | "server"             // 5xx
  | "network"            // fetch gagal / timeout
  | "unknown";
// Base URL backend Laravel. Ganti via VITE_API_URL saat deploy.
export const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
});

// Sisipkan token otomatis ke setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    (config.headers as unknown as Record<string, string>)["Authorization"] =
      `Bearer ${token}`;
  }
  return config;
});

export const authStorage = {
  setToken: (t: string) => localStorage.setItem("token", t),
  getToken: () => localStorage.getItem("token"),
  clear: () => localStorage.removeItem("token"),
};
export const isApiConfigured = API_BASE_URL.length > 0;
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly retriable: boolean;
  readonly retryAfterSeconds?: number;
  readonly details?: unknown;

  constructor(init: {
    kind: ApiErrorKind;
    message: string;
    status?: number | null;
    retriable?: boolean;
    retryAfterSeconds?: number;
    details?: unknown;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.retriable =
      init.retriable ??
      ["network", "server", "rate_limited", "not_connected"].includes(init.kind);
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.details = init.details;
  }
}