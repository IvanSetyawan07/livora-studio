// Geometri diagram: ukuran node, tata letak otomatis, dan routing garis patah (orthogonal).
// Murni TypeScript tanpa DOM — mudah diuji.

import type { C4Element, C4ViewModel, ViewEdge, ViewNode } from "./types";

export interface Pt {
  x: number;
  y: number;
}
export interface Rect extends Pt {
  w: number;
  h: number;
}
export type Side = "top" | "right" | "bottom" | "left";

export const TABLE_PREVIEW_ROWS = 7;

export function nodeSize(e: C4Element): { w: number; h: number } {
  switch (e.kind) {
    case "person":
      return { w: 236, h: 118 };
    case "system":
      return { w: 310, h: 160 };
    case "container":
    case "datastore":
      return { w: 310, h: 164 };
    case "external":
      return { w: 256, h: 128 };
    case "table": {
      const total = Array.isArray(e.meta?.columns) ? e.meta.columns.length : 0;
      const rows = Math.min(TABLE_PREVIEW_ROWS, total);
      return { w: 256, h: 54 + rows * 18 + (total > TABLE_PREVIEW_ROWS ? 24 : 10) };
    }
    default:
      return { w: 276, h: 138 };
  }
}

const KIND_RANK: Record<string, number> = { person: 0, system: 1, container: 2, datastore: 3, component: 4, table: 5, external: 6 };

// ───────────────────────── tata letak ─────────────────────────

function layered(nodes: ViewNode[], edges: ViewEdge[]): Map<string, Pt> {
  const keys = nodes.map((n) => n.key);
  const idx = new Map(keys.map((k, i) => [k, i]));
  const out: number[][] = keys.map(() => []);
  const inc: number[][] = keys.map(() => []);

  // buang sisi balik (siklus) lewat DFS iteratif
  const color = new Array(keys.length).fill(0);
  const adj: number[][] = keys.map(() => []);
  for (const e of edges) {
    const a = idx.get(e.from);
    const b = idx.get(e.to);
    if (a !== undefined && b !== undefined && a !== b) adj[a].push(b);
  }
  const back = new Set<string>();
  for (let s = 0; s < keys.length; s++) {
    if (color[s]) continue;
    const stack: [number, number][] = [[s, 0]];
    color[s] = 1;
    while (stack.length) {
      const top = stack[stack.length - 1];
      const [u, i] = top;
      if (i < adj[u].length) {
        top[1]++;
        const v = adj[u][i];
        if (color[v] === 0) {
          color[v] = 1;
          stack.push([v, 0]);
        } else if (color[v] === 1) back.add(`${u}>${v}`);
      } else {
        color[u] = 2;
        stack.pop();
      }
    }
  }
  for (let u = 0; u < keys.length; u++)
    for (const v of adj[u]) {
      if (back.has(`${u}>${v}`)) continue;
      if (!out[u].includes(v)) {
        out[u].push(v);
        inc[v].push(u);
      }
    }

  // layer = jalur terpanjang dari sumber
  const layer = new Array(keys.length).fill(0);
  const indeg = inc.map((a) => a.length);
  const queue = indeg.map((d, i) => (d === 0 ? i : -1)).filter((i) => i >= 0);
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of out[u]) {
      layer[v] = Math.max(layer[v], layer[u] + 1);
      if (--indeg[v] === 0) queue.push(v);
    }
  }
  nodes.forEach((n, i) => {
    if (n.element.kind === "person") layer[i] = 0;
  });

  const maxLayer = Math.max(0, ...layer);
  const rows: number[][] = Array.from({ length: maxLayer + 1 }, () => []);
  layer.forEach((l, i) => rows[l].push(i));
  const rank = (i: number) => KIND_RANK[nodes[i].element.kind] ?? 9;
  rows.forEach((r) => r.sort((a, b) => rank(a) - rank(b) || nodes[a].element.name.localeCompare(nodes[b].element.name)));

  const order = new Array(keys.length).fill(0);
  const reindex = () => rows.forEach((r) => r.forEach((n, p) => (order[n] = p)));
  reindex();
  const bary = (i: number, nb: number[]) => (nb.length ? nb.reduce((s, j) => s + order[j], 0) / nb.length : order[i]);
  for (let pass = 0; pass < 4; pass++) {
    const seq = pass % 2 === 0 ? rows.map((_, i) => i) : rows.map((_, i) => rows.length - 1 - i);
    for (const li of seq) {
      rows[li].sort((a, b) => bary(a, pass % 2 === 0 ? inc[a] : out[a]) - bary(b, pass % 2 === 0 ? inc[b] : out[b]));
      rows[li].forEach((n, p) => (order[n] = p));
    }
  }

  const GAP_X = 90;
  const GAP_Y = 130;
  const MAX_PER_ROW = 6;
  const pos = new Map<string, Pt>();
  let y = 0;
  for (const full of rows) {
    // baris terlalu panjang dipecah agar diagram tidak melebar tak terbaca
    const chunks: number[][] = [];
    for (let i = 0; i < full.length; i += MAX_PER_ROW) chunks.push(full.slice(i, i + MAX_PER_ROW));
    chunks.forEach((r, ci) => {
      if (!r.length) return;
      const sizes = r.map((i) => nodeSize(nodes[i].element));
      const total = sizes.reduce((s, z) => s + z.w, 0) + GAP_X * (r.length - 1);
      let x = -total / 2;
      r.forEach((i, p) => {
        pos.set(nodes[i].key, { x, y });
        x += sizes[p].w + GAP_X;
      });
      y += Math.max(...sizes.map((z) => z.h)) + (ci < chunks.length - 1 ? 64 : GAP_Y);
    });
  }
  return pos;
}

