import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Heart, Mail, MessageCircle, Send, X, Loader2, Info } from "lucide-react";
import {
  getAdminWishlists,
  sendWishlistFollowUp,
  type AdminWishlistGroup,
} from "@/lib/adminConsultations";
import { imgUrl } from "@/lib/adminApi";
import {
  PageHeader,
  AdminHelpBanner,
  DebouncedSearchInput,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/admin/kit";

const toWaPhone = (phone?: string | null) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
};

const buildWaUrl = (g: AdminWishlistGroup) => {
  const wa = toWaPhone(g.user.phone);
  if (!wa) return null;
  const topNames = g.items
    .slice(0, 3)
    .map((it) => it.entity?.name)
    .filter(Boolean)
    .join(", ");
  const text = `Halo Kak ${g.user.name || ""}, kami dari Livora Studio melihat Kakak menyimpan ${
    topNames || `${g.count} produk`
  } di wishlist. Apakah ada yang ingin ditanyakan mengenai dimensi, bahan, atau estimasi harga?`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
};

export default function AdminWishlists() {
  const [groups, setGroups] = useState<AdminWishlistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminWishlistGroup | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminWishlists();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Gagal memuat data wishlist pelanggan";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, sending]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.user.name?.toLowerCase().includes(q) ||
        g.user.email?.toLowerCase().includes(q) ||
        g.user.phone?.toLowerCase().includes(q) ||
        g.items.some((it) => it.entity?.name?.toLowerCase().includes(q)),
    );
  }, [groups, search]);

  const sendEmail = async () => {
    if (!selected || !message.trim()) {
      toast.error("Tulis pesan follow-up terlebih dahulu.");
      return;
    }
    setSending(true);
    try {
      await sendWishlistFollowUp(selected.user.id, {
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      toast.success(`Email follow-up berhasil dikirim ke ${selected.user.email}.`);
      setMessage("");
      setSubject("");
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal mengirim email follow-up");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Pelanggan & Minat"
        title="Wishlist Pelanggan"
        description="Daftar produk dan koleksi yang disimpan pelanggan. Cocok untuk follow-up penawaran lewat Email atau WhatsApp."
      />

      <AdminHelpBanner title="Tips Follow-Up Wishlist" storageKey="admin-wishlists-help">
        Klik <b>Lihat & Kirim Email</b> untuk melihat foto barang yang disimpan pelanggan sekaligus mengirim email penawaran.
        Tombol <b>WhatsApp</b> akan otomatis menyiapkan pesan sapaan ramah berisi daftar produk pilihan pelanggan.
      </AdminHelpBanner>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#656B73]">
          Menampilkan <b className="text-[#232528]">{filtered.length}</b> dari {groups.length} pelanggan
        </p>
        <DebouncedSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari nama pelanggan, email, atau nama produk..."
          className="w-full sm:w-80"
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={groups.length === 0 ? "Belum ada wishlist pelanggan" : "Tidak ada hasil yang cocok"}
          description={
            groups.length === 0
              ? "Saat pelanggan menekan ikon hati pada produk atau proyek di website, daftarnya akan muncul di sini."
              : "Coba ubah kata kunci pencarian Anda."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#EAE4DA] bg-white shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#EAE4DA] bg-[#FAF8F4] text-[11px] font-medium uppercase tracking-wider text-[#656B73]">
                <tr>
                  <th className="px-4 py-3 text-left">Pelanggan</th>
                  <th className="px-4 py-3 text-left">Nomor HP</th>
                  <th className="px-4 py-3 text-left">Produk Disimpan</th>
                  <th className="px-4 py-3 text-left">Terakhir Ditambah</th>
                  <th className="px-4 py-3 text-right">Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => {
                  const waUrl = buildWaUrl(g);
                  return (
                    <tr
                      key={g.user.id}
                      className="border-b border-[#EAE4DA]/80 last:border-0 transition-colors hover:bg-[#FAF8F4]/70"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-[#232528]">{g.user.name}</div>
                        <div className="text-xs text-[#656B73]">{g.user.email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#232528]">{g.user.phone || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EDF4F8] px-2.5 py-0.5 text-xs font-medium text-[#35678B]">
                          <Heart className="h-3 w-3" /> {g.count} item
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#656B73]">
                        {new Date(g.last_added).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(g)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3 py-1.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
                          >
                            <Mail className="h-3.5 w-3.5 text-[#5E93B8]" /> Lihat & Kirim Email
                          </button>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
          onClick={() => !sending && setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#EAE4DA] bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#EAE4DA] pb-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#5E93B8]">
                  Follow-Up Wishlist
                </p>
                <h2 className="font-header mt-0.5 text-2xl text-[#232528]">{selected.user.name}</h2>
                <p className="text-xs text-[#656B73]">
                  {selected.user.email}
                  {selected.user.phone ? ` · ${selected.user.phone}` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup modal"
                onClick={() => !sending && setSelected(null)}
                className="rounded-lg p-1.5 text-[#656B73] hover:bg-[#FAF8F4] hover:text-[#232528]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-[#656B73]">
                Daftar Disimpan ({selected.count} item)
              </h3>
              <ul className="divide-y divide-[#EAE4DA]/70 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/60 px-3">
                {selected.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#EAE4DA] bg-white">
                      {it.entity?.image ? (
                        <img
                          src={imgUrl(it.entity.image)}
                          alt={it.entity?.name ?? "Item"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[#656B73]">Tanpa foto</span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate font-medium text-[#232528]">{it.entity?.name ?? "—"}</span>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[11px] capitalize text-[#656B73] border border-[#EAE4DA]">
                        {it.type}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-header text-lg text-[#232528]">Kirim Email Follow-Up</h3>
              <div className="flex items-start gap-2 rounded-lg border border-[#5E93B8]/25 bg-[#EDF4F8]/70 px-3 py-2 text-xs text-[#35678B]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Kartu produk beserta foto dari daftar wishlist di atas akan <b>otomatis disertakan</b> di dalam email yang dikirim ke pelanggan.
                </span>
              </div>
              <input
                type="text"
                placeholder="Subjek email (opsional — kosongkan untuk subjek standar Livora)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-2.5 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none"
              />
              <textarea
                rows={5}
                placeholder="Tulis pesan pribadi untuk pelanggan, misalnya info stok, opsi bahan, atau penawaran konsultasi showroom…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-2.5 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none"
              />
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => setSelected(null)}
                  className="h-10 rounded-lg border border-[#EAE4DA] px-4 text-xs font-medium text-[#656B73] hover:bg-[#FAF8F4]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={sendEmail}
                  disabled={sending}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#232528] px-5 text-xs font-medium text-white transition-opacity disabled:opacity-60"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {sending ? "Mengirim..." : "Kirim Email Sekarang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
