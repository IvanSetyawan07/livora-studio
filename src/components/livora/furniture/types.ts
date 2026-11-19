export type GridColumns = 3 | 4 | 5;

export interface FurnitureFinishOption {
  id: number | string;
  name: string;
  hex: string;
  category: "fabric" | "leather" | "wood" | "metal" | "marble" | "other";
  material?: string | null;
  previewImage?: string | null;
  furnitureImage?: string | null;
  isDefault?: boolean;
}

/**
 * Model furnitur khusus halaman showcase arsitektural /furniture.
 * Sengaja TIDAK memiliki field harga, diskon, ataupun total transaksi.
 */
export interface FurnitureShowcaseItem {
  id: number | string;
  apiId?: number;
  slug: string;
  name: string;
  code: string;
  category: string;
  categorySlug: string;
  series?: string | null;
  editorialTag?: string | null;
  image?: string | null;
  dimensionsLabel: string;
  dimensionsDetail: {
    width?: number | null;
    depth?: number | null;
    height?: number | null;
  };
  materialLabel: string;
  finishLabel?: string | null;
  availabilityLabel: string;
  leadTimeLabel: string;
  description: string;
  finishes: FurnitureFinishOption[];
}

export interface ShortlistedPiece {
  slug: string;
  apiId?: number;
  name: string;
  code: string;
  category: string;
  image?: string | null;
  finishId?: number | string | null;
  finishName: string;
  finishHex: string;
  dimensionsLabel: string;
  materialLabel: string;
  savedAt: string;
}
