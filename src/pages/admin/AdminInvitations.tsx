import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  Send,
  Sparkles as Wand,
  Trash2,
  Upload,
  RefreshCw,
  MessageSquareText,
  ExternalLink,
  ImagePlus,
  X,
  CheckCircle2,
  Check,
  CalendarHeart,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  PageHeader,
  AdminHelpBanner,
  EmptyState,
  ErrorState,
  StatusBadge,
  useAdminDialog,
} from "@/components/admin/kit";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";

type Ev = {
  id: number;
  name: string;
  event_date: string | null;
  location: string | null;
  description_format: string | null;
  ai_instructions: string | null;
  knowledge: string | null;
  default_image_url: string | null;
  wa_template_name: string | null;
  wa_template_lang: string;
  template_has_buttons: boolean;
  sheet_csv_url: string | null;
  sheet_name_column: string | null;
  sheet_phone_column: string | null;
  is_active: boolean;
  guests_count?: number;
  sent_count?: number;
  hadir_count?: number;
  tidak_count?: number;
};

type Guest = {
  id: number;
  name: string;
  phone: string;
  category: string;
  source: string;
  description: string | null;
  image_url: string | null;
  image_path: string | null;
  status: string;
  send_channel: string | null;
  sent_at: string | null;
  rsvp: string | null;
  error_note: string | null;
  notes: string | null;
};

const errMsg = (e: any, f: string) => e?.response?.data?.message || f;
const STATUS: Record<string, string> = {
  draft: "Draf",
  siap: "Siap kirim",
  terkirim: "Terkirim",
  gagal: "Gagal",
  dibalas: "Dibalas",
};
const CAT: Record<string, string> = {
  rekanan: "Rekanan",
  pelanggan: "Pelanggan",
  pendaftar: "Pendaftar Form",
};
const RSVP_FILTER_OPTIONS = [
  { v: "", l: "Semua kehadiran" },
  { v: "hadir", l: "Hadir" },
  { v: "tidak", l: "Tidak hadir" },
  { v: "belum", l: "Belum konfirmasi" },
];

const input =
  "h-10 w-full rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none";
const area =
  "w-full rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-3 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none";
const pill = (on: boolean) =>
  `h-9 rounded-full px-4 text-xs font-medium transition-colors ${
    on
      ? "bg-[#232528] text-white"
      : "border border-[#EAE4DA] bg-white text-[#656B73] hover:border-[#5E93B8] hover:text-[#232528]"
  }`;

