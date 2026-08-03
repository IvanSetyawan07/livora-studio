import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { DOMAINS, TABLES, RELATIONS, FLOWS, Domain } from "@/data/erdSchema";

// -------------------------------------------------------------
// Layout: one column per domain, tables stacked vertically.
// Adding a table in src/data/erdSchema.ts is enough — the ERD
// re-lays itself out automatically.
// -------------------------------------------------------------
const COL_WIDTH = 380;
const ROW_HEIGHT = 260;
const NODE_WIDTH = 300;

const colorOf = (d: Domain) => DOMAINS.find((x) => x.id === d)?.color ?? "#374151";

function buildGraph(active: Domain | "all"): { nodes: Node[]; edges: Edge[] } {
  const domains = DOMAINS.filter((d) => active === "all" || d.id === active);
  const visible = TABLES.filter((t) => domains.some((d) => d.id === t.domain));
  const names = new Set(visible.map((t) => t.name));

  const nodes: Node[] = [];
  domains.forEach((d, col) => {
    const tables = visible.filter((t) => t.domain === d.id);
    tables.forEach((t, row) => {
      nodes.push({
        id: t.name,
        position: { x: col * COL_WIDTH, y: row * ROW_HEIGHT },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: (
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, letterSpacing: 0.4 }}>
                {t.label ?? t.name}
              </div>
              <div style={{ fontSize: 10, lineHeight: 1.5, opacity: 0.92 }}>
                {t.columns.map((c) => (
                  <div key={c}>· {c}</div>
                ))}
              </div>
            </div>
          ),
        },
        style: {
          background: colorOf(t.domain),
          border: "2px solid rgba(255,255,255,0.35)",
          color: "white",
          borderRadius: 14,
          width: NODE_WIDTH,
          padding: 12,
          boxShadow: `0 0 18px ${colorOf(t.domain)}55`,
        },
      });
    });
  });

  const edges: Edge[] = RELATIONS.filter((r) => names.has(r.from) && names.has(r.to)).map((r, i) => ({
    id: `e-${r.from}-${r.to}-${i}`,
    source: r.from,
    target: r.to,
    label: r.label,
    animated: r.label.startsWith("tracked"),
    style: { stroke: "#94a3b8", strokeWidth: 1.4 },
    labelStyle: { fontSize: 10, fill: "#475569" },
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

  return { nodes, edges };
}

export default function ERD() {
  const [domain, setDomain] = useState<Domain | "all">("all");
  const [tab, setTab] = useState<"erd" | "flow">("erd");

  const graph = useMemo(() => buildGraph(domain), [domain]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  // Re-sync when the domain filter changes
  useMemo(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge(c, eds)), [setEdges]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Documentation</p>
          <h1 className="serif text-3xl">Livora — Database & Feature Map</h1>
          <p className="text-xs text-muted-foreground mt-2">
            {TABLES.length} tables · {RELATIONS.length} relations. Source: <code>src/data/erdSchema.ts</code>
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">View</label>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as any)}
              className="bg-card border border-border rounded px-3 py-2 text-sm"
            >
              <option value="erd">ERD Diagram</option>
              <option value="flow">Feature Flow</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value as any)}
              className="bg-card border border-border rounded px-3 py-2 text-sm min-w-[220px]"
            >
              <option value="all">All Domains</option>
              {DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-6 py-3 border-b border-border">
        {DOMAINS.map((d) => (
          <span key={d.id} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded" style={{ background: d.color }} />
            {d.label}
          </span>
        ))}
      </div>

      {tab === "erd" ? (
        <div style={{ width: "100%", height: "calc(100vh - 190px)" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            minZoom={0.1}
          >
            <Background gap={20} />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {FLOWS.map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-lg p-6">
              <h2 className="serif text-xl mb-4">{f.title}</h2>
              <ol className="space-y-3">
                {f.steps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-sm">
                    <span className="shrink-0 w-6 h-6 rounded-full border border-border flex items-center justify-center text-[11px] text-muted-foreground">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
