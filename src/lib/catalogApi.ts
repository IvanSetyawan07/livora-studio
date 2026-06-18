// services/catalogApi.ts

import { api } from './api';
import {
  Catalog,
  CatalogResponse,
  Taxonomy,
  CatalogCategoryEntity,
} from "@/types/catalog";

const API_BASE = '/admin/catalogs';   // create, update, delete
const API_PUBLIC = '/catalogs';        // get/read public
const TAXONOMY_BASE = '/taxonomies';

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

// GET single catalog
export const getCatalogBySlug = async (slug: string): Promise<Catalog> => {
  const response = await api.get<Catalog>(`${API_PUBLIC}/${slug}`);
  return response.data;
};

// GET random catalogs
export const getRandomCatalogs = async (limit: number = 5): Promise<Catalog[]> => {
  const response = await api.get<Catalog[]>(`${API_PUBLIC}/random`, { params: { limit } });
  return response.data;
};

// CREATE catalog
export const createCatalog = async (data: FormData): Promise<Catalog> => {
  const response = await api.post<Catalog>(API_BASE, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// UPDATE catalog
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

// GET categories
export const getCatalogCategories = async (): Promise<CatalogCategoryEntity[]> => {
  const response = await api.get<CatalogCategoryEntity[]>(`${API_PUBLIC}/categories`);
  return response.data;
};

// ─── HOTSPOT ENDPOINTS ───────────────────────

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

export const getHotspotsByScene = async (catalogId: string, sceneNumber: string): Promise<Hotspot[]> => {
  const response = await api.get<Hotspot[]>(`${API_BASE}/${catalogId}/hotspots/${sceneNumber}`);
  return response.data;
};

export const getHotspots = async (catalogId: string): Promise<Hotspot[]> => {
  const response = await api.get<Hotspot[]>(`${API_BASE}/${catalogId}/hotspots`);
  return response.data;
};

export const createHotspot = async (catalogId: string, data: Omit<Hotspot, 'id' | 'catalog_id' | 'created_at' | 'updated_at'>): Promise<Hotspot> => {
  const response = await api.post<Hotspot>(`${API_BASE}/${catalogId}/hotspots`, data);
  return response.data;
};

export const updateHotspot = async (catalogId: string, hotspotId: string | number, data: Partial<Hotspot>): Promise<Hotspot> => {
  const response = await api.put<Hotspot>(`${API_BASE}/${catalogId}/hotspots/${hotspotId}`, data);
  return response.data;
};

export const deleteHotspot = async (catalogId: string, hotspotId: string | number): Promise<void> => {
  await api.delete(`${API_BASE}/${catalogId}/hotspots/${hotspotId}`);
};

export const batchHotspots = async (catalogId: string, hotspots: Hotspot[]): Promise<Hotspot[]> => {
  const response = await api.post<Hotspot[]>(`${API_BASE}/${catalogId}/hotspots/batch`, { hotspots });
  return response.data;
};

// ─── TAXONOMY ENDPOINTS ──────────────────────

export const getTaxonomies = async (type?: 'style' | 'category'): Promise<Taxonomy[]> => {
  const params = type ? { type } : undefined;
  const response = await api.get<Taxonomy[]>(TAXONOMY_BASE, { params });
  return response.data;
};

export const getCatalogsByTaxonomy = async (taxonomySlugs: string[], params?: { page?: number; per_page?: number }): Promise<CatalogResponse> => {
  const response = await api.get<CatalogResponse>(`${API_PUBLIC}/filter`, {
    params: { taxonomies: taxonomySlugs.join(','), ...params },
  });
  return response.data;
};

export const getCatalogsWithFilters = async (categorySlug?: string, taxonomySlugs?: string[], params?: { page?: number; per_page?: number }): Promise<CatalogResponse> => {
  const filterParams: any = { ...params };
  if (categorySlug) filterParams.category = categorySlug;
  if (taxonomySlugs && taxonomySlugs.length > 0) filterParams.taxonomies = taxonomySlugs.join(',');
  const response = await api.get<CatalogResponse>(`${API_PUBLIC}/filter`, { params: filterParams });
  return response.data;
};

export const searchCatalogs = async (query: string, params?: { page?: number; per_page?: number }): Promise<CatalogResponse> => {
  const response = await api.get<CatalogResponse>(`${API_PUBLIC}/search`, { params: { q: query, ...params } });
  return response.data;
};