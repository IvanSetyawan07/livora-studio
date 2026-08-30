/**
 * Single entry point every page/component should import.
 *
 * `import { aiServices } from "@/lib/ai/services"` — never import
 * mock.ts or laravel.ts directly from UI code.
 *
 * Fase 4 selesai → backend Laravel `/api/ai/*` SUDAH ada, jadi default-nya
 * sekarang LIVE. Mock hanya dipakai kalau di-set eksplisit:
 *   VITE_AI_BACKEND=mock
 * (berguna buat demo/offline atau kalau backend sedang down).
 */
import { mockServices } from "./mock";
import { laravelServices } from "./laravel";

const mode = (import.meta.env.VITE_AI_BACKEND as string | undefined) ?? "live";

export const AI_BACKEND_MODE: "live" | "mock" = mode === "mock" ? "mock" : "live";

export const aiServices = AI_BACKEND_MODE === "mock" ? mockServices : laravelServices;

export * from "./types";
