// Tab pengelolaan: tabel CRUD elemen / relasi / domain dan riwayat sinkronisasi.
import { useEffect, useMemo, useRef, useState } from "react";
import type { C4Store } from "@/hooks/useC4";
import { c4Api, errMessage } from "@/lib/c4/api";
import { colorOf, domainColor } from "@/lib/c4/graph";
import type { C4Domain, C4Element, C4Relation, C4SyncRun } from "@/lib/c4/types";
import { Badge, Btn, relTime, useDebounced } from "./ui";
import { Icon } from "./icons";

const PAGE = 40;

export interface ManageOps {
  newElement: () => void;
  editElement: (e: C4Element) => void;
  deleteElement: (e: C4Element) => void;
  newRelation: () => void;
  editRelation: (r: C4Relation) => void;
  deleteRelation: (r: C4Relation) => void;
  newDomain: () => void;
  editDomain: (d: C4Domain) => void;
  deleteDomain: (d: C4Domain) => void;
  showInDiagram: (key: string) => void;
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <div className="c4-pager">
      <span>
        {total === 0 ? 0 : page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} dari {total}
      </span>
      <Btn size="sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>
        ‹
      </Btn>
      <span>
        {page + 1}/{pages}
      </span>
      <Btn size="sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
        ›
      </Btn>
    </div>
  );
}

function stateBadges(x: { source: string; state: string; hidden: boolean; overridden: string[] }) {
  return (
    <div className="c4-badges">
      <Badge tone={x.source === "manual" ? "info" : "mute"}>{x.source === "manual" ? "Manual" : "Otomatis"}</Badge>
      {x.state === "stale" && <Badge tone="warn">Basi</Badge>}
      {x.hidden && <Badge tone="mute">Tersembunyi</Badge>}
      {x.overridden.length > 0 && <Badge tone="ok">Override</Badge>}
    </div>
  );
}

