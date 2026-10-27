// Logika murni (tanpa React) untuk membentuk tampilan C4 dari graf lengkap.
// Prinsip C4: relasi antar elemen level bawah "naik" (roll-up) ke elemen induk
// yang tampil di level yang sedang dilihat — mis. Controller → Tabel tampil
// sebagai Backend API → Database di level 2.

import type {
  C4Domain,
  C4Element,
  C4Filters,
  C4Graph,
  C4RelKind,
  C4Relation,
  C4View,
  C4ViewModel,
  ViewEdge,
  ViewNode,
} from "./types";

export interface C4Index {
  byKey: Map<string, C4Element>;
  children: Map<string, string[]>;
  domains: Map<string, C4Domain>;
  outgoing: Map<string, C4Relation[]>;
  incoming: Map<string, C4Relation[]>;
}

export const FALLBACK_COLOR = "#94a3b8";

export function buildIndex(g: C4Graph): C4Index {
  const byKey = new Map<string, C4Element>();
  const children = new Map<string, string[]>();
  const outgoing = new Map<string, C4Relation[]>();
  const incoming = new Map<string, C4Relation[]>();
  for (const e of g.elements) byKey.set(e.key, e);
  for (const e of g.elements) {
    if (e.parent_key) {
      const arr = children.get(e.parent_key) ?? [];
      arr.push(e.key);
      children.set(e.parent_key, arr);
    }
  }
  for (const r of g.relations) {
    (outgoing.get(r.from) ?? outgoing.set(r.from, []).get(r.from)!).push(r);
    (incoming.get(r.to) ?? incoming.set(r.to, []).get(r.to)!).push(r);
  }
  return { byKey, children, domains: new Map(g.domains.map((d) => [d.key, d])), outgoing, incoming };
}

export function colorOf(e: C4Element | undefined, idx: C4Index): string {
  if (!e) return FALLBACK_COLOR;
  return e.color || idx.domains.get(e.domain_key ?? "")?.color || FALLBACK_COLOR;
}

export function domainColor(key: string | null | undefined, idx: C4Index): string {
  return idx.domains.get(key ?? "")?.color ?? FALLBACK_COLOR;
}

/** Apakah `key` sama dengan / turunan dari `scope`. */
export function isWithin(key: string, scope: string, idx: C4Index): boolean {
  let cur: string | null | undefined = key;
  let guard = 0;
  while (cur && guard++ < 12) {
    if (cur === scope) return true;
    cur = idx.byKey.get(cur)?.parent_key;
  }
  return false;
}

/** Naik lewat induk sampai menemukan elemen yang memenuhi `accept`. */
function climb(key: string, idx: C4Index, accept: (e: C4Element) => boolean): string | null {
  let cur: string | null | undefined = key;
  let guard = 0;
  while (cur && guard++ < 12) {
    const e = idx.byKey.get(cur);
    if (!e) return null;
    if (accept(e)) return e.key;
    cur = e.parent_key;
  }
  return null;
}

const isVisible = (e: C4Element, f: C4Filters) => (f.showHidden || !e.hidden) && (f.showStale || e.state === "present");
const isRelVisible = (r: C4Relation, f: C4Filters) => (f.showHidden || !r.hidden) && (f.showStale || r.state === "present");

export interface BuildOptions {
  /** Level 4: konteks dinaikkan ke container (ringkas) atau tetap komponen (rinci). */
  contextDepth: "container" | "component";
}

export function viewKeyOf(v: C4View): string {
  if (v.kind === "focus") return `F:${v.scope}`;
  return v.level <= 2 ? `L${v.level}` : `L${v.level}:${(v as { scope: string }).scope}`;
}

/** Container/elemen yang bisa dibuka ke level 3 atau 4. */
export function drillTarget(e: C4Element, idx: C4Index): C4View | null {
  const kids = (idx.children.get(e.key) ?? []).map((k) => idx.byKey.get(k)!).filter(Boolean);
  if (e.kind === "system") return { kind: "level", level: 2 };
  if (e.kind === "container" || e.kind === "datastore") {
    if (kids.some((k) => k.level === 3)) return { kind: "level", level: 3, scope: e.key };
    if (kids.some((k) => k.level === 4)) return { kind: "level", level: 4, scope: e.key };
  }
  return null;
}

