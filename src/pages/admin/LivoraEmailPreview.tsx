import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Monitor, Smartphone, RefreshCw, AlertCircle } from "lucide-react";

export interface CampaignPreviewPayload {
  section_label: string;
  headline: string;
  body: string;
  hero_image?: string | null;
  hero_image_alt?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  signature: string;
}

interface Props {
  payload: CampaignPreviewPayload;
}

/**
 * Fetches the exact HTML rendered server-side from the real Blade email view
 * so the live preview stays 100% faithful to what customers receive.
 */
export default function LivoraEmailPreview({ payload }: Props) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serialized = JSON.stringify(payload);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.post("/admin/marketing/preview", payload, { responseType: "text" });
      setHtml(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Gagal memuat pratinjau email.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPreview();
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchPreview]);

  const frameWidth = device === "desktop" ? 680 : 375;

  return (
    <div className="rounded-xl border border-[#EAE4DA] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#5E93B8]">
          Pratinjau Email {loading && "· memperbarui…"}
        </span>
        <div className="inline-flex overflow-hidden rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
              device === "desktop" ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
            }`}
          >
            <Monitor size={13} /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
              device === "mobile" ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
            }`}
          >
            <Smartphone size={13} /> Ponsel
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <span className="inline-flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={fetchPreview}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
          >
            <RefreshCw className="h-3 w-3" /> Muat Ulang
          </button>
        </div>
      )}

      <div className="flex w-full justify-center overflow-x-auto rounded-lg bg-[#EDE8DF] py-6">
        {html ? (
          <iframe
            title="livora-email-preview"
            srcDoc={html}
            width={frameWidth}
            style={{ width: frameWidth, height: 860, border: "none", background: "transparent" }}
          />
        ) : (
          <div
            style={{ width: frameWidth, height: 520 }}
            className="flex items-center justify-center px-6 text-center text-sm text-[#656B73]"
          >
            {loading ? "Memuat pratinjau email…" : "Isi judul utama dan teks pesan untuk melihat pratinjau email."}
          </div>
        )}
      </div>
    </div>
  );
}
