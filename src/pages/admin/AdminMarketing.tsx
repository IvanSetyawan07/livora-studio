import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Users as UsersIcon,
  Search,
  Image as ImageIcon,
  X,
  Mail,
  Send,
  Save,
  Trash2,
  Plus,
  Loader2,
  FileText,
  FlaskConical,
} from "lucide-react";
import HeroImagePicker from "@/pages/admin/HeroImagePicker";
import LivoraEmailPreview from "@/pages/admin/LivoraEmailPreview";
import {
  PageHeader,
  AdminHelpBanner,
  EmptyState,
  StatusBadge,
  useAdminDialog,
} from "@/components/admin/kit";

type AudienceUser = { id: number; name: string; email: string; role: string; created_at: string };
type RecipientTarget = "all" | "selected";

type CampaignListItem = {
  id: number;
  campaign_name: string | null;
  subject: string;
  section_label: string;
  headline: string;
  status: string;
  target: string | null;
  sent_count: number | null;
  sent_at: string | null;
  updated_at: string;
};

const SIGNATURE_OPTIONS = [
  "With warmth,\nThe Livora Team",
  "Warm regards,\nThe Livora Team",
  "Hangat selalu,\nTim Livora Studio",
  "Salam hangat,\nTim Livora Studio",
];

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return v;
  }
};

