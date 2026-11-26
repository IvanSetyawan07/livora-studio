import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, Search, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { createHotspot, updateHotspot, deleteHotspot } from "@/lib/catalogApi";
import { useAdminDialog } from "@/components/admin/kit";

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
  sceneNumber: string;
  sceneImage: string;
  hotspots: HotspotItem[];
  onHotspotAdd: (hotspot: HotspotItem) => void;
  onHotspotUpdate: (id: string | number, hotspot: HotspotItem) => void;
  onHotspotDelete: (id: string | number) => void;
}

export function HotspotVisualEditor({
  catalogId,
  sceneNumber,
  sceneImage,
  hotspots,
  onHotspotAdd,
  onHotspotUpdate,
  onHotspotDelete,
}: Props) {
  const dialog = useAdminDialog();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [availableItems, setAvailableItems] = useState<ApiItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  const [savingId, setSavingId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [hasPickedPoint, setHasPickedPoint] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draggingId, setDraggingId] = useState<string | number | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const [form, setForm] = useState<HotspotItem>({
    scene_number: sceneNumber,
    label: "",
    x: 50,
    y: 50,
    item_slug: "",
    description: "",
  });

  useEffect(() => {
    api
      .get<ApiItem[]>("/items")
      .then(({ data }) => setAvailableItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setItemsLoading(false));
  }, []);

  // Tutup dropdown item saat klik di luar
  useEffect(() => {
    if (!showItemDropdown) return;
    const onDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showItemDropdown]);

  // Reset mode saat berpindah scene
  useEffect(() => {
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneNumber]);

  const filteredItems = availableItems.filter(
    (item) =>
      item.title.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.slug.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.code || "").toLowerCase().includes(itemSearch.toLowerCase()),
  );

  const selectedItem = availableItems.find((i) => i.slug === form.item_slug);

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
    setHasPickedPoint(false);
    setEditingId(null);
    setItemSearch("");
    setShowItemDropdown(false);
    setSaveError(null);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isAdding && !editingId) return;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setForm((prev) => ({
      ...prev,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    }));
    setHasPickedPoint(true);
    setSaveError(null);
  };

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
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const hotspot = hotspots.find((h) => h.id === draggingId);
    if (hotspot) {
      onHotspotUpdate(draggingId, {
        ...hotspot,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
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

    if (
      hotspot &&
      startPos &&
      (Math.abs(hotspot.x - startPos.x) > 0.5 || Math.abs(hotspot.y - startPos.y) > 0.5)
    ) {
      updateHotspot(catalogId, id, { x: hotspot.x, y: hotspot.y })
        .then(() => toast.success("Posisi titik hotspot tersimpan"))
        .catch(() => setSaveError("Gagal menyimpan posisi hotspot"));
    }
  };

  useEffect(() => {
    if (!draggingId) return;
    const onUp = () => handleMouseUp();
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId, hotspots]);

  const handleAddHotspot = async () => {
    if (!hasPickedPoint) {
      setSaveError("Klik pada foto ruangan terlebih dahulu untuk meletakkan titik hotspot.");
      return;
    }
    if (!form.label.trim()) {
      setSaveError("Label hotspot wajib diisi (atau pilih produk untuk mengisi otomatis).");
      return;
    }

    setSavingId("new");
    setSaveError(null);
    try {
      const newHotspot = await createHotspot(catalogId, {
        scene_number: sceneNumber,
        label: form.label.trim(),
        x: form.x,
        y: form.y,
        item_slug: form.item_slug || undefined,
        description: form.description || undefined,
      });
      onHotspotAdd(newHotspot as unknown as HotspotItem);
      toast.success("Titik hotspot ditambahkan");
      resetForm();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Gagal menambahkan hotspot");
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateHotspot = async () => {
    if (!editingId) return;
    if (!form.label.trim()) {
      setSaveError("Label tidak boleh kosong.");
      return;
    }

    setSavingId(editingId);
    setSaveError(null);
    try {
      const updated = await updateHotspot(catalogId, editingId, {
        scene_number: sceneNumber,
        label: form.label.trim(),
        x: form.x,
        y: form.y,
        item_slug: form.item_slug || undefined,
        description: form.description || undefined,
      });
      onHotspotUpdate(editingId, updated as unknown as HotspotItem);
      toast.success("Hotspot diperbarui");
      resetForm();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Gagal memperbarui hotspot");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteHotspot = async (spot: HotspotItem) => {
    if (!spot.id) return;
    const ok = await dialog.confirm({
      title: `Hapus hotspot "${spot.label}"?`,
      confirmLabel: "Ya, hapus",
      danger: true,
    });
    if (!ok) return;

    setDeletingId(spot.id);
    setSaveError(null);
    try {
      await deleteHotspot(catalogId, spot.id);
      onHotspotDelete(spot.id);
      if (editingId === spot.id) resetForm();
      toast.success("Hotspot dihapus");
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Gagal menghapus hotspot");
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (hotspot: HotspotItem) => {
    setIsAdding(false);
    setHasPickedPoint(true);
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
    <div className="space-y-5 rounded-2xl border border-[#EAE4DA] bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-header text-lg text-[#232528]">
            Editor Titik Hotspot — {sceneNumber.replace("scene-", "Scene ")}
            <span className="ml-2 text-xs font-normal text-[#656B73]">({hotspots.length} titik)</span>
          </h3>
          <p className="text-xs text-[#656B73]">
            Geser titik putih pada foto untuk memindahkan posisi, atau klik <strong>Tambah Hotspot</strong> lalu klik
            bagian produk di foto.
          </p>
        </div>
        {!isAdding && !editingId && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setHasPickedPoint(false);
              setSaveError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D]"
          >
            <Plus size={14} /> Tambah Hotspot
          </button>
        )}
      </div>

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">{saveError}</div>
      )}

      {/* Visual Interactive Canvas */}
      <div
        ref={containerRef}
        className={`relative aspect-video overflow-hidden rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] ${
          isAdding || editingId ? "cursor-crosshair" : ""
        }`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={sceneImage}
          alt={sceneNumber}
          draggable={false}
          className="h-full w-full select-none object-cover"
          onClick={handleImageClick}
        />

        {/* Banner instruksi ringan di atas (tidak menutupi seluruh gambar!) */}
        {isAdding && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full bg-[#232528]/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg">
            {hasPickedPoint
              ? `Titik diletakkan di ${form.x.toFixed(1)}% × ${form.y.toFixed(1)}% — klik lagi untuk geser`
              : "Klik bagian produk pada foto untuk meletakkan titik hotspot"}
          </div>
        )}

        {/* Live pulsing pin preview saat Add Mode */}
        {isAdding && hasPickedPoint && (
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${form.x}%`, top: `${form.y}%` }}
          >
            <span className="absolute -inset-2 animate-ping rounded-full bg-[#5E93B8]/60" />
            <span className="relative block h-7 w-7 rounded-full border-2 border-white bg-[#5E93B8] shadow-lg" />
          </div>
        )}

        {/* Existing Hotspot Dots */}
        {hotspots.map((spot) => {
          const spotItem = availableItems.find((i) => i.slug === spot.item_slug);
          return (
            <div
              key={spot.id}
              className={`group absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 transition-all ${
                draggingId === spot.id ? "z-50" : "z-20"
              }`}
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                cursor: draggingId === spot.id ? "grabbing" : "grab",
              }}
              onMouseDown={(e) => handleMouseDown(e, spot.id || "")}
              onClick={(e) => {
                e.stopPropagation();
                if (!isAdding) startEdit(spot);
              }}
            >
              <div className="relative h-full w-full">
                <div
                  className={`h-full w-full rounded-full border-2 transition-all duration-200 ${
                    editingId === spot.id
                      ? "scale-125 border-white bg-[#5E93B8] shadow-lg"
                      : "border-white bg-white/40 backdrop-blur-sm group-hover:scale-110 group-hover:bg-white/75"
                  }`}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#EAE4DA] bg-white/95 px-2.5 py-1 text-[11px] font-medium text-[#232528] opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  {spot.label}
                </div>
                {spotItem && (
                  <div className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="w-36 rounded-xl border border-[#EAE4DA] bg-white p-2 shadow-lg">
                      {spotItem.image && (
                        <img
                          src={imgUrl(spotItem.image)}
                          alt={spotItem.title}
                          className="mb-1.5 aspect-square w-full rounded-lg object-cover"
                        />
                      )}
                      <p className="truncate text-[11px] font-medium text-[#232528]">{spotItem.title}</p>
                      {spotItem.code && <p className="text-[10px] text-[#656B73]">{spotItem.code}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Form Panel */}
      {(isAdding || editingId) && (
        <div className="space-y-4 rounded-xl border border-[#5E93B8]/35 bg-[#EDF4F8]/40 p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-header text-base text-[#232528]">
              {editingId ? "Ubah Titik Hotspot" : "Tambah Titik Hotspot Baru"}
            </h4>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#4C5259]">
              Posisi: {form.x.toFixed(1)}% × {form.y.toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#232528]">Label Hotspot *</span>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="mis. Sofa Bouclé"
                className="h-10 w-full rounded-lg border border-[#E2DACF] bg-white px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8]"
              />
            </label>

            <div ref={dropdownRef}>
              <span className="mb-1 block text-xs font-medium text-[#232528]">Hubungkan ke Produk Furnitur</span>
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={itemSearch || (form.item_slug && selectedItem ? selectedItem.title : "")}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setShowItemDropdown(true);
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    placeholder="Cari nama atau kode produk…"
                    disabled={itemsLoading}
                    className="h-10 w-full rounded-lg border border-[#E2DACF] bg-white pl-3 pr-9 text-sm text-[#232528] outline-none focus:border-[#5E93B8] disabled:opacity-50"
                  />
                  <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#656B73]" />
                </div>
                {form.item_slug && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...form, item_slug: "" });
                      setItemSearch("");
                    }}
                    aria-label="Hapus tautan produk"
                    className="rounded-lg border border-[#E2DACF] bg-white p-2 text-[#656B73] hover:text-[#232528]"
                  >
                    <X size={14} />
                  </button>
                )}

                {showItemDropdown && !itemsLoading && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-[#E2DACF] bg-white shadow-xl">
                    {filteredItems.length === 0 ? (
                      <p className="p-3 text-center text-xs text-[#656B73]">Produk tidak ditemukan.</p>
                    ) : (
                      filteredItems.slice(0, 40).map((item) => (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              item_slug: item.slug,
                              label: prev.label.trim() ? prev.label : item.title,
                            }));
                            setItemSearch("");
                            setShowItemDropdown(false);
                          }}
                          className={`flex w-full items-center gap-2.5 border-b border-[#F2EDE5] px-3 py-2 text-left text-xs last:border-0 ${
                            form.item_slug === item.slug
                              ? "bg-[#EDF4F8] font-medium text-[#232528]"
                              : "text-[#4C5259] hover:bg-[#FAF8F4]"
                          }`}
                        >
                          {item.image && (
                            <img src={imgUrl(item.image)} alt={item.title} className="h-8 w-8 rounded object-cover" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-[#232528]">{item.title}</p>
                            <p className="truncate text-[10px] text-[#656B73]">{item.code || item.type?.name}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#232528]">Keterangan Singkat (Opsional)</span>
            <textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Catatan singkat tentang produk di ruangan ini…"
              rows={2}
              className="w-full rounded-lg border border-[#E2DACF] bg-white p-2.5 text-sm text-[#232528] outline-none focus:border-[#5E93B8]"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void (editingId ? handleUpdateHotspot() : handleAddHotspot())}
              disabled={savingId !== null}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#232528] py-2.5 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
            >
              {savingId !== null ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editingId ? "Simpan Perubahan Hotspot" : "Simpan Titik Hotspot"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-[#E2DACF] bg-white px-5 py-2.5 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Existing Hotspots List */}
      {hotspots.length > 0 && (
        <div className="space-y-2.5 border-t border-[#EAE4DA] pt-4">
          <p className="text-xs font-medium text-[#656B73]">Daftar titik pada scene ini (klik kartu untuk edit):</p>
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
            {hotspots.map((spot) => {
              const itemData = availableItems.find((i) => i.slug === spot.item_slug);
              const isDeleting = deletingId === spot.id;
              return (
                <div
                  key={spot.id}
                  onClick={() => startEdit(spot)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs transition-all ${
                    editingId === spot.id
                      ? "border-[#5E93B8] bg-[#EDF4F8]/70"
                      : "border-[#EAE4DA] bg-[#FAF8F4]/50 hover:border-[#5E93B8]/50"
                  } ${isDeleting ? "opacity-50" : ""}`}
                >
                  {itemData?.image && (
                    <img
                      src={imgUrl(itemData.image)}
                      alt={itemData.title}
                      className="h-10 w-10 shrink-0 rounded-lg border border-[#EAE4DA] object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#232528]">{spot.label}</p>
                    {itemData && <p className="truncate text-[11px] text-[#5E93B8]">→ {itemData.title}</p>}
                    <p className="text-[10px] text-[#656B73]">
                      {spot.x.toFixed(1)}% × {spot.y.toFixed(1)}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteHotspot(spot);
                    }}
                    disabled={isDeleting}
                    aria-label={`Hapus ${spot.label}`}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
