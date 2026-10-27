// Toolbar atas: tab level C4, pemilih scope, pencarian, filter domain, aksi.
import { useMemo, useRef, useState } from "react";
import type { C4Store } from "@/hooks/useC4";
import { colorOf, searchElements, toMermaid, viewForElement } from "@/lib/c4/graph";
import type { C4Element, C4View } from "@/lib/c4/types";
import { Btn } from "./ui";
import { Icon } from "./icons";

function download(name: string, text: string, mime = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Toolbar({ store, onReveal }: { store: C4Store; onReveal: (key: string) => void }) {
  const { graph, idx, view, viewModel } = store;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<null | "export" | "view">(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scopes = useMemo(() => {
    const out: Record<3 | 4, C4Element[]> = { 3: [], 4: [] };
    if (!graph || !idx) return out;
    for (const e of graph.elements) {
      if (e.kind !== "container" && e.kind !== "datastore") continue;
      const kids = (idx.children.get(e.key) ?? []).map((k) => idx.byKey.get(k)!).filter(Boolean);
      if (kids.some((k) => k.level === 3)) out[3].push(e);
      if (kids.some((k) => k.level === 4)) out[4].push(e);
    }
    return out;
  }, [graph, idx]);

  const hits = useMemo(() => (graph ? searchElements(graph, q) : []), [graph, q]);

  const level = view.kind === "focus" ? "F" : view.level;
  const go = (v: C4View) => store.setView(v);
  const pick = (e: C4Element) => {
    if (!idx) return;
    const v = viewForElement(e, idx);
    go(v);
    store.setSelection({ type: "node", key: e.key });
    onReveal(e.key);
    setQ("");
    setOpen(false);
  };

  const tab = (id: 1 | 2 | 3 | 4 | "F", label: string, sub: string) => {
    const active = level === id;
    const disabled = (id === 3 && !scopes[3].length) || (id === 4 && !scopes[4].length) || (id === "F" && view.kind !== "focus");
    return (
      <button
        key={String(id)}
        type="button"
        className={`c4-tab${active ? " is-active" : ""}`}
        disabled={disabled}
        data-testid={`c4-tab-${id}`}
        onClick={() => {
          if (id === 1 || id === 2) go({ kind: "level", level: id });
          else if (id === 3 || id === 4) {
            const cur = "scope" in view ? view.scope : "";
            const list = scopes[id];
            const keep = list.find((s) => s.key === cur);
            go({ kind: "level", level: id, scope: (keep ?? list.find((s) => s.key === (id === 3 ? "ctr:api" : "ctr:db")) ?? list[0]).key });
          }
        }}
      >
        <b>{label}</b>
        <small>{sub}</small>
      </button>
    );
  };

  const scopeList = (level === 3 || level === 4) && view.kind === "level" ? scopes[level as 3 | 4] : [];

  const exportJson = () => graph && download("livora-c4.json", JSON.stringify({ exported_at: new Date().toISOString(), domains: graph.domains, elements: graph.elements, relations: graph.relations }, null, 2));
  const exportMermaid = () => viewModel && download(`livora-c4-${viewModel.key.replace(/[^a-z0-9]+/gi, "_")}.mmd`, toMermaid(viewModel), "text/plain");
  const exportSvg = () => {
    const svg = document.querySelector<SVGSVGElement>(".c4-svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("style", "background:#070b14");
    download("livora-c4.svg", new XMLSerializer().serializeToString(clone), "image/svg+xml");
  };

  return (
    <div className="c4-toolbar" data-testid="c4-toolbar">
      <div className="c4-toolbar__row">
        <div className="c4-tabs" role="tablist" aria-label="Level C4">
          {tab(1, "L1", "Konteks")}
          {tab(2, "L2", "Container")}
          {tab(3, "L3", "Komponen")}
          {tab(4, "L4", "Data")}
          {view.kind === "focus" && tab("F", "FOKUS", "Satu elemen")}
        </div>

        {scopeList.length > 0 && view.kind === "level" && (
          <select className="c4-select" value={"scope" in view ? view.scope : ""} onChange={(e) => go({ kind: "level", level: view.level as 3 | 4, scope: e.target.value })} aria-label="Scope" data-testid="c4-scope">
            {scopeList.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {view.kind === "level" && view.level === 4 && (
          <Btn size="sm" variant="ghost" active={store.contextDepth === "component"} onClick={() => store.setContextDepth(store.contextDepth === "container" ? "component" : "container")} title="Tampilkan komponen pemakai tabel (rinci) atau ringkas per container">
            {store.contextDepth === "component" ? "Konteks rinci" : "Konteks ringkas"}
          </Btn>
        )}

        <div className="c4-search">
          <Icon name="search" size={15} />
          <input
            ref={inputRef}
            id="c4-search"
            value={q}
            placeholder="Cari elemen…  ( / )"
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits[0]) pick(hits[0].element);
              if (e.key === "Escape") {
                setQ("");
                inputRef.current?.blur();
              }
            }}
            data-testid="c4-search"
          />
          {open && hits.length > 0 && (
            <ul className="c4-search__list" role="listbox">
              {hits.map(({ element: e }) => (
                <li key={e.key} role="option" onMouseDown={() => pick(e)} data-testid="c4-hit">
                  <i style={{ background: idx ? colorOf(e, idx) : "#888" }} />
                  <span>{e.name}</span>
                  <small>{e.kind}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="c4-toolbar__spacer" />

        {store.canBack && <Btn icon="back" size="sm" onClick={store.back} title="Kembali ke tampilan sebelumnya" testId="c4-back" />}
        <div className="c4-menu">
          <Btn icon="filter" size="sm" active={menu === "view" || store.showHidden || store.showStale} onClick={() => setMenu(menu === "view" ? null : "view")} title="Opsi tampilan">
            Tampilan
          </Btn>
          {menu === "view" && (
            <div className="c4-menu__pop" onMouseLeave={() => setMenu(null)}>
              <label>
                <input type="checkbox" checked={store.showHidden} onChange={(e) => store.setShowHidden(e.target.checked)} /> Tampilkan yang disembunyikan
              </label>
              <label>
                <input type="checkbox" checked={store.showStale} onChange={(e) => store.setShowStale(e.target.checked)} /> Tampilkan elemen basi (sudah hilang dari website)
              </label>
              <div className="c4-menu__sep" />
              <div className="c4-menu__title">Efek cahaya & animasi</div>
              {(["auto", "full", "lite"] as const).map((m) => (
                <label key={m}>
                  <input type="radio" name="fx" checked={store.effects === m} onChange={() => store.setEffects(m)} />
                  {m === "auto" ? "Otomatis (ringan untuk diagram besar)" : m === "full" ? "Penuh" : "Hemat (hanya yang disorot)"}
                </label>
              ))}
              <div className="c4-menu__hint">Aktif sekarang: {store.effectiveEffects === "off" ? "mati (sistem meminta kurangi gerakan)" : store.effectiveEffects === "full" ? "penuh" : "hemat"}</div>
            </div>
          )}
        </div>
        <Btn icon="reset" size="sm" onClick={() => void store.resetLayout()} title="Kembalikan tata letak otomatis" />
        <div className="c4-menu">
          <Btn icon="download" size="sm" onClick={() => setMenu(menu === "export" ? null : "export")} title="Ekspor" active={menu === "export"}>
            Ekspor
          </Btn>
          {menu === "export" && (
            <div className="c4-menu__pop" onMouseLeave={() => setMenu(null)}>
              <button type="button" onClick={exportMermaid}>Mermaid C4 (tampilan ini)</button>
              <button type="button" onClick={exportSvg}>SVG (tampilan ini)</button>
              <button type="button" onClick={exportJson}>JSON (seluruh model)</button>
            </div>
          )}
        </div>
        <Btn icon="sync" variant="accent" size="sm" onClick={() => void store.sync(false)} disabled={store.syncing} testId="c4-sync">
          {store.syncing ? "Menyinkron…" : "Sinkronkan"}
        </Btn>
      </div>
    </div>
  );
}

export function Legend({ store }: { store: C4Store }) {
  const { graph, viewModel, domains } = store;
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of viewModel?.nodes ?? []) if (!n.context) m.set(n.element.domain_key ?? "core", (m.get(n.element.domain_key ?? "core") ?? 0) + 1);
    return m;
  }, [viewModel]);
  if (!graph) return null;
  return (
    <div className="c4-legend" data-testid="c4-legend">
      <button type="button" className={`c4-chip c4-chip--all${!domains ? " is-on" : ""}`} onClick={store.clearDomains}>
        Semua
      </button>
      {graph.domains.map((d) => {
        const on = !domains || domains.has(d.key);
        const n = counts.get(d.key) ?? 0;
        return (
          <button
            key={d.key}
            type="button"
            className={`c4-chip${on ? " is-on" : ""}${n === 0 && on ? " is-empty" : ""}`}
            style={{ "--c": d.color } as React.CSSProperties}
            onClick={(e) => store.toggleDomain(d.key, e.shiftKey || e.metaKey)}
            title={`${d.name}${d.description ? " — " + d.description : ""}\nKlik: tampil/sembunyi · Shift+klik: hanya domain ini`}
            data-testid={`c4-chip-${d.key}`}
          >
            <i />
            {d.name}
            <b>{n}</b>
          </button>
        );
      })}
    </div>
  );
}

export function LineLegend() {
  const items: [string, string, string][] = [
    ["uses", "9 6", "memakai"],
    ["calls", "15 6", "panggil API"],
    ["data", "2 6", "baca/tulis data"],
    ["fk", "6 4 1 4", "foreign key"],
    ["external", "16 5 2 5", "layanan luar"],
    ["schedules", "1 9", "terjadwal"],
  ];
  return (
    <div className="c4-linelegend" aria-label="Jenis garis">
      {items.map(([k, d, l]) => (
        <span key={k}>
          <svg width="34" height="8" aria-hidden="true">
            <path d="M0 4H34" stroke="currentColor" strokeWidth="1.8" strokeDasharray={d} strokeLinecap={k === "data" || k === "schedules" ? "round" : "butt"} />
          </svg>
          {l}
        </span>
      ))}
    </div>
  );
}
