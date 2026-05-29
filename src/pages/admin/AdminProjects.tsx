import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { Pencil, Trash2, Plus, Image as ImageIcon } from "lucide-react";
import AdminProjectPhotos from "./AdminProjectPhotos";

type Project = any;

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scopes, setScopes] = useState<any[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [managingPhotos, setManagingPhotos] = useState<Project | null>(null);

  const load = () => api.get("/projects").then((r) => setProjects(r.data));
  useEffect(() => {
    load();
    api.get("/taxonomies/scopes").then((r) => setScopes(r.data));
  }, []);

  const del = async (p: Project) => {
    if (!confirm(`Hapus project "${p.title}"?`)) return;
    await api.delete(`/admin/projects/${p.id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Manage</p>
          <h1 className="serif text-4xl">Projects</h1>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {projects.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="aspect-[4/3] bg-muted">
              {p.hero_image ? (
                <img src={imgUrl(p.hero_image)} alt={p.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{p.scope?.name || "—"}</p>
              <h3 className="serif text-xl mt-1">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.subtitle}</p>
              <div className="flex gap-2 mt-4 text-xs">
                <button onClick={() => { setEditing(p); setShowForm(true); }} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded hover:bg-muted">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => setManagingPhotos(p)} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded hover:bg-muted">
                  <ImageIcon className="w-3 h-3" /> Photos ({p.photos?.length || 0})
                </button>
                <button onClick={() => del(p)} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded hover:bg-destructive hover:text-destructive-foreground ml-auto">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="col-span-3 text-sm text-muted-foreground">Belum ada project.</p>
        )}
      </div>

      {showForm && (
        <ProjectForm
          project={editing}
          scopes={scopes}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
      {managingPhotos && (
        <AdminProjectPhotos
          project={managingPhotos}
          onClose={() => { setManagingPhotos(null); load(); }}
        />
      )}
    </div>
  );
}

function ProjectForm({ project, scopes, onClose, onSaved }: any) {
  const [title, setTitle] = useState(project?.title || "");
  const [subtitle, setSubtitle] = useState(project?.subtitle || "");
  const [description, setDescription] = useState(project?.description || "");
  const [location, setLocation] = useState(project?.location || "");
  const [year, setYear] = useState(project?.year || "");
  const [scopeId, setScopeId] = useState<string>(project?.scope_id?.toString() || "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("subtitle", subtitle);
      fd.append("description", description);
      fd.append("location", location);
      fd.append("year", year);
      if (scopeId) fd.append("scope_id", scopeId);
      if (file) fd.append("hero_image", file);
      const url = project ? `/admin/projects/${project.id}` : "/admin/projects";
      await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-6 z-50" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-card border border-border rounded-lg w-full max-w-2xl p-8 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="serif text-2xl">{project ? "Edit Project" : "New Project"}</h2>
        <Field label="Title">
          <input className="ui-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Subtitle (mis. Batam)">
          <input className="ui-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className="ui-input min-h-[140px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Location"><input className="ui-input" value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
          <Field label="Year"><input className="ui-input" value={year} onChange={(e) => setYear(e.target.value)} /></Field>
          <Field label="Scope">
            <select className="ui-input" value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
              <option value="">—</option>
              {scopes.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Hero Image">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {project?.hero_image && !file && <img src={imgUrl(project.hero_image)} className="mt-2 w-32 rounded" alt="" />}
        </Field>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          <button disabled={saving} className="ml-auto px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em] disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
