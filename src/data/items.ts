export interface ItemSpec {
  dimensions: string;
  material: string;
  finish: string;
  weight: string;
  availability: string;
}

export interface Item {
  slug: string;
  name: string;
  code: string;
  category: string; // pill tag, e.g. "SEATING"
  specs: ItemSpec;
  themes: string[];
  categories: string[];
  textures: string[];
}

export const items: Item[] = [
  {
    slug: "accent-chair",
    name: "Accent Chair",
    code: "UP25123",
    category: "SEATING",
    specs: {
      dimensions: "84 × 92 × 82 cm (W × D × H)",
      material: "Solid Walnut Frame, Boucle Fabric Upholstery",
      finish: "Matte Natural / Charcoal Grey",
      weight: "18 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Japandi", "Minimalist", "Warm Modern", "Wabi-Sabi"],
    categories: ["Seating", "Living Room", "Accent Piece"],
    textures: ["Soft Bouclé", "Warm Walnut", "Matte Finish"],
  },
  {
    slug: "lounge-sofa",
    name: "Lounge Sofa",
    code: "UP25201",
    category: "SEATING",
    specs: {
      dimensions: "220 × 95 × 78 cm (W × D × H)",
      material: "Kiln-dried Hardwood Frame, Linen Blend Upholstery",
      finish: "Sand Beige / Warm Taupe",
      weight: "62 kg",
      availability: "Made to Order — 8–10 weeks lead time",
    },
    themes: ["Japandi", "Warm Modern", "Editorial"],
    categories: ["Seating", "Living Room"],
    textures: ["Soft Linen", "Warm Taupe", "Plush Cushion"],
  },
  {
    slug: "cozy-chair",
    name: "Cozy Chair",
    code: "UP25305",
    category: "SEATING",
    specs: {
      dimensions: "60 × 60 × 42 cm (W × D × H)",
      material: "Solid Oak Base, Wool Bouclé Top",
      finish: "Natural Oak / Ivory",
      weight: "9 kg",
      availability: "In Stock",
    },
    themes: ["Minimalist", "Wabi-Sabi"],
    categories: ["Seating", "Accent Piece"],
    textures: ["Cozy Wool", "Natural Oak", "Smooth Bouclé"],
  },
  {
    slug: "side-table",
    name: "Side Table",
    code: "TB25110",
    category: "TABLE",
    specs: {
      dimensions: "45 × 45 × 55 cm (W × D × H)",
      material: "Travertine Top, Solid Walnut Legs",
      finish: "Honed Travertine / Matte Walnut",
      weight: "14 kg",
      availability: "Made to Order — 4–6 weeks lead time",
    },
    themes: ["Japandi", "Minimalist", "Warm Modern"],
    categories: ["Table", "Living Room"],
    textures: ["Honed Stone", "Smooth Travertine", "Matte Walnut"],
  },
  {
    slug: "floor-lamp",
    name: "Floor Lamp",
    code: "LT25088",
    category: "LIGHTING",
    specs: {
      dimensions: "38 × 38 × 165 cm (W × D × H)",
      material: "Brushed Brass Stem, Linen Drum Shade",
      finish: "Antique Brass / Warm White",
      weight: "7 kg",
      availability: "In Stock",
    },
    themes: ["Warm Modern", "Editorial"],
    categories: ["Lighting", "Living Room"],
    textures: ["Brushed Brass", "Woven Linen", "Warm Glow"],
  },
  {
    slug: "sectional-sofa",
    name: "Sectional Sofa",
    code: "UP25410",
    category: "SEATING",
    specs: {
      dimensions: "320 × 180 × 78 cm (W × D × H)",
      material: "Hardwood Frame, Performance Velvet Upholstery",
      finish: "Stone Grey / Soft Camel",
      weight: "98 kg",
      availability: "Made to Order — 10–12 weeks lead time",
    },
    themes: ["Warm Modern", "Editorial", "Minimalist"],
    categories: ["Seating", "Living Room"],
    textures: ["Soft Velvet", "Plush", "Smooth Hardwood"],
  },
  {
    slug: "sofa-three-bench",
    name: "Sofa Three Bench",
    code: "UP25140",
    category: "SEATING",
    specs: {
      dimensions: "78 × 84 × 80 cm (W × D × H)",
      material: "Solid Ash Frame, Full-Grain Leather",
      finish: "Cognac / Natural Ash",
      weight: "16 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Warm Modern", "Editorial"],
    categories: ["Seating", "Accent Piece"],
    textures: ["Supple Leather", "Grained", "Natural Ash"],
  },
  {
    slug: "console-table",
    name: "Console Table",
    code: "TB25220",
    category: "TABLE",
    specs: {
      dimensions: "160 × 38 × 78 cm (W × D × H)",
      material: "Solid Walnut, Brushed Brass Inlay",
      finish: "Matte Walnut / Antique Brass",
      weight: "28 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Japandi", "Minimalist", "Editorial"],
    categories: ["Table", "Entryway"],
    textures: ["Matte Walnut", "Polished Brass", "Smooth Grain"],
  },
  {
    slug: "dining-table",
    name: "Dining Table",
    code: "TB25330",
    category: "TABLE",
    specs: {
      dimensions: "240 × 100 × 75 cm (W × D × H)",
      material: "Solid Oak Top, Powder-Coated Steel Base",
      finish: "Natural Oak / Matte Black",
      weight: "82 kg",
      availability: "Made to Order — 8–10 weeks lead time",
    },
    themes: ["Warm Modern", "Minimalist"],
    categories: ["Table", "Dining Room"],
    textures: ["Natural Oak", "Matte Steel", "Solid Grain"],
  },
  {
    slug: "pendant-light",
    name: "Pendant Light",
    code: "LT25155",
    category: "LIGHTING",
    specs: {
      dimensions: "45 × 45 × 38 cm (W × D × H)",
      material: "Hand-blown Glass, Brushed Brass Canopy",
      finish: "Smoked Glass / Antique Brass",
      weight: "4 kg",
      availability: "In Stock",
    },
    themes: ["Editorial", "Warm Modern"],
    categories: ["Lighting", "Dining Room"],
    textures: ["Smoked Glass", "Brushed Brass", "Hand-blown"],
  },
  {
    slug: "modular-sofa",
    name: "Modular Sofa",
    code: "UP26101",
    category: "SEATING",
    specs: {
      dimensions: "360 × 105 × 82 cm (W × D × H)",
      material: "Hardwood Frame, Textured Linen Upholstery, Walnut Accents",
      finish: "Ivory White / Warm Walnut",
      weight: "120 kg",
      availability: "Made to Order — 10–12 weeks lead time",
    },
    themes: ["Warm Modern", "Editorial", "Minimalist"],
    categories: ["Seating", "Lobby", "Living Room"],
    textures: ["Soft Linen", "Plush Cushion", "Warm Walnut"],
  },
  {
    slug: "boucle-sofa",
    name: "Boucle Sofa",
    code: "UP26102",
    category: "SEATING",
    specs: {
      dimensions: "240 × 95 × 78 cm (W × D × H)",
      material: "Hardwood Frame, Wool Bouclé Upholstery",
      finish: "Cream Ivory",
      weight: "70 kg",
      availability: "Made to Order — 8–10 weeks lead time",
    },
    themes: ["Japandi", "Minimalist", "Wabi-Sabi"],
    categories: ["Seating", "Lobby", "Living Room"],
    textures: ["Soft Bouclé", "Plush", "Cozy Wool"],
  },
  {
    slug: "coffee-table",
    name: "Coffee Table",
    code: "TB26101",
    category: "TABLE",
    specs: {
      dimensions: "140 × 90 × 35 cm (W × D × H)",
      material: "Woven Rattan Body, Smoked Glass Top, Brushed Brass Stem",
      finish: "Natural Rattan / Smoked Glass / Antique Brass",
      weight: "32 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Editorial", "Warm Modern", "Japandi"],
    categories: ["Table", "Lobby", "Living Room"],
    textures: ["Woven Rattan", "Smoked Glass", "Brushed Brass"],
  },
  {
    slug: "curved-ottoman",
    name: "Curved Ottoman",
    code: "UP26103",
    category: "SEATING",
    specs: {
      dimensions: "110 × 50 × 42 cm (W × D × H)",
      material: "Foam Core, Wool Bouclé Upholstery",
      finish: "Cream Ivory",
      weight: "12 kg",
      availability: "In Stock",
    },
    themes: ["Wabi-Sabi", "Minimalist", "Warm Modern"],
    categories: ["Seating", "Lobby", "Accent Piece"],
    textures: ["Soft Bouclé", "Sculpted", "Cozy Wool"],
  },
];

export const getItemBySlug = (slug: string) =>
  items.find((i) => i.slug === slug);

export const slugifyItem = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
