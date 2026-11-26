import { useEffect, useRef, useState } from "react";
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
  const lastEmitted = useRef(value ?? "");

  useEffect(() => {
    if (debounced !== lastEmitted.current) {
      lastEmitted.current = debounced;
      onSearch(debounced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Sinkron penuh ketika nilai diubah dari luar (reset, pilih preset, ubah URL, dll).
  useEffect(() => {
    if (value !== undefined && value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value);
    }
  }, [value]);

  return (
    <label className={cn("group relative block", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#656B73] transition-colors group-focus-within:text-[#232528]" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-10 w-full rounded-lg border border-[#E5DFD5] bg-white pl-9 pr-9 text-sm text-[#232528] outline-none transition-all placeholder:text-[#656B73]/70 focus:border-[#5E93B8] focus:ring-2 focus:ring-[#5E93B8]/15"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            lastEmitted.current = "";
            setText("");
            onSearch("");
          }}
          aria-label="Hapus pencarian"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#656B73] hover:text-[#232528]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
  );
}
