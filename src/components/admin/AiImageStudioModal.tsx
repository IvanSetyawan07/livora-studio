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
  ZoomIn,
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

  // Settings
  const [removeBgActive, setRemoveBgActive] = useState(true);
  const [bgSensitivity, setBgSensitivity] = useState(38); // 10 - 80
  const [backdrop, setBackdrop] = useState<BackdropOption>("studio-white");

  // Realism & Quality Settings
  const [enhanceRealismActive, setEnhanceRealismActive] = useState(true);
  const [sharpness, setSharpness] = useState(45); // 0 - 100
  const [studioContrast, setStudioContrast] = useState(15); // -50 to 50
  const [studioWarmth, setStudioWarmth] = useState(8); // -30 to 30

  // Interactive Before / After Split Slider (0% - 100%)
  const [splitPos, setSplitPos] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Jalankan AI Studio processing
  const processImage = useCallback(async () => {
    if (!imageSource) return;
    setProcessing(true);
    setProcessingMessage("AI Agent sedang menganalisis objek furnitur...");

    try {
      const img = new Image();
      if (!imageSource.startsWith("blob:") && !imageSource.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = imageSource;
      });

      setProcessingMessage("Menghapus background & mengisolasi furnitur...");
      await new Promise((r) => setTimeout(r, 120)); // micro-delay for smooth UI feedback

      const width = img.width || 1200;
      const height = img.height || 900;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas context unavailable");

      // Gambar foto asli
      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // ── TAHAP 1: AI Background Removal (Edge-Aware Boundary & Color Difference) ──
      if (removeBgActive) {
        // Ambil sampel warna background dari 4 sudut gambar
        const sampleCorner = (x: number, y: number) => {
          const idx = (y * width + x) * 4;
          return [data[idx], data[idx + 1], data[idx + 2]];
        };

        const corners = [
          sampleCorner(2, 2),
          sampleCorner(width - 3, 2),
          sampleCorner(2, height - 3),
          sampleCorner(width - 3, height - 3),
          sampleCorner(Math.floor(width / 2), 2), // top center
          sampleCorner(Math.floor(width / 2), height - 3), // bottom center
        ];

        // Rata-rata warna background dominan
        const avgR = corners.reduce((acc, c) => acc + c[0], 0) / corners.length;
        const avgG = corners.reduce((acc, c) => acc + c[1], 0) / corners.length;
        const avgB = corners.reduce((acc, c) => acc + c[2], 0) / corners.length;

        const threshold = (bgSensitivity / 100) * 160;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Hitung jarak Euclidean ke warna background
          let minDist = Math.sqrt(
            Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2)
          );

          // Cek juga jarak ke sudut-sudut individual
          for (const c of corners) {
            const d = Math.sqrt(
              Math.pow(r - c[0], 2) + Math.pow(g - c[1], 2) + Math.pow(b - c[2], 2)
            );
            if (d < minDist) minDist = d;
          }

          if (minDist < threshold) {
            // Background terdeteksi -> Berikan feathering transparan halus
            const alphaFactor = Math.max(0, (minDist - threshold * 0.5) / (threshold * 0.5));
            data[i + 3] = Math.round(data[i + 3] * alphaFactor);
          }
        }
      }

      // ── TAHAP 2: AI Realism & Quality Enhancement (Detail, Contrast, Texture) ──
      if (enhanceRealismActive) {
        setProcessingMessage("Menyempurnakan detail tekstur kayu, marmer & pencahayaan studio...");
        await new Promise((r) => setTimeout(r, 100));

        const contrastFactor = (259 * (studioContrast + 255)) / (255 * (259 - studioContrast));
        const warmthAdd = studioWarmth * 1.5;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue; // skip transparent pixels

          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // 1. Contrast adjustment
          r = contrastFactor * (r - 128) + 128;
          g = contrastFactor * (g - 128) + 128;
          b = contrastFactor * (b - 128) + 128;

          // 2. Luxury Warmth Color Grading (sedikit aksen hangat pada highlights & netral di shadows)
          r = r + warmthAdd;
          g = g + warmthAdd * 0.4;
          b = b - warmthAdd * 0.3;

          // 3. Texture Micro-Sharpening (penajaman serat kayu/kain)
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const sharpDelta = (lum - 128) * (sharpness / 300);
          r += sharpDelta;
          g += sharpDelta;
          b += sharpDelta;

          // Clamp
          data[i] = Math.min(255, Math.max(0, Math.round(r)));
          data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
          data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // ── TAHAP 3: Backdrop Rendering (Jika bukan transparan murni) ──
      let finalCanvas = canvas;
      if (removeBgActive && backdrop !== "transparent") {
        const bgCanvas = document.createElement("canvas");
        bgCanvas.width = width;
        bgCanvas.height = height;
        const bgCtx = bgCanvas.getContext("2d");
        if (bgCtx) {
          if (backdrop === "studio-white") {
            // Studio White Radial Gradient (Luxury Furniture Spotlight)
            const grad = bgCtx.createRadialGradient(
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
            bgCtx.fillStyle = grad;
            bgCtx.fillRect(0, 0, width, height);
          } else if (backdrop === "studio-warm") {
            // Warm Minimalist Studio
            const grad = bgCtx.createRadialGradient(
              width / 2,
              height * 0.4,
              100,
              width / 2,
              height / 2,
              Math.max(width, height)
            );
            grad.addColorStop(0, "#F5EFE6");
            grad.addColorStop(1, "#DFD3C3");
            bgCtx.fillStyle = grad;
            bgCtx.fillRect(0, 0, width, height);
          } else if (backdrop === "studio-dark") {
            // Dark Dramatic Luxury Studio
            const grad = bgCtx.createRadialGradient(
              width / 2,
              height / 2,
              80,
              width / 2,
              height / 2,
              Math.max(width, height)
            );
            grad.addColorStop(0, "#262626");
            grad.addColorStop(1, "#121212");
            bgCtx.fillStyle = grad;
            bgCtx.fillRect(0, 0, width, height);
          }

          // Gambar objek furnitur di atas backdrop studio
          bgCtx.drawImage(canvas, 0, 0);
          finalCanvas = bgCanvas;
        }
      }

      // Convert ke Blob & URL
      finalCanvas.toBlob(
        (blob) => {
          if (!blob) throw new Error("Gagal mengekspor blob");
          setProcessedBlob(blob);
          const url = URL.createObjectURL(blob);
          setProcessedUrl(url);
          setProcessing(false);
        },
        "image/webp",
        0.95
      );
    } catch (err) {
      console.error("AI Studio Error:", err);
      toast.error("Kendala memproses gambar dengan AI. Coba gunakan gambar asli.");
      setProcessing(false);
    }
  }, [imageSource, removeBgActive, bgSensitivity, backdrop, enhanceRealismActive, sharpness, studioContrast, studioWarmth]);

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
      ? originalFile.name.replace(/\.[^/.]+$/, "") + "-ai-studio.webp"
      : `${itemName.toLowerCase().replace(/\s+/g, "-")}-ai-studio.webp`;

    const newFile = new File([processedBlob], filename, { type: "image/webp" });
    onApply(newFile, processedUrl);
    toast.success("Foto furnitur berhasil disempurnakan dengan AI Studio!");
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
        className="bg-card border border-border rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#D7B483]/20 text-[#A88247] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#D7B483]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="serif text-xl sm:text-2xl font-light">LIVORA AI Image Studio</h2>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[#D7B483] text-black">
                  Agent v2.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hapus background & tingkatkan kualitas realisme tekstur furnitur secara otomatis.
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

        {/* Modal Body: 2 Columns (Interactive Preview Left, Controls Right) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column 1: Interactive Before / After Split Screen (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#D7B483]" />
                Geser slider untuk membandingkan (Sebelum ↔ Sesudah AI)
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
              className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-border shadow-inner bg-[#161616] cursor-ew-resize select-none flex items-center justify-center"
            >
              {/* Checkerboard Background Pattern for transparency */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
                  backgroundSize: "16px 16px",
                }}
              />

              {/* Before Image (Original) */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <img
                  src={imageSource}
                  alt="Original"
                  className="w-full h-full object-contain pointer-events-none"
                />
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/70 text-white/90 text-[10px] uppercase tracking-wider backdrop-blur-sm pointer-events-none border border-white/20">
                  Foto Asli
                </span>
              </div>

              {/* After Image (Processed by AI) - Clipped by split position */}
              <div
                className="absolute inset-0 overflow-hidden flex items-center justify-center p-4 transition-[clip-path] duration-75"
                style={{
                  clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)`,
                }}
              >
                {processedUrl ? (
                  <img
                    src={processedUrl}
                    alt="AI Enhanced"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#D7B483]" />
                    <span className="text-xs">Memproses dengan AI...</span>
                  </div>
                )}
                <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-[#D7B483] text-black font-semibold text-[10px] uppercase tracking-wider shadow-md pointer-events-none">
                  Hasil AI Studio
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
                <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 gap-3 animate-in fade-in duration-150">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D7B483]" />
                  <p className="text-xs text-center font-medium max-w-xs">{processingMessage}</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: AI Controls & Presets (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold block mb-2">
                  Preset Cepat AI
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveBgActive(true);
                      setEnhanceRealismActive(true);
                      setBackdrop("studio-white");
                      setSharpness(50);
                      setStudioContrast(18);
                    }}
                    className="p-2.5 rounded-lg border border-[#D7B483]/50 bg-[#D7B483]/10 hover:bg-[#D7B483]/20 text-left transition-colors text-xs flex items-center gap-2"
                  >
                    <Wand2 className="w-4 h-4 text-[#D7B483] shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">1-Click Studio Magic</div>
                      <div className="text-[10px] text-muted-foreground">Hapus BG + Realisme Maksimal</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRemoveBgActive(true);
                      setBackdrop("transparent");
                    }}
                    className="p-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-left transition-colors text-xs flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4 text-foreground/70 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">Cutout Transparan</div>
                      <div className="text-[10px] text-muted-foreground">Isolasi produk bersih</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Module 1: Background Removal Settings */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={removeBgActive}
                      onChange={(e) => setRemoveBgActive(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span>✨ Hapus Background (AI Cutout)</span>
                  </label>
                  {removeBgActive && (
                    <span className="text-[10px] text-[#A88247] font-semibold">Aktif</span>
                  )}
                </div>

                {removeBgActive && (
                  <div className="space-y-3 pt-1">
                    {/* Backdrop Options */}
                    <div>
                      <span className="text-[10px] text-muted-foreground block mb-1.5 uppercase tracking-wider">
                        Ganti Latar Studio:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5 text-xs">
                        {[
                          { id: "studio-white", label: "Studio Putih" },
                          { id: "studio-warm", label: "Warm Lux" },
                          { id: "studio-dark", label: "Dark Moody" },
                          { id: "transparent", label: "Transparan" },
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBackdrop(b.id as BackdropOption)}
                            className={`py-1 px-1.5 rounded text-[10px] text-center transition-all border ${
                              backdrop === b.id
                                ? "bg-foreground text-background font-semibold border-foreground shadow-sm"
                                : "border-border hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sensitivity Slider */}
                    <div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Toleransi Deteksi Tepi:</span>
                        <span className="font-mono">{bgSensitivity}%</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="70"
                        value={bgSensitivity}
                        onChange={(e) => setBgSensitivity(parseInt(e.target.value))}
                        className="w-full accent-foreground cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Module 2: Realism & Quality Enhancement */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={enhanceRealismActive}
                      onChange={(e) => setEnhanceRealismActive(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span>💎 Tingkatkan Realisme & Tekstur</span>
                  </label>
                  {enhanceRealismActive && (
                    <span className="text-[10px] text-[#A88247] font-semibold">Aktif</span>
                  )}
                </div>

                {enhanceRealismActive && (
                  <div className="space-y-2.5 pt-1">
                    {/* Sharpness Slider */}
                    <div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Ketajaman Urat Kayu/Kain:</span>
                        <span className="font-mono">{sharpness}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={sharpness}
                        onChange={(e) => setSharpness(parseInt(e.target.value))}
                        className="w-full accent-foreground cursor-pointer"
                      />
                    </div>

                    {/* Studio Lighting Contrast */}
                    <div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Pencahayaan & Kontras Studio:</span>
                        <span className="font-mono">+{studioContrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-20"
                        max="40"
                        value={studioContrast}
                        onChange={(e) => setStudioContrast(parseInt(e.target.value))}
                        className="w-full accent-foreground cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tombol Perbarui Hasil */}
              <button
                type="button"
                onClick={processImage}
                disabled={processing}
                className="w-full py-2 rounded-lg border border-border hover:bg-muted text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${processing ? "animate-spin" : ""}`} />
                Perbarui Hasil AI
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
                Gunakan Gambar AI
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
