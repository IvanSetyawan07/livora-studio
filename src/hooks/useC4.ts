// State & aksi halaman C4 — tanpa react-query supaya modul berdiri sendiri.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { c4Api, errMessage, type DomainInput, type ElementInput, type LayoutPos, type RelationInput } from "@/lib/c4/api";
import { buildIndex, buildView, drillTarget, viewKeyOf, type C4Index } from "@/lib/c4/graph";
import { autoLayout, nodeSize, routeEdges, type Pt, type Rect, type RoutedEdge } from "@/lib/c4/layout";
import type { C4Element, C4Filters, C4Graph, C4SyncRun, C4View, C4ViewModel, EffectsMode } from "@/lib/c4/types";

export type Selection = { type: "node"; key: string } | { type: "edge"; id: string } | null;
export interface Toast {
  id: number;
  kind: "ok" | "err" | "info";
  text: string;
}

const LS = "c4.prefs.v1";
function readPrefs(): { effects: EffectsMode; contextDepth: "container" | "component"; showHidden: boolean; showStale: boolean } {
  const d = { effects: "auto" as EffectsMode, contextDepth: "container" as const, showHidden: false, showStale: false };
  try {
    return { ...d, ...JSON.parse(localStorage.getItem(LS) || "{}") };
  } catch {
    return d;
  }
}

