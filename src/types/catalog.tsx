import livingRoom from "@/assets/catalo-livinroom.png";
export type CatalogCategory =
  | "living-rooms"
  | "dining-rooms"
  | "bedrooms"
  | "outdoor-spaces"
  | "home-office"
  | "public-spaces";

export interface CatalogCategoryMeta {
  slug: CatalogCategory;
  label: string;
  title: string;
  titleItalic: string;   // kata italic di judul
  description: string;
}

export interface CatalogItem {
  id: string;
  slug: string;
  title: string;
  tagline?: string;              // ← NEW: "The Quite of Silences"
  aboutTitle?: string;           // ← NEW: "A space of calm"
  category: CatalogCategory;
  taxonomy: string;       // "Modern" | "Minimalist" | "Luxury" dst
  description: string;
  coverImage?: string;
  cover_image?: string; 
  galleryImages?: string[];
  featured?: boolean;
}
export interface CatalogScene {
  id: number;
  catalog_id: number;
  scene_key: string;
  image: string;
  alt?: string | null;
  order: number;
}
export const CATALOG_TAXONOMIES = [
  "All",
  "Modern",
  "Minimalist",
  "Luxury",
  "Contemporary",
  "Japandi",
  "Scandinavian",
  "Industrial",
  "Classic",
] as const;

export type CatalogTaxonomy = typeof CATALOG_TAXONOMIES[number];

export const CATALOG_CATEGORIES: CatalogCategoryMeta[] = [
  {
    
    slug: "living-rooms",
    label: "Living Rooms",
    title: "Living",
    titleItalic: "Rooms",
    description:
      "Explore carefully curated living spaces designed to balance comfort, sophistication, and timeless elegance.",
  },
  {
    slug: "dining-rooms",
    label: "Dining Rooms",
    title: "Dining",
    titleItalic: "Rooms",
    description:
      "Meticulously designed dining spaces that transform every meal into a memorable occasion.",
  },
  {
    slug: "bedrooms",
    label: "Bedrooms",
    title: "Bed",
    titleItalic: "rooms",
    description:
      "Private sanctuaries of rest and restoration — designed to envelop you in calm and comfort.",
  },
  {
    slug: "outdoor-spaces",
    label: "Outdoor Spaces",
    title: "Outdoor",
    titleItalic: "Spaces",
    description:
      "Curated outdoor environments that extend the home into the open air with the same care and intention.",
  },
  {
    slug: "home-office",
    label: "Home Office",
    title: "Home",
    titleItalic: "Office",
    description:
      "Productive, inspiring workspaces designed to bring the same standard of design to where you work.",
  },
  {
    slug: "public-spaces",
    label: "Public Spaces",
    title: "Public",
    titleItalic: "Spaces",
    description:
      "Commercial and hospitality interiors that create extraordinary environments for people to inhabit.",
  },
];

