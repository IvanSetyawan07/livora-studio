import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, Download, Copy, Check } from "lucide-react";

export const itemUrl = (slug: string) =>
  `${window.location.origin}/items/${slug}`;

interface Props {
  slug: string;
  name?: string;
  code?: string;
  size?: number;
  onClose?: () => void;
  /** render inline (no modal chrome) */
  inline?: boolean;
}

/** Generates a QR that points to the public item detail page. */
export default function ItemQRCode({ slug, name, code, size = 320, onClose, inline }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const url = itemUrl(slug);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#1c1917", light: "#ffffff" },
    }).catch(() => {});
  }, [url, size]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qr-${slug}.png`;
    a.click();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const body = (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg border border-border">
        <canvas ref={canvasRef} />
      </div>
      <div className="text-center">
        {name && <p className="font-medium">{name}</p>}
        {code && <p className="text-xs tracking-[0.2em] text-muted-foreground">{code}</p>}
        <p className="text-xs text-muted-foreground break-all mt-1">{url}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={download}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.15em] bg-foreground text-background rounded"
        >
          <Download className="w-3.5 h-3.5" /> Download PNG
        </button>
        <button
          onClick={copy}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.15em] border border-border rounded"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );

  if (inline) return body;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl p-6 max-w-sm w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 hover:bg-muted rounded">
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-sm uppercase tracking-[0.2em] mb-4 text-center">QR Identity</h3>
        {body}
      </div>
    </div>
  );
}
