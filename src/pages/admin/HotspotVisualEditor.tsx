// components/admin/HotspotVisualEditor.tsx

import { useEffect, useRef, useState } from "react";
import { X, Plus, Edit2, Trash2, Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import {
  createHotspot,
  updateHotspot,
  deleteHotspot,
} from "@/lib/catalogApi";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface HotspotItem {
  id?: string | number;
  scene_number: string;
  label: string;
  x: number;
  y: number;
  item_slug?: string;
  description?: string;
  image?: string;
}

interface ApiItem {
  id: number;
  slug: string;
  title: string;
  code?: string | null;
  image?: string | null;
  type?: { name: string };
  themes?: { name: string }[];
}

interface Props {
  catalogId: string;
  sceneNumber: string; // "scene-1" | "scene-2"
  sceneImage: string; // URL gambar scene
  hotspots: HotspotItem[];
  onHotspotAdd: (hotspot: HotspotItem) => void;
  onHotspotUpdate: (id: string | number, hotspot: HotspotItem) => void;
  onHotspotDelete: (id: string | number) => void;
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export function HotspotVisualEditor({
  catalogId,
  sceneNumber,
  sceneImage,
  hotspots,
  onHotspotAdd,
  onHotspotUpdate,
  onHotspotDelete,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // ── Available items (fetch from API)
  const [availableItems, setAvailableItems] = useState<ApiItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  // ── API loading states per action
  const [savingId, setSavingId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── UI state
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draggingId, setDraggingId] = useState<string | number | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // ── Form state
  const [form, setForm] = useState<HotspotItem>({
    scene_number: sceneNumber,
    label: "",
    x: 50,
    y: 50,
    item_slug: "",
    description: "",
  });

  // ── Fetch items on mount
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data } = await api.get<ApiItem[]>("/items");
        setAvailableItems(data || []);
      } catch (err) {
        console.error("Failed to fetch items:", err);
      } finally {
        setItemsLoading(false);
      }
    };
    fetchItems();
  }, []);

  // ── Filtered items based on search
  const filteredItems = availableItems.filter(
    (item) =>
      item.title.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.slug.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const selectedItem = availableItems.find((i) => i.slug === form.item_slug);

  // ── Reset form
  const resetForm = () => {
    setForm({
      scene_number: sceneNumber,
      label: "",
      x: 50,
      y: 50,
      item_slug: "",
      description: "",
    });
    setIsAdding(false);
    setEditingId(null);
    setItemSearch("");
    setShowItemDropdown(false);
    setSaveError(null);
  };

  // ── Click di image → set koordinat
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isAdding) return;

    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setForm({
      ...form,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    });
  };

  // ── Drag existing hotspot (FIX #1: save ke API HANYA di mouseUp, bukan setiap mousemove)
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    setDraggingId(id);
    const hotspot = hotspots.find((h) => h.id === id);
    if (hotspot) dragStartPosRef.current = { x: hotspot.x, y: hotspot.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const hotspot = hotspots.find((h) => h.id === draggingId);
    if (hotspot) {
      // Update LOCAL state saja — tidak kirim API
      onHotspotUpdate(draggingId, {
        ...hotspot,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      });
    }
  };

  const handleMouseUp = () => {
    if (!draggingId) return;
    const id = draggingId;
    const hotspot = hotspots.find((h) => h.id === id);
    const startPos = dragStartPosRef.current;

    setDraggingId(null);
    dragStartPosRef.current = null;

    // Save ke API HANYA jika posisi benar-benar berubah (>0.5%)
    if (
      hotspot &&
      startPos &&
      (Math.abs(hotspot.x - startPos.x) > 0.5 || Math.abs(hotspot.y - startPos.y) > 0.5)
    ) {
      updateHotspot(catalogId, id, { x: hotspot.x, y: hotspot.y }).catch((err) => {
        console.error("Failed to save hotspot position:", err);
        setSaveError("Gagal menyimpan posisi hotspot");
      });
    }
  };

  // FIX #4: Global mouseup listener — handle release di luar container
  useEffect(() => {
    if (!draggingId) return;
    const onUp = () => handleMouseUp();
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId, hotspots]);

  // ── FIX #7: Validate koordinat sebelum submit
  const handleAddHotspot = async () => {
    if (!form.label.trim()) {
      setSaveError("Label tidak boleh kosong");
      return;
    }
    // Default x=50,y=50 berarti user belum klik gambar
    if (form.x === 50 && form.y === 50) {
      setSaveError("Klik gambar dulu untuk menempatkan hotspot");
      return;
    }

    setSavingId("new");
    setSaveError(null);

    try {
      const newHotspot = await createHotspot(catalogId, {
        scene_number: sceneNumber,
        label: form.label,
        x: form.x,
        y: form.y,
        item_slug: form.item_slug || undefined,
        description: form.description || undefined,
      });

      onHotspotAdd(newHotspot as unknown as HotspotItem);
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Gagal membuat hotspot";
      setSaveError(msg);
      console.error("Failed to create hotspot:", err);
    } finally {
      setSavingId(null);
    }
  };

  // ── FIX: Edit hotspot ke API
  const handleUpdateHotspot = async () => {
    if (!editingId) return;
    if (!form.label.trim()) {
      setSaveError("Label tidak boleh kosong");
      return;
    }

    setSavingId(editingId);
    setSaveError(null);

    try {
      // Save ke API
      const updated = await updateHotspot(catalogId, editingId, {
        scene_number: sceneNumber,
        label: form.label,
        x: form.x,
        y: form.y,
        item_slug: form.item_slug || undefined,
        description: form.description || undefined,
      });

      // Update local state
      onHotspotUpdate(editingId, updated as unknown as HotspotItem);
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Gagal update hotspot";
      setSaveError(msg);
      console.error("Failed to update hotspot:", err);
    } finally {
      setSavingId(null);
    }
  };

  // ── FIX: Delete hotspot dari API
  const handleDeleteHotspot = async (id: string | number) => {
    if (!confirm("Hapus hotspot ini?")) return;

    setDeletingId(id);
    setSaveError(null);

    try {
      // Delete dari API
      await deleteHotspot(catalogId, id);

      // Update local state
      onHotspotDelete(id);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Gagal hapus hotspot";
      setSaveError(msg);
      console.error("Failed to delete hotspot:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Start edit (FIX #5: ensure defaults agar form tidak rusak kalau ada field undefined)
  const startEdit = (hotspot: HotspotItem) => {
    setEditingId(hotspot.id || "");
    setForm({
      scene_number: hotspot.scene_number || sceneNumber,
      label: hotspot.label || "",
      x: typeof hotspot.x === "number" ? hotspot.x : 50,
      y: typeof hotspot.y === "number" ? hotspot.y : 50,
      item_slug: hotspot.item_slug || "",
      description: hotspot.description || "",
      id: hotspot.id,
      image: hotspot.image,
    });
    setSaveError(null);
  };

  return (
    <div className="space-y-6 border border-border rounded-lg p-6 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          Hotspots — {sceneNumber.replace("scene-", "Scene ")}
          <span className="text-xs text-muted-foreground ml-2">
            ({hotspots.length} points)
          </span>
        </h3>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-xs bg-foreground text-background px-3 py-1.5 hover:bg-foreground/90 transition-colors"
          >
            <Plus size={14} /> Add Hotspot
          </button>
        )}
      </div>

      {/* FIX: Error message */}
      {saveError && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-700 text-xs">
          ❌ {saveError}
        </div>
      )}

      {/* ════════════════════════════════════════
          VISUAL EDITOR — Interactive Image
      ════════════════════════════════════════ */}
      <div
        ref={containerRef}
        className="relative aspect-video bg-secondary overflow-hidden border border-border cursor-crosshair rounded"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Scene Image */}
        <img
          ref={imageRef}
          src={sceneImage}
          alt={sceneNumber}
          className="w-full h-full object-cover"
          onClick={handleImageClick}
        />

        {/* Hint overlay saat add mode */}
        {isAdding && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white">
              <p className="text-sm font-medium">Click di image untuk menempatkan hotspot</p>
              <p className="text-xs text-white/60 mt-1">
                Koordinat: {form.x.toFixed(1)}% × {form.y.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* ── Hotspot Dots (render semua hotspots) ── */}
        {hotspots.map((spot) => (
          <div
            key={spot.id}
            className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 group transition-all ${
              draggingId === spot.id ? "z-50" : "z-20"
            }`}
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              cursor: draggingId === spot.id ? "grabbing" : "grab",
            }}
            onMouseDown={(e) => handleMouseDown(e, spot.id || "")}
          >
            <div className="relative w-full h-full">
              {/* Circle dot */}
              <div
                className={`w-full h-full rounded-full border-2 transition-all duration-200 ${
                  editingId === spot.id
                    ? "bg-white border-white shadow-lg scale-125"
                    : "bg-white/30 border-white backdrop-blur-sm group-hover:bg-white/60 group-hover:scale-110"
                }`}
              />

              {/* Label above dot */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/95 text-foreground text-[9px] px-2 py-1 rounded pointer-events-none border border-border shadow-md">
                {spot.label}
              </div>

              {/* Item thumbnail tooltip on hover */}
              {spot.item_slug && selectedItem?.slug === spot.item_slug && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                  <div className="bg-background border border-border rounded shadow-lg p-2 w-32">
                    {selectedItem?.image && (
                      <img
                        src={imgUrl(selectedItem.image)}
                        alt={selectedItem.title}
                        className="w-full aspect-square object-cover rounded mb-1"
                      />
                    )}
                    <p className="text-[8px] font-medium text-foreground truncate">
                      {selectedItem?.title}
                    </p>
                    <p className="text-[7px] text-muted-foreground">{selectedItem?.code}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Hint saat empty */}
        {hotspots.length === 0 && !isAdding && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white/50">
              <p className="text-sm">No hotspots yet</p>
              <p className="text-xs">Click "Add Hotspot" untuk mulai</p>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          FORM — Add/Edit Hotspot
      ════════════════════════════════════════ */}
      {(isAdding || editingId) && (
        <div className="border-t border-border pt-6 space-y-4 bg-secondary/30 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-foreground">
            {editingId ? "✏️ Edit Hotspot" : "➕ New Hotspot"}
          </h4>

          {/* Position Info */}
          <div className="bg-background/50 border border-border/50 rounded p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Position:</strong> {form.x.toFixed(1)}% × {form.y.toFixed(1)}%
              {isAdding && <span className="ml-2 text-[10px]">(click gambar untuk update)</span>}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Label */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Label *
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g., Lounge Chair"
                className="w-full border border-border bg-background text-foreground p-2 text-sm rounded"
              />
            </div>

            {/* Item Selector */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Link to Item
              </label>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={
                        itemSearch ||
                        (form.item_slug && selectedItem
                          ? selectedItem.title
                          : "")
                      }
                      onChange={(e) => {
                        setItemSearch(e.target.value);
                        setShowItemDropdown(true);
                      }}
                      onFocus={() => setShowItemDropdown(true)}
                      placeholder="Search items..."
                      disabled={itemsLoading}
                      className="w-full border border-border bg-background text-foreground p-2 text-sm rounded disabled:opacity-50"
                    />
                    <Search
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                  </div>
                  {form.item_slug && (
                    <button
                      onClick={() => {
                        setForm({ ...form, item_slug: "" });
                        setItemSearch("");
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown List */}
                {showItemDropdown && !itemsLoading && filteredItems.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded shadow-lg max-h-48 overflow-y-auto z-10">
                    {filteredItems.map((item) => (
                      <button
                        key={item.slug}
                        onClick={() => {
                          setForm({ ...form, item_slug: item.slug });
                          setItemSearch("");
                          setShowItemDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs border-b border-border/50 last:border-0 transition-colors ${
                          form.item_slug === item.slug
                            ? "bg-foreground/10 text-foreground font-medium"
                            : "text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.image && (
                            <img
                              src={imgUrl(item.image)}
                              alt={item.title}
                              className="w-6 h-6 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.code || item.type?.name}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected Item Preview */}
          {form.item_slug && selectedItem && (
            <div className="border border-border/50 rounded p-3 bg-background/50 flex gap-3">
              {selectedItem.image && (
                <img
                  src={imgUrl(selectedItem.image)}
                  alt={selectedItem.title}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {selectedItem.title}
                </p>
                <p className="text-[10px] text-muted-foreground">{selectedItem.code}</p>
                {selectedItem.themes && selectedItem.themes.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {selectedItem.themes.map((t) => t.name).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Brief description untuk hotspot ini..."
              className="w-full border border-border bg-background text-foreground p-2 text-sm h-14 resize-none rounded"
            />
          </div>

          {/* FIX #10: Error juga ditampilkan dekat tombol action */}
          {saveError && (
            <div className="p-2.5 bg-red-500/15 border border-red-500/40 rounded text-red-700 text-xs">
              ❌ {saveError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={editingId ? handleUpdateHotspot : handleAddHotspot}
              disabled={savingId !== null}
              className={`flex-1 py-2 text-sm font-medium rounded flex items-center justify-center gap-2 transition-colors ${
                savingId !== null
                  ? "bg-foreground/50 text-background cursor-not-allowed"
                  : "bg-foreground text-background hover:bg-foreground/90"
              }`}
            >
              {savingId !== null && <Loader2 size={14} className="animate-spin" />}
              {editingId ? "💾 Update" : "➕ Add"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 border border-border text-foreground hover:bg-secondary transition-colors rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          LIST — Existing Hotspots
      ════════════════════════════════════════ */}
      {hotspots.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            {hotspots.length} hotspot{hotspots.length !== 1 ? "s" : ""} pada {sceneNumber}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {hotspots.map((spot) => {
              const itemData = availableItems.find((i) => i.slug === spot.item_slug);
              const isDeleting = deletingId === spot.id;
              return (
                <div
                  key={spot.id}
                  onClick={() => startEdit(spot)}
                  className={`p-3 rounded text-xs cursor-pointer transition-all border ${
                    editingId === spot.id
                      ? "bg-foreground/10 border-foreground/50 ring-2 ring-foreground/20"
                      : "bg-secondary border-border hover:bg-secondary/80 hover:border-foreground/30"
                  } ${isDeleting ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {/* Item thumbnail */}
                    {itemData?.image && (
                      <img
                        src={imgUrl(itemData.image)}
                        alt={itemData.title}
                        className="w-10 h-10 object-cover rounded flex-shrink-0"
                      />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{spot.label}</p>
                      {itemData && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          → {itemData.title}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {spot.x.toFixed(1)}% × {spot.y.toFixed(1)}%
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHotspot(spot.id || "");
                      }}
                      disabled={isDeleting}
                      className={`p-1 flex-shrink-0 transition-colors ${
                        isDeleting
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-red-500/60 hover:text-red-600"
                      }`}
                      title="Delete"
                    >
                      {isDeleting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}