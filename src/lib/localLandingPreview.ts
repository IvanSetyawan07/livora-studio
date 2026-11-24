import type { Collection } from "@/lib/collectionsApi";
import type { RichItem } from "@/lib/itemsApi";
import type { Project } from "@/data/projects";

export interface LocalLandingPreviewData {
  PREVIEW_PROJECTS?: Project[];
  PREVIEW_COLLECTIONS: Collection[];
  PREVIEW_NEW_ARRIVALS: RichItem[];
  PREVIEW_REGULAR_PIECES: RichItem[];
}

/**
 * Loads local-only preview data strictly during `vite dev` when
 * `src/data/landingPreview.local.ts` exists on disk.
 *
 * - File `src/data/*.local.ts` is git-ignored (never pushed via git/SSH).
 * - In production builds (`import.meta.env.DEV === false`), Vite completely
 *   eliminates this block and never requires the local file to exist.
 */
const localPreviewModules = import.meta.env.DEV
  ? import.meta.glob<LocalLandingPreviewData>("@/data/landingPreview.local.ts", {
      eager: true,
    })
  : {};

export const getLocalLandingPreview = (): LocalLandingPreviewData | null => {
  if (!import.meta.env.DEV) return null;
  const mod = Object.values(localPreviewModules)[0];
  return mod ?? null;
};
