import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Check, Mail, User } from "lucide-react";
import { toast } from "sonner";

import { api, authStorage } from "@/lib/api";
import loginBg from "@/assets/create-login1.png";
import logoLivora from "@/assets/logo-livora.png";

const ease = [0.22, 1, 0.36, 1] as const;

const COUNTRY_CODES = [
  { code: "ID", dial: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "MY", dial: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "SG", dial: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australia" },
] as const;

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  const isMac =
    /Macintosh/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  return isIOSDevice || isMac;
}

function PanoramicImage({ isLogin }: { isLogin: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.img
        src={loginBg}
        alt=""
        className="absolute inset-y-0 left-0 h-full object-cover"
        style={{ width: "200%", maxWidth: "200%" }}
        animate={{ x: isLogin ? "0%" : "-50%" }}
        transition={{ duration: 1.1, ease }}
      />
    </div>
  );
}

const WORDING = {
  login: {
    lines: ["Inspire.", "Function.", "Harmony."],
    sub: "Curated spaces\nfor the way you live.",
  },
  register: {
    lines: ["Create", "Account"],
    sub: "Join Livora and experience\na world of timeless living.",
  },
};

function ImageWording({ isLogin }: { isLogin: boolean }) {
  const content = isLogin ? WORDING.login : WORDING.register;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isLogin ? "login" : "register"}
        initial={{ opacity: 0, x: -30, filter: "blur(8px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, x: 30, filter: "blur(8px)" }}
        transition={{ duration: 0.9, ease }}
        className="text-white"
      >
        <h2
          className="leading-[1.1]"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 400,
            fontSize: "clamp(2.8rem, 5vw, 4.8rem)",
          }}
        >
          {content.lines.map((word, i) => (
            <motion.span
              key={word}
              className="block"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.15 + i * 0.1 }}
            >
              {word}
            </motion.span>
          ))}
        </h2>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease, delay: 0.4 }}
          style={{ transformOrigin: "left" }}
          className="h-px bg-white/40 w-16 my-5"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.5 }}
          className="text-white/70 text-[15px] leading-relaxed whitespace-pre-line font-light"
        >
          {content.sub}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}

function MobileWording({ isLogin }: { isLogin: boolean }) {
  const content = isLogin ? WORDING.login : WORDING.register;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={isLogin ? "login" : "register"}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.5, ease }}
        className="text-white"
      >
        <h2
          className="leading-[1.05]"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 400,
            fontSize: "clamp(2.1rem, 8.5vw, 2.75rem)",
          }}
        >
          {content.lines.map((word) => (
            <span key={word} className="block">
              {word}
            </span>
          ))}
        </h2>

        <div className="h-px bg-white/40 w-11 my-3" />

        <p className="text-white/75 text-[12.5px] leading-relaxed whitespace-pre-line font-light">
          {content.sub}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

function useViewportHeight() {
  const [vh, setVh] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800
  );
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return vh;
}

function GoogleButton({ mountRef }: { mountRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div className="relative w-full h-11">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none w-full h-11 rounded-lg border border-neutral-200 bg-white text-neutral-700 text-[14px] font-medium flex items-center justify-center gap-2.5"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.964 10.706A5.41 5.41 0 0 1 3.68 9c0-.593.102-1.17.284-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
          />
        </svg>
        Continue with Google
      </button>
      <div
        ref={mountRef}
        className="absolute inset-0 overflow-hidden rounded-lg opacity-0"
        style={{ colorScheme: "light" }}
      />
    </div>
  );
}

