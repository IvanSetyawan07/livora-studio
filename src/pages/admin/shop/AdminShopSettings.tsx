import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Sliders,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { adminShop, rupiah } from "@/lib/shop";
import {
  PageHeader,
  AdminHelpBanner,
  ErrorState,
  useAdminDialog,
} from "@/components/admin/kit";

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Hanya tampilkan 2 template balasan otomatis yang benar-benar aktif dipakai mesin Livi. */
const ACTIVE_TEMPLATES: Record<string, { label: string; hint: string }> = {
  off_hours: {
    label: "Pesan di Luar Jam Kerja",
    hint: "Dikirim otomatis saat pelanggan menghubungi di luar jadwal operasional di atas.",
  },
  session_closed: {
    label: "Pesan Saat Sesi Admin Ditutup",
    hint: "Dikirim saat admin mengembalikan percakapan dari CS ke Bot Livi.",
  },
};

const META_TEMPLATE_BODY = `Ada pelanggan yang butuh dibalas admin Livora.

Nama/Nomor: {{1}}
Sumber: {{2}}
Catatan: {{3}}

Mohon segera dibalas melalui dashboard admin.`;

const inp =
  "h-10 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none transition-colors focus:border-[#5E93B8] focus:bg-white";

type SettingsTab = "daily" | "alerts" | "technical";

