import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Mail,
  MessageCircle,
  Phone,
  SlidersHorizontal,
} from "lucide-react";
import { getAdminConsultations } from "@/lib/adminConsultations";
import type { Consultation } from "@/lib/consultations";
import {
  AdminHelpBanner,
  DebouncedSearchInput,
  EmptyState,
  ErrorState,
  PageHeader,
  StatusBadge as KitStatusBadge,
  TableSkeleton,
} from "@/components/admin/kit";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "attention", label: "Perlu perhatian" },
  { value: "new_inquiry", label: "Permintaan baru" },
  { value: "under_review", label: "Dalam peninjauan" },
  { value: "contacted", label: "Sudah dihubungi" },
  { value: "meeting_scheduled", label: "Pertemuan terjadwal" },
  { value: "in_progress", label: "Konsultasi berjalan" },
  { value: "agreement_pending", label: "Menunggu perjanjian" },
  { value: "dp_pending", label: "Menunggu DP" },
  { value: "project_paid", label: "DP diterima" },
  { value: "project_running", label: "Proyek berjalan" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "rejected", label: "Ditolak" },
] as const;

const statusLabel = (status: string) =>
  STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status.replace(/_/g, " ");

const needsAttention = (item: Consultation) =>
  item.status === "new_inquiry" ||
  item.status === "under_review" ||
  item.status === "agreement_pending" ||
  item.status === "dp_pending" ||
  (item.unread_messages_count ?? 0) > 0;

function toWaLink(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const norm = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("8") ? `62${digits}` : digits;
  return `https://wa.me/${norm}`;
}

const POLL_MS = 20_000;

