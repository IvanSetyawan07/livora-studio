import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminShop,
  downloadPrivate,
  openPrivate,
  ORDER_STEPS,
  rupiah,
  stepIndex,
  type Quote,
} from "@/lib/shop";
import StatusBadge from "@/components/shop/StatusBadge";
import AdminOrderAftercare from "@/components/shop/AdminOrderAftercare";
import { ErrorState, useAdminDialog } from "@/components/admin/kit";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import { imgUrl } from "@/lib/adminApi";

const NEXT: Record<string, { to: string; label: string; desc: string }> = {
  dibayar: {
    to: "diproses",
    label: "Mulai Proses / Siapkan Barang",
    desc: "Status akan berubah ke Diproses dan pelanggan menerima pembaruan.",
  },
  diproses: {
    to: "siap_kirim",
    label: "Tandai Siap Kirim",
    desc: "Status akan berubah ke Siap Kirim beserta jadwal pengiriman bila diisi.",
  },
  perlu_tindakan: {
    to: "diproses",
    label: "Lanjutkan Proses",
    desc: "Status pesanan kembali ke Diproses.",
  },
  siap_kirim: {
    to: "dikirim",
    label: "Tandai Sedang Dikirim",
    desc: "Info kurir dan nomor resi akan dikirim otomatis ke pelanggan lewat WhatsApp & Email.",
  },
  dikirim: {
    to: "diterima",
    label: "Tandai Sudah Diterima",
    desc: "Menandai pesanan sudah tiba di lokasi pelanggan.",
  },
  diterima: {
    to: "selesai",
    label: "Selesaikan Pesanan",
    desc: "Menutup pesanan sebagai Selesai.",
  },
  bermasalah: {
    to: "diproses",
    label: "Lanjutkan Proses",
    desc: "Status pesanan kembali ke Diproses.",
  },
};

const CANCELABLE = [
  "menunggu_harga",
  "bermasalah",
  "wa_terhubung",
  "menunggu_data",
  "data_lengkap",
  "menunggu_review_admin",
  "penawaran",
  "menunggu_bayar",
];

const btnBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#EAE4DA] bg-white px-4 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50 disabled:opacity-50";
const btnDark =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#232528] px-4 text-xs font-medium text-white transition-colors hover:bg-[#35383d] disabled:opacity-50";

