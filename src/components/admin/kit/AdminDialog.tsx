import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  text?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Aksi berisiko/ireversibel → tombol merah + ikon peringatan. */
  danger?: boolean;
};

export type PromptOptions = ConfirmOptions & {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  /** Wajib diisi sebelum bisa lanjut (default true). */
  required?: boolean;
  multiline?: boolean;
};

type Active =
  | ({ kind: "confirm" } & ConfirmOptions)
  | ({ kind: "prompt" } & PromptOptions);

type Ctx = {
  /** true jika dikonfirmasi, false jika dibatalkan. */
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  /** Teks isian, atau null jika dibatalkan. */
  prompt: (o: PromptOptions) => Promise<string | null>;
  /** Kompatibel dengan useConfirm lama: string | true | null. */
  ask: (o: ConfirmOptions & { inputLabel?: string }) => Promise<string | true | null>;
};

const DialogCtx = createContext<Ctx | null>(null);

export function useAdminDialog(): Ctx {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error("useAdminDialog harus dipakai di dalam <AdminDialogProvider>");
  return ctx;
}

/**
 * Pengganti window.confirm/prompt/alert untuk seluruh panel admin.
 * Berbasis Radix AlertDialog: focus-trap, Esc untuk batal, animasi, dan bisa dibaca screen reader.
 */
export function AdminDialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<((v: string | boolean | null) => void) | null>(null);

  const open = useCallback((a: Active, initial = "") => {
    // Jika ada dialog lain yang masih terbuka, anggap dibatalkan.
    resolver.current?.(a.kind === "confirm" ? false : null);
    setValue(initial);
    setActive(a);
    return new Promise<string | boolean | null>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = useCallback((v: string | boolean | null) => {
    const r = resolver.current;
    resolver.current = null;
    setActive(null);
    r?.(v);
  }, []);

  const api = useMemo<Ctx>(
    () => ({
      confirm: (o) => open({ kind: "confirm", ...o }).then((v) => v === true),
      prompt: (o) => open({ kind: "prompt", ...o }, o.defaultValue ?? "").then((v) => (typeof v === "string" ? v : null)),
      ask: async ({ inputLabel, ...o }) => {
        if (inputLabel) {
          const v = await open({ kind: "prompt", label: inputLabel, ...o }).then((x) => (typeof x === "string" ? x : null));
          return v;
        }
        const ok = await open({ kind: "confirm", ...o });
        return ok === true ? true : null;
      },
    }),
    [open],
  );

  const isPrompt = active?.kind === "prompt";
  const required = isPrompt ? (active as PromptOptions).required !== false : false;
  const canSubmit = !isPrompt || !required || value.trim().length > 0;

  return (
    <DialogCtx.Provider value={api}>
      {children}
      <AlertDialog
        open={!!active}
        onOpenChange={(o) => {
          if (!o && active) finish(active.kind === "confirm" ? false : null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {active?.danger && <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />}
              <span className="serif text-xl font-normal">{active?.title}</span>
            </AlertDialogTitle>
            {active?.text ? (
              <AlertDialogDescription asChild>
                <div className="text-sm text-muted-foreground">{active.text}</div>
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>

          {isPrompt && (
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">{(active as PromptOptions).label}</span>
              {(active as PromptOptions).multiline === false ? (
                <input
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) finish(value.trim());
                  }}
                  placeholder={(active as PromptOptions).placeholder}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-foreground"
                />
              ) : (
                <textarea
                  autoFocus
                  rows={3}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={(active as PromptOptions).placeholder}
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none transition-colors focus:border-foreground"
                />
              )}
            </label>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>{active?.cancelLabel ?? "Batal"}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canSubmit}
              onClick={(e) => {
                e.preventDefault();
                if (!canSubmit || !active) return;
                finish(active.kind === "prompt" ? value.trim() : true);
              }}
              className={cn(active?.danger && buttonVariants({ variant: "destructive" }))}
            >
              {active?.confirmLabel ?? (active?.danger ? "Ya, lanjutkan" : "Lanjutkan")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogCtx.Provider>
  );
}
