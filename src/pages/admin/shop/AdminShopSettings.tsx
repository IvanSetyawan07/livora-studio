import { useEffect, useId, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, ChevronDown, Copy, Loader2, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminShop, rupiah } from "@/lib/shop";
import { PageHeader } from "@/components/admin/kit";

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const TPL: Record<string, string> = {
  greeting: "Sapaan awal",
  form_link: "Kirim tautan form ({nama}, {kode}, {link})",
  handoff: "Saat diserahkan ke tim",
  off_hours: "Di luar jam kerja",
  session_closed: "Sesi tim ditutup",
  unknown: "Bot tidak paham",
};
const META_TEMPLATE_BODY = `Ada pelanggan yang butuh dibalas admin Livora.

Nama/Nomor: {{1}}
Sumber: {{2}}
Catatan: {{3}}

Mohon segera dibalas melalui dashboard admin.`;

const inp = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/50";

/** Pengaturan toko tanpa deploy (Owner). */
export default function AdminShopSettings() {
  const [s, setS] = useState<Record<string, any> | null>(null);
  const [zones, setZones] = useState<[string, number][]>([]);
  const [alertPhones, setAlertPhones] = useState<string[]>([]);
  const [block, setBlock] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [showTplGuide, setShowTplGuide] = useState(false);

  const applyData = (d: Record<string, any>) => {
    setS(d);
    setZones(Object.entries(d.shipping_zones ?? {}) as [string, number][]);
    setAlertPhones((d.admin_alert_phones?.length ? d.admin_alert_phones : ["628212043307"]) as string[]);
    setBlock((d.blocklist ?? []).join("\n"));
  };

  useEffect(() => {
    adminShop.settings().then(applyData).catch((e) => toast.error(e.message));
  }, []);

  if (!s) return <Loader2 className="h-5 w-5 animate-spin" />;

  const set = (k: string, v: any) => setS((prev) => (prev ? { ...prev, [k]: v } : prev));

  const buildPayload = () => ({
    bot_enabled: s.bot_enabled,
    ai_answers_enabled: s.ai_answers_enabled,
    price_requires_admin: s.price_requires_admin,
    bot_wa_number: s.bot_wa_number ?? "",
    admin_alert_enabled: !!s.admin_alert_enabled,
    admin_alert_phones: alertPhones.map((p) => p.trim()).filter(Boolean),
    admin_alert_template: (s.admin_alert_template ?? "admin_chat_butuh_balasan").trim() || "admin_chat_butuh_balasan",
    admin_alert_template_lang: (s.admin_alert_template_lang ?? "id").trim() || "id",
    admin_alert_template_has_url_btn: !!s.admin_alert_template_has_url_btn,
    ignore_admin_inbound: s.ignore_admin_inbound !== false,
    business_hours: s.business_hours,
    templates: s.templates,
    shipping_zones: Object.fromEntries(zones.filter(([k]) => k.trim()).map(([k, v]) => [k.trim().toLowerCase(), Number(v) || 0])),
    blocklist: block.split(/[\n,]/).map((x) => x.trim()).filter(Boolean),
    review_threshold: Number(s.review_threshold),
    quote_valid_days: Number(s.quote_valid_days),
    sla_hours: Number(s.sla_hours),
    warranty_days: Number(s.warranty_days),
    return_days: Number(s.return_days),
    retention_days: Number(s.retention_days),
  });

  const save = async () => {
    setBusy(true);
    try {
      const d = await adminShop.saveSettings(buildPayload());
      applyData(d);
      toast.success("Pengaturan disimpan");
      return d;
    } catch (e: any) {
      toast.error(e.message);
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
      toast.success("Status Meta diperbarui");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRefreshingMeta(false);
    }
  };

  const sendTestAlert = async () => {
    setTestingAlert(true);
    setTestResult(null);
    try {
      // Simpan pengaturan dulu agar tes memakai nomor & template terbaru
      const saved = await adminShop.saveSettings(buildPayload());
      applyData(saved);
      const res = await adminShop.testAdminAlert();
      if (res.ok) {
        const modes = res.results.map((r) => `${r.phone} (${r.mode})`).join(", ");
        setTestResult({ ok: true, text: `Terkirim ke: ${modes}` });
        toast.success("Tes alert WA terkirim");
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
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={s[k] ?? ""}
          onChange={(e) => set(k, e.target.value)}
          className={inp}
          aria-label={label}
        />
        {suffix && <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );

  return (
    <div className="max-w-3xl space-y-6 pb-20">
      <PageHeader
        eyebrow="Sistem & Toko"
        title="Pengaturan toko"
        description="Berlaku langsung tanpa perlu deploy. Semua perubahan tercatat di catatan aktivitas."
      />

      {/* Nomor Bot & Status Meta */}
      <Sec title="Nomor WA Bot & Alert Admin">
        <div className="rounded-xl border border-border bg-background/60 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {botStatus.configured ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
              <span className="font-medium">
                {botStatus.configured
                  ? `Meta Cloud API aktif${botStatus.verified_name ? ` (${botStatus.verified_name})` : ""}`
                  : `Provider WA di server: ${botStatus.provider ?? "belum aktif"}`}
              </span>
            </div>
            <button
              type="button"
              onClick={refreshMeta}
              disabled={refreshingMeta}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className={`h-3 w-3 ${refreshingMeta ? "animate-spin" : ""}`} /> Cek status Meta
            </button>
          </div>

          <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <p>
              Nomor bot di Meta:{" "}
              <strong className="text-foreground">{botStatus.display_phone_number ?? "Belum terbaca (isi di .env server)"}</strong>
            </p>
            <p>
              Nomor link keranjang web: <strong className="text-foreground">{botStatus.link_number || "—"}</strong>
            </p>
          </div>

          {botStatus.error && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Info Meta: {botStatus.error}</p>}

          {(botStatus.mismatch || botStatus.uses_fallback_307) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <span>
                {botStatus.mismatch
                  ? `Perhatian: link keranjang (${botStatus.link_number}) berbeda dengan nomor bot Meta (${botStatus.display_phone_number}).`
                  : "Nomor WA bot belum diisi di bawah, sehingga link keranjang masih jatuh ke nomor bawaan 307."}
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

        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Nomor WA Bot (untuk tombol chat bot di keranjang & halaman pesanan)</span>
          <input
            value={s.bot_wa_number ?? ""}
            onChange={(e) => set("bot_wa_number", e.target.value)}
            placeholder="mis. 6281234567890 (kosongkan untuk memakai SHOP_WHATSAPP_NUMBER di .env)"
            className={inp}
          />
        </label>

        <div className="border-t border-border/70 pt-3 space-y-3">
          <Toggle
            label="Kirim alert WhatsApp ke admin saat chat/pesanan butuh respon (N1 chat WA, N18 live chat web, N17 cek harga, N8 bukti bayar, N15 gangguan)"
            checked={!!s.admin_alert_enabled}
            onChange={(v) => set("admin_alert_enabled", v)}
          />
          <Toggle
            label="Abaikan pesan masuk dari nomor admin di bot (supaya balasan alert dari 307 tidak dijawab bot, sekaligus membuka jendela chat 24 jam)"
            checked={s.ignore_admin_inbound !== false}
            onChange={(v) => set("ignore_admin_inbound", v)}
          />
        </div>

        <div className="space-y-2 pt-1">
          <span className="block text-sm text-muted-foreground">
            Nomor WA penerima alert (baris 1 = admin utama instan; baris 2+ = nomor eskalasi bila &gt;5 menit belum dibalas)
          </span>
          {alertPhones.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">
                {i === 0 ? "Admin utama" : `Eskalasi #${i + 1}`}
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
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAlertPhones([...alertPhones, ""])}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm transition-colors hover:bg-muted"
          >
            <Plus className="h-4 w-4" /> Tambah nomor eskalasi
          </button>
        </div>

        <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_110px]">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Nama Template Meta (wajib disetujui untuk pesan di luar 24 jam)</span>
            <input
              value={s.admin_alert_template ?? "admin_chat_butuh_balasan"}
              onChange={(e) => set("admin_alert_template", e.target.value)}
              className={inp}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Bahasa</span>
            <input
              value={s.admin_alert_template_lang ?? "id"}
              onChange={(e) => set("admin_alert_template_lang", e.target.value)}
              className={inp}
            />
          </label>
        </div>

        <Toggle
          label="Template Meta di atas memiliki tombol URL dinamis (https://domain-anda/admin/{{1}})"
          checked={!!s.admin_alert_template_has_url_btn}
          onChange={(v) => set("admin_alert_template_has_url_btn", v)}
        />

        <div className="rounded-lg border border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setShowTplGuide((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <BellRing className="h-3.5 w-3.5" /> Panduan template Meta untuk diajukan di WhatsApp Manager
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTplGuide ? "rotate-180" : ""}`} />
          </button>
          {showTplGuide && (
            <div className="space-y-2 border-t border-border px-3 py-3 text-xs text-muted-foreground">
              <p>
                Kategori: <strong className="text-foreground">Utility</strong> · Bahasa: <strong className="text-foreground">Indonesian (id)</strong> · Nama:{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-foreground">{s.admin_alert_template || "admin_chat_butuh_balasan"}</code>
              </p>
              <pre className="whitespace-pre-wrap rounded-lg border border-border bg-background p-3 font-sans text-foreground">{META_TEMPLATE_BODY}</pre>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Tip: selama admin membalas chat dari bot minimal 1x dalam 24 jam, alert dikirim sebagai teks biasa (tanpa perlu template).</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(META_TEMPLATE_BODY);
                    toast.success("Teks template disalin");
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-foreground hover:bg-muted"
                >
                  <Copy className="h-3 w-3" /> Salin isi template
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={testingAlert || busy}
            onClick={sendTestAlert}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {testingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Simpan &amp; Kirim Tes Alert WA
          </button>
          {testResult && (
            <span className={`text-xs ${testResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {testResult.text}
            </span>
          )}
        </div>
      </Sec>

      <Sec title="Bot WhatsApp">
        <Toggle label="Bot aktif (matikan = semua chat langsung ke tim)" checked={!!s.bot_enabled} onChange={(v) => set("bot_enabled", v)} />
        <Toggle label="Jawab pertanyaan bebas dengan AI (bot tetap menyatakan dirinya asisten AI)" checked={!!s.ai_answers_enabled} onChange={(v) => set("ai_answers_enabled", v)} />
        <Toggle
          label='Pertanyaan harga selalu dicek admin dulu (Livi: "sebentar ya, Livi cek dulu"). Matikan = Livi memakai harga terkonfirmasi di data produk'
          checked={s.price_requires_admin !== false}
          onChange={(v) => set("price_requires_admin", v)}
        />
        <p className="text-xs text-muted-foreground">
          Form pengiriman di dalam WhatsApp (WhatsApp Flows): {s.wa_flow_configured ? "aktif" : "belum aktif — isi SHOP_WA_FLOW_ID di server"}.
        </p>
      </Sec>

      <Sec title="Jam operasional">
        <div className="flex flex-wrap gap-1">
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
                    days: on ? s.business_hours.days.filter((x: number) => x !== day) : [...(s.business_hours?.days ?? []), day],
                  })
                }
                className={`h-9 w-12 rounded-lg text-sm transition-colors ${on ? "bg-foreground text-background" : "border border-border hover:bg-muted"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="time"
            value={s.business_hours?.start ?? "09:00"}
            onChange={(e) => set("business_hours", { ...s.business_hours, start: e.target.value })}
            className="h-10 rounded-lg border border-border bg-background px-2"
            aria-label="Jam buka"
          />
          <span>sampai</span>
          <input
            type="time"
            value={s.business_hours?.end ?? "17:00"}
            onChange={(e) => set("business_hours", { ...s.business_hours, end: e.target.value })}
            className="h-10 rounded-lg border border-border bg-background px-2"
            aria-label="Jam tutup"
          />
          <span className="text-muted-foreground">WIB</span>
        </div>
      </Sec>

      <Sec title="Teks template bot">
        {Object.entries(TPL).map(([k, l]) => (
          <label key={k} className="block text-sm">
            <span className="mb-1 block text-muted-foreground">{l}</span>
            <textarea
              rows={2}
              value={s.templates?.[k] ?? ""}
              onChange={(e) => set("templates", { ...s.templates, [k]: e.target.value })}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-foreground/50"
            />
          </label>
        ))}
        <p className="text-xs text-muted-foreground">
          Pesan di luar jendela 24 jam wajib memakai template yang disetujui Meta; status approval dicek di WhatsApp Manager.
        </p>
      </Sec>

      <Sec title="Zona & tarif ongkir">
        <p className="text-xs text-muted-foreground">
          Nama kota atau provinsi persis seperti diisi pelanggan. Kota dicocokkan lebih dulu. Wilayah di luar daftar dihitung manual oleh admin.
        </p>
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
            <span className="w-28 shrink-0 text-xs text-muted-foreground">{rupiah(v)}</span>
            <button
              type="button"
              aria-label="Hapus zona"
              onClick={() => setZones(zones.filter((_, j) => j !== i))}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setZones([...zones, ["", 0]])}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-muted"
        >
          <Plus className="h-4 w-4" /> Tambah zona
        </button>
      </Sec>

      <Sec title="Aturan pesanan">
        <div className="grid gap-3 sm:grid-cols-3">
          <Num k="review_threshold" label="Batas nilai wajib review" suffix="Rp" />
          <Num k="quote_valid_days" label="Masa berlaku penawaran" suffix="hari" />
          <Num k="sla_hours" label="Target waktu review" suffix="jam" />
          <Num k="return_days" label="Batas klaim rusak/salah ukuran" suffix="hari" />
          <Num k="warranty_days" label="Masa garansi" suffix="hari" />
          <Num k="retention_days" label="Simpan chat WA selama" suffix="hari" />
        </div>
        <p className="text-xs text-muted-foreground">Masa garansi, retur, dan retensi data sebaiknya dikonfirmasi dengan penasihat hukum (UU PDP).</p>
      </Sec>

      <Sec title="Daftar blokir">
        <textarea
          rows={3}
          value={block}
          onChange={(e) => setBlock(e.target.value)}
          placeholder="Satu nomor per baris (08… atau 62…)"
          aria-label="Nomor diblokir"
          className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-foreground/50"
        />
      </Sec>

      <div className="sticky bottom-4">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan pengaturan
        </button>
      </div>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="serif text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <label htmlFor={id} className="cursor-pointer select-none">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-foreground" : "bg-border"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
