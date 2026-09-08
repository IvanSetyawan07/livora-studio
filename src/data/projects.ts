export interface ProjectSlide {
  title: string;
  image: string;
  items: string[];
}

export interface Project {
  slug: string;
  name: string;
  subtitle?: string;
  category: string;
  location: string;
  year: string;
  scope: string;
  img: string;
  span: string;
  description: string;
  slides: ProjectSlide[];
  apiId?: number;
  heroFocusX?: number;
  heroFocusY?: number;
  heroZoom?: number;
}

export const projects: Project[] = [];

export const getProjectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
