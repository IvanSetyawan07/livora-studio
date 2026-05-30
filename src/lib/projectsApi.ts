import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { projects as staticProjects, type Project } from "@/data/projects";

interface ApiPhoto {
  id: number;
  title?: string | null;
  image?: string | null;
  caption?: string | null;
  items?: { id: number; title: string }[];
}
interface ApiProject {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  location?: string | null;
  year?: string | null;
  hero_image?: string | null;
  is_highlighted?: boolean;
  sort_order?: number;
  scope?: { id: number; name: string; slug: string } | null;
  photos?: ApiPhoto[];
}

const FALLBACK_IMG = "/placeholder.svg";

export const mapApiProject = (p: ApiProject): Project => {
  const hero = imgUrl(p.hero_image) || FALLBACK_IMG;
  const slides =
    (p.photos ?? []).map((ph) => ({
      title: ph.title ? `${p.title} — ${ph.title}` : p.title,
      image: imgUrl(ph.image) || hero,
      items: (ph.items ?? []).map((it) => it.title),
    })) ?? [];

  return {
    slug: p.slug,
    name: p.title,
    category: p.scope?.name ?? "Project",
    location: p.location ?? "",
    year: p.year ?? "",
    scope: p.scope?.name ?? "",
    img: hero,
    span: "md:col-span-4 aspect-[4/5]",
    description: p.description ?? "",
    slides,
  };
};

const mergeBySlug = (a: Project[], b: Project[]) => {
  const seen = new Set<string>();
  const out: Project[] = [];
  for (const p of [...a, ...b]) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    out.push(p);
  }
  return out;
};

export const useAllProjects = () => {
  const [list, setList] = useState<Project[]>(staticProjects);
  useEffect(() => {
    api
      .get<ApiProject[]>("/projects")
      .then((r) => setList(mergeBySlug(staticProjects, r.data.map(mapApiProject))))
      .catch(() => {});
  }, []);
  return list;
};

export const useHighlightProjects = () => {
  const [list, setList] = useState<Project[]>(staticProjects.slice(0, 3));
  useEffect(() => {
    api
      .get<ApiProject[]>("/landing/highlights")
      .then((r) => {
        const api = r.data.map(mapApiProject);
        if (api.length) setList(api.slice(0, 3));
      })
      .catch(() => {});
  }, []);
  return list;
};

export const useProjectBySlug = (slug?: string) => {
  const fromStatic = slug ? staticProjects.find((p) => p.slug === slug) : undefined;
  const [project, setProject] = useState<Project | undefined>(fromStatic);
  const [loading, setLoading] = useState(!fromStatic);

  useEffect(() => {
    if (!slug) return;
    if (fromStatic) {
      setProject(fromStatic);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<ApiProject>(`/projects/${slug}`)
      .then((r) => setProject(mapApiProject(r.data)))
      .catch(() => setProject(undefined))
      .finally(() => setLoading(false));
  }, [slug, fromStatic]);

  return { project, loading };
};
