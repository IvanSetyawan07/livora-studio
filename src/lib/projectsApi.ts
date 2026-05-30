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
  const staticMatch = staticProjects.find((s) => s.slug === p.slug);
  const isValidStoragePath = p.hero_image?.startsWith("/storage/");
  const hero = (isValidStoragePath ? imgUrl(p.hero_image) : null)
    || staticMatch?.img
    || FALLBACK_IMG;

  const slides = (p.photos ?? []).map((ph) => ({
    title: ph.title ? `${p.title} — ${ph.title}` : p.title,
    image: imgUrl(ph.image) || hero,
    items: (ph.items ?? []).map((it) => it.title),
  }));

  return {
    slug: p.slug,
    name: p.title,
    category: p.scope?.name ?? staticMatch?.category ?? "Project",
    location: p.location ?? staticMatch?.location ?? "",
    year: p.year ?? staticMatch?.year ?? "",
    scope: p.scope?.name ?? staticMatch?.scope ?? "",
    img: hero,
    span: staticMatch?.span ?? "md:col-span-4 aspect-[4/5]",
    description: p.description ?? staticMatch?.description ?? "",
    slides: slides.length ? slides : (staticMatch?.slides ?? []),
  };
};

// Satu store terpusat agar semua hook sinkron
let cachedAll: Project[] = staticProjects;
let cachedHighlights: Project[] = staticProjects.slice(0, 3);
const listeners = new Set<() => void>();
let fetched = false;

const notify = () => listeners.forEach((fn) => fn());

const fetchAll = () => {
  if (fetched) return;
  fetched = true;

  // Fetch semua project
  api.get<ApiProject[]>("/projects").then((r) => {
    const apiProjects = r.data.map(mapApiProject);
    const seen = new Set(staticProjects.map((p) => p.slug));
    const extras = apiProjects.filter((p) => !seen.has(p.slug));
    cachedAll = [...staticProjects, ...extras];
    notify();
  }).catch(() => {});

  // Fetch highlights — resolve img dari cachedAll atau static
  api.get<ApiProject[]>("/landing/highlights").then((r) => {
    if (!r.data.length) return;
    cachedHighlights = r.data.map((p) => {
      const mapped = mapApiProject(p);
      // Ambil img dari static jika tersedia
      const staticMatch = staticProjects.find((s) => s.slug === p.slug);
      return staticMatch ? { ...mapped, img: staticMatch.img } : mapped;
    }).slice(0, 3);
    notify();
  }).catch(() => {});
};

export const useAllProjects = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    listeners.add(rerender);
    fetchAll();
    return () => { listeners.delete(rerender); };
  }, []);
  return cachedAll;
};

export const useHighlightProjects = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    listeners.add(rerender);
    fetchAll();
    return () => { listeners.delete(rerender); };
  }, []);
  return cachedHighlights;
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