export default function AdminShopOrderDetail() {
  const { code = "" } = useParams();
  const dialog = useAdminDialog();
  const [o, setO] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await adminShop.order(code);
      setO(data);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Gagal memuat detail pesanan";
      setError(msg);
      toast.error(msg);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<any>, ok: string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (r && r.code) setO(r);
      else await load();
      toast.success(ok);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Gagal menjalankan aksi");
    } finally {
      setBusy(null);
    }
  };

  if (error && !o) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/shop/orders"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#656B73] hover:text-[#232528]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Pesanan Furnitur
        </Link>
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  if (!o) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#656B73]">
        <Loader2 className="h-5 w-5 animate-spin text-[#5E93B8]" /> Memuat detail pesanan…
      </div>
    );
  }

  const s = o.shipping ?? null;
  const activeStep = stepIndex(o.status);
  const isCancelledOrExpired = ["dibatalkan", "kedaluwarsa"].includes(o.status);

  const handleSendForm = async () => {
    const ok = await dialog.confirm({
      title: `Kirim Form Data Pengiriman ke ${o.customer_name || o.customer_phone}?`,
      description:
        "Tautan formulir alamat & preferensi pengiriman akan dikirim otomatis ke WhatsApp pelanggan dan disalin ke clipboard Anda.",
      confirmText: "Ya, Kirim Form",
      cancelText: "Batal",
    });
    if (!ok) return;
    run(
      "form",
      async () => {
        const { form_url } = await adminShop.sendForm(o.code);
        await navigator.clipboard.writeText(form_url).catch(() => {});
      },
      "Tautan form dikirim ke pelanggan & disalin ke clipboard.",
    );
  };

  const handleCancel = async () => {
    const reason = await dialog.prompt({
      title: `Batalkan Pesanan ${o.code}?`,
      description:
        "Pesanan akan dibatalkan, stok yang ditahan dilepas kembali, dan notifikasi pembatalan dikirim ke pelanggan.",
      label: "Alasan Pembatalan",
      placeholder: "mis. Pelanggan mengubah rencana / stok kosong",
      confirmText: "Batalkan Pesanan",
      cancelText: "Kembali",
      tone: "danger",
      required: true,
    });
    if (typeof reason === "string" && reason.trim()) {
      run("cancel", () => adminShop.cancel(o.code, reason.trim()), "Pesanan berhasil dibatalkan.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/admin/shop/orders"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#656B73] hover:text-[#232528]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Semua Pesanan
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="font-header font-mono text-2xl text-[#232528]">{o.code}</h1>
            <StatusBadge status={o.status} label={o.status_label} />
            <span className="rounded-full border border-[#EAE4DA] bg-white px-2.5 py-0.5 text-[11px] text-[#656B73]">
              Sumber: {o.source || "web"}
            </span>
            {o.unique_code ? (
              <span className="rounded-full border border-[#5E93B8]/30 bg-[#EDF4F8] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#35678B]">
                Kode Unik Transfer: +{o.unique_code}
              </span>
            ) : null}
          </div>
        </div>
        {o.quote_expires_at && ["penawaran", "menunggu_bayar"].includes(o.status) && (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-900">
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            Penawaran berlaku hingga{" "}
            <b>
              {new Date(o.quote_expires_at).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </b>
          </div>
        )}
      </div>

      {/* Stepper 6 Tahap Siklus Pesanan */}
      {!isCancelledOrExpired && (
        <section className="rounded-2xl border border-[#EAE4DA] bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ORDER_STEPS.map((st, idx) => {
              const done = activeStep > idx || o.status === "selesai";
              const current = activeStep === idx && o.status !== "selesai";
              return (
                <div
                  key={st.key}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                    current
                      ? "border-[#5E93B8] bg-[#EDF4F8]/80"
                      : done
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-[#EAE4DA]/70 bg-[#FAF8F4]/60"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      done
                        ? "bg-emerald-600 text-white"
                        : current
                          ? "bg-[#5E93B8] text-white"
                          : "bg-white text-[#656B73] border border-[#EAE4DA]"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[#232528]">{st.label}</p>
                    <p className="truncate text-[10px] text-[#656B73]">
                      {done ? "Selesai" : current ? "Tahap saat ini" : "Menunggu"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Catatan Review / Ringkasan AI Livi bila ada */}
      {(o.review_note || o.ai_summary) && (
        <div className="grid gap-3 md:grid-cols-2">
          {o.review_note && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="font-semibold">Catatan Perlu Tinjauan Admin</p>
                <p className="mt-0.5 whitespace-pre-line">{o.review_note}</p>
              </div>
            </div>
          )}
          {o.ai_summary && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#5E93B8]/30 bg-[#EDF4F8]/80 p-4 text-xs text-[#232528]">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#5E93B8]" />
              <div>
                <p className="font-semibold text-[#35678B]">Ringkasan Percakapan Livi</p>
                <p className="mt-0.5 whitespace-pre-line text-[#4C5259]">{o.ai_summary}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tindakan Berikutnya */}
      <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 shadow-sm">
        <h2 className="font-header text-base text-[#232528]">Tindakan Berikutnya</h2>
        <p className="mt-0.5 text-xs text-[#656B73]">
          Tombol yang bertanda kirim / ubah status akan otomatis memberi tahu pelanggan lewat WhatsApp atau Email.
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {o.conversation_id && (
            <Link to={`/admin/shop/inbox?c=${o.conversation_id}`} className={btnDark}>
              <MessageCircle className="h-4 w-4" /> Buka Chat di Kotak Masuk WA
            </Link>
          )}
          <a href={o.wa_url} target="_blank" rel="noopener noreferrer" className={btnBase}>
            <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp {o.customer_phone}
          </a>
          {o.status === "menunggu_wa" && (
            <button
              type="button"
              className={btnBase}
              disabled={!!busy}
              onClick={() => run("wa", () => adminShop.waConnected(o.code), "Ditandai sudah terhubung WA")}
            >
              Tandai Sudah Chat
            </button>
          )}
          {["menunggu_wa", "wa_terhubung", "menunggu_data"].includes(o.status) && (
            <button type="button" className={btnDark} disabled={!!busy} onClick={handleSendForm}>
              {busy === "form" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Kirim Form Data Pengiriman
            </button>
          )}
          {o.form_url && (
            <button
              type="button"
              className={btnBase}
              onClick={() => {
                navigator.clipboard.writeText(o.form_url);
                toast.success("Tautan form disalin");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Salin Tautan Form
            </button>
          )}
          {o.source === "offline" && ["menunggu_bayar", "menunggu_verifikasi"].includes(o.status) && (
            <OfflinePayButtons o={o} busy={busy} run={run} />
          )}
          {NEXT[o.status] && <AdvanceButton o={o} busy={busy} run={run} />}
          {CANCELABLE.includes(o.status) && (
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              disabled={!!busy}
              onClick={handleCancel}
            >
              Batalkan Pesanan
            </button>
          )}
        </div>
      </section>

      {/* Daftar Barang Dipesan — SELALU tampil di semua status */}
      <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-header text-base text-[#232528]">
            <Package className="h-4 w-4 text-[#5E93B8]" /> Daftar Barang Dipesan ({o.items?.length ?? 0} jenis)
          </h2>
          {o.grand_total ? (
            <span className="text-sm font-semibold text-[#232528]">
              Total Tagihan: {rupiah(o.grand_total)}
            </span>
          ) : (
            <span className="text-xs text-amber-700">Harga penawaran belum ditetapkan</span>
          )}
        </div>
        <div className="divide-y divide-[#EAE4DA]/80 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/50">
          {o.items?.map((item: any) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3.5 p-3.5">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#EAE4DA] bg-white">
                {item.image ? (
                  <img
                    src={imgUrl(item.image)}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-[#9AA0A6]">
                    Foto
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[#232528]">{item.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      item.fulfillment_type === "made_to_order"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {item.fulfillment_type === "made_to_order" ? "Custom / Pre-Order" : "Stok Siap"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#656B73]">
                  {[item.code && `Kode ${item.code}`, item.variant_name && `Varian ${item.variant_name}`, `Jumlah: ${item.quantity} unit`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {item.note && <p className="mt-1 text-xs italic text-[#4C5259]">Catatan: &ldquo;{item.note}&rdquo;</p>}
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold text-[#232528]">
                  {item.unit_price ? rupiah(item.unit_price * item.quantity) : "—"}
                </p>
                {item.unit_price ? (
                  <p className="text-[11px] text-[#656B73]">
                    {rupiah(item.unit_price)} × {item.quantity}
                  </p>
                ) : null}
                {item.unit_discount > 0 && (
                  <p className="text-[11px] text-emerald-700">
                    Diskon -{rupiah(item.unit_discount * item.quantity)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Editor Penawaran Harga */}
      {[
        "menunggu_harga",
        "data_lengkap",
        "menunggu_review_admin",
        "penawaran",
        "wa_terhubung",
        "menunggu_data",
        "bermasalah",
      ].includes(o.status) && <QuoteEditor o={o} onSent={setO} />}

      {/* Pelanggan & Pembayaran */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 text-sm shadow-sm">
          <h2 className="font-header text-base text-[#232528]">Pelanggan & Pengiriman</h2>
          <div className="mt-3 space-y-1">
            <p className="font-medium text-[#232528]">{o.customer_name || "—"}</p>
            <p className="text-xs text-[#656B73]">
              {o.customer_phone} · {o.customer_email ?? "tanpa email"}
            </p>
          </div>
          {o.note && (
            <p className="mt-3 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-3 text-xs text-[#232528]">
              &ldquo;{o.note}&rdquo;
            </p>
          )}

          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#5E93B8]">
            Detail Pengiriman
          </h3>
          {s ? (
            <div className="mt-2 space-y-1 text-xs leading-relaxed text-[#4C5259]">
              <p className="font-medium text-[#232528]">
                {s.method === "pickup"
                  ? "Ambil sendiri di Showroom Livora"
                  : s.recipient
                    ? `${s.recipient} · ${s.phone || ""}`
                    : s.address ?? "—"}
              </p>
              {s.method !== "pickup" && (
                <p>
                  {[
                    s.street,
                    s.rt && `RT ${s.rt}`,
                    s.rw && `RW ${s.rw}`,
                    s.village,
                    s.district,
                    s.city,
                    s.province,
                    s.postal_code,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {s.landmark && <p>Patokan: {s.landmark}</p>}
              {(s.map_url || s.pin_location) && (
                <a
                  href={s.map_url || s.pin_location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[#35678B] hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" /> Buka Titik Lokasi Google Maps{" "}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {s.building_access && <p>Akses bangunan: {s.building_access}</p>}
              <p>
                {[
                  s.building_type,
                  s.floor && `lantai ${s.floor}`,
                  s.has_lift ? "ada lift" : null,
                  s.door_width_cm && `lebar pintu ${s.door_width_cm} cm`,
                  s.needs_installation ? "perlu pemasangan" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {s.preferred_date && <p>Permintaan tanggal kirim: {s.preferred_date}</p>}
              {s.wants_tax_invoice && (
                <p className="font-medium text-[#232528]">
                  Faktur Pajak: {s.company} {s.npwp ? `· NPWP ${s.npwp}` : ""}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-[#656B73]">Data alamat pengiriman belum diisi pelanggan.</p>
          )}
          {o.tracking_number && (
            <p className="mt-3 rounded-lg bg-[#EDF4F8] px-3 py-2 text-xs text-[#232528]">
              Kurir: <b>{o.courier}</b> · No. Resi: <span className="font-mono font-semibold">{o.tracking_number}</span>
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 text-sm shadow-sm">
          <h2 className="font-header text-base text-[#232528]">Pembayaran & Dokumen PDF</h2>
          {!o.payments?.length && (
            <p className="mt-2 text-xs text-[#656B73]">Belum ada tagihan pembayaran yang dibuat.</p>
          )}
          <div className="mt-3 space-y-2.5">
            {o.payments?.map((p: any) => (
              <div key={p.id} className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4]/70 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#232528]">
                    {rupiah(p.amount)} · {p.method ?? "Metode belum dipilih"}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] capitalize text-[#35678B] border border-[#EAE4DA]">
                    {p.status}
                  </span>
                </div>
                {p.proofs?.map((pr: any) => (
                  <div key={pr.id} className="mt-2 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      className="font-medium text-[#35678B] underline"
                      onClick={() =>
                        openPrivate(`/admin/shop/proofs/${pr.id}/file`).catch((e) => toast.error(e.message))
                      }
                    >
                      Lihat Bukti Transfer #{pr.id}
                    </button>
                    <span className="text-[#656B73]">
                      {pr.status}
                      {pr.reason ? ` — ${pr.reason}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {o.documents?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5E93B8]">
                Dokumen Proforma & Invoice
              </p>
              <ul className="space-y-2">
                {o.documents.map((d: any) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl border border-[#EAE4DA] bg-white px-3 py-2.5 text-left text-xs transition-colors hover:border-[#5E93B8] hover:bg-[#EDF4F8]/40"
                      onClick={() =>
                        downloadPrivate(
                          `/admin/shop/documents/${d.id}`,
                          `${d.title}-${d.number.replace(/\//g, "-")}.pdf`,
                        ).catch((e) => toast.error(e.message))
                      }
                    >
                      <Download className="h-4 w-4 text-[#5E93B8]" />
                      <span className="flex-1 font-medium text-[#232528]">
                        {d.title} (v{d.version})
                      </span>
                      <span className="font-mono text-[11px] text-[#656B73]">{d.number}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Tahap Produksi, BAST, Change Order, Refund, Klaim, Tautan Proyek */}
      <AdminOrderAftercare o={o} reload={load} />

      {/* Chat WhatsApp Pelanggan */}
      <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 text-sm shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-header text-base text-[#232528]">Riwayat Chat WhatsApp</h2>
          {o.conversation_id && (
            <Link
              to={`/admin/shop/inbox?c=${o.conversation_id}`}
              className="text-xs font-medium text-[#35678B] hover:underline"
            >
              Buka di Kotak Masuk WA untuk membalas →
            </Link>
          )}
        </div>
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto rounded-xl border border-[#EAE4DA]/70 bg-[#FAF8F4] p-3.5">
          {o.wa_messages?.map((m: any) => (
            <div key={m.id} className={`flex ${m.direction === "in" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  m.is_note
                    ? "border border-dashed border-amber-400 bg-amber-50 text-amber-950"
                    : m.direction === "in"
                      ? "border border-[#EAE4DA] bg-white text-[#232528]"
                      : "bg-[#232528] text-white"
                }`}
              >
                {m.is_note && <p className="mb-1 text-[10px] font-semibold uppercase">Catatan Internal</p>}
                {m.body}
                <p className="mt-1 text-[10px] opacity-70">
                  {new Date(m.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  {m.direction === "in"
                    ? ` · ${o.customer_name || "Pelanggan"}`
                    : m.sender
                      ? ` · ${m.sender}`
                      : !m.is_note
                        ? " · Bot Livi / Sistem"
                        : ""}
                </p>
              </div>
            </div>
          ))}
          {!o.wa_messages?.length && (
            <p className="py-4 text-center text-xs text-[#656B73]">Belum ada chat WhatsApp untuk nomor ini.</p>
          )}
        </div>
      </section>

      {/* Linimasa Pesanan + Log Teknis terpisah rapi (bukan nested section!) */}
      <section className="rounded-2xl border border-[#EAE4DA] bg-white p-5 text-sm shadow-sm">
        <h2 className="font-header text-base text-[#232528]">Linimasa Pesanan</h2>
        <ul className="mt-3 space-y-2.5 text-xs">
          {o.timeline?.map((t: any) => (
            <li key={t.id} className="flex flex-wrap gap-3 border-b border-[#EAE4DA]/60 pb-2 last:border-0">
              <span className="w-36 shrink-0 text-[#656B73]">
                {new Date(t.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
              </span>
              <span className="text-[#232528]">
                <span className="mr-2 rounded bg-[#EDF4F8] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#35678B]">
                  {t.event}
                </span>
                {t.label}
                {t.actor || t.user ? ` · ${t.actor || t.user}` : ""}
              </span>
            </li>
          ))}
          {!o.timeline?.length && <li className="text-[#656B73]">Belum ada kejadian tercatat.</li>}
        </ul>

        {o.audit?.length > 0 && (
          <details className="mt-4 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] px-3.5 py-2.5 text-xs">
            <summary className="cursor-pointer font-medium text-[#232528]">
              Log Audit Teknis ({o.audit.length} catatan)
            </summary>
            <ul className="mt-2.5 space-y-1.5 text-[#656B73]">
              {o.audit.map((a: any) => (
                <li key={a.id} className="flex gap-3">
                  <span className="w-36 shrink-0">
                    {new Date(a.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className="font-mono text-[11px] text-[#232528]">
                    {a.action}
                    {a.user ? ` · ${a.user.name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}

function AdvanceButton({
  o,
  busy,
  run,
}: {
  o: any;
  busy: string | null;
  run: (k: string, fn: () => Promise<any>, ok: string) => void;
}) {
  const dialog = useAdminDialog();
  const n = NEXT[o.status];
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [date, setDate] = useState("");
  const needShip = n.to === "dikirim";
  const needDate = n.to === "siap_kirim";

  const submit = async () => {
    const ok = await dialog.confirm({
      title: `${n.label}?`,
      description: `${n.desc} (Notifikasi WA & Email dikirim otomatis jika nomor pelanggan terdaftar.)`,
      confirmText: "Ya, Lanjutkan",
      cancelText: "Batal",
    });
    if (!ok) return;
    run(
      "adv",
      () =>
        adminShop.advance(o.code, {
          to: n.to,
          courier: courier || undefined,
          tracking_number: tracking || undefined,
          delivery_date: date || undefined,
        }),
      "Status pesanan diperbarui.",
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {needShip && (
        <>
          <input
            className="h-10 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-xs text-[#232528]"
            placeholder="Nama Kurir *"
            aria-label="Kurir"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
          />
          <input
            className="h-10 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-xs text-[#232528]"
            placeholder="No. Resi (opsional)"
            aria-label="Nomor resi"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
        </>
      )}
      {needDate && (
        <input
          type="date"
          className="h-10 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-xs text-[#232528]"
          aria-label="Jadwal kirim"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      )}
      <button type="button" className={btnDark} disabled={!!busy || (needShip && !courier.trim())} onClick={submit}>
        {busy === "adv" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {n.label}
      </button>
    </div>
  );
}

function OfflinePayButtons({
  o,
  busy,
  run,
}: {
  o: any;
  busy: string | null;
  run: (k: string, fn: () => Promise<any>, ok: string) => void;
}) {
  const dialog = useAdminDialog();
  const [method, setMethod] = useState("Tunai");

  const pay = async (handed: boolean) => {
    const ok = await dialog.confirm({
      title: `Konfirmasi Pembayaran Lunas (${method})?`,
      description: handed
        ? "Pesanan akan langsung ditandai Selesai (barang dibawa pulang pelanggan) dan kwitansi lunas diterbitkan."
        : "Pesanan akan ditandai Lunas dan masuk tahap Diproses untuk pengantaran.",
      confirmText: "Ya, Konfirmasi Lunas",
      cancelText: "Batal",
    });
    if (!ok) return;
    run(
      "offpay",
      () => adminShop.confirmOfflinePayment(o.code, { method, handed_over: handed }),
      "Pembayaran berhasil dikonfirmasi.",
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="h-10 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-xs text-[#232528]"
        aria-label="Metode bayar"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
      >
        {["Tunai", "Transfer Bank", "Debit/Kredit (EDC)", "QRIS"].map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      <button type="button" className={btnDark} disabled={!!busy} onClick={() => pay(true)}>
        Lunas · Dibawa Pulang (Selesai)
      </button>
      <button type="button" className={btnBase} disabled={!!busy} onClick={() => pay(false)}>
        Lunas · Diantar (Diproses)
      </button>
    </div>
  );
}

function QuoteEditor({ o, onSent }: { o: any; onSent: (x: any) => void }) {
  const dialog = useAdminDialog();
  const { role, isOwner } = useAdminPermission();
  const canGiveExtraDiscount = isOwner || role === "finance";

  const [prices, setPrices] = useState<Record<number, number>>(() =>
    Object.fromEntries(o.items.map((i: any) => [i.id, i.unit_price ?? 0])),
  );
  const [fees, setFees] = useState({
    shipping_fee: o.shipping_fee ?? 0,
    installation_fee: o.installation_fee ?? 0,
    other_fee: o.other_fee ?? 0,
  });
  const [disc, setDisc] = useState({
    extra_discount_type: o.extra_discount_type ?? "amount",
    extra_discount_value: o.extra_discount_value ?? 0,
    extra_discount_reason: o.extra_discount_reason ?? "",
  });
  const [preview, setPreview] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);

  const body = useMemo(
    () =>
      canGiveExtraDiscount
        ? { unit_prices: prices, ...fees, ...disc }
        : { unit_prices: prices, ...fees },
    [prices, fees, disc, canGiveExtraDiscount],
  );

  useEffect(() => {
    const t = setTimeout(() => adminShop.previewQuote(o.code, body).then(setPreview).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [o.code, body]);

  const send = async () => {
    const hasZeroPrice = o.items.some((i: any) => !(Number(prices[i.id]) > 0));
    if (hasZeroPrice) {
      toast.error("Semua barang harus memiliki harga satuan lebih dari Rp 0 sebelum mengirim penawaran.");
      return;
    }
    if (canGiveExtraDiscount && Number(disc.extra_discount_value) > 0 && !disc.extra_discount_reason.trim()) {
      toast.error("Alasan diskon tambahan wajib diisi.");
      return;
    }
    const ok = await dialog.confirm({
      title: o.status === "penawaran" ? "Kirim Revisi Penawaran ke Pelanggan?" : "Kirim Penawaran Harga ke Pelanggan?",
      description: `Total penawaran ${preview ? rupiah(preview.grand_total) : ""}. Ringkasan harga, PDF Proforma Invoice, dan tautan persetujuan akan dikirim otomatis lewat WhatsApp/Email dan stok akan ditahan.`,
      confirmText: "Ya, Kirim Penawaran",
      cancelText: "Periksa Lagi",
    });
    if (!ok) return;

    setBusy(true);
    try {
      onSent(await adminShop.sendQuote(o.code, body));
      toast.success("Penawaran harga berhasil dikirim ke pelanggan.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Gagal mengirim penawaran");
    } finally {
      setBusy(false);
    }
  };

  const num = (v: number, set: (n: number) => void, label: string) => (
    <input
      type="number"
      min={0}
      value={v}
      aria-label={label}
      onChange={(e) => set(Math.max(0, Number(e.target.value)))}
      className="h-9 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-2.5 text-right text-sm text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none"
    />
  );

  return (
    <section className="rounded-2xl border border-[#5E93B8]/35 bg-white p-5 text-sm shadow-sm">
      <h2 className="font-header text-base text-[#232528]">
        {o.status === "penawaran" ? "Revisi Penawaran Harga" : "Susun & Kirim Penawaran Harga"}
      </h2>
      <p className="mt-0.5 text-xs text-[#656B73]">
        Isi harga satuan setiap produk dan biaya pengiriman/pemasangan. Total beserta PPN 11% dihitung otomatis di sisi kanan.
      </p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-2.5">
          {o.items.map((i: any) => (
            <div key={i.id} className="grid grid-cols-[1fr_150px] items-center gap-3">
              <span className="truncate text-xs font-medium text-[#232528]">
                {i.title}{" "}
                <span className="font-normal text-[#656B73]">
                  {i.variant_name ? `· ${i.variant_name}` : ""} ×{i.quantity}
                </span>
              </span>
              {num(prices[i.id] ?? 0, (n) => setPrices((p) => ({ ...p, [i.id]: n })), `Harga satuan ${i.title}`)}
            </div>
          ))}
          <div className="grid grid-cols-[1fr_150px] items-center gap-3 border-t border-[#EAE4DA]/70 pt-3 text-xs">
            <span className="text-[#4C5259]">Ongkos Kirim</span>
            {num(fees.shipping_fee, (n) => setFees({ ...fees, shipping_fee: n }), "Ongkos kirim")}
          </div>
          <div className="grid grid-cols-[1fr_150px] items-center gap-3 text-xs">
            <span className="text-[#4C5259]">Biaya Pemasangan</span>
            {num(fees.installation_fee, (n) => setFees({ ...fees, installation_fee: n }), "Biaya pemasangan")}
          </div>
          <div className="grid grid-cols-[1fr_150px] items-center gap-3 text-xs">
            <span className="text-[#4C5259]">Biaya Lain-lain</span>
            {num(fees.other_fee, (n) => setFees({ ...fees, other_fee: n }), "Biaya lain")}
          </div>

          {canGiveExtraDiscount && (
            <>
              <div className="grid grid-cols-[1fr_80px_150px] items-center gap-2 border-t border-[#EAE4DA]/70 pt-3 text-xs">
                <span className="text-[#4C5259]">
                  Diskon Tambahan <span className="text-[11px] text-[#5E93B8]">(Owner/Keuangan)</span>
                </span>
                <select
                  aria-label="Jenis diskon"
                  value={disc.extra_discount_type}
                  onChange={(e) => setDisc({ ...disc, extra_discount_type: e.target.value })}
                  className="h-9 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-2 text-xs"
                >
                  <option value="amount">Rp</option>
                  <option value="percent">%</option>
                </select>
                {num(disc.extra_discount_value, (n) => setDisc({ ...disc, extra_discount_value: n }), "Nilai diskon")}
              </div>
              {Number(disc.extra_discount_value) > 0 && (
                <input
                  className="h-9 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-xs"
                  placeholder="Alasan diskon tambahan (wajib diisi)"
                  aria-label="Alasan diskon"
                  value={disc.extra_discount_reason}
                  onChange={(e) => setDisc({ ...disc, extra_discount_reason: e.target.value })}
                />
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-4">
          {preview ? (
            <dl className="space-y-1.5 text-xs">
              {(
                [
                  ["Subtotal", preview.subtotal],
                  ["Diskon Produk", -preview.product_discount],
                  ["Diskon Tambahan", -preview.extra_discount],
                  ["DPP", preview.dpp],
                  ["PPN 11%", preview.ppn],
                  ["Ongkos Kirim", preview.shipping_fee],
                  ["Pemasangan", preview.installation_fee],
                  ["Biaya Lain", preview.other_fee],
                ] as [string, number][]
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-[#656B73]">{k}</dt>
                  <dd className="text-[#232528]">{v < 0 ? `− ${rupiah(-v)}` : rupiah(v)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-[#EAE4DA] pt-2.5 text-sm font-semibold text-[#232528]">
                <dt>Total Tagihan</dt>
                <dd>{rupiah(preview.grand_total)}</dd>
              </div>
            </dl>
          ) : (
            <div className="flex items-center gap-2 py-6 text-xs text-[#656B73]">
              <Loader2 className="h-4 w-4 animate-spin text-[#5E93B8]" /> Menghitung total…
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={send}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#232528] text-xs font-medium text-white hover:bg-[#35383d] disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? "Mengirim Penawaran…" : "Kirim Penawaran ke Pelanggan"}
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-[#656B73]">
            Mengirim ringkasan harga, PDF Proforma Invoice, dan tautan persetujuan ke WhatsApp pelanggan serta menahan stok sementara.
          </p>
        </div>
      </div>
    </section>
  );
}
