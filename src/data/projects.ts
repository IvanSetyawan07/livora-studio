import hotel__asset from "@/assets/harmony/harmony-1-depan.png.asset.json";
const hotel = hotel__asset.url;
import residential__asset from "@/assets/am-house/am-house.png.asset.json";
const residential = residential__asset.url;
import office__asset from "@/assets/sinarmas/flytek-sinarmas.png.asset.json";
const office = office__asset.url;
import harmonyLobby1__asset from "@/assets/harmonylobby.png.asset.json";
const harmonyLobby1 = harmonyLobby1__asset.url;
import harmonyLobby2__asset from "@/assets/harmony/lounge-harmony.png.asset.json";
const harmonyLobby2 = harmonyLobby2__asset.url;
import harmonyLobby3__asset from "@/assets/harmony/president-suite-harmony.png.asset.json";
const harmonyLobby3 = harmonyLobby3__asset.url;
import amLiving__asset from "@/assets/am-house/am-house-living.png.asset.json";
const amLiving = amLiving__asset.url;
import amOffice__asset from "@/assets/am-house/am-house-office.png.asset.json";
const amOffice = amOffice__asset.url;
import amFoyer__asset from "@/assets/am-house/am-house-foyer.png.asset.json";
const amFoyer = amFoyer__asset.url;
import cihampelas__asset from "@/assets/cihampelas/house-cihampelas.png.asset.json";
const cihampelas = cihampelas__asset.url;
import cihampelasLiving__asset from "@/assets/cihampelas/living-room.png.asset.json";
const cihampelasLiving = cihampelasLiving__asset.url;
import cihampelasKitchen__asset from "@/assets/cihampelas/kitchen.png.asset.json";
const cihampelasKitchen = cihampelasKitchen__asset.url;
import cihampelasLiving2__asset from "@/assets/cihampelas/living-area.png.asset.json";
const cihampelasLiving2 = cihampelasLiving2__asset.url;
import cihampelasLivingRoom__asset from "@/assets/cihampelas/living-room1.png.asset.json";
const cihampelasLivingRoom = cihampelasLivingRoom__asset.url;
import cihampelasFoyer__asset from "@/assets/cihampelas/foyer.png.asset.json";
const cihampelasFoyer = cihampelasFoyer__asset.url;
export interface ProjectSlide {
  title: string;
  image: string;
  items: string[];
}

export interface Project {
  slug: string;
  name: string;
  subtitle?: string;  // ← tambah ini
  category: string;
  location: string;
  year: string;
  scope: string;
  img: string;
  span: string;
  description: string;
  slides: ProjectSlide[];
  apiId?: number; // backend id for analytics tracking
}

export const projects: Project[] = [
  {
    slug: "harmoni-one",
    name: "Harmoni One",
    category: "Hotel",
    location: "Batam, Indonesia",
    year: "2026",
    scope: "Interior Design, Furniture, Construction",

    img: hotel,
    span: "md:col-span-7 md:row-span-2 aspect-[4/5] md:aspect-auto",
    description:
      "A serene hospitality retreat where warm timber, soft stone, and considered light meet. Every corridor and lounge has been composed to slow the pace of arrival, inviting guests into a sense of quiet luxury that lingers long after departure.",
    slides: [
      {
        title: "Harmoni One — Lobby",
        image: harmonyLobby1,
        items: ["Modular Sofa", "Tubular Curved Sofa", "Coffee Table", "Curved Ottoman", "Barrel Chair"],
      },
      {
        title: "Harmoni One — Lounge",
        image: harmonyLobby2,
        items: ["Boucle Lounge Sofa", "Leather Lounge Chair", "Marble Coffee Table", "Executive Lounge Chair"],
      },
      {
        title: "Harmoni One — President Suite",
        image: harmonyLobby3,
        items: ["Swivel Accent Chair", "Brass Drum Coffee Table", "Boucle Sofa"],
      },
    ],
  },
  {
    slug: "am-house",
    name: "Project House PIK II",
    category: "Residential",
    location: "PIK 2, Jakarta",
    year: "2026",
    scope: "Interior Design, Furniture, Construction",
    img: residential,
    span: "md:col-span-5 aspect-[4/3]",
    description:
      "A private family residence designed around natural light and intimate gathering. Layered neutrals, sculpted millwork, and curated furniture pieces give the home a timeless calm — equal parts editorial and lived-in.",
    slides: [
      {
        title: "Project House PIK II — Living Room",
        image: residential,
        items: ["Modular Sectional Sofa", "Accent Chair", "Side Table", "Wooden Lounge Chair", "Nesting Coffee Tables"],
      },
      {
        title: "Project House PIK II — Living Room & Dining Room ",
        image: amLiving,
        items: ["Sage Modular Sectional Sofa", "Tan Leather Swivel Wingback Chair", "Pleated Dining Chair", "Nesting Coffee Tables"],
      },
      {
        title: "Project House PIK II — Working Room",
        image: amOffice,
        items: ["Work Chair", "White Table", "White Chair", "Coco Chair"],
      },
      {
        title: "Project House PIK II — Foyer",
        image: amFoyer,
        items: ["Coco Table", "Coco Chair"],
      },
    ],
  },
  {
    slug: "house-cihampelas",
    name: "House Cihampelas",
    category: "Residential",
    location: "Cihampelas, Bandung",
    year: "2026",
    scope: "Interior Design, Furniture, Construction",
    img: cihampelas,
    span: "md:col-span-5 aspect-[4/3]",
    description:
      "A contemporary two-storey residence framed by lush tropical greenery. Expansive glazing, warm timber accents, and considered outdoor living spaces blur the line between architecture and garden — quiet, modern, and unmistakably Bandung.",
    slides: [
      
      {
        title: "House Cihampelas — Living Area",
        image: cihampelasLiving2,
        items: ["Dwarf Sofa", "Living Room Table", "Three-Seat Sofa"],
      },
      {
        title: "House Cihampelas — Living Room",
        image: cihampelasLiving,
        items: ["Freyja Sofa", "Dwarf Sofa", "Coffee Table"],
      },
      {
        title: "House Cihampelas — Living Room 2",
        image: cihampelasLivingRoom,
        items: ["Valora Wing Chair", "Nesting Coffee Tables", "Milano Sofa"],
      },
      {
        title: "House Cihampelas — Foyer",
        image: cihampelasFoyer,
        items: ["Pedestal Side Table", "Lunara Swivel Chair"],
      },
      {
        title: "House Cihampelas — Kitchen",
        image: cihampelasKitchen,
        items: [],
      },
    ],
  },
  {
    slug: "flytek-sinarmas-tower",
    name: "Flytek Sinarmas Tower",
    category: "Office",
    location: "Jakarta, Indonesia",
    year: "2026",
    scope: "Interior Design, Furniture, Construction",
    img: office,
    span: "md:col-span-5 aspect-[4/3]",
    description:
      "A corporate workplace reimagined as a sequence of refined environments. Tactile materials, soft acoustics, and architectural lighting transform the everyday office into a confident expression of the brand it houses.",
    slides: [
      {
        title: "Flytek Sinarmas Tower — Executive Floor",
        image: office,
        items: [],
      },
    ],
  },
];

export const getProjectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
