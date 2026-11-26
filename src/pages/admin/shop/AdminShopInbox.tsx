import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Lock,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  StickyNote,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { adminShop } from "@/lib/shop";
import PriceInquiryPanel from "@/components/shop/PriceInquiryPanel";
import { PageHeader, AdminHelpBanner, useAdminDialog } from "@/components/admin/kit";

const MODE: Record<string, { l: string; c: string }> = {
  menunggu_admin: { l: "Menunggu Tim", c: "bg-amber-100 text-amber-900 border border-amber-200" },
  dipegang_admin: { l: "Ditangani CS", c: "bg-emerald-100 text-emerald-900 border border-emerald-200" },
  bot: { l: "Bot Livi", c: "bg-[#EDF4F8] text-[#35678B] border border-[#5E93B8]/30" },
};

const STATE: Record<string, string> = {
  sapaan: "Baru menyapa",
  menu: "Memilih menu",
  tanya_jawab: "Tanya jawab",
  kumpul_data: "Mengisi data",
  konfirmasi_data: "Konfirmasi data",
  pilih_kirim: "Memilih metode kirim",
  menunggu_penawaran: "Menunggu penawaran",
  cek_harga: "Menunggu harga dari tim",
  setelah_harga: "Setelah info harga",
};

const REASON: Record<string, string> = {
  tim: "minta tim",
  admin: "minta admin",
  nego: "nego harga",
  komplain: "komplain",
  keluhan: "keluhan",
  rusak: "barang rusak",
  custom: "minta custom",
  gagal_paham: "bot kurang paham",
  ai_eskalasi: "butuh bantuan tim",
  dokumen_masuk: "kirim dokumen",
  foto_masuk: "kirim foto",
  gambar_gagal_dibaca: "gambar gagal dibuka",
  minta_tim_saat_data: "minta tim saat isi data",
  buat_pesanan_gagal: "pesanan gagal dibuat",
};

const QUICK = [
  "Terima kasih sudah menunggu Kak. Saya bantu cek dulu ya.",
  "Boleh dikirim foto ruangannya agar kami bisa menyarankan ukuran yang pas?",
  "Baik Kak, harganya kami hitungkan dulu, nanti penawaran resmi kami kirim di chat ini.",
  "Pembayaran sudah kami terima. Pesanan sedang diproses.",
];

