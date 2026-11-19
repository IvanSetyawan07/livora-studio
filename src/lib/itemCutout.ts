import { api } from "@/lib/api";

export interface CutoutResult {
  blob: Blob;
  file: File;
  url: string;
  engine: "neural-isnet" | "gemini-pixel-matte";
  modelUsed: string;
  detectedName?: string;
}

async function resolveBlobFromInput(file?: File | null, imageUrl?: string): Promise<Blob | null> {
  if (file) return file;
  if (!imageUrl) return null;
  try {
    const resp = await fetch(
      imageUrl,
      imageUrl.startsWith("blob:") || imageUrl.startsWith("data:") ? undefined : { mode: "cors" },
    );
    if (!resp.ok) return null;
    return await resp.blob();
  } catch {
    return null;
  }
}

/**
 * Membersihkan tepi halo tipis, menghilangkan noise alpha rendah, dan memangkas
 * pinggiran transparan berlebih dengan margin seimbang 3.5%.
 */
async function refineTransparentCutoutBlob(blob: Blob): Promise<Blob> {
  if (typeof document === "undefined") return blob;

  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = objectUrl;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return blob;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;

    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let a = data[i + 3];

        // Buang noise hampir transparan di latar
        if (a < 14) {
          data[i + 3] = 0;
          continue;
        }

        // De-fringing halus untuk piksel semi-transparan di pinggir objek yang tercampur warna putih latar
        if (a < 210) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const luma = (r + g + b) / 3;
          if (luma > 215 && maxC - minC < 26) {
            a = Math.round(a * 0.45);
            data[i + 3] = a;
            if (a < 14) {
              data[i + 3] = 0;
              continue;
            }
          }
        }

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) {
      return blob;
    }

    ctx.putImageData(imgData, 0, 0);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const pad = Math.round(Math.max(cropW, cropH) * 0.035);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = cropW + pad * 2;
    outCanvas.height = cropH + pad * 2;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) return blob;

    outCtx.drawImage(canvas, minX, minY, cropW, cropH, pad, pad, cropW, cropH);

    const finalBlob = await new Promise<Blob | null>((resolve) =>
      outCanvas.toBlob((b) => resolve(b), "image/png"),
    );

    return finalBlob || blob;
  } catch {
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Hapus background foto item dengan pipeline hybrid presisi tinggi:
 * 1) Analisis visual Gemini Vision (nama produk & material) berjalan paralel.
 * 2) Segmentasi Neural Deep Learning (IS-Net via @imgly/background-removal) +
 *    auto-trim & edge de-fringing -> memotong latar studio putih maupun latar ruangan.
 * 3) Fallback ke Backend Gemini Vision + Pixel Alpha Flood-Fill bila neural client terhambat.
 */
export async function removeItemBackgroundWithAi(params: {
  file?: File | null;
  imageUrl?: string;
  baseName?: string;
  itemId?: number;
}): Promise<CutoutResult> {
  const { file, imageUrl, baseName = "furniture", itemId } = params;
  const cleanStem = baseName.replace(/\.[^/.]+$/, "");
  const rawBlob = await resolveBlobFromInput(file, imageUrl);

  // Jalankan analisis Gemini Vision paralel agar tidak menambah latensi.
  const analyzePromise = (async () => {
    try {
      const fd = new FormData();
      if (rawBlob) {
        fd.append("image", rawBlob, `${cleanStem}.jpg`);
      } else if (imageUrl) {
        fd.append("image", imageUrl);
      } else {
        return null;
      }
      fd.append("action", "analyze");
      const res = await api.post("/admin/items/gemini-process", fd);
      return res.data ?? null;
    } catch {
      return null;
    }
  })();

  // Utama: Segmentasi pixel neural (IS-Net) jika blob berhasil diakses
  if (rawBlob) {
    try {
      // @ts-ignore
      const imgly = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.7/+esm");
      const removeBackground = imgly.removeBackground || imgly.default;
      const cutoutRaw: Blob = await removeBackground(rawBlob, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.5.7/dist/",
      });
      const refinedBlob = await refineTransparentCutoutBlob(cutoutRaw);
      const cleanFile = new File([refinedBlob], `${cleanStem}-clean.png`, { type: "image/png" });

      if (itemId) {
        const saveFd = new FormData();
        saveFd.append("image", cleanFile);
        saveFd.append("action", "save_cutout");
        saveFd.append("item_id", String(itemId));
        await api.post("/admin/items/gemini-process", saveFd);
      }

      const analysisData = await analyzePromise;
      return {
        blob: refinedBlob,
        file: cleanFile,
        url: URL.createObjectURL(cleanFile),
        engine: "neural-isnet",
        modelUsed: analysisData?.model || "Gemini Vision + IS-Net",
        detectedName: analysisData?.gemini_analysis?.furniture_name || undefined,
      };
    } catch (neuralErr) {
      console.warn("Neural client cutout fallback to backend pixel matte:", neuralErr);
    }
  }

  // Fallback: Backend Gemini Vision + Pixel Flood-Fill & Alpha Matting (juga dipakai bila CORS URL eksternal memblokir blob)
  const fd = new FormData();
  if (file) {
    fd.append("image", file);
  } else if (rawBlob) {
    fd.append("image", rawBlob, `${cleanStem}.jpg`);
  } else if (imageUrl) {
    fd.append("image", imageUrl);
  } else {
    throw new Error("Tidak ada gambar yang dapat diproses.");
  }
  fd.append("action", "remove_bg");
  if (itemId) {
    fd.append("item_id", String(itemId));
  }

  const res = await api.post("/admin/items/gemini-process", fd);
  if (!res.data?.success || (!res.data?.base64 && !res.data?.url)) {
    throw new Error(res.data?.message || "Gagal menghapus background foto.");
  }

  const outSrc = res.data.base64 || res.data.url;
  const fetchOut = await fetch(outSrc);
  const outBlob = await fetchOut.blob();
  const cleanFile = new File([outBlob], `${cleanStem}-gemini-nobg.png`, { type: "image/png" });

  return {
    blob: outBlob,
    file: cleanFile,
    url: URL.createObjectURL(cleanFile),
    engine: "gemini-pixel-matte",
    modelUsed: res.data?.model || "Gemini Vision Matte",
    detectedName: res.data?.gemini_analysis?.furniture_name || undefined,
  };
}
