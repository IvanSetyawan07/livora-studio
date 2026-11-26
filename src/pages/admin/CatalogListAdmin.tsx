import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Edit, Plus, Filter, ExternalLink, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { CatalogItem, CATALOG_CATEGORIES } from "@/types/catalog";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  AdminHelpBanner,
  DebouncedSearchInput,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  useAdminDialog,
} from "@/components/admin/kit";

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
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("catalog");

  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalogs = useCallback(
    async (pageNum = 1) => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, any> = { page: pageNum, per_page: 10 };
        if (searchQuery) params.search = searchQuery;
        if (selectedCategory) params.category = selectedCategory;

        const { data } = await api.get<PaginatedResponse>("/admin/catalogs", { params });
        setCatalogs(data.data ?? []);
        if (data.meta) {
          setPage(data.meta.current_page);
          setTotalPages(data.meta.last_page);
        } else {
          setPage(1);
          setTotalPages(1);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Gagal memuat daftar lookbook.");
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedCategory],
  );

  useEffect(() => {
    void fetchCatalogs(1);
  }, [fetchCatalogs]);

  const handleDelete = async (catalog: CatalogItem) => {
    if (!editable) return;
    const id = String(catalog.id).split(":")[0].trim();
    const ok = await dialog.confirm({
      title: `Hapus lookbook "${catalog.title}"?`,
      text: "Semua foto ruangan (scene) dan titik hotspot di dalam lookbook ini ikut terhapus.",
      confirmLabel: "Ya, hapus",
      danger: true,
    });
    if (!ok) return;

    try {
      setDeleting(id);
      await api.delete(`/admin/catalogs/${id}`);
      setCatalogs((prev) => prev.filter((c) => String(c.id).split(":")[0] !== id));
      toast.success(`Lookbook "${catalog.title}" berhasil dihapus`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? err?.response?.data?.message ?? "Gagal menghapus lookbook");
    } finally {
      setDeleting(null);
    }
  };

  const getCategoryLabel = (slug: string) =>
    CATALOG_CATEGORIES.find((c) => c.slug === slug)?.label || slug;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Katalog & Portofolio"
        title="Lookbook Hotspot"
        description="Kelola katalog ruangan interaktif dengan foto scene, titik hotspot produk, dan ekspor PDF."
        actions={
          editable ? (
            <Link
              to="/admin/catalogs/create"
              className="inline-flex items-center gap-2 rounded-full bg-[#232528] px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#34383D]"
            >
              <Plus size={15} /> Buat Lookbook Baru
            </Link>
          ) : null
        }
      />

      <AdminHelpBanner storageKey="catalogs-list-help">
        Berbeda dengan <strong>Koleksi Furnitur</strong> (kumpulan seri produk), <strong>Lookbook Hotspot</strong>{" "}
        adalah halaman inspirasi ruangan yang bisa diklik titik-titik produknya oleh pengunjung dan diunduh sebagai PDF.
      </AdminHelpBanner>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <DebouncedSearchInput
          value={searchQuery}
          onSearch={(q) => {
            setSearchQuery(q);
            setPage(1);
          }}
          placeholder="Cari judul lookbook…"
          className="w-full sm:w-72"
        />

        <div className="relative min-w-[200px]">
          <Filter
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#656B73]"
          />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full appearance-none rounded-lg border border-[#E5DFD5] bg-white pl-9 pr-8 text-sm text-[#232528] outline-none focus:border-[#5E93B8]"
          >
            <option value="">Semua Kategori Ruangan</option>
            {CATALOG_CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {(searchQuery || selectedCategory) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("");
              setPage(1);
            }}
            className="h-10 rounded-lg border border-[#E2DACF] bg-white px-4 text-xs font-medium text-[#656B73] hover:text-[#232528]"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Table */}
      {error ? (
        <ErrorState title="Gagal memuat lookbook" description={error} onRetry={() => void fetchCatalogs(page)} />
      ) : loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : catalogs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada lookbook"
          description={
            searchQuery || selectedCategory
              ? "Tidak ada lookbook yang cocok dengan filter pencarian."
              : "Buat lookbook ruangan interaktif pertama Anda."
          }
          action={
            editable ? (
              <Link
                to="/admin/catalogs/create"
                className="inline-flex items-center gap-2 rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white"
              >
                <Plus size={14} /> Buat Lookbook Pertama
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#EAE4DA] bg-[#FAF8F4] text-xs uppercase tracking-[0.14em] text-[#656B73]">
                <tr>
                  <th className="px-5 py-3.5 text-left">Judul Lookbook</th>
                  <th className="px-5 py-3.5 text-left">Kategori Ruangan</th>
                  <th className="px-5 py-3.5 text-left">Gaya Desain</th>
                  <th className="px-5 py-3.5 text-left">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1ECE4]">
                {catalogs.map((catalog) => {
                  const cover = (catalog as any).cover_image || catalog.coverImage;
                  const cleanId = String(catalog.id).split(":")[0];
                  return (
                    <tr key={catalog.id} className="transition-colors hover:bg-[#FAF8F4]/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {cover ? (
                            <img
                              src={imgUrl(cover)}
                              alt={catalog.title}
                              className="h-11 w-14 shrink-0 rounded-lg border border-[#EAE4DA] object-cover"
                            />
                          ) : (
                            <div className="grid h-11 w-14 shrink-0 place-items-center rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] text-[10px] text-[#656B73]">
                              —
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#232528]">{catalog.title}</p>
                            <p className="truncate text-xs text-[#656B73]">/{catalog.slug}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-[#4C5259]">{getCategoryLabel(catalog.category)}</td>

                      <td className="px-5 py-4">
                        <StatusBadge tone="neutral" dot={false}>
                          {catalog.taxonomy}
                        </StatusBadge>
                      </td>

                      <td className="px-5 py-4">
                        {catalog.featured ? (
                          <StatusBadge tone="accent">Unggulan</StatusBadge>
                        ) : (
                          <span className="text-xs text-[#656B73]">Reguler</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/catalogs/${catalog.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E2DACF] bg-white px-2.5 py-1.5 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
                            title="Ubah Lookbook & Hotspot"
                          >
                            <Edit size={13} className="text-[#5E93B8]" />
                            {editable ? "Edit" : "Lihat"}
                          </Link>

                          <a
                            href={`/catalog/${catalog.category}/${catalog.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-[#656B73] transition-colors hover:bg-[#FAF8F4] hover:text-[#232528]"
                            title="Lihat halaman publik"
                          >
                            <ExternalLink size={15} />
                          </a>

                          {editable && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(catalog)}
                              disabled={deleting === cleanId}
                              className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
                              title="Hapus Lookbook"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#656B73]">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void fetchCatalogs(page - 1)}
              disabled={page === 1}
              className="rounded-lg border border-[#E2DACF] bg-white px-3 py-1.5 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4] disabled:opacity-40"
            >
              ← Sebelumnya
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => void fetchCatalogs(pageNum)}
                  className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                    page === pageNum
                      ? "bg-[#232528] text-white"
                      : "border border-[#E2DACF] bg-white text-[#4C5259] hover:border-[#5E93B8]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => void fetchCatalogs(page + 1)}
              disabled={page === totalPages}
              className="rounded-lg border border-[#E2DACF] bg-white px-3 py-1.5 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4] disabled:opacity-40"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