function cluster(nodes: ViewNode[], domainOrder: string[]): Map<string, Pt> {
  const groups = new Map<string, ViewNode[]>();
  for (const n of nodes) {
    const g = n.context ? "__context" : (n.element.domain_key ?? "core");
    (groups.get(g) ?? groups.set(g, []).get(g)!).push(n);
  }
  const order = ["__context", ...domainOrder.filter((d) => groups.has(d)), ...[...groups.keys()].filter((g) => g !== "__context" && !domainOrder.includes(g))];

  type Box = { key: string; w: number; h: number; items: { n: ViewNode; x: number; y: number }[] };
  const boxes: Box[] = [];
  for (const g of order) {
    const list = (groups.get(g) ?? []).slice().sort((a, b) => (KIND_RANK[a.element.kind] ?? 9) - (KIND_RANK[b.element.kind] ?? 9) || a.element.name.localeCompare(b.element.name));
    if (!list.length) continue;
    const cols = Math.max(1, Math.min(g === "__context" ? 8 : 8, Math.round(Math.sqrt(list.length * 1.6))));
    const sizes = list.map((n) => nodeSize(n.element));
    const cw = Math.max(...sizes.map((s) => s.w)) + 46;
    const rowsN = Math.ceil(list.length / cols);
    const rowH: number[] = [];
    for (let r = 0; r < rowsN; r++) rowH.push(Math.max(...sizes.slice(r * cols, r * cols + cols).map((s) => s.h)) + 38);
    const items = list.map((n, i) => {
      const r = Math.floor(i / cols);
      return { n, x: 44 + (i % cols) * cw, y: 78 + rowH.slice(0, r).reduce((a, b) => a + b, 0) };
    });
    boxes.push({ key: g, w: cols * cw + 44, h: 78 + rowH.reduce((a, b) => a + b, 0) + 24, items });
  }

  const area = boxes.reduce((s, b) => s + b.w * b.h, 0);
  const maxRow = Math.max(2400, Math.sqrt(area) * 1.9);
  const pos = new Map<string, Pt>();
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const b of boxes) {
    if (x > 0 && x + b.w > maxRow) {
      x = 0;
      y += rowH + 110;
      rowH = 0;
    }
    for (const it of b.items) pos.set(it.n.key, { x: x + it.x, y: y + it.y });
    x += b.w + 110;
    rowH = Math.max(rowH, b.h);
  }
  return pos;
}

