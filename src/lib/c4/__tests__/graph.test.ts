import { describe, expect, it } from "vitest";
import { buildIndex, buildView, drillTarget, searchElements, toMermaid } from "../graph";
import { autoLayout, nodeSize, routeEdges } from "../layout";
import type { C4Element, C4Filters, C4Graph, C4Relation } from "../types";

const el = (key: string, level: 1 | 2 | 3 | 4, kind: C4Element["kind"], parent: string | null = null, domain = "core", extra: Partial<C4Element> = {}): C4Element => ({
  id: Math.abs([...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)), key, level, kind, name: key, technology: null, description: null, domain_key: domain, color: null, note: null,
  parent_key: parent, meta: {}, source: "auto", scan_group: "code", hidden: false, state: "present", overridden: [], first_seen_at: null, last_seen_at: null, stale_since: null, ...extra,
});
const rel = (from: string, to: string, kind: C4Relation["kind"] = "uses", extra: Partial<C4Relation> = {}): C4Relation => ({
  id: Math.abs([...(from + to)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 3)), key: `${from}>${kind}>${to}`, from, to, kind, label: null, technology: null, weight: 1, domain_key: null, note: null, meta: {},
  source: "auto", scan_group: "code", hidden: false, state: "present", overridden: [], first_seen_at: null, last_seen_at: null, ...extra,
});

const g: C4Graph = {
  domains: [{ id: 1, key: "core", name: "Core", color: "#fff", description: null, sort_order: 0, source: "auto", element_count: 0 }, { id: 2, key: "shop", name: "Shop", color: "#f0f", description: null, sort_order: 1, source: "auto", element_count: 0 }],
  elements: [
    el("person:u", 1, "person"), el("sys:app", 1, "system"), el("ext:pay", 1, "external", null, "shop"),
    el("ctr:api", 2, "container", "sys:app"), el("ctr:db", 2, "datastore", "sys:app"),
    el("cls:Ctl", 3, "component", "ctr:api", "shop"), el("cls:Svc", 3, "component", "ctr:api", "shop"),
    el("tbl:orders", 4, "table", "ctr:db", "shop", { meta: { columns: [{ name: "id", type: "int", pk: true }] } }), el("tbl:users", 4, "table", "ctr:db"),
  ],
  relations: [
    rel("person:u", "ctr:api", "calls"), rel("cls:Ctl", "cls:Svc"), rel("cls:Svc", "tbl:orders", "data"), rel("cls:Svc", "ext:pay", "external"), rel("tbl:orders", "tbl:users", "fk"),
  ],
  last_sync: null,
  isolation: "",
};
const idx = buildIndex(g);
const F: C4Filters = { domains: null, showHidden: false, showStale: false };

describe("C4 view building", () => {
  it("L2 rolls component relations up to containers", () => {
    const v = buildView(g, idx, { kind: "level", level: 2 }, F, { contextDepth: "container" });
    const pairs = v.edges.map((e) => `${e.from}>${e.to}`);
    expect(pairs).toContain("ctr:api>ctr:db");
    expect(pairs).toContain("ctr:api>ext:pay");
    expect(pairs).toContain("person:u>ctr:api");
  });
  it("L3 shows only components of the scope plus context", () => {
    const v = buildView(g, idx, { kind: "level", level: 3, scope: "ctr:api" }, F, { contextDepth: "container" });
    expect(v.nodes.filter((n) => !n.context).map((n) => n.key).sort()).toEqual(["cls:Ctl", "cls:Svc"]);
    expect(v.nodes.find((n) => n.key === "ctr:db")?.context).toBe(true);
  });
  it("L4 lists tables and fk edges", () => {
    const v = buildView(g, idx, { kind: "level", level: 4, scope: "ctr:db" }, F, { contextDepth: "container" });
    expect(v.edges.some((e) => e.kind === "fk")).toBe(true);
  });
  it("hides hidden and stale items unless asked", () => {
    const g2 = { ...g, elements: g.elements.map((e) => (e.key === "cls:Ctl" ? { ...e, hidden: true } : e)) };
    const i2 = buildIndex(g2);
    const v = buildView(g2, i2, { kind: "level", level: 3, scope: "ctr:api" }, F, { contextDepth: "container" });
    expect(v.nodes.some((n) => n.key === "cls:Ctl")).toBe(false);
    const v2 = buildView(g2, i2, { kind: "level", level: 3, scope: "ctr:api" }, { ...F, showHidden: true }, { contextDepth: "container" });
    expect(v2.nodes.some((n) => n.key === "cls:Ctl")).toBe(true);
  });
  it("domain filter keeps only chosen domain", () => {
    const v = buildView(g, idx, { kind: "level", level: 3, scope: "ctr:api" }, { ...F, domains: new Set(["core"]) }, { contextDepth: "container" });
    expect(v.nodes.filter((n) => !n.context)).toHaveLength(0);
  });
  it("focus shows direct neighbours only", () => {
    const v = buildView(g, idx, { kind: "focus", scope: "cls:Svc" }, F, { contextDepth: "container" });
    expect(v.nodes.map((n) => n.key).sort()).toEqual(["cls:Ctl", "cls:Svc", "ext:pay", "tbl:orders"]);
  });
  it("drill targets and search", () => {
    expect(drillTarget(idx.byKey.get("ctr:api")!, idx)).toEqual({ kind: "level", level: 3, scope: "ctr:api" });
    expect(drillTarget(idx.byKey.get("ctr:db")!, idx)).toEqual({ kind: "level", level: 4, scope: "ctr:db" });
    expect(searchElements(g, "svc")[0].element.key).toBe("cls:Svc");
  });
  it("exports mermaid", () => {
    const v = buildView(g, idx, { kind: "level", level: 1 }, F, { contextDepth: "container" });
    expect(toMermaid(v)).toMatch(/^C4Context/);
  });
});

describe("C4 layout", () => {
  it("places every node without overlap and routes every edge", () => {
    const v = buildView(g, idx, { kind: "level", level: 2 }, F, { contextDepth: "container" });
    const pos = autoLayout(v, ["core", "shop"]);
    const rects = new Map(v.nodes.map((n) => [n.key, { ...pos.get(n.key)!, ...nodeSize(n.element) }]));
    expect(rects.size).toBe(v.nodes.length);
    const r = [...rects.values()];
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) expect(r[i].x < r[j].x + r[j].w && r[j].x < r[i].x + r[i].w && r[i].y < r[j].y + r[j].h && r[j].y < r[i].y + r[i].h).toBe(false);
    const routed = routeEdges(v.edges, rects);
    expect(routed.size).toBe(v.edges.length);
    for (const e of routed.values()) for (let i = 1; i < e.points.length; i++) expect(e.points[i].x === e.points[i - 1].x || e.points[i].y === e.points[i - 1].y).toBe(true); // hanya garis siku
  });
});
