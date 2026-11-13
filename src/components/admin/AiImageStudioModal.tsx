import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Check,
  X,
  Sliders,
  Sun,
  Eye,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Key,
  Cpu,
  Cloud,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface AiImageStudioModalProps {
  isOpen: boolean;
  imageSource: string; // URL atau blob data
  originalFile?: File | null;
  itemName?: string;
  onClose: () => void;
  onApply: (processedFile: File, processedUrl: string) => void;
}

type BackdropOption = "transparent" | "studio-white" | "studio-warm" | "studio-dark";
type AiEngine = "neural-net" | "removebg";

export default function AiImageStudioModal({
  isOpen,
  imageSource,
  originalFile,
  itemName = "Furnitur",
  onClose,
  onApply,
}: AiImageStudioModalProps) {
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);

  // AI Engine Switcher (Default: Deep Learning Neural Network IS-Net)
  const [aiEngine, setAiEngine] = useState<AiEngine>("neural-net");
  const [removeBgApiKey, setRemoveBgApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem("livora_removebg_key") || "";
    } catch {
      return "";
    }
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Settings: Default to TRANSPARENT so ONLY the furniture object remains!
  const [removeBgActive, setRemoveBgActive] = useState(true);
  const [backdrop, setBackdrop] = useState<BackdropOption>("transparent");

  // Realism & Quality Settings
  const [enhanceRealismActive, setEnhanceRealismActive] = useState(false);
  const [sharpness, setSharpness] = useState(30); // 0 - 100
  const [studioContrast, setStudioContrast] = useState(10); // -50 to 50
  const [studioWarmth, setStudioWarmth] = useState(5); // -30 to 30

  // Interactive Before / After Split Slider (0% - 100%)
  const [splitPos, setSplitPos] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Helper untuk menyimpan API Key ke local storage
  const handleSaveApiKey = (key: string) => {
    setRemoveBgApiKey(key);
    try {
      localStorage.setItem("livora_removebg_key", key);
    } catch {}
  };

  // Helper: Dapatkan base64 atau blob dari imageSource
  const getSourceBlob = async (source: string): Promise<Blob> => {
    if (originalFile) return originalFile;
    const resp = await fetch(source, { mode: "cors" });
    return await resp.blob();
  };

  // ── Jalankan AI Processing ──
  const processImage = useCallback(async () => {
    if (!imageSource) return;
    setProcessing(true);
    setProcessingMessage("AI sedang menginisialisasi model pemindaian objek...");

    try {
      let cutoutBlob: Blob | null = null;

      // ── TAHAP 1: EKSEKUSI TRUE AI BACKGROUND REMOVAL ──
      if (removeBgActive) {
        if (aiEngine === "removebg" && removeBgApiKey.trim()) {
          // ENGINE A: Remove.bg Commercial AI API
          setProcessingMessage("Menghubungi Cloud AI (Remove.bg) untuk isolasi furnitur...");
          const rawBlob = await getSourceBlob(imageSource);
          const fd = new FormData();
          fd.append("image_file", rawBlob, "furniture.jpg");
          fd.append("size", "auto");

          const res = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: {
              "X-Api-Key": removeBgApiKey.trim(),
            },
            body: fd,
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            const errTitle = errJson?.errors?.[0]?.title || `Remove.bg error (${res.status})`;
            throw new Error(errTitle);
          }

          cutoutBlob = await res.blob();
        } else {
          // ENGINE B: In-Browser Deep Learning Neural Network (IS-Net via @imgly/background-removal)
          setProcessingMessage("Memuat model Deep Learning Neural Network (IS-Net)...");

          try {
            // @ts-ignore
            const imgly = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm");
            const removeBackground = imgly.removeBackground || imgly.default;

            setProcessingMessage("AI Neural Network sedang memindai objek & memotong background...");
            
            const rawBlob = await getSourceBlob(imageSource);
            cutoutBlob = await removeBackground(rawBlob, {
              publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.5.7/dist/",
              progress: (key: string, current: number, total: number) => {
                if (key.includes("fetch")) {
                  const pct = total > 0 ? Math.round((current / total) * 100) : Math.round(current);
                  setProcessingMessage(`Mengunduh bobot AI neural network (${pct}%)...`);
                } else if (key.includes("compute")) {
                  setProcessingMessage("Neural network sedang mengekstrak objek furnitur...");
                }
              },
            });
          } catch (netErr: any) {
            console.error("Gagal memuat neural network in-browser:", netErr);
            throw new Error(
              "Gagal memuat AI Neural Network di browser. Pastikan koneksi internet aktif untuk download model AI, atau pilih opsi Cloud API (Remove.bg)."
            );
          }
        }
      }

      // Jika tidak menghapus background atau AI menghasilkan blob
      const sourceBlobToUse = cutoutBlob || (await getSourceBlob(imageSource));
      const sourceUrl = URL.createObjectURL(sourceBlobToUse);

      // Jika backdrop transparan murni dan tidak ada tuning realisme -> langsung jadikan hasil final
      if (backdrop === "transparent" && !enhanceRealismActive) {
        setProcessedBlob(sourceBlobToUse);
        setProcessedUrl(sourceUrl);
        setProcessing(false);
        return;
      }

      // ── TAHAP 2: RENDERING LATAR / ENHANCEMENT JIKA DIMINTA ──
      setProcessingMessage("Menyiapkan kanvas akhir & pencahayaan...");
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = sourceUrl;
      });

      const width = img.width || 1200;
      const height = img.height || 900;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak tersedia");

      // 1. Gambar latar belakang jika bukan transparan
      if (backdrop === "studio-white") {
        const grad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          50,
          width / 2,
          height / 2,
          Math.max(width, height) / 1.1
        );
        grad.addColorStop(0, "#FFFFFF");
        grad.addColorStop(0.65, "#F7F6F3");
        grad.addColorStop(1, "#EAE7E1");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (backdrop === "studio-warm") {
        const grad = ctx.createRadialGradient(
          width / 2,
          height * 0.4,
          100,
          width / 2,
          height / 2,
          Math.max(width, height)
        );
        grad.addColorStop(0, "#F5EFE6");
        grad.addColorStop(1, "#DFD3C3");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (backdrop === "studio-dark") {
        const grad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          80,
          width / 2,
          height / 2,
          Math.max(width, height)
        );
        grad.addColorStop(0, "#262626");
        grad.addColorStop(1, "#121212");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Gambar objek furnitur
      ctx.drawImage(img, 0, 0, width, height);

      // 3. Efek Realisme Tekstur (Opsional)
      if (enhanceRealismActive) {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const contrastFactor = (259 * (studioContrast + 255)) / (255 * (259 - studioContrast));
        const warmthAdd = studioWarmth * 1.5;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue; // lewati piksel transparan

          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          r = contrastFactor * (r - 128) + 128;
          g = contrastFactor * (g - 128) + 128;
          b = contrastFactor * (b - 128) + 128;

          r = r + warmthAdd;
          g = g + warmthAdd * 0.4;
          b = b - warmthAdd * 0.3;

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const sharpDelta = (lum - 128) * (sharpness / 300);
          r += sharpDelta;
          g += sharpDelta;
          b += sharpDelta;

          data[i] = Math.min(255, Math.max(0, Math.round(r)));
          data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
          data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Export ke Blob WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) throw new Error("Gagal mengekspor blob kanvas");
          setProcessedBlob(blob);
          const url = URL.createObjectURL(blob);
          setProcessedUrl(url);
          setProcessing(false);
        },
        "image/webp",
        0.95
      );
    } catch (err: any) {
      console.error("AI Studio Error:", err);
      toast.error(err?.message || "Gagal memproses gambar dengan AI.");
      setProcessing(false);
    }
  }, [
    imageSource,
    originalFile,
    removeBgActive,
    aiEngine,
    removeBgApiKey,
    backdrop,
    enhanceRealismActive,
    sharpness,
    studioContrast,
    studioWarmth,
  ]);

  // Jalankan pemrosesan otomatis saat modal pertama kali dibuka
  useEffect(() => {
    if (isOpen && imageSource) {
      processImage();
    }
  }, [isOpen, imageSource]);

  // Handle Dragging Split Slider
  const handleSplitMove = (clientX: number) => {
    if (!splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSplitPos(pct);
  };

  const handleApply = () => {
    if (!processedBlob || !processedUrl) {
      toast.error("Hasil proses AI belum siap.");
      return;
    }
    const filename = originalFile
      ? originalFile.name.replace(/\.[^/.]+$/, "") + "-ai-clean.webp"
      : `${itemName.toLowerCase().replace(/\s+/g, "-")}-ai-clean.webp`;

    const newFile = new File([processedBlob], filename, { type: "image/webp" });
    onApply(newFile, processedUrl);
    toast.success("Foto furnitur berhasil dipotong bersih dengan AI!");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md grid place-items-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[94vh]"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#D7B483]/20 text-[#A88247] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#D7B483]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="serif text-xl sm:text-2xl font-light">LIVORA AI Cutout Studio</h2>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[#D7B483] text-black">
                  Neural Net v2.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Model AI Deep Learning untuk menghapus background dan menyisakan murni objek furnitur secara presisi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column 1: Interactive Before / After Split Screen (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#D7B483]" />
                Geser slider tengah untuk melihat perbandingan (Sebelum ↔ Sesudah AI)
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{Math.round(splitPos)}%</span>
            </div>

            {/* Split Comparison Canvas Container */}
            <div
              ref={splitContainerRef}
              onMouseDown={() => setIsDraggingSplit(true)}
              onMouseUp={() => setIsDraggingSplit(false)}
              onMouseMove={(e) => isDraggingSplit && handleSplitMove(e.clientX)}
              onTouchMove={(e) => handleSplitMove(e.touches[0].clientX)}
              className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-border shadow-inner bg-[#121212] cursor-ew-resize select-none flex items-center justify-center"
            >
              {/* Checkerboard Pattern for transparent background */}
              <div
                className="absolute inset-0 opacity-25 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                }}
              />

              {/* Before Image (Foto Asli) */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <img
                  src={imageSource}
                  alt="Original"
                  className="w-full h-full object-contain pointer-events-none"
                />
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/70 text-white/90 text-[10px] uppercase tracking-wider backdrop-blur-sm pointer-events-none border border-white/20">
                  Foto Asli (Ada Background)
                </span>
              </div>

              {/* After Image (Hasil AI) - Clipped by split position */}
              <div
                className="absolute inset-0 overflow-hidden flex items-center justify-center p-4 transition-[clip-path] duration-75"
                style={{
                  clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)`,
                }}
              >
                {processedUrl ? (
                  <img
                    src={processedUrl}
                    alt="AI Cutout"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#D7B483]" />
                    <span className="text-xs">Memproses dengan AI...</span>
                  </div>
                )}
                <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-[#D7B483] text-black font-semibold text-[10px] uppercase tracking-wider shadow-md pointer-events-none">
                  Hasil AI (Tinggal Barangnya)
                </span>
              </div>

              {/* Split Divider Line & Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20 pointer-events-none"
                style={{ left: `${splitPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-foreground text-background border border-white/60 flex items-center justify-center shadow-xl">
                  <Sliders className="w-4 h-4 rotate-90" />
                </div>
              </div>

              {/* Loading Overlay */}
              {processing && (
                <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 gap-3 animate-in fade-in duration-150">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D7B483]" />
                  <p className="text-xs text-center font-medium max-w-sm">{processingMessage}</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Controls & Options (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Pilihan Mesin AI (In-Browser Neural Net vs Remove.bg API) */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2.5">
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold block">
                  Pilihan Mesin AI Vision
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAiEngine("neural-net");
                      setShowApiKeyInput(false);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      aiEngine === "neural-net"
                        ? "border-[#D7B483] bg-[#D7B483]/15 text-foreground shadow-sm font-medium"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Cpu className="w-3.5 h-3.5 text-[#D7B483]" />
                      <span>AI Neural Net</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Gratis di browser (Model IS-Net)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAiEngine("removebg");
                      setShowApiKeyInput(true);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      aiEngine === "removebg"
                        ? "border-[#D7B483] bg-[#D7B483]/15 text-foreground shadow-sm font-medium"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Cloud className="w-3.5 h-3.5 text-[#D7B483]" />
                      <span>Cloud AI API</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Remove.bg (Instan 1 detik)
                    </div>
                  </button>
                </div>

                {/* Input API Key Remove.bg bila dipilih */}
                {(showApiKeyInput || (aiEngine === "removebg" && !removeBgApiKey)) && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Key className="w-3 h-3 text-[#A88247]" /> Remove.bg API Key:
                      </span>
                      <a
                        href="https://www.remove.bg/api"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#A88247] hover:underline flex items-center gap-0.5"
                      >
                        Dapatkan Key Gratis (50/bln) <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={removeBgApiKey}
                      onChange={(e) => handleSaveApiKey(e.target.value)}
                      placeholder="Tempel API Key remove.bg di sini..."
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-[#D7B483]"
                    />
                  </div>
                )}
              </div>

              {/* Opsi Output Background: Transparan (Pure Item) vs Studio */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold block">
                  Latar Belakang Hasil Cutout
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setBackdrop("transparent")}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      backdrop === "transparent"
                        ? "border-[#D7B483] bg-[#D7B483]/15 text-foreground font-semibold"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#D7B483]" />
                      <span>Transparan Murni</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-normal">
                      Hanya objek barang furnitur
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBackdrop("studio-white")}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      backdrop === "studio-white"
                        ? "border-[#D7B483] bg-[#D7B483]/15 text-foreground font-semibold"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-[#D7B483]" />
                      <span>Studio Putih</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-normal">
                      Latar putih spotlight mewah
                    </div>
                  </button>
                </div>
              </div>

              {/* Tombol Jalankan / Refresh AI */}
              <button
                type="button"
                onClick={processImage}
                disabled={processing}
                className="w-full py-2.5 rounded-lg bg-[#D7B483] hover:bg-[#c6a270] text-black text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sedang Memproses AI...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Proses Ulang dengan AI</span>
                  </>
                )}
              </button>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-border hover:bg-muted text-xs uppercase tracking-wider font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={processing || !processedUrl}
                className="flex-1 py-2.5 rounded-lg bg-foreground text-background hover:opacity-90 text-xs uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Gunakan Gambar Bersih Ini
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
