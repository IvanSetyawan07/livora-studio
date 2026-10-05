import { STATUS_TONE } from "@/lib/shop";

export default function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_TONE[status] ?? "bg-muted text-foreground border-border"}`}>
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
