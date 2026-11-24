import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Search, ArrowUpRight, FolderKanban, BookOpen, Sofa, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { invalidateAllItemsCache } from "@/lib/itemsApi";

type LandingTab = "projects" | "collections" | "furniture";

export default function AdminLanding() {
  const [tab, setTab] = useState<LandingTab>("projects");

  // Projects (Selected Works)
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [savingProjects, setSavingProjects] = useState(false);

  // Featured Collections
  const [collections, setCollections] = useState<any[]>([]);
  const [togglingColId, setTogglingColId] = useState<number | null>(null);

  // Furniture New Arrivals
  const [items, setItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [togglingItemId, setTogglingItemId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.get("/projects").then((r) => r.data ?? []).catch(() => []),
      api.get("/collections").then((r) => r.data ?? []).catch(() => []),
      api.get("/items").then((r) => r.data ?? []).catch(() => []),
    ])
      .then(([projData, colData, itemData]) => {
        if (!alive) return;
        setProjects(projData);
        setSelectedProjects(
          projData.filter((p: any) => p.is_highlighted).map((p: any) => p.id),
        );
        setCollections(colData);
        setItems(itemData);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* ── Projects handlers ── */
  const toggleProject = (id: number) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const saveProjects = async () => {
    setSavingProjects(true);
    try {
      await api.put("/admin/landing/highlights", { ids: selectedProjects });
      toast.success("Proyek pilihan landing page berhasil disimpan.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan proyek pilihan.");
    } finally {
      setSavingProjects(false);
    }
  };

  /* ── Featured Collection handler ── */
  const toggleFeaturedCollection = async (col: any) => {
    setTogglingColId(col.id);
    try {
      const { data } = await api.patch(`/admin/collections/${col.id}/toggle-featured`);
      const next = Boolean(data?.is_featured);
      setCollections((prev) =>
        prev.map((c) => (c.id === col.id ? { ...c, is_featured: next } : c)),
      );
      toast.success(
        next
          ? `"${col.name}" ditandai sebagai Featured Collection di landing page.`
          : `"${col.name}" dihapus dari Featured Collection.`,
      );
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          "Gagal mengubah status Featured. Pastikan migrasi database sudah dijalankan.",
      );
    } finally {
      setTogglingColId(null);
    }
  };

  /* ── New Arrival Furniture handler ── */
  const toggleNewArrivalItem = async (item: any) => {
    setTogglingItemId(item.id);
    try {
      const { data } = await api.patch(`/admin/items/${item.id}/toggle-new-arrival`);
      const next = Boolean(data?.is_new_arrival);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_new_arrival: next } : it)),
      );
      invalidateAllItemsCache();
      toast.success(
        next
          ? `"${item.title}" ditandai sebagai New Arrival di landing page.`
          : `"${item.title}" dihapus dari New Arrival.`,
      );
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          "Gagal mengubah status New Arrival. Pastikan migrasi database sudah dijalankan.",
      );
    } finally {
      setTogglingItemId(null);
    }
  };

  const featuredColCount = useMemo(
    () => collections.filter((c) => Boolean(c.is_featured)).length,
    [collections],
  );
  const newArrivalCount = useMemo(
    () => items.filter((it) => Boolean(it.is_new_arrival)).length,
    [items],
  );

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
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1.5">
          Tampilan Website
        </p>
        <h1 className="serif text-3xl sm:text-4xl font-light">
          Kurasi Landing Page
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Atur proyek, koleksi unggulan (<em>Featured Collections</em>), dan produk furnitur{" "}
          <em>New Arrival</em> yang tampil di halaman depan LIVORA dari satu tempat.
        </p>
      </div>

      {/* ── 3 Curatorial Tabs ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setTab("projects")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors border ${
            tab === "projects"
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Proyek Pilihan</span>
          <span className="opacity-70">({selectedProjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("collections")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors border ${
            tab === "collections"
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Featured Collections</span>
          <span className="opacity-70">({featuredColCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("furniture")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors border ${
            tab === "furniture"
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          <Sofa className="w-3.5 h-3.5" />
          <span>Furniture New Arrival</span>
          <span className="opacity-70">({newArrivalCount})</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-60 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : null}

      {/* ══════════════════════════════════════════════════════════════
          TAB 1 — PROYEK PILIHAN (Selected Works)
         ══════════════════════════════════════════════════════════════ */}
      {!loading && tab === "projects" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Pilih proyek yang ingin dipajang di section <strong>Selected Works</strong>. Proyek pertama tampil sebagai <em>Featured Residence</em>. Terpilih: <strong>{selectedProjects.length}</strong>
            </p>
            <button
              type="button"
              onClick={saveProjects}
              disabled={savingProjects}
              className="px-5 py-2.5 bg-foreground text-background rounded-full text-xs uppercase tracking-[0.2em] font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {savingProjects ? "Menyimpan..." : "Simpan Proyek Pilihan"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => {
              const on = selectedProjects.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProject(p.id)}
                  className={`text-left bg-card border-2 rounded-xl overflow-hidden transition ${
                    on
                      ? "border-foreground shadow-sm"
                      : "border-border opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    {p.hero_image && (
                      <img
                        src={imgUrl(p.hero_image)}
                        className="w-full h-full object-cover"
                        alt={p.title}
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {p.scope?.name || "Project"}
                    </p>
                    <h3 className="serif text-lg mt-0.5">{p.title}</h3>
                    {p.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {p.subtitle}
                      </p>
                    )}
                    <p
                      className={`text-xs mt-2.5 font-medium ${
                        on ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {on ? "✓ Tampil di Landing Page" : "Klik untuk pilih"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2 — FEATURED COLLECTIONS
         ══════════════════════════════════════════════════════════════ */}
      {!loading && tab === "collections" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Klik bintang untuk menampilkan koleksi pada section <strong>Featured Collections</strong> di halaman depan (disarankan 3–5 koleksi).
            </p>
            <Link
              to="/admin/collections"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline underline-offset-4 hover:opacity-75"
            >
              <span>Kelola &amp; Tambah Koleksi</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {collections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Belum ada koleksi. Tambahkan koleksi dulu di halaman Koleksi.
              </p>
              <Link
                to="/admin/collections"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-5 py-2 text-xs uppercase tracking-[0.18em]"
              >
                Buka Halaman Koleksi <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {collections.map((c) => {
                const isFeat = Boolean(c.is_featured);
                const cover = c.featured_image || c.hero_banner || c.card_banner;
                return (
                  <div
                    key={c.id}
                    className={`relative bg-card border-2 rounded-xl overflow-hidden transition ${
                      isFeat ? "border-amber-500/80 shadow-sm" : "border-border"
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                      {cover ? (
                        <img
                          src={imgUrl(cover)}
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          Belum ada foto cover
                        </div>
                      )}
                      {isFeat && (
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em]">
                          <Sparkles className="w-3 h-3" /> Featured
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="serif text-lg truncate">{c.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {c.short_description || c.description || "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={togglingColId === c.id}
                        onClick={() => toggleFeaturedCollection(c)}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          isFeat
                            ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                            : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFeat ? "fill-amber-500 text-amber-500" : ""
                          }`}
                        />
                        <span>{isFeat ? "Featured" : "Jadikan"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3 — FURNITURE NEW ARRIVAL
         ══════════════════════════════════════════════════════════════ */}
      {!loading && tab === "furniture" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Klik bintang untuk menampilkan produk di panggung utama <strong>New Arrivals</strong> landing page (disarankan 3–4 item). 4 item non-New Arrival terbaru yang memiliki foto otomatis tampil di <em>Selected Permanent Works</em>.
            </p>
            <Link
              to="/admin/items"
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline underline-offset-4 hover:opacity-75"
            >
              <span>Kelola Furniture &amp; Warna</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Cari nama, kode, atau kategori furnitur..."
              className="ui-input pl-9"
            />
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Tidak ada produk furnitur ditemukan.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredItems.map((it) => {
                const isNew = Boolean(it.is_new_arrival);
                const thumb =
                  it.variants?.[0]?.furniture_image || it.image || null;
                return (
                  <div
                    key={it.id}
                    className={`bg-card border-2 rounded-xl overflow-hidden flex flex-col transition ${
                      isNew ? "border-amber-500/80 shadow-sm" : "border-border"
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-[#FAF8F4] p-3 flex items-center justify-center">
                      {thumb ? (
                        <img
                          src={imgUrl(thumb)}
                          alt={it.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Tanpa foto
                        </span>
                      )}
                      {isNew && (
                        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]">
                          New Arrival
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {it.type?.name || "Furniture"}
                          {it.code ? ` · ${it.code}` : ""}
                        </p>
                        <h3 className="serif text-lg leading-snug mt-0.5 line-clamp-1">
                          {it.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        disabled={togglingItemId === it.id}
                        onClick={() => toggleNewArrivalItem(it)}
                        className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                          isNew
                            ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                            : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isNew ? "fill-amber-500 text-amber-500" : ""
                          }`}
                        />
                        <span>
                          {isNew ? "Aktif di New Arrival" : "Tandai New Arrival"}
                        </span>
                      </button>
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
