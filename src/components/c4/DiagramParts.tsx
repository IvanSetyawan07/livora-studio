// Bagian-bagian gambar di kanvas: node (kartu), edge (garis patah bercahaya), boundary domain.
import { memo } from "react";
import { iconPath } from "./icons";
import type { C4Element, C4RelKind, ViewEdge } from "@/lib/c4/types";
import type { Rect, RoutedEdge } from "@/lib/c4/layout";
import { TABLE_PREVIEW_ROWS } from "@/lib/c4/layout";

export type Fx = "full" | "lite" | "off";
export type Emphasis = "normal" | "hl" | "dim" | "sel";

/** Pola garis per jenis relasi. `len` = jumlah pola → animasi mengalir tanpa putus. */
export const DASH: Record<C4RelKind | "mixed", { a: string; len: number; rev?: boolean; cap?: "round" | "butt" }> = {
  uses: { a: "9 6", len: 15 },
  calls: { a: "15 6", len: 21 },
  data: { a: "2 6", len: 8, cap: "round" },
  fk: { a: "6 4 1 4", len: 15 },
  external: { a: "16 5 2 5", len: 28 },
  inbound: { a: "9 6", len: 15, rev: true },
  schedules: { a: "1 9", len: 10, cap: "round" },
  mixed: { a: "12 5 3 5", len: 25 },
};

export const KIND_LABEL: Record<string, string> = {
  person: "PENGGUNA",
  system: "SISTEM",
  external: "EKSTERNAL",
  container: "CONTAINER",
  datastore: "DATASTORE",
  component: "KOMPONEN",
  table: "TABEL",
};

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s);

export function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!w) continue;
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) out.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars - 1) + "…" : w;
      if (out.length === maxLines) break;
    } else cur = (cur + " " + w).trim();
  }
  if (out.length < maxLines && cur) out.push(cur);
  if (out.length === maxLines && words.join(" ").length > out.join(" ").length + 1) out[maxLines - 1] = clip(out[maxLines - 1] + "…", maxChars);
  return out.slice(0, maxLines);
}

interface NodeProps {
  el: C4Element;
  rect: Rect;
  color: string;
  emphasis: Emphasis;
  context: boolean;
  drillable: boolean;
  detail: boolean; // zoom cukup besar untuk menampilkan isi
  fx: Fx;
  hovered: boolean;
  selected: boolean;
  dragging: boolean;
  dimByFilter: boolean;
}

