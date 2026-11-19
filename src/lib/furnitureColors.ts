import type { FurnitureVariant } from "@/lib/itemsApi";

export type VariantCategory =
  | "fabric"
  | "leather"
  | "wood"
  | "metal"
  | "marble"
  | "other";

export interface LuxuryColorPreset {
  name: string;
  hex: string;
  category: VariantCategory;
  material?: string;
}

/**
 * Palet warna quiet-luxury kurasi LIVORA.
 * Dipakai untuk quick-add swatch di Admin Panel dan fallback warna dari nama varian.
 */
export const LUXURY_COLOR_PRESETS: LuxuryColorPreset[] = [
  { name: "Oatmeal Linen", hex: "#D8CFC2", category: "fabric", material: "Belgian Linen" },
  { name: "Ivory Bouclé", hex: "#F2EDE4", category: "fabric", material: "Bouclé" },
  { name: "Warm Sand", hex: "#CBBBA0", category: "fabric", material: "Performance Linen" },
  { name: "Taupe Linen", hex: "#9E9284", category: "fabric", material: "Woven Linen" },
  { name: "Sage Velvet", hex: "#6B786B", category: "fabric", material: "Matte Velvet" },
  { name: "Emerald Velvet", hex: "#1E4D45", category: "fabric", material: "Plush Velvet" },
  { name: "Terracotta", hex: "#9E5A40", category: "fabric", material: "Textured Weave" },
  { name: "Charcoal", hex: "#302F2D", category: "fabric", material: "Wool Blend" },
  { name: "Cognac Leather", hex: "#9B5B33", category: "leather", material: "Full-Grain Leather" },
  { name: "Saddle Brown", hex: "#76462B", category: "leather", material: "Aniline Leather" },
  { name: "Roman Travertine", hex: "#DDD4C6", category: "marble", material: "Honed Travertine" },
  { name: "Calacatta Marble", hex: "#ECE9E2", category: "marble", material: "Italian Marble" },
  { name: "Natural Oak", hex: "#C8A986", category: "wood", material: "Solid White Oak" },
  { name: "American Walnut", hex: "#5A4031", category: "wood", material: "Solid Walnut" },
  { name: "Espresso Oak", hex: "#382921", category: "wood", material: "Smoked Oak" },
  { name: "Brushed Brass", hex: "#BFA065", category: "metal", material: "Brushed Brass" },
];

const KEYWORD_HEX_FALLBACKS: Array<[RegExp, string]> = [
  [/oatmeal|ecru|cream|krem|beige/i, "#D8CFC2"],
  [/ivory|white|putih|alabaster|pearl|boucl/i, "#F2EDE4"],
  [/sand|linen|stone|travertine|limestone/i, "#DDD4C6"],
  [/taupe|greige|mocha|mushroom/i, "#A19385"],
  [/sage|olive|moss/i, "#6B786B"],
  [/emerald|forest|green|hijau/i, "#1E4D45"],
  [/navy|indigo|blue|biru/i, "#2F435A"],
  [/terracotta|rust|clay|burnt/i, "#9E5A40"],
  [/cognac|caramel|amber|camel|tan/i, "#9B5B33"],
  [/walnut|mahogany|chestnut|chocolate|coklat|brown/i, "#5A4031"],
  [/oak|teak|jati|ash|maple|natural wood|kayu/i, "#C8A986"],
  [/espresso|ebony|wenge|dark wood/i, "#382921"],
  [/charcoal|anthracite|graphite|black|hitam|obsidian|nero/i, "#2E2D2B"],
  [/grey|gray|abu|slate|pewter/i, "#8E8B86"],
  [/brass|gold|emas|champagne|bronze/i, "#BFA065"],
  [/blush|rose|dusty pink/i, "#C9A59B"],
];

export function isValidHexColor(val?: string | null): boolean {
  if (!val) return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val.trim());
}

/**
 * Mengembalikan kode warna hex yang valid untuk swatch varian.
 * Jika color_code belum diisi (varian lama), tebak cerdas dari color_name/variant_name.
 */
export function resolveSwatchHex(variant: Pick<FurnitureVariant, "color_code" | "color_name" | "variant_name" | "material_name">): string {
  if (isValidHexColor(variant.color_code)) {
    return variant.color_code!.trim();
  }
  const haystack = `${variant.color_name ?? ""} ${variant.variant_name ?? ""} ${variant.material_name ?? ""}`;
  for (const [pattern, hex] of KEYWORD_HEX_FALLBACKS) {
    if (pattern.test(haystack)) return hex;
  }
  return "#D8CFC2";
}

/** Label warna/material elegan yang tampil di kiri bawah kartu produk. */
export function getVariantDisplayLabel(
  variant?: Pick<FurnitureVariant, "color_name" | "variant_name" | "material_name"> | null,
): string {
  if (!variant) return "";
  const color = variant.color_name?.trim();
  const name = variant.variant_name?.trim();
  const material = variant.material_name?.trim();
  return color || name || material || "";
}