function focus(nodes: ViewNode[], edges: ViewEdge[], scope: string): Map<string, Pt> {
  const pos = new Map<string, Pt>();
  const center = nodes.find((n) => n.key === scope);
  if (!center) return cluster(nodes, []);
  const cs = nodeSize(center.element);
  pos.set(scope, { x: -cs.w / 2, y: -cs.h / 2 });
  const outSet = new Set<string>();
  const inSet = new Set<string>();
  for (const e of edges) {
    if (e.from === scope) outSet.add(e.to);
    else if (e.to === scope) inSet.add(e.from);
  }
  for (const k of outSet) inSet.delete(k);
  const place = (keys: string[], dir: 1 | -1) => {
    const list = keys
      .map((k) => nodes.find((n) => n.key === k)!)
      .filter(Boolean)
      .sort((a, b) => (a.element.domain_key ?? "").localeCompare(b.element.domain_key ?? "") || a.element.name.localeCompare(b.element.name));
    const perCol = 11;
    const colCount = Math.max(1, Math.ceil(list.length / perCol));
    for (let c = 0; c < colCount; c++) {
      const part = list.slice(c * perCol, c * perCol + perCol);
      const sizes = part.map((n) => nodeSize(n.element));
      const total = sizes.reduce((s, z) => s + z.h, 0) + 30 * (part.length - 1);
      let y = -total / 2;
      const maxW = Math.max(...sizes.map((z) => z.w), 200);
      part.forEach((n, i) => {
        const x = dir === 1 ? cs.w / 2 + 170 + c * (maxW + 70) : -cs.w / 2 - 170 - maxW - c * (maxW + 70);
        pos.set(n.key, { x, y });
        y += sizes[i].h + 30;
      });
    }
  };
  place([...outSet], 1);
  place([...inSet], -1);
  return pos;
}

export function autoLayout(view: C4ViewModel, domainOrder: string[]): Map<string, Pt> {
  if (view.key.startsWith("F:")) return focus(view.nodes, view.edges, view.key.slice(2));
  if (view.nodes.length <= 26) return layered(view.nodes, view.edges);
  return cluster(view.nodes, domainOrder);
}

// ───────────────────────── routing garis patah ─────────────────────────

export interface RoutedEdge {
  id: string;
  d: string;
  /** titik label (tengah segmen terpanjang) */
  lx: number;
  ly: number;
  points: Pt[];
  sSide: Side;
  tSide: Side;
  length: number;
}

const DIR: Record<Side, Pt> = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } };
const horiz = (s: Side) => s === "left" || s === "right";

function sidesFor(a: Rect, b: Rect): [Side, Side] {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  const dx = (bx - ax) / (a.w / 2 + b.w / 2);
  const dy = (by - ay) / (a.h / 2 + b.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ["right", "left"] : ["left", "right"];
  return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
}

function portPoint(r: Rect, side: Side, offset: number): Pt {
  switch (side) {
    case "top":
      return { x: r.x + r.w / 2 + offset, y: r.y };
    case "bottom":
      return { x: r.x + r.w / 2 + offset, y: r.y + r.h };
    case "left":
      return { x: r.x, y: r.y + r.h / 2 + offset };
    default:
      return { x: r.x + r.w, y: r.y + r.h / 2 + offset };
  }
}

function simplify(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    out.push(p);
  }
  for (let i = out.length - 2; i > 0; i--) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    if ((Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5) || (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)) out.splice(i, 1);
  }
  return out;
}

const STUB = 26;

export function orthogonalPoints(S: Pt, sSide: Side, T: Pt, tSide: Side, lane: number): Pt[] {
  const S1 = { x: S.x + DIR[sSide].x * STUB, y: S.y + DIR[sSide].y * STUB };
  const T1 = { x: T.x + DIR[tSide].x * STUB, y: T.y + DIR[tSide].y * STUB };
  const pts: Pt[] = [S, S1];
  if (horiz(sSide) && horiz(tSide)) {
    const facing = (sSide === "right" && tSide === "left" && S1.x <= T1.x) || (sSide === "left" && tSide === "right" && S1.x >= T1.x);
    const midX = facing ? (S1.x + T1.x) / 2 + lane : (sSide === "right" ? Math.max(S1.x, T1.x) + 30 + Math.abs(lane) : Math.min(S1.x, T1.x) - 30 - Math.abs(lane));
    pts.push({ x: midX, y: S1.y }, { x: midX, y: T1.y });
  } else if (!horiz(sSide) && !horiz(tSide)) {
    const facing = (sSide === "bottom" && tSide === "top" && S1.y <= T1.y) || (sSide === "top" && tSide === "bottom" && S1.y >= T1.y);
    const midY = facing ? (S1.y + T1.y) / 2 + lane : (sSide === "bottom" ? Math.max(S1.y, T1.y) + 30 + Math.abs(lane) : Math.min(S1.y, T1.y) - 30 - Math.abs(lane));
    pts.push({ x: S1.x, y: midY }, { x: T1.x, y: midY });
  } else if (horiz(sSide)) {
    pts.push({ x: T1.x, y: S1.y });
  } else {
    pts.push({ x: S1.x, y: T1.y });
  }
  pts.push(T1, T);
  return simplify(pts);
}

