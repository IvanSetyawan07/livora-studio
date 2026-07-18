import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

import { api, authStorage } from "@/lib/api";
import loginBg from "@/assets/create-login1.png";
import logoLivora from "@/assets/logo-livora.png";

const ease = [0.22, 1, 0.36, 1] as const;

// ---------------------------------------------------------------------------
// Panoramic background — the source image is one wide composition split in
// two: its LEFT half belongs to the Login state, its RIGHT half belongs to
// the Register state. We never show the same center crop for both — instead
// the image pans from one half to the other as the auth state changes.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Image-side wording — swaps between the two auth states
// ---------------------------------------------------------------------------
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

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname !== "/register";

  // shared
  const [loading, setLoading] = useState(false);

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  // register fields
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

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

    // Client-side check only — does not touch existing API contract.
    if (regPassword !== regConfirmPassword) {
      toast.error("Password dan konfirmasi password tidak sama");
      return;
    }

    setLoading(true);
    try {
      await api.post("/register", { name, email: regEmail, password: regPassword });
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

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: "#ffffff", fontFamily: "'Work Sans', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-100 relative bg-white rounded-2xl overflow-hidden shadow-sm min-h-[96vh]">

        {/* ═══ Panel Gambar — DIAM DI TEMPAT. Tidak lagi ikut animasi "muter",
             cuma pindah left secara halus di belakang (z-10) sementara form
             yang selalu tampil di atasnya (z-20) ═══ */}
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

        {/* ═══ Panel Form — INI YANG BERGERAK. Selalu di atas (z-20), jadi
             kelihatan seperti form yang melintas di atas background, bukan
             gantian depan-belakang dengan panel gambar ═══ */}
        <motion.div
          animate={{ left: isLogin ? "50%" : "0%" }}
          transition={{ duration: 0.9, ease }}
          className="relative flex lg:absolute lg:inset-y-0 lg:w-1/2 z-20 flex-col px-8 sm:px-14 lg:px-20 py-12 bg-white overflow-hidden"
        >
          <div className="lg:hidden">
            <PanoramicImage isLogin={isLogin} />
          </div>
          <div className="lg:hidden absolute inset-0 bg-white/80 backdrop-blur-sm" />

          <div className="relative z-10 flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm">

              <div className="flex lg:hidden items-center gap-3 mb-8">
                <img src={logoLivora} alt="Livora" className="w-9 h-9 flex-shrink-0" />
                <div className="border-l border-neutral-200" style={{ height: "48px" }} />
                <div className="pl-3 leading-tight">
                  <div className="text-[8px] tracking-[0.24em] uppercase text-neutral-400 font-light">
                    PT. Langgeng Cipta Ruang
                  </div>
                  <div
                    className="text-[22px] tracking-[0.16em] text-neutral-700 leading-none mt-0.5"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
                  >
                    LIVORA
                  </div>
                </div>
              </div>

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

      </div>
    </div>
  );
}