// Static seed data — ganti dengan API call nanti
export const CATALOG_ITEMS: CatalogItem[] = [
  { id:"1", slug:"serenity-suite", title:"Serenity Suite", tagline: "The Quite of Silences", aboutTitle: "A space of calm", category:"living-rooms", taxonomy:"Minimalist", description:"Clean planes and warm natural textures coexist in perfect harmony." },
  { id:"2", slug:"grand-salon", title:"The Grand Salon", tagline: "Opulent proportions", aboutTitle: "Timeless elegance", category:"living-rooms", taxonomy:"Luxury", description:"Opulent proportions, velvet drapes, and bespoke joinery define this extraordinary space." },
  { id:"3", slug:"nordic-quiet", title:"Nordic Quiet", tagline: "Restrained beauty", aboutTitle: "Nordic simplicity", category:"living-rooms", taxonomy:"Scandinavian", description:"Restrained beauty expressed through honest materials: oak, wool, and diffused northern light." },
  { id:"4", slug:"urban-loft", title:"Urban Loft", tagline: "Industrial vernacular", aboutTitle: "Raw and refined", category:"living-rooms", taxonomy:"Industrial", description:"Exposed structure and considered craft — the industrial vernacular reimagined." },
  { id:"5", slug:"kyoto-residence", title:"Kyoto Residence", tagline: "East meets north", aboutTitle: "Meditative living", category:"living-rooms", taxonomy:"Japandi", description:"Wabi-sabi philosophy meets Scandinavian functionalism in this meditative living composition." },
  { id:"6", slug:"contemporary-edit", title:"Contemporary Edit", tagline: "Curated precisely", aboutTitle: "Editorial precision", category:"living-rooms", taxonomy:"Contemporary", description:"A curated selection of contemporary pieces arranged with editorial precision." },
  { id:"7", slug:"casa-moderna", title:"Casa Moderna", tagline: "Geometric clarity", aboutTitle: "Modern expression", category:"living-rooms", taxonomy:"Modern", description:"Clean geometry and material contrast create a striking, liveable modern interior." },
  { id:"8", slug:"heritage-hall", title:"Heritage Hall", tagline: "Enduring beauty", aboutTitle: "Timeless craft", category:"living-rooms", taxonomy:"Classic", description:"Timeless proportions and heirloom-quality craftsmanship celebrate enduring beauty." },
  { id:"9", slug:"long-table", title:"The Long Table", tagline: "Where gathering becomes ritual", aboutTitle: "Dining reimagined", category:"dining-rooms", taxonomy:"Minimalist", description:"A statement dining table anchors this pared-back space where gathering becomes ritual." },
  { id:"10", slug:"dine-refine", title:"Dine & Refine", tagline: "The theatre of dining", aboutTitle: "Formal elegance", category:"dining-rooms", taxonomy:"Luxury", description:"Silk drapery, marble surfaces, and candlelight — the theatre of the formal dining room." },
  { id:"11", slug:"bistro-mode", title:"Bistro Mode", tagline: "Casual sophistication", aboutTitle: "Easy living", category:"dining-rooms", taxonomy:"Contemporary", description:"Relaxed sophistication with an easy, convivial atmosphere for everyday dining." },
  { id:"12", slug:"harvest-table", title:"Harvest Table", tagline: "Gatherings around wood", aboutTitle: "Warmth and welcome", category:"dining-rooms", taxonomy:"Classic", description:"An inviting dining room built around a reclaimed oak harvest table." },
  { id:"13", slug:"cloud-room", title:"The Cloud Room", tagline: "All-white sanctuary", aboutTitle: "Layers of texture", category:"bedrooms", taxonomy:"Minimalist", description:"An all-white sanctuary with layers of texture — linen, bouclé, and waffle weave." },
  { id:"14", slug:"maison-suite", title:"Maison Suite", tagline: "Hotel-inspired comfort", aboutTitle: "Private retreat", category:"bedrooms", taxonomy:"Luxury", description:"A private hotel suite for the home: upholstered headboard, bespoke bedside tables, blackout drapery." },
  { id:"15", slug:"zen-retreat", title:"Zen Retreat", tagline: "Eastern calm", aboutTitle: "Peaceful rest", category:"bedrooms", taxonomy:"Japandi", description:"Tatami-inspired flooring, a low-profile platform bed, and a single ikebana arrangement." },
  { id:"16", slug:"nordic-nest", title:"Nordic Nest", tagline: "Soft northern light", aboutTitle: "Hygge bedroom", category:"bedrooms", taxonomy:"Scandinavian", description:"Soft lighting, natural wool, and a palette of grey, pine, and cream." },
  { id:"17", slug:"terrace-garden", title:"Terrace Garden", tagline: "Outdoor living room", aboutTitle: "Sky and planting", category:"outdoor-spaces", taxonomy:"Contemporary", description:"A rooftop terrace designed as an outdoor living room — shelter, lounge, and planting." },
  { id:"18", slug:"villa-loggia", title:"Villa Loggia", tagline: "Italian inspiration", aboutTitle: "Shaded retreat", category:"outdoor-spaces", taxonomy:"Classic", description:"Inspired by the Italian loggia: shaded colonnade, stone floors, weathered terracotta." },
  { id:"19", slug:"forest-deck", title:"Forest Deck", tagline: "Hovering in nature", aboutTitle: "Timber and garden", category:"outdoor-spaces", taxonomy:"Modern", description:"Cantilevered timber deck hovering above a lush garden, furnished with teak and outdoor textiles." },
  { id:"20", slug:"the-study", title:"The Study", tagline: "Gentleman's library", aboutTitle: "Leather and books", category:"home-office", taxonomy:"Classic", description:"Panelled walls, a leather-topped desk, and built-in bookcases — the gentleman's study reimagined." },
  { id:"21", slug:"studio-minimal", title:"Studio Minimal", tagline: "Clear focus", aboutTitle: "Minimal distraction", category:"home-office", taxonomy:"Minimalist", description:"A floating desk, a single task light, and uninterrupted space to think." },
  { id:"22", slug:"creative-lab", title:"Creative Lab", tagline: "Raw materiality", aboutTitle: "Open and inspiring", category:"home-office", taxonomy:"Industrial", description:"Open shelving, a standing desk, and raw materiality for the creative professional." },
  { id:"23", slug:"hotel-lobby", title:"Hotel Lobby", tagline: "Grand arrival", aboutTitle: "First impression", category:"public-spaces", taxonomy:"Luxury", description:"A grand arrival — double-height ceilings, curated art, and a signature fragrance." },
  { id:"24", slug:"restaurant-interior", title:"Restaurant Interior", tagline: "Intimate and warm", aboutTitle: "Dining theatre", category:"public-spaces", taxonomy:"Contemporary", description:"Intimate dining atmosphere balanced between theatre and warmth." },
  { id:"25", slug:"corporate-sanctuary", title:"Corporate Sanctuary", tagline: "Next-generation workspace", aboutTitle: "Attract and inspire", category:"public-spaces", taxonomy:"Modern", description:"Next-generation workspace lobby designed to attract, inspire, and retain talent." },
];

export interface Taxonomy {
  id: string;
  slug: string;
  name: string;
  type?: "style" | "category";
}

export interface CatalogCategoryEntity {
  id: string;
  slug: string;
  label: string;
  title?: string;
  titleItalic?: string;
  description?: string;
}

export interface Catalog {
  id: string;
  slug: string;
  title: string;
  tagline?: string;                    // ← NEW
  about_title?: string;                // ← NEW (snake_case from API)
  description: string;

  coverImage?: string;
  galleryImages?: string[];

  featured?: boolean;

  category:
    | CatalogCategory
    | CatalogCategoryEntity;

  taxonomy?:
    | string
    | Taxonomy
    | Taxonomy[];
}

export interface CatalogResponse {
  data: Catalog[];

  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };

  links?: {
    next?: string;
    prev?: string;
  };
}