import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Mail, Send, Users as UsersIcon, Search } from "lucide-react";

type AudienceUser = { id: number; name: string; email: string; role: string; created_at: string };

export default function AdminMarketing() {
  const [audience, setAudience] = useState<AudienceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Explore Collection");
  const [ctaUrl, setCtaUrl] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/admin/marketing/audience")
      .then((r) => setAudience(r.data.users || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return audience;
    return audience.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  }, [audience, query]);

  const selectedIds = Object.keys(selected).filter((k) => selected[+k]).map(Number);

  const toggleAll = () => {
    if (filtered.every((u) => selected[u.id])) {
      const copy = { ...selected };
      filtered.forEach((u) => delete copy[u.id]);
      setSelected(copy);
    } else {
      const copy = { ...selected };
      filtered.forEach((u) => (copy[u.id] = true));
      setSelected(copy);
    }
  };

  const send = async () => {
    if (!subject || !headline || !body) {
      alert("Subject, headline, dan body wajib diisi.");
      return;
    }
    if (target === "selected" && selectedIds.length === 0) {
      alert("Pilih minimal satu penerima.");
      return;
    }
    const total = target === "all" ? audience.length : selectedIds.length;
    if (!confirm(`Kirim email ke ${total} penerima?`)) return;

    setSending(true);
    setResult(null);
    try {
      const { data } = await api.post("/admin/marketing/send", {
        subject,
        headline,
        body,
        cta_label: ctaLabel || null,
        cta_url: ctaUrl || null,
        hero_image: heroImage || null,
        target,
        user_ids: target === "selected" ? selectedIds : [],
      });
      setResult(data.message);
    } catch (e: any) {
      setResult("Gagal: " + (e?.response?.data?.message || e.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Marketing</p>
      <h1 className="serif text-4xl mb-8">Email Campaigns</h1>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
        {/* Composer */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Mail size={16} className="text-muted-foreground" />
            <span className="uppercase tracking-[0.2em] text-xs text-muted-foreground">Compose</span>
          </div>

          <Field label="Subject line">
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="A new collection has arrived"
              className="w-full px-3 py-2 border border-border rounded bg-background text-sm" />
          </Field>

          <Field label="Headline (in email)">
            <input value={headline} onChange={(e) => setHeadline(e.target.value)}
              placeholder="Introducing the Autumn Editorial"
              className="w-full px-3 py-2 border border-border rounded bg-background text-sm" />
          </Field>

          <Field label="Body">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8}
              placeholder="Write your message. Paragraphs preserved."
              className="w-full px-3 py-2 border border-border rounded bg-background text-sm font-sans" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA label (optional)">
              <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background text-sm" />
            </Field>
            <Field label="CTA URL (optional)">
              <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://livora.example/collection"
                className="w-full px-3 py-2 border border-border rounded bg-background text-sm" />
            </Field>
          </div>

          <Field label="Hero image URL (optional)">
            <input value={heroImage} onChange={(e) => setHeroImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-border rounded bg-background text-sm" />
          </Field>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={send} disabled={sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-xs uppercase tracking-[0.3em] disabled:opacity-50"
            >
              <Send size={14} />
              {sending ? "Sending..." : `Send to ${target === "all" ? audience.length : selectedIds.length}`}
            </button>
            {result && <p className="text-xs text-muted-foreground">{result}</p>}
          </div>
        </div>

        {/* Audience */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm">
              <UsersIcon size={16} className="text-muted-foreground" />
              <span className="uppercase tracking-[0.2em] text-xs text-muted-foreground">Audience</span>
              <span className="text-xs text-muted-foreground">({audience.length})</span>
            </div>
            <div className="flex items-center gap-1 text-xs border border-border rounded overflow-hidden">
              <button onClick={() => setTarget("all")}
                className={`px-3 py-1 ${target === "all" ? "bg-foreground text-background" : ""}`}>All</button>
              <button onClick={() => setTarget("selected")}
                className={`px-3 py-1 ${target === "selected" ? "bg-foreground text-background" : ""}`}>Selected ({selectedIds.length})</button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              className="w-full pl-9 pr-3 py-2 border border-border rounded bg-background text-sm" />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading audience...</p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto border border-border rounded">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground sticky top-0 bg-card">
                  <tr>
                    <th className="p-2 text-left w-8">
                      <input type="checkbox"
                        checked={filtered.length > 0 && filtered.every((u) => selected[u.id])}
                        onChange={toggleAll} />
                    </th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="p-2">
                        <input type="checkbox" checked={!!selected[u.id]}
                          onChange={(e) => setSelected({ ...selected, [u.id]: e.target.checked })} />
                      </td>
                      <td className="p-2">{u.name || "—"}</td>
                      <td className="p-2 text-muted-foreground">{u.email}</td>
                      <td className="p-2 capitalize text-xs">{u.role}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Tidak ada user.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