function NodeViewImpl({ el, rect, color, emphasis, context, drillable, detail, fx, hovered, selected, dragging }: NodeProps) {
  const { w, h } = rect;
  const isTable = el.kind === "table";
  const cols: { name: string; type: string; pk?: boolean; fk?: unknown }[] = isTable && Array.isArray(el.meta?.columns) ? el.meta.columns : [];
  const maxName = Math.floor((w - 28) / 7.3);
  const cls = ["c4-node", `c4-node--${el.kind}`, emphasis !== "normal" && `is-${emphasis}`, context && "is-context", hovered && "is-hover", selected && "is-selected", dragging && "is-drag", el.state === "stale" && "is-stale", el.hidden && "is-hidden", fx === "full" && "fx"]
    .filter(Boolean)
    .join(" ");
  const descLines = !isTable && detail ? wrap(el.description ?? "", Math.floor((w - 24) / 5.9), Math.max(1, Math.min(4, Math.floor((h - 86) / 14)))) : [];

  return (
    <g className={cls} transform={`translate(${rect.x} ${rect.y})`} data-key={el.key} data-kind={el.kind} style={{ "--c": color } as React.CSSProperties}>
      <rect className="c4-node__halo" x={-3} y={-3} width={w + 6} height={h + 6} rx={2} />
      <rect className="c4-node__body" width={w} height={h} rx={2} />
      <rect className="c4-node__tint" width={w} height={h} rx={2} />
      <rect className="c4-node__band" width={w} height={26} rx={2} />
      <rect className="c4-node__rail" width={3} height={h} />
      {/* siku sudut — kesan teknis */}
      <path className="c4-node__corner" d={`M-4 8V-4H8 M${w - 8} -4H${w + 4}V8 M${w + 4} ${h - 8}V${h + 4}H${w - 8} M8 ${h + 4}H-4V${h - 8}`} />
      {selected && <rect className="c4-node__ring" x={-7} y={-7} width={w + 14} height={h + 14} rx={3} />}

      <g transform="translate(10 5) scale(0.68)" className="c4-node__icon">
        <path d={iconPath(el.kind)} fill="none" strokeWidth={2.2} strokeLinecap="square" />
      </g>
      <text className="c4-node__kind" x={30} y={17}>
        {KIND_LABEL[el.kind] ?? el.kind}
        {el.kind === "component" && el.meta?.layer ? ` · ${String(el.meta.layer).toUpperCase()}` : ""}
      </text>
      <g className="c4-node__badges" transform={`translate(${w - 8} 8)`}>
        {drillable && (
          <text className="c4-node__chev" x={0} y={9} textAnchor="end">
            ▸
          </text>
        )}
        {el.source === "manual" && (
          <text className="c4-node__tag c4-node__tag--manual" x={drillable ? -14 : 0} y={9} textAnchor="end">
            MANUAL
          </text>
        )}
        {el.state === "stale" && (
          <text className="c4-node__tag c4-node__tag--stale" x={drillable ? -14 : 0} y={9} textAnchor="end">
            BASI
          </text>
        )}
        {el.hidden && (
          <text className="c4-node__tag" x={drillable ? -14 : 0} y={9} textAnchor="end">
            TERSEMBUNYI
          </text>
        )}
      </g>

      <text className="c4-node__name" x={13} y={isTable ? 44 : 49}>
        {clip(el.name, maxName)}
      </text>
      {el.overridden.length > 0 && <circle className="c4-node__dot" cx={w - 10} cy={isTable ? 40 : 45} r={3} />}
      {!isTable && el.technology && (
        <text className="c4-node__tech" x={13} y={65}>
          {clip(el.technology, Math.floor((w - 26) / 6.1))}
        </text>
      )}
      {descLines.map((l, i) => (
        <text key={i} className="c4-node__desc" x={13} y={86 + i * 14}>
          {l}
        </text>
      ))}

      {isTable && detail && (
        <g className="c4-node__cols">
          {cols.slice(0, TABLE_PREVIEW_ROWS).map((c, i) => (
            <g key={c.name} transform={`translate(0 ${58 + i * 18})`}>
              <text className={`c4-col__name${c.pk ? " is-pk" : ""}${c.fk ? " is-fk" : ""}`} x={13} y={0}>
                {c.pk ? "◆ " : c.fk ? "↗ " : "  "}
                {clip(c.name, 22)}
              </text>
              <text className="c4-col__type" x={w - 10} y={0} textAnchor="end">
                {clip(String(c.type), 11)}
              </text>
            </g>
          ))}
          {cols.length > TABLE_PREVIEW_ROWS && (
            <text className="c4-col__more" x={13} y={58 + TABLE_PREVIEW_ROWS * 18 + 6}>
              +{cols.length - TABLE_PREVIEW_ROWS} kolom lagi
            </text>
          )}
        </g>
      )}
    </g>
  );
}
export const NodeView = memo(NodeViewImpl);

interface EdgeProps {
  edge: ViewEdge;
  routed: RoutedEdge;
  color: string;
  emphasis: Emphasis;
  fx: Fx;
  showLabel: boolean;
  selected: boolean;
}

