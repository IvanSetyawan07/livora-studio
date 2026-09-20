import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, CalendarDays, CircleAlert, Mail, MessageCircle, Search, SlidersHorizontal } from "lucide-react";
import { getAdminConsultations } from "@/lib/adminConsultations";
import type { Consultation } from "@/lib/consultations";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "attention", label: "Perlu perhatian" },
  { value: "new_inquiry", label: "Permintaan baru" },
  { value: "under_review", label: "Dalam peninjauan" },
  { value: "contacted", label: "Sudah dihubungi" },
  { value: "meeting_scheduled", label: "Pertemuan terjadwal" },
  { value: "in_progress", label: "Konsultasi berjalan" },
  { value: "agreement_pending", label: "Menunggu perjanjian" },
  { value: "dp_pending", label: "Menunggu uang muka" },
  { value: "project_paid", label: "Uang muka diterima" },
  { value: "project_running", label: "Proyek berjalan" },
  { value: "completed", label: "Selesai" },
] as const;

const statusLabel = (status: string) => STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status.replaceAll("_", " ");
const needsAttention = (item: Consultation) =>
  item.status === "new_inquiry" || item.status === "under_review" || item.status === "agreement_pending" || item.status === "dp_pending" || (item.unread_messages_count ?? 0) > 0;
const POLL_MS = 20_000;

export default function AdminConsultations() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getAdminConsultations();
      setItems(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch {
      if (!silent) toast.error("Gagal memuat daftar konsultasi.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load(true);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter = filter === "all" ? true : filter === "attention" ? needsAttention(item) : item.status === filter;
      const haystack = `${item.first_name} ${item.last_name ?? ""} ${item.email} ${item.phone ?? ""} ${item.service_type ?? ""}`.toLowerCase();
      return matchesFilter && (!needle || haystack.includes(needle));
    });
  }, [filter, items, query]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const activeCount = items.filter((item) => !["completed", "cancelled", "rejected"].includes(item.status)).length;
  const attentionCount = items.filter(needsAttention).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="mb-6 border-b border-border pb-6">
        <p className="mb-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">Operasional pelanggan</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="serif text-3xl sm:text-4xl">Konsultasi</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Kelola permintaan, dokumen, pembayaran, progres, dan percakapan dari satu ruang kerja.</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Metric value={activeCount} label="Aktif" />
            <Metric value={attentionCount} label="Perlu perhatian" tone={attentionCount > 0 ? "alert" : undefined} />
          </div>
        </div>
      </header>

      <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(260px,420px)_1fr]">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, email, telepon, atau layanan" className="ui-input h-11 pl-10" />
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
          {STATUS_OPTIONS.map((option) => (
            <Button key={option.value} size="sm" variant={filter === option.value ? "default" : "outline"} onClick={() => setFilter(option.value)} className="shrink-0">
              {option.label}{option.value === "attention" && attentionCount > 0 ? ` · ${attentionCount}` : ""}
            </Button>
          ))}
        </div>
      </div>

      {loading ? <ListSkeleton /> : filtered.length === 0 ? (
        <div className="border border-dashed border-border px-6 py-16 text-center">
          <p className="font-medium">Tidak ada konsultasi yang cocok.</p>
          <p className="mt-1 text-sm text-muted-foreground">Ubah kata pencarian atau pilih filter lain.</p>
        </div>
      ) : (
        <div className="grid min-h-[620px] overflow-hidden border border-border bg-card lg:grid-cols-[minmax(320px,36%)_1fr]">
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">{filtered.length} konsultasi</div>
            <div className="max-h-[720px] overflow-y-auto">
              {filtered.map((item) => (
                <button key={item.id} onClick={() => setSelectedId(item.id)} className={`block w-full border-b border-border px-4 py-4 text-left transition-colors ${selected?.id === item.id ? "bg-secondary" : "hover:bg-muted"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.first_name} {item.last_name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.service_type || item.project_type || "Konsultasi umum"}</p>
                    </div>
                    {(item.unread_messages_count ?? 0) > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">{item.unread_messages_count}</span>}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <StatusBadge status={item.status} />
                    <span className="text-[11px] text-muted-foreground">{new Date(item.updated_at || item.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <section className="flex min-h-[520px] flex-col p-5 sm:p-7 lg:p-8">
              <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Konsultasi #{selected.id}</p>
                  <h2 className="serif mt-1 text-3xl">{selected.first_name} {selected.last_name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{selected.email} · {selected.phone || "Nomor belum tersedia"}</p>
                </div>
                <Button onClick={() => navigate(`/admin/consultations/${selected.id}`)}>Buka ruang kerja <ArrowRight /></Button>
              </div>

              <div className="grid gap-px border-b border-border bg-border sm:grid-cols-3">
                <PreviewFact label="Tahap saat ini" value={statusLabel(selected.status)} />
                <PreviewFact label="Layanan" value={selected.service_type || "Belum ditentukan"} />
                <PreviewFact label="Dikirim" value={new Date(selected.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })} />
              </div>

              <div className="grid flex-1 gap-6 pt-6 md:grid-cols-2">
                <div>
                  <SectionLabel icon={CircleAlert} text="Tindakan berikutnya" />
                  <p className="mt-3 text-lg font-medium">{nextAction(selected)}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Buka ruang kerja untuk menjalankan tindakan dan melihat seluruh konteks pelanggan.</p>
                </div>
                <div>
                  <SectionLabel icon={MessageCircle} text="Pesan pelanggan" />
                  <p className="mt-3 line-clamp-4 text-sm leading-6">{selected.message || "Pelanggan tidak menambahkan pesan awal."}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 border-t border-border pt-5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><Mail className="size-4" /> {selected.email}</span>
                {selected.meeting_date && <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" /> {new Date(selected.meeting_date).toLocaleDateString("id-ID")}</span>}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ value, label, tone }: { value: number; label: string; tone?: "alert" }) {
  return <div className="text-right"><p className={tone ? "text-destructive text-2xl font-semibold" : "text-2xl font-semibold"}>{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}
function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-wider ${needsAttention({ status, unread_messages_count: 0 } as Consultation) ? "border-accent text-foreground" : "border-border text-muted-foreground"}`}>{statusLabel(status)}</span>;
}
function PreviewFact({ label, value }: { label: string; value: string }) {
  return <div className="bg-card px-4 py-5"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 text-sm font-medium">{value}</p></div>;
}
function SectionLabel({ icon: Icon, text }: { icon: typeof CircleAlert; text: string }) {
  return <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground"><Icon className="size-4" />{text}</div>;
}
function nextAction(item: Consultation) {
  const copy: Record<string, string> = { new_inquiry: "Tinjau dan setujui permintaan", under_review: "Selesaikan peninjauan", contacted: "Jadwalkan pertemuan", meeting_scheduled: "Mulai pertemuan", in_progress: "Unggah dokumen perjanjian", agreement_pending: "Pantau tanda tangan dan siapkan tagihan uang muka", dp_pending: "Verifikasi bukti pembayaran", project_paid: "Kirim pembaruan progres pertama", project_running: "Perbarui progres proyek", completed: "Arsipkan dan tinjau riwayat" };
  return copy[item.status] ?? "Tinjau detail konsultasi";
}
function ListSkeleton() {
  return <div className="space-y-2" aria-label="Memuat konsultasi">{[1,2,3,4].map((item) => <div key={item} className="h-20 animate-pulse bg-muted" />)}</div>;
}