interface MobileAuthSheetProps {
  isLogin: boolean;
  loading: boolean;
  applePlatform: boolean;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  remember: boolean;
  setRemember: (v: boolean) => void;
  name: string;
  setName: (v: string) => void;
  regEmail: string;
  setRegEmail: (v: string) => void;
  regCountryCode: string;
  setRegCountryCode: (v: string) => void;
  regPhone: string;
  setRegPhone: (v: string) => void;
  regPassword: string;
  setRegPassword: (v: string) => void;
  regConfirmPassword: string;
  setRegConfirmPassword: (v: string) => void;
  showRegPassword: boolean;
  setShowRegPassword: (v: boolean) => void;
  agreeTerms: boolean;
  setAgreeTerms: (v: boolean) => void;
  handleLogin: (e: React.FormEvent) => void;
  handleRegister: (e: React.FormEvent) => void;
  googleMobileRef: React.RefObject<HTMLDivElement>;
  handleAppleClick: () => void;
}

function MobileAuthSheet(props: MobileAuthSheetProps) {
  const {
    isLogin, loading, applePlatform,
    email, setEmail, password, setPassword, showPassword, setShowPassword,
    remember, setRemember,
    name, setName, regEmail, setRegEmail, regCountryCode, setRegCountryCode,
    regPhone, setRegPhone, regPassword, setRegPassword,
    regConfirmPassword, setRegConfirmPassword, showRegPassword, setShowRegPassword,
    agreeTerms, setAgreeTerms,
    handleLogin, handleRegister, googleMobileRef, handleAppleClick,
  } = props;

  const vh = useViewportHeight();

  const TOP_INSET = 96;
  const sheetHeight = Math.max(vh - TOP_INSET, 360);

  const collapsedVisible = Math.min(vh * 0.46, sheetHeight);
  const collapsedY = sheetHeight - collapsedVisible;
  const expandedY = 0;

  const y = useMotionValue(collapsedY);
  const [expanded, setExpanded] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animate(y, expanded ? expandedY : collapsedY, {
      type: "spring",
      stiffness: 520,
      damping: 38,
      mass: 0.7,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vh]);

  const snapTo = (next: boolean) => {
    setExpanded(next);
    setDragEnabled(true);
    if (!next && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    animate(y, next ? expandedY : collapsedY, {
      type: "spring",
      stiffness: 520,
      damping: 38,
      mass: 0.7,
    });
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { velocity: { y: number }; offset: { y: number } }
  ) => {
    const velocity = info.velocity.y;
    const midpoint = (expandedY + collapsedY) / 2;
    const current = y.get();

    let next: boolean;
    if (velocity < -180) next = true;
    else if (velocity > 180) next = false;
    else next = current < midpoint;

    snapTo(next);
  };

  const handleContentScroll = () => {
    if (!expanded || !contentRef.current) return;
    setDragEnabled(contentRef.current.scrollTop <= 0);
  };

  const wordingOpacity = useTransform(y, [expandedY, collapsedY], [0, 1]);
  const wordingY = useTransform(y, [expandedY, collapsedY], [-12, 0]);

  return (
    <div
      className="lg:hidden relative w-full overflow-hidden bg-neutral-900"
      style={{ height: "100dvh" }}
    >
      <div className="absolute inset-0 z-10">
        <PanoramicImage isLogin={isLogin} />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/35 to-transparent" />

        <div
          className="relative flex items-center gap-2.5 text-white px-6"
          style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
        >
          <img src={logoLivora} alt="Livora" className="w-8 h-8 flex-shrink-0" />
          <div className="border-l border-white/40" style={{ height: "36px" }} />
          <div className="pl-2.5 leading-tight">
            <div className="text-[7px] tracking-[0.22em] uppercase font-light opacity-90">
              PT. Langgeng Cipta Ruang
            </div>
            <div
              className="text-[18px] tracking-[0.16em] leading-none mt-0.5"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
            >
              LIVORA
            </div>
          </div>
        </div>

        <motion.div
          className="absolute left-0 right-0 px-6 pr-12"
          style={{ bottom: `calc(${collapsedVisible}px + 28px)`, opacity: wordingOpacity, y: wordingY }}
        >
          <MobileWording isLogin={isLogin} />
        </motion.div>
      </div>

      <motion.div
        drag={dragEnabled ? "y" : false}
        dragConstraints={{ top: expandedY, bottom: collapsedY }}
        dragElastic={0.12}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ y, height: sheetHeight, touchAction: "none" }}
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col"
      >
        <div
          className="flex flex-col h-full"
          style={{
            backgroundColor: "#FAF9F6",
            borderTopLeftRadius: "28px",
            borderTopRightRadius: "28px",
            boxShadow: "0 -12px 32px rgba(0,0,0,0.16)",
          }}
        >
          <button
            type="button"
            onClick={() => snapTo(!expanded)}
            className="w-full flex justify-center pt-3 pb-4 flex-shrink-0"
            aria-label={expanded ? "Collapse form" : "Expand form"}
          >
            <span className="w-9 h-1 rounded-full bg-neutral-300" />
          </button>

          <div
            ref={contentRef}
            onScroll={handleContentScroll}
            className="px-6 pt-2 flex-1 min-h-0"
            style={{
              overflowY: expanded ? "auto" : "hidden",
              paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
              touchAction: expanded ? "pan-y" : "none",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isLogin ? (
                <motion.div
                  key="mobile-login"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease }}
                >
                  <h1
                    className="text-[24px] leading-tight text-neutral-900"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
                  >
                    Glad to see you again.
                  </h1>
                  <p className="mt-1.5 text-[13px] text-neutral-500 leading-relaxed">
                    Login to continue to your Livora dashboard.
                  </p>

                  <form onSubmit={handleLogin} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-neutral-800">Email</label>
                      <div className="relative">
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => snapTo(true)}
                          required
                          className="w-full h-12 px-3.5 pr-10 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                        <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-neutral-800">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => snapTo(true)}
                          required
                          className="w-full h-12 px-3.5 pr-10 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[13px] pt-0.5">
                      <button
                        type="button"
                        onClick={() => setRemember(!remember)}
                        className="flex items-center gap-2 text-neutral-600"
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors ${
                            remember ? "border-[#C9974A] bg-[#C9974A]" : "border-neutral-300 bg-white"
                          }`}
                        >
                          {remember && <Check size={10} className="text-white" strokeWidth={3} />}
                        </span>
                        Remember Me
                      </button>
                      <Link to="/forgot-password" className="text-[#C9974A] font-medium hover:underline">
                        Forgot Password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group w-full h-12 rounded-lg bg-[#C9974A] shadow-lg shadow-[#C9974A]/20 text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#b88639] active:bg-[#a3762e] transition disabled:opacity-70 mt-1"
                    >
                      {loading ? "Loading..." : "Log in"}
                      {!loading && (
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                      )}
                    </button>
                  </form>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-neutral-200" />
                    </div>
                    <div className="relative flex justify-center text-[12px]">
                      <span className="px-3 text-neutral-400" style={{ backgroundColor: "#FAF9F6" }}>or</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <GoogleButton mountRef={googleMobileRef} />

                    {applePlatform && (
                      <button
                        type="button"
                        onClick={handleAppleClick}
                        className="w-full h-12 rounded-lg border border-neutral-200 bg-white text-neutral-700 text-[14px] font-medium flex items-center justify-center gap-2.5 hover:bg-neutral-50 transition"
                      >
                        <svg width="15" height="15" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
                          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 0 184.8 0 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 37.5 59 129.3 107.2 127.8 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-84.1 102.6-121.7-65.2-30.7-57.7-89.9-57.7-92.1zM254.4 88.5c27.2-32.2 24.7-61.5 24-72-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.8z"/>
                        </svg>
                        Continue with Apple
                      </button>
                    )}
                  </div>

                  <p className="text-center text-[13px] text-neutral-500 mt-6">
                    Not registered yet?{" "}
                    <Link to="/register" className="text-[#C9974A] font-medium hover:underline">
                      Create an account
                    </Link>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="mobile-register"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease }}
                >
                  <h1
                    className="text-[24px] leading-tight text-neutral-900"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
                  >
                    Create your account.
                  </h1>
                  <p className="mt-1.5 text-[13px] text-neutral-500 leading-relaxed">
                    Fill in the details below to get started.
                  </p>

                  <form onSubmit={handleRegister} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-neutral-800">Full Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => snapTo(true)}
                          required
                          className="w-full h-12 px-3.5 pr-10 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                        <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-neutral-800">Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          onFocus={() => snapTo(true)}
                          required
                          className="w-full h-12 px-3.5 pr-10 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                        <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-neutral-800">Nomor HP</label>
                      <div className="flex gap-2">
                        <select
                          value={regCountryCode}
                          onChange={(e) => setRegCountryCode(e.target.value)}
                          className="h-12 pl-2.5 pr-1.5 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition shrink-0"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.dial}>
                              {c.flag} {c.dial}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          inputMode="numeric"
                          placeholder="812345678"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ""))}
                          onFocus={() => snapTo(true)}
                          required
                          className="w-full h-12 px-3.5 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-neutral-800">Password</label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          onFocus={() => snapTo(true)}
                          required
                          minLength={6}
                          className="w-full h-12 px-3.5 pr-10 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
                        >
                          {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-semibold text-neutral-800">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          onFocus={() => snapTo(true)}
                          required
                          minLength={6}
                          className="w-full h-12 px-3.5 pr-10 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                        <Eye size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-300" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAgreeTerms(!agreeTerms)}
                      className="flex items-start gap-2 text-left text-[12.5px] text-neutral-600 leading-relaxed pt-1"
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                          agreeTerms ? "border-[#C9974A] bg-[#C9974A]" : "border-neutral-300 bg-white"
                        }`}
                      >
                        {agreeTerms && <Check size={10} className="text-white" strokeWidth={3} />}
                      </span>
                      <span>
                        I agree to the{" "}
                        <a href="/terms" className="text-[#C9974A] font-medium hover:underline">Terms of Service</a>{" "}
                        and{" "}
                        <a href="/privacy" className="text-[#C9974A] font-medium hover:underline">Privacy Policy</a>.
                      </span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading || !agreeTerms}
                      className="group w-full h-12 rounded-lg bg-[#C9974A] shadow-lg shadow-[#C9974A]/20 text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#b88639] active:bg-[#a3762e] transition disabled:opacity-50 mt-1"
                    >
                      {loading ? "Loading..." : "Create Account"}
                      {!loading && (
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                      )}
                    </button>
                  </form>

                  <p className="text-center text-[13px] text-neutral-500 mt-6">
                    Already have an account?{" "}
                    <Link to="/login" className="text-[#C9974A] font-medium hover:underline">
                      Sign in
                    </Link>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname !== "/register";

  const [loading, setLoading] = useState(false);
  const [applePlatform] = useState(isApplePlatform);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCountryCode, setRegCountryCode] = useState("+62");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/login", { email, password });
      authStorage.setToken(data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user?.role === "admin" ? "/admin" : "/");
    } catch {
      toast.error("Email atau password salah");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (regPassword !== regConfirmPassword) {
      toast.error("Password dan konfirmasi password tidak sama");
      return;
    }

    setLoading(true);
    try {
      await api.post("/register", {
        name,
        email: regEmail,
        phone: `${regCountryCode}${regPhone}`,
        password: regPassword,
      });
      toast.success("Register berhasil! Silakan login.");
      navigate("/login");
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        (error?.response?.data?.errors
          ? Object.values(error.response.data.errors).flat().join("\n")
          : "Register gagal");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const googleDesktopRef = useRef<HTMLDivElement>(null);
  const googleMobileRef = useRef<HTMLDivElement>(null);
  const googleInitialized = useRef(false);

  const handleGoogleCredential = async (response: { credential: string }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/google/callback", {
        id_token: response.credential,
      });
      authStorage.setToken(data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user?.role === "admin" ? "/admin" : "/");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Google login gagal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const w = window as any;

    const renderButtons = () => {
      const opts = { type: "standard", width: 320, text: "continue_with" } as const;
      if (googleDesktopRef.current) {
        googleDesktopRef.current.innerHTML = "";
        w.google.accounts.id.renderButton(googleDesktopRef.current, opts);
      }
      if (googleMobileRef.current) {
        googleMobileRef.current.innerHTML = "";
        w.google.accounts.id.renderButton(googleMobileRef.current, opts);
      }
    };

    const tryInit = () => {
      if (!w.google?.accounts?.id) return false;

      if (!googleInitialized.current) {
        w.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        googleInitialized.current = true;
      }

      renderButtons();
      return true;
    };

    if (tryInit()) return;
    const interval = setInterval(() => {
      if (tryInit()) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAppleClick = () => {
    toast("Apple sign-in is coming soon.");
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center lg:p-2 lg:sm:p-4"
      style={{ backgroundColor: "#ffffff", fontFamily: "'Work Sans', system-ui, sans-serif" }}
    >
      <div className="w-full lg:max-w-100 relative bg-white lg:rounded-2xl overflow-hidden lg:shadow-sm min-h-[100dvh] lg:min-h-[96vh]">

        <motion.div
          animate={{ left: isLogin ? "0%" : "50%" }}
          transition={{ duration: 0.9, ease }}
          className="relative hidden lg:flex lg:absolute lg:inset-y-0 lg:w-1/2 z-10 flex-col justify-center overflow-hidden bg-neutral-200 px-14"
        >
          <PanoramicImage isLogin={isLogin} />
          <div className="absolute inset-0 bg-black/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

          <div className="absolute top-7 left-8 z-10 flex items-center gap-3 text-white">
            <img src={logoLivora} alt="Livora" className="w-9 h-9 flex-shrink-0" />
            <div className="border-l border-white/40" style={{ height: "48px" }} />
            <div className="pl-3 leading-tight">
              <div className="text-[8px] tracking-[0.24em] uppercase font-light opacity-90">
                PT. Langgeng Cipta Ruang
              </div>
              <div
                className="text-[22px] tracking-[0.16em] leading-none mt-0.5"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
              >
                LIVORA
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-md">
            <ImageWording isLogin={isLogin} />
          </div>
        </motion.div>

        <motion.div
          animate={{ left: isLogin ? "50%" : "0%" }}
          transition={{ duration: 0.9, ease }}
          className="relative hidden lg:flex lg:absolute lg:inset-y-0 lg:w-1/2 z-20 flex-col px-8 sm:px-14 lg:px-20 py-12 bg-white overflow-hidden"
        >
          <div className="relative z-10 flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm">

              <AnimatePresence mode="popLayout" initial={false}>
                {isLogin ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -50, filter: "blur(10px)" }}
                    transition={{ duration: 0.6, ease }}
                  >
                    <h1
                      className="text-[32px] leading-tight text-neutral-900"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
                    >
                      Glad to see you again.
                    </h1>
                    <p className="mt-2 text-[13px] text-neutral-400 leading-relaxed">
                      Login to continue to your Livora dashboard.
                    </p>

                    <form onSubmit={handleLogin} className="mt-8 space-y-5">
                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-medium text-neutral-700">Email</label>
                        <input
                          type="email"
                          placeholder="mail@abc.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-medium text-neutral-700">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full h-11 px-3.5 pr-10 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500 transition"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[13px]">
                        <button
                          type="button"
                          onClick={() => setRemember(!remember)}
                          className="flex items-center gap-2 text-neutral-600"
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors ${
                              remember ? "border-[#C9974A] bg-[#C9974A]" : "border-neutral-300 bg-white"
                            }`}
                          >
                            {remember && <Check size={10} className="text-white" strokeWidth={3} />}
                          </span>
                          Remember Me
                        </button>
                        <Link to="/forgot-password" className="text-[#C9974A] hover:underline">
                          Forgot Password?
                        </Link>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="group w-full h-11 rounded-lg bg-[#C9974A] shadow-lg shadow-[#C9974A]/20 text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#b88639] active:bg-[#a3762e] transition disabled:opacity-70"
                      >
                        {loading ? "Loading..." : "Login"}
                        {!loading && (
                          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                        )}
                      </button>
                    </form>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-neutral-200" />
                      </div>
                      <div className="relative flex justify-center text-[12px]">
                        <span className="bg-white px-3 text-neutral-400">or Sign in with Email</span>
                      </div>
                    </div>

                    <GoogleButton mountRef={googleDesktopRef} />

                    <p className="text-center text-[13px] text-neutral-400 mt-6">
                      Not Registered Yet?{" "}
                      <Link to="/register" className="text-[#C9974A] font-medium hover:underline">
                        Create an account
                      </Link>
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: -50, filter: "blur(10px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                    transition={{ duration: 0.6, ease }}
                  >
                    <h1
                      className="text-[32px] leading-tight text-neutral-900"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
                    >
                      Create your account.
                    </h1>
                    <p className="mt-2 text-[13px] text-neutral-400 leading-relaxed">
                      Join Livora and start designing your space.
                    </p>

                    <form onSubmit={handleRegister} className="mt-8 space-y-5">
                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-medium text-neutral-700">Full Name</label>
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-medium text-neutral-700">Email Address</label>
                        <input
                          type="email"
                          placeholder="mail@abc.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-medium text-neutral-700">Nomor HP</label>
                        <div className="flex gap-2">
                          <select
                            value={regCountryCode}
                            onChange={(e) => setRegCountryCode(e.target.value)}
                            className="h-11 pl-2.5 pr-1.5 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition shrink-0"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.dial}>
                                {c.flag} {c.dial}
                              </option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="812345678"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ""))}
                            required
                            className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-medium text-neutral-700">Password</label>
                        <div className="relative">
                          <input
                            type={showRegPassword ? "text" : "password"}
                            placeholder="Min 6 characters"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full h-11 px-3.5 pr-10 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500 transition"
                          >
                            {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[13px] font-medium text-neutral-700">Confirm Password</label>
                        <input
                          type={showRegPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="group w-full h-11 rounded-lg bg-[#C9974A] shadow-lg shadow-[#C9974A]/20 text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#b88639] active:bg-[#a3762e] transition disabled:opacity-70"
                      >
                        {loading ? "Loading..." : "Create Account"}
                        {!loading && (
                          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                        )}
                      </button>

                      <p className="text-center text-[11px] text-neutral-400 leading-relaxed">
                        By creating an account, you agree to Livora's{" "}
                        <a href="/terms" className="text-[#C9974A] hover:underline">Terms of Service</a>{" "}
                        and{" "}
                        <a href="/privacy" className="text-[#C9974A] hover:underline">Privacy Policy</a>.
                      </p>
                    </form>

                    <p className="text-center text-[13px] text-neutral-400 mt-6">
                      Already have an account?{" "}
                      <Link to="/login" className="text-[#C9974A] font-medium hover:underline">
                        Sign in
                      </Link>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </motion.div>

        <MobileAuthSheet
          isLogin={isLogin}
          loading={loading}
          applePlatform={applePlatform}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          remember={remember}
          setRemember={setRemember}
          name={name}
          setName={setName}
          regEmail={regEmail}
          setRegEmail={setRegEmail}
          regCountryCode={regCountryCode}
          setRegCountryCode={setRegCountryCode}
          regPhone={regPhone}
          setRegPhone={setRegPhone}
          regPassword={regPassword}
          setRegPassword={setRegPassword}
          regConfirmPassword={regConfirmPassword}
          setRegConfirmPassword={setRegConfirmPassword}
          showRegPassword={showRegPassword}
          setShowRegPassword={setShowRegPassword}
          agreeTerms={agreeTerms}
          setAgreeTerms={setAgreeTerms}
          handleLogin={handleLogin}
          handleRegister={handleRegister}
          googleMobileRef={googleMobileRef}
          handleAppleClick={handleAppleClick}
        />

      </div>
    </div>
  );
}
