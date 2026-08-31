/**
 * Single entry point every page/component should import.
 *
 * `import { aiServices } from "@/lib/ai/services"` — jangan pernah import
 * mock.ts atau laravel.ts langsung dari UI.
 *
 * Fase 5: default sekarang LIVE (Laravel). Set VITE_AI_BACKEND=mock kalau
 * mau menjalankan UI tanpa backend (demo/offline).
 */
import { mockServices } from "./mock";
import { laravelServices } from "./laravel";

const useMockBackend = import.meta.env.VITE_AI_BACKEND === "mock";

export const aiServices = useMockBackend ? mockServices : laravelServices;

export * from "./types";
