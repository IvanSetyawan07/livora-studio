import decorative from "@/assets/scope-deocrative.png";
import furniture from "@/assets/scope-furniture.jpg";
import contractor from "@/assets/scope-contractor.jpg";
import materials from "@/assets/scope-materials.jpg";

export interface ScopeItem {
  number: string;
  title: string;
  description: string;
  image: string;
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
    href: "/projects",
    featured: true,
    ctaLabel: "See All Projects",
    ctaUrl: "livora.studio/interior",
  },
  {
    number: "02",
    title: "Loose Furniture",
    description:
      "Furniture is more than function — it is the quiet language of a room. We curate pieces of uncompromising craftsmanship, where every curve, grain and stitch invites you to slow down.",
    image: furniture,
    href: "/furniture",
  },
  {
    number: "03",
    title: "Interior Contractor & Architecture",
    description:
      "Precision is our promise. From blueprint to final brushstroke, our team builds with disciplined hands and watchful eyes — shaping spaces that hold beauty in every detail.",
    image: contractor,
    href: "/projects",
  },
  {
    number: "04",
    title: "Material Innovation, Accessories & Fittings",
    description:
      "We source materials and fittings with a connoisseur's eye — innovative, enduring, quietly remarkable. The pieces we choose today define a space for years to come.",
    image: materials,
    href: "/catalog",
    featured: true,
    ctaLabel: "See All Projects",
    ctaUrl: "livora.architechture/materials",
  },
];
