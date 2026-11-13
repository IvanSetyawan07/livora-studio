import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
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
  CheckSquare,
  Square,
  Tag,
  Loader2,
} from "lucide-react";
import ItemQRCode from "@/components/livora/ItemQRCode";
import BulkDiscountModal from "@/components/admin/BulkDiscountModal";
import { bulkDiscountItems } from "@/lib/promoApi";

type SortKey = "name-asc" | "name-desc" | "date-desc" | "date-asc";

export default function AdminItems() {
  const [items, setItems] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [qrItem, setQrItem] = useState<any | null>(null);

  // Bulk discount & selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [promoOnlyFilter, setPromoOnlyFilter] = useState(false);
  const [clearingPromo, setClearingPromo] = useState(false);

  // filter / search / sort
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(""); // type slug or id
  const [sortBy, setSortBy] = useState<SortKey>("date-desc");
  const [showFilter, setShowFilter] = useState(false);

  const load = () =>
    api.get("/items").then((r) => {
      setItems(r.data);
      // Bersihkan id yang sudah tidak ada
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

  const del = async (i: any) => {
    if (!confirm(`Hapus item "${i.title}"?`)) return;
    await api.delete(`/admin/items/${i.id}`);
    load();
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

  // Toggle selection
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (visibleItems: any[]) => {
    const visibleIds = visibleItems.map((i) => i.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Bulk clear promo
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
    if (promoOnlyFilter) {
      list = list.filter((i) => i.is_on_promo);
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
  }, [items, query, typeFilter, promoOnlyFilter, sortBy]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.includes(i.id));

  const selectedItemsData = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)),
    [items, selectedIds]
  );

  const activeFilterCount =
    (typeFilter ? 1 : 0) + (sortBy !== "date-desc" ? 1 : 0) + (promoOnlyFilter ? 1 : 0);

  const fmtDate = (d?: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Manage</p>
          <h1 className="serif text-4xl">Items / Furniture</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola data furnitur, rincian produk, serta penetapan diskon promo satuan maupun massal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> New Item
          </button>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Quick Filter: All vs Promo */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border text-xs">
          <button
            type="button"
            onClick={() => setPromoOnlyFilter(false)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              !promoOnlyFilter ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setPromoOnlyFilter(true)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors inline-flex items-center gap-1.5 ${
              promoOnlyFilter ? "bg-card text-[#A88247] shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Sedang Promo ({promoCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau code item..."
            className="w-full pl-9 pr-9 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-lg p-4 z-50 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Furniture Type</label>
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
                  <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
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
                    onClick={() => { setTypeFilter(""); setSortBy("date-desc"); setPromoOnlyFilter(false); }}
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

        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {items.length} items</span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua item"
                    checked={allVisibleSelected}
                    onChange={() => toggleSelectAll(filtered)}
                    className="w-4 h-4 rounded border-border cursor-pointer"
                  />
                </th>
                <th className="text-left p-3">Image</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Status Promo</th>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Themes</th>
                <th className="text-left p-3">Categories</th>
                <th className="text-left p-3">Avail</th>
                <th className="text-left p-3">Uploaded</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const isSelected = selectedIds.includes(i.id);
                return (
                  <tr
                    key={i.id}
                    className={`border-t border-border transition-colors ${
                      isSelected ? "bg-muted/40" : "hover:bg-muted/20"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(i.id)}
                        className="w-4 h-4 rounded border-border cursor-pointer"
                      />
                    </td>

                    {/* Image */}
                    <td className="p-3">
                      {i.image ? (
                        <img src={imgUrl(i.image)} className="w-12 h-12 object-cover rounded border border-border" alt="" />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded border border-border" />
                      )}
                    </td>

                    {/* Title */}
                    <td className="p-3 font-medium">
                      <div>{i.title}</div>
                    </td>

                    {/* Promo Status */}
                    <td className="p-3">
                      {i.is_on_promo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-medium text-[#A88247] bg-[#A88247]/15 border border-[#A88247]/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <Sparkles className="w-3 h-3" />
                          {i.promo_badge_text || `${i.discount_value}% OFF`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </td>

                    {/* Code */}
                    <td className="p-3 text-muted-foreground font-mono text-xs">{i.code || "—"}</td>

                    {/* Type */}
                    <td className="p-3">{i.type?.name || "—"}</td>

                    {/* Themes */}
                    <td className="p-3 text-xs">{i.themes?.map((t: any) => t.name).join(", ") || "—"}</td>

                    {/* Categories */}
                    <td className="p-3 text-xs">{i.categories?.map((c: any) => c.name).join(", ") || "—"}</td>

                    {/* Availability */}
                    <td className="p-3 text-xs capitalize">{i.availability || "available"}</td>

                    {/* Date */}
                    <td className="p-3 text-xs whitespace-nowrap">{fmtDate(i.created_at)}</td>

                    {/* Actions */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => setQrItem(i)} title="QR Identity" className="p-1.5 hover:bg-muted rounded" disabled={!i.slug}>
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => downloadImage(i)} title="Download image" className="p-1.5 hover:bg-muted rounded" disabled={!i.image}>
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <Link to={`/admin/items/${i.slug}/detail`} title="Rincian internal (stok, dimensi, material)" className="p-1.5 hover:bg-muted rounded inline-flex">
                        <ClipboardList className="w-3.5 h-3.5" />
                      </Link>
                      <Link to={`/admin/items/${i.id}/experience`} title="Manage Experience" className="p-1.5 hover:bg-muted rounded inline-flex">
                        <Settings2 className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => { setEditing(i); setShowForm(true); }} className="p-1.5 hover:bg-muted rounded" title="Edit Item & Promo">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => del(i)} className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">
                    {items.length === 0 ? "Belum ada item." : "Tidak ada item yang cocok dengan filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Bottom Action Bar for Bulk Selection */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-from-bottom-3 duration-200">
          <span className="text-xs uppercase tracking-wider font-medium">
            <strong>{selectedIds.length}</strong> item terpilih
          </span>

          <div className="h-4 w-px bg-background/25" />

          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D7B483] text-black text-xs uppercase tracking-wider font-medium hover:bg-[#c49e6b] transition-colors"
          >
            <Percent className="w-3.5 h-3.5" /> Atur Diskon Massal
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

      {/* Bulk Discount Modal */}
      <BulkDiscountModal
        isOpen={showBulkModal}
        selectedIds={selectedIds}
        selectedItems={selectedItemsData}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => {
          setShowBulkModal(false);
          setSelectedIds([]);
          load();
        }}
      />

      {/* Form Tambah/Edit Item */}
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
  const [file, setFile] = useState<File | null>(null);

  // Promo settings
  const [isOnPromo, setIsOnPromo] = useState<boolean>(item?.is_on_promo || false);
  const [discountType, setDiscountType] = useState<string>(item?.discount_type || "PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<string>(
    item?.discount_value ? item.discount_value.toString() : ""
  );
  const [promoBadgeText, setPromoBadgeText] = useState<string>(item?.promo_badge_text || "");

  const [saving, setSaving] = useState(false);

  // Auto-update promo badge & check state when discount value changes
  const handleDiscountChange = (valStr: string) => {
    setDiscountValue(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      setIsOnPromo(true);
      if (discountType === "PERCENTAGE") {
        setPromoBadgeText(`${Math.round(num)}% OFF`);
      } else {
        setPromoBadgeText(`HEMAT Rp ${Math.round(num).toLocaleString("id-ID")}`);
      }
    } else {
      setIsOnPromo(false);
      setPromoBadgeText("");
    }
  };

  const tog = (arr: number[], setArr: any, id: number) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Promo data
      fd.append("is_on_promo", isOnPromo ? "1" : "0");
      if (discountValue) {
        fd.append("discount_type", discountType);
        fd.append("discount_value", discountValue);
        if (promoBadgeText) fd.append("promo_badge_text", promoBadgeText);
      } else {
        fd.append("discount_value", "0");
      }

      const url = item ? `/admin/items/${item.id}` : "/admin/items";
      const res = await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved(res.data, !item);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menyimpan item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center p-4 sm:p-6 z-50 overflow-y-auto" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-card border border-border rounded-xl w-full max-w-3xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl my-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="serif text-2xl font-light">{item ? "Edit Item" : "New Item"}</h2>
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

        {/* Promo Settings Section */}
        <div className="p-4 rounded-lg bg-muted/40 border border-[#D7B483]/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] font-medium text-[#A88247]">
              <Sparkles className="w-4 h-4" />
              Pengaturan Promosi & Diskon
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isOnPromo}
                onChange={(e) => setIsOnPromo(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <span className="font-medium">Status Promo Aktif</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <Field label="Tipe Diskon">
              <select
                className="ui-input text-xs"
                value={discountType}
                onChange={(e) => {
                  setDiscountType(e.target.value);
                  handleDiscountChange(discountValue);
                }}
              >
                <option value="PERCENTAGE">Persentase (%)</option>
                <option value="FIXED_AMOUNT">Potongan Tetap (Rp)</option>
              </select>
            </Field>

            <Field label={discountType === "PERCENTAGE" ? "Nilai Diskon (%)" : "Potongan (Rp)"}>
              <input
                type="number"
                min="0"
                max={discountType === "PERCENTAGE" ? "100" : undefined}
                className="ui-input text-xs"
                value={discountValue}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder={discountType === "PERCENTAGE" ? "misal: 30" : "misal: 2000000"}
              />
            </Field>

            <Field label="Label Badge Promo">
              <input
                className="ui-input text-xs"
                value={promoBadgeText}
                onChange={(e) => setPromoBadgeText(e.target.value)}
                placeholder="misal: 30% OFF"
              />
            </Field>
          </div>

          {isOnPromo && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A88247]" />
              Item ini akan tampil di halaman <strong>/promo</strong> dan membawa badge{" "}
              <strong>"{promoBadgeText || "PROMO"}"</strong>.
            </p>
          )}
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

        <Field label="Image">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {item?.image && !file && <img src={imgUrl(item.image)} className="mt-2 w-28 h-20 object-contain rounded border border-border" alt="" />}
        </Field>

        <div className="flex gap-2 pt-3 border-t border-border">
          <button type="button" onClick={onClose} className="px-5 py-2 border border-border rounded text-xs uppercase tracking-wider">
            Cancel
          </button>
          <button disabled={saving} className="ml-auto px-6 py-2 bg-foreground text-background rounded text-xs uppercase tracking-[0.2em] font-medium disabled:opacity-60">
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