export function buildView(g: C4Graph, idx: C4Index, view: C4View, filters: C4Filters, opts: BuildOptions): C4ViewModel {
  const domainOk = (e: C4Element) => !filters.domains || filters.domains.has(e.domain_key ?? "");
  const visibleEls = g.elements.filter((e) => isVisible(e, filters));
  const visibleRels = g.relations.filter((r) => isRelVisible(r, filters));
  const key = viewKeyOf(view);

  let inner: Set<string>; // node utama (bukan konteks)
  let rep: (k: string) => string | null; // endpoint → node yang tampil
  let title = "";
  let subtitle = "";
  let raw = false; // fokus: relasi tidak di-roll-up

  if (view.kind === "level" && view.level <= 2) {
    const nodeSet = new Set(
      visibleEls
        .filter((e) => (view.level === 1 ? e.level === 1 : e.level === 2 || (e.level === 1 && e.kind !== "system")))
        .map((e) => e.key),
    );
    inner = nodeSet;
    rep = (k) => climb(k, idx, (e) => nodeSet.has(e.key));
    title = view.level === 1 ? "Level 1 — Konteks Sistem" : "Level 2 — Container";
    subtitle =
      view.level === 1
        ? "Siapa memakai Livora dan sistem eksternal apa yang terhubung."
        : "Aplikasi dan penyimpanan data yang menyusun Livora.";
  } else if (view.kind === "level") {
    const scope = (view as { scope: string }).scope;
    const scopeEl = idx.byKey.get(scope);
    const lvl = view.level;
    inner = new Set(visibleEls.filter((e) => e.level === lvl && isWithin(e.key, scope, idx)).map((e) => e.key));
    const ctxLevel = lvl === 3 || opts.contextDepth === "container" ? 2 : 3;
    rep = (k) => {
      if (inner.has(k)) return k;
      if (isWithin(k, scope, idx)) return null; // turunan scope yang bukan level ini
      return climb(k, idx, (e) => e.level <= ctxLevel && e.kind !== "system");
    };
    title = `Level ${lvl} — ${lvl === 3 ? "Komponen" : "Data"}: ${scopeEl?.name ?? scope}`;
    subtitle =
      lvl === 3
        ? "Controller, service, dan komponen di dalam container ini."
        : "Tabel dan relasinya (dibaca langsung dari skema database).";
  } else {
    const scope = view.scope;
    const scopeEl = idx.byKey.get(scope);
    raw = true;
    const neighbors = new Set<string>([scope]);
    for (const r of visibleRels) {
      if (r.from === scope) neighbors.add(r.to);
      if (r.to === scope) neighbors.add(r.from);
    }
    inner = new Set([...neighbors].filter((k) => idx.byKey.has(k) && isVisible(idx.byKey.get(k)!, filters)));
    rep = (k) => (inner.has(k) ? k : null);
    title = `Fokus — ${scopeEl?.name ?? scope}`;
    subtitle = "Elemen ini dan semua yang langsung terhubung dengannya.";
  }

  // Roll-up relasi
  const agg = new Map<string, { from: string; to: string; rels: C4Relation[] }>();
  for (const r of visibleRels) {
    const a = rep(r.from);
    const b = rep(r.to);
    if (!a || !b || a === b) continue;
    if (view.kind === "focus") {
      if (a !== view.scope && b !== view.scope) continue;
    } else if (view.kind === "level" && view.level >= 3) {
      if (!inner.has(a) && !inner.has(b)) continue; // konteks ↔ konteks tidak perlu
    }
    const k = `${a}>${b}`;
    const slot = agg.get(k) ?? { from: a, to: b, rels: [] };
    slot.rels.push(r);
    agg.set(k, slot);
  }

  // Terapkan filter domain pada node utama; konteks hanya jika masih punya edge
  const edges: ViewEdge[] = [];
  const used = new Set<string>();
  for (const [k, s] of agg) {
    const ea = idx.byKey.get(s.from)!;
    const eb = idx.byKey.get(s.to)!;
    const aInner = inner.has(s.from);
    const bInner = inner.has(s.to);
    if ((aInner && !domainOk(ea) && !raw) || (bInner && !domainOk(eb) && !raw)) continue;
    const kinds = new Set(s.rels.map((x) => x.kind));
    const weight = s.rels.reduce((n, x) => n + Math.max(1, x.weight), 0);
    const byDomain = new Map<string, number>();
    for (const x of s.rels) byDomain.set(x.domain_key ?? ea.domain_key ?? "", (byDomain.get(x.domain_key ?? ea.domain_key ?? "") ?? 0) + Math.max(1, x.weight));
    const domain = [...byDomain.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? ea.domain_key;
    const single = s.rels.length === 1 ? s.rels[0] : null;
    edges.push({
      id: k,
      from: s.from,
      to: s.to,
      kind: kinds.size === 1 ? ([...kinds][0] as C4RelKind) : "mixed",
      label: single ? (single.label ?? labelOfKind(single.kind)) : `${s.rels.length} relasi`,
      weight,
      domain,
      relations: s.rels,
    });
    used.add(s.from);
    used.add(s.to);
  }

  const nodes: ViewNode[] = [];
  const seen = new Set<string>();
  const push = (k: string, context: boolean) => {
    if (seen.has(k)) return;
    const e = idx.byKey.get(k);
    if (!e) return;
    seen.add(k);
    nodes.push({ key: k, element: e, context });
  };
  for (const k of inner) {
    const e = idx.byKey.get(k)!;
    if (view.kind === "focus" || domainOk(e)) push(k, false);
  }
  for (const k of used) if (!inner.has(k)) push(k, true);
  // buang edge yang ujungnya tersaring
  const nodeKeys = new Set(nodes.map((n) => n.key));
  const finalEdges = edges.filter((e) => nodeKeys.has(e.from) && nodeKeys.has(e.to));

  return { key, title, subtitle, nodes, edges: finalEdges };
}

export function labelOfKind(k: C4RelKind): string {
  return (
    {
      uses: "memakai",
      calls: "memanggil API",
      data: "membaca/menulis data",
      fk: "foreign key",
      external: "memanggil layanan",
      inbound: "webhook masuk",
      schedules: "dijadwalkan",
    } as const
  )[k];
}

/** Tetangga langsung (untuk efek sorot saat hover/seleksi). */
export function neighborSet(view: C4ViewModel, key: string): Set<string> {
  const s = new Set<string>([key]);
  for (const e of view.edges) {
    if (e.from === key) s.add(e.to);
    if (e.to === key) s.add(e.from);
  }
  return s;
}

export interface SearchHit {
  element: C4Element;
  score: number;
}

export function searchElements(g: C4Graph, q: string, limit = 9): SearchHit[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];
  for (const e of g.elements) {
    const name = e.name.toLowerCase();
    let score = 0;
    if (name === needle) score = 100;
    else if (name.startsWith(needle)) score = 80;
    else if (name.includes(needle)) score = 60;
    else if (e.key.toLowerCase().includes(needle)) score = 40;
    else if ((e.description ?? "").toLowerCase().includes(needle)) score = 20;
    if (score) hits.push({ element: e, score: score - (e.state === "stale" ? 30 : 0) - (e.hidden ? 20 : 0) });
  }
  return hits.sort((a, b) => b.score - a.score || a.element.name.localeCompare(b.element.name)).slice(0, limit);
}

