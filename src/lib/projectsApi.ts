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

  // Prioritas gambar: static local → storage Laravel → fallback
  const hero = staticMatch?.img
    || (p.hero_image?.startsWith("/storage/") ? imgUrl(p.hero_image) : null)
    || FALLBACK_IMG;

  // Prioritas slides: kalau ada photos dari API, pakai tapi ambil gambar dari static dulu
  // Kalau tidak ada photos, pakai slides static
  const slides = (p.photos ?? []).length > 0
    ? (p.photos ?? []).map((ph, i) => ({
        title: ph.title ?? p.title,
        image: staticMatch?.slides?.[i]?.image || imgUrl(ph.image) || hero,
        items: (ph.items ?? []).map((it) => it.title),
      }))
    : (staticMatch?.slides ?? []);

  return {
    slug: p.slug,
    name: p.title,
    subtitle: p.subtitle ?? staticMatch?.subtitle ?? "",
    category: p.scope?.name ?? staticMatch?.category ?? "Project",
    location: p.location ?? staticMatch?.location ?? "",
    year: p.year ?? staticMatch?.year ?? "",
    scope: p.scope?.name ?? staticMatch?.scope ?? "",
    img: hero,
    span: staticMatch?.span ?? "md:col-span-4 aspect-[4/5]",
    description: p.description ?? staticMatch?.description ?? "",
    slides,
    apiId: p.id,
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

  // Fetch semua project — API sebagai sumber utama
  api.get<ApiProject[]>("/projects").then((r) => {
    if (r.data.length > 0) {
      // Pakai data API, tapi enriched dengan data static (gambar, slides, dll)
      cachedAll = r.data.map(mapApiProject);
    } else {
      // Fallback ke static kalau API kosong
      cachedAll = staticProjects;
    }
    notify();
  }).catch(() => {
    // Kalau API error, fallback ke static
    cachedAll = staticProjects;
    notify();
  });

  // Fetch highlights
  api.get<ApiProject[]>("/landing/highlights").then((r) => {
    if (!r.data.length) return;
    cachedHighlights = r.data.map((p) => {
      const mapped = mapApiProject(p);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .get<ApiProject>(`/projects/${slug}`)
      .then((r) => setProject(mapApiProject(r.data)))
      .catch(() => setProject(fromStatic ?? undefined))
      .finally(() => setLoading(false));
  }, [slug]);

  return { project, loading };
};