import { useState, useRef, useEffect, useCallback, useMemo, Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Send,
  Loader2,
  Headset,
  ArrowUpRight,
  CalendarCheck,
  Sparkles,
  Check,
  Minimize2,
  Maximize2,
  Armchair,
  Palette,
  Compass,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  openSession,
  fetchMessages,
  sendMessage,
  requestCs,
  resumeBot,
  type SupportMessage,
  type SupportSessionInfo,
  type CustomerNeedProfile,
  type AskBotDetail,
  touchActivity,
  resetVisitor,
  shouldResetSession,
  LIVE_IDLE_WARN_MS,
  LIVE_IDLE_GRACE_MS,
} from "@/lib/supportChat";
import { playChatSound, unlockChatSound } from "@/lib/chatSound";
import { imgUrl } from "@/lib/adminApi";
import { authStorage } from "@/lib/api";
import { rememberIntendedPath } from "@/lib/authGuard";
import livoraMark from "@/assets/_opt/logo-livora-160.webp";

const PENDING_CHAT_KEY = "livora_chat_pending";
const CHAT_SIZE_KEY = "livora_chat_size";

/* ────────── Sunlit Limestone & Morning Sky Palette (synced with LIVORA 2026) ────────── */
const CHARCOAL = "#232528";
const SLATE = "#656B73";
const LIMESTONE = "#FAF8F4";
const SURFACE = "#F4F1EA";
const SKY = "#5E93B8";
const SKY_SOFT = "#EDF4F8";
const SAND = "#B89D7A";
const ease = [0.22, 1, 0.36, 1] as const;

interface Recommendation {
  type: "item" | "collection" | "catalog" | "project";
  title: string;
  subtitle?: string | null;
  description?: string | null;
  reason?: string | null;
  image?: string | null;
  url: string;
}

const TYPE_CTA: Record<Recommendation["type"], string> = {
  item: "Lihat Produk",
  collection: "Lihat Koleksi",
  catalog: "Lihat Katalog",
  project: "Lihat Proyek",
};

const TYPE_BADGE: Record<Recommendation["type"], string> = {
  item: "Furniture",
  collection: "Collection",
  catalog: "Catalog",
  project: "Project",
};

const STARTER_CARDS = [
  {
    id: "furniture",
    icon: Armchair,
    title: "Cari Furnitur",
    subtitle: "Sofa, kursi, meja & dimensi pas",
    prompt: "Bantu saya carikan rekomendasi furnitur yang cocok untuk ruangan saya.",
  },
  {
    id: "style",
    icon: Palette,
    title: "Inspirasi Gaya",
    subtitle: "Modern, European & Japandi",
    prompt: "Saya sedang cari inspirasi gaya ruang yang hangat dan modern, koleksi apa yang cocok?",
  },
  {
    id: "services",
    icon: Compass,
    title: "Layanan & Proyek",
    subtitle: "Interior, kontraktor & portofolio",
    prompt: "Boleh jelaskan layanan interior Livora dan tunjukkan beberapa contoh proyeknya?",
  },
  {
    id: "showroom",
    icon: CalendarCheck,
    title: "Konsultasi & Showroom",
    subtitle: "Jadwal meeting atau kunjungan",
    prompt: "Bagaimana cara booking konsultasi atau berkunjung ke showroom Livora di Jakarta Selatan?",
  },
];

const normalizeRecUrl = (url?: string | null): string => {
  if (!url) return "/";
  let u = url.trim();
  if (/^https?:\/\//i.test(u)) {
    try {
      u = new URL(u).pathname;
    } catch {
      /* noop */
    }
  }
  if (!u.startsWith("/")) u = `/${u}`;
  u = u.replace(/^\/item\//, "/items/").replace(/^\/project\//, "/projects/");
  u = u.replace(/^\/collections\//, "/collection/");
  return u;
};

const formatTime = (iso?: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/** Render bold (**text**) dan bullet list secara rapi tanpa raw markdown. */
function FormattedMessageText({ text, isUser }: { text: string; isUser: boolean }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }
        const isBullet = /^([•*-])\s+/.test(trimmed);
        const content = isBullet ? trimmed.replace(/^([•*-])\s+/, "") : line;
        const segments = content.split(/(\*\*[^*]+\*\*)/g);

        const rendered = segments.map((seg, i) => {
          if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
            return (
              <strong key={i} className={isUser ? "font-medium text-white" : "font-medium text-[#232528]"}>
                {seg.slice(2, -2)}
              </strong>
            );
          }
          return <Fragment key={i}>{seg}</Fragment>;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-0.5">
              <span
                aria-hidden
                className="mt-[7px] h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isUser ? "#FAF8F4" : SKY }}
              />
              <span className="flex-1">{rendered}</span>
            </div>
          );
        }

        return (
          <p key={lineIdx} className="leading-relaxed">
            {rendered}
          </p>
        );
      })}
    </div>
  );
}

