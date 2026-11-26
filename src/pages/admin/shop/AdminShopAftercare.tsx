import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldAlert, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { adminShop, openPrivate, rupiah } from "@/lib/shop";
import {
  PageHeader,
  AdminHelpBanner,
  EmptyState,
  StatusBadge,
  useAdminDialog,
  type Tone,
} from "@/components/admin/kit";

const CLAIM_TYPE: Record<string, string> = {
  kerusakan: "Barang Rusak",
  salah_ukuran: "Salah Ukuran",
  garansi: "Garansi",
  lainnya: "Lainnya",
};

const statusTone = (status: string): Tone => {
  if (["disetujui", "selesai", "dikirim"].includes(status)) return "success";
  if (["ditolak"].includes(status)) return "danger";
  if (["ditinjau"].includes(status)) return "info";
  return "warning";
};

/** Antrean klaim (Produksi) dan refund (Keuangan). */
export default function AdminShopAftercare() {
  const dialog = useAdminDialog();
  const [tab, setTab] = useState<"claims" | "refunds">("claims");
  const [claims, setClaims] = useState<any[] | null>(null);
  const [refunds, setRefunds] = useState<any[] | null>(null);
  const [open, setOpen] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [transferModal, setTransferModal] = useState<any | null>(null);

  const load = useCallback(() => {
    adminShop
      .claims(open ? "diajukan,ditinjau,disetujui" : undefined)
      .then(setClaims)
      .catch(() => setClaims([]));
    adminShop
      .refunds(open ? "diajukan,disetujui,dikirim" : undefined)
      .then(setRefunds)
      .catch(() => setRefunds([]));
  }, [open]);

  useEffect(() => {
    load();
  }, [load]);

  const claimAct = async (c: any, status: string) => {
    let resolution: string | undefined;
    if (status === "ditinjau") {
      const ok = await dialog.confirm({
        title: `Tandai Klaim ${c.code} Sedang Ditinjau?`,
        description: "Status klaim akan diperbarui menjadi Ditinjau agar pelanggan tahu tim sudah memeriksa laporannya.",
        confirmText: "Ya, Tandai Ditinjau",
        cancelText: "Batal",
      });
      if (!ok) return;
    } else {
      const r = await dialog.prompt({
        title:
          status === "ditolak"
            ? `Tolak Klaim ${c.code}?`
            : status === "disetujui"
              ? `Setujui Klaim ${c.code}?`
              : `Tandai Klaim ${c.code} Selesai?`,
        description: "Keterangan di bawah akan disampaikan kepada pelanggan.",
        label:
          status === "disetujui"
            ? "Rencana Penyelesaian (mis. ganti unit baru, dikirim 10 Okt)"
            : "Keterangan untuk Pelanggan",
        confirmText: status === "ditolak" ? "Tolak Klaim" : "Simpan & Kirim",
        cancelText: "Batal",
        tone: status === "ditolak" ? "danger" : "default",
        required: true,
      });
      if (typeof r !== "string" || !r.trim()) return;
      resolution = r.trim();
    }

    const key = `claim-${c.id}-${status}`;
    setBusyKey(key);
    try {
      await adminShop.updateClaim(c.id, status, resolution);
      toast.success("Status klaim berhasil diperbarui.");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Gagal memperbarui klaim");
    } finally {
      setBusyKey(null);
    }
  };

  const refundAct = async (r: any, action: "setujui" | "tolak" | "selesai") => {
    let note: string | undefined;
    if (action === "tolak") {
      const v = await dialog.prompt({
        title: `Tolak Refund ${r.code}?`,
        description: "Alasan penolakan akan disampaikan kepada pelanggan.",
        label: "Alasan Penolakan",
        confirmText: "Tolak Refund",
        cancelText: "Batal",
        tone: "danger",
        required: true,
      });
      if (typeof v !== "string" || !v.trim()) return;
      note = v.trim();
    } else if (action === "setujui") {
      const ok = await dialog.confirm({
        title: `Setujui Refund ${rupiah(r.amount)}?`,
        description:
          "Pesanan akan dibatalkan, stok dilepas kembali, dan pelanggan menerima notifikasi persetujuan refund.",
        confirmText: "Ya, Setujui Refund",
        cancelText: "Batal",
      });
      if (!ok) return;
    } else if (action === "selesai") {
      const ok = await dialog.confirm({
        title: `Tandai Refund ${r.code} Selesai?`,
        description: "Menutup pengajuan pengembalian dana ini secara permanen.",
        confirmText: "Ya, Tandai Selesai",
        cancelText: "Batal",
      });
      if (!ok) return;
    }

    const key = `refund-${r.id}-${action}`;
    setBusyKey(key);
    try {
      await adminShop.updateRefund(r.id, action, { note });
      toast.success("Status refund berhasil diperbarui.");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Gagal memperbarui refund");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Purnajual & Keuangan"
        title="Klaim & Pengembalian Dana"
        description="Klaim garansi atau kerusakan ditangani tim Produksi; pengembalian dana (refund) diproses tim Keuangan."
      />

      <AdminHelpBanner title="Alur Penanganan Purnajual" storageKey="admin-shop-aftercare-help">
        Setiap perubahan status klaim atau refund otomatis memberi tahu pelanggan. Untuk refund yang sudah disetujui, gunakan tombol <b>Konfirmasi Dana Ditransfer</b> untuk melampirkan bukti transfer bank.
      </AdminHelpBanner>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4DA] pb-2">
        <div className="inline-flex rounded-xl border border-[#EAE4DA] bg-white p-1">
          {(
            [
              ["claims", `Klaim Garansi${claims ? ` (${claims.length})` : ""}`],
              ["refunds", `Pengembalian Dana${refunds ? ` (${refunds.length})` : ""}`],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === k ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-[#232528]">
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
          Hanya tampilkan yang masih terbuka
        </label>
      </div>

      {tab === "claims" ? (
        claims === null ? (
          <div className="flex items-center gap-2 py-12 text-sm text-[#656B73]">
            <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat daftar klaim…
          </div>
        ) : claims.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="Tidak ada klaim pada filter ini"
            description="Semua klaim purnajual sudah selesai atau belum ada laporan baru dari pelanggan."
          />
        ) : (
          <ul className="space-y-3">
            {claims.map((c) => {
              const rowBusy = busyKey?.startsWith(`claim-${c.id}-`) ?? false;
              return (
                <li key={c.id} className="rounded-2xl border border-[#EAE4DA] bg-white p-4 text-sm shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/admin/shop/orders/${c.code}`}
                      className="font-mono font-semibold text-[#35678B] hover:underline"
                    >
                      {c.code}
                    </Link>
                    <StatusBadge tone="neutral">{CLAIM_TYPE[c.type] ?? c.type}</StatusBadge>
                    <StatusBadge tone={statusTone(c.status)}>{c.status}</StatusBadge>
                    <span className="text-xs text-[#656B73]">
                      {new Date(c.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-[#232528]">
                    {c.customer_name} · <span className="font-normal text-[#656B73]">{c.customer_phone}</span>
                  </p>
                  <p className="mt-2 text-sm text-[#232528]">{c.description}</p>
                  {(c.photos ?? []).length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {c.photos.map((p: string, i: number) => (
                        <button
                          key={p}
                          type="button"
                          className="rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-2.5 py-1 text-xs font-medium text-[#35678B] hover:border-[#5E93B8]"
                          onClick={() =>
                            openPrivate(`/admin/shop/files?path=${encodeURIComponent(p)}`).catch((e) =>
                              toast.error(e.message),
                            )
                          }
                        >
                          Lihat Foto {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                  {c.resolution && (
                    <p className="mt-2.5 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-2.5 text-xs text-[#232528]">
                      <b>Penyelesaian:</b> {c.resolution}
                    </p>
                  )}
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {c.status === "diajukan" && (
                      <ActionBtn busy={rowBusy} onClick={() => claimAct(c, "ditinjau")}>
                        Tandai Ditinjau
                      </ActionBtn>
                    )}
                    {["diajukan", "ditinjau"].includes(c.status) && (
                      <>
                        <ActionBtn busy={rowBusy} dark onClick={() => claimAct(c, "disetujui")}>
                          Setujui Klaim
                        </ActionBtn>
                        <ActionBtn busy={rowBusy} danger onClick={() => claimAct(c, "ditolak")}>
                          Tolak
                        </ActionBtn>
                      </>
                    )}
                    {c.status === "disetujui" && (
                      <ActionBtn busy={rowBusy} dark onClick={() => claimAct(c, "selesai")}>
                        Tandai Selesai
                      </ActionBtn>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : refunds === null ? (
        <div className="flex items-center gap-2 py-12 text-sm text-[#656B73]">
          <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Memuat daftar refund…
        </div>
      ) : refunds.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Tidak ada pengajuan refund pada filter ini"
          description="Belum ada pengajuan pengembalian dana yang perlu diproses."
        />
      ) : (
        <ul className="space-y-3">
          {refunds.map((r) => {
            const rowBusy = busyKey?.startsWith(`refund-${r.id}-`) ?? false;
            return (
              <li key={r.id} className="rounded-2xl border border-[#EAE4DA] bg-white p-4 text-sm shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/admin/shop/orders/${r.code}`}
                    className="font-mono font-semibold text-[#35678B] hover:underline"
                  >
                    {r.code}
                  </Link>
                  <b className="text-[#232528]">{rupiah(r.amount)}</b>
                  <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                  <span className="text-xs text-[#656B73]">
                    {new Date(r.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[#232528]">
                  {r.customer_name} · <span className="text-[#4C5259]">{r.reason}</span>
                </p>
                <p className="mt-1 text-xs text-[#656B73]">
                  Rekening tujuan:{" "}
                  <b className="text-[#232528]">
                    {r.bank_name ?? "—"} {r.account_number ?? ""}{" "}
                    {r.account_holder ? `a.n. ${r.account_holder}` : ""}
                  </b>
                </p>
                {r.admin_note && (
                  <p className="mt-2 rounded-lg bg-[#FAF8F4] px-3 py-1.5 text-xs text-[#4C5259]">
                    Catatan admin: {r.admin_note}
                  </p>
                )}
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {r.status === "diajukan" && (
                    <>
                      <ActionBtn busy={rowBusy} dark onClick={() => refundAct(r, "setujui")}>
                        Setujui Refund
                      </ActionBtn>
                      <ActionBtn busy={rowBusy} danger onClick={() => refundAct(r, "tolak")}>
                        Tolak
                      </ActionBtn>
                    </>
                  )}
                  {r.status === "disetujui" && (
                    <ActionBtn busy={rowBusy} dark onClick={() => setTransferModal(r)}>
                      Konfirmasi Dana Ditransfer
                    </ActionBtn>
                  )}
                  {r.status === "dikirim" && (
                    <ActionBtn busy={rowBusy} onClick={() => refundAct(r, "selesai")}>
                      Tandai Selesai
                    </ActionBtn>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {transferModal && (
        <RefundTransferModal
          refund={transferModal}
          onClose={() => setTransferModal(null)}
          onDone={() => {
            setTransferModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function RefundTransferModal({
  refund,
  onClose,
  onDone,
}: {
  refund: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const [proof, setProof] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await adminShop.updateRefund(refund.id, "kirim", { proof, note: note.trim() || undefined });
      toast.success("Status transfer refund tersimpan & pelanggan diberi tahu.");
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Gagal menyimpan bukti transfer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[#EAE4DA] bg-white p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between border-b border-[#EAE4DA] pb-3">
          <h2 className="font-header text-lg text-[#232528]">Konfirmasi Transfer Refund</h2>
          <button type="button" aria-label="Tutup" onClick={() => !busy && onClose()}>
            <X className="h-4 w-4 text-[#656B73]" />
          </button>
        </div>

        <div className="space-y-1 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-3.5 text-xs">
          <p className="text-[#656B73]">
            Pesanan: <b className="font-mono text-[#232528]">{refund.code}</b>
          </p>
          <p className="text-[#656B73]">
            Nominal: <b className="text-sm text-[#232528]">{rupiah(refund.amount)}</b>
          </p>
          <p className="text-[#656B73]">
            Rekening:{" "}
            <b className="text-[#232528]">
              {refund.bank_name ?? "—"} {refund.account_number ?? ""}{" "}
              {refund.account_holder ? `a.n. ${refund.account_holder}` : ""}
            </b>
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-[#232528]">
            Lampirkan Bukti Transfer (JPG/PNG/PDF, disarankan)
            <div className="mt-1.5 flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-2 text-xs text-[#232528] hover:border-[#5E93B8]">
                <Upload className="h-3.5 w-3.5 text-[#5E93B8]" />
                {proof ? "Ganti File" : "Pilih File Bukti"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                />
              </label>
              <span className="truncate text-xs text-[#656B73]">{proof ? proof.name : "Belum ada file"}</span>
            </div>
          </label>

          <label className="block text-xs font-medium text-[#232528]">
            Catatan Tambahan (opsional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. Ditransfer lewat BCA tanggal hari ini"
              className="mt-1 h-9 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-xs text-[#232528]"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-9 rounded-lg border border-[#EAE4DA] px-4 text-xs text-[#656B73]"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#232528] px-4 text-xs font-medium text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Konfirmasi Dana Sudah Ditransfer
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  dark,
  danger,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  dark?: boolean;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        dark
          ? "bg-[#232528] text-white hover:bg-[#35383d]"
          : danger
            ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border border-[#EAE4DA] bg-white text-[#232528] hover:border-[#5E93B8]"
      }`}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}
