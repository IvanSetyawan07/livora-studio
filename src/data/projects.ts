import hotel from "@/assets/project-hotel.jpg";
import residential from "@/assets/project-residential.jpg";
import office from "@/assets/project-office.jpg";
import harmonyLobby1 from "@/assets/harmony-lobby-1.jpg";
import harmonyLobby2 from "@/assets/harmony-lobby-2.jpg";
import harmonyLobby3 from "@/assets/harmony-lobby-3.jpg";
import harmonyLobby4 from "@/assets/harmony-lobby-4.jpg";
import harmonyLobby5 from "@/assets/harmony-lobby-5.jpg";

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
  area: string;
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
    year: "2024",
    scope: "Interior Design, Furniture, Construction",
    area: "1.200 m²",
    img: hotel,
    span: "md:col-span-7 md:row-span-2 aspect-[4/5] md:aspect-auto",
    description:
      "A serene hospitality retreat where warm timber, soft stone, and considered light meet. Every corridor and lounge has been composed to slow the pace of arrival, inviting guests into a sense of quiet luxury that lingers long after departure.",
    slides: [
      {
        title: "Harmony One — Lobby Lounge",
        image: harmonyLobby1,
        items: ["Lounge Sofa", "Arm Chair", "Side Table", "Floor Lamp", "Ottoman"],
      },
      {
        title: "Harmony One — Sectional Suite",
        image: harmonyLobby2,
        items: ["Sectional Sofa", "Ottoman", "Side Table", "Pendant Light", "Console Table"],
      },
      {
        title: "Harmony One — Accent Sofa",
        image: harmonyLobby3,
        items: ["Lounge Sofa", "Accent Chair", "Side Table", "Floor Lamp"],
      },
      {
        title: "Harmony One — Bouclé Ottoman",
        image: harmonyLobby4,
        items: ["Ottoman", "Side Table", "Accent Chair", "Floor Lamp"],
      },
      {
        title: "Harmony One — Swivel Armchair",
        image: harmonyLobby5,
        items: ["Arm Chair", "Side Table", "Floor Lamp", "Console Table"],
      },
    ],
  },
  {
    slug: "am-house",
    name: "AM House",
    category: "Residential",
    location: "PIK 2, Jakarta",
    year: "2024",
    scope: "Interior Design, Furniture, Construction",
    area: "640 m²",
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
    ],
  },
  {
    slug: "flytek-sinarmas-tower",
    name: "Flytek Sinarmas Tower",
    category: "Office",
    location: "Jakarta, Indonesia",
    year: "2024",
    scope: "Interior Design, Furniture, Construction",
    area: "2.400 m²",
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

export const getProjectBySlug = (slug: string) =>
  projects.find((p) => p.slug === slug);