/** Ikon pesan minimalis khas Livora untuk tombol pop-up mengambang. */
function LivoraChatIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 11.5c0 4.418-3.582 8-8 8a8.4 8.4 0 0 1-3.47-.74L4 20l1.24-3.72A7.84 7.84 0 0 1 4 11.5c0-4.418 3.582-8 8-8s8 3.582 8 8Z" />
      <path d="M8.5 10.5h7" />
      <path d="M8.5 13.75h4.5" />
    </svg>
  );
}

/** Avatar Livi halus di dalam panel chat (tanpa ping/badge AI berlebihan). */
function LiviEmblem({
  size = "md",
  isLiveCs = false,
}: {
  size?: "sm" | "md" | "lg";
  isLiveCs?: boolean;
  showPulse?: boolean;
}) {
  const dims =
    size === "sm"
      ? "w-7 h-7"
      : size === "lg"
      ? "w-10 h-10"
      : "w-9 h-9";
  const imgDims =
    size === "sm"
      ? "w-4 h-4"
      : size === "lg"
      ? "w-6 h-6"
      : "w-5 h-5";

  return (
    <div
      className={`relative ${dims} rounded-full flex items-center justify-center shrink-0 border transition-colors duration-300`}
      style={{
        backgroundColor: isLiveCs ? CHARCOAL : "#FFFFFF",
        borderColor: isLiveCs ? "rgba(35,37,40,0.2)" : "rgba(35,37,40,0.1)",
      }}
    >
      {isLiveCs ? (
        <Headset size={size === "sm" ? 13 : 16} className="text-[#FAF8F4]" strokeWidth={1.7} />
      ) : (
        <img
          src={livoraMark}
          alt="Livi"
          className={`${imgDims} object-contain select-none`}
          draggable={false}
        />
      )}
    </div>
  );
}

type ChatSize = "md" | "lg";

const CHAT_SIZES: Record<ChatSize, { className: string }> = {
  md: {
    className:
      "inset-x-3 bottom-20 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[400px] h-[min(76dvh,610px)]",
  },
  lg: {
    className:
      "inset-x-3 bottom-20 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[540px] h-[min(84dvh,780px)]",
  },
};