/** Gambar chat dimuat lewat fetch + token (tidak bisa lewat <img src> biasa). */
function PrivateImage({ path }: { path: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    adminShop
      .fileBlob(path)
      .then((b) => {
        if (alive) {
          url = URL.createObjectURL(b);
          setSrc(url);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);
  if (failed) return <span className="block text-xs italic opacity-70">Gambar tidak dapat dibuka</span>;
  if (!src) return <span className="block text-xs opacity-70">Memuat gambar…</span>;

  return <img src={src} alt="Gambar WhatsApp" loading="lazy" className="mb-1.5 max-h-72 w-auto rounded-lg" />;
}

export default function AdminShopInbox() {
  const dialog = useAdminDialog();
  const [sp, setSp] = useSearchParams();
  const wantedId = Number(sp.get("c")) || null;
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [filter, setFilter] = useState(wantedId ? "" : "menunggu_admin,dipegang_admin");
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState<number | null>(wantedId);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [note, setNote] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);

  const sel = sessions?.find((s) => s.id === selId) ?? null;

  const filteredSessions = useMemo(() => {
    const list = sessions ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.display_name?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.order_code?.toLowerCase().includes(q) ||
        s.cart_code?.toLowerCase().includes(q) ||
        s.last_message?.toLowerCase().includes(q),
    );
  }, [sessions, search]);

  const loadSessions = useCallback(
    () =>
      adminShop
        .inbox(filter || undefined)
        .then(setSessions)
        .catch((e) => {
          toast.error(e.message);
          setSessions([]);
        }),
    [filter],
  );

  const loadMsgs = useCallback((id: number, forceScroll = false) => {
    const container = scrollContainerRef.current;
    const wasNearBottom =
      !container || container.scrollHeight - container.scrollTop - container.clientHeight < 120;

    return adminShop
      .inboxMessages(id)
      .then((m) => {
        setMsgs(m);
        if (forceScroll || initialLoadRef.current || wasNearBottom) {
          initialLoadRef.current = false;
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: forceScroll ? "smooth" : "auto" }), 50);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSessions();
    const t = setInterval(loadSessions, 15000);
    return () => clearInterval(t);
  }, [loadSessions]);

  useEffect(() => {
    if (!selId) {
      setMsgs([]);
      return;
    }
    initialLoadRef.current = true;
    setProfileOpen(false);
    loadMsgs(selId, true);
    const t = setInterval(() => loadMsgs(selId, false), 8000);
    return () => clearInterval(t);
  }, [selId, loadMsgs]);

  const pick = (id: number | null) => {
    setSelId(id);
    setFile(null);
    const n = new URLSearchParams(sp);
    if (id) n.set("c", String(id));
    else n.delete("c");
    setSp(n, { replace: true });
  };

  const action = async (a: "ambil" | "serahkan" | "tutup") => {
    if (!sel) return;
    if (a === "tutup") {
      const ok = await dialog.confirm({
        title: `Kembalikan Chat ${sel.display_name} ke Bot Livi?`,
        description:
          "Bot Livi akan langsung aktif kembali menjawab pesan pelanggan ini secara otomatis.",
        confirmText: "Ya, Kembalikan ke Bot",
        cancelText: "Batal",
      });
      if (!ok) return;
    }
    try {
      await adminShop.inboxAction(sel.id, a);
      toast.success(
        a === "ambil"
          ? "Chat diambil alih. Bot Livi dinonaktifkan sementara untuk percakapan ini."
          : a === "serahkan"
            ? "Chat dikembalikan ke antrean tim CS."
            : "Chat dikembalikan ke Bot Livi.",
      );
      await loadSessions();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message);
    }
  };

  const send = async () => {
    if (!sel || (!text.trim() && !file)) return;
    const draft = text;
    setBusy(true);
    try {
      const r = file
        ? await adminShop.inboxReplyMedia(sel.id, file, draft)
        : await adminShop.inboxReply(sel.id, draft, note);
      if (r.ok === false) toast.error("Pesan gagal terkirim ke WhatsApp. Cek menu Kesehatan Sistem.");
      else if (note) toast.success("Catatan internal tersimpan.");
      setText("");
      setFile(null);
      await Promise.all([loadMsgs(sel.id, true), loadSessions()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Gagal mengirim pesan");
    } finally {
      setBusy(false);
    }
  };

  const windowOpen = !!sel && sel.window_left_minutes > 0;
  const c = sel?.collected_data ?? {};
  const prof = sel?.customer_profile ?? null;
  const hasProfile =
    !!sel?.needs_summary ||
    (prof &&
      Object.values(prof).some((v) =>
        Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && String(v).trim() !== "",
      ));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="WhatsApp & Bot Livi"
        title="Kotak Masuk WhatsApp"
        description="Balas pesan pelanggan secara langsung atau pantau percakapan Bot Livi. Bot otomatis diam saat percakapan dipegang tim."
      />

      <AdminHelpBanner title="Tips Membalas Chat WhatsApp" storageKey="admin-shop-inbox-help">
        Klik <b>Ambil Chat</b> untuk menangani pelanggan tanpa gangguan bot. Gunakan ikon <b>Catatan Internal</b> (kuning) jika hanya ingin meninggalkan memo untuk rekan tim tanpa mengirim ke pelanggan.
      </AdminHelpBanner>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-[#EAE4DA] bg-white p-1">
          {[
            ["menunggu_admin,dipegang_admin", "Perlu Dibalas Tim"],
            ["bot", "Ditangani Bot Livi"],
            ["", "Semua Chat"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilter(v)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === v ? "bg-[#232528] text-white" : "text-[#656B73] hover:text-[#232528]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid h-[calc(100dvh-260px)] min-h-[520px] overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white shadow-sm md:grid-cols-[340px_1fr]">
        {/* Daftar Sesi */}
        <div className={`flex min-h-0 flex-col border-r border-[#EAE4DA] bg-[#FAF8F4]/50 ${selId ? "hidden md:flex" : "flex"}`}>
          <div className="border-b border-[#EAE4DA] bg-white p-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#656B73]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, nomor WA, atau kode order..."
                aria-label="Cari percakapan"
                className="h-9 w-full rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] pl-8 pr-3 text-xs text-[#232528] focus:border-[#5E93B8] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {sessions === null ? (
              <li className="p-8 text-center">
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-[#5E93B8]" />
              </li>
            ) : filteredSessions.length === 0 ? (
              <li className="p-8 text-center text-xs text-[#656B73]">Tidak ada percakapan yang cocok.</li>
            ) : (
              filteredSessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => pick(s.id)}
                    className={`w-full border-b border-[#EAE4DA]/80 p-3.5 text-left transition-colors hover:bg-[#EDF4F8]/40 ${
                      selId === s.id ? "bg-[#EDF4F8] border-l-2 border-l-[#5E93B8]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate text-sm font-medium text-[#232528]">{s.display_name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        {s.price_pending && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-800">
                            Cek Harga
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${MODE[s.mode]?.c}`}>
                          {MODE[s.mode]?.l ?? s.mode}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#4C5259]">{s.last_message}</p>
                    <p className="mt-1 truncate text-[10px] text-[#656B73]">
                      {s.identified ? `+${s.phone} · ` : ""}
                      {s.order_code ?? s.cart_code ?? "belum ada pesanan"}
                      {s.mode === "menunggu_admin" && s.handoff_reason
                        ? ` · ${REASON[s.handoff_reason] ?? s.handoff_reason}`
                        : ""}
                      {s.assignee ? ` · CS: ${s.assignee}` : ""}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Panel Thread Chat */}
        {sel ? (
          <div className="flex min-h-0 flex-col bg-white">
            <div className="space-y-2.5 border-b border-[#EAE4DA] p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[#EAE4DA] px-2.5 py-1 text-xs font-medium text-[#232528] md:hidden"
                  onClick={() => pick(null)}
                >
                  ← Daftar
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-semibold text-[#232528]">{sel.display_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${MODE[sel.mode]?.c}`}>
                      {MODE[sel.mode]?.l}
                    </span>
                  </div>
                  <p className="text-xs text-[#656B73]">
                    +{sel.phone}
                    {sel.wa_name && sel.wa_name !== sel.display_name ? ` · WA: ${sel.wa_name}` : ""}
                    {" · "}
                    {windowOpen ? (
                      <span className="text-emerald-700">
                        Jendela balas 24j: sisa {Math.floor(sel.window_left_minutes / 60)}j {sel.window_left_minutes % 60}m
                      </span>
                    ) : (
                      <span className="text-amber-700">Jendela 24 jam tertutup</span>
                    )}
                  </p>
                </div>

                {sel.mode !== "dipegang_admin" && (
                  <button
                    type="button"
                    onClick={() => action("ambil")}
                    className="h-9 rounded-lg bg-[#232528] px-3.5 text-xs font-medium text-white hover:bg-[#35383d]"
                  >
                    Ambil Chat
                  </button>
                )}
                {sel.mode === "dipegang_admin" && (
                  <button
                    type="button"
                    onClick={() => action("serahkan")}
                    className="h-9 rounded-lg border border-[#EAE4DA] bg-white px-3 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                  >
                    Serahkan ke Tim
                  </button>
                )}
                {sel.mode !== "bot" && (
                  <button
                    type="button"
                    onClick={() => action("tutup")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3 text-xs font-medium text-[#232528] hover:border-[#5E93B8]"
                  >
                    <Bot className="h-3.5 w-3.5 text-[#5E93B8]" /> Kembalikan ke Bot
                  </button>
                )}
              </div>

              {/* Strip Info Konteks Pesanan & Pengiriman */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl border border-[#EAE4DA]/80 bg-[#FAF8F4] px-3 py-2 text-[11px] text-[#4C5259]">
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3 w-3 text-[#5E93B8]" />
                  {sel.assignee
                    ? `Ditangani: ${sel.assignee}`
                    : sel.mode === "bot"
                      ? "Ditangani: Bot Livi"
                      : "Menunggu admin"}
                </span>
                <span>Tahap: {STATE[sel.state] ?? sel.state}</span>
                {sel.handoff_reason && <span>Alasan alih: {REASON[sel.handoff_reason] ?? sel.handoff_reason}</span>}
                {sel.cart_code && (
                  <span>
                    Keranjang: <span className="font-mono font-medium text-[#232528]">{sel.cart_code}</span>
                  </span>
                )}
                {sel.order_code && (
                  <span>
                    Pesanan:{" "}
                    <Link
                      to={`/admin/shop/orders/${sel.order_code}`}
                      className="font-mono font-semibold text-[#35678B] underline"
                    >
                      {sel.order_code}
                    </Link>
                  </span>
                )}
                {c.city && <span>Kota: {c.city}</span>}
                {c.address && <span className="truncate">Alamat: {c.address}</span>}
                {c.building_access && <span>Akses: {c.building_access}</span>}
                {c.install_on_site !== undefined && c.install_on_site !== null && (
                  <span>Pasang di lokasi: {c.install_on_site ? "Ya" : "Tidak"}</span>
                )}
                {c.need_tax_invoice && <span className="font-medium text-[#232528]">Perlu Faktur Pajak</span>}
                {c.pin_location && (
                  <a
                    href={c.pin_location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#35678B] underline"
                  >
                    Pin Lokasi ↗
                  </a>
                )}
              </div>

              {/* Profil & Preferensi Pelanggan dari Livi */}
              {hasProfile && (
                <div className="rounded-xl border border-[#5E93B8]/30 bg-[#EDF4F8]/70 px-3 py-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 text-left font-medium text-[#35678B]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Profil & Preferensi Pelanggan (Ringkasan Livi)
                    </span>
                    {profileOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {profileOpen && (
                    <div className="mt-2 space-y-1.5 border-t border-[#5E93B8]/20 pt-2 text-[11px] text-[#232528]">
                      {sel.needs_summary && <p className="leading-relaxed">{sel.needs_summary}</p>}
                      {prof && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {Object.entries(prof).map(([k, v]) => {
                            if (v === null || v === undefined || (Array.isArray(v) && v.length === 0)) return null;
                            const val = Array.isArray(v) ? v.join(", ") : String(v);
                            if (!val.trim()) return null;
                            return (
                              <span
                                key={k}
                                className="rounded-full border border-[#5E93B8]/25 bg-white px-2.5 py-0.5 text-[11px]"
                              >
                                <b className="capitalize text-[#35678B]">{k.replace(/_/g, " ")}:</b> {val}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <PriceInquiryPanel
              conversationId={sel.id}
              windowOpen={windowOpen}
              onSent={() => {
                loadMsgs(sel.id, true);
                loadSessions();
              }}
            />

            {/* Isi Pesan */}
            <div ref={scrollContainerRef} className="flex-1 space-y-2.5 overflow-y-auto bg-[#FAF8F4] p-4">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "in" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                      m.is_note
                        ? "border border-dashed border-amber-400 bg-amber-50 text-amber-950"
                        : m.direction === "in"
                          ? "border border-[#EAE4DA] bg-white text-[#232528]"
                          : "bg-[#232528] text-white"
                    }`}
                  >
                    {!!m.is_note && (
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-amber-800">
                        <StickyNote className="h-3 w-3" /> Catatan Internal Tim
                      </p>
                    )}
                    {m.media_path && <PrivateImage path={m.media_path} />}
                    {m.type === "image" && !m.media_path && (
                      <span className="block text-xs italic opacity-75">Gambar tidak tersedia</span>
                    )}
                    {m.type === "image" ? (m.body ?? "").replace(/^\[image\] ?/, "") : m.body}
                    <p
                      className={`mt-1 text-[10px] ${
                        m.is_note
                          ? "text-amber-800/75"
                          : m.direction === "in"
                            ? "text-[#656B73]"
                            : "text-white/70"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleString("id-ID", { timeStyle: "short", dateStyle: "short" })}
                      {m.direction === "in"
                        ? ` · ${sel.display_name}`
                        : m.sender
                          ? ` · ${m.sender}`
                          : !m.is_note
                            ? " · Bot Livi / Sistem"
                            : ""}
                      {m.status === "failed" ? " · gagal terkirim" : ""}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Composer */}
            <div
              className={`border-t p-3 transition-colors ${
                note ? "border-amber-300 bg-amber-50/70" : "border-[#EAE4DA] bg-white"
              }`}
            >
              {note ? (
                <div className="mb-2 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-100/80 px-3 py-1.5 text-xs font-medium text-amber-950">
                  <span className="inline-flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" /> Mode Catatan Internal — hanya terlihat oleh tim Livora, tidak dikirim ke WhatsApp pelanggan.
                  </span>
                  <button type="button" onClick={() => setNote(false)} className="underline">
                    Kembali ke Balasan WA
                  </button>
                </div>
              ) : (
                <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setText(q)}
                      className="shrink-0 rounded-full border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-1 text-[11px] text-[#232528] hover:border-[#5E93B8] hover:bg-[#EDF4F8]"
                    >
                      {q.slice(0, 36)}…
                    </button>
                  ))}
                </div>
              )}

              {!windowOpen && !note && (
                <p className="mb-2 flex items-center gap-1.5 text-xs text-amber-800">
                  <Lock className="h-3.5 w-3.5 shrink-0" /> Lewat 24 jam sejak chat terakhir pelanggan. Minta pelanggan menyapa dulu, atau simpan sebagai catatan internal.
                </p>
              )}
              {sel.mode === "bot" && !note && (
                <p className="mb-2 text-[11px] text-[#656B73]">
                  Chat ini masih dipegang Bot Livi. Mengirim balasan di bawah otomatis mengambil alih chat ke Anda.
                </p>
              )}
              {file && (
                <p className="mb-2 flex items-center justify-between rounded-lg border border-[#5E93B8]/30 bg-[#EDF4F8] px-3 py-1.5 text-xs text-[#232528]">
                  <span className="truncate">Lampiran gambar: {file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="ml-2 shrink-0 font-medium text-rose-600 underline">
                    Hapus
                  </button>
                </p>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  if (!f) return;
                  if (f.size > 5 * 1024 * 1024) {
                    toast.error("Ukuran gambar maksimal 5 MB.");
                    return;
                  }
                  setFile(f);
                }}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNote(!note);
                    setFile(null);
                  }}
                  aria-pressed={note}
                  title="Tulis catatan internal (tidak dikirim ke pelanggan)"
                  className={`h-11 w-11 shrink-0 rounded-xl border transition-colors ${
                    note
                      ? "border-amber-500 bg-amber-200 text-amber-950"
                      : "border-[#EAE4DA] bg-[#FAF8F4] text-[#656B73] hover:border-[#5E93B8]"
                  }`}
                >
                  <StickyNote className="mx-auto h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={!windowOpen || note}
                  aria-label="Lampirkan gambar"
                  title="Lampirkan gambar JPG/PNG (maks. 5 MB)"
                  className="h-11 w-11 shrink-0 rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] text-[#656B73] hover:border-[#5E93B8] disabled:opacity-40"
                >
                  <ImagePlus className="mx-auto h-4 w-4" />
                </button>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={1}
                  placeholder={
                    note
                      ? "Tulis catatan internal tim (tidak terkirim ke pelanggan)…"
                      : file
                        ? "Tulis keterangan gambar (opsional)…"
                        : "Tulis balasan WhatsApp untuk pelanggan…"
                  }
                  aria-label="Balasan"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  className={`min-h-11 flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${
                    note
                      ? "border-amber-400 bg-white text-amber-950 focus:border-amber-600"
                      : "border-[#EAE4DA] bg-[#FAF8F4] text-[#232528] focus:border-[#5E93B8] focus:bg-white"
                  }`}
                />
                <button
                  type="button"
                  disabled={busy || (!text.trim() && !file) || (!windowOpen && !note)}
                  onClick={send}
                  aria-label={note ? "Simpan Catatan Internal" : "Kirim Balasan"}
                  className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-medium disabled:opacity-40 ${
                    note ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-[#232528] text-white hover:bg-[#35383d]"
                  }`}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : note ? (
                    <>
                      <StickyNote className="h-4 w-4" /> Simpan Catatan
                    </>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden flex-col items-center justify-center gap-2 bg-[#FAF8F4]/40 text-sm text-[#656B73] md:flex">
            <MessageSquare className="h-8 w-8 text-[#5E93B8]/50" />
            <p>Pilih percakapan di sebelah kiri untuk membaca atau membalas pesan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
