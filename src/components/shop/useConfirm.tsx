import { useCallback, useRef, useState } from "react";

type Ask = { title: string; text?: string; confirmLabel?: string; inputLabel?: string; danger?: boolean };

/** Pengganti confirm()/prompt() bawaan browser, bergaya Livora. Resolve: string (isi input) | true | null (batal). */
export function useConfirm() {
  const [cfg, setCfg] = useState<Ask | null>(null);
  const [val, setVal] = useState("");
  const resolver = useRef<(v: string | true | null) => void>();

  const ask = useCallback((c: Ask) => {
    setVal("");
    setCfg(c);
    return new Promise<string | true | null>((res) => { resolver.current = res; });
  }, []);

  const close = (v: string | true | null) => { resolver.current?.(v); setCfg(null); };

  const node = cfg ? (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title"
      onKeyDown={(e) => e.key === "Escape" && close(null)}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-medium">{cfg.title}</h2>
        {cfg.text && <p className="mt-2 text-sm text-muted-foreground">{cfg.text}</p>}
        {cfg.inputLabel && (
          <textarea autoFocus value={val} onChange={(e) => setVal(e.target.value)} rows={3} aria-label={cfg.inputLabel} placeholder={cfg.inputLabel}
            className="mt-4 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-foreground" />
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => close(null)} className="h-11 flex-1 rounded-full border border-border text-sm">Kembali</button>
          <button type="button" disabled={!!cfg.inputLabel && !val.trim()} onClick={() => close(cfg.inputLabel ? val.trim() : true)}
            className={`h-11 flex-1 rounded-full text-sm font-medium disabled:opacity-40 ${cfg.danger ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background"}`}>
            {cfg.confirmLabel ?? "Ya, lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { ask, node };
}
