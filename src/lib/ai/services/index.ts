/**
 * Single entry point every page/component should import.
 *
 * `import { aiServices } from "@/lib/ai/services"` — never import
 * mock.ts or laravel.ts directly from UI code. That's what makes the
 * eventual Laravel cut-over a one-line change instead of a rewrite.
 *
 * Defaults to the mock adapter. Once the Laravel AI orchestration API is
 * live, set VITE_AI_BACKEND=live in the environment to switch — nothing
 * else in the app needs to change.
 */
import { mockServices } from "./mock";
import { laravelServices } from "./laravel";

const useLiveBackend = import.meta.env.VITE_AI_BACKEND === "live";

export const aiServices = useLiveBackend ? laravelServices : mockServices;

export * from "./types";
