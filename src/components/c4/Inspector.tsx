// Panel detail di kanan: info elemen / relasi terpilih + aksi CRUD.
import { useMemo } from "react";
import type { C4Store } from "@/hooks/useC4";
import { colorOf, domainColor, drillTarget, labelOfKind } from "@/lib/c4/graph";
import type { C4Element, C4Relation } from "@/lib/c4/types";
import { Badge, Btn, relTime } from "./ui";
import { Icon } from "./icons";
import { KIND_LABEL } from "./DiagramParts";

export interface InspectorOps {
  editElement: (e: C4Element) => void;
  addRelation: (fromKey: string) => void;
  addChild: (parent: C4Element) => void;
  editRelation: (r: C4Relation) => void;
  deleteElement: (e: C4Element) => void;
  deleteRelation: (r: C4Relation) => void;
  jump: (key: string) => void;
}

interface Endpoint {
  methods?: string[];
  uri?: string;
  action?: string;
  guard?: string | null;
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="c4-kv">
      <span>{k}</span>
      <div>{children}</div>
    </div>
  );
}

export function StateBadges({ x }: { x: { source: string; state: string; hidden: boolean; overridden: string[] } }) {
  return (
    <>
      <Badge tone={x.source === "manual" ? "info" : "mute"}>{x.source === "manual" ? "Manual" : "Otomatis"}</Badge>
      {x.state === "stale" && <Badge tone="warn">Basi — sudah hilang dari website</Badge>}
      {x.hidden && <Badge tone="mute">Tersembunyi</Badge>}
      {x.overridden.length > 0 && <Badge tone="ok">Dioverride: {x.overridden.join(", ")}</Badge>}
    </>
  );
}

