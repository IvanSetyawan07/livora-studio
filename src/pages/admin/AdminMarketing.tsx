import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Users as UsersIcon, Search, Image as ImageIcon, X } from "lucide-react";
import HeroImagePicker from "@/pages/admin/HeroImagePicker";
import LivoraEmailPreview from "@/pages/admin/LivoraEmailPreview";

type AudienceUser = { id: number; name: string; email: string; role: string; created_at: string };
type RecipientTarget = "all" | "selected" | "segment";

const SIGNATURE_OPTIONS = [
  "With warmth,\nThe Livora Team",
  "Warm regards,\nThe Livora Team",
  "Until next time,\nThe Livora Team",
];

// Brand header/footer (logo, studio label, social/contact links, unsubscribe)
// now live entirely server-side (MarketingController::brand()) and are baked
// into every rendered email + preview. Nothing to configure here.

export default function AdminMarketing() {
  const [audience, setAudience] = useState<AudienceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<RecipientTarget>("all");
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  // Campaign fields
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [sectionLabel, setSectionLabel] = useState("LIVORA JOURNAL");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [heroImage, setHeroImage] = useState<{ url: string; alt: string } | null>(null);
  const [showCta, setShowCta] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("Explore Collection");
  const [ctaUrl, setCtaUrl] = useState("");
  const [signature, setSignature] = useState(SIGNATURE_OPTIONS[0]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [testSending, setTestSending] = useState(false);
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

  const previewPayload = {
    section_label: sectionLabel || "LIVORA JOURNAL",
    headline: headline || "Your headline goes here",
    body: body || "Write your message here — it will appear as editorial body copy.",
    hero_image: heroImage?.url || null,
    hero_image_alt: heroImage?.alt || "",
    cta_label: showCta ? ctaLabel : null,
    cta_url: showCta ? ctaUrl : null,
    signature,
  };

  const validate = (forTest: boolean) => {
    if (!subject || !headline || !body) {
      alert("Subject, headline, dan body wajib diisi.");
      return false;
    }
    if (showCta && (!ctaLabel || !ctaUrl)) {
      alert("Lengkapi CTA label dan URL, atau matikan opsi CTA.");
      return false;
    }
    if (!forTest && target === "selected" && selectedIds.length === 0) {
      alert("Pilih minimal satu penerima.");
      return false;
    }
    return true;
  };

  const buildPayload = () => ({
    campaign_name: campaignName,
    subject,
    section_label: sectionLabel,
    headline,
    body,
    hero_image: heroImage?.url || null,
    hero_image_alt: heroImage?.alt || null,
    cta_label: showCta ? ctaLabel : null,
    cta_url: showCta ? ctaUrl : null,
    signature,
    target,
    user_ids: target === "selected" ? selectedIds : [],
  });

  const sendTest = async () => {
    if (!validate(true)) return;
    setTestSending(true);
    setResult(null);
    try {
      const { data } = await api.post("/admin/marketing/send-test", buildPayload());
      setResult(data.message || "Test email sent.");
    } catch (e: any) {
      setResult("Gagal: " + (e?.response?.data?.message || e.message));
    } finally {
      setTestSending(false);
    }
  };

  const saveDraft = async () => {
    try {
      const { data } = await api.post("/admin/marketing/campaigns/draft", buildPayload());
      setResult(data.message || "Draft saved.");
    } catch (e: any) {
      setResult("Gagal: " + (e?.response?.data?.message || e.message));
    }
  };

  const send = async () => {
    if (!validate(false)) return;
    const total = target === "all" ? audience.length : selectedIds.length;
    if (!confirm(`Kirim email ke ${target === "all" ? total : selectedIds.length} penerima?`)) return;

    setSending(true);
    setResult(null);
    try {
      const { data } = await api.post("/admin/marketing/send", buildPayload());
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

      <div className="grid xl:grid-cols-[1fr_1fr] gap-6">
        {/* LEFT: Composer form */}
        <div className="space-y-6">
          <Section title="Campaign Information">
            <Field label="Campaign Name">
              <input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="August Collection"
                className="w-full px-3 py-2 border border-border rounded bg-background text-sm"
              />
            </Field>
            <Field label="Subject Line">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Discover Our New Collection"
                className="w-full px-3 py-2 border border-border rounded bg-background text-sm"
              />
            </Field>
          </Section>

          <Section title="Content">
            <Field label="Section Label">
              <input
                value={sectionLabel}
                onChange={(e) => setSectionLabel(e.target.value)}
                placeholder="LIVORA JOURNAL"
                className="w-full px-3 py-2 border border-border rounded bg-background text-sm"
              />
            </Field>
            <Field label="Headline">
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="A New Season of Living"
                className="w-full px-3 py-2 border border-border rounded bg-background text-sm"
              />
            </Field>
            <Field label="Body">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder={"This August, we present a collection...\n\nDiscover new inspirations..."}
                className="w-full px-3 py-2 border border-border rounded bg-background text-sm font-sans"
              />
            </Field>
          </Section>

          <Section title="Hero Image">
            {heroImage ? (
              <div className="relative rounded overflow-hidden border border-border">
                <img src={heroImage.url} alt={heroImage.alt} className="w-full h-48 object-cover" />
                <button
                  onClick={() => setHeroImage(null)}
                  className="absolute top-2 right-2 bg-background/90 rounded-full p-1.5 hover:bg-background"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-lg py-10 text-muted-foreground hover:border-foreground/40 transition-colors"
              >
                <ImageIcon size={20} />
                <span className="text-sm">Select from Catalog or Upload Image</span>
              </button>
            )}
            {heroImage && (
              <button
                onClick={() => setPickerOpen(true)}
                className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground underline"
              >
                Replace Image
              </button>
            )}
            {heroImage && (
              <Field label="Alt Text">
                <input
                  value={heroImage.alt}
                  onChange={(e) => setHeroImage({ ...heroImage, alt: e.target.value })}
                  placeholder="Serenade Orange living room interior"
                  className="w-full px-3 py-2 border border-border rounded bg-background text-sm"
                />
              </Field>
            )}
          </Section>

          <Section title="Call to Action">
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={showCta} onChange={(e) => setShowCta(e.target.checked)} />
              Show CTA
            </label>
            {showCta && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA Label">
                  <input
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded bg-background text-sm"
                  />
                </Field>
                <Field label="CTA URL">
                  <input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://livora.example/collection"
                    className="w-full px-3 py-2 border border-border rounded bg-background text-sm"
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Signature">
            <select
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded bg-background text-sm"
            >
              {SIGNATURE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("\n", " — ")}
                </option>
              ))}
            </select>
          </Section>

          <Section title="Recipients">
            <div className="flex items-center gap-1 text-xs border border-border rounded overflow-hidden w-fit mb-4">
              {(["all", "selected", "segment"] as RecipientTarget[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  className={`px-3 py-1.5 capitalize ${target === t ? "bg-foreground text-background" : ""}`}
                >
                  {t === "all" ? "All Subscribers" : t === "selected" ? `Selected (${selectedIds.length})` : "Segment"}
                </button>
              ))}
            </div>

            {target === "selected" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <UsersIcon size={16} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">({audience.length} total)</span>
                  </div>
                </div>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name or email"
                    className="w-full pl-9 pr-3 py-2 border border-border rounded bg-background text-sm"
                  />
                </div>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading audience...</p>
                ) : (
                  <div className="max-h-[320px] overflow-y-auto border border-border rounded">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground sticky top-0 bg-card">
                        <tr>
                          <th className="p-2 text-left w-8">
                            <input
                              type="checkbox"
                              checked={filtered.length > 0 && filtered.every((u) => selected[u.id])}
                              onChange={toggleAll}
                            />
                          </th>
                          <th className="p-2 text-left">Name</th>
                          <th className="p-2 text-left">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((u) => (
                          <tr key={u.id} className="border-t border-border">
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={!!selected[u.id]}
                                onChange={(e) => setSelected({ ...selected, [u.id]: e.target.checked })}
                              />
                            </td>
                            <td className="p-2">{u.name || "—"}</td>
                            <td className="p-2 text-muted-foreground">{u.email}</td>
                          </tr>
                        ))}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-muted-foreground">
                              Tidak ada user.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section title="Actions">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={saveDraft}
                className="px-5 py-2.5 border border-border text-xs uppercase tracking-[0.3em]"
              >
                Save Draft
              </button>
              <button
                onClick={sendTest}
                disabled={testSending}
                className="px-5 py-2.5 border border-border text-xs uppercase tracking-[0.3em] disabled:opacity-50"
              >
                {testSending ? "Sending..." : "Send Test Email"}
              </button>
              <button
                onClick={send}
                disabled={sending}
                className="px-5 py-2.5 bg-foreground text-background text-xs uppercase tracking-[0.3em] disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send Campaign"}
              </button>
            </div>
            {result && <p className="text-xs text-muted-foreground mt-3">{result}</p>}
          </Section>
        </div>

        {/* RIGHT: Live preview (sticky) */}
        <div className="xl:sticky xl:top-6 h-fit">
          <LivoraEmailPreview payload={previewPayload} />
        </div>
      </div>

      <HeroImagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(img) => setHeroImage(img)}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <span className="block uppercase tracking-[0.2em] text-xs text-muted-foreground">{title}</span>
      {children}
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