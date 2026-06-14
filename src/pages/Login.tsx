import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";

import { api, authStorage } from "@/lib/api";
import loginBg from "@/assets/login-new.png";
import logoLivora from "@/assets/logo-livora.png";

const words = ["Inspire,", "Function,", "Harmony."];

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [visibleWords, setVisibleWords] = useState<number[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [headingVisible, setHeadingVisible] = useState(false);
  const [fieldsVisible, setFieldsVisible] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);

  useEffect(() => {
    words.forEach((_, i) => {
      setTimeout(() => {
        setVisibleWords((prev) => [...prev, i]);
      }, 500 + i * 600);
    });

    setTimeout(() => setFormVisible(true), 20);
    setTimeout(() => setHeadingVisible(true), 120);
    setTimeout(() => setFieldsVisible(true), 170);
    setTimeout(() => setButtonVisible(true), 220);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/login", { email, password });
      authStorage.setToken(data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user?.role === "admin") navigate("/admin");
      else navigate("/");
    } catch {
      alert("Email atau password salah");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: "#ffffff", fontFamily: "'Work Sans', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-100 grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl overflow-hidden shadow-sm min-h-[96vh]">

        {/* ═══════════════════ LEFT — Hero ═══════════════════ */}
        <div className="relative hidden lg:block overflow-hidden bg-neutral-200">
          <img
            src={loginBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/8" />

          {/* Logo pojok kiri atas gambar */}
          <div className="absolute top-7 left-8 z-10 flex items-center gap-3 text-white">
            <img
              src={logoLivora}
              alt="Livora"
              className="w-9 h-9 flex-shrink-0"
              style={{ animation: 'spin 2s linear' }}
            />
            <div className="border-l border-white/40" style={{ height: '48px' }} />
            <div
              className="pl-3 leading-tight"
              style={{ animation: 'slideInFromLeft 0.7s ease-out 0.2s both' }}
            >
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
            <style>{`
              @keyframes slideInFromLeft {
                from { opacity: 0; transform: translateX(-32px); }
                to   { opacity: 1; transform: translateX(0); }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
              }
            `}</style>
          </div>

          {/* Tagline */}
          <div className="absolute left-[30%] top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 text-white">
            <h2
              className="leading-[1.1]"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(2.8rem, 5vw, 4.8rem)",
              }}
            >
              {words.map((word, i) => (
                <span
                  key={i}
                  className="block"
                  style={{
                    opacity: visibleWords.includes(i) ? 1 : 0,
                    transform: visibleWords.includes(i)
                      ? "translateX(0)"
                      : "translateX(-80px)",
                    filter: visibleWords.includes(i)
                      ? "blur(0px)"
                      : "blur(12px)",
                    transition: "all 1.4s cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  {word}
                </span>
              ))}
            </h2>
          </div>
        </div>

        {/* ═══════════════════ RIGHT — Form ═══════════════════ */}
        <div
          className="relative flex flex-col px-8 sm:px-14 lg:px-20 py-12 bg-white"
          style={{
            opacity: formVisible ? 1 : 0,
            transform: formVisible ? "translateX(0)" : "translateX(80px)",
            filter: formVisible ? "blur(0px)" : "blur(14px)",
            transition: "all 1.4s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* Background hero untuk mobile saja */}
          <img
            src={loginBg}
            alt=""
            className="lg:hidden absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="lg:hidden absolute inset-0 bg-white/80 backdrop-blur-sm" />

          {/* Form content — center vertikal */}
          <div className="relative z-10 flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm">

              {/* Logo — hanya tampil di mobile */}
              <div className="flex lg:hidden items-center gap-3 mb-8">
                <img
                  src={logoLivora}
                  alt="Livora"
                  className="w-9 h-9 flex-shrink-0"
                  style={{ animation: 'spin 2s linear' }}
                />
                <div className="border-l border-neutral-200" style={{ height: '48px' }} />
                <div
                  className="pl-3 leading-tight"
                  style={{ animation: 'slideInFromLeft 0.7s ease-out 0.2s both' }}
                >
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
                <style>{`
                  @keyframes slideInFromLeft {
                    from { opacity: 0; transform: translateX(-32px); }
                    to   { opacity: 1; transform: translateX(0); }
                  }
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                  }
                `}</style>
              </div>

              {/* Heading */}
              <h1
                className="text-[32px] leading-tight text-neutral-900"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 500,
                  opacity: headingVisible ? 1 : 0,
                  transform: headingVisible ? "translateY(0)" : "translateY(40px)",
                  filter: headingVisible ? "blur(0px)" : "blur(8px)",
                  transition: "all 1.2s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                Glad to see you again.
              </h1>
              <p className="mt-2 text-[13px] text-neutral-400 leading-relaxed">
                Login to continue to your Livora dashboard.
              </p>

              {/* Form */}
              <form
                onSubmit={handleLogin}
                className="mt-8 space-y-5"
                style={{
                  opacity: fieldsVisible ? 1 : 0,
                  transform: fieldsVisible ? "translateY(0)" : "translateY(30px)",
                  filter: fieldsVisible ? "blur(0px)" : "blur(8px)",
                  transition: "all 1.2s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-neutral-700">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="mail@abc.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-11 px-3.5 rounded-lg border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-300 outline-none focus:border-[#C9974A] focus:ring-2 focus:ring-[#C9974A]/15 transition"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-neutral-700">
                    Password
                  </label>
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

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between text-[13px]">
                  <button
                    type="button"
                    onClick={() => setRemember(!remember)}
                    className="flex items-center gap-2 text-neutral-600"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors ${
                        remember
                          ? "border-[#C9974A] bg-[#C9974A]"
                          : "border-neutral-300 bg-white"
                      }`}
                    >
                      {remember && (
                        <Check size={10} className="text-white" strokeWidth={3} />
                      )}
                    </span>
                    Remember Me
                  </button>
                  <Link
                    to="/forgot-password"
                    className="text-[#C9974A] hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full h-11 rounded-lg bg-[#C9974A] shadow-lg shadow-[#C9974A]/20 text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#b88639] active:bg-[#a3762e] transition disabled:opacity-70"
                  style={{
                    opacity: buttonVisible ? 1 : 0,
                    transform: buttonVisible ? "translateY(0)" : "translateY(24px)",
                    transition: "all 1.2s cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  {loading ? "Loading..." : "Login"}
                  {!loading && (
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="h-px flex-1 bg-neutral-100" />
                <span className="text-[11px] text-neutral-300 whitespace-nowrap">
                  or Sign in with Email
                </span>
                <div className="h-px flex-1 bg-neutral-100" />
              </div>

              {/* Google */}
              <button
                type="button"
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white text-[14px] font-medium text-neutral-700 flex items-center justify-center gap-2.5 hover:bg-neutral-50 transition"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Register */}
              <p className="text-center text-[13px] text-neutral-400 mt-6">
                Not Registered Yet?{" "}
                <Link
                  to="/register"
                  className="text-[#C9974A] font-medium hover:underline"
                >
                  Create an account
                </Link>
              </p>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5.1c-1.9 1.3-4.3 2.1-7 2.1-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6 5.1c-.4.4 6.7-4.9 6.7-14.6 0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}