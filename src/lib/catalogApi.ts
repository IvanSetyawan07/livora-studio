// services/catalogApi.ts

import { api } from './api';
import {
  Catalog,
  CatalogResponse,
  Taxonomy,
  CatalogCategoryEntity,
  CatalogScene,
} from "@/types/catalog";

const API_BASE = '/admin/catalogs';   // create, update, delete (admin)
const API_PUBLIC = '/catalogs';        // get/read (public)
const TAXONOMY_BASE = '/taxonomies';

// ─── HELPER: Build full storage URL ────────────────────────
const buildStorageUrl = (path: string): string => {
  if (!path) return "";
  if (path.startsWith('http')) return path;
  
  const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)
  ?.replace(/\/api\/?$/, "") ?? "http://127.0.0.1:8000";
  
  return `${baseUrl}/storage/${path}`;
};

// ─── PUBLIC CATALOG ENDPOINTS ────────────────────────────────

// GET semua catalogs
export const getAllCatalogs = async (params?: {
  category?: string;
  page?: number;
  per_page?: number;
}): Promise<CatalogResponse> => {
  const response = await api.get<CatalogResponse>(API_PUBLIC, { params });
  return response.data;
};

// GET by category
export const getCatalogsByCategory = async (
  categorySlug: string,
  params?: { page?: number; per_page?: number }
): Promise<CatalogResponse> => {
  const response = await api.get<CatalogResponse>(`${API_PUBLIC}/category/${categorySlug}`, { params });
  return response.data;
};

// GET single catalog by slug + hotspots
export const getCatalogBySlug = async (slug: string): Promise<Catalog & { hotspots?: any[] }> => {
  const response = await api.get<any>(`${API_PUBLIC}/${slug}`);
  return response.data;
};

// GET random catalogs
export const getRandomCatalogs = async (limit: number = 5): Promise<Catalog[]> => {
  const response = await api.get<Catalog[]>(`${API_PUBLIC}/random`, { params: { limit } });
  return response.data;
};

// GET categories
export const getCatalogCategories = async (): Promise<CatalogCategoryEntity[]> => {
  const response = await api.get<CatalogCategoryEntity[]>(`${API_PUBLIC}/categories`);
  return response.data;
};

// ─── ADMIN CATALOG ENDPOINTS ────────────────────────────────