export function Inspector({ store, ops }: { store: C4Store; ops: InspectorOps }) {
  const { selection, idx, graph, viewModel } = store;
  const open = !!selection && !!idx && !!graph;

  const body = useMemo(() => {
    if (!selection || !idx || !graph) return null;
    return selection.type === "node" ? "node" : "edge";
  }, [selection, idx, graph]);

  if (!open || !body || !idx || !graph) return null;

  if (selection!.type === "edge") {
    const edge = viewModel?.edges.find((e) => e.id === (selection as { id: string }).id);
    if (!edge) return null;
    const a = idx.byKey.get(edge.from);
    const b = idx.byKey.get(edge.to);
    return (
      <aside className="c4-inspector" data-testid="c4-inspector" style={{ "--c": edge.domain ? domainColor(edge.domain, idx) : "#94a3b8" } as React.CSSProperties}>
        <header>
          <div className="c4-inspector__kind">RELASI · {edge.relations.length} garis</div>
          <h3>
            <button type="button" className="c4-link" onClick={() => ops.jump(edge.from)}>
              {a?.name}
            </button>
            <Icon name="drill" size={14} />
            <button type="button" className="c4-link" onClick={() => ops.jump(edge.to)}>
              {b?.name}
            </button>
          </h3>
          <Btn icon="close" size="sm" onClick={() => store.setSelection(null)} title="Tutup" />
        </header>
        <div className="c4-inspector__scroll">
          {edge.relations.length > 1 && <p className="c4-muted">Garis ini merangkum {edge.relations.length} relasi level lebih rendah (roll-up C4).</p>}
          <ul className="c4-rels">
            {edge.relations.map((r) => (
              <RelItem key={r.id} r={r} store={store} ops={ops} dir="out" showEnds />
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  const el = idx.byKey.get((selection as { key: string }).key);
  if (!el) return null;
  const color = colorOf(el, idx);
  const dom = idx.domains.get(el.domain_key ?? "");
  const out = idx.outgoing.get(el.key) ?? [];
  const inc = idx.incoming.get(el.key) ?? [];
  const drill = drillTarget(el, idx);
  const cols: { name: string; type: string; pk?: boolean; fk?: string | null; nullable?: boolean }[] = Array.isArray(el.meta?.columns) ? el.meta.columns : [];
  const endpoints: Endpoint[] = Array.isArray(el.meta?.endpoints) ? el.meta.endpoints : [];
  const children = (idx.children.get(el.key) ?? []).length;

  return (
    <aside className="c4-inspector" data-testid="c4-inspector" style={{ "--c": color } as React.CSSProperties}>
      <header>
        <div className="c4-inspector__kind">
          <Icon name={el.kind} size={14} /> {KIND_LABEL[el.kind] ?? el.kind} · LEVEL {el.level}
        </div>
        <h3 data-testid="c4-inspector-title">{el.name}</h3>
        <Btn icon="close" size="sm" onClick={() => store.setSelection(null)} title="Tutup" />
      </header>

      <div className="c4-inspector__scroll">
        <div className="c4-badges">
          <StateBadges x={el} />
        </div>

        <div className="c4-actions">
          <Btn size="sm" icon="focus" onClick={() => store.setView({ kind: "focus", scope: el.key })} testId="c4-act-focus">
            Fokus
          </Btn>
          {drill && drill.kind === "level" && drill.level >= 3 && (
            <Btn size="sm" icon="drill" onClick={() => store.setView(drill)} testId="c4-act-drill">
              Buka isi
            </Btn>
          )}
          <Btn size="sm" icon="edit" onClick={() => ops.editElement(el)} testId="c4-act-edit">
            Ubah
          </Btn>
          <Btn size="sm" icon="link" onClick={() => ops.addRelation(el.key)} testId="c4-act-addrel">
            Relasi
          </Btn>
          {(el.kind === "container" || el.kind === "datastore" || el.kind === "system") && (
            <Btn size="sm" icon="plus" onClick={() => ops.addChild(el)}>
              Anak
            </Btn>
          )}
          {el.source === "auto" && el.hidden && (
            <Btn size="sm" icon="eye" onClick={() => void store.actions.updateElement(el.id, { is_hidden: false }, "Elemen ditampilkan lagi.")}>
              Tampilkan
            </Btn>
          )}
          {el.source === "auto" && (el.overridden.length > 0 || el.hidden) && (
            <Btn size="sm" icon="reset" onClick={() => void store.actions.resetElement(el.id)} title="Hapus semua override">
              Reset
            </Btn>
          )}
          {!(el.source === "auto" && el.hidden) && (
            <Btn size="sm" variant="danger" icon={el.source === "auto" ? "eyeoff" : "trash"} onClick={() => ops.deleteElement(el)} testId="c4-act-delete">
              {el.source === "auto" ? "Sembunyikan" : "Hapus"}
            </Btn>
          )}
        </div>

        {el.description && <p className="c4-desc">{el.description}</p>}
        {el.note && <p className="c4-usernote">📝 {el.note}</p>}

        <Row k="Domain">
          <span className="c4-chipmini" style={{ "--c": dom?.color ?? "#94a3b8" } as React.CSSProperties}>
            <i />
            {dom?.name ?? el.domain_key ?? "—"}
          </span>
        </Row>
        {el.technology && <Row k="Teknologi">{el.technology}</Row>}
        <Row k="Kunci">
          <code>{el.key}</code>
        </Row>
        {el.parent_key && (
          <Row k="Induk">
            <button type="button" className="c4-link" onClick={() => ops.jump(el.parent_key!)}>
              {idx.byKey.get(el.parent_key)?.name ?? el.parent_key}
            </button>
          </Row>
        )}
        {children > 0 && <Row k="Isi">{children} elemen di dalamnya</Row>}
        {el.meta?.file && (
          <Row k="Berkas">
            <code>{String(el.meta.file)}</code>
          </Row>
        )}
        {el.meta?.hosts && (
          <Row k="Host">
            <code>{[...new Set(el.meta.hosts as string[])].join(", ")}</code>
          </Row>
        )}
        {el.kind === "external" && el.meta?.configured !== undefined && <Row k="Kredensial">{el.meta.configured ? "Terkonfigurasi di .env" : "Belum terkonfigurasi"}</Row>}
        <Row k="Terlihat">
          {relTime(el.first_seen_at)} → {relTime(el.last_seen_at)}
        </Row>

        {cols.length > 0 && (
          <section>
            <h4>Kolom ({cols.length})</h4>
            <table className="c4-cols">
              <tbody>
                {cols.map((c) => (
                  <tr key={c.name}>
                    <td className={c.pk ? "is-pk" : c.fk ? "is-fk" : ""}>{c.pk ? "◆" : c.fk ? "↗" : ""}</td>
                    <td>{c.name}</td>
                    <td>
                      {c.type}
                      {c.nullable ? "?" : ""}
                    </td>
                    <td className="c4-muted">{c.fk ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {endpoints.length > 0 && (
          <section>
            <h4>Endpoint ({endpoints.length})</h4>
            <ul className="c4-eps">
              {endpoints.slice(0, 40).map((ep, i) => (
                <li key={i}>
                  <b>{(ep.methods ?? []).filter((m) => m !== "HEAD").join("|")}</b>
                  <code>{ep.uri}</code>
                  {ep.guard && <Badge tone="mute">{ep.guard}</Badge>}
                </li>
              ))}
              {endpoints.length > 40 && <li className="c4-muted">+{endpoints.length - 40} lagi</li>}
            </ul>
          </section>
        )}

        <section>
          <h4>Keluar ({out.length})</h4>
          <ul className="c4-rels">
            {out.slice(0, 60).map((r) => (
              <RelItem key={r.id} r={r} store={store} ops={ops} dir="out" />
            ))}
            {out.length === 0 && <li className="c4-muted">Tidak ada.</li>}
          </ul>
        </section>
        <section>
          <h4>Masuk ({inc.length})</h4>
          <ul className="c4-rels">
            {inc.slice(0, 60).map((r) => (
              <RelItem key={r.id} r={r} store={store} ops={ops} dir="in" />
            ))}
            {inc.length === 0 && <li className="c4-muted">Tidak ada.</li>}
          </ul>
        </section>
        <p className="c4-foot">{graph.isolation}</p>
      </div>
    </aside>
  );
}

function RelItem({ r, store, ops, dir, showEnds }: { r: C4Relation; store: C4Store; ops: InspectorOps; dir: "in" | "out"; showEnds?: boolean }) {
  const otherKey = dir === "out" ? r.to : r.from;
  const other = store.idx?.byKey.get(otherKey);
  return (
    <li className={`c4-rel${r.state === "stale" ? " is-stale" : ""}${r.hidden ? " is-hidden" : ""}`} data-testid="c4-rel-item">
      <span className={`c4-rel__kind c4-rel__kind--${r.kind}`}>{r.kind}</span>
      <div className="c4-rel__main">
        {showEnds ? (
          <span>{r.label ?? labelOfKind(r.kind)}</span>
        ) : (
          <button type="button" className="c4-link" onClick={() => ops.jump(otherKey)}>
            {dir === "out" ? "→" : "←"} {other?.name ?? otherKey}
          </button>
        )}
        {!showEnds && r.label && <small>{r.label}</small>}
        {showEnds && (
          <small>
            {store.idx?.byKey.get(r.from)?.name} → {store.idx?.byKey.get(r.to)?.name}
          </small>
        )}
        <div className="c4-badges">
          {r.source === "manual" && <Badge tone="info">Manual</Badge>}
          {r.state === "stale" && <Badge tone="warn">Basi</Badge>}
          {r.hidden && <Badge tone="mute">Tersembunyi</Badge>}
        </div>
      </div>
      <div className="c4-rel__ops">
        {r.hidden && r.source === "auto" ? (
          <Btn size="sm" icon="eye" title="Tampilkan" onClick={() => void store.actions.updateRelation(r.id, { is_hidden: false }, "Relasi ditampilkan.")} />
        ) : (
          <>
            <Btn size="sm" icon="edit" title="Ubah relasi" onClick={() => ops.editRelation(r)} />
            <Btn size="sm" variant="danger" icon={r.source === "auto" ? "eyeoff" : "trash"} title={r.source === "auto" ? "Sembunyikan" : "Hapus"} onClick={() => ops.deleteRelation(r)} />
          </>
        )}
      </div>
    </li>
  );
}
