import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Factory, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { adminShop, openPrivate, rupiah } from "@/lib/shop";
import { useAdminDialog } from "@/components/admin/kit";

const box = "rounded-2xl border border-[#EAE4DA] bg-white p-5 text-sm shadow-sm";
const inp =
  "h-10 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none";
const btn =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-medium disabled:opacity-50";

/** Panel Tahap Produksi, BAST, Change Order, Refund, Klaim & Tautan Proyek di detail pesanan admin. */
export default function AdminOrderAftercare({ o, reload }: { o: any; reload: () => void }) {
  const dialog = useAdminDialog();
  const [x, setX] = useState<any>(null);
  const [projects, setProjects] = useState<{ id: number; title: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [chg, setChg] = useState({ description: "", price_delta: 0 });
  const [bast, setBast] = useState<{ photos: File[]; signature: File | null; receiver: string; notes: string }>({
    photos: [],
    signature: null,
    receiver: "",
    notes: "",
  });
  const [rf, setRf] = useState({
    reason: "",
    amount: 0,
    bank_name: "",
    account_number: "",
    account_holder: "",
  });

  const load = useCallback(() => adminShop.extras(o.code).then(setX).catch(() => {}), [o.code]);
  useEffect(() => {
    load();
    adminShop.projects().then(setProjects).catch(() => {});
  }, [load]);

  const run = async (k: string, fn: () => Promise<any>, ok: string) => {
    setBusy(k);
    try {
      await fn();
      toast.success(ok);
      await load();
      reload();
      return true;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Gagal memproses");
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (!x) return null;
  const slaOver = o.status === "menunggu_review_admin" && x.sla_due_at && new Date(x.sla_due_at) < new Date();
  const paidStage = ["dibayar", "diproses", "perlu_tindakan"].includes(o.status);
  const viewFile = (path: string) =>
    openPrivate(`/admin/shop/files?path=${encodeURIComponent(path)}`).catch((e) => toast.error(e.message));

  const startProduction = async () => {
    const ok = await dialog.confirm({
      title: "Mulai Produksi Barang Custom?",
      description:
        "Setelah produksi dimulai, pesanan tidak dapat dibatalkan oleh pelanggan dan notifikasi progres akan dikirim otomatis.",
      confirmText: "Ya, Mulai Produksi",
      cancelText: "Batal",
    });
    if (!ok) return;
    run("prod", () => adminShop.startProduction(o.code), "Produksi dimulai. Pesanan tidak bisa dibatalkan lagi.");
  };

  const submitBast = async () => {
    const ok = await dialog.confirm({
      title: "Simpan Berita Acara Serah Terima (BAST)?",
      description: `Foto serah terima atas nama penerima "${bast.receiver}" akan disimpan dan status pesanan otomatis berubah menjadi Diterima.`,
      confirmText: "Ya, Simpan BAST",
      cancelText: "Batal",
    });
    if (!ok) return;
    run(
      "bast",
      () => adminShop.bast(o.code, bast.photos, bast.receiver.trim(), bast.signature, bast.notes.trim()),
      "BAST tersimpan, pesanan ditandai Diterima.",
    );
  };

  const submitChange = async () => {
    const totalWithPpn = Math.round(chg.price_delta * 1.11);
    const ok = await dialog.confirm({
      title: "Kirim Usulan Perubahan (Change Order)?",
      description: `Pelanggan akan diminta menyetujui revisi "${chg.description}" dengan selisih ${rupiah(totalWithPpn)} (termasuk PPN 11%).`,
      confirmText: "Ya, Kirim Usulan",
      cancelText: "Batal",
    });
    if (!ok) return;
    if (
      await run(
        "chg",
        () => adminShop.createChange(o.code, chg.description.trim(), chg.price_delta),
        "Usulan perubahan dikirim ke pelanggan.",
      )
    ) {
      setChg({ description: "", price_delta: 0 });
    }
  };

  const submitRefund = async () => {
    const ok = await dialog.confirm({
      title: "Ajukan Pengembalian Dana (Refund)?",
      description: `Pengajuan refund untuk pesanan ${o.code} akan dicatat dan diteruskan ke menu Klaim & Refund untuk diproses tim Keuangan.`,
      confirmText: "Ya, Buat Pengajuan",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;
    const okRes = await run(
      "rf",
      () =>
        adminShop.createRefund(o.code, {
          reason: rf.reason.trim(),
          amount: rf.amount || undefined,
          bank_name: rf.bank_name.trim() || undefined,
          account_number: rf.account_number.trim() || undefined,
          account_holder: rf.account_holder.trim() || undefined,
        }),
      "Pengajuan refund dibuat. Lanjutkan prosesnya di menu Klaim & Refund.",
    );
    if (okRes) {
      setRf({ reason: "", amount: 0, bank_name: "", account_number: "", account_holder: "" });
    }
  };

  return (
    <div className="space-y-5">
      {o.status === "menunggu_review_admin" && x.sla_due_at && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-4 text-xs font-medium ${
            slaOver
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-[#EAE4DA] bg-[#FAF8F4] text-[#232528]"
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Target tinjauan admin:{" "}
          {new Date(x.sla_due_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
          {slaOver && " — sudah melewati target waktu"}
        </div>
      )}

      {x.has_mto && (
        <section className={box}>
          <h2 className="font-header text-base text-[#232528]">Barang Custom / Pre-Order (MTO)</h2>
          <ul className="mt-2.5 space-y-1.5 text-xs text-[#656B73]">
            {o.items
              .filter((i: any) => i.fulfillment_type === "made_to_order")
              .map((i: any) => {
                const s = x.custom_spec?.find((c: any) => c.order_item_id === i.id);
                return (
                  <li key={i.id}>
                    <span className="font-medium text-[#232528]">{i.title}</span>:{" "}
                    {[s?.dimensions, s?.material, s?.color].filter(Boolean).join(" · ") ||
                      "belum ada spesifikasi khusus"}
                    {s?.notes ? ` — ${s.notes}` : ""}
                  </li>
                );
              })}
          </ul>
          <p className="mt-3 text-xs text-[#656B73]">
            Spesifikasi disetujui pelanggan:{" "}
            <b className="text-[#232528]">
              {x.spec_approved_at ? new Date(x.spec_approved_at).toLocaleString("id-ID") : "belum"}
            </b>{" "}
            · Produksi:{" "}
            <b className="text-[#232528]">
              {x.production_started_at ? new Date(x.production_started_at).toLocaleString("id-ID") : "belum dimulai"}
            </b>
          </p>
          {paidStage && !x.production_started_at && (
            <button
              type="button"
              disabled={!!busy}
              onClick={startProduction}
              className={`${btn} mt-3 bg-[#232528] text-white hover:bg-[#35383d]`}
            >
              {busy === "prod" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />}
              Mulai Produksi
            </button>
          )}
        </section>
      )}

      {["siap_kirim", "dikirim"].includes(o.status) && (
        <section className={box}>
          <h2 className="font-header text-base text-[#232528]">Berita Acara Serah Terima (BAST)</h2>
          <p className="mt-1 text-xs text-[#656B73]">
            Unggah foto barang yang sudah tiba di lokasi dan tanda terima. Setelah disimpan, pesanan otomatis berstatus Diterima.
          </p>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-[#232528]">
              Foto serah terima (wajib, maks. 8 foto)
              <input
                type="file"
                accept="image/*"
                multiple
                className="mt-1 block w-full text-xs text-[#656B73]"
                onChange={(e) => setBast({ ...bast, photos: Array.from(e.target.files ?? []).slice(0, 8) })}
              />
            </label>
            <label className="text-xs font-medium text-[#232528]">
              Foto tanda terima / TTD (opsional)
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-xs text-[#656B73]"
                onChange={(e) => setBast({ ...bast, signature: e.target.files?.[0] ?? null })}
              />
            </label>
            <input
              className={inp}
              placeholder="Nama penerima di lokasi *"
              aria-label="Nama penerima"
              value={bast.receiver}
              onChange={(e) => setBast({ ...bast, receiver: e.target.value })}
            />
            <input
              className={inp}
              placeholder="Catatan kondisi pengiriman (opsional)"
              aria-label="Catatan BAST"
              value={bast.notes}
              onChange={(e) => setBast({ ...bast, notes: e.target.value })}
            />
          </div>
          <button
            type="button"
            disabled={!!busy || !bast.photos.length || !bast.receiver.trim()}
            onClick={submitBast}
            className={`${btn} mt-3.5 bg-[#232528] text-white hover:bg-[#35383d]`}
          >
            {busy === "bast" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Simpan BAST
          </button>
        </section>
      )}

      {x.delivery?.received_at && (
        <section className={box}>
          <h2 className="font-header text-base text-[#232528]">Dokumen Serah Terima (BAST)</h2>
          <p className="mt-1 text-xs text-[#232528]">
            Diterima oleh <b>{x.delivery.receiver_name}</b> · {new Date(x.delivery.received_at).toLocaleString("id-ID")}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
            {JSON.parse(x.delivery.bast_photos || "[]").map((p: string, i: number) => (
              <button
                key={p}
                type="button"
                onClick={() => viewFile(p)}
                className="rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-1.5 font-medium text-[#35678B] hover:border-[#5E93B8]"
              >
                Lihat Foto {i + 1}
              </button>
            ))}
            {x.delivery.bast_signature_path && (
              <button
                type="button"
                onClick={() => viewFile(x.delivery.bast_signature_path)}
                className="rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-1.5 font-medium text-[#35678B] hover:border-[#5E93B8]"
              >
                Lihat Tanda Terima
              </button>
            )}
          </div>
        </section>
      )}

      {paidStage && (
        <section className={box}>
          <h2 className="font-header text-base text-[#232528]">Usulan Perubahan Pesanan (Change Order)</h2>
          <p className="mt-1 text-xs text-[#656B73]">
            Catat revisi ukuran/material setelah pembayaran lunas. Pelanggan menyetujui di halaman pesanan, lalu selisih biaya ditagih terpisah.
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-[1fr_200px]">
            <input
              className={inp}
              placeholder="Deskripsi perubahan (mis. ukuran meja jadi 200 cm)"
              aria-label="Deskripsi perubahan"
              value={chg.description}
              onChange={(e) => setChg({ ...chg, description: e.target.value })}
            />
            <input
              className={`${inp} text-right`}
              type="number"
              min={0}
              aria-label="Selisih harga sebelum PPN"
              placeholder="Selisih (sebelum PPN)"
              value={chg.price_delta}
              onChange={(e) => setChg({ ...chg, price_delta: Math.max(0, +e.target.value) })}
            />
          </div>
          <button
            type="button"
            disabled={!!busy || !chg.description.trim()}
            onClick={submitChange}
            className={`${btn} mt-3 border border-[#EAE4DA] bg-white text-[#232528] hover:border-[#5E93B8]`}
          >
            {busy === "chg" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Kirim Usulan Tambahan ({rupiah(Math.round(chg.price_delta * 1.11))} termasuk PPN)
          </button>
        </section>
      )}

      {x.changes?.length > 0 && (
        <section className={box}>
          <h2 className="font-header text-base text-[#232528]">Riwayat Perubahan Pesanan</h2>
          <ul className="mt-2.5 space-y-1.5 text-xs">
            {x.changes.map((c: any) => (
              <li key={c.id} className="flex justify-between gap-3 border-b border-[#EAE4DA]/60 pb-1.5 last:border-0">
                <span className="text-[#232528]">{c.description}</span>
                <span className="shrink-0 font-medium text-[#656B73]">
                  {rupiah(c.total)} · {c.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(x.refunds?.length > 0 || (o.paid_at && !["dibatalkan", "selesai"].includes(o.status))) && (
        <section className={box}>
          <h2 className="font-header text-base text-[#232528]">Pengembalian Dana (Refund)</h2>
          {x.refunds?.map((r: any) => (
            <p key={r.id} className="mt-2 text-xs text-[#232528]">
              <b>{rupiah(r.amount)}</b> · {r.status} · {r.reason}{" "}
              {(r.bank_name || r.account_number) && (
                <span className="text-[#656B73]">
                  ({r.bank_name} {r.account_number} a.n. {r.account_holder})
                </span>
              )}
            </p>
          ))}
          {!x.refunds?.some((r: any) => ["diajukan", "disetujui", "dikirim"].includes(r.status)) &&
            o.paid_at &&
            !["dibatalkan", "selesai"].includes(o.status) && (
              <div className="mt-3 space-y-2.5">
                <div className="grid gap-2.5 sm:grid-cols-[1fr_180px]">
                  <input
                    className={inp}
                    placeholder="Alasan refund (mis. stok habis / kesepakatan batal) *"
                    aria-label="Alasan refund"
                    value={rf.reason}
                    onChange={(e) => setRf({ ...rf, reason: e.target.value })}
                  />
                  <input
                    className={`${inp} text-right`}
                    type="number"
                    min={0}
                    aria-label="Nominal refund"
                    placeholder="Nominal (kosong = penuh)"
                    value={rf.amount || ""}
                    onChange={(e) => setRf({ ...rf, amount: Math.max(0, +e.target.value) })}
                  />
                </div>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <input
                    className={inp}
                    placeholder="Nama Bank (mis. BCA)"
                    aria-label="Nama bank refund"
                    value={rf.bank_name}
                    onChange={(e) => setRf({ ...rf, bank_name: e.target.value })}
                  />
                  <input
                    className={inp}
                    placeholder="Nomor Rekening"
                    aria-label="Nomor rekening refund"
                    value={rf.account_number}
                    onChange={(e) => setRf({ ...rf, account_number: e.target.value })}
                  />
                  <input
                    className={inp}
                    placeholder="Nama Pemilik Rekening"
                    aria-label="Atas nama rekening refund"
                    value={rf.account_holder}
                    onChange={(e) => setRf({ ...rf, account_holder: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  disabled={!!busy || !rf.reason.trim()}
                  onClick={submitRefund}
                  className={`${btn} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}
                >
                  {busy === "rf" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Ajukan Pengembalian Dana
                </button>
              </div>
            )}
        </section>
      )}

      {x.claims?.length > 0 && (
        <section className={box}>
          <h2 className="font-header text-base text-[#232528]">Klaim Garansi / Retur</h2>
          <ul className="mt-2 space-y-1 text-xs text-[#232528]">
            {x.claims.map((c: any) => (
              <li key={c.id}>
                {c.type} · <b>{c.status}</b> · {c.description}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[#656B73]">Tindak lanjuti klaim secara lengkap di menu Klaim & Refund.</p>
        </section>
      )}

      <section className={box}>
        <h2 className="font-header text-base text-[#232528]">Tautkan ke Proyek Interior (Opsional)</h2>
        <select
          aria-label="Proyek"
          value={x.project_id ?? ""}
          onChange={(e) =>
            run(
              "prj",
              () => adminShop.linkProject(o.code, e.target.value ? +e.target.value : null),
              "Tautan proyek berhasil disimpan.",
            )
          }
          className={`${inp} mt-2 max-w-sm`}
        >
          <option value="">Tidak ditautkan ke proyek</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </section>
    </div>
  );
}