function ElementsTable({ store, ops }: { store: C4Store; ops: ManageOps }) {
  const g = store.graph!;
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("");
  const [st, setSt] = useState("");
  const [kind, setKind] = useState("");
  const [dom, setDom] = useState("");
  const [page, setPage] = useState(0);
  const dq = useDebounced(q, 150);
  const rows = useMemo(() => {
    const n = dq.trim().toLowerCase();
    return g.elements.filter((e) => {
      if (src && e.source !== src) return false;
      if (kind && e.kind !== kind) return false;
      if (dom && e.domain_key !== dom) return false;
      if (st === "stale" && e.state !== "stale") return false;
      if (st === "hidden" && !e.hidden) return false;
      if (st === "override" && !e.overridden.length) return false;
      if (n && !(e.name.toLowerCase().includes(n) || e.key.toLowerCase().includes(n) || (e.description ?? "").toLowerCase().includes(n))) return false;
      return true;
    });
  }, [g.elements, dq, src, st, kind, dom]);
  useEffect(() => setPage(0), [dq, src, st, kind, dom]);
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  return (
    <div className="c4-table-wrap">
      <div className="c4-filters">
        <div className="c4-search c4-search--inline">
          <Icon name="search" size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / kunci / deskripsi…" data-testid="c4-el-search" />
        </div>
        <select className="c4-select" value={src} onChange={(e) => setSrc(e.target.value)} aria-label="Sumber">
          <option value="">Semua sumber</option>
          <option value="auto">Otomatis</option>
          <option value="manual">Manual</option>
        </select>
        <select className="c4-select" value={st} onChange={(e) => setSt(e.target.value)} aria-label="Status">
          <option value="">Semua status</option>
          <option value="stale">Basi</option>
          <option value="hidden">Tersembunyi</option>
          <option value="override">Dioverride</option>
        </select>
        <select className="c4-select" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Jenis">
          <option value="">Semua jenis</option>
          {["person", "system", "external", "container", "datastore", "component", "table"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <select className="c4-select" value={dom} onChange={(e) => setDom(e.target.value)} aria-label="Domain">
          <option value="">Semua domain</option>
          {g.domains.map((d) => (
            <option key={d.key} value={d.key}>
              {d.name}
            </option>
          ))}
        </select>
        <div className="c4-toolbar__spacer" />
        <Btn icon="plus" variant="solid" size="sm" onClick={ops.newElement} testId="c4-new-element">
          Elemen manual
        </Btn>
      </div>
      <table className="c4-table" data-testid="c4-el-table">
        <thead>
          <tr>
            <th />
            <th>Nama</th>
            <th>Jenis</th>
            <th>L</th>
            <th>Domain</th>
            <th>Status</th>
            <th>Diubah</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {view.map((e) => (
            <tr key={e.key} className={`${e.state === "stale" ? "is-stale" : ""}${e.hidden ? " is-hidden" : ""}`} data-testid="c4-el-row">
              <td>
                <i className="c4-dot" style={{ background: colorOf(e, store.idx!) }} />
              </td>
              <td>
                <b>{e.name}</b>
                <small>{e.key}</small>
              </td>
              <td>{e.kind}</td>
              <td>{e.level}</td>
              <td>{g.domains.find((d) => d.key === e.domain_key)?.name ?? e.domain_key}</td>
              <td>{stateBadges(e)}</td>
              <td className="c4-muted">{relTime(e.last_seen_at)}</td>
              <td className="c4-rowops">
                <Btn size="sm" icon="diagram" title="Lihat di diagram" onClick={() => ops.showInDiagram(e.key)} />
                <Btn size="sm" icon="edit" title="Ubah" onClick={() => ops.editElement(e)} testId="c4-row-edit" />
                {e.source === "auto" && (e.overridden.length > 0 || e.hidden) && <Btn size="sm" icon="reset" title="Reset ke hasil scan" onClick={() => void store.actions.resetElement(e.id)} />}
                {!(e.source === "auto" && e.hidden) && <Btn size="sm" variant="danger" icon={e.source === "auto" ? "eyeoff" : "trash"} title={e.source === "auto" ? "Sembunyikan" : "Hapus"} onClick={() => ops.deleteElement(e)} testId="c4-row-delete" />}
              </td>
            </tr>
          ))}
          {view.length === 0 && (
            <tr>
              <td colSpan={8} className="c4-muted c4-center">
                Tidak ada elemen yang cocok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Pager page={page} total={rows.length} onPage={setPage} />
    </div>
  );
}

function RelationsTable({ store, ops }: { store: C4Store; ops: ManageOps }) {
  const g = store.graph!;
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("");
  const [st, setSt] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(0);
  const dq = useDebounced(q, 150);
  const name = (k: string) => store.idx!.byKey.get(k)?.name ?? k;
  const rows = useMemo(() => {
    const n = dq.trim().toLowerCase();
    return g.relations.filter((r) => {
      if (src && r.source !== src) return false;
      if (kind && r.kind !== kind) return false;
      if (st === "stale" && r.state !== "stale") return false;
      if (st === "hidden" && !r.hidden) return false;
      if (st === "override" && !r.overridden.length) return false;
      if (n && !(name(r.from).toLowerCase().includes(n) || name(r.to).toLowerCase().includes(n) || (r.label ?? "").toLowerCase().includes(n))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.relations, dq, src, st, kind]);
  useEffect(() => setPage(0), [dq, src, st, kind]);
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  return (
    <div className="c4-table-wrap">
      <div className="c4-filters">
        <div className="c4-search c4-search--inline">
          <Icon name="search" size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari asal / tujuan / label…" data-testid="c4-rel-search" />
        </div>
        <select className="c4-select" value={src} onChange={(e) => setSrc(e.target.value)} aria-label="Sumber">
          <option value="">Semua sumber</option>
          <option value="auto">Otomatis</option>
          <option value="manual">Manual</option>
        </select>
        <select className="c4-select" value={st} onChange={(e) => setSt(e.target.value)} aria-label="Status">
          <option value="">Semua status</option>
          <option value="stale">Basi</option>
          <option value="hidden">Tersembunyi</option>
          <option value="override">Dioverride</option>
        </select>
        <select className="c4-select" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Jenis">
          <option value="">Semua jenis</option>
          {["uses", "calls", "data", "fk", "external", "inbound", "schedules"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <div className="c4-toolbar__spacer" />
        <Btn icon="plus" variant="solid" size="sm" onClick={ops.newRelation} testId="c4-new-relation">
          Relasi manual
        </Btn>
      </div>
      <table className="c4-table" data-testid="c4-rel-table">
        <thead>
          <tr>
            <th />
            <th>Dari</th>
            <th>Ke</th>
            <th>Jenis</th>
            <th>Label</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {view.map((r) => (
            <tr key={r.key} className={`${r.state === "stale" ? "is-stale" : ""}${r.hidden ? " is-hidden" : ""}`} data-testid="c4-rel-row">
              <td>
                <i className="c4-dot" style={{ background: domainColor(r.domain_key ?? store.idx!.byKey.get(r.from)?.domain_key, store.idx!) }} />
              </td>
              <td>{name(r.from)}</td>
              <td>{name(r.to)}</td>
              <td>
                <span className={`c4-rel__kind c4-rel__kind--${r.kind}`}>{r.kind}</span>
              </td>
              <td className="c4-muted">{r.label}</td>
              <td>{stateBadges(r)}</td>
              <td className="c4-rowops">
                <Btn size="sm" icon="edit" title="Ubah" onClick={() => ops.editRelation(r)} testId="c4-row-edit" />
                {r.hidden && r.source === "auto" ? (
                  <Btn size="sm" icon="eye" title="Tampilkan" onClick={() => void store.actions.updateRelation(r.id, { is_hidden: false }, "Relasi ditampilkan.")} />
                ) : (
                  <Btn size="sm" variant="danger" icon={r.source === "auto" ? "eyeoff" : "trash"} title={r.source === "auto" ? "Sembunyikan" : "Hapus"} onClick={() => ops.deleteRelation(r)} testId="c4-row-delete" />
                )}
              </td>
            </tr>
          ))}
          {view.length === 0 && (
            <tr>
              <td colSpan={7} className="c4-muted c4-center">
                Tidak ada relasi yang cocok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Pager page={page} total={rows.length} onPage={setPage} />
    </div>
  );
}

function DomainsTable({ store, ops }: { store: C4Store; ops: ManageOps }) {
  const g = store.graph!;
  return (
    <div className="c4-table-wrap">
      <div className="c4-filters">
        <p className="c4-muted">Setiap domain punya satu warna yang dipakai node, garis, dan batas di diagram.</p>
        <div className="c4-toolbar__spacer" />
        <Btn icon="plus" variant="solid" size="sm" onClick={ops.newDomain} testId="c4-new-domain">
          Domain baru
        </Btn>
      </div>
      <table className="c4-table" data-testid="c4-dom-table">
        <thead>
          <tr>
            <th />
            <th>Domain</th>
            <th>Deskripsi</th>
            <th>Elemen</th>
            <th>Sumber</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {g.domains.map((d) => (
            <tr key={d.key} data-testid="c4-dom-row">
              <td>
                <i className="c4-swatch" style={{ background: d.color, boxShadow: `0 0 12px ${d.color}` }} />
              </td>
              <td>
                <b>{d.name}</b>
                <small>{d.key}</small>
              </td>
              <td className="c4-muted">{d.description}</td>
              <td>{d.element_count}</td>
              <td>
                <Badge tone={d.source === "manual" ? "info" : "mute"}>{d.source === "manual" ? "Manual" : "Bawaan"}</Badge>
              </td>
              <td className="c4-rowops">
                <Btn size="sm" icon="edit" title="Ubah" onClick={() => ops.editDomain(d)} testId="c4-row-edit" />
                {d.key !== "core" && <Btn size="sm" variant="danger" icon="trash" title="Hapus" onClick={() => ops.deleteDomain(d)} testId="c4-row-delete" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SyncPanel({ store }: { store: C4Store }) {
  const [runs, setRuns] = useState<C4SyncRun[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const lastId = store.graph?.last_sync?.id;
  useEffect(() => {
    let alive = true;
    c4Api
      .syncRuns(15)
      .then((r) => alive && setRuns(r))
      .catch((e) => alive && setErr(errMessage(e)));
    return () => {
      alive = false;
    };
  }, [lastId]);
  const stale = (store.graph?.elements.filter((e) => e.state === "stale").length ?? 0) + (store.graph?.relations.filter((r) => r.state === "stale").length ?? 0);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const payload = JSON.parse(await f.text());
      await store.ingest(payload);
    } catch {
      store.toast("err", "Berkas bukan JSON hasil scripts/c4-scan-frontend.mjs.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="c4-table-wrap">
      <div className="c4-cards">
        <div className="c4-card">
          <h4>Sinkronisasi otomatis</h4>
          <p>
            C4 membaca website secara <b>read-only</b> (skema DB, kode, route, scheduler, konfigurasi). Berjalan otomatis tiap jam, setelah <code>php artisan migrate</code>, lewat CLI <code>php artisan c4:sync</code>, atau tombol di bawah. Hasil hanya ditulis ke tabel <code>c4_*</code>.
          </p>
          <div className="c4-actions">
            <Btn variant="accent" icon="sync" onClick={() => void store.sync(false)} disabled={store.syncing} testId="c4-sync-now">
              {store.syncing ? "Menyinkron…" : "Sinkronkan sekarang"}
            </Btn>
            <Btn icon="bolt" onClick={() => void store.sync(true)} disabled={store.syncing} testId="c4-sync-dry">
              Simulasi (tanpa simpan)
            </Btn>
          </div>
        </div>
        <div className="c4-card">
          <h4>Hasil scan frontend</h4>
          <p>
            Jalankan <code>node scripts/c4-scan-frontend.mjs</code> di repo frontend lalu unggah <code>c4-frontend.json</code> di sini (atau kirim otomatis dari CI dengan token).
          </p>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e.target.files?.[0])} data-testid="c4-ingest-file" />
          <Btn icon="upload" onClick={() => fileRef.current?.click()}>
            Unggah hasil scan
          </Btn>
        </div>
        <div className="c4-card">
          <h4>Item basi</h4>
          <p>
            <b>{stale}</b> elemen/relasi sudah tidak ditemukan di website. Tetap disimpan agar catatan manualmu aman; bersihkan jika sudah tidak perlu.
          </p>
          <Btn variant="danger" icon="trash" disabled={!stale} onClick={() => void store.actions.purgeStale()} testId="c4-purge">
            Bersihkan item basi
          </Btn>
        </div>
      </div>

      <h4 className="c4-h4">Riwayat sinkronisasi</h4>
      {err && <div className="c4-note c4-note--err">{err}</div>}
      <ul className="c4-runs" data-testid="c4-runs">
        {runs.map((r) => {
          const el = r.stats?.elements;
          const rel = r.stats?.relations;
          return (
            <li key={r.id} className={`c4-run c4-run--${r.status}`}>
              <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <Badge tone={r.status === "ok" ? "ok" : r.status === "partial" ? "warn" : r.status === "failed" ? "err" : "info"}>{r.status}</Badge>
                <b>#{r.id}</b>
                <span>{r.trigger}</span>
                <span className="c4-muted">{relTime(r.started_at)}</span>
                <span className="c4-muted">{r.duration_ms != null ? `${r.duration_ms} ms` : ""}</span>
                <span className="c4-run__stats">
                  {el ? `+${el.added} ~${el.updated} −${el.stale} ↺${el.restored} elemen` : ""}
                  {rel ? ` · +${rel.added} ~${rel.updated} −${rel.stale} relasi` : ""}
                </span>
                {r.stats?.dry_run && <Badge tone="mute">simulasi</Badge>}
              </button>
              {open === r.id && (
                <div className="c4-run__detail">
                  {r.error && <div className="c4-note c4-note--err">{r.error}</div>}
                  {(r.warnings ?? []).map((w, i) => (
                    <div key={i} className="c4-note c4-note--warn">
                      {w}
                    </div>
                  ))}
                  {(r.changes ?? []).length === 0 ? (
                    <p className="c4-muted">Tidak ada perubahan.</p>
                  ) : (
                    <ul>
                      {(r.changes ?? []).slice(0, 80).map((c, i) => (
                        <li key={i}>
                          <Badge tone={c.action === "added" ? "ok" : c.action === "stale" ? "warn" : "mute"}>{c.action}</Badge> {c.type} · {c.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {runs.length === 0 && <li className="c4-muted">Belum ada riwayat.</li>}
      </ul>
    </div>
  );
}

export function Manage({ store, ops, tab }: { store: C4Store; ops: ManageOps; tab: "elements" | "relations" | "domains" | "sync" }) {
  if (!store.graph || !store.idx) return null;
  return (
    <div className="c4-manage" data-testid={`c4-manage-${tab}`}>
      {tab === "elements" && <ElementsTable store={store} ops={ops} />}
      {tab === "relations" && <RelationsTable store={store} ops={ops} />}
      {tab === "domains" && <DomainsTable store={store} ops={ops} />}
      {tab === "sync" && <SyncPanel store={store} />}
    </div>
  );
}
