// Formulir tambah/ubah elemen, relasi, dan domain (modal).
import { useMemo, useState } from "react";
import type { C4Store } from "@/hooks/useC4";
import type { C4Domain, C4Element, C4Kind, C4RelKind, C4Relation } from "@/lib/c4/types";
import { Btn, Field, Modal } from "./ui";

const KINDS: { v: C4Kind; l: string }[] = [
  { v: "person", l: "Pengguna (person)" },
  { v: "system", l: "Sistem" },
  { v: "external", l: "Sistem eksternal" },
  { v: "container", l: "Container" },
  { v: "datastore", l: "Datastore" },
  { v: "component", l: "Komponen" },
  { v: "table", l: "Tabel" },
];
const REL_KINDS: { v: C4RelKind; l: string }[] = [
  { v: "uses", l: "uses — memakai" },
  { v: "calls", l: "calls — memanggil API" },
  { v: "data", l: "data — baca/tulis data" },
  { v: "fk", l: "fk — foreign key" },
  { v: "external", l: "external — layanan luar" },
  { v: "inbound", l: "inbound — webhook masuk" },
  { v: "schedules", l: "schedules — terjadwal" },
];
const DEFAULT_LEVEL: Record<string, number> = { person: 1, system: 1, external: 1, container: 2, datastore: 2, component: 3, table: 4 };

const AUTO_NOTE =
  "Ini item otomatis dari hasil scan website. Perubahanmu disimpan sebagai override di tabel c4_* — scan berikutnya tidak menimpanya, dan website sama sekali tidak berubah.";

