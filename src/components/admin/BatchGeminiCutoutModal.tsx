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
  RefreshCw,
  Image as ImageIcon,
  Check,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { toast } from "sonner";

export interface BatchImageItem {
  id: string;
  itemId?: number;
  title: string;
  originalFile?: File | null;
  originalUrl: string;
  status: "idle" | "processing" | "done" | "error";
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
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inisialisasi antrean saat modal dibuka dengan item yang sudah ada
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
        }));
      setQueue(itemsWithImages);
    } else if (isOpen && initialItems.length === 0) {
      setQueue([]);
    }
  }, [isOpen, initialItems]);

  if (!isOpen) return null;

  // Handle upload multi-file dari komputer
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
    toast.info(`${files.length} foto berhasil ditambahkan ke antrean.`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Hapus item dari antrean
  const handleRemoveFromQueue = (id: string) => {
    if (isProcessing) return;
    setQueue((prev) => prev.filter((it) => it.id !== id));
  };

  // Jalankan pemrosesan Gemini AI untuk 1 item
  const processSingleItem = async (item: BatchImageItem): Promise<Partial<BatchImageItem>> => {
    const fd = new FormData();
    if (item.originalFile) {
      fd.append("image", item.originalFile);
    } else {
      fd.append("image", item.originalUrl);
    }
    fd.append("action", "remove_bg");
    if (item.itemId) {
      fd.append("item_id", item.itemId.toString());
    }

    const res = await api.post("/admin/items/gemini-process", fd);
    if (!res.data?.success) {
      throw new Error(res.data?.message || "Gagal memproses dengan Gemini AI");
    }

    const outUrl = res.data.base64 || res.data.url;
    const fetchBlob = await fetch(outUrl);
    const blob = await fetchBlob.blob();

    return {
      status: "done",
      processedUrl: URL.createObjectURL(blob),
      processedBlob: blob,
      geminiModel: res.data.model || "Gemini Vision",
      detectedName: res.data.gemini_analysis?.furniture_name || item.title,
    };
  };

  // Jalankan pemrosesan massal (Batch Runner)
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

      // Set status processing
      setQueue((prev) =>
        prev.map((it, idx) => (idx === targetIdx ? { ...it, status: "processing" } : it))
      );

      try {
        const updateData = await processSingleItem(targetItem);
        setQueue((prev) =>
          prev.map((it, idx) => (idx === targetIdx ? { ...it, ...updateData } : it))
        );
        successCount++;
      } catch (err: any) {
        console.error("Batch error on item:", targetItem.title, err);
        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === targetIdx
              ? {
                  ...it,
                  status: "error",
                  errorMessage: err?.response?.data?.message || err?.message || "Gagal diproses",
                }
              : it
          )
        );
        failCount++;
      }

      // Micro-pause antara request agar tidak terkena rate-limit API
      await new Promise((r) => setTimeout(r, 400));
    }

    setIsProcessing(false);
    setCurrentProcessingIndex(null);

    if (successCount > 0) {
      toast.success(`${successCount} foto furnitur berhasil dibersihkan dengan Google Gemini AI!`);
      if (initialItems.length > 0 && onItemsUpdated) {
        onItemsUpdated();
      }
    }
    if (failCount > 0) {
      toast.error(`${failCount} foto gagal diproses. Anda dapat mencobanya kembali.`);
    }
  };

  // Download 1 file bersih
  const handleDownloadSingle = (item: BatchImageItem) => {
    if (!item.processedUrl) return;
    const a = document.createElement("a");
    a.href = item.processedUrl;
    a.download = `${item.title.toLowerCase().replace(/\s+/g, "-")}-clean.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download semua hasil bersih secara berurutan
  const handleDownloadAll = async () => {
    const doneItems = queue.filter((it) => it.status === "done" && it.processedUrl);
    if (doneItems.length === 0) {
      toast.error("Belum ada foto yang selesai diproses.");
      return;
    }

    toast.info(`Mulai mendownload ${doneItems.length} foto transparan...`);
    for (let i = 0; i < doneItems.length; i++) {
      handleDownloadSingle(doneItems[i]);
      await new Promise((r) => setTimeout(r, 250)); // Jeda 250ms agar browser tidak memblokir multi-download
    }
  };

  const completedCount = queue.filter((it) => it.status === "done").length;
  const progressPct = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md grid place-items-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={() => !isProcessing && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D7B483]/20 text-[#A88247] flex items-center justify-center">
              <Scissors className="w-5 h-5 text-[#D7B483]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="serif text-xl sm:text-2xl font-light">Batch Gemini AI Cutout</h2>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[#D7B483] text-black">
                  Multi-Image
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pilih 5 atau berapapun foto furnitur sekaligus. Google Gemini AI akan memotong seluruh background secara otomatis.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dropzone Upload Tambah Foto (Hanya tampil jika antrean kosong atau ingin tambah) */}
          <div className="border-2 border-dashed border-border rounded-xl p-6 bg-muted/20 hover:bg-muted/30 transition-colors text-center relative flex flex-col items-center justify-center gap-2">
            <Upload className="w-8 h-8 text-[#D7B483]" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Pilih 5, 10, atau berapapun foto furnitur dari komputer
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Format: WebP, PNG, JPG (Bisa memilih beberapa file sekaligus)
              </p>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-xs uppercase tracking-wider font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pilih Beberapa Foto Sekaligus</span>
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

          {/* Progress Bar & Status Ringkasan */}
          {queue.length > 0 && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D7B483]" />
                  Status Antrean:{" "}
                  <strong>
                    {completedCount} dari {queue.length} Foto Selesai
                  </strong>
                </span>
                <span className="font-mono text-muted-foreground">{progressPct}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#D7B483] to-[#c6a270] transition-all duration-300 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Grid Antrean Foto */}
          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                  Daftar Foto Furnitur ({queue.length})
                </span>
                {completedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    className="text-xs text-[#A88247] hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Semua ({completedCount} Bersih)</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {queue.map((item, idx) => {
                  const isCurrent = currentProcessingIndex === idx;
                  const isDone = item.status === "done";
                  const isError = item.status === "error";

                  return (
                    <div
                      key={item.id}
                      className={`relative rounded-xl border p-3 flex flex-col justify-between transition-all bg-card shadow-sm ${
                        isCurrent
                          ? "ring-2 ring-[#D7B483] border-[#D7B483]"
                          : isDone
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : isError
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-border"
                      }`}
                    >
                      {/* Tombol Hapus (jika belum diproses) */}
                      {!isProcessing && !isDone && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFromQueue(item.id)}
                          className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/60 text-white hover:bg-black/90"
                          title="Hapus dari antrean"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Gambar Preview */}
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#141414] border border-border/80 flex items-center justify-center">
                        {/* Checkerboard Pattern */}
                        <div
                          className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            backgroundImage: `linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%)`,
                            backgroundSize: "12px 12px",
                            backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                          }}
                        />

                        <img
                          src={item.processedUrl || item.originalUrl}
                          alt={item.title}
                          className="w-full h-full object-contain p-2"
                        />

                        {/* Status Overlay */}
                        {isCurrent && (
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 p-2">
                            <Loader2 className="w-6 h-6 animate-spin text-[#D7B483]" />
                            <span className="text-[10px] text-center font-medium">
                              Gemini AI Memotong...
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Item Info & Status Badge */}
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <h4 className="font-medium line-clamp-1 text-foreground" title={item.title}>
                            {item.title}
                          </h4>
                        </div>

                        {/* Status Label */}
                        <div className="flex items-center justify-between text-[11px]">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selesai Transparan
                            </span>
                          ) : isError ? (
                            <span className="inline-flex items-center gap-1 text-destructive font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Gagal
                            </span>
                          ) : isCurrent ? (
                            <span className="inline-flex items-center gap-1 text-[#A88247] font-medium">
                              <Loader2 className="w-3 h-3 animate-spin" /> Sedang Diproses
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Menunggu antrean</span>
                          )}
                        </div>

                        {/* Tombol Aksi per Item */}
                        {isDone && (
                          <div className="pt-2 flex items-center gap-1.5 border-t border-border">
                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(item)}
                              className="flex-1 py-1 px-2 rounded bg-muted hover:bg-muted/80 text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors"
                              title="Download PNG Transparan"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </button>

                            {item.processedBlob && onApplyToNewItem && (
                              <button
                                type="button"
                                onClick={() => {
                                  const f = new File(
                                    [item.processedBlob!],
                                    `${item.title}-clean.png`,
                                    { type: "image/png" }
                                  );
                                  onApplyToNewItem(f, item.processedUrl!);
                                  onClose();
                                }}
                                className="py-1 px-2 rounded bg-[#D7B483] hover:bg-[#c6a270] text-black text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                                title="Gunakan foto ini untuk membuat item baru"
                              >
                                <span>Buat Item</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
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

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/40">
          <div className="text-xs text-muted-foreground">
            {queue.length > 0 ? (
              <span>
                Total <strong>{queue.length}</strong> foto terpilih
              </span>
            ) : (
              <span>Pilih beberapa foto untuk mulai memproses</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-xs uppercase tracking-wider font-medium disabled:opacity-50"
            >
              {completedCount > 0 ? "Selesai" : "Tutup"}
            </button>

            {queue.length > 0 && (
              <button
                type="button"
                disabled={isProcessing || completedCount === queue.length}
                onClick={handleStartBatch}
                className="px-5 py-2 rounded-lg bg-[#D7B483] hover:bg-[#c6a270] text-black text-xs uppercase tracking-wider font-semibold inline-flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini AI Sedang Bekerja...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>
                      {completedCount > 0 ? "Lanjutkan Sisa Foto" : "Mulai Hapus Background Semua"}
                    </span>
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