export function useC4() {
  const prefs0 = useMemo(readPrefs, []);
  const [graph, setGraph] = useState<C4Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setViewState] = useState<C4View>({ kind: "level", level: 2 });
  const [history, setHistory] = useState<C4View[]>([]);
  const [domains, setDomains] = useState<Set<string> | null>(null);
  const [showHidden, setShowHidden] = useState(prefs0.showHidden);
  const [showStale, setShowStale] = useState(prefs0.showStale);
  const [effects, setEffects] = useState<EffectsMode>(prefs0.effects);
  const [contextDepth, setContextDepth] = useState<"container" | "component">(prefs0.contextDepth);
  const [selection, setSelection] = useState<Selection>(null);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const posStore = useRef<Map<string, Map<string, Pt>>>(new Map());
  const loadedViews = useRef<Set<string>>(new Set());
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const toastId = useRef(1);

  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify({ effects, contextDepth, showHidden, showStale }));
    } catch {
      /* penyimpanan browser boleh gagal */
    }
  }, [effects, contextDepth, showHidden, showStale]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReducedMotion(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);

  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = toastId.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" ? 7000 : 3800);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const g = await c4Api.graph();
        setGraph(g);
        setError(null);
      } catch (e) {
        setError(errMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  const idx: C4Index | null = useMemo(() => (graph ? buildIndex(graph) : null), [graph]);

  const filters: C4Filters = useMemo(() => ({ domains, showHidden, showStale }), [domains, showHidden, showStale]);

  const viewModel: C4ViewModel | null = useMemo(() => {
    if (!graph || !idx) return null;
    // scope yang sudah tidak ada (mis. dihapus) → kembali ke level 2
    if ("scope" in view && !idx.byKey.has(view.scope)) return buildView(graph, idx, { kind: "level", level: 2 }, filters, { contextDepth });
    return buildView(graph, idx, view, filters, { contextDepth });
  }, [graph, idx, view, filters, contextDepth]);

  const viewKey = viewModel?.key ?? viewKeyOf(view);

  // posisi tersimpan (server) — dimuat sekali per tampilan
  useEffect(() => {
    if (!graph || loadedViews.current.has(viewKey)) return;
    loadedViews.current.add(viewKey);
    let alive = true;
    c4Api
      .layouts(viewKey)
      .then((rows) => {
        if (!alive) return;
        const m = posStore.current.get(viewKey) ?? new Map<string, Pt>();
        for (const r of rows) if (!m.has(r.key)) m.set(r.key, { x: Number(r.x), y: Number(r.y) });
        posStore.current.set(viewKey, m);
        setLayoutVersion((v) => v + 1);
      })
      .catch(() => {
        /* tanpa layout tersimpan → pakai tata letak otomatis */
      });
    return () => {
      alive = false;
    };
  }, [graph, viewKey]);

  const autoPos = useMemo(() => {
    if (!viewModel || !graph) return null;
    return autoLayout(viewModel, graph.domains.map((d) => d.key));
  }, [viewModel, graph]);

  const layout = useMemo(() => {
    if (!viewModel || !autoPos) return null;
    const saved = posStore.current.get(viewModel.key);
    const rects = new Map<string, Rect>();
    for (const n of viewModel.nodes) {
      const p = saved?.get(n.key) ?? autoPos.get(n.key) ?? { x: 0, y: 0 };
      rects.set(n.key, { ...p, ...nodeSize(n.element) });
    }
    return { rects, edges: routeEdges(viewModel.edges, rects) as Map<string, RoutedEdge> };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewModel, autoPos, layoutVersion]);

  // ── navigasi ──
  const setView = useCallback(
    (v: C4View, opts: { push?: boolean; select?: string | null } = {}) => {
      setViewState((cur) => {
        if (opts.push !== false && viewKeyOf(cur) !== viewKeyOf(v)) setHistory((h) => [...h.slice(-20), cur]);
        return v;
      });
      setSelection(opts.select ? { type: "node", key: opts.select } : null);
    },
    [],
  );
  const back = useCallback(() => {
    setHistory((h) => {
      const prev = h[h.length - 1];
      if (prev) {
        setViewState(prev);
        setSelection(null);
      }
      return h.slice(0, -1);
    });
  }, []);
  const drill = useCallback(
    (e: C4Element) => {
      if (!idx) return;
      const t = drillTarget(e, idx);
      if (t) setView(t);
      else setView({ kind: "focus", scope: e.key });
    },
    [idx, setView],
  );

  // ── posisi ──
  const flushSave = useCallback((vk: string) => {
    const m = posStore.current.get(vk);
    if (!m || !m.size) return;
    const positions: LayoutPos[] = [...m.entries()].slice(0, 1500).map(([key, p]) => ({ key, x: Math.round(p.x), y: Math.round(p.y) }));
    c4Api.saveLayout(vk, positions).catch(() => undefined);
  }, []);
  const movePositions = useCallback(
    (updates: Map<string, Pt>, commit: boolean) => {
      if (!viewModel) return;
      const vk = viewModel.key;
      const m = posStore.current.get(vk) ?? new Map<string, Pt>();
      // pertahankan posisi otomatis untuk node lain agar tidak melompat saat tata letak berubah
      if (!m.size && layout) for (const [k, r] of layout.rects) m.set(k, { x: r.x, y: r.y });
      for (const [k, p] of updates) m.set(k, p);
      posStore.current.set(vk, m);
      setLayoutVersion((v) => v + 1);
      if (commit) {
        const t = saveTimers.current.get(vk);
        if (t) clearTimeout(t);
        saveTimers.current.set(vk, setTimeout(() => flushSave(vk), 600));
      }
    },
    [viewModel, layout, flushSave],
  );
  const resetLayout = useCallback(async () => {
    if (!viewModel) return;
    posStore.current.delete(viewModel.key);
    setLayoutVersion((v) => v + 1);
    try {
      await c4Api.resetLayout(viewModel.key);
      toast("ok", "Tata letak dikembalikan ke otomatis.");
    } catch (e) {
      toast("err", errMessage(e));
    }
  }, [viewModel, toast]);

  // ── mutasi ──
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, okMsg?: string): Promise<T | null> => {
      setBusy(true);
      try {
        const r = await fn();
        await reload(true);
        if (okMsg) toast("ok", okMsg);
        return r;
      } catch (e) {
        toast("err", errMessage(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [reload, toast],
  );

  const actions = useMemo(
    () => ({
      createElement: (d: ElementInput) => run(() => c4Api.createElement(d), "Elemen ditambahkan."),
      updateElement: (id: number, d: ElementInput, msg = "Elemen disimpan.") => run(() => c4Api.updateElement(id, d), msg),
      deleteElement: (id: number) =>
        run(async () => {
          const r = await c4Api.deleteElement(id);
          toast("info", r.message ?? "Elemen dihapus.");
          return r;
        }),
      resetElement: (id: number) => run(() => c4Api.resetElement(id), "Override dihapus — kembali ke hasil scan."),
      createRelation: (d: RelationInput) => run(() => c4Api.createRelation(d), "Relasi ditambahkan."),
      updateRelation: (id: number, d: RelationInput, msg = "Relasi disimpan.") => run(() => c4Api.updateRelation(id, d), msg),
      deleteRelation: (id: number) =>
        run(async () => {
          const r = await c4Api.deleteRelation(id);
          toast("info", r.message ?? "Relasi dihapus.");
          return r;
        }),
      resetRelation: (id: number) => run(() => c4Api.resetRelation(id), "Override relasi dihapus."),
      createDomain: (d: DomainInput) => run(() => c4Api.createDomain(d), "Domain ditambahkan."),
      updateDomain: (id: number, d: DomainInput) => run(() => c4Api.updateDomain(id, d), "Domain disimpan."),
      deleteDomain: (id: number) => run(() => c4Api.deleteDomain(id), "Domain dihapus."),
      purgeStale: () =>
        run(async () => {
          const r = await c4Api.purgeStale();
          toast("info", `${r.elements} elemen & ${r.relations} relasi basi dibersihkan.`);
          return r;
        }),
    }),
    [run, toast],
  );

  const sync = useCallback(
    async (dry = false): Promise<C4SyncRun | null> => {
      setSyncing(true);
      try {
        const r = await c4Api.sync(dry);
        if (!dry) await reload(true);
        const s = r.stats?.elements;
        const rel = r.stats?.relations;
        toast(
          r.status === "failed" ? "err" : "ok",
          r.status === "failed"
            ? (r.error ?? "Sinkronisasi gagal.")
            : `${dry ? "[Simulasi] " : ""}Sinkron ${r.status === "partial" ? "sebagian" : "selesai"}: +${s?.added ?? 0} elemen, ~${s?.updated ?? 0} diubah, ${s?.stale ?? 0} basi, +${rel?.added ?? 0} relasi.`,
        );
        return r;
      } catch (e) {
        toast("err", errMessage(e));
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [reload, toast],
  );

  const ingest = useCallback(
    async (payload: unknown) => {
      const r = await run(() => c4Api.ingestFrontend(payload), "Hasil scan frontend diterima.");
      return r;
    },
    [run],
  );

  const toggleDomain = useCallback(
    (key: string, solo = false) => {
      if (!graph) return;
      setDomains((cur) => {
        const all = graph.domains.map((d) => d.key);
        if (solo) return cur && cur.size === 1 && cur.has(key) ? null : new Set([key]);
        const set = new Set(cur ?? all);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        return set.size === all.length || set.size === 0 ? null : set;
      });
    },
    [graph],
  );

  const effectiveEffects: "full" | "lite" | "off" = reducedMotion
    ? "off"
    : effects === "auto"
      ? (viewModel?.edges.length ?? 0) > 120
        ? "lite"
        : "full"
      : effects;

  return {
    graph,
    idx,
    loading,
    error,
    reload,
    view,
    setView,
    back,
    canBack: history.length > 0,
    drill,
    viewModel,
    layout,
    domains,
    toggleDomain,
    clearDomains: () => setDomains(null),
    showHidden,
    setShowHidden,
    showStale,
    setShowStale,
    effects,
    setEffects,
    effectiveEffects,
    contextDepth,
    setContextDepth,
    selection,
    setSelection,
    movePositions,
    resetLayout,
    actions,
    sync,
    syncing,
    ingest,
    busy,
    toasts,
    toast,
    dismissToast,
  };
}

export type C4Store = ReturnType<typeof useC4>;
