import React, { useState, useRef, useEffect } from "react";
import {
  Scissors,
  Sparkles,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Plus,
  ArrowRight,
  Save,
} from "lucide-react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { removeItemBackgroundWithAi } from "@/lib/itemCutout";
import { toast } from "sonner";

export interface BatchImageItem {
  id: string;
  itemId?: number;
  title: string;
  originalFile?: File | null;
  originalUrl: string;
  status: "idle" | "processing" | "done" | "error";
  savedToCatalog?: boolean;
  savingToCatalog?: boolean;
  processedUrl?: string | null;
  processedBlob?: Blob | null;
  geminiModel?: string;
  detectedName?: string;
  errorMessage?: string;
}

interface BatchGeminiCutoutModalProps {
  isOpen: boolean;
  initialItems?: Array<{ id: number; title: string; image?: string | null }>;
  onClose: () => void;
  onItemsUpdated?: () => void;
  onApplyToNewItem?: (file: File, url: string) => void;
}

export default function BatchGeminiCutoutModal({
  isOpen,
  initialItems = [],
  onClose,
  onItemsUpdated,
  onApplyToNewItem,
}: BatchGeminiCutoutModalProps) {
  const [queue, setQueue] = useState<BatchImageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && initialItems.length > 0) {
      const itemsWithImages = initialItems
        .filter((it) => !!it.image)
        .map((it) => ({
          id: `item-${it.id}`,
          itemId: it.id,
          title: it.title,
          originalUrl: imgUrl(it.image!),
          status: "idle" as const,
          savedToCatalog: false,
        }));
      setQueue(itemsWithImages);
    } else if (isOpen && initialItems.length === 0) {
      setQueue([]);
    }
  }, [isOpen, initialItems]);

  if (!isOpen) return null;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: BatchImageItem[] = files.map((f, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      title: f.name.replace(/\.[^/.]+$/, ""),
      originalFile: f,
      originalUrl: URL.createObjectURL(f),
      status: "idle" as const,
    }));

    setQueue((prev) => [...prev, ...newItems]);
    toast.info(`${files.length} foto ditambahkan ke antrean.`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFromQueue = (id: string) => {
    if (isProcessing) return;
    setQueue((prev) => prev.filter((it) => it.id !== id));
  };

  // Proses pratinjau dulu TANPA menimpa foto katalog yang sedang tayang!
  const processSingleItem = async (item: BatchImageItem): Promise<Partial<BatchImageItem>> => {
    const result = await removeItemBackgroundWithAi({
      file: item.originalFile,
      imageUrl: item.originalUrl,
      baseName: item.title,
      // Sengaja tidak mengirim itemId agar hasil dicek admin terlebih dulu sebelum disimpan ke katalog
    });

    return {
      status: "done",
      processedUrl: result.url,
      processedBlob: result.blob,
      geminiModel: result.modelUsed,
      detectedName: result.detectedName || item.title,
      errorMessage: undefined,
    };
  };

  const handleStartBatch = async () => {
    if (queue.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const pendingIndices = queue
      .map((it, idx) => (it.status !== "done" ? idx : null))
      .filter((idx): idx is number => idx !== null);

    if (pendingIndices.length === 0) {
      toast.info("Semua foto dalam antrean sudah selesai diproses.");
      setIsProcessing(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingIndices.length; i++) {
      const targetIdx = pendingIndices[i];
      const targetItem = queue[targetIdx];

      setCurrentProcessingIndex(targetIdx);
      setQueue((prev) => prev.map((it, idx) => (idx === targetIdx ? { ...it, status: "processing" } : it)));

      try {
        const updateData = await processSingleItem(targetItem);
        setQueue((prev) => prev.map((it, idx) => (idx === targetIdx ? { ...it, ...updateData } : it)));
        successCount++;
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === targetIdx
              ? {
                  ...it,
                  status: "error",
                  errorMessage: err?.response?.data?.message || err?.message || "Gagal menghapus background",
                }
              : it,
          ),
        );
        failCount++;
      }

      await new Promise((r) => setTimeout(r, 400));
    }

    setIsProcessing(false);
    setCurrentProcessingIndex(null);

    if (successCount > 0) {
      toast.success(
        `${successCount} foto selesai dipotong! Periksa hasilnya, lalu klik "Simpan ke Katalog" bila sudah sesuai.`,
      );
    }
    if (failCount > 0) {
      toast.error(`${failCount} foto gagal diproses. Lihat pesan error di kartu dan coba lagi.`);
    }
  };

  // Simpan hasil cutout ke katalog produk HANYA setelah admin memeriksa pratinjau
  const handleSaveOneToCatalog = async (item: BatchImageItem): Promise<boolean> => {
    if (!item.itemId || !item.processedBlob || item.savedToCatalog) return false;
    setQueue((prev) => prev.map((x) => (x.id === item.id ? { ...x, savingToCatalog: true } : x)));
    try {
      const cleanFile = new File([item.processedBlob], `${item.title.replace(/\s+/g, "-")}-clean.png`, {
        type: "image/png",
      });
      const fd = new FormData();
      fd.append("image", cleanFile);
      fd.append("action", "save_cutout");
      fd.append("item_id", String(item.itemId));
      await api.post("/admin/items/gemini-process", fd);
      setQueue((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, savingToCatalog: false, savedToCatalog: true } : x)),
      );
      toast.success(`Foto bersih "${item.title}" disimpan ke katalog`);
      onItemsUpdated?.();
      return true;
    } catch (err: any) {
      setQueue((prev) => prev.map((x) => (x.id === item.id ? { ...x, savingToCatalog: false } : x)));
      toast.error(err?.response?.data?.message || `Gagal menyimpan "${item.title}" ke katalog`);
      return false;
    }
  };

  const handleSaveAllToCatalog = async () => {
    const targets = queue.filter((it) => it.itemId && it.status === "done" && it.processedBlob && !it.savedToCatalog);
    if (targets.length === 0) return;
    setSavingAll(true);
    let ok = 0;
    for (const item of targets) {
      if (await handleSaveOneToCatalog(item)) ok++;
    }
    setSavingAll(false);
    if (ok > 0) toast.success(`${ok} foto berhasil diterapkan ke katalog produk.`);
  };

  const handleDownloadSingle = (item: BatchImageItem) => {
    if (!item.processedUrl) return;
    const a = document.createElement("a");
    a.href = item.processedUrl;
    a.download = `${item.title.toLowerCase().replace(/\s+/g, "-")}-clean.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = async () => {
    const doneItems = queue.filter((it) => it.status === "done" && it.processedUrl);
    if (doneItems.length === 0) return;
    toast.info(`Mengunduh ${doneItems.length} foto transparan…`);
    for (let i = 0; i < doneItems.length; i++) {
      handleDownloadSingle(doneItems[i]);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  const completedCount = queue.filter((it) => it.status === "done").length;
  const unsavedCatalogCount = queue.filter(
    (it) => it.itemId && it.status === "done" && it.processedBlob && !it.savedToCatalog,
  ).length;
  const progressPct = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      onClick={() => !isProcessing && !savingAll && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE4DA] bg-[#FAF8F4] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF4F8] text-[#5E93B8]">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-header text-xl text-[#232528] sm:text-2xl">Hapus Background Massal (AI)</h2>
                <span className="rounded-full bg-[#EDF4F8] px-2.5 py-0.5 text-[10px] font-semibold uppercase text-[#35678B]">
                  Pratinjau Aman
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#656B73]">
                Potong latar belakang beberapa foto sekaligus. Hasil pratinjau tidak langsung menimpa katalog sampai
                Anda menyetujuinya.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing || savingAll}
            onClick={onClose}
            className="rounded-full p-2 text-[#656B73] hover:bg-black/5 hover:text-[#232528] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#DCD5CA] bg-[#FAF8F4]/70 p-6 text-center">
            <Upload className="h-7 w-7 text-[#5E93B8]" />
            <div>
              <p className="text-sm font-medium text-[#232528]">Unggah beberapa foto furnitur sekaligus</p>
              <p className="mt-0.5 text-xs text-[#656B73]">Format WebP, PNG, atau JPG — bisa pilih banyak file sekaligus</p>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-4 py-2 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Pilih Foto dari Komputer
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFilesSelected}
              className="hidden"
            />
          </div>

          {queue.length > 0 && (
            <div className="space-y-2 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-[#232528]">
                  <Sparkles className="h-4 w-4 text-[#5E93B8]" />
                  Progres:{" "}
                  <strong>
                    {completedCount} dari {queue.length} foto selesai
                  </strong>
                </span>
                <span className="font-mono text-[#656B73]">{progressPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E6DFD4]">
                <div
                  className="h-full rounded-full bg-[#5E93B8] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#656B73]">
                  Daftar Foto ({queue.length})
                </span>
                {completedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleDownloadAll()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#467A9E] hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Unduh Semua ({completedCount} PNG)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {queue.map((item, idx) => {
                  const isCurrent = currentProcessingIndex === idx;
                  const isDone = item.status === "done";
                  const isError = item.status === "error";

                  return (
                    <div
                      key={item.id}
                      className={`relative flex flex-col justify-between rounded-xl border p-3 shadow-sm transition-all ${
                        isCurrent
                          ? "border-[#5E93B8] ring-2 ring-[#5E93B8]/30"
                          : isDone
                            ? "border-emerald-200 bg-emerald-50/30"
                            : isError
                              ? "border-red-200 bg-red-50/30"
                              : "border-[#EAE4DA] bg-white"
                      }`}
                    >
                      {!isProcessing && !isDone && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFromQueue(item.id)}
                          className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/85"
                          title="Hapus dari antrean"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-[#EAE4DA] bg-[#F3EFE8]">
                        <div
                          className="pointer-events-none absolute inset-0 opacity-30"
                          style={{
                            backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                            backgroundSize: "12px 12px",
                            backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                          }}
                        />
                        <img
                          src={item.processedUrl || item.originalUrl}
                          alt={item.title}
                          className="relative z-[1] h-full w-full object-contain p-2"
                        />
                        {isCurrent && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/65 p-2 text-white">
                            <Loader2 className="h-6 w-6 animate-spin text-[#9DC2DC]" />
                            <span className="text-center text-[11px] font-medium">Memotong background…</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        <h4 className="line-clamp-1 text-xs font-medium text-[#232528]" title={item.title}>
                          {item.title}
                        </h4>

                        <div className="text-[11px]">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {item.savedToCatalog ? "Tersimpan di Katalog" : "Siap ditinjau"}
                            </span>
                          ) : isError ? (
                            <div className="space-y-0.5 text-red-600">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <XCircle className="h-3.5 w-3.5" /> Gagal diproses
                              </span>
                              {item.errorMessage && (
                                <p className="line-clamp-2 text-[10px] text-red-700/80">{item.errorMessage}</p>
                              )}
                            </div>
                          ) : isCurrent ? (
                            <span className="inline-flex items-center gap-1 font-medium text-[#35678B]">
                              <Loader2 className="h-3 w-3 animate-spin" /> Sedang diproses
                            </span>
                          ) : (
                            <span className="text-[#656B73]">Menunggu diproses</span>
                          )}
                        </div>

                        {isDone && (
                          <div className="flex flex-wrap items-center gap-1.5 border-t border-[#EAE4DA] pt-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(item)}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#E2DACF] bg-white px-2 py-1 text-[11px] font-medium text-[#232528] hover:bg-[#FAF8F4]"
                            >
                              <Download className="h-3 w-3" /> Unduh
                            </button>

                            {/* Jika item sudah ada di katalog -> tombol eksplisit Simpan ke Katalog */}
                            {item.itemId ? (
                              <button
                                type="button"
                                disabled={item.savedToCatalog || item.savingToCatalog}
                                onClick={() => void handleSaveOneToCatalog(item)}
                                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#5E93B8] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#4A7FA5] disabled:opacity-55"
                              >
                                {item.savingToCatalog ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                                {item.savedToCatalog ? "Tersimpan" : "Simpan"}
                              </button>
                            ) : (
                              /* Jika file baru dari komputer -> tombol Buat Item Baru */
                              item.processedBlob &&
                              onApplyToNewItem && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const f = new File([item.processedBlob!], `${item.title}-clean.png`, {
                                      type: "image/png",
                                    });
                                    onApplyToNewItem(f, item.processedUrl!);
                                    onClose();
                                  }}
                                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#232528] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#34383D]"
                                >
                                  Buat Item <ArrowRight className="h-3 w-3" />
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE4DA] bg-[#FAF8F4] px-6 py-4">
          <div className="text-xs text-[#656B73]">
            {queue.length > 0 ? (
              <span>
                Total <strong>{queue.length}</strong> foto di antrean
              </span>
            ) : (
              <span>Pilih foto terlebih dahulu untuk mulai</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isProcessing || savingAll}
              onClick={onClose}
              className="rounded-full border border-[#E2DACF] bg-white px-4 py-2 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4] disabled:opacity-50"
            >
              Tutup
            </button>

            {unsavedCatalogCount > 0 && (
              <button
                type="button"
                disabled={savingAll || isProcessing}
                onClick={() => void handleSaveAllToCatalog()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#5E93B8] px-5 py-2 text-xs font-medium text-white hover:bg-[#4A7FA5] disabled:opacity-50"
              >
                {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Simpan ke Katalog ({unsavedCatalogCount})
              </button>
            )}

            {queue.length > 0 && completedCount < queue.length && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => void handleStartBatch()}
                className="inline-flex items-center gap-2 rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memproses…
                  </>
                ) : (
                  <>
                    <Scissors className="h-3.5 w-3.5 text-[#9DC2DC]" />
                    {completedCount > 0 ? "Lanjutkan Sisa Foto" : "Mulai Hapus Background"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
