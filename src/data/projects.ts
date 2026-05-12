import hotel from "@/assets/harmony/harmony-1-depan.png";
import residential from "@/assets/am-house/am-house.png";
import office from "@/assets/sinarmas/flytek-sinarmas.png";
import harmonyLobby1 from "@/assets/harmonylobby.png";
import harmonyLobby2 from "@/assets/harmony/lounge-harmony.png";
import harmonyLobby3 from "@/assets/harmony/president-suite-harmony.png";
import amLiving from "@/assets/am-house/am-house-living.png";
import amOffice from "@/assets/am-house/am-house-office.png";
import amFoyer from "@/assets/am-house/am-house-foyer.png";
import cihampelas from "@/assets/cihampelas/house-cihampelas.png";
import cihampelasLiving from "@/assets/cihampelas/living-room.png";
import cihampelasKitchen from "@/assets/cihampelas/kitchen.png";

export interface ProjectSlide {
  title: string;
  image: string;
  items: string[];
}

export interface Project {
  slug: string;
  name: string;
  category: string;
  location: string;
  year: string;
  scope: string;

  img: string;
  span: string;
  description: string;
  slides: ProjectSlide[];
}

export const projects: Project[] = [
  {
    slug: "harmony-one",
    name: "Harmony One",
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
        title: "Harmony One — Lobby",
        image: harmonyLobby1,
        items: ["Modular Sofa", "Boucle Sofa", "Coffee Table", "Curved Ottoman"],
      },
      {
        title: "Harmony One — Lounge",
        image: harmonyLobby2,
        items: ["Boucle Lounge Sofa", "Leather Lounge Chair", "Marble Coffee Table"],
      },
      {
        title: "Harmony One — President Suite",
        image: harmonyLobby3,
        items: ["Olive Swivel Chair", "Brass Drum Coffee Table", "Boucle Sofa"],
      },
    ],
  },
  {
    slug: "am-house",
    name: "Project Pantai Indah Kapuk",
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
        title: "AM House — Living Room",
        image: residential,
        items: ["Lounge Sofa", "Accent Chair", "Side Table", "Floor Lamp", "Ottoman"],
      },
      {
        title: "AM House — Living Room & Dining Room ",
        image: amLiving,
        items: ["Modular Sofa", "Wingback Lounge Chair", "Swivel Tub Chair", "Round Coffee Table"],
      },
      {
        title: "AM House — Working Room",
        image: amOffice,
        items: ["Executive Desk", "Dining Table", "Upholstered Dining Chair", "Sculptural Pendant Light"],
      },
      {
        title: "AM House — Foyer",
        image: amFoyer,
        items: ["Fluted Accent Chair", "Pedestal Side Table", "Marble Plinth", "Round Area Rug"],
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
        title: "House Cihampelas — Façade & Garden",
        image: cihampelas,
        items: ["Outdoor Lounge Chair", "Round Coffee Table", "Modular Sofa", "Floor Lamp"],
      },
      {
        title: "House Cihampelas — Living Room",
        image: cihampelasLiving,
        items: ["Freyja Sofa", "Dwarf Sofa", "Coffee Table"],
      },
      {
        title: "House Cihampelas — Kitchen",
        image: cihampelasKitchen,
        items: ["Kitchen Cabinet", "Marble Countertop", "Pendant Light"],
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
        items: ["Arm Chair", "Console Table", "Pendant Light", "Side Table", "Floor Lamp"],
      },
    ],
  },
];

export const getProjectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
