import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Headset,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import {
  getSupportSessions,
  getSupportMessages,
  acceptSupportSession,
  replySupportSession,
  closeSupportSession,
  deleteSupportSession,
  rejectSupportSession,
  type AdminSupportSession,
} from "@/lib/adminSupportChat";
import type { SupportMessage } from "@/lib/supportChat";
import { playChatSound, unlockChatSound } from "@/lib/chatSound";
import { imgUrl } from "@/lib/adminApi";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";
import {
  AdminHelpBanner,
  DebouncedSearchInput,
  EmptyState,
  PageHeader,
  StatusBadge,
  useAdminDialog,
} from "@/components/admin/kit";

const FILTERS = [
  { key: "pending_cs", label: "Menunggu CS" },
  { key: "active", label: "Live CS" },
  { key: "bot", label: "Ditangani Livi" },
  { key: "closed", label: "Selesai" },
  { key: "all", label: "Semua" },
] as const;

const STATUS_META: Record<string, { label: string; tone: "warning" | "success" | "info" | "neutral" }> = {
  pending_cs: { label: "Menunggu CS", tone: "warning" },
  active: { label: "Live CS", tone: "success" },
  bot: { label: "Livi AI", tone: "info" },
  closed: { label: "Selesai", tone: "neutral" },
};

const QUICK_REPLIES = [
  "Halo, saya tim Customer Service LIVORA. Ada yang bisa kami bantu hari ini?",
  "Boleh kami ketahui estimasi ukuran ruangan serta lokasi pengiriman Anda?",
  "Apakah Anda ingin kami bantu jadwalkan konsultasi atau kunjungan ke showroom LIVORA?",
];