export default function AdminMarketing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignIdParam = searchParams.get("campaignId");
  const dialog = useAdminDialog();

  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");
  const [activeCampaignId, setActiveCampaignId] = useState<number | null>(
    campaignIdParam ? Number(campaignIdParam) : null,
  );

  const [audience, setAudience] = useState<AudienceUser[]>([]);
  const [loadingAudience, setLoadingAudience] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

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
  const [ctaLabel, setCtaLabel] = useState("Lihat Koleksi");
  const [ctaUrl, setCtaUrl] = useState("");
  const [signature, setSignature] = useState(SIGNATURE_OPTIONS[0]);
  const [testEmail, setTestEmail] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [testSending, setTestSending] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const r = await api.get("/admin/marketing/campaigns");
      setCampaigns(Array.isArray(r.data?.campaigns) ? r.data.campaigns : []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    api
      .get("/admin/marketing/audience")
      .then((r) => setAudience(r.data.users || []))
      .catch(() => toast.error("Gagal memuat daftar penerima email"))
      .finally(() => setLoadingAudience(false));
    loadCampaigns();
  }, [loadCampaigns]);

  const loadCampaignIntoEditor = useCallback(async (id: number) => {
    try {
      const r = await api.get(`/admin/marketing/campaigns/${id}`);
      const c = r.data?.campaign;
      if (!c) return;
      setActiveCampaignId(c.id);
      setCampaignName(c.campaign_name ?? "");
      setSubject(c.subject ?? "");
      setSectionLabel(c.section_label ?? "LIVORA JOURNAL");
      setHeadline(c.headline ?? "");
      setBody(c.body ?? "");
      setHeroImage(c.hero_image ? { url: c.hero_image, alt: c.hero_image_alt || c.headline || "" } : null);
      if (c.cta_label && c.cta_url) {
        setShowCta(true);
        setCtaLabel(c.cta_label);
        setCtaUrl(c.cta_url);
      } else {
        setShowCta(false);
      }
      setSignature(c.signature || SIGNATURE_OPTIONS[0]);
      setTarget(c.target === "selected" ? "selected" : "all");
      if (Array.isArray(c.user_ids)) {
        const next: Record<number, boolean> = {};
        c.user_ids.forEach((uid: number) => {
          next[uid] = true;
        });
        setSelected(next);
      }
      setActiveTab("compose");
      toast.success(`Draf "${c.campaign_name || c.subject}" dibuka di editor.`);
    } catch {
      toast.error("Gagal memuat detail campaign");
    }
  }, []);

  useEffect(() => {
    if (!campaignIdParam) return;
    const id = Number(campaignIdParam);
    if (!Number.isNaN(id) && id > 0) {
      loadCampaignIntoEditor(id);
    }
  }, [campaignIdParam, loadCampaignIntoEditor]);

  const resetEditor = () => {
    setActiveCampaignId(null);
    setCampaignName("");
    setSubject("");
    setSectionLabel("LIVORA JOURNAL");
    setHeadline("");
    setBody("");
    setHeroImage(null);
    setShowCta(false);
    setCtaLabel("Lihat Koleksi");
    setCtaUrl("");
    setSignature(SIGNATURE_OPTIONS[0]);
    setTarget("all");
    setSelected({});
    if (searchParams.has("campaignId")) {
      searchParams.delete("campaignId");
      setSearchParams(searchParams, { replace: true });
    }
    setActiveTab("compose");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return audience;
    return audience.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  }, [audience, query]);

  const selectedIds = Object.keys(selected)
    .filter((k) => selected[+k])
    .map(Number);

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
    headline: headline || "Judul utama email Anda tampil di sini",
    body: body || "Tulis isi pesan email Anda di kolom sebelah kiri untuk melihat pratinjau langsung.",
    hero_image: heroImage?.url || null,
    hero_image_alt: heroImage?.alt || "",
    cta_label: showCta ? ctaLabel : null,
    cta_url: showCta ? ctaUrl : null,
    signature,
  };

  const validate = (forTest: boolean) => {
    if (!subject.trim() || !headline.trim() || !body.trim()) {
      toast.error("Subjek email, judul utama, dan isi pesan wajib diisi.");
      return false;
    }
    if (showCta && (!ctaLabel.trim() || !ctaUrl.trim())) {
      toast.error("Lengkapi teks tombol & tautan URL, atau nonaktifkan opsi tombol.");
      return false;
    }
    if (!forTest && target === "selected" && selectedIds.length === 0) {
      toast.error("Pilih minimal satu penerima email.");
      return false;
    }
    return true;
  };

  const buildPayload = () => ({
    id: activeCampaignId ?? undefined,
    campaign_name: campaignName.trim() || null,
    subject: subject.trim(),
    section_label: sectionLabel.trim() || "LIVORA JOURNAL",
    headline: headline.trim(),
    body: body.trim(),
    hero_image: heroImage?.url || null,
    hero_image_alt: heroImage?.alt || null,
    cta_label: showCta ? ctaLabel.trim() : null,
    cta_url: showCta ? ctaUrl.trim() : null,
    signature,
    target,
    user_ids: target === "selected" ? selectedIds : [],
  });

  const sendTest = async () => {
    if (!validate(true)) return;
    setTestSending(true);
    try {
      const { data } = await api.post("/admin/marketing/send-test", {
        ...buildPayload(),
        test_email: testEmail.trim() || undefined,
      });
      toast.success(data.message || "Email uji coba terkirim.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal mengirim email uji coba");
    } finally {
      setTestSending(false);
    }
  };

  const saveDraft = async () => {
    if (!validate(true)) return;
    setSavingDraft(true);
    try {
      const { data } = await api.post("/admin/marketing/campaigns/draft", buildPayload());
      if (data?.campaign?.id) {
        setActiveCampaignId(data.campaign.id);
      }
      toast.success("Draf campaign berhasil disimpan.");
      loadCampaigns();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan draf");
    } finally {
      setSavingDraft(false);
    }
  };

  const send = async () => {
    if (!validate(false)) return;
    const total = target === "all" ? audience.length : selectedIds.length;
    const ok = await dialog.confirm({
      title: `Kirim Broadcast ke ${total} Pelanggan?`,
      description: `Email dengan subjek "${subject}" akan langsung dikirim ke ${total} penerima. Pastikan Anda sudah memeriksa pratinjau atau mengirim email uji coba terlebih dahulu.`,
      confirmText: "Ya, Kirim Broadcast",
      cancelText: "Periksa Lagi",
    });
    if (!ok) return;

    setSending(true);
    try {
      const { data } = await api.post("/admin/marketing/send", buildPayload());
      toast.success(data.message || `Broadcast berhasil dikirim ke ${total} penerima.`);
      loadCampaigns();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal mengirim broadcast");
    } finally {
      setSending(false);
    }
  };

  const deleteCampaign = async (c: CampaignListItem) => {
    const ok = await dialog.confirm({
      title: `Hapus "${c.campaign_name || c.subject}"?`,
      description: "Data draf/riwayat campaign ini akan dihapus permanen.",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/marketing/campaigns/${c.id}`);
      if (activeCampaignId === c.id) setActiveCampaignId(null);
      toast.success("Campaign dihapus.");
      loadCampaigns();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menghapus campaign");
    }
  };

  const inputCls =
    "w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-2 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none";

  return (
    <div>
      <PageHeader
        eyebrow="Komunikasi & Promosi"
        title="Broadcast Email Pelanggan"
        description="Susun buletin atau pengumuman koleksi baru dengan desain resmi Livora, uji coba ke email sendiri, lalu kirim ke pelanggan."
        actions={
          <button
            type="button"
            onClick={resetEditor}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
          >
            <Plus className="h-3.5 w-3.5 text-[#5E93B8]" /> Campaign Baru
          </button>
        }
      />

      <AdminHelpBanner title="Tips Sebelum Mengirim Broadcast" storageKey="admin-marketing-help">
        Header logo Livora, tautan media sosial, dan tombol berhenti berlangganan sudah otomatis terpasang.
        Gunakan <b>Kirim Email Uji Coba</b> dulu untuk melihat tampilan asli di inbox sebelum mengirim ke seluruh pelanggan.
      </AdminHelpBanner>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[#EAE4DA] bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveTab("compose")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "compose" ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
            }`}
          >
            <Mail className="h-3.5 w-3.5" /> Buat & Kirim Broadcast
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "history" ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Daftar Campaign & Draf ({campaigns.length})
          </button>
        </div>

        {activeTab === "compose" && activeCampaignId && (
          <span className="rounded-full border border-[#5E93B8]/30 bg-[#EDF4F8] px-3 py-1 text-xs text-[#35678B]">
            Sedang mengedit Draf #{activeCampaignId}
          </span>
        )}
      </div>

      {activeTab === "history" ? (
        loadingCampaigns ? (
          <div className="flex items-center gap-2 py-12 text-sm text-[#656B73]">
            <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat daftar campaign…
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Belum ada draf atau riwayat email"
            description="Simpan draf atau kirim broadcast pertama Anda dari tab Buat & Kirim Broadcast."
            action={
              <button
                type="button"
                onClick={resetEditor}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#232528] px-4 text-xs font-medium text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Mulai Tulis Email
              </button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#EAE4DA] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[#EAE4DA] bg-[#FAF8F4] text-left text-[11px] font-medium uppercase tracking-wider text-[#656B73]">
                  <tr>
                    <th className="px-4 py-3">Campaign & Subjek</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Penerima</th>
                    <th className="px-4 py-3">Diperbarui</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-[#EAE4DA]/80 last:border-0 hover:bg-[#FAF8F4]/70">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[#232528]">{c.campaign_name || c.subject}</p>
                        <p className="text-xs text-[#656B73]">
                          {c.subject} · {c.headline}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge
                          tone={c.status === "sent" ? "success" : c.status === "scheduled" ? "info" : "neutral"}
                        >
                          {c.status === "sent"
                            ? "Terkirim"
                            : c.status === "scheduled"
                              ? "Terjadwal"
                              : "Draf"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#656B73]">
                        {c.status === "sent" ? `${c.sent_count ?? 0} terkirim` : c.target === "selected" ? "Pilihan" : "Semua"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#656B73]">{fmtDate(c.sent_at || c.updated_at)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => loadCampaignIntoEditor(c.id)}
                            className="rounded-lg border border-[#EAE4DA] bg-white px-3 py-1.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                          >
                            Buka di Editor
                          </button>
                          <button
                            type="button"
                            aria-label="Hapus campaign"
                            onClick={() => deleteCampaign(c)}
                            className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          {/* KIRI: Editor Email */}
          <div className="space-y-5">
            <Section title="Informasi Campaign">
              <Field label="Nama Internal Campaign (opsional)">
                <input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="mis. Koleksi Akhir Tahun 2026"
                  className={inputCls}
                />
              </Field>
              <Field label="Subjek Email (muncul di inbox pelanggan)">
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="mis. Koleksi Ruang Tamu Terbaru dari Livora"
                  className={inputCls}
                />
              </Field>
            </Section>

            <Section title="Isi Pesan">
              <Field label="Label Kecil di Atas Judul">
                <input
                  value={sectionLabel}
                  onChange={(e) => setSectionLabel(e.target.value)}
                  placeholder="LIVORA JOURNAL"
                  className={inputCls}
                />
              </Field>
              <Field label="Judul Utama (Headline)">
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="mis. Hangatnya Nuansa Kayu Alami di Ruang Keluarga"
                  className={inputCls}
                />
              </Field>
              <Field label="Teks Pesan">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder={"Bulan ini kami menghadirkan koleksi terbaru...\n\nKunjungi showroom Livora untuk melihat langsung material pilihan kami."}
                  className={inputCls}
                />
              </Field>
            </Section>

            <Section title="Gambar Utama Email">
              {heroImage ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl border border-[#EAE4DA]">
                    <img src={heroImage.url} alt={heroImage.alt} className="h-48 w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Hapus gambar"
                      onClick={() => setHeroImage(null)}
                      className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-[#232528] shadow hover:bg-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="text-xs font-medium text-[#35678B] hover:underline"
                    >
                      Ganti Gambar
                    </button>
                  </div>
                  <Field label="Keterangan Gambar (Alt Text)">
                    <input
                      value={heroImage.alt}
                      onChange={(e) => setHeroImage({ ...heroImage, alt: e.target.value })}
                      placeholder="Deskripsi singkat gambar"
                      className={inputCls}
                    />
                  </Field>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#EAE4DA] bg-[#FAF8F4] py-9 text-[#656B73] transition-colors hover:border-[#5E93B8] hover:text-[#232528]"
                >
                  <ImageIcon size={20} className="text-[#5E93B8]" />
                  <span className="text-sm font-medium">Pilih dari Katalog atau Unggah Gambar Baru</span>
                </button>
              )}
            </Section>

            <Section title="Tombol Aksi (Opsional)">
              <label className="flex items-center gap-2 text-sm text-[#232528]">
                <input
                  type="checkbox"
                  checked={showCta}
                  onChange={(e) => setShowCta(e.target.checked)}
                />
                Tampilkan tombol tautan di bawah pesan
              </label>
              {showCta && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Teks Tombol">
                    <input
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Link Tujuan (URL)">
                    <input
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://livoralcr.com/furniture"
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}
            </Section>

            <Section title="Salam Penutup">
              <select
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className={inputCls}
              >
                {SIGNATURE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("\n", " — ")}
                  </option>
                ))}
              </select>
            </Section>

            <Section title="Target Penerima Email">
              <div className="inline-flex overflow-hidden rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTarget("all")}
                  className={`rounded-md px-3.5 py-1.5 font-medium transition-colors ${
                    target === "all" ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
                  }`}
                >
                  Semua Pelanggan ({audience.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTarget("selected")}
                  className={`rounded-md px-3.5 py-1.5 font-medium transition-colors ${
                    target === "selected" ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
                  }`}
                >
                  Pilih Penerima ({selectedIds.length})
                </button>
              </div>

              {target === "selected" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#656B73]">
                    <span className="inline-flex items-center gap-1.5">
                      <UsersIcon size={14} className="text-[#5E93B8]" />
                      Total {audience.length} akun terdaftar
                    </span>
                    <span>{selectedIds.length} dipilih</span>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#656B73]" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cari nama atau alamat email..."
                      className={`pl-9 ${inputCls}`}
                    />
                  </div>
                  {loadingAudience ? (
                    <p className="text-xs text-[#656B73]">Memuat daftar penerima...</p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto rounded-lg border border-[#EAE4DA]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[#FAF8F4] text-left text-[11px] uppercase tracking-wider text-[#656B73]">
                          <tr>
                            <th className="w-8 p-2.5">
                              <input
                                type="checkbox"
                                checked={filtered.length > 0 && filtered.every((u) => selected[u.id])}
                                onChange={toggleAll}
                              />
                            </th>
                            <th className="p-2.5">Nama</th>
                            <th className="p-2.5">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((u) => (
                            <tr key={u.id} className="border-t border-[#EAE4DA]/70">
                              <td className="p-2.5">
                                <input
                                  type="checkbox"
                                  checked={!!selected[u.id]}
                                  onChange={(e) => setSelected({ ...selected, [u.id]: e.target.checked })}
                                />
                              </td>
                              <td className="p-2.5 text-[#232528]">{u.name || "—"}</td>
                              <td className="p-2.5 text-xs text-[#656B73]">{u.email}</td>
                            </tr>
                          ))}
                          {filtered.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-4 text-center text-xs text-[#656B73]">
                                Tidak ada pelanggan yang cocok.
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

            <Section title="Uji Coba & Kirim Broadcast">
              <div className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-3.5">
                <p className="mb-2 text-xs font-medium text-[#232528]">Kirim Email Uji Coba (opsional)</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Kosongkan untuk kirim ke email akun Anda sendiri"
                    className="h-9 flex-1 rounded-lg border border-[#EAE4DA] bg-white px-3 text-xs text-[#232528] focus:border-[#5E93B8] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={sendTest}
                    disabled={testSending}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#5E93B8]/40 bg-[#EDF4F8] px-4 text-xs font-medium text-[#35678B] hover:bg-[#5E93B8]/20 disabled:opacity-50"
                  >
                    {testSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                    {testSending ? "Mengirim..." : "Kirim Uji Coba"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={savingDraft}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-4 text-xs font-medium text-[#232528] hover:border-[#5E93B8] disabled:opacity-50"
                >
                  {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-[#5E93B8]" />}
                  {activeCampaignId ? "Perbarui Draf" : "Simpan sebagai Draf"}
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={sending}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#232528] px-5 text-xs font-medium text-white hover:bg-[#35383d] disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {sending ? "Mengirim Broadcast..." : "Kirim Broadcast Sekarang"}
                </button>
              </div>
            </Section>
          </div>

          {/* KANAN: Pratinjau Langsung */}
          <div className="h-fit xl:sticky xl:top-6">
            <LivoraEmailPreview payload={previewPayload} />
          </div>
        </div>
      )}

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
    <div className="space-y-4 rounded-xl border border-[#EAE4DA] bg-white p-5 shadow-sm">
      <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-[#5E93B8]">
        {title}
      </span>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#232528]">{label}</span>
      {children}
    </label>
  );
}
