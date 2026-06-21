// components/admin/CatalogListAdmin.tsx

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Edit, Plus, Search, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { CatalogItem, CATALOG_CATEGORIES } from "@/types/catalog";

interface PaginatedResponse {
  data: CatalogItem[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export default function CatalogListAdmin() {
  const navigate = useNavigate();

  // ── State
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Fetch catalogs
  // FIX #4: Fetch dari /admin/catalogs bukan /catalogs (public)
  const fetchCatalogs = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: pageNum,
        per_page: 10,
      };

      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;

      const { data } = await api.get<PaginatedResponse>("/admin/catalogs", {
        params,
      });

      setCatalogs(data.data);
      if (data.meta) {
        setPage(data.meta.current_page);
        setTotalPages(data.meta.last_page);
      }
    } catch (err) {
      setError(`Failed to load catalogs: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Initial fetch
  useEffect(() => {
    fetchCatalogs(1);
  }, [searchQuery, selectedCategory]);

  // ── Delete catalog
  // FIX #1: Bersihkan ID dari karakter asing (misal "2:1" → "2")
  const handleDelete = async (rawId: string) => {
    const id = String(rawId).split(":")[0].trim();
    if (!confirm("Yakin ingin menghapus catalog ini?")) return;

    try {
      setDeleting(id);
      await api.delete(`/admin/catalogs/${id}`);
      setSuccess("Catalog deleted successfully");
      setCatalogs((prev) => prev.filter((c) => String(c.id).split(":")[0] !== id));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? String(err);
      setError(`Failed to delete: ${msg}`);
    } finally {
      setDeleting(null);
    }
  };

  // ── Get category label
  const getCategoryLabel = (slug: string) => {
    return CATALOG_CATEGORIES.find((c) => c.slug === slug)?.label || slug;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="serif text-4xl font-light mb-1 text-foreground">
              Catalogs
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your furniture collections
            </p>
          </div>
          <Link
            to="/admin/catalogs/create"
            className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded hover:bg-foreground/90 transition-colors font-medium text-sm"
          >
            <Plus size={16} /> Create Catalog
          </Link>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 text-green-700 rounded text-sm">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-700 rounded text-sm">
            ❌ {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search catalogs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-border bg-card text-foreground rounded focus:ring-2 focus:ring-foreground/50 outline-none"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-border bg-card text-foreground rounded focus:ring-2 focus:ring-foreground/50 outline-none appearance-none"
              >
                <option value="">All Categories</option>
                {CATALOG_CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("");
                  setPage(1);
                }}
                className="px-4 py-2 border border-border rounded hover:bg-secondary transition-colors text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Catalogs Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              Loading catalogs...
            </div>
          ) : catalogs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No catalogs found</p>
              <Link
                to="/admin/catalogs/create"
                className="text-foreground hover:underline text-sm"
              >
                Create your first catalog →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Style
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Featured
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {catalogs.map((catalog) => (
                    <tr
                      key={catalog.id}
                      className="hover:bg-secondary/50 transition-colors"
                    >
                      {/* Title with cover image */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {((catalog as any).cover_image || catalog.coverImage) && (
                            <img
                              src={imgUrl((catalog as any).cover_image || catalog.coverImage || "")}
                              alt={catalog.title}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {catalog.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {catalog.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className="text-xs text-muted-foreground">
                          {getCategoryLabel(catalog.category)}
                        </span>
                      </td>

                      {/* Taxonomy */}
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium bg-foreground/10 text-foreground">
                          {catalog.taxonomy}
                        </span>
                      </td>

                      {/* Featured */}
                      <td className="px-6 py-4">
                        {catalog.featured ? (
                          <span className="text-xs font-medium text-green-600">
                            ✓ Featured
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {/* Edit */}
                          <Link
                            to={`/admin/catalogs/${catalog.id}/edit`}
                            className="p-2 hover:bg-secondary rounded text-foreground transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Link>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(String(catalog.id))}
                            disabled={deleting === String(catalog.id).split(":")[0]}
                            className={`p-2 rounded transition-colors ${
                              deleting === String(catalog.id).split(":")[0]
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-red-500/20 text-red-500 hover:text-red-600"
                            }`}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>

                          {/* View public */}
                          <a
                            href={`/catalog/${catalog.category}/${catalog.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-secondary rounded text-foreground transition-colors text-xs"
                            title="View public page"
                          >
                            ↗
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchCatalogs(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-border rounded hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchCatalogs(pageNum)}
                      className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                        page === pageNum
                          ? "bg-foreground text-background"
                          : "border border-border hover:bg-secondary"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => fetchCatalogs(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 border border-border rounded hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}