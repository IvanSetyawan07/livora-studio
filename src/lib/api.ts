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

// True hanya kalau developer sudah mengganti base URL via env.
// Kalau masih default localhost, dianggap belum dikonfigurasi untuk production.
export const isApiConfigured = Boolean(import.meta.env["VITE_API_URL"]);

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly retriable: boolean;
  readonly retryAfterSeconds?: number | undefined;
  readonly details?: unknown | undefined;

  constructor(init: {
    kind: ApiErrorKind;
    message: string;
    status?: number | null;
    retriable?: boolean;
    retryAfterSeconds?: number | undefined;
    details?: unknown | undefined;
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

function parseAxiosError(
  error: unknown
): {
  kind: ApiErrorKind;
  status: number | null;
  message: string;
  retryAfterSeconds?: number | undefined;
  details?: unknown | undefined;
} {
  if (!axios.isAxiosError(error)) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal";
    return { kind: "unknown", status: null, message };
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return {
      kind: "network",
      status: null,
      message: "Request timeout. Silakan coba lagi.",
    };
  }

  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as Record<string, unknown> | undefined;
    const code = data?.["code"] as string | undefined;
    const message =
      (data?.["message"] as string | undefined) ||
      error.message ||
      `Request gagal dengan status ${status}`;

    if (status === 401) {
      return { kind: "unauthenticated", status, message };
    }
    if (status === 403) {
      return { kind: "permission_required", status, message };
    }
    if (status === 404) {
      return { kind: "not_found", status, message };
    }
    if ((status === 409 || status === 422) && code === "SELECTION_REQUIRED") {
      return { kind: "selection_required", status, message, details: data };
    }
    if (status === 422) {
      return { kind: "validation", status, message, details: data };
    }
    if (status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      return {
        kind: "rate_limited",
        status,
        message,
        retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
      };
    }
    if (status >= 500) {
      return { kind: "server", status, message, details: data };
    }
    return { kind: "unknown", status, message, details: data };
  }

  if (error.request) {
    return {
      kind: isApiConfigured ? "network" : "not_connected",
      status: null,
      message: isApiConfigured
        ? "Tidak dapat terhubung ke server. Periksa koneksi internet Anda."
        : "Backend belum dikonfigurasi. Atur VITE_API_URL atau jalankan server lokal.",
    };
  }

  return { kind: "unknown", status: null, message: error.message };
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const parsed = parseAxiosError(error);
    return Promise.reject(
      new ApiError({
        kind: parsed.kind,
        message: parsed.message,
        status: parsed.status,
        retryAfterSeconds: parsed.retryAfterSeconds,
        details: parsed.details,
      })
    );
  }
);
