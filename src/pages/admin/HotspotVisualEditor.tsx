// components/admin/HotspotVisualEditor.tsx

import { useEffect, useRef, useState } from "react";
import { X, Plus, Edit2, Trash2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface HotspotItem {
  id?: string;
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
  onHotspotUpdate: (id: string, hotspot: HotspotItem) => void;
  onHotspotDelete: (id: string) => void;
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

  // ── UI state
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
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

  // ── Drag existing hotspot
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggingId(id);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const hotspot = hotspots.find((h) => h.id === draggingId);
    if (hotspot) {
      onHotspotUpdate(draggingId, {
        ...hotspot,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  // ── Submit hotspot baru
  const handleAddHotspot = () => {
    if (!form.label.trim()) {
      alert("Label tidak boleh kosong");
      return;
    }
    
    const newHotspot: HotspotItem = {
      ...form,
      id: `temp-${Date.now()}`,
      scene_number: sceneNumber,
    };

    onHotspotAdd(newHotspot);
    resetForm();
  };

  // ── Edit hotspot
  const startEdit = (hotspot: HotspotItem) => {
    setEditingId(hotspot.id || "");
    setForm(hotspot);
  };

  const handleUpdateHotspot = () => {
    if (editingId) {
      onHotspotUpdate(editingId, { ...form, scene_number: sceneNumber });
      resetForm();
    }
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

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={editingId ? handleUpdateHotspot : handleAddHotspot}
              className="flex-1 bg-foreground text-background py-2 text-sm font-medium rounded hover:bg-foreground/90 transition-colors"
            >
              {editingId ? "💾 Update Hotspot" : "➕ Add Hotspot"}
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
              return (
                <div
                  key={spot.id}
                  onClick={() => startEdit(spot)}
                  className={`p-3 rounded text-xs cursor-pointer transition-all border ${
                    editingId === spot.id
                      ? "bg-foreground/10 border-foreground/50 ring-2 ring-foreground/20"
                      : "bg-secondary border-border hover:bg-secondary/80 hover:border-foreground/30"
                  }`}
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
                        if (confirm("Hapus hotspot ini?")) {
                          onHotspotDelete(spot.id || "");
                        }
                      }}
                      className="text-red-500/60 hover:text-red-600 p-1 flex-shrink-0"
                      title="Delete"
                    >
                      <Trash2 size={14} />
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