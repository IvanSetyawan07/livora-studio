import { useEffect, useState } from "react";
import type { ShortlistedPiece } from "./types";

const STORAGE_KEY = "livora_furniture_shortlist_v1";
export const SHORTLIST_CHANGED_EVENT = "livora-shortlist-changed";
export const SHORTLIST_OPEN_EVENT = "livora-open-shortlist";

export function getShortlist(): ShortlistedPiece[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShortlist(items: ShortlistedPiece[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(SHORTLIST_CHANGED_EVENT));
  } catch {
    // Abaikan jika storage penuh / private browsing
  }
}

export function isPieceShortlisted(slug: string): boolean {
  return getShortlist().some((p) => p.slug === slug);
}

export function toggleShortlistPiece(piece: Omit<ShortlistedPiece, "savedAt">): {
  saved: boolean;
  items: ShortlistedPiece[];
} {
  const current = getShortlist();
  const idx = current.findIndex((p) => p.slug === piece.slug);
  if (idx >= 0) {
    const next = current.filter((p) => p.slug !== piece.slug);
    saveShortlist(next);
    return { saved: false, items: next };
  }
  const next: ShortlistedPiece[] = [
    { ...piece, savedAt: new Date().toISOString() },
    ...current,
  ];
  saveShortlist(next);
  return { saved: true, items: next };
}

export function updateShortlistFinish(
  slug: string,
  finish: { id?: number | string | null; name: string; hex: string; image?: string | null },
): void {
  const current = getShortlist();
  const idx = current.findIndex((p) => p.slug === slug);
  if (idx < 0) return;
  const next = [...current];
  next[idx] = {
    ...next[idx],
    finishId: finish.id ?? null,
    finishName: finish.name,
    finishHex: finish.hex,
    image: finish.image || next[idx].image,
  };
  saveShortlist(next);
}

export function removeShortlistPiece(slug: string): ShortlistedPiece[] {
  const next = getShortlist().filter((p) => p.slug !== slug);
  saveShortlist(next);
  return next;
}

export function clearShortlist(): void {
  saveShortlist([]);
}

export function openShortlistDrawer(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SHORTLIST_OPEN_EVENT));
  }
}

export function useShortlist() {
  const [items, setItems] = useState<ShortlistedPiece[]>(() => getShortlist());

  useEffect(() => {
    const sync = () => setItems(getShortlist());
    window.addEventListener(SHORTLIST_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SHORTLIST_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    items,
    count: items.length,
    isSaved: (slug: string) => items.some((p) => p.slug === slug),
    toggle: toggleShortlistPiece,
    remove: removeShortlistPiece,
    clear: clearShortlist,
  };
}