export default function AdminSupportChat() {
  const [searchParams] = useSearchParams();
  const dialog = useAdminDialog();
  const { canEdit } = useAdminPermission();
  const editable = canEdit("support");

  const wantedSession = Number(searchParams.get("session")) || null;
  const [filter, setFilter] = useState<string>("all");
  const [initializedFilter, setInitializedFilter] = useState(false);
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<AdminSupportSession[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(() => wantedSession);
  const [sessionDetail, setSessionDetail] = useState<AdminSupportSession | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [profileOpen, setProfileOpen] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevPendingRef = useRef(0);
  const nearBottomRef = useRef(true);

  const active = useMemo(() => {
    const fromList = sessions.find((s) => s.id === activeId) ?? null;
    if (sessionDetail && sessionDetail.id === activeId) {
      return { ...fromList, ...sessionDetail };
    }
    return fromList;
  }, [sessions, activeId, sessionDetail]);

  const lastId = messages.length ? messages[messages.length - 1].id : 0;

  useEffect(() => {
    if (wantedSession) setActiveId(wantedSession);
  }, [wantedSession]);

  const loadSessions = useCallback(async (f = filter) => {
    try {
      const data = await getSupportSessions(f);
      setSessions(data.sessions ?? []);
      setPending(data.pending ?? 0);
      if (!initializedFilter && !wantedSession) {
        setInitializedFilter(true);
        if ((data.pending ?? 0) > 0) {
          setFilter("pending_cs");
        }
      }
    } catch {
      toast.error("Gagal memuat daftar chat website");
    } finally {
      setLoading(false);
    }
  }, [filter, initializedFilter, wantedSession]);

  useEffect(() => {
    setLoading(true);
    void loadSessions(filter);
    const i = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadSessions(filter);
    }, 6000);
    const onVis = () => {
      if (document.visibilityState === "visible") void loadSessions(filter);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(i);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [filter, loadSessions]);

  useEffect(() => {
    if (pending > prevPendingRef.current) playChatSound("alert");
    prevPendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (!activeId) {
      setSessionDetail(null);
      setMessages([]);
      return;
    }
    let alive = true;
    setMessages([]);
    nearBottomRef.current = true;
    getSupportMessages(activeId)
      .then((d) => {
        if (!alive) return;
        setSessionDetail(d.session ?? null);
        setMessages(d.messages ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const i = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const d = await getSupportMessages(activeId, lastId);
        if (d.session) setSessionDetail(d.session);
        if (d.messages.length) {
          setMessages((prev) => [...prev, ...d.messages]);
          if (d.messages.some((m) => m.sender === "user")) playChatSound("incoming");
        }
      } catch {
        /* abaikan */
      }
    }, 3000);
    return () => window.clearInterval(i);
  }, [activeId, lastId]);

  useEffect(() => {
    if (scrollRef.current && nearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  };

  const refreshActive = async () => {
    if (!activeId) return;
    await loadSessions(filter);
    const d = await getSupportMessages(activeId, lastId);
    if (d.session) setSessionDetail(d.session);
    if (d.messages.length) setMessages((prev) => [...prev, ...d.messages]);
  };

  const accept = async (label = "Sesi diambil alih — Anda terhubung dengan pelanggan") => {
    if (!activeId || !editable) return;
    setActing(true);
    try {
      await acceptSupportSession(activeId);
      toast.success(label);
      await refreshActive();
    } catch {
      toast.error("Gagal menerima sesi chat");
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (!activeId || !editable) return;
    const ok = await dialog.confirm({
      title: "Kembalikan chat ini ke Livi AI?",
      text: "Permintaan CS akan dibatalkan dan Livi AI akan kembali membalas pelanggan secara otomatis.",
      confirmLabel: "Ya, kembalikan ke Livi",
    });
    if (!ok) return;
    setActing(true);
    try {
      await rejectSupportSession(activeId);
      toast.success("Sesi dikembalikan ke Livi AI");
      await refreshActive();
    } catch {
      toast.error("Gagal mengembalikan ke Livi");
    } finally {
      setActing(false);
    }
  };

  const close = async () => {
    if (!activeId || !editable) return;
    const ok = await dialog.confirm({
      title: "Selesaikan sesi chat CS ini?",
      text: "Percakapan akan ditutup dari antrean CS dan Livi AI siap membantu kembali bila pelanggan mengirim pesan baru.",
      confirmLabel: "Ya, selesaikan",
    });
    if (!ok) return;
    setActing(true);
    try {
      await closeSupportSession(activeId);
      toast.success("Sesi chat diselesaikan");
      await refreshActive();
    } catch {
      toast.error("Gagal menyelesaikan sesi");
    } finally {
      setActing(false);
    }
  };

  const remove = async (sessionId: number, name: string) => {
    if (!editable) return;
    const ok = await dialog.confirm({
      title: `Hapus percakapan "${name}"?`,
      text: "Seluruh riwayat pesan dalam sesi ini akan dihapus permanen dan tidak bisa dikembalikan.",
      confirmLabel: "Ya, hapus permanen",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteSupportSession(sessionId);
      toast.success("Percakapan dihapus");
      if (activeId === sessionId) {
        setActiveId(null);
        setSessionDetail(null);
        setMessages([]);
      }
      void loadSessions(filter);
    } catch {
      toast.error("Gagal menghapus percakapan");
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || !activeId || sending || !editable) return;
    unlockChatSound();
    playChatSound("sent");
    setSending(true);
    nearBottomRef.current = true;
    try {
      const msg = await replySupportSession(activeId, body);
      setText("");
      setMessages((prev) => [...prev, msg]);
      await loadSessions(filter);
      const d = await getSupportMessages(activeId, msg.id);
      if (d.session) setSessionDetail(d.session);
    } catch {
      toast.error("Gagal mengirim balasan — teks Anda masih tersimpan di kotak ketik.");
    } finally {
      setSending(false);
    }
  };

  const visibleSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.display_name.toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.last_message || "").toLowerCase().includes(q) ||
        (s.needs_summary || "").toLowerCase().includes(q),
    );
  }, [sessions, search]);

  const profile = active?.customer_profile;
  const hasProfileInfo =
    Boolean(active?.needs_summary) ||
    Boolean(profile && Object.values(profile).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v))));

  return (
    <div className="space-y-5" onPointerDown={unlockChatSound}>
      <PageHeader
        eyebrow="Pelanggan & Pesan"
        title="Chat Website (Livi)"
        description="Balas pengunjung yang berbicara di widget chat website. Livi AI otomatis merangkum kebutuhan pelanggan sebelum mengalihkan ke CS."
        actions={
          pending > 0 ? (
            <StatusBadge tone="warning">{pending} pengunjung menunggu CS</StatusBadge>
          ) : (
            <StatusBadge tone="success">Semua antrean CS tertangani</StatusBadge>
          )
        }
      />

      <AdminHelpBanner storageKey="support-chat-help">
        <strong>Alur kerja:</strong> Saat pelanggan meminta CS, sesi muncul di tab <strong>Menunggu CS</strong>. Klik{" "}
        <strong>Terima &amp; Mulai Chat</strong> untuk mengambil alih, cek <em>Ringkasan Kebutuhan Pelanggan</em> dari
        Livi di atas chat, lalu klik <strong>Selesaikan</strong> setelah selesai membantu.
      </AdminHelpBanner>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const isPendingTab = f.key === "pending_cs";
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? "border-[#232528] bg-[#232528] text-white"
                    : "border-[#E2DACF] bg-white text-[#4C5259] hover:border-[#5E93B8]"
                }`}
              >
                {f.label}
                {isPendingTab && pending > 0 && (
                  <span className="rounded-full bg-[#5E93B8] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {pending}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <DebouncedSearchInput
          value={search}
          onSearch={setSearch}
          placeholder="Cari nama, pesan, atau kebutuhan…"
          className="w-full sm:w-64"
        />
      </div>

      {/* Master-Detail Chat Workspace */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        {/* Daftar Sesi (sembunyikan di mobile saat chat dibuka) */}
        <div
          className={`flex max-h-[72vh] flex-col overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white ${
            activeId ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="border-b border-[#EAE4DA] bg-[#FAF8F4] px-4 py-2.5 text-xs font-medium text-[#656B73]">
            {visibleSessions.length} percakapan
          </div>
          <div className="flex-1 divide-y divide-[#F1ECE4] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-8 text-[#5E93B8]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : visibleSessions.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#656B73]">Belum ada percakapan di kategori ini.</p>
            ) : (
              visibleSessions.map((s) => {
                const meta = STATUS_META[s.status] ?? { label: s.status, tone: "neutral" as const };
                return (
                  <div
                    key={s.id}
                    className={`group relative transition-colors ${
                      activeId === s.id ? "bg-[#EDF4F8]/75" : "hover:bg-[#FAF8F4]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveId(s.id)}
                      className="w-full p-4 pr-10 text-left"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[#232528]">{s.display_name}</span>
                        <StatusBadge tone={meta.tone} dot={false} className="text-[10px]">
                          {meta.label}
                        </StatusBadge>
                      </div>
                      {s.needs_summary && (
                        <p className="mb-1 line-clamp-1 text-[11px] font-medium text-[#35678B]">
                          ✦ {s.needs_summary}
                        </p>
                      )}
                      <p className="line-clamp-1 text-xs text-[#656B73]">{s.last_message || "Belum ada pesan"}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#656B73]/80">
                        <span>
                          {s.last_message_at
                            ? new Date(s.last_message_at).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                        {s.unread_admin > 0 && (
                          <span className="rounded-full bg-[#5E93B8] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {s.unread_admin} baru
                          </span>
                        )}
                      </div>
                    </button>
                    {editable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void remove(s.id, s.display_name);
                        }}
                        className="absolute right-2.5 top-3.5 rounded p-1 text-[#656B73] opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        title="Hapus percakapan"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel Percakapan */}
        <div
          className={`flex h-[72vh] flex-col overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white ${
            !activeId ? "hidden lg:flex" : "flex"
          }`}
        >
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={Headset}
                title="Pilih percakapan di sebelah kiri"
                description="Klik salah satu pengunjung untuk melihat riwayat obrolan bersama Livi AI dan membalas langsung."
                className="border-0 bg-transparent"
              />
            </div>
          ) : (
            <>
              {/* Header Percakapan + Kontrol Status Jelas */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4DA] bg-[#FAF8F4] px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    aria-label="Kembali ke daftar chat"
                    className="rounded-lg p-1.5 text-[#232528] hover:bg-black/5 lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-[#232528]">{active.display_name}</p>
                      <StatusBadge tone={STATUS_META[active.status]?.tone ?? "neutral"}>
                        {STATUS_META[active.status]?.label ?? active.status}
                      </StatusBadge>
                    </div>
                    <p className="truncate text-xs text-[#656B73]">
                      {active.email || "Pengunjung website"}
                      {active.admin_name ? ` · Ditangani ${active.admin_name}` : ""}
                      {active.request_reason ? ` · Alasan: ${active.request_reason}` : ""}
                    </p>
                  </div>
                </div>

                {editable && (
                  <div className="flex flex-wrap items-center gap-2">
                    {active.status === "bot" && (
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => void accept("Chat diambil alih ke CS")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
                      >
                        <UserCheck size={13} /> Ambil Alih ke CS
                      </button>
                    )}

                    {active.status === "pending_cs" && (
                      <>
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => void accept()}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#5E93B8] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#4A7FA5] disabled:opacity-50"
                        >
                          <Check size={13} /> Terima &amp; Mulai Chat
                        </button>
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => void reject()}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-3 py-1.5 text-xs font-medium text-[#4C5259] hover:border-[#5E93B8] disabled:opacity-50"
                        >
                          <Bot size={13} /> Kembalikan ke Livi
                        </button>
                      </>
                    )}

                    {active.status === "active" && (
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => void close()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-3.5 py-1.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8] disabled:opacity-50"
                      >
                        <X size={13} /> Selesaikan &amp; Kembalikan ke Livi
                      </button>
                    )}

                    {active.status === "closed" && (
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => void accept("Sesi chat dibuka kembali")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#5E93B8]/40 bg-[#EDF4F8] px-3.5 py-1.5 text-xs font-medium text-[#35678B] hover:bg-[#DFECF4] disabled:opacity-50"
                      >
                        <RotateCcw size={13} /> Buka Ulang Chat
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Ringkasan Kebutuhan Pelanggan dari Livi AI */}
              {hasProfileInfo && (
                <div className="border-b border-[#DCE7F0] bg-[#EDF4F8]/65 px-4 py-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex w-full items-center justify-between font-medium text-[#35678B]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Ringkasan Kebutuhan Pelanggan (dari Livi AI)
                    </span>
                    {profileOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {profileOpen && (
                    <div className="mt-2 space-y-1.5 text-[#232528]">
                      {active.needs_summary && (
                        <p className="rounded-lg bg-white/80 px-3 py-1.5 leading-relaxed">{active.needs_summary}</p>
                      )}
                      {profile && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#4C5259]">
                          {profile.project_type && <span>Proyek: <strong>{profile.project_type}</strong></span>}
                          {profile.rooms?.length ? <span>Ruangan: <strong>{profile.rooms.join(", ")}</strong></span> : null}
                          {profile.furniture?.length ? <span>Furnitur: <strong>{profile.furniture.join(", ")}</strong></span> : null}
                          {profile.style && <span>Gaya: <strong>{profile.style}</strong></span>}
                          {profile.materials?.length ? <span>Material: <strong>{profile.materials.join(", ")}</strong></span> : null}
                          {profile.colors?.length ? <span>Warna: <strong>{profile.colors.join(", ")}</strong></span> : null}
                          {profile.location && <span>Lokasi: <strong>{profile.location}</strong></span>}
                          {profile.budget && <span>Anggaran: <strong>{profile.budget}</strong></span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Daftar Pesan */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 space-y-3 overflow-y-auto bg-[#FAF8F4]/70 p-4"
              >
                {messages.map((m) => {
                  const recs: any[] = Array.isArray((m as any).meta?.recommendations)
                    ? (m as any).meta.recommendations
                    : [];
                  if (m.sender === "system") {
                    return (
                      <p key={m.id} className="text-center text-[11px] text-[#656B73]">
                        — {m.text} —
                      </p>
                    );
                  }
                  const isUser = m.sender === "user";
                  const isBot = m.sender === "bot";
                  return (
                    <div key={m.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                      <div className="max-w-[82%] space-y-1.5">
                        <div className={`flex items-center gap-2 text-[10px] text-[#656B73] ${isUser ? "" : "justify-end"}`}>
                          <span className="font-medium uppercase tracking-wider">
                            {isUser ? active.display_name : isBot ? "Livi AI" : "CS Livora"}
                          </span>
                          {m.created_at && (
                            <span>
                              {new Date(m.created_at).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <div
                          className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            isUser
                              ? "rounded-tl-sm border border-[#EAE4DA] bg-white text-[#232528]"
                              : isBot
                                ? "rounded-tr-sm border border-[#DCE7F0] bg-[#EDF4F8] text-[#232528]"
                                : "rounded-tr-sm bg-[#232528] text-white"
                          }`}
                        >
                          {m.text}
                        </div>

                        {/* Rekomendasi Produk yang dikirim Livi */}
                        {recs.length > 0 && (
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {recs.slice(0, 4).map((rec: any, idx: number) => (
                              <a
                                key={rec.slug ?? idx}
                                href={rec.slug ? `/items/${rec.slug}` : "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-xl border border-[#EAE4DA] bg-white p-2 text-xs transition-colors hover:border-[#5E93B8]"
                              >
                                {rec.image && (
                                  <img
                                    src={imgUrl(rec.image)}
                                    alt={rec.title}
                                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                                  />
                                )}
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-[#232528]">{rec.title}</p>
                                  {rec.category && <p className="truncate text-[10px] text-[#656B73]">{rec.category}</p>}
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Composer / Balasan */}
              {active.status === "closed" ? (
                <div className="flex items-center justify-between gap-3 border-t border-[#EAE4DA] bg-[#FAF8F4] px-4 py-3 text-xs text-[#656B73]">
                  <span>Percakapan ini sudah selesai &amp; ditutup.</span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => void accept("Sesi dibuka kembali")}
                      className="rounded-full bg-[#232528] px-3.5 py-1.5 text-xs font-medium text-white"
                    >
                      Buka Ulang untuk Membalas
                    </button>
                  )}
                </div>
              ) : editable ? (
                <div className="border-t border-[#EAE4DA] bg-white p-3">
                  {/* Balasan Cepat */}
                  <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                    {QUICK_REPLIES.map((qr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setText(qr)}
                        className="shrink-0 rounded-full border border-[#E2DACF] bg-[#FAF8F4] px-2.5 py-1 text-[11px] text-[#4C5259] hover:border-[#5E93B8] hover:text-[#232528]"
                      >
                        {qr.slice(0, 44)}…
                      </button>
                    ))}
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                      placeholder={
                        active.status === "pending_cs"
                          ? "Ketik balasan (mengirim pesan otomatis mengambil alih sesi ini)…"
                          : "Tulis balasan untuk pelanggan… (Enter kirim, Shift+Enter baris baru)"
                      }
                      className="max-h-28 flex-1 resize-none rounded-xl border border-[#E2DACF] bg-[#FAF8F4] px-3.5 py-2 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={sending || !text.trim()}
                      aria-label="Kirim balasan"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#232528] text-white transition-colors hover:bg-[#34383D] disabled:opacity-40"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
