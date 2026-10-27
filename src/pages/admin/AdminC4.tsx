// Halaman /admin/c4 — dokumentasi arsitektur Livora (model C4) yang hidup.
// Data dibaca dari tabel c4_* (diisi otomatis dari website); perubahan di sini tidak menyentuh website.
import { useCallback, useEffect, useState } from "react";
import { useC4 } from "@/hooks/useC4";
import { viewForElement } from "@/lib/c4/graph";
import type { C4Domain, C4Element, C4Kind, C4Relation } from "@/lib/c4/types";
import { Canvas, type Reveal } from "@/components/c4/Canvas";
import { Legend, LineLegend, Toolbar } from "@/components/c4/Toolbar";
import { Inspector, type InspectorOps } from "@/components/c4/Inspector";
import { DomainForm, ElementForm, RelationForm } from "@/components/c4/Forms";
import { Manage } from "@/components/c4/Manage";
import { Btn, Confirm, ToastHost, relTime } from "@/components/c4/ui";
import { Icon } from "@/components/c4/icons";
import "@/styles/c4.css";

type Tab = "diagram" | "elements" | "relations" | "domains" | "sync";
type Dialog =
  | { t: "el"; element?: C4Element; preset?: Partial<{ level: number; kind: C4Kind; parent_key: string; domain_key: string }> }
  | { t: "rel"; relation?: C4Relation; preset?: Partial<{ from_key: string; to_key: string }> }
  | { t: "dom"; domain?: C4Domain }
  | { t: "del-el"; element: C4Element }
  | { t: "del-rel"; relation: C4Relation }
  | { t: "del-dom"; domain: C4Domain }
  | null;

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "diagram", label: "Diagram", icon: "diagram" },
  { id: "elements", label: "Elemen", icon: "layers" },
  { id: "relations", label: "Relasi", icon: "link" },
  { id: "domains", label: "Domain", icon: "grid" },
  { id: "sync", label: "Sinkronisasi", icon: "history" },
];

