// Ikon SVG inline (tanpa dependensi). Kotak 24x24, garis 1.7.
import type { C4Kind } from "@/lib/c4/types";

const P: Record<string, string> = {
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.6 3.1-6 7-6s7 2.4 7 6",
  system: "M3 5h18v11H3zM8 20h8M12 16v4",
  container: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  datastore: "M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Zm0 0v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3",
  component: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7",
  table: "M3 5h18v14H3zM3 10h18M3 15h18M9 5v14",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 3-4.5-4.5",
  sync: "M20 11a8 8 0 0 0-14.5-4M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeoff: "M3 3l18 18M10.6 6.2A9.6 9.6 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.5 7.6A16.6 16.6 0 0 0 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.8-.8M9.9 9.9a3 3 0 0 0 4.2 4.2",
  link: "M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1",
  focus: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2v4M12 18v4M2 12h4M18 12h4",
  drill: "M5 12h14M13 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  upload: "M12 16V5M7 9l5-5 5 5M5 20h14",
  reset: "M4 4v6h6M4.5 10A8 8 0 1 1 6 17",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
  alert: "M12 4l10 17H2zM12 10v5M12 18v.5",
  check: "M5 12.5l4.5 4.5L19 7",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  history: "M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5M12 8v4l3 2",
  chevron: "M9 6l6 6-6 6",
  filter: "M3 5h18l-7 8v6l-4 2v-8z",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  diagram: "M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.3-.9-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2.6l-2 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.2-1.3l2.3.9 2-3.4-2-1.5c.1-.4.1-.9.1-1.3Z",
  shield: "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z",
  back: "M10 6l-6 6 6 6M4 12h16",
  copy: "M9 9h11v11H9zM5 15V4h11",
  hand: "M9 11V5a1.5 1.5 0 0 1 3 0v5m0-1V4a1.5 1.5 0 0 1 3 0v6m0-3a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-3-5a1.5 1.5 0 0 1 2.5-1.5L9 15",
};

export type IconName = keyof typeof P | C4Kind;

export function Icon({ name, size = 16, className, strokeWidth = 1.7 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const d = P[name] ?? P.component;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Path ikon mentah, dipakai di dalam <svg> kanvas. */
export const iconPath = (name: string) => P[name] ?? P.component;
