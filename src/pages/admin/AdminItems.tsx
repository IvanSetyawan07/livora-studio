import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { removeItemBackgroundWithAi } from "@/lib/itemCutout";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Plus,
  Settings2,
  Search,
  Filter,
  Download,
  X,
  ArrowUpDown,
  QrCode,
  ClipboardList,
  Percent,
  Sparkles,
  Tag,
  Loader2,
  LayoutGrid,
  List,
  Check,
  CheckCircle2,
  Layers,
  ArrowRight,
  Maximize2,
  Wand2,
  Scissors,
  RotateCcw,
  Palette,
  Star,
  ChevronUp,
  ChevronDown,
  ImagePlus,
} from "lucide-react";
import ItemQRCode from "@/components/livora/ItemQRCode";
import BulkDiscountModal from "@/components/admin/BulkDiscountModal";
import BatchGeminiCutoutModal from "@/components/admin/BatchGeminiCutoutModal";
import { bulkDiscountItems } from "@/lib/promoApi";
import { invalidateAllItemsCache } from "@/lib/itemsApi";
import {
  LUXURY_COLOR_PRESETS,
  resolveSwatchHex,
  type VariantCategory,
} from "@/lib/furnitureColors";

type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc";
type ViewMode = "grid" | "table";

export default function AdminItems() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPromoMode = searchParams.get("mode") === "promo";
  const bannerTitleParam = searchParams.get("banner_title");

  const [items, setItems] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [qrItem, setQrItem] = useState<any | null>(null);

  // Tampilan (View Mode): Grid Galeri Visual vs Tabel Detail
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Mode Seleksi Promo (Hanya aktif jika admin mengaktifkannya, TIDAK mengotori tampilan normal)
  const [isPromoSelectMode, setIsPromoSelectMode] = useState<boolean>(initialPromoMode);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [singlePromoItem, setSinglePromoItem] = useState<any | null>(null);
  const [quickFilterTab, setQuickFilterTab] = useState<"all" | "new_arrival" | "promo">("all");
  const [clearingPromo, setClearingPromo] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchInitialItems, setBatchInitialItems] = useState<any[]>([]);

  // Filter / search / sort
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("date-desc");
  const [showFilter, setShowFilter] = useState(false);

  const load = () =>
    api.get("/items").then((r) => {
      setItems(r.data);
      setSelectedIds((prev) => prev.filter((id) => (r.data || []).some((it: any) => it.id === id)));
    });

  const loadTypes = () => api.get("/taxonomies/furniture-types").then((r) => setTypes(r.data));

  useEffect(() => {
    load();
    loadTypes();
    api.get("/taxonomies/themes").then((r) => setThemes(r.data));
    api.get("/taxonomies/categories").then((r) => setCats(r.data));
    api.get("/collections").then((r) => setCollections(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const onFocus = () => loadTypes();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Update query param bila mode promo berubah
  const handleTogglePromoMode = () => {
    const next = !isPromoSelectMode;
    setIsPromoSelectMode(next);
    if (!next) {
      setSelectedIds([]);
      searchParams.delete("mode");
      searchParams.delete("banner_title");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const del = async (i: any) => {
    if (!confirm(`Hapus item "${i.title}"?`)) return;
    await api.delete(`/admin/items/${i.id}`);
    invalidateAllItemsCache();
    load();
  };

  const handleToggleNewArrival = async (i: any) => {
    try {
      const r = await api.patch<{ ok: boolean; is_new_arrival: boolean }>(
        `/admin/items/${i.id}/toggle-new-arrival`,
      );
      const nextVal = Boolean(r.data?.is_new_arrival);
      setItems((prev) =>
        prev.map((x) => (x.id === i.id ? { ...x, is_new_arrival: nextVal } : x)),
      );
      invalidateAllItemsCache();
      toast.success(
        nextVal
          ? `"${i.title}" ditandai sebagai New Arrival`
          : `"${i.title}" dihapus dari New Arrival`,
      );
    } catch {
      toast.error("Gagal memperbarui status New Arrival");
    }
  };

  const downloadImage = async (i: any) => {
    if (!i.image) {
      alert("Item ini belum punya gambar.");
      return;
    }
    try {
      const url = imgUrl(i.image);
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${i.slug || i.code || i.title || "item"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      alert("Gagal mengunduh gambar.");
    }
  };

  // Toggle selection pada mode promo (klik langsung pada item)
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = (visibleItems: any[]) => {
    const visibleIds = visibleItems.map((i) => i.id);
    setSelectedIds(Array.from(new Set([...selectedIds, ...visibleIds])));
  };

  const deselectAllVisible = (visibleItems: any[]) => {
    const visibleIds = visibleItems.map((i) => i.id);
    setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
  };

  // Hapus promo dari item-item yang dipilih
  const handleBulkClearPromo = async () => {
    if (!confirm(`Hapus status promo dari ${selectedIds.length} item terpilih?`)) return;
    setClearingPromo(true);
    try {
      await bulkDiscountItems({
        item_ids: selectedIds,
        discount_value: 0,
        promo_badge_text: undefined,
      });
      toast.success("Status promo berhasil dihapus dari item terpilih");
      setSelectedIds([]);
      load();
    } catch {
      toast.error("Gagal menghapus status promo");
    } finally {
      setClearingPromo(false);
    }
  };

  const promoCount = useMemo(() => items.filter((i) => i.is_on_promo).length, [items]);
  const newArrivalCount = useMemo(() => items.filter((i) => i.is_new_arrival).length, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.code?.toLowerCase().includes(q),
      );
    }
    if (typeFilter) {
      list = list.filter((i) => String(i.type?.id ?? i.type_id ?? "") === typeFilter);
    }
    if (quickFilterTab === "promo") {
      list = list.filter((i) => i.is_on_promo);
    } else if (quickFilterTab === "new_arrival") {
      list = list.filter((i) => i.is_new_arrival);
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":  return (a.title || "").localeCompare(b.title || "");
        case "name-desc": return (b.title || "").localeCompare(a.title || "");
        case "date-asc":  return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "date-desc":
        default:          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });
    return list;
  }, [items, query, typeFilter, quickFilterTab, sortBy]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.includes(i.id));

  const selectedItemsData = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)),
    [items, selectedIds]
  );

  const activeFilterCount =
    (typeFilter ? 1 : 0) + (sortBy !== "date-desc" ? 1 : 0) + (quickFilterTab !== "all" ? 1 : 0);

  const fmtDate = (d?: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="pb-32 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1.5">Katalog Furnitur</p>
          <h1 className="serif text-3xl sm:text-4xl font-light">Items / Furniture</h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Kelola katalog furnitur eksklusif LIVORA. Pilih furnitur untuk program promo, atau ubah spesifikasi produk.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Tombol Batch Gemini AI Cutout (Pilih 5 atau berapapun foto) */}
          <button
            type="button"
            onClick={() => {
              setBatchInitialItems([]);
              setShowBatchModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded text-xs uppercase tracking-[0.16em] font-medium transition-all shadow-sm bg-card hover:bg-muted text-foreground border border-border"
            title="Pilih 5 atau berapapun foto sekaligus untuk dihapus backgroundnya oleh Gemini AI"
          >
            <Scissors className="w-3.5 h-3.5 text-[#D7B483]" />
            <span>Batch Hapus BG (Gemini AI)</span>
          </button>

          {/* Tombol Toggle Mode Seleksi Promo */}
          <button
            type="button"
            onClick={handleTogglePromoMode}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded text-xs uppercase tracking-[0.16em] font-medium transition-all shadow-sm ${
              isPromoSelectMode
                ? "bg-[#D7B483] text-black ring-2 ring-[#D7B483]/50 font-semibold"
                : "bg-muted/70 hover:bg-muted text-foreground border border-border"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            {isPromoSelectMode ? "✕ Keluar Mode Promo" : "Pilih Item Promo"}
          </button>

          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-xs uppercase tracking-[0.2em] font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Item
          </button>
        </div>
      </div>

      {/* Banner Panduan Mode Promo Aktif */}
      {isPromoSelectMode && (
        <div className="p-4 rounded-xl bg-[#D7B483]/15 border border-[#D7B483]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-from-top-2 duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#D7B483] text-black flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-[#8B682E]">
                Mode Seleksi Promo Aktif
                {bannerTitleParam && (
                  <span className="font-normal text-muted-foreground ml-1.5">
                    (untuk banner: <strong>"{bannerTitleParam}"</strong>)
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground/85 mt-0.5">
                Klik langsung pada kartu atau baris produk yang ingin diikutsertakan dalam promo. Item terpilih ditandai dengan bingkai emas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {allVisibleSelected ? (
              <button
                type="button"
                onClick={() => deselectAllVisible(filtered)}
                className="px-3 py-1.5 rounded text-xs bg-background border border-border hover:bg-muted font-medium"
              >
                Batal Pilih Semua
              </button>
            ) : (
              <button
                type="button"
                onClick={() => selectAllVisible(filtered)}
                className="px-3 py-1.5 rounded text-xs bg-background border border-border hover:bg-muted font-medium"
              >
                Pilih Semua ({filtered.length})
              </button>
            )}
            <button
              type="button"
              onClick={handleTogglePromoMode}
              className="p-1.5 rounded hover:bg-black/10 text-muted-foreground"
              title="Tutup Mode Promo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Filter, Search, Tab Promo, & View Switcher (Galeri vs Tabel) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tab Filter Cepat: Semua vs New Arrival vs Sedang Promo */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border text-xs">
          <button
            type="button"
            onClick={() => setQuickFilterTab("all")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              quickFilterTab === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setQuickFilterTab("new_arrival")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors inline-flex items-center gap-1.5 ${
              quickFilterTab === "new_arrival" ? "bg-card text-[#0B426E] shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="w-3.5 h-3.5 text-[#1E88C7]" />
            New Arrival ({newArrivalCount})
          </button>
          <button
            type="button"
            onClick={() => setQuickFilterTab("promo")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors inline-flex items-center gap-1.5 ${
              quickFilterTab === "promo" ? "bg-card text-[#A88247] shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D7B483]" />
            Sedang Promo ({promoCount})
          </button>
        </div>

        {/* View Switcher: Galeri Visual vs Tabel Detail */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border text-xs">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors inline-flex items-center gap-1.5 ${
              viewMode === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Tampilan Galeri Visual (Sangat nyaman untuk memilih produk)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Galeri Visual</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors inline-flex items-center gap-1.5 ${
              viewMode === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Tampilan Tabel Detail"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tabel Detail</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau code item..."
            className="w-full pl-9 pr-9 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Popup */}
        <div className="relative">
          <button
            onClick={() => setShowFilter((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-sm hover:bg-muted"
          >
            <Filter className="w-4 h-4" /> Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 text-[10px] bg-foreground text-background rounded-full px-1.5 py-0.5">{activeFilterCount}</span>
            )}
          </button>
          {showFilter && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFilter(false)} />
              <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-xl p-4 z-50 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Furniture Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 rounded border border-border bg-background text-sm"
                  >
                    <option value="">All Types</option>
                    {types.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" /> Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="mt-1 w-full px-2 py-1.5 rounded border border-border bg-background text-sm"
                  >
                    <option value="date-desc">Date Upload (Newest)</option>
                    <option value="date-asc">Date Upload (Oldest)</option>
                    <option value="name-asc">Name (A → Z)</option>
                    <option value="name-desc">Name (Z → A)</option>
                  </select>
                </div>
                <div className="flex justify-between pt-1">
                  <button
                    onClick={() => { setTypeFilter(""); setSortBy("date-desc"); setQuickFilterTab("all"); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Reset
                  </button>
                  <button onClick={() => setShowFilter(false)} className="text-xs px-3 py-1 bg-foreground text-background rounded">Done</button>
                </div>
              </div>
            </>
          )}
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} dari {items.length} item
        </span>
      </div>

      {/* ── TAMPILAN 1: MODE GALERI KARTU VISUAL (Nyaman & Elegan) ── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((i) => {
            const isSelected = selectedIds.includes(i.id);
            return (
              <div
                key={i.id}
                onClick={() => {
                  if (isPromoSelectMode) {
                    toggleSelect(i.id);
                  }
                }}
                className={`group relative bg-card rounded-xl border overflow-hidden flex flex-col transition-all duration-200 select-none ${
                  isPromoSelectMode ? "cursor-pointer" : ""
                } ${
                  isSelected
                    ? "border-[#D7B483] ring-2 ring-[#D7B483] shadow-md bg-[#D7B483]/5"
                    : isPromoSelectMode
                    ? "border-border hover:border-[#D7B483]/60 hover:shadow-sm"
                    : "border-border hover:shadow-md"
                }`}
              >
                {/* Visual Image Container */}
                <div className="relative aspect-[4/5] w-full bg-[#F3EFE8] overflow-hidden">
                  {i.image ? (
                    <img
                      src={imgUrl(i.image)}
                      alt={i.title}
                      className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No Image
                    </div>
                  )}

                  {/* Badge New Arrival & Promo di pojok kiri atas */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1">
                    {i.is_new_arrival && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider text-white bg-[#0B426E] px-2.5 py-0.5 rounded-full shadow-md uppercase">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        New Arrival
                      </span>
                    )}
                    {i.is_on_promo && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider text-black bg-[#D7B483] px-2.5 py-0.5 rounded-full shadow-md uppercase">
                        <Sparkles className="w-2.5 h-2.5" />
                        {i.promo_badge_text || `${i.discount_value}% OFF`}
                      </span>
                    )}
                  </div>

                  {/* Quick Toggle New Arrival (pojok kanan atas saat normal mode) */}
                  {!isPromoSelectMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleNewArrival(i);
                      }}
                      title={i.is_new_arrival ? "Hapus dari New Arrival" : "Tandai sebagai New Arrival"}
                      className={`absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        i.is_new_arrival
                          ? "bg-[#0B426E] text-white"
                          : "bg-white/85 text-muted-foreground hover:text-[#0B426E] hover:bg-white"
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${i.is_new_arrival ? "fill-current" : ""}`} />
                    </button>
                  )}

                  {/* Indikator Terpilih (Khusus Mode Seleksi Promo) */}
                  {isPromoSelectMode && (
                    <div
                      className={`absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-[#D7B483] text-black shadow-md scale-100"
                          : "bg-black/50 text-white/70 border border-white/30 backdrop-blur-sm group-hover:bg-black/70"
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] font-mono">+</span>
                      )}
                    </div>
                  )}

                  {/* Hover Quick Overlay saat Normal Mode */}
                  {!isPromoSelectMode && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSinglePromoItem(i);
                        }}
                        className="px-2.5 py-1.5 rounded bg-[#D7B483] text-black text-[11px] font-medium tracking-wide flex items-center gap-1 shadow-md hover:bg-[#c6a270]"
                        title="Atur Promo Khusus Item Ini"
                      >
                        <Tag className="w-3 h-3" />
                        Promo
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(i);
                          setShowForm(true);
                        }}
                        className="p-1.5 rounded bg-white text-black hover:bg-stone-200 shadow-md"
                        title="Edit Item"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-medium text-xs sm:text-sm line-clamp-1 group-hover:text-[#A88247] transition-colors">
                      {i.title}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                      <span className="font-mono">{i.code || "—"}</span>
                      <span>{i.type?.name || "—"}</span>
                    </div>

                    {/* Swatch Warna Produk */}
                    <div className="mt-2.5 flex items-center gap-1.5 min-h-[18px]">
                      {(i.variants ?? []).length > 0 ? (
                        <>
                          {(i.variants ?? []).slice(0, 6).map((v: any) => (
                            <span
                              key={v.id}
                              title={v.color_name || v.variant_name}
                              className={`w-4 h-4 rounded-full border border-black/15 shrink-0 ${
                                v.is_default ? "ring-1 ring-foreground ring-offset-1 ring-offset-card" : ""
                              }`}
                              style={{ backgroundColor: resolveSwatchHex(v) }}
                            />
                          ))}
                          {(i.variants ?? []).length > 6 && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              +{i.variants.length - 6}
                            </span>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(i);
                            setShowForm(true);
                          }}
                          className="text-[10px] text-muted-foreground/75 hover:text-[#A88247] inline-flex items-center gap-1"
                        >
                          <Palette className="w-3 h-3" /> + Tambah warna
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Actions (di bawah) */}
                  <div className="pt-2.5 mt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {i.availability || "available"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrItem(i);
                        }}
                        title="QR Code"
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                      >
                        <QrCode className="w-3 h-3" />
                      </button>
                      <Link
                        to={`/admin/items/${i.slug}/detail`}
                        title="Rincian Teknis"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground inline-flex"
                      >
                        <ClipboardList className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          del(i);
                        }}
                        title="Hapus"
                        className="p-1 hover:bg-destructive/15 text-destructive rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAMPILAN 2: MODE TABEL DETAIL (Bersih Tanpa Centang di Normal Mode) ── */}
      {viewMode === "table" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-[0.15em] text-muted-foreground border-b border-border">
                <tr>
                  {/* Kolom Seleksi HANYA muncul saat Mode Promo Aktif */}
                  {isPromoSelectMode && (
                    <th className="p-3 w-12 text-center">
                      <span className="text-[10px] uppercase font-bold text-[#A88247]">Pilih</span>
                    </th>
                  )}
                  <th className="text-left p-3">Image</th>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Warna</th>
                  <th className="text-left p-3">New Arrival</th>
                  <th className="text-left p-3">Status Promo</th>
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Categories</th>
                  <th className="text-left p-3">Avail</th>
                  <th className="text-left p-3">Uploaded</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((i) => {
                  const isSelected = selectedIds.includes(i.id);
                  return (
                    <tr
                      key={i.id}
                      onClick={() => {
                        if (isPromoSelectMode) {
                          toggleSelect(i.id);
                        }
                      }}
                      className={`transition-colors ${
                        isPromoSelectMode ? "cursor-pointer" : ""
                      } ${
                        isSelected
                          ? "bg-[#D7B483]/15 font-medium"
                          : isPromoSelectMode
                          ? "hover:bg-muted/40"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      {/* Tombol Pilih (HANYA muncul saat Mode Promo Aktif) */}
                      {isPromoSelectMode && (
                        <td className="p-3 text-center">
                          <div
                            className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-[#D7B483] text-black shadow-sm"
                                : "border border-border bg-background"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </td>
                      )}

                      {/* Image Thumbnail */}
                      <td className="p-3">
                        {i.image ? (
                          <img
                            src={imgUrl(i.image)}
                            className="w-12 h-12 object-cover rounded border border-border"
                            alt=""
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded border border-border" />
                        )}
                      </td>

                      {/* Title */}
                      <td className="p-3 font-medium">
                        <div>{i.title}</div>
                      </td>

                      {/* Warna / Swatches */}
                      <td className="p-3">
                        {(i.variants ?? []).length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap max-w-[160px]">
                            {(i.variants ?? []).slice(0, 5).map((v: any) => (
                              <span
                                key={v.id}
                                title={v.color_name || v.variant_name}
                                className={`w-4 h-4 rounded-full border border-black/15 shrink-0 ${
                                  v.is_default ? "ring-1 ring-foreground ring-offset-1 ring-offset-card" : ""
                                }`}
                                style={{ backgroundColor: resolveSwatchHex(v) }}
                              />
                            ))}
                            {(i.variants ?? []).length > 5 && (
                              <span className="text-[11px] text-muted-foreground">+{i.variants.length - 5}</span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(i);
                              setShowForm(true);
                            }}
                            className="text-xs text-muted-foreground/70 hover:text-[#A88247] hover:underline whitespace-nowrap"
                          >
                            + Warna
                          </button>
                        )}
                      </td>

                      {/* New Arrival Toggle */}
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleNewArrival(i);
                          }}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                            i.is_new_arrival
                              ? "bg-[#0B426E] text-white border-[#0B426E]"
                              : "bg-background text-muted-foreground border-border hover:border-[#0B426E]/40 hover:text-[#0B426E]"
                          }`}
                          title="Tampilkan item ini pada spotlight New Arrival di landing page"
                        >
                          <Star className={`w-3 h-3 ${i.is_new_arrival ? "fill-current" : ""}`} />
                          {i.is_new_arrival ? "New Arrival" : "Set New"}
                        </button>
                      </td>

                      {/* Promo Status Badge */}
                      <td className="p-3">
                        {i.is_on_promo ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSinglePromoItem(i);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold text-black bg-[#D7B483] px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm hover:opacity-90"
                            title="Klik untuk ubah diskon promo"
                          >
                            <Sparkles className="w-3 h-3" />
                            {i.promo_badge_text || `${i.discount_value}% OFF`}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSinglePromoItem(i);
                            }}
                            className="text-xs text-muted-foreground/60 hover:text-[#A88247] hover:underline"
                            title="Klik untuk aktifkan promo pada item ini"
                          >
                            + Tambah Promo
                          </button>
                        )}
                      </td>

                      {/* Code */}
                      <td className="p-3 text-muted-foreground font-mono text-xs">{i.code || "—"}</td>

                      {/* Type */}
                      <td className="p-3">{i.type?.name || "—"}</td>

                      {/* Categories */}
                      <td className="p-3 text-xs">{i.categories?.map((c: any) => c.name).join(", ") || "—"}</td>

                      {/* Availability */}
                      <td className="p-3 text-xs capitalize">{i.availability || "available"}</td>

                      {/* Date */}
                      <td className="p-3 text-xs whitespace-nowrap">{fmtDate(i.created_at)}</td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Tombol Quick Promo per Item */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSinglePromoItem(i);
                            }}
                            title="Atur Diskon Promo Item Ini"
                            className="p-1.5 hover:bg-[#D7B483]/20 rounded text-[#A88247] transition-colors"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); setQrItem(i); }} title="QR Identity" className="p-1.5 hover:bg-muted rounded" disabled={!i.slug}>
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); downloadImage(i); }} title="Download image" className="p-1.5 hover:bg-muted rounded" disabled={!i.image}>
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <Link to={`/admin/items/${i.slug}/detail`} onClick={(e) => e.stopPropagation()} title="Rincian internal" className="p-1.5 hover:bg-muted rounded inline-flex">
                            <ClipboardList className="w-3.5 h-3.5" />
                          </Link>
                          <Link to={`/admin/items/${i.id}/experience`} onClick={(e) => e.stopPropagation()} title="Manage Experience" className="p-1.5 hover:bg-muted rounded inline-flex">
                            <Settings2 className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={(e) => { e.stopPropagation(); setEditing(i); setShowForm(true); }} className="p-1.5 hover:bg-muted rounded" title="Edit Item">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); del(i); }} className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
          {items.length === 0 ? "Belum ada item furnitur." : "Tidak ada furnitur yang cocok dengan pencarian / filter."}
        </div>
      )}

      {/* Sticky Bottom Action Bar for Bulk Selection (Muncul saat ada item yang dipilih) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-from-bottom-4 duration-200 border border-white/20">
          <span className="text-xs uppercase tracking-wider font-semibold">
            <strong className="text-[#D7B483]">{selectedIds.length}</strong> item terpilih
          </span>

          <div className="h-4 w-px bg-background/30" />

          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#D7B483] text-black text-xs uppercase tracking-wider font-semibold hover:bg-[#c49e6b] transition-colors shadow-md"
          >
            <Percent className="w-3.5 h-3.5" /> Terapkan Diskon Massal
          </button>

          {/* Tombol Hapus Background Massal untuk Item Terpilih */}
          <button
            type="button"
            onClick={() => {
              setBatchInitialItems(selectedItemsData);
              setShowBatchModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-background/30 hover:bg-background/10 text-xs uppercase tracking-wider transition-colors"
            title="Hapus background foto untuk semua item terpilih sekaligus dengan Gemini AI"
          >
            <Scissors className="w-3.5 h-3.5 text-[#D7B483]" />
            <span>Hapus BG ({selectedIds.length} Item)</span>
          </button>

          <button
            type="button"
            disabled={clearingPromo}
            onClick={handleBulkClearPromo}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-background/30 hover:bg-background/10 text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {clearingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Hapus Promo"}
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-xs text-background/70 hover:text-background underline ml-1"
          >
            Batal
          </button>
        </div>
      )}

      {/* Bulk Discount Modal (Untuk Banyak Item) */}
      <BulkDiscountModal
        isOpen={showBulkModal}
        selectedIds={selectedIds}
        selectedItems={selectedItemsData}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => {
          setShowBulkModal(false);
          setSelectedIds([]);
          setIsPromoSelectMode(false); // Otomatis keluar mode promo setelah tersimpan
          load();
        }}
      />

      {/* Batch Gemini AI Cutout Modal (Multi-Image / Multi-Item) */}
      <BatchGeminiCutoutModal
        isOpen={showBatchModal}
        initialItems={batchInitialItems}
        onClose={() => {
          setShowBatchModal(false);
          setBatchInitialItems([]);
        }}
        onItemsUpdated={() => {
          load();
          setSelectedIds([]);
        }}
        onApplyToNewItem={(cleanFile, cleanUrl) => {
          setEditing(null);
          setShowForm(true);
        }}
      />

      {/* Single Item Quick Promo Modal (Untuk 1 Item Spesifik) */}
      {singlePromoItem && (
        <BulkDiscountModal
          isOpen={true}
          selectedIds={[singlePromoItem.id]}
          selectedItems={[singlePromoItem]}
          onClose={() => setSinglePromoItem(null)}
          onSuccess={() => {
            setSinglePromoItem(null);
            load();
          }}
        />
      )}

      {/* Form Tambah/Edit Item dengan Flexible Image Uploader & Live Preview */}
      {showForm && (
        <ItemForm
          item={editing}
          types={types}
          themes={themes}
          cats={cats}
          collections={collections}
          onClose={() => setShowForm(false)}
          onSaved={(saved: any, isNew: boolean) => {
            setShowForm(false);
            invalidateAllItemsCache();
            load();
            if (isNew && saved?.slug) setQrItem(saved);
          }}
        />
      )}

      {/* QR Item Identity */}
      {qrItem && (
        <ItemQRCode
          slug={qrItem.slug}
          name={qrItem.title}
          code={qrItem.code}
          onClose={() => setQrItem(null)}
        />
      )}
    </div>
  );
}

type ColorDraftRow = {
  uid: string;
  id?: number | null;
  color_name: string;
  color_code: string;
  category: VariantCategory;
  material_name: string;
  is_default: boolean;
  existingImage: string | null;
  imageFile: File | null;
  imagePreview: string | null;
  removeImage: boolean;
};

// ── Form Tambah / Edit Item Furnitur dengan Live Image Preview & Color Swatch CRUD ──
function ItemForm({ item, types, themes, cats, collections, onClose, onSaved }: any) {
  const [title, setTitle] = useState(item?.title || "");
  const [code, setCode] = useState(item?.code || "");
  const [texture, setTexture] = useState(item?.texture || "");
  const [finish, setFinish] = useState(item?.finish || "");
  const [availability, setAvailability] = useState(item?.availability || "available");
  const [description, setDescription] = useState(item?.description || "");
  const [typeId, setTypeId] = useState(item?.type_id?.toString() || "");
  const [collectionId, setCollectionId] = useState(item?.collection_id?.toString() || item?.collection?.id?.toString() || "");
  const [themeIds, setThemeIds] = useState<number[]>(item?.themes?.map((t: any) => t.id) || []);
  const [catIds, setCatIds] = useState<number[]>(item?.categories?.map((c: any) => c.id) || []);

  // Pilihan Warna / Swatch per Item (disinkronkan ke furniture_variants)
  const [colorRows, setColorRows] = useState<ColorDraftRow[]>(() =>
    ((item?.variants ?? []) as any[]).map((v, idx) => ({
      uid: `v-${v.id ?? idx}`,
      id: v.id ?? null,
      color_name: v.color_name || v.variant_name || "",
      color_code: resolveSwatchHex(v),
      category: (v.category as VariantCategory) || "fabric",
      material_name: v.material_name || "",
      is_default: Boolean(v.is_default),
      existingImage: v.furniture_image ? imgUrl(v.furniture_image) : null,
      imageFile: null,
      imagePreview: v.furniture_image ? imgUrl(v.furniture_image) : null,
      removeImage: false,
    })),
  );
  const [previewColorIdx, setPreviewColorIdx] = useState<number>(0);

  // Image Upload & 2 AI Action Buttons (Hapus Background & Upscale)
  const [file, setFile] = useState<File | null>(null);
  const [previewImgUrl, setPreviewImgUrl] = useState<string>(
    item?.image ? imgUrl(item.image) : ""
  );
  const [originalBackupUrl, setOriginalBackupUrl] = useState<string>(
    item?.image ? imgUrl(item.image) : ""
  );
  const [originalBackupFile, setOriginalBackupFile] = useState<File | null>(null);
  const [imageFit, setImageFit] = useState<"contain" | "cover">("contain");
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isModifiedByAi, setIsModifiedByAi] = useState(false);

  // Promo & Badge settings (tanpa CRUD harga / nominal Rupiah)
  const [isOnPromo, setIsOnPromo] = useState<boolean>(item?.is_on_promo || false);
  const [isNewArrival, setIsNewArrival] = useState<boolean>(Boolean(item?.is_new_arrival));
  const [discountValue, setDiscountValue] = useState<string>(
    item?.discount_type === "PERCENTAGE" && item?.discount_value
      ? item.discount_value.toString()
      : "",
  );
  const [promoBadgeText, setPromoBadgeText] = useState<string>(item?.promo_badge_text || "");

  const [saving, setSaving] = useState(false);

  const addPresetColor = (preset: (typeof LUXURY_COLOR_PRESETS)[number]) => {
    const existsIdx = colorRows.findIndex(
      (r) => r.color_name.trim().toLowerCase() === preset.name.toLowerCase(),
    );
    if (existsIdx >= 0) {
      setPreviewColorIdx(existsIdx);
      toast.info(`Warna "${preset.name}" sudah ada pada item ini.`);
      return;
    }
    setColorRows((prev) => [
      ...prev,
      {
        uid: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        id: null,
        color_name: preset.name,
        color_code: preset.hex,
        category: preset.category,
        material_name: preset.material || "",
        is_default: prev.length === 0,
        existingImage: null,
        imageFile: null,
        imagePreview: null,
        removeImage: false,
      },
    ]);
    setPreviewColorIdx(colorRows.length);
  };

  const addCustomColor = () => {
    setColorRows((prev) => [
      ...prev,
      {
        uid: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        id: null,
        color_name: "",
        color_code: "#D8CFC2",
        category: "fabric",
        material_name: "",
        is_default: prev.length === 0,
        existingImage: null,
        imageFile: null,
        imagePreview: null,
        removeImage: false,
      },
    ]);
    setPreviewColorIdx(colorRows.length);
  };

  const updateColorRow = (uid: string, patch: Partial<ColorDraftRow>) => {
    setColorRows((prev) =>
      prev.map((row) => (row.uid === uid ? { ...row, ...patch } : row)),
    );
  };

  const setDefaultColor = (uid: string) => {
    setColorRows((prev) =>
      prev.map((row) => ({ ...row, is_default: row.uid === uid })),
    );
  };

  const removeColorRow = (uid: string) => {
    setColorRows((prev) => {
      const next = prev.filter((row) => row.uid !== uid);
      if (next.length > 0 && !next.some((r) => r.is_default)) {
        next[0] = { ...next[0], is_default: true };
      }
      return next;
    });
    setPreviewColorIdx(0);
  };

  const moveColorRow = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    setColorRows((prev) => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const url = URL.createObjectURL(f);
      setPreviewImgUrl(url);
      setOriginalBackupFile(f);
      setOriginalBackupUrl(url);
      setIsModifiedByAi(false);
    }
  };

  // ── 1. BUTTON HAPUS BACKGROUND (IS-Net Neural + Gemini Vision Pixel Matte) ──
  const handleRemoveBg = async () => {
    if (!previewImgUrl) return;
    setIsRemovingBg(true);
    const toastId = toast.loading("AI sedang memindai objek & menghapus background secara presisi...");

    try {
      const result = await removeItemBackgroundWithAi({
        file,
        imageUrl: previewImgUrl,
        baseName: file?.name || title || "furniture",
      });

      setFile(result.file);
      setPreviewImgUrl(result.url);
      setIsModifiedByAi(true);

      const detectedLabel = result.detectedName ? ` ("${result.detectedName}")` : "";
      toast.success(
        `Background berhasil dihapus bersih [${result.modelUsed}]${detectedLabel}!`,
        { id: toastId },
      );
    } catch (err: any) {
      console.error("Remove BG error:", err);
      toast.error(
        err?.response?.data?.message || err?.message || "Gagal menghapus background foto.",
        { id: toastId },
      );
    } finally {
      setIsRemovingBg(false);
    }
  };

  // ── 2. BUTTON UPSCALE GAMBAR (Google Gemini AI Vision) ──
  const handleUpscale = async () => {
    if (!previewImgUrl) return;
    setIsUpscaling(true);
    const toastId = toast.loading("Google Gemini AI sedang menganalisis tekstur & meng-upscale resolusi...");

    try {
      const fd = new FormData();
      if (file) {
        fd.append("image", file);
      } else {
        fd.append("image", previewImgUrl);
      }
      fd.append("action", "upscale");

      const res = await api.post("/admin/items/gemini-process", fd);
      if (res.data?.success && (res.data?.base64 || res.data?.url)) {
        const outUrl = res.data.base64 || res.data.url;
        const fetchRes = await fetch(outUrl);
        const blob = await fetchRes.blob();
        const upscaledFile = new File([blob], (file?.name || "furniture").replace(/\.[^/.]+$/, "") + "-gemini-upscale.png", {
          type: "image/png",
        });
        setFile(upscaledFile);
        setPreviewImgUrl(URL.createObjectURL(upscaledFile));
        setIsModifiedByAi(true);

        const modelUsed = res.data?.model || "Gemini Vision";
        toast.success(`Berhasil! Google Gemini AI [${modelUsed}] berhasil meng-upscale gambar 2x lebih jernih.`, { id: toastId });
      } else {
        throw new Error(res.data?.message || "Gagal meng-upscale dengan Gemini");
      }
    } catch (err: any) {
      console.error("Gemini Upscale error:", err);
      // Fallback lokal client-side canvas
      try {
        const img = new Image();
        if (!previewImgUrl.startsWith("blob:") && !previewImgUrl.startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => reject(e);
          img.src = previewImgUrl;
        });

        const targetW = (img.naturalWidth || 800) * 2;
        const targetH = (img.naturalHeight || 600) * 2;
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, targetW, targetH);
          canvas.toBlob((blob) => {
            if (blob) {
              const f = new File([blob], "upscaled.webp", { type: "image/webp" });
              setFile(f);
              setPreviewImgUrl(URL.createObjectURL(f));
              setIsModifiedByAi(true);
              toast.success(`Gambar di-upscale ke ${targetW}x${targetH}px!`, { id: toastId });
            }
          }, "image/webp", 0.95);
        }
      } catch (fErr) {
        toast.error(err?.response?.data?.message || err?.message || "Gagal meng-upscale gambar.", { id: toastId });
      }
    } finally {
      setIsUpscaling(false);
    }
  };

  // Reset ke foto asli
  const handleResetOriginal = () => {
    setFile(originalBackupFile);
    setPreviewImgUrl(originalBackupUrl);
    setIsModifiedByAi(false);
    toast.info("Foto dikembalikan ke versi asli.");
  };

  // Auto-update promo badge saat persentase diskon berubah
  const handleDiscountChange = (valStr: string) => {
    setDiscountValue(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      setIsOnPromo(true);
      setPromoBadgeText(`${Math.min(100, Math.round(num))}% OFF`);
    } else {
      setIsOnPromo(false);
      setPromoBadgeText("");
    }
  };

  const tog = (arr: number[], setArr: any, id: number) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const incompleteColor = colorRows.find((r) => !r.color_name.trim());
    if (incompleteColor) {
      toast.error("Mohon lengkapi nama semua warna yang ditambahkan (atau hapus baris kosong).");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("code", code);
      fd.append("texture", texture);
      fd.append("finish", finish);
      fd.append("availability", availability);
      fd.append("description", description);
      if (typeId) fd.append("type_id", typeId);
      if (collectionId) fd.append("collection_id", collectionId);
      themeIds.forEach((id) => fd.append("theme_ids[]", id.toString()));
      catIds.forEach((id) => fd.append("category_ids[]", id.toString()));
      if (file) fd.append("image", file);

      // Kirim pilihan warna / swatches per item
      const serializedColors = colorRows.map((row, idx) => {
        const imageField = row.imageFile ? `color_image_${idx}` : null;
        if (row.imageFile && imageField) {
          fd.append(imageField, row.imageFile);
        }
        return {
          id: row.id ?? null,
          color_name: row.color_name.trim(),
          color_code: row.color_code.trim() || "#D8CFC2",
          category: row.category || "fabric",
          material_name: row.material_name.trim() || null,
          is_default: row.is_default,
          sort_order: idx,
          image_field: imageField,
          remove_image: row.removeImage,
        };
      });
      fd.append("colors_json", JSON.stringify(serializedColors));

      // Promo & badge data (tanpa field harga — harga diatur di backoffice)
      fd.append("is_on_promo", isOnPromo ? "1" : "0");
      fd.append("is_new_arrival", isNewArrival ? "1" : "0");
      fd.append("promo_badge_text", promoBadgeText.trim());
      if (discountValue && parseFloat(discountValue) > 0) {
        fd.append("discount_type", "PERCENTAGE");
        fd.append("discount_value", discountValue);
      } else {
        fd.append("discount_value", "0");
      }

      const url = item ? `/admin/items/${item.id}` : "/admin/items";
      const res = await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(item ? "Item & pilihan warna berhasil diperbarui" : "Item baru berhasil ditambahkan");
      onSaved(res.data, !item);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center p-4 sm:p-6 z-50 overflow-y-auto" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-card border border-border rounded-xl w-full max-w-3xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="serif text-2xl font-light">{item ? "Edit Item Furnitur" : "Tambah Item Furnitur Baru"}</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* General Details */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title *">
            <input required className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Code">
            <input className="ui-input" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="Type (Jenis Furniture)">
            <select className="ui-input" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">—</option>
              {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Collection">
            <select className="ui-input" value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
              <option value="">— None —</option>
              {(collections ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Availability">
            <select className="ui-input" value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="available">Available</option>
              <option value="made_to_order">Made to Order</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </Field>
          <Field label="Texture">
            <input className="ui-input" value={texture} onChange={(e) => setTexture(e.target.value)} />
          </Field>
          <Field label="Finish">
            <input className="ui-input" value={finish} onChange={(e) => setFinish(e.target.value)} />
          </Field>
        </div>

        {/* Flexible Image Upload & Live Preview Section */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
              Foto Produk Furnitur
            </span>
            {previewImgUrl && (
              <div className="flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded border border-border">
                <span className="text-muted-foreground">Mode Tampilan:</span>
                <button
                  type="button"
                  onClick={() => setImageFit("contain")}
                  className={`px-1.5 py-0.5 rounded ${imageFit === "contain" ? "bg-card font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  Fit Penuh
                </button>
                <button
                  type="button"
                  onClick={() => setImageFit("cover")}
                  className={`px-1.5 py-0.5 rounded ${imageFit === "cover" ? "bg-card font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  Isi Frame
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-8">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-foreground file:text-background hover:file:opacity-90 cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Format: WebP, JPG, PNG (Resolusi tinggi disarankan)
              </p>

              {previewImgUrl && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  {/* Tombol 1: Hapus Background */}
                  <button
                    type="button"
                    onClick={handleRemoveBg}
                    disabled={isRemovingBg || isUpscaling}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D7B483] text-black text-xs font-semibold hover:bg-[#c6a270] transition-all shadow-sm disabled:opacity-50"
                    title="Hapus background objek dengan Google Gemini AI"
                  >
                    {isRemovingBg ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gemini AI Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Hapus Background (Gemini AI)</span>
                      </>
                    )}
                  </button>

                  {/* Tombol 2: Upscale Gambar */}
                  <button
                    type="button"
                    onClick={handleUpscale}
                    disabled={isRemovingBg || isUpscaling}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
                    title="Tingkatkan resolusi & tekstur gambar dengan Google Gemini AI"
                  >
                    {isUpscaling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gemini AI Meng-upscale...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#D7B483]" />
                        <span>Upscale Gambar (Gemini AI)</span>
                      </>
                    )}
                  </button>

                  {/* Reset ke Asli jika sudah diedit */}
                  {isModifiedByAi && (
                    <button
                      type="button"
                      onClick={handleResetOriginal}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors"
                      title="Kembalikan ke foto awal"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Asli</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {previewImgUrl && (
              <div className="sm:col-span-4 flex justify-center">
                <div className="w-28 h-28 rounded-lg overflow-hidden bg-muted/40 border border-border shadow-sm flex items-center justify-center relative">
                  <div
                    className="absolute inset-0 opacity-35 pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #c8c4bc 25%, transparent 25%), linear-gradient(-45deg, #c8c4bc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #c8c4bc 75%), linear-gradient(-45deg, transparent 75%, #c8c4bc 75%)",
                      backgroundSize: "12px 12px",
                      backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                    }}
                  />
                  <img
                    src={previewImgUrl}
                    alt="Preview"
                    className={`relative z-[1] w-full h-full p-1 ${imageFit === "contain" ? "object-contain" : "object-cover"}`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pilihan Warna / Swatch Produk (CRUD Interaktif) */}
        <div className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-muted/30 border border-border space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] font-semibold text-foreground">
                <Palette className="w-4 h-4 text-[#A88247]" />
                Pilihan Warna / Swatch Produk
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Tambahkan warna apa saja yang tersedia untuk item ini. Warna akan tampil sebagai lingkaran interaktif pada kartu furnitur.
              </p>
            </div>
            <button
              type="button"
              onClick={addCustomColor}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Warna Custom
            </button>
          </div>

          {/* Palet Kurasi Cepat (1 klik langsung tambah) */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Tambah Cepat dari Palet Kurasi LIVORA
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LUXURY_COLOR_PRESETS.map((preset) => {
                const alreadyAdded = colorRows.some(
                  (r) => r.color_name.trim().toLowerCase() === preset.name.toLowerCase(),
                );
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => addPresetColor(preset)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                      alreadyAdded
                        ? "bg-foreground text-background border-foreground font-medium"
                        : "bg-card hover:bg-muted border-border text-foreground"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span>{preset.name}</span>
                    {alreadyAdded && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daftar Warna Aktif untuk Item Ini */}
          {colorRows.length > 0 ? (
            <div className="space-y-2.5">
              {colorRows.map((row, idx) => (
                <div
                  key={row.uid}
                  className={`p-3 rounded-lg bg-card border transition-colors ${
                    row.is_default ? "border-[#A88247]/70 shadow-sm" : "border-border"
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    {/* Color Picker + Hex */}
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9A-Fa-f]{6}$/.test(row.color_code) ? row.color_code : "#D8CFC2"}
                        onChange={(e) =>
                          updateColorRow(row.uid, { color_code: e.target.value.toUpperCase() })
                        }
                        title="Pilih kode warna"
                        className="w-9 h-9 rounded-full border border-border cursor-pointer shrink-0 p-0.5 bg-background"
                      />
                      <input
                        value={row.color_code}
                        onChange={(e) =>
                          updateColorRow(row.uid, { color_code: e.target.value.toUpperCase() })
                        }
                        placeholder="#D8CFC2"
                        maxLength={9}
                        className="ui-input text-xs font-mono"
                      />
                    </div>

                    {/* Nama Warna */}
                    <div className="sm:col-span-3">
                      <input
                        value={row.color_name}
                        onChange={(e) => updateColorRow(row.uid, { color_name: e.target.value })}
                        placeholder="Nama warna (mis. Oatmeal Linen)"
                        className="ui-input text-xs"
                        required
                      />
                    </div>

                    {/* Material & Kategori */}
                    <div className="sm:col-span-3 flex items-center gap-1.5">
                      <select
                        value={row.category}
                        onChange={(e) =>
                          updateColorRow(row.uid, { category: e.target.value as VariantCategory })
                        }
                        className="ui-input text-xs"
                      >
                        <option value="fabric">Fabric</option>
                        <option value="leather">Leather</option>
                        <option value="wood">Wood</option>
                        <option value="marble">Marble</option>
                        <option value="metal">Metal</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Foto Khusus Warna + Utama + Urut + Hapus */}
                    <div className="sm:col-span-3 flex items-center justify-end gap-1">
                      {/* Upload foto khusus warna ini (opsional) */}
                      <label
                        title={
                          row.imagePreview
                            ? "Ganti foto khusus warna ini"
                            : "Upload foto produk untuk warna ini (opsional)"
                        }
                        className="relative w-8 h-8 rounded-md border border-border bg-muted/40 hover:bg-muted flex items-center justify-center cursor-pointer overflow-hidden shrink-0"
                      >
                        {row.imagePreview ? (
                          <img
                            src={row.imagePreview}
                            alt={row.color_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            updateColorRow(row.uid, {
                              imageFile: f,
                              imagePreview: URL.createObjectURL(f),
                              removeImage: false,
                            });
                          }}
                        />
                      </label>

                      {row.imagePreview && (
                        <button
                          type="button"
                          onClick={() =>
                            updateColorRow(row.uid, {
                              imageFile: null,
                              imagePreview: null,
                              existingImage: null,
                              removeImage: true,
                            })
                          }
                          title="Hapus foto khusus warna"
                          className="p-1 text-muted-foreground hover:text-destructive rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDefaultColor(row.uid)}
                        title={row.is_default ? "Warna utama di kartu" : "Jadikan warna utama"}
                        className={`p-1.5 rounded transition-colors ${
                          row.is_default
                            ? "text-[#A88247] bg-[#D7B483]/20"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${row.is_default ? "fill-current" : ""}`} />
                      </button>

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveColorRow(idx, -1)}
                        title="Pindah ke atas"
                        className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === colorRows.length - 1}
                        onClick={() => moveColorRow(idx, 1)}
                        title="Pindah ke bawah"
                        className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeColorRow(row.uid)}
                        title="Hapus warna"
                        className="p-1.5 rounded text-destructive hover:bg-destructive/15"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Mini Pratinjau Baris Swatch Kartu */}
              <div className="mt-2 px-3.5 py-2.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#8C7A64]">
                    Pratinjau Tampilan Kartu
                  </p>
                  <p className="text-xs font-medium text-[#1D1B18] truncate mt-0.5">
                    {title || "Nama Furnitur"} ·{" "}
                    <span className="font-normal text-[#7D756B]">
                      {colorRows[previewColorIdx]?.color_name || colorRows[0]?.color_name || "Warna"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {colorRows.slice(0, 6).map((r, i) => (
                    <button
                      key={r.uid}
                      type="button"
                      onClick={() => setPreviewColorIdx(i)}
                      title={r.color_name || r.color_code}
                      className={`w-5 h-5 rounded-full transition-all ${
                        previewColorIdx === i
                          ? "ring-[1.5px] ring-[#1D1B18] ring-offset-2 ring-offset-[#FAF8F5]"
                          : "ring-1 ring-inset ring-black/15"
                      }`}
                      style={{ backgroundColor: r.color_code || "#D8CFC2" }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 px-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              Belum ada warna ditambahkan. Klik salah satu palet di atas atau tombol{" "}
              <strong>+ Tambah Warna Custom</strong>.
            </div>
          )}
        </div>

        {/* Promo & Badge Editorial Section (Tanpa CRUD harga — harga diatur di backoffice) */}
        <div className="p-4 rounded-lg bg-muted/40 border border-[#D7B483]/35 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] font-medium text-[#A88247]">
              <Sparkles className="w-4 h-4 text-[#D7B483]" />
              Badge, New Arrival &amp; Promosi
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isNewArrival}
                  onChange={(e) => setIsNewArrival(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-[#0B426E]"
                />
                <span className="font-medium text-[#0B426E]">Tandai sebagai New Arrival</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isOnPromo}
                  onChange={(e) => setIsOnPromo(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="font-medium">Tampilkan di Halaman Promo</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Field label="Persentase Promo (%) — Opsional">
              <input
                type="number"
                min="0"
                max="100"
                className="ui-input text-xs"
                value={discountValue}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="misal: 20 (kosongkan jika hanya badge editorial)"
              />
            </Field>

            <Field label="Label Badge Kartu">
              <input
                className="ui-input text-xs"
                value={promoBadgeText}
                onChange={(e) => setPromoBadgeText(e.target.value)}
                placeholder="misal: Ikonik / Edisi Terbatas / 20% OFF"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {["Ikonik", "Edisi Terbatas", "Terbaru", "Pilihan Kurator"].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setPromoBadgeText(lbl)}
                    className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                      promoBadgeText === lbl
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background hover:bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
                {promoBadgeText && (
                  <button
                    type="button"
                    onClick={() => setPromoBadgeText("")}
                    className="px-2 py-0.5 rounded-full text-[10px] text-muted-foreground hover:text-foreground underline"
                  >
                    Kosongkan
                  </button>
                )}
              </div>
            </Field>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A88247]" />
            Harga produk tidak ditampilkan di katalog publik dan hanya dikelola melalui backoffice / rincian internal.
          </p>
        </div>

        <Field label="Description">
          <textarea className="ui-input min-h-[90px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Themes">
            <div className="border border-border rounded p-2 max-h-32 overflow-y-auto space-y-1">
              {themes.map((t: any) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={themeIds.includes(t.id)} onChange={() => tog(themeIds, setThemeIds, t.id)} /> {t.name}
                </label>
              ))}
              {themes.length === 0 && <p className="text-xs text-muted-foreground">Tambah di Taxonomies.</p>}
            </div>
          </Field>
          <Field label="Categories">
            <div className="border border-border rounded p-2 max-h-32 overflow-y-auto space-y-1">
              {cats.map((c: any) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={catIds.includes(c.id)} onChange={() => tog(catIds, setCatIds, c.id)} /> {c.name}
                </label>
              ))}
              {cats.length === 0 && <p className="text-xs text-muted-foreground">Tambah di Taxonomies.</p>}
            </div>
          </Field>
        </div>

        <div className="flex gap-2 pt-3 border-t border-border">
          <button type="button" onClick={onClose} className="px-5 py-2 border border-border rounded text-xs uppercase tracking-wider">
            Cancel
          </button>
          <button disabled={saving} className="ml-auto px-6 py-2 bg-foreground text-background rounded text-xs uppercase tracking-[0.2em] font-medium disabled:opacity-60 shadow-sm">
            {saving ? "Saving..." : "Save Item"}
          </button>
        </div>
      </form>


    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