function pathOf(pts: Pt[]): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`).join(" ");
}

export function routeEdges(edges: ViewEdge[], rects: Map<string, Rect>): Map<string, RoutedEdge> {
  type End = { id: string; end: "s" | "t"; other: Rect; node: string };
  const sides = new Map<string, [Side, Side]>();
  const slots = new Map<string, End[]>();
  for (const e of edges) {
    const a = rects.get(e.from);
    const b = rects.get(e.to);
    if (!a || !b) continue;
    const [sa, sb] = sidesFor(a, b);
    sides.set(e.id, [sa, sb]);
    const ka = `${e.from}|${sa}`;
    const kb = `${e.to}|${sb}`;
    (slots.get(ka) ?? slots.set(ka, []).get(ka)!).push({ id: e.id, end: "s", other: b, node: e.from });
    (slots.get(kb) ?? slots.set(kb, []).get(kb)!).push({ id: e.id, end: "t", other: a, node: e.to });
  }
  const offsets = new Map<string, number>();
  for (const [key, list] of slots) {
    const side = key.split("|")[1] as Side;
    const r = rects.get(list[0].node)!;
    const along = horiz(side) ? r.h : r.w;
    list.sort((p, q) => (horiz(side) ? p.other.y + p.other.h / 2 - (q.other.y + q.other.h / 2) : p.other.x + p.other.w / 2 - (q.other.x + q.other.w / 2)));
    const step = Math.min(20, (along * 0.74) / Math.max(1, list.length));
    list.forEach((s, i) => offsets.set(`${s.id}|${s.end}`, (i - (list.length - 1) / 2) * step));
  }

  const result = new Map<string, RoutedEdge>();
  let n = 0;
  for (const e of edges) {
    const a = rects.get(e.from);
    const b = rects.get(e.to);
    const sd = sides.get(e.id);
    if (!a || !b || !sd) continue;
    const S = portPoint(a, sd[0], offsets.get(`${e.id}|s`) ?? 0);
    const T = portPoint(b, sd[1], offsets.get(`${e.id}|t`) ?? 0);
    const lane = ((n++ % 5) - 2) * 9;
    const points = orthogonalPoints(S, sd[0], T, sd[1], lane);
    let best = 0;
    let lx = (S.x + T.x) / 2;
    let ly = (S.y + T.y) / 2;
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const len = Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
      length += len;
      if (len > best) {
        best = len;
        lx = (points[i].x + points[i - 1].x) / 2;
        ly = (points[i].y + points[i - 1].y) / 2;
      }
    }
    result.set(e.id, { id: e.id, d: pathOf(points), lx, ly, points, sSide: sd[0], tSide: sd[1], length });
  }
  return result;
}

export function boundsOf(rects: Iterable<Rect>): Rect | null {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const r of rects) {
    x1 = Math.min(x1, r.x);
    y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w);
    y2 = Math.max(y2, r.y + r.h);
  }
  return x1 === Infinity ? null : { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Kotak batas per domain (untuk boundary berwarna di level 3/4/fokus). */
export function domainBounds(nodes: ViewNode[], rects: Map<string, Rect>): { domain: string; rect: Rect; count: number }[] {
  const by = new Map<string, Rect[]>();
  for (const n of nodes) {
    if (n.context) continue;
    const r = rects.get(n.key);
    if (!r) continue;
    const d = n.element.domain_key ?? "core";
    (by.get(d) ?? by.set(d, []).get(d)!).push(r);
  }
  const out: { domain: string; rect: Rect; count: number }[] = [];
  for (const [domain, list] of by) {
    const b = boundsOf(list)!;
    out.push({ domain, count: list.length, rect: { x: b.x - 28, y: b.y - 54, w: b.w + 56, h: b.h + 82 } });
  }
  return out;
}