export default function AdminInvitations() {
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("invitations");

  const [events, setEvents] = useState<Ev[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [tab, setTab] = useState<"guests" | "event" | "chat">("guests");

  // Shared filter state so clicking the 4 KPI cards directly filters GuestsTab
  const [statusFilter, setStatusFilter] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState("");

  const loadEvents = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await api.get<Ev[]>("/admin/invitations/events");
      setEvents(r.data);
      setEventId((cur) => {
        if (cur && r.data.some((e) => e.id === cur)) return cur;
        return r.data[0]?.id ?? null;
      });
    } catch (e) {
      setLoadError(errMsg(e, "Gagal memuat daftar acara"));
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const event = events?.find((e) => e.id === eventId) ?? null;

  const newEvent = async () => {
    if (!editable) return;
    const name = await dialog.prompt({
      title: "Buat Acara Undangan Baru",
      description: "Masukkan nama acara, misalnya Soft Opening Showroom Livora.",
      label: "Nama Acara",
      placeholder: "Soft Opening Livora",
      confirmText: "Buat Acara",
    });
    if (!name?.trim()) return;
    try {
      const r = await api.post<Ev>("/admin/invitations/events", { name: name.trim() });
      await loadEvents();
      setEventId(r.data.id);
      setTab("event");
      toast.success("Acara berhasil dibuat. Silakan lengkapi detailnya.");
    } catch (e) {
      toast.error(errMsg(e, "Gagal membuat acara"));
    }
  };

  const applyKpiFilter = (kind: "all" | "sent" | "hadir" | "tidak") => {
    setTab("guests");
    if (kind === "all") {
      setStatusFilter("");
      setRsvpFilter("");
    } else if (kind === "sent") {
      setStatusFilter("terkirim");
      setRsvpFilter("");
    } else if (kind === "hadir") {
      setStatusFilter("");
      setRsvpFilter("hadir");
    } else if (kind === "tidak") {
      setStatusFilter("");
      setRsvpFilter("tidak");
    }
  };

  const kpiCards: {
    key: "all" | "sent" | "hadir" | "tidak";
    label: string;
    value: number;
    active: boolean;
  }[] = event
    ? [
        {
          key: "all",
          label: "Total Tamu",
          value: event.guests_count ?? 0,
          active: tab === "guests" && !statusFilter && !rsvpFilter,
        },
        {
          key: "sent",
          label: "Sudah Dikirim",
          value: event.sent_count ?? 0,
          active: tab === "guests" && statusFilter === "terkirim" && !rsvpFilter,
        },
        {
          key: "hadir",
          label: "Konfirmasi Hadir",
          value: event.hadir_count ?? 0,
          active: tab === "guests" && rsvpFilter === "hadir",
        },
        {
          key: "tidak",
          label: "Tidak Hadir",
          value: event.tidak_count ?? 0,
          active: tab === "guests" && rsvpFilter === "tidak",
        },
      ]
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Acara & RSVP"
        title="Sebar Undangan WhatsApp"
        description="Kelola daftar tamu, kirim undangan WhatsApp otomatis lewat Livi atau secara manual, pantau RSVP, dan tanya AI."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {events && events.length > 0 && (
              <select
                aria-label="Pilih acara"
                value={eventId ?? ""}
                onChange={(e) => {
                  setEventId(Number(e.target.value));
                  setStatusFilter("");
                  setRsvpFilter("");
                }}
                className="h-9 rounded-full border border-[#EAE4DA] bg-white px-4 text-xs font-medium text-[#232528]"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}
            {editable && (
              <button
                type="button"
                onClick={newEvent}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#232528] px-4 text-xs font-medium text-white hover:bg-[#35383d]"
              >
                <Plus className="h-3.5 w-3.5" /> Acara Baru
              </button>
            )}
          </div>
        }
      />

      <AdminHelpBanner title="Alur Praktis Sebar Undangan" storageKey="admin-invitations-help">
        1) Lengkapi detail acara & pesan template di tab <b>Pengaturan Acara</b>. 2) Tambah/impor tamu di <b>Daftar Tamu</b>.
        3) Centang tamu untuk menyusun pesan otomatis atau mengirim via WhatsApp. Klik kartu angka di bawah untuk langsung menyaring daftar tamu.
      </AdminHelpBanner>

      {loadError ? (
        <ErrorState message={loadError} onRetry={loadEvents} />
      ) : events === null ? (
        <div className="flex items-center gap-2 py-16 text-sm text-[#656B73]">
          <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat daftar acara…
        </div>
      ) : !event ? (
        <EmptyState
          icon={CalendarHeart}
          title="Belum ada acara undangan"
          description="Buat acara pertama Anda untuk mulai menyusun daftar tamu dan mengirim undangan WhatsApp."
          action={
            editable ? (
              <button
                type="button"
                onClick={newEvent}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#232528] px-4 text-xs font-medium text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Buat Acara Pertama
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpiCards.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => applyKpiFilter(c.key)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  c.active
                    ? "border-[#5E93B8] bg-[#EDF4F8]/70 ring-1 ring-[#5E93B8]/40"
                    : "border-[#EAE4DA] bg-white hover:border-[#5E93B8]/50"
                }`}
              >
                <p className="text-xs text-[#656B73]">{c.label}</p>
                <p className="font-header mt-1 text-2xl text-[#232528]">{c.value}</p>
                <p className="mt-0.5 text-[11px] text-[#5E93B8]">
                  {c.active ? "Filter aktif" : "Klik untuk saring"}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={pill(tab === "guests")} onClick={() => setTab("guests")}>
              Daftar Tamu
            </button>
            <button type="button" className={pill(tab === "event")} onClick={() => setTab("event")}>
              Pengaturan Acara
            </button>
            <button type="button" className={pill(tab === "chat")} onClick={() => setTab("chat")}>
              Tanya AI soal Tamu
            </button>
          </div>

          {tab === "guests" && (
            <GuestsTab
              key={event.id}
              event={event}
              editable={editable}
              status={statusFilter}
              setStatus={setStatusFilter}
              rsvp={rsvpFilter}
              setRsvp={setRsvpFilter}
              onChanged={loadEvents}
            />
          )}
          {tab === "event" && (
            <EventTab
              key={event.id}
              event={event}
              editable={editable}
              onSaved={loadEvents}
              onDeleted={() => {
                setEventId(null);
                loadEvents();
              }}
            />
          )}
          {tab === "chat" && <ChatTab key={event.id} event={event} editable={editable} />}
        </>
      )}
    </div>
  );
}

function Sec({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 shadow-sm">
      <h3 className="font-header text-base text-[#232528]">{title}</h3>
      {hint && <p className="mt-1 text-xs leading-relaxed text-[#656B73]">{hint}</p>}
      <div className="mt-3.5 space-y-3">{children}</div>
    </section>
  );
}

function B({
  k,
  busy,
  onClick,
  children,
  primary,
  danger,
}: {
  k: string;
  busy: string | null;
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!!busy}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-medium transition-colors disabled:opacity-50 ${
        primary
          ? "bg-[#232528] text-white hover:bg-[#35383d]"
          : danger
            ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border border-[#EAE4DA] bg-white text-[#232528] hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
      }`}
    >
      {busy === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {children}
    </button>
  );
}

/* ---------------- Daftar tamu ---------------- */
function GuestsTab({
  event,
  editable,
  status,
  setStatus,
  rsvp,
  setRsvp,
  onChanged,
}: {
  event: Ev;
  editable: boolean;
  status: string;
  setStatus: (v: string) => void;
  rsvp: string;
  setRsvp: (v: string) => void;
  onChanged: () => void;
}) {
  const dialog = useAdminDialog();
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<Guest | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingManualIds, setPendingManualIds] = useState<Set<number>>(new Set());
  const base = `/admin/invitations/events/${event.id}`;

  const load = useCallback(() => {
    api
      .get<Guest[]>(`${base}/guests`, {
        params: {
          q: q || undefined,
          category: cat || undefined,
          status: status || undefined,
          rsvp: rsvp || undefined,
        },
      })
      .then((r) => setGuests(r.data))
      .catch(() => setGuests([]));
  }, [base, q, cat, status, rsvp]);

  useEffect(() => {
    setSel(new Set());
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const refresh = () => {
    load();
    onChanged();
  };

  const ids = [...sel];
  const allOn = !!guests?.length && guests.every((g) => sel.has(g.id));
  const toggle = (id: number) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const generate = (mode: "format" | "ai") =>
    run(mode, async () => {
      if (!ids.length) return void toast.error("Pilih tamu terlebih dahulu");
      let overwrite = false;
      if (guests?.some((g) => sel.has(g.id) && g.description)) {
        overwrite = await dialog.confirm({
          title: "Timpa Pesan yang Sudah Ada?",
          description:
            "Sebagian tamu yang dipilih sudah memiliki teks pesan undangan. Pilih Timpa untuk menggantinya, atau Batal untuk hanya mengisi tamu yang masih kosong.",
          confirmText: "Timpa Semua",
          cancelText: "Hanya Isi yang Kosong",
        });
      }
      let done = 0;
      let failed = 0;
      for (let i = 0; i < ids.length; i += 20) {
        try {
          const r = await api.post(`${base}/generate`, {
            ids: ids.slice(i, i + 20),
            mode,
            overwrite,
          });
          done += r.data.done;
          failed += r.data.failed;
          if (r.data.message) toast.error(r.data.message);
        } catch (e) {
          toast.error(errMsg(e, "Gagal membuat deskripsi"));
          break;
        }
      }
      toast.success(`${done} pesan dibuat${failed ? `, ${failed} gagal` : ""}`);
      refresh();
    });

  const sendAuto = () =>
    run("send", async () => {
      if (!ids.length) return void toast.error("Pilih tamu terlebih dahulu");
      const ok = await dialog.confirm({
        title: `Kirim Undangan ke ${ids.length} Tamu?`,
        description:
          "Undangan akan langsung dikirim lewat nomor WhatsApp resmi Livi kepada tamu yang dipilih.",
        confirmText: "Ya, Kirim Sekarang",
        cancelText: "Batal",
      });
      if (!ok) return;
      let sent = 0;
      const fails: string[] = [];
      for (let i = 0; i < ids.length; i += 10) {
        try {
          const r = await api.post(`${base}/send`, { ids: ids.slice(i, i + 10) });
          sent += r.data.sent;
          r.data.results
            .filter((x: any) => !x.ok)
            .forEach((x: any) => fails.push(`${x.name}: ${x.error}`));
        } catch (e) {
          toast.error(errMsg(e, "Gagal mengirim undangan"));
          break;
        }
      }
      if (sent) toast.success(`${sent} undangan berhasil terkirim`);
      if (fails.length) {
        toast.error(
          fails.slice(0, 3).join("\n") + (fails.length > 3 ? `\n+${fails.length - 3} lainnya` : ""),
          { duration: 10000 },
        );
      }
      setSel(new Set());
      refresh();
    });

  const remove = () =>
    run("del", async () => {
      if (!ids.length) return;
      const ok = await dialog.confirm({
        title: `Hapus ${ids.length} Tamu?`,
        description: "Data tamu yang dipilih akan dihapus permanen dari acara ini.",
        confirmText: "Ya, Hapus",
        cancelText: "Batal",
        tone: "danger",
      });
      if (!ok) return;
      await api.post(`${base}/guests/delete`, { ids });
      toast.success(`${ids.length} tamu dihapus.`);
      setSel(new Set());
      refresh();
    });

  const pull = () =>
    run("sheet", async () => {
      try {
        const r = await api.post(`${base}/pull-sheet`);
        toast.success(
          `Dari Google Sheet: ${r.data.added} baru, ${r.data.updated} diperbarui, ${r.data.skipped} dilewati.`,
        );
        refresh();
      } catch (e) {
        toast.error(errMsg(e, "Gagal menarik data dari Google Sheet"));
      }
    });

  const openManualWa = async (g: Guest) => {
    try {
      const r = await api.get(`${base}/guests/${g.id}/manual`);
      window.open(r.data.url, "_blank", "noopener");
      if (r.data.image_url) {
        toast.info("Lampirkan gambar undangannya di chat WhatsApp, lalu klik 'Tandai Terkirim' di baris tamu.", {
          action: { label: "Buka Gambar", onClick: () => window.open(r.data.image_url, "_blank") },
          duration: 8000,
        });
      }
      setPendingManualIds((prev) => new Set(prev).add(g.id));
    } catch (e) {
      toast.error(errMsg(e, "Gagal membuka WhatsApp"));
    }
  };

  const confirmManualSent = async (g: Guest) => {
    setBusy(`manual-${g.id}`);
    try {
      await api.post(`${base}/guests/${g.id}/manual-sent`);
      setPendingManualIds((prev) => {
        const next = new Set(prev);
        next.delete(g.id);
        return next;
      });
      toast.success(`Undangan untuk ${g.name} ditandai sudah terkirim.`);
      refresh();
    } catch (e) {
      toast.error(errMsg(e, "Gagal memperbarui status terkirim"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama atau nomor WhatsApp..."
          aria-label="Cari tamu"
          className="h-9 min-w-[220px] flex-1 rounded-full border border-[#EAE4DA] bg-white px-4 text-sm text-[#232528] focus:border-[#5E93B8] focus:outline-none"
        />
        <select
          aria-label="Kategori"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="h-9 rounded-full border border-[#EAE4DA] bg-white px-3 text-xs text-[#232528]"
        >
          <option value="">Semua kategori</option>
          {Object.entries(CAT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-full border border-[#EAE4DA] bg-white px-3 text-xs text-[#232528]"
        >
          <option value="">Semua status kirim</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter kehadiran"
          value={rsvp}
          onChange={(e) => setRsvp(e.target.value)}
          className="h-9 rounded-full border border-[#EAE4DA] bg-white px-3 text-xs text-[#232528]"
        >
          {RSVP_FILTER_OPTIONS.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </div>

      {editable && (
        <div className="mt-3 flex flex-wrap gap-2">
          <B busy={busy} k="add" primary onClick={() => setEdit("new")}>
            <Plus className="h-3.5 w-3.5" /> Tambah Tamu
          </B>
          <B busy={busy} k="imp" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5" /> Tempel / Impor Daftar
          </B>
          <B busy={busy} k="sheet" onClick={pull}>
            <RefreshCw className="h-3.5 w-3.5" /> Tarik dari Google Sheet
          </B>
        </div>
      )}

      {editable && sel.size > 0 && (
        <div className="sticky top-2 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#5E93B8]/40 bg-[#EDF4F8] p-3 shadow-sm">
          <span className="px-1 text-xs font-semibold text-[#232528]">{sel.size} tamu dipilih</span>
          <B busy={busy} k="format" onClick={() => generate("format")}>
            Isi dari Format
          </B>
          <B busy={busy} k="ai" onClick={() => generate("ai")}>
            <Wand className="h-3.5 w-3.5 text-[#5E93B8]" /> Tulis dengan AI
          </B>
          <B busy={busy} k="send" primary onClick={sendAuto}>
            <Send className="h-3.5 w-3.5" /> Kirim Otomatis (Livi)
          </B>
          <B busy={busy} k="del" danger onClick={remove}>
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </B>
        </div>
      )}

      {guests === null ? (
        <div className="flex items-center gap-2 py-16 text-sm text-[#656B73]">
          <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat daftar tamu…
        </div>
      ) : !guests.length ? (
        <p className="mt-6 rounded-2xl border border-dashed border-[#EAE4DA] bg-white py-14 text-center text-sm text-[#656B73]">
          Tidak ada tamu pada filter ini. Tambah satu per satu, tempel daftar, atau tarik dari Google Sheet.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[#EAE4DA] bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[#FAF8F4] text-left text-[11px] font-medium uppercase tracking-wider text-[#656B73]">
              <tr>
                {editable && (
                  <th className="p-3">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua"
                      checked={allOn}
                      onChange={() => setSel(allOn ? new Set() : new Set(guests.map((g) => g.id)))}
                    />
                  </th>
                )}
                <th className="p-3">Tamu</th>
                <th className="p-3">Gambar</th>
                <th className="p-3">Pesan Undangan</th>
                <th className="p-3">Status</th>
                <th className="p-3">Kehadiran</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => {
                const isPendingManual = pendingManualIds.has(g.id);
                return (
                  <tr key={g.id} className="border-t border-[#EAE4DA]/80 align-top hover:bg-[#FAF8F4]/50">
                    {editable && (
                      <td className="p-3">
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${g.name}`}
                          checked={sel.has(g.id)}
                          onChange={() => toggle(g.id)}
                        />
                      </td>
                    )}
                    <td className="p-3">
                      <p className="font-medium text-[#232528]">{g.name}</p>
                      <p className="font-mono text-xs text-[#656B73]">+{g.phone}</p>
                      <p className="mt-0.5 text-[11px] text-[#5E93B8]">{CAT[g.category] ?? g.category}</p>
                    </td>
                    <td className="p-3">
                      {g.image_url ? (
                        <img src={g.image_url} alt="" className="h-14 w-14 rounded-lg border border-[#EAE4DA] object-cover" />
                      ) : (
                        <span className="text-xs text-[#9AA0A6]">—</span>
                      )}
                      {g.image_url && !g.image_path && (
                        <p className="mt-0.5 text-[10px] text-[#656B73]">gambar umum</p>
                      )}
                    </td>
                    <td className="max-w-[300px] p-3">
                      <p className="line-clamp-3 whitespace-pre-line text-xs text-[#232528]">
                        {g.description || <span className="text-[#9AA0A6]">Belum ada pesan</span>}
                      </p>
                    </td>
                    <td className="p-3">
                      <StatusBadge
                        tone={
                          g.status === "gagal"
                            ? "danger"
                            : g.status === "terkirim" || g.status === "dibalas"
                              ? "success"
                              : g.status === "siap"
                                ? "info"
                                : "neutral"
                        }
                      >
                        {STATUS[g.status] ?? g.status}
                      </StatusBadge>
                      {g.send_channel && (
                        <p className="mt-1 text-[11px] text-[#656B73]">via {g.send_channel}</p>
                      )}
                      {g.error_note && (
                        <p className="mt-1 max-w-[200px] text-[11px] text-rose-600">{g.error_note}</p>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {g.rsvp === "hadir" ? (
                        <StatusBadge tone="success">Hadir</StatusBadge>
                      ) : g.rsvp === "tidak" ? (
                        <StatusBadge tone="danger">Tidak hadir</StatusBadge>
                      ) : (
                        <span className="text-[#9AA0A6]">Belum konfirmasi</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex flex-col items-end gap-1.5">
                        {editable && (
                          <button
                            type="button"
                            onClick={() => setEdit(g)}
                            className="rounded-full border border-[#EAE4DA] bg-white px-3 py-1 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                          >
                            Ubah
                          </button>
                        )}
                        {editable && (
                          <button
                            type="button"
                            onClick={() => openManualWa(g)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#EAE4DA] bg-white px-3 py-1 text-xs text-[#232528] hover:border-emerald-500 hover:text-emerald-700"
                          >
                            <ExternalLink className="h-3 w-3" /> Buka WA
                          </button>
                        )}
                        {editable && isPendingManual && (
                          <button
                            type="button"
                            disabled={busy === `manual-${g.id}`}
                            onClick={() => confirmManualSent(g)}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busy === `manual-${g.id}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Tandai Terkirim
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <GuestDialog
          event={event}
          guest={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            refresh();
          }}
        />
      )}
      {importOpen && (
        <ImportDialog
          base={base}
          onClose={() => setImportOpen(false)}
          onDone={() => {
            setImportOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-[#EAE4DA] bg-white p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[#EAE4DA] pb-3">
          <h2 className="font-header text-xl text-[#232528]">{title}</h2>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="rounded-lg p-1 text-[#656B73] hover:bg-[#FAF8F4] hover:text-[#232528]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function GuestDialog({
  event,
  guest,
  onClose,
  onSaved,
}: {
  event: Ev;
  guest: Guest | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: guest?.name ?? "",
    phone: guest?.phone ?? "",
    category: guest?.category ?? "pelanggan",
    description: guest?.description ?? "",
    rsvp: guest?.rsvp ?? "",
    notes: guest?.notes ?? "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) {
      setFileUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const preview = fileUrl ?? guest?.image_url ?? null;
  const base = `/admin/invitations/events/${event.id}/guests`;

  const save = async () => {
    setSaving(true);
    const fd = new FormData();
    // Always append every field including empty rsvp so admin can reset RSVP back to "Belum konfirmasi"
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append("image", file);
    try {
      await api.post(guest ? `${base}/${guest.id}` : base, fd);
      toast.success("Data tamu tersimpan");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e, "Gagal menyimpan tamu"));
    } finally {
      setSaving(false);
    }
  };

  const removeImg = async () => {
    if (!guest) return;
    try {
      await api.delete(`${base}/${guest.id}/image`);
      toast.success("Gambar pribadi dihapus");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e, "Gagal menghapus gambar"));
    }
  };

  return (
    <Modal title={guest ? "Ubah Data Tamu" : "Tambah Tamu Baru"} onClose={onClose}>
      <div className="space-y-3.5">
        <label className="block text-xs font-medium text-[#232528]">
          Nama Lengkap
          <input className={`mt-1 ${input}`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label className="block text-xs font-medium text-[#232528]">
          Nomor WhatsApp
          <input
            className={`mt-1 ${input}`}
            value={f.phone}
            placeholder="0812xxxx atau 62812xxxx"
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-[#232528]">
          Kategori Tamu
          <select
            className={`mt-1 ${input}`}
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {Object.entries(CAT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="text-xs font-medium text-[#232528]">
          Gambar Undangan{" "}
          {!guest?.image_path && event.default_image_url && (
            <span className="font-normal text-[#656B73]">(kosong = pakai gambar umum acara)</span>
          )}
          <div className="mt-1.5 flex items-center gap-3">
            {preview && <img src={preview} alt="" className="h-20 w-20 rounded-xl border border-[#EAE4DA] object-cover" />}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#EAE4DA] bg-[#FAF8F4] px-4 py-2 text-xs text-[#232528] hover:border-[#5E93B8]">
              <ImagePlus className="h-4 w-4 text-[#5E93B8]" /> Pilih Gambar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {guest?.image_path && !file && (
              <button type="button" onClick={removeImg} className="text-xs text-rose-600 hover:underline">
                Hapus gambar pribadi
              </button>
            )}
          </div>
        </div>
        <label className="block text-xs font-medium text-[#232528]">
          Pesan Undangan WhatsApp
          <textarea
            rows={6}
            className={`mt-1 ${area}`}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            placeholder="Kosongkan bila ingin diisi otomatis memakai Format atau AI nanti"
          />
        </label>
        <label className="block text-xs font-medium text-[#232528]">
          Status Kehadiran (RSVP)
          <select className={`mt-1 ${input}`} value={f.rsvp} onChange={(e) => setF({ ...f, rsvp: e.target.value })}>
            <option value="">Belum konfirmasi</option>
            <option value="hadir">Hadir</option>
            <option value="tidak">Tidak hadir</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-[#232528]">
          Catatan Internal
          <input className={`mt-1 ${input}`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#232528] text-sm font-medium text-white disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Tamu
        </button>
      </div>
    </Modal>
  );
}

function ImportDialog({
  base,
  onClose,
  onDone,
}: {
  base: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("pelanggan");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () =>
      text
        .split(/\r?\n/)
        .map((l) => l.split(/\t|;|,/).map((s) => s.trim()))
        .filter((p) => p.length >= 2 && p[0] && p[1])
        .map(([a, b]) =>
          /\d{6,}/.test(a.replace(/\D/g, "")) && !/\d{6,}/.test(b.replace(/\D/g, ""))
            ? { name: b, phone: a }
            : { name: a, phone: b },
        )
        .filter((r) => !/^(nama|name)$/i.test(r.name)),
    [text],
  );

  const onFile = async (f?: File) => {
    if (f) setText(await f.text());
  };

  const save = async () => {
    if (!rows.length) return void toast.error("Belum ada baris nama & nomor yang terbaca");
    setSaving(true);
    try {
      const r = await api.post(`${base}/guests/bulk`, {
        rows: rows.map((x) => ({ ...x, category })),
      });
      toast.success(`${r.data.added} tamu ditambahkan, ${r.data.skipped} sudah ada sebelumnya.`);
      if (r.data.invalid.length) {
        toast.error(`Nomor tidak valid: ${r.data.invalid.slice(0, 5).join(", ")}`, { duration: 10000 });
      }
      onDone();
    } catch (e) {
      toast.error(errMsg(e, "Gagal mengimpor daftar tamu"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Tempel / Impor Daftar Tamu" onClose={onClose}>
      <p className="text-xs leading-relaxed text-[#656B73]">
        Tulis satu tamu per baris dengan format <b>Nama, Nomor</b>. Anda juga bisa langsung menyalin 2 kolom dari Excel/Google Sheet atau mengunggah file CSV.
      </p>
      <textarea
        rows={9}
        className={`${area} mt-3 font-mono text-xs`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Budi Santoso, 081234567890\nPT Maju Jaya - Ibu Rina, 6281298765432"}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#EAE4DA] bg-[#FAF8F4] px-4 py-2 text-xs text-[#232528] hover:border-[#5E93B8]">
          <Upload className="h-3.5 w-3.5 text-[#5E93B8]" /> Unggah CSV
          <input
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        <select
          aria-label="Kategori"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-full border border-[#EAE4DA] bg-white px-3 text-xs text-[#232528]"
        >
          {Object.entries(CAT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="text-xs font-medium text-[#35678B]">{rows.length} baris terbaca</span>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#232528] text-sm font-medium text-white disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Tambahkan ke Daftar Tamu
      </button>
    </Modal>
  );
}

/* ---------------- Pengaturan acara ---------------- */
function EventTab({
  event,
  editable,
  onSaved,
  onDeleted,
}: {
  event: Ev;
  editable: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const dialog = useAdminDialog();
  const [f, setF] = useState({
    name: event.name,
    event_date: event.event_date ? event.event_date.slice(0, 16).replace(" ", "T") : "",
    location: event.location ?? "",
    description_format: event.description_format ?? "",
    ai_instructions: event.ai_instructions ?? "",
    knowledge: event.knowledge ?? "",
    wa_template_name: event.wa_template_name ?? "",
    wa_template_lang: event.wa_template_lang ?? "id",
    template_has_buttons: event.template_has_buttons,
    sheet_csv_url: event.sheet_csv_url ?? "",
    sheet_name_column: event.sheet_name_column ?? "",
    sheet_phone_column: event.sheet_phone_column ?? "",
    is_active: event.is_active,
  });
  const [img, setImg] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!img) {
      setImgUrl(null);
      return;
    }
    const url = URL.createObjectURL(img);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [img]);

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, typeof v === "boolean" ? (v ? "1" : "0") : v));
    if (img) fd.append("default_image", img);
    try {
      await api.post(`/admin/invitations/events/${event.id}`, fd);
      toast.success("Pengaturan acara tersimpan");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e, "Gagal menyimpan pengaturan"));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    const ok = await dialog.confirm({
      title: `Hapus Acara "${event.name}"?`,
      description: "Acara beserta seluruh daftar tamu dan riwayat undangannya akan dihapus permanen.",
      confirmText: "Ya, Hapus Acara",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/invitations/events/${event.id}`);
      toast.success("Acara berhasil dihapus");
      onDeleted();
    } catch (e) {
      toast.error(errMsg(e, "Gagal menghapus acara"));
    }
  };

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Sec title="Detail Acara">
        <label className="block text-xs font-medium text-[#232528]">
          Nama Acara
          <input className={`mt-1 ${input}`} value={f.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="block text-xs font-medium text-[#232528]">
          Tanggal & Jam
          <input
            type="datetime-local"
            className={`mt-1 ${input}`}
            value={f.event_date}
            onChange={(e) => set("event_date", e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-[#232528]">
          Lokasi Acara
          <input className={`mt-1 ${input}`} value={f.location} onChange={(e) => set("location", e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-xs text-[#232528]">
          <input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          Acara aktif (izinkan Livi menjawab pertanyaan tamu tentang acara ini)
        </label>
        <div className="text-xs font-medium text-[#232528]">
          Gambar Undangan Umum{" "}
          <span className="font-normal text-[#656B73]">(dipakai untuk tamu yang tidak punya gambar pribadi)</span>
          <div className="mt-1.5 flex items-center gap-3">
            {(imgUrl || event.default_image_url) && (
              <img
                src={imgUrl ?? event.default_image_url!}
                alt=""
                className="h-20 w-20 rounded-xl border border-[#EAE4DA] object-cover"
              />
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#EAE4DA] bg-[#FAF8F4] px-4 py-2 text-xs text-[#232528] hover:border-[#5E93B8]">
              <ImagePlus className="h-4 w-4 text-[#5E93B8]" /> Pilih Gambar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImg(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      </Sec>

      <Sec
        title="Format Pesan Undangan"
        hint="Tulis contoh pesan. Gunakan {nama}, {acara}, {tanggal}, {lokasi} agar otomatis diganti sesuai masing-masing tamu."
      >
        <textarea
          rows={8}
          className={area}
          value={f.description_format}
          onChange={(e) => set("description_format", e.target.value)}
          placeholder={
            "Halo Kak {nama}\n\nDengan senang hati kami mengundang Kakak ke {acara} pada {tanggal} di {lokasi}.\n\nSampai jumpa!\nTim Livora"
          }
        />
        <label className="block text-xs font-medium text-[#232528]">
          Arahan Gaya Bahasa untuk AI (opsional)
          <textarea
            rows={3}
            className={`mt-1 ${area}`}
            value={f.ai_instructions}
            onChange={(e) => set("ai_instructions", e.target.value)}
            placeholder="mis. Rekanan pakai sapaan Bapak/Ibu, singkat dan elegan"
          />
        </label>
      </Sec>

      <Sec
        title="Informasi Acara untuk Livi"
        hint="Catat dress code, info parkir, susunan acara, atau kontak panitia. Livi hanya menjawab berdasarkan catatan ini."
      >
        <textarea
          rows={8}
          className={area}
          value={f.knowledge}
          onChange={(e) => set("knowledge", e.target.value)}
          placeholder={
            "Dress code: smart casual, nuansa earth tone\nParkir: tersedia di depan showroom\nBoleh membawa pasangan/keluarga\nKontak panitia: ..."
          }
        />
      </Sec>

      <Sec
        title="Sinkronisasi Google Sheet Pendaftar"
        hint="Tempel tautan Google Sheet dari formulir pendaftaran. Pastikan akses berbagi disetel 'Siapa saja yang memiliki link (Pelihat)'."
      >
        <label className="block text-xs font-medium text-[#232528]">
          Tautan Google Sheet
          <input
            className={`mt-1 ${input}`}
            value={f.sheet_csv_url}
            onChange={(e) => set("sheet_csv_url", e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-[#232528]">
            Judul Kolom Nama
            <input
              className={`mt-1 ${input}`}
              value={f.sheet_name_column}
              onChange={(e) => set("sheet_name_column", e.target.value)}
              placeholder="Nama Lengkap"
            />
          </label>
          <label className="block text-xs font-medium text-[#232528]">
            Judul Kolom Nomor WA
            <input
              className={`mt-1 ${input}`}
              value={f.sheet_phone_column}
              onChange={(e) => set("sheet_phone_column", e.target.value)}
              placeholder="Nomor WhatsApp"
            />
          </label>
        </div>

        <details className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-3 text-xs">
          <summary className="cursor-pointer font-medium text-[#232528]">
            Pengaturan Template WhatsApp Meta (untuk Kirim Otomatis / Tim IT)
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-[11px] leading-relaxed text-[#656B73]">
              Untuk tamu yang belum menghubungi Livi dalam 24 jam, Meta mewajibkan template resmi dengan header gambar, parameter {"{{1}}"} untuk nama, dan tombol balas cepat.
            </p>
            <label className="block text-xs font-medium text-[#232528]">
              Nama Template Meta
              <input
                className={`mt-1 ${input}`}
                value={f.wa_template_name}
                onChange={(e) => set("wa_template_name", e.target.value)}
                placeholder="undangan_soft_opening"
              />
            </label>
            <label className="block text-xs font-medium text-[#232528]">
              Kode Bahasa Template
              <input
                className={`mt-1 ${input}`}
                value={f.wa_template_lang}
                onChange={(e) => set("wa_template_lang", e.target.value)}
                placeholder="id"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[#232528]">
              <input
                type="checkbox"
                checked={f.template_has_buttons}
                onChange={(e) => set("template_has_buttons", e.target.checked)}
              />
              Template memiliki 2 tombol (Hadir / Tidak bisa hadir)
            </label>
          </div>
        </details>
      </Sec>

      {editable && (
        <div className="flex flex-wrap gap-2 lg:col-span-2">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#232528] px-6 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Simpan Pengaturan Acara
          </button>
          <button
            type="button"
            onClick={del}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" /> Hapus Acara
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Tanya AI ---------------- */
function ChatTab({ event, editable }: { event: Ev; editable: boolean }) {
  const dialog = useAdminDialog();
  const [msgs, setMsgs] = useState<{ role: string; content: string }[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const base = `/admin/invitations/events/${event.id}/chat`;

  useEffect(() => {
    api
      .get(base)
      .then((r) => setMsgs(r.data))
      .catch(() => setMsgs([]));
  }, [base]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, sending]);

  const send = async (q = text) => {
    q = q.trim();
    if (!q || sending) return;
    setText("");
    setMsgs((m) => [...(m ?? []), { role: "user", content: q }]);
    setSending(true);
    try {
      const r = await api.post(base, { message: q });
      setMsgs((m) => [...(m ?? []), { role: "assistant", content: r.data.reply }]);
    } catch (e) {
      toast.error(errMsg(e, "AI gagal menjawab"));
      setMsgs((m) => (m ?? []).slice(0, -1));
      setText(q);
    } finally {
      setSending(false);
    }
  };

  const clear = async () => {
    const ok = await dialog.confirm({
      title: "Hapus Riwayat Tanya AI?",
      description: "Seluruh percakapan analisis undangan untuk acara ini akan dibersihkan.",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;
    await api.delete(base);
    setMsgs([]);
    toast.success("Riwayat chat dihapus");
  };

  const ideas = [
    "Berapa tamu yang sudah konfirmasi hadir?",
    "Siapa rekanan yang belum dikirimi undangan?",
    "Daftar undangan yang gagal terkirim dan alasannya",
    "Buatkan pesan pengingat H-1 acara",
  ];

  return (
    <div className="mt-4 flex h-[68vh] flex-col rounded-2xl border border-[#EAE4DA] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#EAE4DA] px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-[#232528]">
          <MessageSquareText className="h-4 w-4 text-[#5E93B8]" />
          Tanya AI tentang data undangan &ldquo;{event.name}&rdquo;
        </p>
        {editable && !!msgs?.length && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-[#656B73] hover:text-rose-600 hover:underline"
          >
            Hapus riwayat
          </button>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#FAF8F4]/50 p-4">
        {msgs === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" />
        ) : (
          !msgs.length && (
            <div className="space-y-2">
              <p className="text-xs text-[#656B73]">Pilih pertanyaan cepat atau ketik pertanyaan Anda sendiri:</p>
              <div className="flex flex-wrap gap-2">
                {ideas.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => send(i)}
                    className="rounded-full border border-[#EAE4DA] bg-white px-3.5 py-1.5 text-xs text-[#232528] hover:border-[#5E93B8] hover:bg-[#EDF4F8]/60"
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )
        )}
        {msgs?.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] rounded-2xl bg-[#232528] px-4 py-2.5 text-sm text-white"
                : "max-w-[90%] whitespace-pre-line rounded-2xl border border-[#EAE4DA] bg-white px-4 py-2.5 text-sm text-[#232528]"
            }
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-[#656B73]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5E93B8]" /> Menganalisis data tamu…
          </div>
        )}
        <div ref={end} />
      </div>
      <form
        className="flex gap-2 border-t border-[#EAE4DA] bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tanyakan apa saja soal tamu & undangan…"
          aria-label="Pesan"
          className="h-10 flex-1 rounded-full border border-[#EAE4DA] bg-[#FAF8F4] px-4 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Kirim"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#232528] text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
