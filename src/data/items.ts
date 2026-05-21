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
    slug: "white-table",
    name: "White Table",
    code: "UP25126",
    category: "TABLE",
    specs: {
      dimensions: "220 × 95 × 78 cm (W × D × H)",
      material: "Kiln-dried Hardwood Frame, Linen Blend Upholstery",
      finish: "Sand Beige / Warm Taupe",
      weight: "62 kg",
      availability: "Made to Order — 8–10 weeks lead time",
    },
    themes: ["Japandi", "Warm Modern", "Editorial"],
    categories: ["Table", "Living Room"],
    textures: ["Soft Linen", "Warm Taupe", "Plush Cushion"],
  },
  {
    slug: "coco-table",
    name: "Coco Table",
    code: "TB25124",
    category: "TABLE",
    specs: {
      dimensions: "110 × 75 × 30 cm (W × D × H)",
      material: "Woven Rattan Body, Smoked Glass Top, Brushed Brass Stem",
      finish: "Natural Rattan / Smoked Glass / Brushed Brass",
      weight: "32 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Editorial", "Warm Modern", "Japandi"],
    categories: ["Table", "Lobby", "Living Room"],
    textures: ["Woven Rattan", "Smoked Glass", "Brushed Brass"],
  },
  {
    slug: "accent-chair",
    name: "Accent Chair",
    code: "UP25122",
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
    slug: "work-chair",
    name: "Work Chair",
    code: "UP25123",
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
    slug: "white-chair",
    name: "White Chair",
    code: "UP25125",
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
    slug: "coco-chair",
    name: "Coco Chair",
    code: "UP25124",
    category: "SEATING",
    specs: { 
      dimensions: "",
      material: "",
      finish: "",
      weight: "",
      availability: "",
    },
    themes: ["Japandi", "Minimalist", "Warm Modern", "Wabi-Sabi"],
    categories: ["Seating", "Living Room", "Accent Piece"],
    textures: ["Soft Bouclé", "Warm Walnut", "Matte Finish"],
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
    slug: "modular-sectional-sofa",
    name: "Modular Sectional Sofa",
    code: "UP26501",
    category: "SEATING",
    specs: {
      dimensions: "320 × 180 × 78 cm (W × D × H)",
      material: "Hardwood Frame, Premium Linen Upholstery",
      finish: "Warm Beige / Natural Walnut",
      weight: "95 kg",
      availability: "Made to Order — 8–10 weeks lead time",
    },
    themes: ["Warm Modern", "Editorial", "Minimalist"],
    categories: ["Seating", "Living Room"],
    textures: ["Soft Linen", "Plush Cushion", "Warm Walnut"],
  },
  {
    slug: "wooden-lounge-chair",
    name: "Wooden Lounge Chair",
    code: "UP26502",
    category: "SEATING",
    specs: {
      dimensions: "72 × 80 × 82 cm (W × D × H)",
      material: "Solid Walnut Frame, Woven Leather Sling",
      finish: "Natural Walnut / Tan Leather",
      weight: "14 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Japandi", "Warm Modern", "Editorial"],
    categories: ["Seating", "Living Room", "Accent Piece"],
    textures: ["Warm Walnut", "Woven Leather", "Smooth Grain"],
  },
  {
    slug: "nesting-coffee-tables",
    name: "Nesting Coffee Tables",
    code: "TB26501",
    category: "TABLE",
    specs: {
      dimensions: "Ø80 × 38 cm / Ø60 × 32 cm",
      material: "Solid Oak Top, Powder-Coated Steel Base",
      finish: "Natural Oak / Matte Black",
      weight: "22 kg (set)",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Warm Modern", "Minimalist", "Japandi"],
    categories: ["Table", "Living Room"],
    textures: ["Natural Oak", "Matte Steel", "Smooth Grain"],
  },
  {
    slug: "tan-leather-swivel-wingback-chair",
    name: "Tan Leather Swivel Wingback Chair",
    code: "UP26503",
    category: "SEATING",
    specs: {
      dimensions: "82 × 84 × 96 cm (W × D × H)",
      material: "Full-Grain Leather, Hardwood Frame, Brushed Steel Swivel Base",
      finish: "Tan Cognac / Brushed Steel",
      weight: "28 kg",
      availability: "Made to Order — 8–10 weeks lead time",
    },
    themes: ["Editorial", "Warm Modern"],
    categories: ["Seating", "Living Room", "Accent Piece"],
    textures: ["Supple Leather", "Smooth Grain", "Brushed Steel"],
  },
  {
    slug: "pleated-dining-chair",
    name: "Pleated Dining Chair",
    code: "UP26504",
    category: "SEATING",
    specs: {
      dimensions: "48 × 56 × 88 cm (W × D × H)",
      material: "Hardwood Frame, Pleated Bouclé Upholstery",
      finish: "Ivory White",
      weight: "8 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Warm Modern", "Editorial", "Minimalist"],
    categories: ["Seating", "Dining Room"],
    textures: ["Soft Bouclé", "Pleated", "Smooth Hardwood"],
  },
  {
    slug: "sage-modular-sectional-sofa",
    name: "Sage Modular Sectional Sofa",
    code: "UP26505",
    category: "SEATING",
    specs: {
      dimensions: "300 × 180 × 76 cm (W × D × H)",
      material: "Hardwood Frame, Textured Velvet Upholstery",
      finish: "Sage Green",
      weight: "92 kg",
      availability: "Made to Order — 10–12 weeks lead time",
    },
    themes: ["Editorial", "Warm Modern"],
    categories: ["Seating", "Living Room"],
    textures: ["Soft Velvet", "Plush Cushion", "Sage Tone"],
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
    slug: "boucle-lounge-sofa",
    name: "Boucle Lounge Sofa",
    code: "UP26201",
    category: "SEATING",
    specs: {
      dimensions: "240 × 100 × 78 cm (W × D × H)",
      material: "Hardwood Frame, Wool Bouclé Upholstery, Brushed Brass Base",
      finish: "Cream Ivory / Antique Brass",
      weight: "78 kg",
      availability: "Made to Order — 8–10 weeks lead time",
    },
    themes: ["Editorial", "Warm Modern", "Wabi-Sabi"],
    categories: ["Seating", "Lounge", "Living Room"],
    textures: ["Soft Bouclé", "Plush", "Brushed Brass"],
  },
  {
    slug: "leather-lounge-chair",
    name: "Leather Lounge Chair",
    code: "UP26202",
    category: "SEATING",
    specs: {
      dimensions: "82 × 80 × 78 cm (W × D × H)",
      material: "Full-Grain Leather, Foam Cushioning, Powder-Coated Steel Swivel Base",
      finish: "Olive Green / Matte Black",
      weight: "26 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Editorial", "Warm Modern"],
    categories: ["Seating", "Lounge", "Accent Piece"],
    textures: ["Supple Leather", "Smooth Grain", "Matte Steel"],
  },
  {
    slug: "marble-coffee-table",
    name: "Marble Coffee Table",
    code: "TB26201",
    category: "TABLE",
    specs: {
      dimensions: "110 × 75 × 30 cm (W × D × H)",
      material: "Polished Marble Top, Brushed Brass Drum Base",
      finish: "White Marble / Antique Brass",
      weight: "48 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Editorial", "Warm Modern", "Minimalist"],
    categories: ["Table", "Lounge", "Living Room"],
    textures: ["Polished Marble", "Brushed Brass", "Smooth Stone"],
  },
  {
    slug: "olive-swivel-chair",
    name: "Olive Swivel Chair",
    code: "UP26301",
    category: "SEATING",
    specs: {
      dimensions: "85 × 88 × 92 cm (W × D × H)",
      material: "Hardwood Frame, Textured Velvet Upholstery, Powder-Coated Steel Swivel Base",
      finish: "Olive Green / Matte Black",
      weight: "24 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Editorial", "Warm Modern", "Minimalist"],
    categories: ["Seating", "President Suite", "Accent Piece"],
    textures: ["Soft Velvet", "Channel Tufted", "Matte Steel"],
  },
  {
    slug: "brass-drum-coffee-table",
    name: "Brass Drum Coffee Table",
    code: "TB26301",
    category: "TABLE",
    specs: {
      dimensions: "100 × 100 × 38 cm (W × D × H)",
      material: "Solid Oak Top, Brushed Brass Drum Base",
      finish: "Natural Oak / Antique Brass",
      weight: "42 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Editorial", "Warm Modern"],
    categories: ["Table", "President Suite", "Living Room"],
    textures: ["Brushed Brass", "Natural Oak", "Smooth Grain"],
  },
  {
    slug: "freyja-sofa",
    name: "Freyja Sofa",
    code: "UP26401",
    category: "SEATING",
    specs: {
      dimensions: "260 × 100 × 80 cm (W × D × H)",
      material: "Hardwood Frame, Boucle Upholstery, Solid Oak Base",
      finish: "Cream Ivory / Natural Oak",
      weight: "82 kg",
      availability: "Made to Order — 8–10 weeks lead time",
    },
    themes: ["Japandi", "Warm Modern", "Minimalist"],
    categories: ["Seating", "Living Room"],
    textures: ["Soft Bouclé", "Plush Cushion", "Natural Oak"],
  },
  {
    slug: "dwarf-sofa",
    name: "Dwarf Sofa",
    code: "UP26402",
    category: "SEATING",
    specs: {
      dimensions: "180 × 95 × 72 cm (W × D × H)",
      material: "Hardwood Frame, Textured Linen Upholstery, Walnut Legs",
      finish: "Sand Beige / Warm Walnut",
      weight: "58 kg",
      availability: "Made to Order — 6–8 weeks lead time",
    },
    themes: ["Warm Modern", "Editorial", "Minimalist"],
    categories: ["Seating", "Living Room"],
    textures: ["Soft Linen", "Plush", "Warm Walnut"],
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

export const slugifyItem = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const titleize = (slug: string) =>
  slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

const inferCategory = (name: string): string => {
  const n = name.toLowerCase();
  if (/(sofa|chair|ottoman|bench|stool|seat)/.test(n)) return "SEATING";
  if (/(table|desk|console|plinth|countertop)/.test(n)) return "TABLE";
  if (/(lamp|light|pendant|sconce)/.test(n)) return "LIGHTING";
  if (/(cabinet|shelf|storage|sideboard)/.test(n)) return "STORAGE";
  if (/(rug|carpet)/.test(n)) return "TEXTILE";
  return "DECOR";
};

const buildFallbackItem = (slug: string): Item => {
  const name = titleize(slug);
  return {
    slug,
    name,
    code: "LV" + Math.abs(slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0)).toString().padStart(5, "0"),
    category: inferCategory(name),
    specs: {
      dimensions: "Custom — made to order",
      material: "Premium materials, crafted by LIVORA artisans",
      finish: "Bespoke finish available on request",
      weight: "Varies by configuration",
      availability: "Made to Order — 8–10 weeks lead time",
    },
    themes: ["Custom", "Bespoke", "Curated"],
    categories: ["Made to Order", "Signature"],
    textures: ["Crafted", "Premium", "Bespoke"],
  };
};

export const getItemBySlug = (slug: string): Item =>
  items.find((i) => i.slug === slug) ?? buildFallbackItem(slug);