/** Pengaturan toko tanpa deploy (Owner). */
export default function AdminShopSettings() {
  const dialog = useAdminDialog();
  const [tab, setTab] = useState<SettingsTab>("daily");
  const [s, setS] = useState<Record<string, any> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zones, setZones] = useState<[string, number][]>([]);
  const [alertPhones, setAlertPhones] = useState<string[]>([]);
  const [block, setBlock] = useState("");
  const [snapshot, setSnapshot] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [showTplGuide, setShowTplGuide] = useState(false);

  const buildPayloadFrom = useCallback(
    (
      state: Record<string, any>,
      z: [string, number][],
      phones: string[],
      blk: string,
    ) => ({
      bot_enabled: state.bot_enabled,
      ai_answers_enabled: state.ai_answers_enabled,
      price_requires_admin: state.price_requires_admin,
      bot_wa_number: state.bot_wa_number ?? "",
      admin_alert_enabled: !!state.admin_alert_enabled,
      admin_alert_phones: phones.map((p) => p.trim()).filter(Boolean),
      admin_alert_template:
        (state.admin_alert_template ?? "admin_chat_butuh_balasan").trim() || "admin_chat_butuh_balasan",
      admin_alert_template_lang: (state.admin_alert_template_lang ?? "id").trim() || "id",
      admin_alert_template_has_url_btn: !!state.admin_alert_template_has_url_btn,
      ignore_admin_inbound: state.ignore_admin_inbound !== false,
      business_hours: state.business_hours,
      templates: state.templates,
      shipping_zones: Object.fromEntries(
        z.filter(([k]) => k.trim()).map(([k, v]) => [k.trim().toLowerCase(), Number(v) || 0]),
      ),
      blocklist: blk
        .split(/[\n,]/)
        .map((x) => x.trim())
        .filter(Boolean),
      review_threshold: Number(state.review_threshold),
      quote_valid_days: Number(state.quote_valid_days),
      sla_hours: Number(state.sla_hours),
      warranty_days: Number(state.warranty_days),
      return_days: Number(state.return_days),
      retention_days: Number(state.retention_days),
    }),
    [],
  );

  const applyData = useCallback(
    (d: Record<string, any>) => {
      const z = Object.entries(d.shipping_zones ?? {}) as [string, number][];
      const phones = (d.admin_alert_phones?.length ? d.admin_alert_phones : ["628212043307"]) as string[];
      const blk = (d.blocklist ?? []).join("\n");
      setS(d);
      setZones(z);
      setAlertPhones(phones);
      setBlock(blk);
      setSnapshot(JSON.stringify(buildPayloadFrom(d, z, phones, blk)));
    },
    [buildPayloadFrom],
  );

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const d = await adminShop.settings();
      applyData(d);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Gagal memuat pengaturan toko";
      setLoadError(msg);
      toast.error(msg);
    }
  }, [applyData]);

  useEffect(() => {
    load();
  }, [load]);

  const currentPayload = useMemo(
    () => (s ? buildPayloadFrom(s, zones, alertPhones, block) : null),
    [s, zones, alertPhones, block, buildPayloadFrom],
  );
  const dirty = currentPayload ? JSON.stringify(currentPayload) !== snapshot : false;

  if (loadError && !s) {
    return <ErrorState message={loadError} onRetry={load} />;
  }
  if (!s || !currentPayload) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-[#656B73]">
        <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat pengaturan toko…
      </div>
    );
  }

  const set = (k: string, v: any) => setS((prev) => (prev ? { ...prev, [k]: v } : prev));

  const handleToggleBotEnabled = async (next: boolean) => {
    if (!next) {
      const ok = await dialog.confirm({
        title: "Nonaktifkan Bot WhatsApp Livi?",
        description:
          "Jika dimatikan, Bot Livi tidak akan membalas pesan masuk apa pun dan semua percakapan akan langsung masuk ke antrean tim CS.",
        confirmText: "Ya, Matikan Bot",
        cancelText: "Batal",
        tone: "danger",
      });
      if (!ok) return;
    }
    set("bot_enabled", next);
  };

  const handleTogglePriceRequiresAdmin = async (next: boolean) => {
    if (!next) {
      const ok = await dialog.confirm({
        title: "Izinkan Livi Menyebut Harga Otomatis?",
        description:
          "Jika dimatikan, Livi akan langsung menyebutkan harga yang tersimpan di katalog produk tanpa meminta konfirmasi admin terlebih dahulu.",
        confirmText: "Ya, Izinkan Otomatis",
        cancelText: "Batal",
      });
      if (!ok) return;
    }
    set("price_requires_admin", next);
  };

  const save = async () => {
    const prevRetention = (() => {
      try {
        return JSON.parse(snapshot).retention_days;
      } catch {
        return currentPayload.retention_days;
      }
    })();
    if (
      Number(currentPayload.retention_days) > 0 &&
      Number(prevRetention) > 0 &&
      Number(currentPayload.retention_days) < Number(prevRetention)
    ) {
      const ok = await dialog.confirm({
        title: "Perpendek Masa Simpan Riwayat Chat WA?",
        description: `Masa simpan akan dikurangi dari ${prevRetention} hari menjadi ${currentPayload.retention_days} hari. Chat lama yang melewati batas dapat dibersihkan otomatis.`,
        confirmText: "Ya, Simpan Perubahan",
        cancelText: "Batal",
        tone: "danger",
      });
      if (!ok) return null;
    }

    setBusy(true);
    try {
      const d = await adminShop.saveSettings(currentPayload);
      applyData(d);
      toast.success("Pengaturan toko berhasil disimpan.");
      return d;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Gagal menyimpan pengaturan");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const refreshMeta = async () => {
    setRefreshingMeta(true);
    try {
      const d = await adminShop.settings(true);
      setS((prev) => (prev ? { ...prev, bot_status: d.bot_status } : d));
      toast.success("Status Meta Cloud API diperbarui.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRefreshingMeta(false);
    }
  };

  const sendTestAlert = async () => {
    if (dirty) {
      const saveFirst = await dialog.confirm({
        title: "Ada Perubahan Belum Disimpan",
        description:
          "Anda memiliki perubahan pengaturan yang belum disimpan. Simpan dulu agar tes memakai pengaturan terbaru, atau batalkan dan klik Simpan Pengaturan dulu.",
        confirmText: "Simpan & Kirim Tes",
        cancelText: "Kirim Tanpa Menyimpan",
      });
      if (saveFirst) {
        const ok = await save();
        if (!ok) return;
      }
    }

    setTestingAlert(true);
    setTestResult(null);
    try {
      const res = await adminShop.testAdminAlert();
      if (res.ok) {
        const modes = res.results.map((r) => `${r.phone} (${r.mode})`).join(", ");
        setTestResult({ ok: true, text: `Terkirim ke: ${modes}` });
        toast.success("Tes alert WA berhasil terkirim.");
      } else {
        setTestResult({ ok: false, text: res.error ?? "Gagal mengirim tes alert." });
        toast.error(res.error ?? "Tes alert gagal");
      }
    } catch (e: any) {
      setTestResult({ ok: false, text: e.message });
      toast.error(e.message);
    } finally {
      setTestingAlert(false);
    }
  };

  const botStatus = s.bot_status ?? {};

  const Num = ({ k, label, suffix }: { k: string; label: string; suffix?: string }) => (
    <label className="block text-xs font-medium text-[#232528]">
      <span className="mb-1 block text-[#656B73]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={s[k] ?? ""}
          onChange={(e) => set(k, e.target.value)}
          className={inp}
          aria-label={label}
        />
        {suffix && <span className="shrink-0 text-xs text-[#656B73]">{suffix}</span>}
      </div>
    </label>
  );

  return (
    <div className="max-w-4xl space-y-6 pb-24">
      <PageHeader
        eyebrow="Khusus Owner"
        title="Pengaturan Toko & Bot Livi"
        description="Atur jadwal kerja, perilaku Bot Livi, ongkos kirim, notifikasi WhatsApp tim, dan sambungan Meta. Perubahan berlaku langsung."
      />

      <AdminHelpBanner title="Dikelompokkan agar Lebih Mudah" storageKey="admin-shop-settings-help">
        Pengaturan sehari-hari (Bot, Jam Kerja, Ongkir) ada di tab <b>Operasional Harian</b>. Pengaturan teknis Meta Cloud API tersimpan rapi di tab <b>Pengaturan Teknis / IT</b>.
      </AdminHelpBanner>

      {/* Navigasi 3 Tab */}
      <div className="inline-flex flex-wrap rounded-xl border border-[#EAE4DA] bg-white p-1">
        {(
          [
            ["daily", "Operasional Harian", Sliders],
            ["alerts", "Notifikasi Admin & Blokir", BellRing],
            ["technical", "Pengaturan Teknis / IT", Wrench],
          ] as [SettingsTab, string, React.ElementType][]
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
              tab === k ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* TAB 1: Operasional Harian */}
      {tab === "daily" && (
        <div className="space-y-5">
          <Sec title="Perilaku Bot WhatsApp (Livi)">
            <Toggle
              label="Bot Livi aktif (jika dimatikan, semua chat masuk langsung dialihkan ke tim CS)"
              checked={!!s.bot_enabled}
              onChange={handleToggleBotEnabled}
            />
            <Toggle
              label="Izinkan AI menjawab pertanyaan bebas pelanggan (Livi tetap memperkenalkan diri sebagai asisten AI)"
              checked={!!s.ai_answers_enabled}
              onChange={(v) => set("ai_answers_enabled", v)}
            />
            <Toggle
              label="Pertanyaan harga selalu dikonfirmasi admin dulu (Livi menahan harga sampai CS mengonfirmasi)"
              checked={s.price_requires_admin !== false}
              onChange={handleTogglePriceRequiresAdmin}
            />
          </Sec>

          <Sec title="Jam Operasional Studio">
            <p className="text-xs text-[#656B73]">
              Di luar hari atau jam di bawah ini, Bot Livi memberi tahu pelanggan bahwa tim sedang tutup.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => {
                const day = i + 1;
                const on = s.business_hours?.days?.includes(day);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set("business_hours", {
                        ...s.business_hours,
                        days: on
                          ? s.business_hours.days.filter((x: number) => x !== day)
                          : [...(s.business_hours?.days ?? []), day],
                      })
                    }
                    className={`h-9 w-12 rounded-lg text-xs font-medium transition-colors ${
                      on
                        ? "bg-[#232528] text-white"
                        : "border border-[#EAE4DA] bg-[#FAF8F4] text-[#656B73] hover:border-[#5E93B8]"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <input
                type="time"
                value={s.business_hours?.start ?? "09:00"}
                onChange={(e) => set("business_hours", { ...s.business_hours, start: e.target.value })}
                className="h-10 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-sm"
                aria-label="Jam buka"
              />
              <span className="text-xs text-[#656B73]">sampai</span>
              <input
                type="time"
                value={s.business_hours?.end ?? "17:00"}
                onChange={(e) => set("business_hours", { ...s.business_hours, end: e.target.value })}
                className="h-10 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-sm"
                aria-label="Jam tutup"
              />
              <span className="text-xs font-medium text-[#656B73]">WIB</span>
            </div>
          </Sec>

          <Sec title="Pesan Balasan Otomatis">
            {Object.entries(ACTIVE_TEMPLATES).map(([k, meta]) => (
              <label key={k} className="block text-xs font-medium text-[#232528]">
                <span>{meta.label}</span>
                <span className="mt-0.5 block font-normal text-[#656B73]">{meta.hint}</span>
                <textarea
                  rows={2}
                  value={s.templates?.[k] ?? ""}
                  onChange={(e) => set("templates", { ...s.templates, [k]: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] p-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
                />
              </label>
            ))}
          </Sec>

          <Sec title="Zona & Tarif Ongkos Kirim">
            <p className="text-xs text-[#656B73]">
              Tulis nama kota atau provinsi. Kota dicocokkan lebih dulu; wilayah di luar daftar akan dihitung manual oleh admin.
            </p>
            <div className="space-y-2">
              {zones.map(([k, v], i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  <input
                    className={inp}
                    placeholder="mis. Jakarta Selatan"
                    aria-label="Kota atau provinsi"
                    value={k}
                    onChange={(e) => setZones(zones.map((z, j) => (j === i ? [e.target.value, z[1]] : z)))}
                  />
                  <input
                    className={`${inp} w-40 text-right`}
                    type="number"
                    min={0}
                    aria-label="Tarif"
                    value={v}
                    onChange={(e) => setZones(zones.map((z, j) => (j === i ? [z[0], +e.target.value] : z)))}
                  />
                  <span className="w-28 shrink-0 text-xs font-medium text-[#656B73]">{rupiah(v)}</span>
                  <button
                    type="button"
                    aria-label="Hapus zona"
                    onClick={() => setZones(zones.filter((_, j) => j !== i))}
                    className="rounded-lg p-2 text-[#656B73] hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setZones([...zones, ["", 0]])}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
            >
              <Plus className="h-3.5 w-3.5 text-[#5E93B8]" /> Tambah Zona Ongkir
            </button>
          </Sec>

          <Sec title="Aturan Pesanan & Garansi">
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Num k="review_threshold" label="Batas nilai wajib tinjau admin" suffix="Rp" />
              <Num k="quote_valid_days" label="Masa berlaku penawaran" suffix="hari" />
              <Num k="sla_hours" label="Target waktu tinjau (SLA)" suffix="jam" />
              <Num k="return_days" label="Batas klaim rusak/salah ukuran" suffix="hari" />
              <Num k="warranty_days" label="Masa garansi furnitur" suffix="hari" />
              <Num k="retention_days" label="Simpan riwayat chat WA" suffix="hari" />
            </div>
            <p className="text-[11px] text-[#656B73]">
              Pastikan masa garansi, batas klaim, dan retensi data sudah sesuai kebijakan resmi Livora.
            </p>
          </Sec>
        </div>
      )}

      {/* TAB 2: Notifikasi Admin & Daftar Blokir */}
      {tab === "alerts" && (
        <div className="space-y-5">
          <Sec title="Peringatan WhatsApp untuk Tim Admin">
            <Toggle
              label="Kirim alert WhatsApp ke nomor admin saat ada chat butuh balasan, permintaan cek harga, bukti transfer baru, atau gangguan sistem"
              checked={!!s.admin_alert_enabled}
              onChange={(v) => set("admin_alert_enabled", v)}
            />
            <Toggle
              label="Abaikan pesan masuk dari nomor admin di Bot Livi (agar balasan alert dari admin tidak dibalas bot)"
              checked={s.ignore_admin_inbound !== false}
              onChange={(v) => set("ignore_admin_inbound", v)}
            />

            <div className="space-y-2 border-t border-[#EAE4DA] pt-3">
              <span className="block text-xs font-medium text-[#232528]">
                Daftar Nomor WhatsApp Penerima Alert
              </span>
              <span className="block text-[11px] text-[#656B73]">
                Baris pertama menerima alert instan; baris berikutnya menerima alert eskalasi jika lebih dari 5 menit belum direspons.
              </span>
              {alertPhones.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-xs text-[#656B73]">
                    {i === 0 ? "Admin Utama" : `Eskalasi #${i + 1}`}
                  </span>
                  <input
                    value={p}
                    onChange={(e) => setAlertPhones(alertPhones.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder="628212043307"
                    aria-label={i === 0 ? "Nomor admin utama" : `Nomor eskalasi ${i + 1}`}
                    className={inp}
                  />
                  {alertPhones.length > 1 && (
                    <button
                      type="button"
                      aria-label="Hapus nomor admin"
                      onClick={() => setAlertPhones(alertPhones.filter((_, j) => j !== i))}
                      className="rounded-lg p-2 text-[#656B73] hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAlertPhones([...alertPhones, ""])}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
              >
                <Plus className="h-3.5 w-3.5 text-[#5E93B8]" /> Tambah Nomor Eskalasi
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-[#EAE4DA] pt-3">
              <button
                type="button"
                disabled={testingAlert || busy}
                onClick={sendTestAlert}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#5E93B8]/40 bg-[#EDF4F8] px-4 text-xs font-medium text-[#35678B] hover:bg-[#5E93B8]/20 disabled:opacity-50"
              >
                {testingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Kirim Tes Alert WA
              </button>
              {testResult && (
                <span className={`text-xs font-medium ${testResult.ok ? "text-emerald-700" : "text-rose-600"}`}>
                  {testResult.text}
                </span>
              )}
            </div>
          </Sec>

          <Sec title="Daftar Nomor Diblokir">
            <p className="text-xs text-[#656B73]">
              Nomor di bawah ini akan diabaikan oleh Bot Livi (misalnya nomor spam). Tulis satu nomor per baris.
            </p>
            <textarea
              rows={4}
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              placeholder="Satu nomor per baris (mis. 0812… atau 62812…)"
              aria-label="Nomor diblokir"
              className="w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] p-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
            />
          </Sec>
        </div>
      )}

      {/* TAB 3: Pengaturan Teknis / IT */}
      {tab === "technical" && (
        <div className="space-y-5">
          <Sec title="Status Koneksi Meta Cloud API & Nomor Bot">
            <div className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {botStatus.configured ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="font-medium text-[#232528]">
                    {botStatus.configured
                      ? `Meta Cloud API aktif${botStatus.verified_name ? ` (${botStatus.verified_name})` : ""}`
                      : `Provider WA di server: ${botStatus.provider ?? "belum aktif"}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={refreshMeta}
                  disabled={refreshingMeta}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3 py-1.5 text-xs text-[#232528] hover:border-[#5E93B8]"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshingMeta ? "animate-spin" : ""}`} /> Cek Status Meta
                </button>
              </div>

              <div className="mt-2.5 grid gap-1.5 text-xs text-[#656B73] sm:grid-cols-2">
                <p>
                  Nomor bot di Meta:{" "}
                  <strong className="text-[#232528]">
                    {botStatus.display_phone_number ?? "Belum terbaca (atur di server)"}
                  </strong>
                </p>
                <p>
                  Nomor tautan keranjang web:{" "}
                  <strong className="text-[#232528]">{botStatus.link_number || "—"}</strong>
                </p>
              </div>

              {botStatus.error && <p className="mt-2 text-xs text-amber-800">Info Meta: {botStatus.error}</p>}

              {(botStatus.mismatch || botStatus.uses_fallback_307) && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span>
                    {botStatus.mismatch
                      ? `Perhatian: nomor tautan web (${botStatus.link_number}) berbeda dengan nomor bot Meta (${botStatus.display_phone_number}).`
                      : "Nomor WA bot belum diisi di bawah, sehingga tautan masih memakai nomor cadangan."}
                  </span>
                  {botStatus.normalized_bot_number && (
                    <button
                      type="button"
                      onClick={() => set("bot_wa_number", botStatus.normalized_bot_number)}
                      className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
                    >
                      Pakai {botStatus.normalized_bot_number}
                    </button>
                  )}
                </div>
              )}
            </div>

            <label className="block text-xs font-medium text-[#232528]">
              Nomor WA Bot (untuk tombol chat di keranjang & halaman pesanan)
              <input
                value={s.bot_wa_number ?? ""}
                onChange={(e) => set("bot_wa_number", e.target.value)}
                placeholder="mis. 6281234567890"
                className={`mt-1 ${inp}`}
              />
            </label>

            <p className="text-xs text-[#656B73]">
              Status WhatsApp Flows (form dalam WA):{" "}
              <b className="text-[#232528]">
                {s.wa_flow_configured ? "Aktif" : "Belum dikonfigurasi di server"}
              </b>
            </p>
          </Sec>

          <Sec title="Template Alert Meta (di Luar Jendela 24 Jam)">
            <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
              <label className="block text-xs font-medium text-[#232528]">
                Nama Template Meta
                <input
                  value={s.admin_alert_template ?? "admin_chat_butuh_balasan"}
                  onChange={(e) => set("admin_alert_template", e.target.value)}
                  className={`mt-1 ${inp}`}
                />
              </label>
              <label className="block text-xs font-medium text-[#232528]">
                Kode Bahasa
                <input
                  value={s.admin_alert_template_lang ?? "id"}
                  onChange={(e) => set("admin_alert_template_lang", e.target.value)}
                  className={`mt-1 ${inp}`}
                />
              </label>
            </div>

            <Toggle
              label="Template Meta di atas memiliki tombol URL dinamis (https://domain-anda/admin/{{1}})"
              checked={!!s.admin_alert_template_has_url_btn}
              onChange={(v) => set("admin_alert_template_has_url_btn", v)}
            />

            <div className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]">
              <button
                type="button"
                onClick={() => setShowTplGuide((v) => !v)}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium text-[#232528]"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5 text-[#5E93B8]" />
                  Panduan Pengajuan Template Meta untuk Tim IT
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTplGuide ? "rotate-180" : ""}`} />
              </button>
              {showTplGuide && (
                <div className="space-y-2 border-t border-[#EAE4DA] px-3.5 py-3 text-xs text-[#656B73]">
                  <p>
                    Kategori: <strong className="text-[#232528]">Utility</strong> · Bahasa:{" "}
                    <strong className="text-[#232528]">Indonesian (id)</strong> · Nama:{" "}
                    <code className="rounded bg-white px-1.5 py-0.5 text-[#232528]">
                      {s.admin_alert_template || "admin_chat_butuh_balasan"}
                    </code>
                  </p>
                  <pre className="whitespace-pre-wrap rounded-lg border border-[#EAE4DA] bg-white p-3 font-sans text-[#232528]">
                    {META_TEMPLATE_BODY}
                  </pre>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Tip: selama admin membalas chat bot minimal 1x dalam 24 jam, alert dikirim sebagai teks biasa.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(META_TEMPLATE_BODY);
                        toast.success("Teks template disalin");
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-[#EAE4DA] bg-white px-2.5 py-1 font-medium text-[#232528]"
                    >
                      <Copy className="h-3 w-3" /> Salin Teks Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Sec>
        </div>
      )}

      {/* Sticky Save Bar */}
      <div className="sticky bottom-4 z-20">
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-lg transition-colors ${
            dirty
              ? "border-amber-300 bg-amber-50/95 backdrop-blur"
              : "border-[#EAE4DA] bg-white/95 backdrop-blur"
          }`}
        >
          <span className="text-xs font-medium text-[#232528]">
            {dirty ? "Ada perubahan pengaturan yang belum disimpan." : "Semua pengaturan sudah tersimpan."}
          </span>
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={save}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#232528] px-5 text-xs font-medium text-white transition-opacity disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3.5 rounded-2xl border border-[#EAE4DA] bg-white p-5 shadow-sm">
      <h2 className="font-header text-lg text-[#232528]">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <label htmlFor={id} className="cursor-pointer select-none text-xs leading-relaxed text-[#232528] sm:text-sm">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#5E93B8]" : "bg-[#D9D3C8]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