/** Segitiga panah di ujung garis, mengikuti arah segmen terakhir. */
function arrow(pts: { x: number; y: number }[]): string {
  const b = pts[pts.length - 1];
  const a = pts[pts.length - 2] ?? b;
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  const s = 7;
  if (dx !== 0) return `${b.x},${b.y} ${b.x - dx * s * 1.5},${b.y - s * 0.8} ${b.x - dx * s * 1.5},${b.y + s * 0.8}`;
  return `${b.x},${b.y} ${b.x - s * 0.8},${b.y - dy * s * 1.5} ${b.x + s * 0.8},${b.y - dy * s * 1.5}`;
}

function EdgeViewImpl({ edge, routed, color, emphasis, fx, showLabel, selected }: EdgeProps) {
  const dash = DASH[edge.kind] ?? DASH.uses;
  const hot = emphasis === "hl" || emphasis === "sel";
  const animate = fx !== "off" && (fx === "full" || hot);
  const glow = fx !== "off" && (fx === "full" || hot);
  const width = Math.min(3.2, 1.4 + Math.log2(Math.max(1, edge.weight)) * 0.32) + (hot ? 0.5 : 0);
  const dur = Math.max(0.35, dash.len / 42);
  const pulse = fx === "full" && (hot || emphasis === "normal") && routed.length > 60;
  const label = edge.label.length > 38 ? edge.label.slice(0, 37) + "…" : edge.label;
  return (
    <g className={`c4-edge c4-edge--${edge.kind} is-${emphasis}${selected ? " is-selected" : ""}`} data-edge={edge.id} style={{ "--c": color } as React.CSSProperties}>
      {glow && <path className="c4-edge__glow" d={routed.d} strokeWidth={width + 5} />}
      <path
        className={`c4-edge__line${animate ? " is-flowing" : ""}`}
        d={routed.d}
        strokeWidth={width}
        strokeDasharray={dash.a}
        strokeLinecap={dash.cap ?? "butt"}
        style={{ "--dl": `${dash.rev ? dash.len : -dash.len}px`, animationDuration: `${dur}s` } as React.CSSProperties}
      />
      <polygon className="c4-edge__arrow" points={arrow(routed.points)} />
      {pulse && (
        <circle className="c4-edge__pulse" r={hot ? 3.4 : 2.4}>
          <animateMotion dur={`${Math.max(2.4, routed.length / 110)}s`} repeatCount="indefinite" path={routed.d} rotate="auto" />
        </circle>
      )}
      {showLabel && (
        <g className="c4-edge__label" transform={`translate(${routed.lx} ${routed.ly})`}>
          <rect x={-label.length * 3.1 - 6} y={-9} width={label.length * 6.2 + 12} height={17} rx={2} />
          <text textAnchor="middle" y={3.5}>
            {label}
          </text>
        </g>
      )}
      {/* area klik lebar */}
      <path className="c4-edge__hit" d={routed.d} />
    </g>
  );
}
export const EdgeView = memo(EdgeViewImpl);

export const Boundary = memo(function Boundary({ rect, color, name, count, dim, overview, k }: { rect: Rect; color: string; name: string; count: number; dim: boolean; overview?: boolean; k?: number }) {
  // pada zoom jauh, nama domain dibesarkan dan diletakkan di atas kotak agar terbaca sebagai "peta"
  const s = overview && k ? Math.min(14, 0.7 / k) : 1;
  return (
    <g className={`c4-boundary${dim ? " is-dim" : ""}${overview ? " is-overview" : ""}`} style={{ "--c": color } as React.CSSProperties}>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={4} />
      <path d={`M${rect.x} ${rect.y + 22}V${rect.y}H${rect.x + 22}`} className="c4-boundary__corner" />
      <text x={rect.x + (overview ? 0 : 16)} y={overview ? rect.y - 14 : rect.y + 26} style={overview ? { fontSize: 13 * s } : undefined}>
        {name.toUpperCase()}
      </text>
      {!overview && (
        <text className="c4-boundary__count" x={rect.x + rect.w - 16} y={rect.y + 26} textAnchor="end">
          {count} elemen
        </text>
      )}
    </g>
  );
});