export default function AdminConsultations() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await getAdminConsultations();
      setItems(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch (err: any) {
      if (!silent) {
        setError(err?.message || "Gagal memuat daftar konsultasi.");
        toast.error("Gagal memuat daftar konsultasi.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void load(true);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter =
        filter === "all" ? true : filter === "attention" ? needsAttention(item) : item.status === filter;
      const haystack = `${item.first_name} ${item.last_name ?? ""} ${item.email} ${item.phone ?? ""} ${item.service_type ?? ""}`.toLowerCase();
      return matchesFilter && (!needle || haystack.includes(needle));
    });
  }, [filter, items, query]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const activeCount = items.filter((item) => !["completed", "cancelled", "rejected"].includes(item.status)).length;
  const attentionCount = items.filter(needsAttention).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pelanggan & Pesan"
        title="Konsultasi & Janji Temu"
        description="Kelola permintaan konsultasi desain, jadwal pertemuan, perjanjian digital, DP, pelunasan, dan progres proyek."
        actions={
          <div className="flex items-center gap-3">
            <KitStatusBadge tone="info">{activeCount} proyek aktif</KitStatusBadge>
            <KitStatusBadge tone={attentionCount > 0 ? "warning" : "success"}>
              {attentionCount} perlu tindakan
            </KitStatusBadge>
          </div>
        }
      />

      <AdminHelpBanner storageKey="consultations-list-help">
        Klik nama pelanggan di daftar kiri untuk melihat ringkasan cepat, lalu klik{" "}
        <strong>Buka Ruang Kerja</strong> untuk menyetujui, mengatur jadwal, membuat perjanjian, memverifikasi DP, atau
        mengirim pembaruan progres.
      </AdminHelpBanner>

      {/* Filter & Search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <DebouncedSearchInput
          value={query}
          onSearch={setQuery}
          placeholder="Cari nama, email, telepon, atau layanan…"
          className="w-full lg:w-80"
        />
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1">
          <SlidersHorizontal className="mr-1 h-4 w-4 shrink-0 text-[#656B73]" />
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === option.value
                  ? "border-[#232528] bg-[#232528] text-white"
                  : "border-[#E2DACF] bg-white text-[#4C5259] hover:border-[#5E93B8]"
              }`}
            >
              {option.label}
              {option.value === "attention" && attentionCount > 0 ? ` (${attentionCount})` : ""}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState title="Gagal memuat konsultasi" description={error} onRetry={() => void load()} />
      ) : loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada konsultasi yang cocok"
          description="Ubah kata pencarian atau pilih filter status lainnya."
        />
      ) : (
        <div className="grid min-h-[600px] overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white lg:grid-cols-[minmax(320px,36%)_1fr]">
          {/* List */}
          <div className="border-b border-[#EAE4DA] lg:border-b-0 lg:border-r">
            <div className="border-b border-[#EAE4DA] bg-[#FAF8F4] px-4 py-3 text-xs font-medium text-[#656B73]">
              {filtered.length} konsultasi ditemukan
            </div>
            <div className="max-h-[680px] divide-y divide-[#F1ECE4] overflow-y-auto">
              {filtered.map((item) => {
                const isSelected = selected?.id === item.id;
                const attention = needsAttention(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`block w-full px-4 py-4 text-left transition-colors ${
                      isSelected ? "bg-[#EDF4F8]/75" : "hover:bg-[#FAF8F4]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#232528]">
                          {item.first_name} {item.last_name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#656B73]">
                          {item.service_type || item.project_type || "Konsultasi umum"}
                        </p>
                      </div>
                      {(item.unread_messages_count ?? 0) > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#5E93B8] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {item.unread_messages_count}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <KitStatusBadge
                        tone={
                          item.status === "completed"
                            ? "success"
                            : item.status === "cancelled" || item.status === "rejected"
                              ? "danger"
                              : attention
                                ? "warning"
                                : "info"
                        }
                        dot={false}
                        className="text-[11px]"
                      >
                        {statusLabel(item.status)}
                      </KitStatusBadge>
                      <span className="text-[11px] text-[#656B73]">
                        {new Date(item.updated_at || item.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Pane */}
          {selected && (
            <section className="flex min-h-[500px] flex-col p-6 lg:p-8">
              <div className="flex flex-col gap-4 border-b border-[#EAE4DA] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-[#5E93B8]">Konsultasi #{selected.id}</p>
                  <h2 className="font-header mt-1 text-3xl text-[#232528]">
                    {selected.first_name} {selected.last_name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#656B73]">
                    {selected.email && (
                      <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1 hover:text-[#232528] hover:underline">
                        <Mail className="h-3.5 w-3.5 text-[#5E93B8]" /> {selected.email}
                      </a>
                    )}
                    {selected.phone && toWaLink(selected.phone) && (
                      <a
                        href={toWaLink(selected.phone)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-[#232528] hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 text-[#5E93B8]" /> {selected.phone} (WA)
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/consultations/${selected.id}`)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#232528] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#34383D]"
                >
                  Buka Ruang Kerja <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 border-b border-[#EAE4DA] py-5 sm:grid-cols-3">
                <PreviewFact label="Tahap Saat Ini" value={statusLabel(selected.status)} />
                <PreviewFact label="Layanan" value={selected.service_type || "Belum ditentukan"} />
                <PreviewFact
                  label="Masuk Tanggal"
                  value={new Date(selected.created_at).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                />
              </div>

              <div className="grid flex-1 gap-6 pt-6 md:grid-cols-2">
                <div className="rounded-xl border border-[#5E93B8]/25 bg-[#EDF4F8]/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#35678B]">
                    <CircleAlert className="h-4 w-4" /> Langkah Berikutnya
                  </div>
                  <p className="mt-2.5 text-base font-medium text-[#232528]">{nextAction(selected)}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#4C5259]">
                    Buka ruang kerja untuk mengeksekusi tahap ini, mengirim dokumen, atau membalas pelanggan.
                  </p>
                </div>
                <div className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#656B73]">
                    <MessageCircle className="h-4 w-4 text-[#5E93B8]" /> Pesan Awal Pelanggan
                  </div>
                  <p className="mt-2.5 line-clamp-5 text-sm leading-relaxed text-[#232528]">
                    {selected.message || "Pelanggan tidak menambahkan pesan awal."}
                  </p>
                </div>
              </div>

              {selected.meeting_date && (
                <div className="mt-5 flex items-center gap-2 border-t border-[#EAE4DA] pt-4 text-xs text-[#656B73]">
                  <CalendarDays className="h-4 w-4 text-[#5E93B8]" />
                  Jadwal pertemuan: <strong>{new Date(selected.meeting_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong>
                  {selected.meeting_time ? ` pukul ${selected.meeting_time}` : ""}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#656B73]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#232528]">{value}</p>
    </div>
  );
}

function nextAction(item: Consultation) {
  const copy: Record<string, string> = {
    new_inquiry: "Tinjau & setujui permintaan pelanggan",
    under_review: "Selesaikan peninjauan dan buka percakapan",
    contacted: "Jadwalkan sesi pertemuan (online/showroom)",
    meeting_scheduled: "Tandai pertemuan dimulai saat sesi berjalan",
    in_progress: "Buat naskah perjanjian digital & kirim ke pelanggan",
    agreement_pending: "Pantau tanda tangan pelanggan, countersign & siapkan tagihan DP",
    dp_pending: "Verifikasi bukti transfer DP dari pelanggan",
    project_paid: "Kirim pembaruan progres pertama proyek",
    project_running: "Kirim pembaruan progres & tagih pelunasan saat mencapai 85%",
    completed: "Proyek selesai — tinjau riwayat & arsip",
    cancelled: "Konsultasi dibatalkan",
    rejected: "Permintaan telah ditolak",
  };
  return copy[item.status] ?? "Tinjau detail konsultasi";
}
