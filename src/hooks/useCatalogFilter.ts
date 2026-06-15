// // hooks/useCatalogFilter.ts

// import { useState, useCallback, useMemo } from 'react';
// import { getCatalogsWithFilters } from '@/lib/catalogApi';
// import { Catalog, FilterState } from '@src/types/Catalog';

// export const useCatalogFilter = (initialCategory?: string) => {
//   const [filters, setFilters] = useState<FilterState>({
//     category: initialCategory || null,
//     taxonomies: [],
//     search: undefined,
//   });

//   const [filteredCatalogs, setFilteredCatalogs] = useState<Catalog[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   /**
//    * Fetch catalogs dengan current filters
//    */
//   const applyFilters = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const response = await getCatalogsWithFilters(
//         filters.category || undefined,
//         filters.taxonomies.length > 0 ? filters.taxonomies : undefined
//       );
//       setFilteredCatalogs(response.data);
//     } catch (err) {
//       const message = err instanceof Error ? err.message : 'Failed to apply filters';
//       setError(message);
//       console.error('applyFilters error:', err);
//     } finally {
//       setLoading(false);
//     }
//   }, [filters]);

//   /**
//    * Update category filter
//    */
//   const setCategory = useCallback((category: string | null) => {
//     setFilters((prev) => ({
//       ...prev,
//       category,
//     }));
//   }, []);

//   /**
//    * Add taxonomy filter (pill)
//    */
//   const addTaxonomy = useCallback((taxonomySlug: string) => {
//     setFilters((prev) => {
//       // Jangan duplikat
//       if (prev.taxonomies.includes(taxonomySlug)) {
//         return prev;
//       }
//       return {
//         ...prev,
//         taxonomies: [...prev.taxonomies, taxonomySlug],
//       };
//     });
//   }, []);

//   /**
//    * Remove taxonomy filter (pill)
//    */
//   const removeTaxonomy = useCallback((taxonomySlug: string) => {
//     setFilters((prev) => ({
//       ...prev,
//       taxonomies: prev.taxonomies.filter((t) => t !== taxonomySlug),
//     }));
//   }, []);

//   /**
//    * Toggle taxonomy (add jika belum ada, remove jika ada)
//    */
//   const toggleTaxonomy = useCallback((taxonomySlug: string) => {
//     setFilters((prev) => {
//       const exists = prev.taxonomies.includes(taxonomySlug);
//       if (exists) {
//         return {
//           ...prev,
//           taxonomies: prev.taxonomies.filter((t) => t !== taxonomySlug),
//         };
//       } else {
//         return {
//           ...prev,
//           taxonomies: [...prev.taxonomies, taxonomySlug],
//         };
//       }
//     });
//   }, []);

//   /**
//    * Clear semua filters
//    */
//   const clearFilters = useCallback(() => {
//     setFilters({
//       category: null,
//       taxonomies: [],
//       search: undefined,
//     });
//   }, []);

//   /**
//    * Reset ke category default (misalnya setelah navigate dari navbar)
//    */
//   const resetToCategory = useCallback((category: string | null) => {
//     setFilters({
//       category,
//       taxonomies: [],
//       search: undefined,
//     });
//   }, []);

//   /**
//    * Check apakah ada active filters
//    */
//   const hasActiveFilters = useMemo(() => {
//     return filters.taxonomies.length > 0 || filters.category !== null;
//   }, [filters]);

//   /**
//    * Check apakah taxonomy tertentu dipilih
//    */
//   const isTaxonomyActive = useCallback((taxonomySlug: string) => {
//     return filters.taxonomies.includes(taxonomySlug);
//   }, [filters.taxonomies]);

//   return {
//     // State
//     filters,
//     filteredCatalogs,
//     loading,
//     error,
//     hasActiveFilters,

//     // Actions
//     applyFilters,
//     setCategory,
//     addTaxonomy,
//     removeTaxonomy,
//     toggleTaxonomy,
//     clearFilters,
//     resetToCategory,
//     isTaxonomyActive,
//   };
// };