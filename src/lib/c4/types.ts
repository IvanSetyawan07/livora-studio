// Tipe data modul C4 — cermin dari respons backend (C4Controller@graph).

export type C4Kind = "person" | "system" | "external" | "container" | "datastore" | "component" | "table";
export type C4Level = 1 | 2 | 3 | 4;
export type C4RelKind = "uses" | "calls" | "data" | "fk" | "external" | "inbound" | "schedules";
export type C4Source = "auto" | "manual";

export interface C4Domain {
  id: number;
  key: string;
  name: string;
  color: string;
  description: string | null;
  sort_order: number;
  source: C4Source;
  element_count: number;
}

export interface C4Element {
  id: number;
  key: string;
  level: C4Level;
  kind: C4Kind;
  name: string;
  technology: string | null;
  description: string | null;
  domain_key: string | null;
  color: string | null;
  note: string | null;
  parent_key: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: Record<string, any>;
  source: C4Source;
  scan_group: string | null;
  hidden: boolean;
  state: "present" | "stale";
  overridden: string[];
  first_seen_at: string | null;
  last_seen_at: string | null;
  stale_since: string | null;
}

export interface C4Relation {
  id: number;
  key: string;
  from: string;
  to: string;
  kind: C4RelKind;
  label: string | null;
  technology: string | null;
  weight: number;
  domain_key: string | null;
  note: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: Record<string, any>;
  source: C4Source;
  scan_group: string | null;
  hidden: boolean;
  state: "present" | "stale";
  overridden: string[];
  first_seen_at: string | null;
  last_seen_at: string | null;
}

export interface C4SyncChange {
  type: "element" | "relation";
  action: "added" | "updated" | "stale" | "restored";
  key: string;
  name: string;
}

export interface C4SyncRun {
  id: number;
  trigger: string;
  status: "running" | "ok" | "partial" | "failed";
  stats: {
    elements?: Record<"added" | "updated" | "stale" | "restored", number>;
    relations?: Record<"added" | "updated" | "stale" | "restored", number>;
    totals?: Record<string, number>;
    scanned?: { elements: number; relations: number };
    dry_run?: boolean;
  } | null;
  warnings: string[] | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  changes: C4SyncChange[] | null;
}

export interface C4Graph {
  domains: C4Domain[];
  elements: C4Element[];
  relations: C4Relation[];
  last_sync: C4SyncRun | null;
  isolation: string;
}

/** Tampilan diagram: level 1–2 global, level 3–4 per-scope, atau fokus pada satu elemen. */
export type C4View =
  | { kind: "level"; level: 1 | 2 }
  | { kind: "level"; level: 3 | 4; scope: string }
  | { kind: "focus"; scope: string };

export interface C4Filters {
  /** null = semua domain */
  domains: Set<string> | null;
  showHidden: boolean;
  showStale: boolean;
}

export interface ViewNode {
  key: string;
  element: C4Element;
  /** node konteks = berada di luar scope, ditampilkan redup sebagai tetangga */
  context: boolean;
}

export interface ViewEdge {
  id: string;
  from: string;
  to: string;
  kind: C4RelKind | "mixed";
  label: string;
  weight: number;
  domain: string | null;
  relations: C4Relation[];
}

export interface C4ViewModel {
  key: string;
  title: string;
  subtitle: string;
  nodes: ViewNode[];
  edges: ViewEdge[];
}

export type EffectsMode = "auto" | "full" | "lite";
