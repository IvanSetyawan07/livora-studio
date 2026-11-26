import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  FolderKanban,
  Megaphone,
  Save,
  Sofa,
  Sparkles,
  Star,
  Tags,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { invalidateAllItemsCache } from "@/lib/itemsApi";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  AdminHelpBanner,
  CardGridSkeleton,
  DebouncedSearchInput,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusBadge,
} from "@/components/admin/kit";

type LandingTab = "projects" | "collections" | "furniture";

export default function AdminLanding() {
  const { canEdit } = useAdminPermission();
  const editable = canEdit("landing");

  const [tab, setTab] = useState<LandingTab>("projects");

  // Projects (Selected Works)
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [savedSelectedProjects, setSavedSelectedProjects] = useState<number[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [savingProjects, setSavingProjects] = useState(false);

  // Featured Collections
  const [collections, setCollections] = useState<any[]>([]);
  const [togglingColId, setTogglingColId] = useState<number | null>(null);

  // Furniture New Arrivals
  const [items, setItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [togglingItemId, setTogglingItemId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get("/projects").then((r) => r.data ?? []),
      api.get("/collections").then((r) => r.data ?? []),
      api.get("/items").then((r) => r.data ?? []),
    ])
      .then(([projData, colData, itemData]) => {
        setProjects(projData);
        const initialIds = projData.filter((p: any) => p.is_highlighted).map((p: any) => p.id);
        setSelectedProjects(initialIds);
        setSavedSelectedProjects(initialIds);
        setCollections(colData);
        setItems(itemData);
      })
      .catch((e: any) => {
        setError(e?.message || "Gagal memuat data halaman depan.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const projectsDirty = useMemo(() => {
    if (selectedProjects.length !== savedSelectedProjects.length) return true;
    return selectedProjects.some((id, idx) => savedSelectedProjects[idx] !== id);
  }, [selectedProjects, savedSelectedProjects]);

  /* ── Projects handlers ── */
  const toggleProject = (id: number) => {
    if (!editable) return;
    setSelectedProjects((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const moveProject = (id: number, dir: -1 | 1) => {
    if (!editable) return;
    setSelectedProjects((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const makeLeadProject = (id: number) => {
    if (!editable) return;
    setSelectedProjects((prev) => [id, ...prev.filter((x) => x !== id)]);
  };

  const saveProjects = async () => {
    if (!editable) return;
    setSavingProjects(true);
    try {
      await api.put("/admin/landing/highlights", { ids: selectedProjects });
      setSavedSelectedProjects([...selectedProjects]);
      toast.success("Proyek pilihan di Halaman Depan berhasil disimpan.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan proyek pilihan.");
    } finally {
      setSavingProjects(false);
    }
  };

  /* ── Featured Collection handler ── */
  const toggleFeaturedCollection = async (col: any) => {
    if (!editable) return;
    setTogglingColId(col.id);
    try {
      const { data } = await api.patch(`/admin/collections/${col.id}/toggle-featured`);
      const next = Boolean(data?.is_featured);
      setCollections((prev) => prev.map((c) => (c.id === col.id ? { ...c, is_featured: next } : c)));
      toast.success(
        next
          ? `"${col.name}" sekarang tampil di Featured Collections Halaman Depan.`
          : `"${col.name}" dihapus dari Featured Collections.`,
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal mengubah status koleksi unggulan. Coba lagi.");
    } finally {
      setTogglingColId(null);
    }
  };

  /* ── New Arrival Furniture handler ── */
  const toggleNewArrivalItem = async (item: any) => {
    if (!editable) return;
    setTogglingItemId(item.id);
    try {
      const { data } = await api.patch(`/admin/items/${item.id}/toggle-new-arrival`);
      const next = Boolean(data?.is_new_arrival);
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_new_arrival: next } : it)));
      invalidateAllItemsCache();
      toast.success(
        next
          ? `"${item.title}" sekarang tampil di kipas 3D New Arrivals Halaman Depan.`
          : `"${item.title}" dihapus dari New Arrivals.`,
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal mengubah status New Arrival. Coba lagi.");
    } finally {
      setTogglingItemId(null);
    }
  };

  const featuredColCount = useMemo(() => collections.filter((c) => Boolean(c.is_featured)).length, [collections]);
  const newArrivalCount = useMemo(() => items.filter((it) => Boolean(it.is_new_arrival)).length, [items]);

  const orderedProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    const list = [...projects].sort((a, b) => {
      const ia = selectedProjects.indexOf(a.id);
      const ib = selectedProjects.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return (b.id ?? 0) - (a.id ?? 0);
    });
    if (!q) return list;
    return list.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.subtitle || "").toLowerCase().includes(q) ||
        (p.scope?.name || "").toLowerCase().includes(q),
    );
  }, [projects, selectedProjects, projectSearch]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => {
      const diff = Number(Boolean(b.is_new_arrival)) - Number(Boolean(a.is_new_arrival));
      return diff !== 0 ? diff : (b.id ?? 0) - (a.id ?? 0);
    });
    if (!q) return sorted;
    return sorted.filter(
      (it) =>
        (it.title || "").toLowerCase().includes(q) ||
        (it.code || "").toLowerCase().includes(q) ||
        (it.type?.name || "").toLowerCase().includes(q),
    );
  }, [items, itemSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tampilan Website"
        title="Atur Halaman Depan"
        description="Pilih proyek, koleksi unggulan, dan produk New Arrivals yang tampil di halaman utama website LIVORA."
        actions={
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-4 py-2 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8] hover:text-[#3A6D91]"
          >
            Lihat Halaman Depan
            <ExternalLink className="h-3.5 w-3.5 text-[#5E93B8]" />
          </a>
        }
      />

      {/* Peta Visual Urutan Halaman Depan */}
      <section className="rounded-2xl border border-[#EAE4DA] bg-white p-4 sm:p-5">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#656B73]">
          Peta Bagian Halaman Depan (Atas → Bawah)
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <Link
            to="/admin/promo-banners"
            className="group flex flex-col justify-between rounded-xl border border-[#EFEAE2] bg-[#FAF8F4]/70 p-3 transition-colors hover:border-[#5E93B8]"
          >
            <div className="flex items-center justify-between">
              <Megaphone className="h-4 w-4 text-[#5E93B8]" />
              <ArrowUpRight className="h-3.5 w-3.5 text-[#656B73] group-hover:text-[#5E93B8]" />
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-[#232528]">1. Pop-up Promo</p>
              <p className="text-[11px] text-[#656B73]">Atur di menu Pop-up Promo</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setTab("projects")}
            className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-colors ${
              tab === "projects"
                ? "border-[#5E93B8] bg-[#EDF4F8]/70"
                : "border-[#EFEAE2] bg-[#FAF8F4]/70 hover:border-[#5E93B8]"
            }`}
          >
            <div className="flex items-center justify-between">
              <FolderKanban className="h-4 w-4 text-[#5E93B8]" />
              <span className="text-[11px] font-semibold text-[#35678B]">{selectedProjects.length} dipilih</span>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-[#232528]">2. Selected Works</p>
              <p className="text-[11px] text-[#656B73]">Proyek Pilihan (Tab 1)</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTab("collections")}
            className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-colors ${
              tab === "collections"
                ? "border-[#5E93B8] bg-[#EDF4F8]/70"
                : "border-[#EFEAE2] bg-[#FAF8F4]/70 hover:border-[#5E93B8]"
            }`}
          >
            <div className="flex items-center justify-between">
              <BookOpen className="h-4 w-4 text-[#5E93B8]" />
              <span className="text-[11px] font-semibold text-[#35678B]">{featuredColCount} aktif</span>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-[#232528]">3. Featured Collections</p>
              <p className="text-[11px] text-[#656B73]">Koleksi Unggulan (Tab 2)</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTab("furniture")}
            className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-colors ${
              tab === "furniture"
                ? "border-[#5E93B8] bg-[#EDF4F8]/70"
                : "border-[#EFEAE2] bg-[#FAF8F4]/70 hover:border-[#5E93B8]"
            }`}
          >
            <div className="flex items-center justify-between">
              <Sofa className="h-4 w-4 text-[#5E93B8]" />
              <span className="text-[11px] font-semibold text-[#35678B]">{newArrivalCount} aktif</span>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-[#232528]">4. New Arrivals 3D</p>
              <p className="text-[11px] text-[#656B73]">Kipas Produk Baru (Tab 3)</p>
            </div>
          </button>

          <Link
            to="/admin/taxonomies?tab=furniture-types"
            className="group flex flex-col justify-between rounded-xl border border-[#EFEAE2] bg-[#FAF8F4]/70 p-3 transition-colors hover:border-[#5E93B8]"
          >
            <div className="flex items-center justify-between">
              <Tags className="h-4 w-4 text-[#5E93B8]" />
              <ArrowUpRight className="h-3.5 w-3.5 text-[#656B73] group-hover:text-[#5E93B8]" />
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold text-[#232528]">5. Permanent Gallery</p>
              <p className="text-[11px] text-[#656B73]">Foto kartu kategori</p>
            </div>
          </Link>
        </div>
      </section>

      {error && !loading && <ErrorState title="Gagal memuat kurasi halaman depan" description={error} onRetry={load} />}
      {loading && <CardGridSkeleton count={6} />}

      {/* ══════════════════════════════════════════════════════════════
          TAB 1 — PROYEK PILIHAN (Selected Works)
         ══════════════════════════════════════════════════════════════ */}
      {!loading && !error && tab === "projects" && (
        <div className="space-y-5">
          {projectsDirty && editable && (
            <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#5E93B8]/40 bg-[#EDF4F8] px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-[#232528]">
                Ada perubahan urutan/pilihan Proyek Pilihan yang belum disimpan.
              </p>
              <button
                type="button"
                onClick={saveProjects}
                disabled={savingProjects}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingProjects ? "Menyimpan…" : "Simpan Perubahan"}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <DebouncedSearchInput
                value={projectSearch}
                onSearch={setProjectSearch}
                placeholder="Cari proyek berdasarkan judul atau scope…"
                className="w-72"
              />
              {selectedProjects.length > 7 && (
                <StatusBadge tone="warning">
                  Terpilih {selectedProjects.length} — disarankan maksimal 7 proyek agar halaman tetap ringan
                </StatusBadge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/admin/projects"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#5E93B8] hover:underline"
              >
                Kelola Proyek <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              {editable && (
                <button
                  type="button"
                  onClick={saveProjects}
                  disabled={savingProjects || !projectsDirty}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white transition-opacity hover:bg-[#34383D] disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingProjects ? "Menyimpan…" : "Simpan Proyek Pilihan"}
                </button>
              )}
            </div>
          </div>

          <AdminHelpBanner storageKey="landing-projects">
            Pilih proyek untuk bagian <strong>Selected Works</strong> di Halaman Depan. Proyek urutan{" "}
            <strong>#1 Utama</strong> otomatis tampil besar sebagai <em>Featured Residence</em>. Gunakan tombol panah
            untuk mengatur urutannya, lalu klik <strong>Simpan Proyek Pilihan</strong>.
          </AdminHelpBanner>

          {orderedProjects.length === 0 ? (
            <EmptyState
              title="Belum ada proyek ditemukan"
              description="Tambahkan portofolio proyek terlebih dahulu di menu Portofolio Proyek."
              action={
                <Link
                  to="/admin/projects"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white"
                >
                  Buka Portofolio Proyek <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {orderedProjects.map((p) => {
                const pos = selectedProjects.indexOf(p.id);
                const on = pos !== -1;
                return (
                  <div
                    key={p.id}
                    className={`overflow-hidden rounded-2xl border-2 bg-white transition-all ${
                      on ? "border-[#5E93B8] shadow-sm" : "border-[#EAE4DA]"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={() => toggleProject(p.id)}
                      className="block w-full text-left disabled:cursor-default"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-[#FAF8F4]">
                        {p.hero_image ? (
                          <img src={imgUrl(p.hero_image)} className="h-full w-full object-cover" alt={p.title} />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-[#656B73]">Tanpa foto</div>
                        )}
                        {on && (
                          <span
                            className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-sm ${
                              pos === 0 ? "bg-[#232528]" : "bg-[#5E93B8]"
                            }`}
                          >
                            {pos === 0 ? "#1 Utama (Featured)" : `Urutan #${pos + 1}`}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#656B73]">
                          {p.scope?.name || "Proyek"}
                        </p>
                        <h3 className="font-header mt-0.5 truncate text-lg text-[#232528]">{p.title}</h3>
                        {p.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-[#656B73]">{p.subtitle}</p>}
                      </div>
                    </button>

                    {editable && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EAE0] bg-[#FAF8F4]/50 px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleProject(p.id)}
                          className={`text-xs font-medium ${on ? "text-[#35678B]" : "text-[#656B73] hover:text-[#232528]"}`}
                        >
                          {on ? "✓ Tampil di Halaman Depan" : "+ Pilih untuk Halaman Depan"}
                        </button>
                        {on && (
                          <div className="flex items-center gap-1">
                            {pos > 0 && (
                              <button
                                type="button"
                                onClick={() => makeLeadProject(p.id)}
                                title="Jadikan proyek utama (#1)"
                                className="rounded-md border border-[#DCE5EC] bg-white px-2 py-1 text-[11px] font-medium text-[#35678B] hover:bg-[#EDF4F8]"
                              >
                                Jadi #1
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={pos === 0}
                              onClick={() => moveProject(p.id, -1)}
                              aria-label="Geser ke atas"
                              className="rounded-md border border-[#E2DACF] bg-white p-1 text-[#232528] hover:bg-[#FAF8F4] disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={pos === selectedProjects.length - 1}
                              onClick={() => moveProject(p.id, 1)}
                              aria-label="Geser ke bawah"
                              className="rounded-md border border-[#E2DACF] bg-white p-1 text-[#232528] hover:bg-[#FAF8F4] disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2 — FEATURED COLLECTIONS
         ══════════════════════════════════════════════════════════════ */}
      {!loading && !error && tab === "collections" && (
        <div className="space-y-5">
          <AdminHelpBanner
            storageKey="landing-collections"
            link={{ label: "Kelola & Tambah Koleksi", to: "/admin/collections" }}
          >
            Klik tombol <strong>Jadikan Unggulan</strong> untuk menampilkan koleksi pada bagian{" "}
            <strong>Featured Collections</strong> di Halaman Depan (disarankan 3–5 koleksi). Perubahan langsung tersimpan
            otomatis.
          </AdminHelpBanner>

          {collections.length === 0 ? (
            <EmptyState
              title="Belum ada koleksi"
              description="Tambahkan koleksi furnitur terlebih dahulu di halaman Koleksi Furnitur."
              action={
                <Link
                  to="/admin/collections"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white"
                >
                  Buka Koleksi Furnitur <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((c) => {
                const isFeat = Boolean(c.is_featured);
                const cover = c.featured_image || c.hero_banner || c.card_banner;
                return (
                  <div
                    key={c.id}
                    className={`overflow-hidden rounded-2xl border-2 bg-white transition ${
                      isFeat ? "border-[#5E93B8] shadow-sm" : "border-[#EAE4DA]"
                    }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#FAF8F4]">
                      {cover ? (
                        <img src={imgUrl(cover)} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[#656B73]">
                          Belum ada foto cover
                        </div>
                      )}
                      {isFeat && (
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#5E93B8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                          <Sparkles className="h-3 w-3" /> Unggulan
                        </span>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <h3 className="font-header truncate text-lg text-[#232528]">{c.name}</h3>
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#656B73]">
                          {c.short_description || c.description || "—"}
                        </p>
                      </div>
                      {editable && (
                        <button
                          type="button"
                          disabled={togglingColId === c.id}
                          onClick={() => void toggleFeaturedCollection(c)}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            isFeat
                              ? "border-[#5E93B8]/40 bg-[#EDF4F8] text-[#35678B] hover:bg-[#DFECF4]"
                              : "border-[#E2DACF] bg-white text-[#656B73] hover:border-[#232528] hover:text-[#232528]"
                          }`}
                        >
                          <Star className={`h-3.5 w-3.5 ${isFeat ? "fill-[#5E93B8] text-[#5E93B8]" : ""}`} />
                          <span>{isFeat ? "Aktif" : "Tampilkan"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3 — FURNITURE NEW ARRIVAL (Kipas 3D)
         ══════════════════════════════════════════════════════════════ */}
      {!loading && !error && tab === "furniture" && (
        <div className="space-y-5">
          <AdminHelpBanner
            storageKey="landing-furniture"
            link={{ label: "Atur Foto Kategori Permanent Gallery", to: "/admin/taxonomies?tab=furniture-types" }}
          >
            Pilih hingga 6 produk furnitur untuk ditampilkan pada panggung <strong>kipas 3D New Arrivals</strong> di
            Halaman Depan (disarankan 4–6 produk dengan foto bersih). Untuk mengubah foto kartu kategori{" "}
            <strong>Permanent Gallery</strong>, gunakan menu <em>Kategori &amp; Foto Galeri</em>.
          </AdminHelpBanner>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <DebouncedSearchInput
              value={itemSearch}
              onSearch={setItemSearch}
              placeholder="Cari nama, kode, atau jenis furnitur…"
              className="w-full max-w-sm"
            />
            <Link
              to="/admin/items"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#5E93B8] hover:underline"
            >
              Kelola Produk &amp; Warna <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState title="Produk furnitur tidak ditemukan" description="Coba kata kunci pencarian yang berbeda." />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((it) => {
                const isNew = Boolean(it.is_new_arrival);
                const thumb = it.variants?.[0]?.furniture_image || it.image || null;
                return (
                  <div
                    key={it.id}
                    className={`flex flex-col overflow-hidden rounded-2xl border-2 bg-white transition ${
                      isNew ? "border-[#5E93B8] shadow-sm" : "border-[#EAE4DA]"
                    }`}
                  >
                    <div className="relative flex aspect-[4/3] items-center justify-center bg-[#FAF8F4] p-3">
                      {thumb ? (
                        <img src={imgUrl(thumb)} alt={it.title} className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs text-[#656B73]">Tanpa foto</span>
                      )}
                      {isNew && (
                        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[#5E93B8] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                          New Arrival
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#656B73]">
                          {it.type?.name || "Furnitur"}
                          {it.code ? ` · ${it.code}` : ""}
                        </p>
                        <h3 className="font-header mt-0.5 line-clamp-1 text-base text-[#232528]">{it.title}</h3>
                      </div>

                      {editable && (
                        <button
                          type="button"
                          disabled={togglingItemId === it.id}
                          onClick={() => void toggleNewArrivalItem(it)}
                          className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                            isNew
                              ? "border-[#5E93B8]/40 bg-[#EDF4F8] text-[#35678B] hover:bg-[#DFECF4]"
                              : "border-[#E2DACF] bg-white text-[#656B73] hover:border-[#232528] hover:text-[#232528]"
                          }`}
                        >
                          <Star className={`h-3.5 w-3.5 ${isNew ? "fill-[#5E93B8] text-[#5E93B8]" : ""}`} />
                          <span>{isNew ? "Aktif di New Arrivals" : "Tandai New Arrival"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
