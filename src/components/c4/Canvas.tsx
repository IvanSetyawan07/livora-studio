// Kanvas diagram: pan, zoom, seret node, sorot saat hover, minimap.
// Murni SVG — tidak butuh library diagram eksternal.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { C4Store } from "@/hooks/useC4";
import { colorOf, domainColor, drillTarget, neighborSet } from "@/lib/c4/graph";
import { boundsOf, domainBounds, type Rect } from "@/lib/c4/layout";
import { Boundary, EdgeView, NodeView, type Emphasis } from "./DiagramParts";
import { Icon } from "./icons";

interface Cam {
  x: number;
  y: number;
  k: number;
}
const K_MIN = 0.06;
const K_MAX = 2.6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export interface Reveal {
  key: string;
  n: number;
}

export function Canvas({ store, reveal }: { store: C4Store; reveal: Reveal | null }) {
  const { viewModel: vm, layout, idx, graph, selection, setSelection, effectiveEffects: fx } = store;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, k: 1 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const [hover, setHover] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const gesture = useRef<null | { type: "pan" | "node" | "none"; sx: number; sy: number; cam: Cam; key?: string; edge?: string | null; orig?: { x: number; y: number }; moved: boolean; pid: number }>(null);
  const lastFit = useRef("");
  const lastDownKey = useRef<string | null>(null);

  // ukuran kontainer
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const rects = layout?.rects;
  const worldBounds = useMemo(() => (rects ? boundsOf(rects.values()) : null), [rects]);

  const fit = useCallback(
    (animate = false) => {
      if (!worldBounds || size.w < 50) return;
      const pad = 90;
      const k = clamp(Math.min((size.w - pad) / worldBounds.w, (size.h - pad) / worldBounds.h, 1.1), K_MIN, K_MAX);
      const next = { k, x: size.w / 2 - (worldBounds.x + worldBounds.w / 2) * k, y: size.h / 2 - (worldBounds.y + worldBounds.h / 2) * k };
      if (animate) animateTo(next);
      else setCam(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [worldBounds, size.w, size.h],
  );

  const raf = useRef(0);
  function animateTo(target: Cam) {
    cancelAnimationFrame(raf.current);
    const from = camRef.current;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = clamp((t - t0) / 380, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCam({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, k: from.k + (target.k - from.k) * e });
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }

  // fit otomatis saat berganti tampilan / filter domain
  const fitSig = vm ? `${vm.key}|${store.domains ? [...store.domains].sort().join(",") : "*"}|${store.contextDepth}` : "";
  useEffect(() => {
    if (!vm || !worldBounds || size.w < 50) return;
    if (lastFit.current === fitSig) return;
    lastFit.current = fitSig;
    fit(false);
  }, [fitSig, vm, worldBounds, size.w, fit]);

  // sorot & pusatkan elemen (hasil pencarian) — menunggu kanvas punya ukuran
  const revealDone = useRef(0);
  useEffect(() => {
    if (!reveal || revealDone.current === reveal.n || size.w < 50 || !rects) return;
    const r = rects.get(reveal.key);
    if (!r) return;
    revealDone.current = reveal.n;
    const k = clamp(Math.max(camRef.current.k, 0.85), K_MIN, 1.4);
    animateTo({ k, x: size.w / 2 - (r.x + r.w / 2) * k, y: size.h / 2 - (r.y + r.h / 2) * k });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal?.n, size.w, rects]);

  // pintasan keyboard: F = pas layar, Esc = batal pilih
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.key === "f" || e.key === "F") fit(true);
      if (e.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [fit, setSelection]);

  // zoom roda mouse (listener non-pasif agar bisa preventDefault)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(raf.current);
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const c = camRef.current;
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
      const k = clamp(c.k * factor, K_MIN, K_MAX);
      const wx = (px - c.x) / c.k;
      const wy = (py - c.y) / c.k;
      setCam({ k, x: px - wx * k, y: py - wy * k });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (f: number) => {
    const c = camRef.current;
    const k = clamp(c.k * f, K_MIN, K_MAX);
    const wx = (size.w / 2 - c.x) / c.k;
    const wy = (size.h / 2 - c.y) / c.k;
    animateTo({ k, x: size.w / 2 - wx * k, y: size.h / 2 - wy * k });
  };

  // ── sorotan ──
  const activeNode = hover ?? (selection?.type === "node" ? selection.key : null);
  const selEdgeId = selection?.type === "edge" ? selection.id : null;
  const selEdge = selEdgeId && vm ? vm.edges.find((e) => e.id === selEdgeId) : null;
  const neigh = useMemo(() => (vm && activeNode ? neighborSet(vm, activeNode) : null), [vm, activeNode]);

  const nodeEmphasis = (key: string): Emphasis => {
    if (selEdge) return key === selEdge.from || key === selEdge.to ? "hl" : "dim";
    if (!neigh) return "normal";
    if (key === activeNode) return "sel";
    return neigh.has(key) ? "hl" : "dim";
  };

  // ── interaksi pointer ──
  const hitKey = (t: EventTarget | null) => (t as Element | null)?.closest?.(".c4-node")?.getAttribute("data-key") ?? null;
  const hitEdge = (t: EventTarget | null) => (t as Element | null)?.closest?.(".c4-edge")?.getAttribute("data-edge") ?? null;

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    cancelAnimationFrame(raf.current);
    const key = hitKey(e.target);
    lastDownKey.current = key;
    // target dicatat saat tekan: setelah pointer-capture, event "up" selalu menunjuk ke <svg>
    const g = { sx: e.clientX, sy: e.clientY, cam: camRef.current, moved: false, pid: e.pointerId, edge: hitEdge(e.target) };
    if (key && rects?.get(key)) {
      const r = rects.get(key)!;
      gesture.current = { ...g, type: "node", key, orig: { x: r.x, y: r.y } };
    } else gesture.current = { ...g, type: "none" };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g) {
      const k = hitKey(e.target);
      if (k !== hover) setHover(k);
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < 4) return;
    if (!g.moved) {
      g.moved = true;
      if (g.type === "none") {
        g.type = "pan";
        setPanning(true);
      } else if (g.type === "node") setDragKey(g.key!);
    }
    if (g.type === "pan") setCam({ ...g.cam, x: g.cam.x + dx, y: g.cam.y + dy });
    else if (g.type === "node" && g.orig) store.movePositions(new Map([[g.key!, { x: g.orig.x + dx / g.cam.k, y: g.orig.y + dy / g.cam.k }]]), false);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    gesture.current = null;
    setPanning(false);
    setDragKey(null);
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* sudah dilepas */
    }
    if (!g) return;
    if (g.moved) {
      if (g.type === "node" && g.orig) {
        const dx = (e.clientX - g.sx) / g.cam.k;
        const dy = (e.clientY - g.sy) / g.cam.k;
        store.movePositions(new Map([[g.key!, { x: g.orig.x + dx, y: g.orig.y + dy }]]), true);
      }
      return;
    }
    // klik tanpa geser
    if (g.key) setSelection({ type: "node", key: g.key });
    else if (g.edge) setSelection({ type: "edge", id: g.edge });
    else setSelection(null);
  };

  const onDouble = (e: React.MouseEvent) => {
    const key = lastDownKey.current ?? hitKey(e.target);
    if (!key || !idx) return;
    const el = idx.byKey.get(key);
    if (el) store.drill(el);
  };

  // ── data render ──
  const nodes = vm?.nodes ?? [];
  const edgeList = useMemo(() => {
    if (!vm || !layout) return [];
    const order: Record<Emphasis, number> = { dim: 0, normal: 1, hl: 2, sel: 3 };
    return vm.edges
      .map((e) => {
        let emp: Emphasis = "normal";
        if (selEdgeId) emp = e.id === selEdgeId ? "sel" : "dim";
        else if (activeNode) emp = e.from === activeNode || e.to === activeNode ? "hl" : "dim";
        return { e, emp };
      })
      .sort((a, b) => order[a.emp] - order[b.emp]);
  }, [vm, layout, activeNode, selEdgeId]);

  const bounds = useMemo(() => (vm && rects && (vm.nodes.length > 26 || vm.key.startsWith("L3") || vm.key.startsWith("L4") || vm.key.startsWith("F:")) ? domainBounds(vm.nodes, rects) : []), [vm, rects]);

  const detail = cam.k >= 0.5;
  // peta jauh: diagram besar hanya menampilkan kotak domain + node; garis muncul saat disorot
  const overview = cam.k < 0.34 && (vm?.nodes.length ?? 0) > 40;
  const manyEdges = (vm?.edges.length ?? 0) > 40;

  // ── minimap ──
  const mm = useMemo(() => {
    if (!worldBounds) return null;
    const pad = 80;
    return { x: worldBounds.x - pad, y: worldBounds.y - pad, w: worldBounds.w + pad * 2, h: worldBounds.h + pad * 2 };
  }, [worldBounds]);
  const mmRef = useRef<SVGSVGElement>(null);
  const mmMove = (e: React.PointerEvent) => {
    if (!mm || !mmRef.current || (e.type === "pointermove" && e.buttons !== 1)) return;
    const r = mmRef.current.getBoundingClientRect();
    const scale = Math.min(r.width / mm.w, r.height / mm.h);
    const offX = (r.width - mm.w * scale) / 2;
    const offY = (r.height - mm.h * scale) / 2;
    const wx = mm.x + (e.clientX - r.left - offX) / scale;
    const wy = mm.y + (e.clientY - r.top - offY) / scale;
    const k = camRef.current.k;
    setCam({ k, x: size.w / 2 - wx * k, y: size.h / 2 - wy * k });
  };

  if (!vm || !layout || !graph || !idx) return <div className="c4-canvas c4-canvas--empty" ref={wrapRef} />;

  const empty = nodes.length === 0;

  return (
    <div className="c4-canvas" ref={wrapRef} data-testid="c4-canvas" data-fx={fx}>
      <svg
        ref={svgRef}
        className={`c4-svg${panning ? " is-panning" : ""}${dragKey ? " is-dragging" : ""}`}
        width="100%"
        height="100%"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => !gesture.current && setHover(null)}
        onDoubleClick={onDouble}
        role="img"
        aria-label={vm.title}
      >
        <defs>
          <filter id="c4-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.6" />
          </filter>
          <pattern id="c4-grid-s" width={24} height={24} patternUnits="userSpaceOnUse" patternTransform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
            <path d="M24 0H0V24" className="c4-grid__minor" />
          </pattern>
          <pattern id="c4-grid-l" width={120} height={120} patternUnits="userSpaceOnUse" patternTransform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
            <path d="M120 0H0V120" className="c4-grid__major" />
          </pattern>
        </defs>
        <rect className="c4-bg" width="100%" height="100%" fill="url(#c4-grid-s)" />
        <rect className="c4-bg" width="100%" height="100%" fill="url(#c4-grid-l)" />

        <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
          {bounds.map((b) => (
            <Boundary key={b.domain} rect={b.rect} color={domainColor(b.domain, idx)} name={idx.domains.get(b.domain)?.name ?? b.domain} count={b.count} dim={!!activeNode && !(neigh && [...neigh].some((k) => idx.byKey.get(k)?.domain_key === b.domain))} overview={overview} k={cam.k} />
          ))}

          <g className="c4-edges">
            {edgeList.map(({ e, emp }) => {
              if (overview && emp === "normal") return null;
              const routed = layout.edges.get(e.id);
              if (!routed) return null;
              const from = idx.byKey.get(e.from);
              const col = e.domain ? domainColor(e.domain, idx) : colorOf(from, idx);
              const hot = emp === "hl" || emp === "sel";
              return <EdgeView key={e.id} edge={e} routed={routed} color={col} emphasis={emp} fx={fx} showLabel={hot ? true : !manyEdges && cam.k >= 0.55} selected={e.id === selEdgeId} />;
            })}
          </g>

          <g className="c4-nodes">
            {nodes.map((n) => {
              const r = rects!.get(n.key);
              if (!r) return null;
              const d = drillTarget(n.element, idx);
              return (
                <NodeView
                  key={n.key}
                  el={n.element}
                  rect={r}
                  color={colorOf(n.element, idx)}
                  emphasis={nodeEmphasis(n.key)}
                  context={n.context}
                  drillable={!!d}
                  detail={detail}
                  fx={fx}
                  hovered={hover === n.key}
                  selected={selection?.type === "node" && selection.key === n.key}
                  dragging={dragKey === n.key}
                  dimByFilter={false}
                />
              );
            })}
          </g>
        </g>
      </svg>

      {overview && (
        <div className="c4-hint" data-testid="c4-overview-hint">
          Peta jauh — perbesar atau arahkan kursor ke node untuk melihat garis hubungan
        </div>
      )}

      {empty && (
        <div className="c4-empty" data-testid="c4-empty">
          <Icon name="diagram" size={30} />
          <p>Tidak ada elemen yang cocok dengan tampilan atau filter ini.</p>
        </div>
      )}

      <div className="c4-zoom" role="group" aria-label="Kontrol zoom">
        <button type="button" onClick={() => zoomBy(1.3)} title="Perbesar" aria-label="Perbesar">
          <Icon name="plus" size={15} />
        </button>
        <span data-testid="c4-zoom-level">{Math.round(cam.k * 100)}%</span>
        <button type="button" onClick={() => zoomBy(1 / 1.3)} title="Perkecil" aria-label="Perkecil">
          <Icon name="minus" size={15} />
        </button>
        <button type="button" onClick={() => fit(true)} title="Pas ke layar (F)" aria-label="Pas ke layar" data-testid="c4-fit">
          <Icon name="fit" size={15} />
        </button>
      </div>

      {mm && !empty && size.w > 640 && (
        <svg ref={mmRef} className="c4-minimap" viewBox={`${mm.x} ${mm.y} ${mm.w} ${mm.h}`} preserveAspectRatio="xMidYMid meet" onPointerDown={(e) => { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); mmMove(e); }} onPointerMove={mmMove} aria-hidden="true">
          {nodes.map((n) => {
            const r = rects!.get(n.key)!;
            return r ? <rect key={n.key} x={r.x} y={r.y} width={r.w} height={r.h} fill={colorOf(n.element, idx)} opacity={n.context ? 0.35 : 0.85} /> : null;
          })}
          <rect className="c4-minimap__view" x={-cam.x / cam.k} y={-cam.y / cam.k} width={size.w / cam.k} height={size.h / cam.k} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}

export type { Rect };
