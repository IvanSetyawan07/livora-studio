import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Monitor, Smartphone } from "lucide-react";

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
 * Fetches the exact HTML that will be sent (rendered server-side from the
 * same Blade view used by the real email) and displays it in an iframe.
 * There is no separate React re-implementation of the design to drift out
 * of sync with the actual email.
 */
export default function LivoraEmailPreview({ payload }: Props) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api
        .post("/admin/marketing/preview", payload, { responseType: "text" })
        .then((r) => setHtml(r.data))
        .catch(() => {
          /* keep last good preview on transient errors */
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload)]);

  const frameWidth = device === "desktop" ? 680 : 375;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="uppercase tracking-[0.2em] text-xs text-muted-foreground">
          Email Preview {loading && "· updating…"}
        </span>
        <div className="flex items-center gap-1 text-xs border border-border rounded overflow-hidden">
          <button
            onClick={() => setDevice("desktop")}
            className={`flex items-center gap-1.5 px-3 py-1 ${device === "desktop" ? "bg-foreground text-background" : ""}`}
          >
            <Monitor size={13} /> Desktop
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1 ${device === "mobile" ? "bg-foreground text-background" : ""}`}
          >
            <Smartphone size={13} /> Mobile
          </button>
        </div>
      </div>

      <div className="w-full flex justify-center bg-[#EDE8DF] rounded-md py-6 overflow-x-auto">
        {html ? (
          <iframe
            title="livora-email-preview"
            srcDoc={html}
            width={frameWidth}
            style={{ width: frameWidth, height: 900, border: "none", background: "transparent" }}
          />
        ) : (
          <div style={{ width: frameWidth, height: 900 }} className="flex items-center justify-center text-sm text-muted-foreground">
            {loading ? "Loading preview…" : "Fill in headline and body to see a preview."}
          </div>
        )}
      </div>
    </div>
  );
}