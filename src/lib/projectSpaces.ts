import { api } from "@/lib/api";

export interface RoomHotspot {
  id?: number;
  label: string;
  x: number;
  y: number;
  item_slug?: string | null;
  description?: string | null;
  image?: string | null;
}

export interface RoomSpec {
  label: string;
  value: string;
}

export interface ProjectRoom {
  id?: number;
  title: string;
  area?: string | null;
  description?: string | null;
  specs?: RoomSpec[] | null;
  image?: string | null;
  sort_order?: number;
  hotspots?: RoomHotspot[];
}

export interface ProjectLayout {
  id?: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image?: string | null;
  sort_order?: number;
  rooms?: ProjectRoom[];
}

export const fetchProjectLayouts = async (projectId: number | string) => {
  const r = await api.get<ProjectLayout[]>(`/projects/${projectId}/layouts`);
  return r.data ?? [];
};
