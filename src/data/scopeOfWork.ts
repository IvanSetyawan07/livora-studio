import decorative from "@/assets/scope-deocrative.webp";
import furniture from "@/assets/scope-furniture.webp";
import contractor from "@/assets/scope-contractor.webp";
import materials from "@/assets/scope-materials.webp";
import decorativeSm from "@/assets/_opt/scope-deocrative-800.webp";
import furnitureSm from "@/assets/_opt/scope-furniture-800.webp";
import contractorSm from "@/assets/_opt/scope-contractor-800.webp";
import materialsSm from "@/assets/_opt/scope-materials-800.webp";

export interface ScopeItem {
  number: string;
  title: string;
  description: string;
  image: string;
  imageSm: string;
  width: number;
  height: number;
  href?: string;
  featured?: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
}

export const scopeItems: ScopeItem[] = [
  {
    number: "01",
    title: "Decorative Interior",
    description:
      "Every room has a story waiting to be told. We craft interior concepts that transform bare walls and empty floors into spaces that breathe — designed around your life, your taste, and your vision.",
    image: decorative,
    imageSm: decorativeSm,
    width: 1672,
    height: 941,
    // href: "/projects",
    // featured: true,
    // ctaLabel: "See All Projects",
    // ctaUrl: "livora.architechture/interior",
  },
  {
    number: "02",
    title: "Loose Furniture",
    description:
      "Furniture is more than function — it is the quiet language of a room. We curate pieces of uncompromising craftsmanship, where every curve, grain and stitch invites you to slow down.",
    image: furniture,
    imageSm: furnitureSm,
    width: 1280,
    height: 896,
    href: "/furniture",
  },
  {
    number: "03",
    title: "Interior Contractor & Architecture",
    description:
      "Precision is our promise. From blueprint to final brushstroke, our team builds with disciplined hands and watchful eyes — shaping spaces that hold beauty in every detail.",
    image: contractor,
    imageSm: contractorSm,
    width: 1536,
    height: 1024,
    href: "/projects",
  },
  {
    number: "04",
    title: "Material Innovation, Accessories & Fittings",
    description:
      "We source materials and fittings with a connoisseur's eye — innovative, enduring, quietly remarkable. The pieces we choose today define a space for years to come.",
    image: materials,
    imageSm: materialsSm,
    width: 1732,
    height: 1385,
    href: "/catalog",
    featured: true,
    ctaLabel: "See All Projects",
    ctaUrl: "livora.architechture/materials",
  },
];
