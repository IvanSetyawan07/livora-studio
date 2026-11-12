import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nilai yang baru berubah setelah `delay` ms tanpa perubahan — mencegah request per ketukan. */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Input pencarian dengan debounce + tombol hapus.
 * `onSearch` hanya dipanggil setelah pengguna berhenti mengetik.
 */
export function DebouncedSearchInput({
  value,
  onSearch,
  placeholder = "Cari…",
  delay = 350,
  className,
  "aria-label": ariaLabel,
}: {
  value?: string;
  onSearch: (q: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(value ?? "");
  const debounced = useDebouncedValue(text, delay);

  useEffect(() => {
    if (debounced !== (value ?? "")) onSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Sinkron jika nilai di-reset dari luar.
  useEffect(() => {
    if (value !== undefined && value !== text && value === "") setText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className={cn("group relative block", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:ring-2 focus:ring-foreground/5"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText("");
            onSearch("");
          }}
          aria-label="Hapus pencarian"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
  );
}