// CREATE catalog
export const createCatalog = async (data: FormData): Promise<Catalog> => {
  const response = await api.post<Catalog>(API_BASE, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// UPDATE catalog (metadata only — hotspots saved separately now)
export const updateCatalog = async (id: string, data: FormData): Promise<Catalog> => {
  data.append('_method', 'PUT');
  const response = await api.post<Catalog>(`${API_BASE}/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// DELETE catalog
export const deleteCatalog = async (id: string): Promise<void> => {
  await api.delete(`${API_BASE}/${id}`);
};

// ─── HOTSPOT ENDPOINTS ──────────────────────────────────────

export interface Hotspot {
  id?: string | number;
  catalog_id?: string | number;
  scene_number: string;
  label: string;
  x: number;
  y: number;
  item_slug?: string;
  description?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
}

// GET all hotspots for a catalog
export const getHotspots = async (catalogId: string): Promise<Hotspot[]> => {
  const response = await api.get<Hotspot[]>(`${API_BASE}/${catalogId}/hotspots`);
  return response.data;
};

// Public read-only endpoint — safe for unauthenticated visitors
export const getPublicHotspots = async (catalogId: string): Promise<Hotspot[]> => {
  const response = await api.get<Hotspot[]>(`${API_PUBLIC}/${catalogId}/hotspots`);
  return response.data;
};

// GET hotspots for a specific scene
export const getHotspotsByScene = async (catalogId: string, sceneNumber: string): Promise<Hotspot[]> => {
  const response = await api.get<Hotspot[]>(`${API_BASE}/${catalogId}/hotspots/${sceneNumber}`);
  return response.data;
};

// CREATE single hotspot (realtime)
export const createHotspot = async (
  catalogId: string,
  data: Omit<Hotspot, 'id' | 'catalog_id' | 'created_at' | 'updated_at'>
): Promise<Hotspot> => {
  const response = await api.post<Hotspot>(`${API_BASE}/${catalogId}/hotspots`, data);
  return response.data;
};

// UPDATE single hotspot (realtime)
export const updateHotspot = async (
  catalogId: string,
  hotspotId: string | number,
  data: Partial<Hotspot>
): Promise<Hotspot> => {
  const response = await api.put<Hotspot>(
    `${API_BASE}/${catalogId}/hotspots/${hotspotId}`,
    data
  );
  return response.data;
};

// DELETE single hotspot (realtime)
export const deleteHotspot = async (
  catalogId: string,
  hotspotId: string | number
): Promise<void> => {
  await api.delete(`${API_BASE}/${catalogId}/hotspots/${hotspotId}`);
};

// BATCH hotspots (used only for initial creation or full replacement)
export const batchHotspots = async (
  catalogId: string,
  hotspots: Hotspot[]
): Promise<Hotspot[]> => {
  const response = await api.post<Hotspot[]>(
    `${API_BASE}/${catalogId}/hotspots/batch`,
    { hotspots }
  );
  return response.data;
};

// ─── SCENE ENDPOINTS ──────────────────────────────────────

// GET all scenes for a catalog (public)
export const getCatalogScenes = async (catalogId: string): Promise<CatalogScene[]> => {
  const response = await api.get<CatalogScene[]>(`${API_PUBLIC}/${catalogId}/scenes`);
  return response.data;
};

// CREATE scene (admin)
export const createCatalogScene = async (
  catalogId: string,
  formData: FormData
): Promise<CatalogScene> => {
  const response = await api.post<CatalogScene>(
    `${API_BASE}/${catalogId}/scenes`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};

// UPDATE scene (admin) — replace image and/or alt text
export const updateCatalogScene = async (
  catalogId: string,
  sceneId: number,
  formData: FormData
): Promise<CatalogScene> => {
  formData.append("_method", "PUT");
  const response = await api.post<CatalogScene>(
    `${API_BASE}/${catalogId}/scenes/${sceneId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};

// DELETE scene (admin)
export const deleteCatalogScene = async (
  catalogId: string,
  sceneId: number
): Promise<void> => {
  await api.delete(`${API_BASE}/${catalogId}/scenes/${sceneId}`);
};

// REORDER scenes (admin)
export const reorderCatalogScenes = async (
  catalogId: string,
  order: { id: number; order: number }[]
): Promise<CatalogScene[]> => {
  const response = await api.post<CatalogScene[]>(
    `${API_BASE}/${catalogId}/scenes/reorder`,
    { order }
  );
  return response.data;
};

// ─── TAXONOMY ENDPOINTS ──────────────────────────────────────

export const getTaxonomies = async (type?: 'style' | 'category'): Promise<Taxonomy[]> => {
  const params = type ? { type } : undefined;
  const response = await api.get<Taxonomy[]>(TAXONOMY_BASE, { params });
  return response.data;
};

export const getCatalogsByTaxonomy = async (
  taxonomySlugs: string[],
  params?: { page?: number; per_page?: number }
): Promise<CatalogResponse> => {
  const response = await api.get<CatalogResponse>(`${API_PUBLIC}/filter`, {
    params: { taxonomies: taxonomySlugs.join(','), ...params },
  });
  return response.data;
};

export const getCatalogsWithFilters = async (
  categorySlug?: string,
  taxonomySlugs?: string[],
  params?: { page?: number; per_page?: number }
): Promise<CatalogResponse> => {
  const filterParams: any = { ...params };
  if (categorySlug) filterParams.category = categorySlug;
  if (taxonomySlugs && taxonomySlugs.length > 0) {
    filterParams.taxonomies = taxonomySlugs.join(',');
  }
  const response = await api.get<CatalogResponse>(`${API_PUBLIC}/filter`, {
    params: filterParams,
  });
  return response.data;
};

export const searchCatalogs = async (
  query: string,
  params?: { page?: number; per_page?: number }
): Promise<CatalogResponse> => {
  const response = await api.get<CatalogResponse>(`${API_PUBLIC}/search`, {
    params: { q: query, ...params },
  });
  return response.data;
};

// ─── HELPER: Build scene image URL ──────────────────────────
export const buildSceneImageUrl = (storagePath: string): string => {
  return buildStorageUrl(storagePath);
};