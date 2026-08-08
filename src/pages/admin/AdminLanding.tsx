import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";

export default function AdminLanding() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/projects").then((r) => {
      setProjects(r.data);
      setSelected(r.data.filter((p: any) => p.is_highlighted).map((p: any) => p.id));
    });
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/admin/landing/highlights", { ids: selected });
      alert("Tersimpan!");
    } catch (e: any) {
      alert(e?.response?.data?.message || "Gagal");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Landing</p>
      <h1 className="serif text-4xl mb-2">Selected Works</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Pilih project mana saja (bebas jumlahnya) untuk dipajang di section "Our Project" landing page.
        Terpilih: {selected.length}
      </p>

      <button onClick={save} disabled={saving} className="mb-6 px-5 py-2 bg-foreground text-background rounded text-sm uppercase tracking-[0.2em] disabled:opacity-60">
        {saving ? "Saving..." : "Save Highlights"}
      </button>

      <div className="grid grid-cols-3 gap-5">
        {projects.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`text-left bg-card border-2 rounded-lg overflow-hidden transition ${on ? "border-foreground" : "border-border opacity-70"}`}
            >
              <div className="aspect-[4/3] bg-muted">
                {p.hero_image && <img src={imgUrl(p.hero_image)} className="w-full h-full object-cover" alt="" />}
              </div>
              <div className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{p.scope?.name || "—"}</p>
                <h3 className="serif text-lg">{p.title}</h3>
                <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                {on && <p className="text-xs mt-2 font-medium">✓ Highlighted</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
