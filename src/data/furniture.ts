export type FurnitureCategory =
  | "Chair"
  | "Table"
  | "Sofa"
  | "Bed"
  | "Accessories"
  | "Custom";

export interface FurnitureProduct {
  id: string;
  name: string;
  category: FurnitureCategory;
  short: string;
  description: string;
  dimensions: string;
  material: string;
  price: number; // 0 = inquiry only
  isCustom?: boolean;
}

export const furnitureProducts: FurnitureProduct[] = [
  {
    id: "nordic-dining-chair",
    name: "Nordic Dining Chair",
    category: "Chair",
    short: "Minimalist solid wood",
    description:
      "A clean-lined dining chair crafted from solid oak with a sculpted backrest for everyday comfort.",
    dimensions: "45 × 50 × 84 cm",
    material: "Solid Oak, Natural Oil Finish",
    price: 1_200_000,
  },
  {
    id: "work-chair",
    name: "Work Chair",
    category: "Chair",
    short: "Ergonomic design, adjustable height",
    description:
      "A comfortable work chair with ergonomic support and adjustable height settings.",
    dimensions: "80 × 85 × 90 cm",
    material: "Full-Grain Leather, Solid Wood Frame",
    price: 3_500_000,
  },
  {
    id: "lounge-armchair",
    name: "Lounge Armchair",
    category: "Chair",
    short: "Cushioned fabric seat",
    description:
      "A generously cushioned armchair upholstered in soft linen blend — designed for slow afternoons.",
    dimensions: "78 × 82 × 88 cm",
    material: "Hardwood Frame, Linen Blend Upholstery",
    price: 2_500_000,
  },
  {
    id: "bar-stool",
    name: "Bar Stool",
    category: "Chair",
    short: "Modern metal legs",
    description:
      "A counter-height stool with powder-coated metal legs and a contoured wooden seat.",
    dimensions: "40 × 40 × 75 cm",
    material: "Powder-coated Steel, Solid Ash Seat",
    price: 850_000,
  },
  {
    id: "oval-dining-table",
    name: "Oval Dining Table",
    category: "Table",
    short: "Solid teak, seats 6",
    description:
      "An oval dining table in solid teak — soft edges encourage gathering and conversation.",
    dimensions: "200 × 100 × 75 cm",
    material: "Solid Teak, Matte Sealer",
    price: 4_500_000,
  },
  {
    id: "coffee-table",
    name: "Coffee Table",
    category: "Table",
    short: "Low profile walnut finish",
    description:
      "A low coffee table in warm walnut finish, balanced proportions for living room centerpieces.",
    dimensions: "120 × 60 × 38 cm",
    material: "Engineered Wood, Walnut Veneer",
    price: 1_800_000,
  },
  {
    id: "study-desk",
    name: "Study Desk",
    category: "Table",
    short: "Minimalist with drawer",
    description:
      "A focused workspace with a single soft-close drawer and slim tapered legs.",
    dimensions: "120 × 60 × 75 cm",
    material: "Solid Ash, Natural Finish",
    price: 2_200_000,
  },
  {
    id: "l-shape-sectional",
    name: "L-Shape Sectional",
    category: "Sofa",
    short: "Premium fabric, modular",
    description:
      "A modular L-shape sectional with deep seats — reconfigurable to suit any living layout.",
    dimensions: "280 × 180 × 82 cm",
    material: "Kiln-dried Frame, Premium Fabric",
    price: 8_500_000,
  },
  {
    id: "two-seater-sofa",
    name: "2-Seater Sofa",
    category: "Sofa",
    short: "Scandinavian style",
    description:
      "A compact two-seater with clean tailoring and exposed timber legs.",
    dimensions: "165 × 88 × 80 cm",
    material: "Hardwood Frame, Wool Blend",
    price: 5_200_000,
  },
  {
    id: "queen-bed-frame",
    name: "Queen Bed Frame",
    category: "Bed",
    short: "Solid wood headboard",
    description:
      "A queen-size bed frame with a tall solid wood headboard and slatted base.",
    dimensions: "165 × 215 × 110 cm",
    material: "Solid Mahogany, Natural Stain",
    price: 3_800_000,
  },
  {
    id: "platform-bed",
    name: "Platform Bed",
    category: "Bed",
    short: "Low profile, Japanese style",
    description:
      "A grounded platform bed with subtle floating edge — calm and architectural.",
    dimensions: "200 × 220 × 35 cm",
    material: "Solid Oak, Matte Oil Finish",
    price: 4_100_000,
  },
  {
    id: "bookshelf",
    name: "Bookshelf",
    category: "Accessories",
    short: "5-tier open shelf",
    description:
      "A five-tier open shelf — versatile storage that doubles as a quiet display piece.",
    dimensions: "90 × 32 × 180 cm",
    material: "Engineered Wood, Walnut Veneer",
    price: 1_500_000,
  },
  {
    id: "side-table-set",
    name: "Side Table Set",
    category: "Accessories",
    short: "Set of 2 nesting tables",
    description:
      "A pair of nesting side tables with rounded tops — flexible for any seating arrangement.",
    dimensions: "Ø45 × 50 cm / Ø38 × 45 cm",
    material: "Solid Ash, Natural Finish",
    price: 1_100_000,
  },
  {
    id: "custom-morus",
    name: "Custom Morus",
    category: "Custom",
    short: "Design your own piece",
    description:
      "Commission a one-of-a-kind piece. Share your dimensions, materials, and finish — we'll craft to your brief.",
    dimensions: "Made to your specification",
    material: "Material of your choice",
    price: 0,
    isCustom: true,
  },
];

export const categories: ("All" | FurnitureCategory)[] = [
  "All",
  "Chair",
  "Table",
  "Sofa",
  "Bed",
  "Accessories",
  "Custom",
];

export const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