export function ElementPicker({ store, value, onChange, label, exclude }: { store: C4Store; value: string; onChange: (v: string) => void; label: string; exclude?: string }) {
  const groups = useMemo(() => {
    const m = new Map<string, C4Element[]>();
    for (const e of store.graph?.elements ?? []) {
      if (e.key === exclude) continue;
      (m.get(e.kind) ?? m.set(e.kind, []).get(e.kind)!).push(e);
    }
    for (const l of m.values()) l.sort((a, b) => a.name.localeCompare(b.name));
    return KINDS.map((k) => ({ ...k, items: m.get(k.v) ?? [] })).filter((g) => g.items.length);
  }, [store.graph, exclude]);
  return (
    <Field label={label}>
      <select className="c4-input" value={value} onChange={(e) => onChange(e.target.value)} data-testid={`c4-pick-${label.toLowerCase().replace(/\W+/g, "-")}`}>
        <option value="">— pilih —</option>
        {groups.map((g) => (
          <optgroup key={g.v} label={g.l}>
            {g.items.map((e) => (
              <option key={e.key} value={e.key}>
                {e.name}
                {e.state === "stale" ? " (basi)" : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </Field>
  );
}

function DomainSelect({ domains, value, onChange }: { domains: C4Domain[]; value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Domain (warna)">
      <select className="c4-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {domains.map((d) => (
          <option key={d.key} value={d.key}>
            {d.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ElementForm({ store, element, preset, onClose }: { store: C4Store; element?: C4Element; preset?: Partial<{ level: number; kind: C4Kind; parent_key: string; domain_key: string }>; onClose: () => void }) {
  const edit = !!element;
  const auto = element?.source === "auto";
  const [name, setName] = useState(element?.name ?? "");
  const [kind, setKind] = useState<C4Kind>(element?.kind ?? preset?.kind ?? "component");
  const [level, setLevel] = useState<number>(element?.level ?? preset?.level ?? DEFAULT_LEVEL[element?.kind ?? preset?.kind ?? "component"]);
  const [tech, setTech] = useState(element?.technology ?? "");
  const [desc, setDesc] = useState(element?.description ?? "");
  const [domain, setDomain] = useState(element?.domain_key ?? preset?.domain_key ?? "core");
  const [parent, setParent] = useState(element?.parent_key ?? preset?.parent_key ?? "");
  const [color, setColor] = useState(element?.color ?? "");
  const [note, setNote] = useState(element?.note ?? "");
  const [err, setErr] = useState("");

  const parents = useMemo(() => (store.graph?.elements ?? []).filter((e) => e.key !== element?.key && e.level < level && e.level >= Math.max(1, level - 1)).sort((a, b) => a.name.localeCompare(b.name)), [store.graph, level, element]);

  const submit = async () => {
    if (!name.trim() && !auto) return setErr("Nama wajib diisi.");
    const base = { name: name.trim() || null, technology: tech || null, description: desc || null, domain_key: domain || null };
    let ok: unknown;
    if (!edit) ok = await store.actions.createElement({ ...base, name: name.trim(), kind, level, parent_key: parent || null });
    else if (auto) ok = await store.actions.updateElement(element!.id, { ...base, color: color || null, note: note || null });
    else ok = await store.actions.updateElement(element!.id, { ...base, name: name.trim(), kind, level, parent_key: parent || null });
    if (ok) onClose();
  };

  return (
    <Modal
      title={edit ? `Ubah elemen — ${element!.name}` : "Tambah elemen manual"}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="solid" onClick={() => void submit()} disabled={store.busy} testId="c4-form-save">
            Simpan
          </Btn>
        </>
      }
    >
      {auto && <div className="c4-note c4-note--auto">{AUTO_NOTE}</div>}
      {err && <div className="c4-note c4-note--err">{err}</div>}
      <Field label="Nama" hint={auto ? "Kosongkan untuk kembali ke nama hasil scan." : undefined}>
        <input className="c4-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus data-testid="c4-form-name" placeholder={auto ? element?.name : "mis. Payment Gateway"} />
      </Field>
      {!auto && (
        <div className="c4-grid2">
          <Field label="Jenis">
            <select
              className="c4-input"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as C4Kind);
                setLevel(DEFAULT_LEVEL[e.target.value]);
              }}
              data-testid="c4-form-kind"
            >
              {KINDS.map((k) => (
                <option key={k.v} value={k.v}>
                  {k.l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Level C4">
            <select className="c4-input" value={level} onChange={(e) => setLevel(Number(e.target.value))} data-testid="c4-form-level">
              {[1, 2, 3, 4].map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {!auto && level > 1 && (
        <Field label="Induk" hint="Container induk (untuk level 3) / datastore (untuk level 4).">
          <select className="c4-input" value={parent} onChange={(e) => setParent(e.target.value)} data-testid="c4-form-parent">
            <option value="">— tanpa induk —</option>
            {parents.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name} ({p.kind})
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Teknologi">
        <input className="c4-input" value={tech} onChange={(e) => setTech(e.target.value)} placeholder="mis. Laravel Service (PHP)" />
      </Field>
      <Field label="Deskripsi">
        <textarea className="c4-input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <DomainSelect domains={store.graph?.domains ?? []} value={domain} onChange={setDomain} />
      {auto && (
        <>
          <Field label="Warna khusus" hint="Opsional — menimpa warna domain untuk elemen ini.">
            <div className="c4-colorrow">
              <input type="color" value={color || "#94a3b8"} onChange={(e) => setColor(e.target.value)} />
              <span>{color || "ikut domain"}</span>
              {color && <Btn size="sm" onClick={() => setColor("")}>Hapus</Btn>}
            </div>
          </Field>
          <Field label="Catatan pribadi">
            <textarea className="c4-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </>
      )}
    </Modal>
  );
}

export function RelationForm({ store, relation, preset, onClose }: { store: C4Store; relation?: C4Relation; preset?: Partial<{ from_key: string; to_key: string }>; onClose: () => void }) {
  const edit = !!relation;
  const auto = relation?.source === "auto";
  const [from, setFrom] = useState(relation?.from ?? preset?.from_key ?? "");
  const [to, setTo] = useState(relation?.to ?? preset?.to_key ?? "");
  const [kind, setKind] = useState<C4RelKind>(relation?.kind ?? "uses");
  const [label, setLabel] = useState(relation?.label ?? "");
  const [tech, setTech] = useState(relation?.technology ?? "");
  const [domain, setDomain] = useState(relation?.domain_key ?? (from && store.idx?.byKey.get(from)?.domain_key) ?? "core");
  const [note, setNote] = useState(relation?.note ?? "");
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!auto && (!from || !to)) return setErr("Pilih elemen asal dan tujuan.");
    if (!auto && from === to) return setErr("Asal dan tujuan tidak boleh sama.");
    let ok: unknown;
    if (!edit) ok = await store.actions.createRelation({ from_key: from, to_key: to, kind, label: label || null, technology: tech || null, domain_key: domain || null });
    else if (auto) ok = await store.actions.updateRelation(relation!.id, { label: label || null, technology: tech || null, domain_key: domain || null, note: note || null });
    else ok = await store.actions.updateRelation(relation!.id, { from_key: from, to_key: to, kind, label: label || null, technology: tech || null, domain_key: domain || null });
    if (ok) onClose();
  };

  return (
    <Modal
      title={edit ? "Ubah relasi" : "Tambah relasi manual"}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="solid" onClick={() => void submit()} disabled={store.busy} testId="c4-form-save">
            Simpan
          </Btn>
        </>
      }
    >
      {auto && <div className="c4-note c4-note--auto">{AUTO_NOTE}</div>}
      {err && <div className="c4-note c4-note--err">{err}</div>}
      {!auto && (
        <>
          <ElementPicker store={store} label="Dari" value={from} onChange={setFrom} exclude={to} />
          <ElementPicker store={store} label="Ke" value={to} onChange={setTo} exclude={from} />
          <Field label="Jenis relasi">
            <select className="c4-input" value={kind} onChange={(e) => setKind(e.target.value as C4RelKind)}>
              {REL_KINDS.map((k) => (
                <option key={k.v} value={k.v}>
                  {k.l}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
      {auto && (
        <div className="c4-note">
          {store.idx?.byKey.get(relation!.from)?.name} → {store.idx?.byKey.get(relation!.to)?.name} ({relation!.kind})
        </div>
      )}
      <Field label="Label">
        <input className="c4-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Mengirim notifikasi" data-testid="c4-form-label" />
      </Field>
      <Field label="Teknologi / protokol">
        <input className="c4-input" value={tech} onChange={(e) => setTech(e.target.value)} placeholder="mis. HTTPS/JSON" />
      </Field>
      <DomainSelect domains={store.graph?.domains ?? []} value={domain ?? "core"} onChange={setDomain} />
      {auto && (
        <Field label="Catatan pribadi">
          <textarea className="c4-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      )}
    </Modal>
  );
}

export function DomainForm({ store, domain, onClose }: { store: C4Store; domain?: C4Domain; onClose: () => void }) {
  const edit = !!domain;
  const [key, setKey] = useState(domain?.key ?? "");
  const [name, setName] = useState(domain?.name ?? "");
  const [color, setColor] = useState(domain?.color ?? "#22d3ee");
  const [desc, setDesc] = useState(domain?.description ?? "");
  const [order, setOrder] = useState<string>(domain ? String(domain.sort_order) : "");
  const [err, setErr] = useState("");
  const submit = async () => {
    if (!name.trim()) return setErr("Nama wajib diisi.");
    if (!edit && !/^[a-z0-9_-]+$/.test(key)) return setErr("Kunci hanya boleh huruf kecil, angka, - dan _.");
    const payload = { name: name.trim(), color, description: desc || null, sort_order: order === "" ? null : Number(order) };
    const ok = edit ? await store.actions.updateDomain(domain!.id, payload) : await store.actions.createDomain({ ...payload, key });
    if (ok) onClose();
  };
  return (
    <Modal
      title={edit ? `Ubah domain — ${domain!.name}` : "Tambah domain"}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="solid" onClick={() => void submit()} disabled={store.busy} testId="c4-form-save">
            Simpan
          </Btn>
        </>
      }
    >
      {err && <div className="c4-note c4-note--err">{err}</div>}
      {!edit && (
        <Field label="Kunci unik" hint="huruf kecil, angka, - atau _">
          <input className="c4-input" value={key} onChange={(e) => setKey(e.target.value.toLowerCase())} data-testid="c4-form-key" />
        </Field>
      )}
      <Field label="Nama">
        <input className="c4-input" value={name} onChange={(e) => setName(e.target.value)} data-testid="c4-form-name" />
      </Field>
      <Field label="Warna">
        <div className="c4-colorrow">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} data-testid="c4-form-color" />
          <span>{color}</span>
        </div>
      </Field>
      <Field label="Deskripsi">
        <textarea className="c4-input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <Field label="Urutan">
        <input className="c4-input" type="number" min={0} value={order} onChange={(e) => setOrder(e.target.value)} />
      </Field>
    </Modal>
  );
}