/** Tampilan terbaik untuk menampilkan elemen tertentu. */
export function viewForElement(e: C4Element, idx: C4Index): C4View {
  if (e.level === 1) return { kind: "level", level: 1 };
  if (e.level === 2) return { kind: "level", level: 2 };
  return { kind: "focus", scope: e.key };
}

/** Ekspor tampilan aktif ke sintaks C4 Mermaid. */
export function toMermaid(view: C4ViewModel): string {
  const id = (k: string) => "n_" + k.replace(/[^A-Za-z0-9]/g, "_");
  const q = (s: string | null | undefined) => (s ?? "").replace(/"/g, "'").replace(/\s+/g, " ").slice(0, 120);
  const head = view.key === "L1" ? "C4Context" : view.key === "L2" ? "C4Container" : "C4Component";
  const lines = [head, `  title ${q(view.title)}`];
  for (const n of view.nodes) {
    const e = n.element;
    const i = id(e.key);
    const d = q(e.description);
    if (e.kind === "person") lines.push(`  Person(${i}, "${q(e.name)}", "${d}")`);
    else if (e.kind === "system") lines.push(`  System(${i}, "${q(e.name)}", "${d}")`);
    else if (e.kind === "external") lines.push(`  System_Ext(${i}, "${q(e.name)}", "${d}")`);
    else if (e.kind === "datastore" || e.kind === "table") lines.push(`  ContainerDb(${i}, "${q(e.name)}", "${q(e.technology)}", "${d}")`);
    else if (e.kind === "container") lines.push(`  Container(${i}, "${q(e.name)}", "${q(e.technology)}", "${d}")`);
    else lines.push(`  Component(${i}, "${q(e.name)}", "${q(e.technology)}", "${d}")`);
  }
  for (const e of view.edges) lines.push(`  Rel(${id(e.from)}, ${id(e.to)}, "${q(e.label)}")`);
  return lines.join("\n");
}
