import { RefreshCw } from "lucide-react";
import { Panel } from "./primitives";

/**
 * Satu pola error yang sama untuk semua halaman AI Marketing: pesan jujur +
 * tombol coba lagi. Sebelumnya sebagian halaman tidak punya `.catch()` sama
 * sekali, jadi satu fetch gagal berarti skeleton loader nyangkut selamanya.
 */
export function QueryError({
  message = "Data tidak bisa dimuat dari server.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Panel className="flex flex-col items-center gap-3 p-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-accent"
        >
          <RefreshCw className="size-3.5" />
          Coba lagi
        </button>
      ) : null}
    </Panel>
  );
}
