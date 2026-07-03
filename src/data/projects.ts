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
import cihampelasLiving2 from "@/assets/cihampelas/living-area.png";
import cihampelasLivingRoom from "@/assets/cihampelas/living-room1.png";
import cihampelasFoyer from "@/assets/cihampelas/foyer.png";
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
];

export const getProjectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