function collectProfileTags(profile?: CustomerNeedProfile | null): string[] {
  if (!profile) return [];
  const tags: string[] = [];
  if (profile.project_type) tags.push(profile.project_type);
  if (profile.service_interest) tags.push(profile.service_interest);
  for (const r of profile.rooms ?? []) tags.push(r);
  for (const f of profile.furniture_needs ?? []) tags.push(f);
  for (const s of profile.style_preferences ?? []) tags.push(s);
  for (const m of profile.material_color_prefs ?? []) tags.push(m);
  if (profile.location) tags.push(profile.location);
  return Array.from(new Set(tags)).slice(0, 7);
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<ChatSize>(() => {
    if (typeof window === "undefined") return "md";
    const saved = window.localStorage.getItem(CHAT_SIZE_KEY) as ChatSize | null;
    return saved && saved in CHAT_SIZES ? saved : "md";
  });

  const cycleSize = (dir: number) => {
    const order: ChatSize[] = ["md", "lg"];
    const next = order[Math.min(order.length - 1, Math.max(0, order.indexOf(size) + dir))];
    setSize(next);
    try {
      window.localStorage.setItem(CHAT_SIZE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const [session, setSession] = useState<SupportSessionInfo | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(false);
  const [unread, setUnread] = useState(0);
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null);
  const [profileExpanded, setProfileExpanded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const contextRef = useRef<{ item_slug?: string; item_name?: string }>({});
  const navigate = useNavigate();

  const [gate, setGate] = useState<null | "login" | "limit">(null);
  const [gateMessage, setGateMessage] = useState<string>("");

  const { pathname, search } = useLocation();
  const isLanding = pathname === "/";
  const isHidden =
    /^\/collection\/[^/]+/.test(pathname) ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/admin");
  const [visible, setVisible] = useState(!isLanding && !isHidden);

  const activeCategorySlug = useMemo(() => {
    const sp = new URLSearchParams(search);
    const cat = (sp.get("category") || "").trim().toLowerCase();
    return cat && cat !== "all" ? cat : undefined;
  }, [search]);

  const pageAwarePrompt = useMemo(() => {
    if (pathname.startsWith("/furniture") && activeCategorySlug) {
      const label = activeCategorySlug.charAt(0).toUpperCase() + activeCategorySlug.slice(1);
      return {
        badge: `Sedang lihat ${label}`,
        label: `Bantu saya pilih ${label.toLowerCase()} paling pas`,
        prompt: `Saya sedang melihat kategori ${label}. Bantu saya memilih ${label.toLowerCase()} yang paling sesuai dengan ruangan saya.`,
      };
    }
    if (pathname.startsWith("/projects")) {
      return {
        badge: "Sedang lihat Portofolio",
        label: "Tanya layanan interior & kontraktor",
        prompt: "Saya sedang melihat proyek Livora. Bagaimana alur kerja untuk layanan desain interior & kontraktor?",
      };
    }
    if (pathname.startsWith("/collection")) {
      return {
        badge: "Sedang lihat Koleksi",
        label: "Cocokkan koleksi dengan gaya rumah saya",
        prompt: "Saya sedang melihat koleksi Livora. Bantu saya pilih koleksi yang paling cocok dengan gaya rumah saya.",
      };
    }
    return null;
  }, [pathname, activeCategorySlug]);

  const lastId = messages.length ? messages[messages.length - 1].id : 0;

  // Gabungkan learned profile dari session maupun pesan bot terbaru
  const learnedProfile = useMemo<CustomerNeedProfile | null>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.sender === "bot" && m.meta?.learned_profile && Object.keys(m.meta.learned_profile).length > 0) {
        return m.meta.learned_profile as CustomerNeedProfile;
      }
    }
    if (session?.customer_profile && Object.keys(session.customer_profile).length > 0) {
      return session.customer_profile;
    }
    return null;
  }, [messages, session]);

  const profileTags = useMemo(() => collectProfileTags(learnedProfile), [learnedProfile]);

  const userMessagesCount = useMemo(
    () => messages.filter((m) => m.sender === "user").length,
    [messages],
  );

  const latestBotMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "bot") return messages[i].id;
    }
    return null;
  }, [messages]);

  /* Auto-scroll ke pesan terbaru */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  /* Show/hide tombol mengambang */
  useEffect(() => {
    if (isHidden) {
      setVisible(false);
      return;
    }
    if (!isLanding) {
      setVisible(true);
      return;
    }
    setVisible(window.scrollY > 100);
    const onScroll = () => {
      if (window.scrollY === 0) setVisible(false);
      else if (window.scrollY > 100) setVisible(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLanding, isHidden]);

  useEffect(() => {
    if (!visible && open) setOpen(false);
  }, [visible, open]);

  /* Boot session saat pertama kali dibuka */
  const boot = useCallback(async () => {
    if (session || booting) return;
    setBooting(true);
    try {
      if (shouldResetSession()) resetVisitor();
      touchActivity();
      const data = await openSession();
      setSession(data.session);
      setMessages(data.messages);
    } catch {
      setMessages([
        {
          id: -1,
          sender: "bot",
          text: "Halo! Saya Livi, asisten desain & furnitur Livora ✨ Sedang menyambungkan koneksi — coba kirim pertanyaanmu sebentar lagi ya.",
        },
      ]);
    } finally {
      setBooting(false);
    }
  }, [session, booting]);

  useEffect(() => {
    if (open) {
      boot();
    }
  }, [open, boot]);

  /* Polling pesan baru saat menunggu / live chat dengan CS */
  useEffect(() => {
    if (!session) return;
    if (session.status !== "pending_cs" && session.status !== "active") return;

    let alive = true;
    const tick = async () => {
      if (document.hidden && open) return;
      try {
        const data = await fetchMessages(session.id, lastId);
        if (!alive) return;
        setSession(data.session);
        if (data.messages.length) {
          setMessages((prev) => [...prev, ...data.messages]);
          if (data.messages.some((m) => m.sender === "admin" || m.sender === "bot")) {
            playChatSound("incoming");
          }
          if (!open) setUnread((u) => u + data.messages.length);
        }
      } catch {
        /* ignore */
      }
    };
    void tick();
    const interval = window.setInterval(tick, open ? 1500 : 8000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [session, lastId, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      touchActivity();
      unlockChatSound();
      lastInteractionRef.current = Date.now();
    }
  }, [open]);

  /* Idle reset: 10 menit tanpa interaksi */
  useEffect(() => {
    const check = () => {
      if (!shouldResetSession()) return;
      resetVisitor();
      setSession(null);
      setMessages([]);
      setUnread(0);
      setOpen(false);
    };
    const id = window.setInterval(check, 30000);
    return () => window.clearInterval(id);
  }, []);

  /* Live chat idle guard: 3 menit idle -> 30 detik countdown -> balik ke Livi AI */
  useEffect(() => {
    if (!session || session.status !== "active") {
      setIdleCountdown(null);
      return;
    }
    const id = window.setInterval(async () => {
      const idleFor = Date.now() - lastInteractionRef.current;
      if (idleFor < LIVE_IDLE_WARN_MS) {
        setIdleCountdown(null);
        return;
      }
      const remaining = Math.ceil((LIVE_IDLE_WARN_MS + LIVE_IDLE_GRACE_MS - idleFor) / 1000);
      if (remaining > 0) {
        setIdleCountdown((prev) => {
          if (prev === null) playChatSound("alert");
          return remaining;
        });
        return;
      }
      setIdleCountdown(null);
      try {
        const data = await resumeBot(session.id);
        setSession(data.session);
        setMessages(data.messages);
        playChatSound("incoming");
      } catch {
        /* ignore */
      }
      lastInteractionRef.current = Date.now();
    }, 1000);
    return () => window.clearInterval(id);
  }, [session]);

  /* Trigger dari halaman lain, mis. "Tanya tentang produk ini" di ItemDetail */
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<AskBotDetail>).detail;
      if (!detail) return;
      contextRef.current = { item_slug: detail.item_slug, item_name: detail.item_name };
      setVisible(true);
      setOpen(true);
      await boot();
      submit(detail.text, { item_slug: detail.item_slug, item_name: detail.item_name });
    };
    window.addEventListener("livora:ask-concierge", handler as EventListener);
    return () => window.removeEventListener("livora:ask-concierge", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boot, session]);

  const askLogin = (text: string, ctx?: { item_slug?: string; item_name?: string }) => {
    sessionStorage.setItem(PENDING_CHAT_KEY, JSON.stringify({ text, ctx: ctx ?? contextRef.current }));
    setGate("login");
  };

  const goToAuth = (path: "/login" | "/register") => {
    rememberIntendedPath();
    setOpen(false);
    navigate(path);
  };

  const submit = async (text: string, ctx?: { item_slug?: string; item_name?: string }) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!authStorage.getToken()) {
      askLogin(trimmed, ctx);
      return;
    }
    setGate(null);

    let active = session;
    if (!active) {
      try {
        const data = await openSession();
        active = data.session;
        setSession(data.session);
        setMessages(data.messages);
      } catch {
        return;
      }
    }

    touchActivity();
    unlockChatSound();
    lastInteractionRef.current = Date.now();
    setIdleCountdown(null);
    playChatSound("sent");
    setLoading(true);

    const optimisticId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, sender: "user", text: trimmed, created_at: new Date().toISOString() },
    ]);

    try {
      const data = await sendMessage(active.id, trimmed, {
        ...(ctx ?? contextRef.current),
        page_path: pathname,
        category_slug: activeCategorySlug,
      });
      setSession(data.session);
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticId);
        return [...withoutOptimistic, ...data.messages];
      });
      if (data.messages.some((m) => m.sender === "bot" || m.sender === "admin")) {
        playChatSound("incoming");
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      if (status === 401 || code === "login_required") {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        askLogin(trimmed, ctx);
        return;
      }
      if (code === "daily_limit") {
        setGate("limit");
        setGateMessage(error.response.data.message);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: "Maaf, pesan gagal terkirim. Coba kirim ulang sebentar lagi ya.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* Setelah login: buka chat lagi & kirim pesan yang tertunda */
  useEffect(() => {
    if (isHidden) return;
    const raw = sessionStorage.getItem(PENDING_CHAT_KEY);
    if (!raw || !authStorage.getToken()) return;
    sessionStorage.removeItem(PENDING_CHAT_KEY);
    try {
      const pending = JSON.parse(raw) as {
        text: string;
        ctx?: { item_slug?: string; item_name?: string };
      };
      setVisible(true);
      setOpen(true);
      setGate(null);
      setTimeout(() => submit(pending.text, pending.ctx), 400);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isHidden]);

  const handleSend = async () => {
    const text = input;
    setInput("");
    await submit(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleTalkToCS = async () => {
    let active = session;
    if (!active) {
      try {
        const data = await openSession();
        active = data.session;
        setSession(data.session);
        setMessages(data.messages);
      } catch {
        return;
      }
    }
    if (!active) return;
    try {
      const data = await requestCs(active.id, {
        reason: contextRef.current.item_name || learnedProfile?.core_need_summary || undefined,
      });
      setSession(data.session);
      setMessages(data.messages);
    } catch {
      /* ignore */
    }
  };

  const goToRecommendation = (url: string) => {
    setOpen(false);
    navigate(normalizeRecUrl(url));
  };

  const status = session?.status ?? "bot";
  const isLiveCs = status === "active";
  const statusLabel =
    status === "pending_cs"
      ? "Menghubungkan ke tim Livora..."
      : isLiveCs
      ? `Terhubung dengan ${session?.admin_name ?? "Tim Livora"}`
      : "Design & Furniture Advisor";

  if (isHidden) {
    return null;
  }

  return (
    <>
      {/* Minimalist Floating Chat Icon Button (Framer Motion owns all transform/opacity) */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup chat" : "Buka chat Livora"}
        className="fixed right-4 sm:right-6 z-[60] w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E93B8] hover:border-[#232528]/25 will-change-transform"
        style={{
          bottom: "max(1rem, env(safe-area-inset-bottom))",
          backgroundColor: open ? CHARCOAL : "#FFFFFF",
          color: open ? LIMESTONE : CHARCOAL,
          border: open ? "1px solid rgba(35,37,40,0.9)" : "1px solid rgba(35,37,40,0.12)",
          boxShadow: open
            ? "0 14px 32px -10px rgba(35,37,40,0.38)"
            : "0 12px 30px -10px rgba(35,37,40,0.22)",
          pointerEvents: visible ? "auto" : "none",
        }}
        initial={false}
        animate={{
          opacity: visible ? 1 : 0,
          y: visible ? 0 : 16,
        }}
        transition={{ duration: 0.26, ease }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 45 }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-center"
            >
              <X size={20} strokeWidth={1.6} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-center"
            >
              <LivoraChatIcon className="w-[23px] h-[23px]" />
            </motion.span>
          )}
        </AnimatePresence>

        {!open && unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-medium flex items-center justify-center border-2 border-white shadow"
            style={{ backgroundColor: SAND }}
          >
            {unread}
          </span>
        )}
      </motion.button>

      {/* Interactive Chat Panel */}
      <AnimatePresence>
        {open && visible && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.32, ease }}
            className={`fixed z-[65] flex flex-col rounded-[24px] overflow-hidden bg-[#FAF8F4] border border-[#232528]/12 shadow-[0_32px_80px_-24px_rgba(35,37,40,0.34)] transition-[width,height] duration-300 ${CHAT_SIZES[size].className}`}
          >
            {/* Header */}
            <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between bg-white border-b border-[#232528]/8">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <LiviEmblem size="md" isLiveCs={isLiveCs} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="serif text-[18px] font-normal text-[#232528] leading-none truncate">
                      {isLiveCs ? "Livora Customer Service" : "Livi · Livora"}
                    </p>
                    {isLiveCs && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] font-medium shrink-0 bg-[#ECFDF5] text-[#047857]">
                        Live
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10.5px] tracking-[0.08em] text-[#656B73] truncate">
                    {statusLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => cycleSize(size === "md" ? 1 : -1)}
                  aria-label={size === "md" ? "Perbesar ukuran chat" : "Perkecil ukuran chat"}
                  title={size === "md" ? "Perbesar" : "Perkecil"}
                  className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full text-[#656B73] hover:text-[#232528] hover:bg-[#232528]/5 transition-colors"
                >
                  {size === "md" ? (
                    <Maximize2 size={14} strokeWidth={1.6} />
                  ) : (
                    <Minimize2 size={14} strokeWidth={1.6} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup chat"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-[#656B73] hover:text-[#232528] hover:bg-[#232528]/5 transition-colors"
                >
                  <X size={16} strokeWidth={1.7} />
                </button>
              </div>
            </div>

            {/* Subtle Preferences Ribbon (shows what Livi remembers without flashy AI clutter) */}
            <AnimatePresence>
              {(profileTags.length > 0 || learnedProfile?.core_need_summary) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-[#232528]/8 bg-[#F4F1EA]/75"
                >
                  <button
                    type="button"
                    onClick={() => setProfileExpanded((v) => !v)}
                    className="w-full px-4 py-2 flex items-center justify-between gap-2 text-left"
                  >
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#656B73] shrink-0">
                        Preferensi:
                      </span>
                      {profileTags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-white border border-[#232528]/10 px-2 py-0.5 text-[10px] text-[#232528] whitespace-nowrap shrink-0"
                        >
                          {tag}
                        </span>
                      ))}
                      {profileTags.length > 3 && (
                        <span className="text-[10px] text-[#656B73] shrink-0">
                          +{profileTags.length - 3}
                        </span>
                      )}
                    </div>
                    <span className="text-[#656B73] shrink-0">
                      {profileExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </span>
                  </button>

                  <AnimatePresence>
                    {profileExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-2.5 pt-0.5 space-y-2 border-t border-[#232528]/6"
                      >
                        {learnedProfile?.core_need_summary && (
                          <p className="text-[11.5px] leading-relaxed text-[#232528]/85">
                            {learnedProfile.core_need_summary}
                          </p>
                        )}
                        {profileTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {profileTags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[10.5px] text-[#232528] border border-[#232528]/10"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Peringatan idle live chat */}
            <AnimatePresence>
              {idleCountdown !== null && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-[#B89D7A]/25 bg-[#FBF6EE]"
                >
                  <p className="px-4 py-2 text-[11px] leading-relaxed text-[#7A5A20]">
                    Masih di sana? Sesi live chat akan kembali ke Livi (AI) dalam{" "}
                    <strong>{idleCountdown} detik</strong>. Kirim pesan untuk tetap terhubung.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Canvas */}
            <div
              ref={scrollRef}
              data-lenis-prevent
              className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4"
              style={{
                background:
                  "linear-gradient(180deg, #FAF8F4 0%, #F7F5F0 100%)",
              }}
            >
              {booting && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-[#656B73]">
                  <Loader2 size={14} className="animate-spin text-[#5E93B8]" />
                  <span>Menyiapkan Livi Concierge...</span>
                </div>
              )}

              {messages.map((m) =>
                m.sender === "system" ? (
                  <div key={m.id} className="flex justify-center">
                    <p className="inline-block rounded-full bg-white/80 border border-[#232528]/8 px-3.5 py-1.5 text-[11px] text-center text-[#656B73] leading-relaxed max-w-[92%]">
                      {m.text}
                    </p>
                  </div>
                ) : (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, ease }}
                    className={`flex gap-2.5 ${
                      m.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {m.sender !== "user" && (
                      <div className="mt-0.5 shrink-0">
                        <LiviEmblem
                          size="sm"
                          isLiveCs={m.sender === "admin"}
                          showPulse={false}
                        />
                      </div>
                    )}

                    <div className={`max-w-[86%] ${m.sender === "user" ? "items-end" : "items-start"} flex flex-col`}>
                      {m.sender === "admin" && (
                        <p className="text-[9.5px] uppercase tracking-[0.2em] text-[#5E93B8] font-medium mb-1 pl-1">
                          Livora Customer Service
                        </p>
                      )}

                      <div
                        className={`px-4 py-3 text-[13.5px] font-normal leading-relaxed rounded-2xl ${
                          m.sender === "user"
                            ? "rounded-br-sm text-[#FAF8F4]"
                            : "rounded-tl-sm text-[#232528] bg-white border border-[#232528]/8 shadow-[0_2px_12px_-6px_rgba(35,37,40,0.08)]"
                        }`}
                        style={
                          m.sender === "user"
                            ? {
                                background:
                                  "linear-gradient(135deg, #232528 0%, #313B44 100%)",
                              }
                            : undefined
                        }
                      >
                        <FormattedMessageText text={m.text} isUser={m.sender === "user"} />
                      </div>

                      {/* Rich Curated Recommendation Cards */}
                      {m.sender === "bot" &&
                        Array.isArray(m.meta?.recommendations) &&
                        m.meta.recommendations.length > 0 && (
                          <div className="mt-3 w-full">
                            <p
                              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-medium mb-2 pl-0.5"
                              style={{ color: SKY }}
                            >
                              <Sparkles size={11} strokeWidth={1.8} />
                              Kurasi Livi untuk Anda
                            </p>
                            <div
                              data-lenis-prevent
                              className={`flex gap-2.5 overflow-x-auto no-scrollbar snap-x pb-1.5 ${
                                size === "lg" ? "sm:grid sm:grid-cols-2 sm:overflow-visible" : ""
                              }`}
                            >
                              {(m.meta.recommendations as Recommendation[]).map((rec, i) => (
                                <button
                                  key={`${m.id}-rec-${i}`}
                                  type="button"
                                  onClick={() => goToRecommendation(rec.url)}
                                  className={`group text-left bg-white hover:border-[#5E93B8]/55 flex flex-col overflow-hidden shrink-0 snap-start rounded-xl border border-[#232528]/10 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(35,37,40,0.28)] ${
                                    size === "lg" ? "w-[190px] sm:w-auto" : "w-[164px]"
                                  }`}
                                >
                                  <div className="w-full aspect-[4/3] bg-[#F4F1EA] overflow-hidden relative">
                                    {rec.image ? (
                                      <img
                                        src={imgUrl(rec.image)}
                                        alt={rec.title}
                                        className={`w-full h-full transition-transform duration-500 group-hover:scale-105 ${
                                          rec.type === "item"
                                            ? "object-contain p-2.5 bg-white"
                                            : "object-cover"
                                        }`}
                                        loading="lazy"
                                        onError={(e) => {
                                          const el = e.currentTarget as HTMLImageElement;
                                          el.style.display = "none";
                                        }}
                                      />
                                    ) : null}
                                    <span className="absolute top-2 left-2 rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[8.5px] uppercase tracking-[0.16em] font-medium text-[#232528]">
                                      {TYPE_BADGE[rec.type] ?? "Livora"}
                                    </span>
                                  </div>
                                  <div className="p-2.5 flex-1 flex flex-col">
                                    <p className="text-[12.5px] font-medium text-[#232528] leading-snug line-clamp-2 group-hover:text-[#5E93B8] transition-colors">
                                      {rec.title}
                                    </p>
                                    {rec.reason ? (
                                      <p className="mt-1 text-[10.5px] leading-snug text-[#5E93B8] line-clamp-2">
                                        {rec.reason}
                                      </p>
                                    ) : rec.subtitle ? (
                                      <p className="mt-0.5 text-[10.5px] text-[#656B73] truncate">
                                        {rec.subtitle}
                                      </p>
                                    ) : null}
                                    <span className="mt-auto pt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-medium text-[#232528]/75 group-hover:text-[#5E93B8] transition-colors">
                                      {TYPE_CTA[rec.type] ?? "Lihat"}
                                      <ArrowUpRight size={11} strokeWidth={1.8} />
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* CTA Konsultasi */}
                      {m.sender === "bot" && m.meta?.show_consultation && (
                        <button
                          type="button"
                          onClick={() =>
                            goToRecommendation(m.meta?.consultation_url ?? "/appointment")
                          }
                          className="mt-2.5 w-full inline-flex items-center justify-center gap-2 text-[10.5px] uppercase tracking-[0.2em] font-medium px-4 py-2.5 rounded-xl bg-[#232528] text-[#FAF8F4] hover:bg-[#5E93B8] transition-colors duration-300"
                        >
                          <CalendarCheck size={13} strokeWidth={1.7} />
                          Jadwalkan Konsultasi
                        </button>
                      )}

                      {/* Eskalasi ke CS */}
                      {m.sender === "bot" && m.meta?.needs_escalation && status === "bot" && (
                        <button
                          type="button"
                          onClick={handleTalkToCS}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white border border-[#232528]/15 hover:border-[#5E93B8] hover:text-[#5E93B8] px-3 py-1.5 text-[11px] font-medium text-[#232528] transition-colors"
                        >
                          <Headset size={12} strokeWidth={1.7} />
                          Hubungkan ke Tim Livora
                        </button>
                      )}

                      {/* Smart Contextual Follow-Up Chips (only on latest bot turn when active) */}
                      {m.sender === "bot" &&
                        m.id === latestBotMessageId &&
                        status === "bot" &&
                        !loading &&
                        userMessagesCount > 0 &&
                        Array.isArray(m.meta?.quick_replies) &&
                        m.meta.quick_replies.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {(m.meta.quick_replies as string[]).map((qr, idx) => (
                              <button
                                key={`${m.id}-qr-${idx}`}
                                type="button"
                                onClick={() => void submit(qr)}
                                className="rounded-full bg-white border border-[#232528]/12 hover:border-[#5E93B8] hover:bg-[#EDF4F8] hover:text-[#232528] px-3 py-1.5 text-[11.5px] text-[#232528]/85 transition-colors duration-200 text-left"
                              >
                                {qr}
                              </button>
                            ))}
                          </div>
                        )}

                      {formatTime(m.created_at) && (
                        <p
                          className={`mt-1 flex items-center gap-1 text-[10px] text-[#656B73]/80 ${
                            m.sender === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {formatTime(m.created_at)}
                          {m.sender === "user" && (
                            <Check size={11} strokeWidth={1.7} style={{ color: SKY }} />
                          )}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ),
              )}

              {/* Interactive Concierge Hub on Fresh Session (Eliminates Empty White Void!) */}
              {!booting && !loading && status === "bot" && userMessagesCount === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease }}
                  className="pt-1 space-y-3"
                >
                  {/* Page-Aware Smart Suggestion when browsing a category / portfolio / collection */}
                  {pageAwarePrompt && (
                    <button
                      type="button"
                      onClick={() => void submit(pageAwarePrompt.prompt)}
                      className="w-full group flex items-center justify-between gap-3 rounded-2xl border border-[#5E93B8]/30 bg-[#EDF4F8]/80 hover:bg-[#EDF4F8] px-3.5 py-3 text-left transition-colors duration-200"
                    >
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 text-[9.5px] uppercase tracking-[0.2em] font-medium text-[#5E93B8]">
                          <Sparkles size={10} />
                          {pageAwarePrompt.badge}
                        </span>
                        <p className="mt-0.5 text-[12.5px] font-medium text-[#232528] truncate">
                          {pageAwarePrompt.label}
                        </p>
                      </div>
                      <ArrowUpRight
                        size={15}
                        className="shrink-0 text-[#5E93B8] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </button>
                  )}

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#656B73] font-medium mb-2 pl-0.5">
                      Mulai cepat dengan Livi
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {STARTER_CARDS.map((card) => {
                        const Icon = card.icon;
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => void submit(card.prompt)}
                            className="group rounded-2xl bg-white border border-[#232528]/8 hover:border-[#5E93B8]/55 p-3 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-18px_rgba(35,37,40,0.28)]"
                          >
                            <span
                              className="inline-flex h-7 w-7 items-center justify-center rounded-xl mb-2 transition-colors"
                              style={{ backgroundColor: SURFACE, color: CHARCOAL }}
                            >
                              <Icon
                                size={14}
                                strokeWidth={1.6}
                                className="group-hover:text-[#5E93B8] transition-colors"
                              />
                            </span>
                            <p className="text-[12px] font-medium text-[#232528] leading-snug group-hover:text-[#5E93B8] transition-colors">
                              {card.title}
                            </p>
                            <p className="mt-0.5 text-[10.5px] text-[#656B73] leading-snug">
                              {card.subtitle}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Auth / Quota Gate */}
              {gate && (
                <div className="rounded-2xl border border-[#5E93B8]/30 bg-white p-4 text-sm shadow-sm">
                  {gate === "login" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} style={{ color: SKY }} />
                        <p className="serif text-base text-[#232528]">
                          Masuk untuk lanjut ngobrol dengan Livi
                        </p>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#656B73]">
                        Pesanmu sudah tersimpan dan langsung terkirim setelah masuk, plus Livi bisa mengingat preferensi ruanganmu di sesi berikutnya.
                      </p>
                      <div className="mt-3.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => goToAuth("/login")}
                          className="flex-1 h-9 rounded-full text-xs font-medium bg-[#232528] text-[#FAF8F4] hover:bg-[#5E93B8] transition-colors"
                        >
                          Masuk
                        </button>
                        <button
                          type="button"
                          onClick={() => goToAuth("/register")}
                          className="flex-1 h-9 rounded-full border border-[#232528]/20 text-xs font-medium text-[#232528] hover:border-[#5E93B8] hover:text-[#5E93B8] transition-colors"
                        >
                          Daftar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="serif text-base text-[#232528]">Batas chat hari ini tercapai</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#656B73]">{gateMessage}</p>
                    </>
                  )}
                </div>
              )}

              {/* Smooth Animated Typing Indicator */}
              {loading && (
                <div className="flex items-center gap-2.5">
                  <LiviEmblem size="sm" showPulse={false} />
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white border border-[#232528]/8 px-3.5 py-2.5 shadow-sm">
                    <span className="flex items-center gap-1" aria-hidden>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#5E93B8] animate-bounce [animation-delay:-0.25s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#5E93B8] animate-bounce [animation-delay:-0.12s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#5E93B8] animate-bounce" />
                    </span>
                    <span className="text-[11.5px] text-[#656B73]">
                      Livi sedang mengetik...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Utility Strip */}
            <div className="px-4 py-2 bg-[#FAF8F4] border-t border-[#232528]/8 flex items-center justify-between gap-2">
              {status === "bot" && (
                <button
                  type="button"
                  onClick={handleTalkToCS}
                  className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] font-medium text-[#656B73] hover:text-[#232528] transition-colors"
                >
                  <Headset size={12} strokeWidth={1.7} />
                  <span>Bicara dengan Tim CS</span>
                </button>
              )}
              {status === "pending_cs" && (
                <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-[#5E93B8]">
                  <Loader2 size={11} className="animate-spin" />
                  Menunggu Tim Livora...
                </span>
              )}
              {status === "active" && (
                <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-[#047857] font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  Live Chat Aktif
                </span>
              )}

              <button
                type="button"
                onClick={() => goToRecommendation("/appointment")}
                className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.16em] font-medium text-[#5E93B8] hover:text-[#232528] transition-colors shrink-0"
              >
                <CalendarCheck size={12} strokeWidth={1.7} />
                <span>Showroom</span>
              </button>
            </div>

            {/* Modern Input Composer */}
            <div className="flex items-center gap-2 px-3.5 py-3 border-t border-[#232528]/8 bg-white">
              <div className="flex-1 flex items-center rounded-full border border-[#232528]/14 bg-[#FAF8F4] focus-within:bg-white focus-within:border-[#5E93B8] focus-within:ring-2 focus-within:ring-[#5E93B8]/15 transition-all px-4">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isLiveCs
                      ? "Tulis pesan untuk tim Livora..."
                      : "Ceritakan ruang atau furnitur yang kamu cari..."
                  }
                  className="w-full py-2.5 text-base sm:text-[13.5px] text-[#232528] placeholder:text-[#656B73]/70 outline-none bg-transparent"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={loading || !input.trim()}
                aria-label="Kirim pesan"
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-95 disabled:opacity-35"
                style={{
                  backgroundColor: input.trim() ? CHARCOAL : "#B8BDC4",
                  color: LIMESTONE,
                }}
              >
                <Send size={15} strokeWidth={1.7} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
