// services/catalogApi.ts

import { api } from './api';
import {
  Catalog,
  CatalogResponse,
  Taxonomy,
  CatalogCategoryEntity,
} from "@/types/catalog";
const API_BASE = '/api/catalogs';
const TAXONOMY_BASE = '/api/taxonomies';

/**
 * GET semua catalogs dengan optional filtering
 */
export const getAllCatalogs = async (params?: {
  category?: string;
  page?: number;
  per_page?: number;
}): Promise<CatalogResponse> => {
  try {
    const response = await api.get<CatalogResponse>(API_BASE, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching catalogs:', error);
    throw error;
  }
};

/**
 * GET catalogs berdasarkan category slug
 * Contoh: /api/catalogs/category/living-rooms
 */
export const getCatalogsByCategory = async (
  categorySlug: string,
  params?: { page?: number; per_page?: number }
): Promise<CatalogResponse> => {
  try {
    const response = await api.get<CatalogResponse>(
      `${API_BASE}/category/${categorySlug}`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching catalogs for category ${categorySlug}:`, error);
    throw error;
  }
};

/**
 * GET single catalog detail
 */
export const getCatalogBySlug = async (slug: string): Promise<Catalog> => {
  try {
    const response = await api.get<Catalog>(`${API_BASE}/${slug}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching catalog ${slug}:`, error);
    throw error;
  }
};

/**
 * GET random catalogs (untuk slider di bawah)
 */
export const getRandomCatalogs = async (limit: number = 5): Promise<Catalog[]> => {
  try {
    const response = await api.get<Catalog[]>(`${API_BASE}/random`, {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching random catalogs:', error);
    throw error;
  }
};

/**
 * GET semua category (Living Rooms, Dining Rooms, etc)
 */
export const getCatalogCategories = async (): Promise<CatalogCategoryEntity[]> => {
  try {
    const response = await api.get<CatalogCategoryEntity[]>(`${API_BASE}/categories`);
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

/**
 * GET semua taxonomies (Modern, Minimalist, Contemporary, etc)
 * type bisa 'style' atau 'category'
 */
export const getTaxonomies = async (type?: 'style' | 'category'): Promise<Taxonomy[]> => {
  try {
    const params = type ? { type } : undefined;
    const response = await api.get<Taxonomy[]>(TAXONOMY_BASE, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching taxonomies:', error);
    throw error;
  }
};

/**
 * GET catalogs dengan filter taxonomy
 * taxonomySlugs: array dari taxonomy slugs
 */
export const getCatalogsByTaxonomy = async (
  taxonomySlugs: string[],
  params?: { page?: number; per_page?: number }
): Promise<CatalogResponse> => {
  try {
    const response = await api.get<CatalogResponse>(`${API_BASE}/filter`, {
      params: {
        taxonomies: taxonomySlugs.join(','),
        ...params,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching catalogs by taxonomy:', error);
    throw error;
  }
};

/**
 * GET catalogs dengan category + taxonomy filters
 */
export const getCatalogsWithFilters = async (
  categorySlug?: string,
  taxonomySlugs?: string[],
  params?: { page?: number; per_page?: number }
): Promise<CatalogResponse> => {
  try {
    const filterParams: any = { ...params };
    
    if (categorySlug) {
      filterParams.category = categorySlug;
    }
    
    if (taxonomySlugs && taxonomySlugs.length > 0) {
      filterParams.taxonomies = taxonomySlugs.join(',');
    }

    const response = await api.get<CatalogResponse>(`${API_BASE}/filter`, {
      params: filterParams,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching catalogs with filters:', error);
    throw error;
  }
};

/**
 * Search catalogs by title
 */
export const searchCatalogs = async (
  query: string,
  params?: { page?: number; per_page?: number }
): Promise<CatalogResponse> => {
  try {
    const response = await api.get<CatalogResponse>(`${API_BASE}/search`, {
      params: { q: query, ...params },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching catalogs:', error);
    throw error;
  }
};