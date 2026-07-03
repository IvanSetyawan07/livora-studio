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
  image?: string; // optional URL (for admin-created items)
  apiId?: number; // backend id for analytics tracking
}

export const items: Item[] = [
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