export default function AdminC4() {
  const store = useC4();
  const [tab, setTab] = useState<Tab>("diagram");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  const doReveal = useCallback((key: string) => setReveal((r) => ({ key, n: (r?.n ?? 0) + 1 })), []);

  // "/" memfokuskan pencarian
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && t && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && tab === "diagram") {
        e.preventDefault();
        document.getElementById("c4-search")?.focus();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [tab]);

  const jump = useCallback(
    (key: string) => {
      const el = store.idx?.byKey.get(key);
      if (!el) return;
      setTab("diagram");
      if (store.viewModel?.nodes.some((n) => n.key === key)) store.setSelection({ type: "node", key });
      else store.setView(viewForElement(el, store.idx!), { select: key });
      doReveal(key);
    },
    [store, doReveal],
  );

  const ops: InspectorOps = {
    editElement: (e) => setDialog({ t: "el", element: e }),
    addRelation: (fromKey) => setDialog({ t: "rel", preset: { from_key: fromKey } }),
    addChild: (p) => setDialog({ t: "el", preset: { parent_key: p.key, level: Math.min(4, p.level + 1), kind: p.kind === "datastore" ? "table" : "component", domain_key: p.domain_key ?? "core" } }),
    editRelation: (r) => setDialog({ t: "rel", relation: r }),
    deleteElement: (e) => setDialog({ t: "del-el", element: e }),
    deleteRelation: (r) => setDialog({ t: "del-rel", relation: r }),
    jump,
  };

  const g = store.graph;
  const last = g?.last_sync;

  return (
    <div className="c4-root" data-testid="c4-page">
      <header className="c4-header">
        <div className="c4-brand">
          <span className="c4-brand__mark" aria-hidden="true">
            <Icon name="layers" size={18} />
          </span>
          <div>
            <h1>Livora C4</h1>
            <p>Peta arsitektur yang diperbarui otomatis dari website</p>
          </div>
        </div>
        <nav className="c4-maintabs" role="tablist" aria-label="Bagian C4">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)} data-testid={`c4-main-${t.id}`}>
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="c4-header__meta">
          {g && (
            <>
              <span title="Jumlah elemen & relasi">
                <b>{g.elements.length}</b> elemen · <b>{g.relations.length}</b> relasi
              </span>
              <span title={last?.finished_at ?? ""} data-testid="c4-lastsync">
                <i className={`c4-pulse c4-pulse--${last?.status ?? "none"}`} />
                {last ? `sinkron ${relTime(last.finished_at ?? last.started_at)}` : "belum pernah sinkron"}
              </span>
            </>
          )}
          <span className="c4-iso" title={g?.isolation}>
            <Icon name="shield" size={14} /> Isolasi: C4 → website 🔒 satu arah
          </span>
        </div>
      </header>

      {store.loading && !g && (
        <div className="c4-state" data-testid="c4-loading">
          <span className="c4-spinner" /> Memuat model C4…
        </div>
      )}
      {store.error && !g && (
        <div className="c4-state c4-state--err" data-testid="c4-error">
          <Icon name="alert" size={22} />
          <p>{store.error}</p>
          <p className="c4-muted">Halaman ini hanya untuk akun owner, dan migrasi c4_* harus sudah dijalankan.</p>
          <Btn onClick={() => void store.reload()}>Coba lagi</Btn>
        </div>
      )}

      {g && tab === "diagram" && (
        <div className="c4-main">
          <Toolbar store={store} onReveal={doReveal} />
          <Legend store={store} />
          <div className="c4-stage">
            <Canvas store={store} reveal={reveal} />
            {store.viewModel && (
              <div className="c4-titlecard" data-testid="c4-title">
                <h2>{store.viewModel.title}</h2>
                <p>{store.viewModel.subtitle}</p>
                <small>
                  {store.viewModel.nodes.length} elemen · {store.viewModel.edges.length} garis · klik: detail · klik-ganda: buka · seret: pindah
                </small>
              </div>
            )}
            <LineLegend />
            <Inspector store={store} ops={ops} />
          </div>
        </div>
      )}

      {g && tab !== "diagram" && (
        <Manage
          store={store}
          tab={tab}
          ops={{
            newElement: () => setDialog({ t: "el" }),
            editElement: (e) => setDialog({ t: "el", element: e }),
            deleteElement: (e) => setDialog({ t: "del-el", element: e }),
            newRelation: () => setDialog({ t: "rel" }),
            editRelation: (r) => setDialog({ t: "rel", relation: r }),
            deleteRelation: (r) => setDialog({ t: "del-rel", relation: r }),
            newDomain: () => setDialog({ t: "dom" }),
            editDomain: (d) => setDialog({ t: "dom", domain: d }),
            deleteDomain: (d) => setDialog({ t: "del-dom", domain: d }),
            showInDiagram: jump,
          }}
        />
      )}

      {dialog?.t === "el" && <ElementForm store={store} element={dialog.element} preset={dialog.preset} onClose={() => setDialog(null)} />}
      {dialog?.t === "rel" && <RelationForm store={store} relation={dialog.relation} preset={dialog.preset} onClose={() => setDialog(null)} />}
      {dialog?.t === "dom" && <DomainForm store={store} domain={dialog.domain} onClose={() => setDialog(null)} />}
      {dialog?.t === "del-el" && (
        <Confirm
          title={dialog.element.source === "auto" ? "Sembunyikan elemen otomatis?" : "Hapus elemen manual?"}
          danger
          confirmLabel={dialog.element.source === "auto" ? "Sembunyikan" : "Hapus"}
          text={
            dialog.element.source === "auto" ? (
              <>
                <b>{dialog.element.name}</b> hanya disembunyikan dari diagram — komponen aslinya di website tidak disentuh. Bisa dipulihkan kapan saja dari tab Elemen.
              </>
            ) : (
              <>
                <b>{dialog.element.name}</b> beserta relasi manualnya akan dihapus permanen dari C4. Website tidak terpengaruh.
              </>
            )
          }
          onNo={() => setDialog(null)}
          onYes={() => {
            const el = dialog.element;
            setDialog(null);
            store.setSelection(null);
            void store.actions.deleteElement(el.id);
          }}
        />
      )}
      {dialog?.t === "del-rel" && (
        <Confirm
          title={dialog.relation.source === "auto" ? "Sembunyikan relasi otomatis?" : "Hapus relasi manual?"}
          danger
          confirmLabel={dialog.relation.source === "auto" ? "Sembunyikan" : "Hapus"}
          text="Hanya mengubah catatan C4. Kode dan data website tidak berubah."
          onNo={() => setDialog(null)}
          onYes={() => {
            const r = dialog.relation;
            setDialog(null);
            void store.actions.deleteRelation(r.id);
          }}
        />
      )}
      {dialog?.t === "del-dom" && (
        <Confirm
          title="Hapus domain?"
          danger
          confirmLabel="Hapus"
          text={
            <>
              Domain <b>{dialog.domain.name}</b> dihapus. Domain yang masih dipakai elemen/relasi akan ditolak — pindahkan dulu.
            </>
          }
          onNo={() => setDialog(null)}
          onYes={() => {
            const d = dialog.domain;
            setDialog(null);
            void store.actions.deleteDomain(d.id);
          }}
        />
      )}

      <ToastHost toasts={store.toasts} dismiss={store.dismissToast} />
    </div>
  );
}
