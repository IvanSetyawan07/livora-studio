import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import loginBg from "@/assets/create-login1.png";
import logoLivora from "@/assets/logo-livora.png";

const ease = [0.22, 1, 0.36, 1] as const;
const GOLD = "#C9974A";

const inputCls =
  "w-full h-12 pl-11 pr-11 rounded-xl border border-neutral-200 bg-white text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#C9974A] focus:ring-4 focus:ring-[#C9974A]/15 transition";

const btnCls =
  "group w-full h-12 rounded-xl bg-[#C9974A] shadow-lg shadow-[#C9974A]/25 text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#b88639] active:scale-[0.99] transition disabled:opacity-60";

function useWide() {
  const q = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

function Shell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  const wide = useWide();
  return (
    <div className="min-h-screen flex bg-[#FAF8F5]">
      {wide && <div className="relative shrink-0 min-h-screen overflow-hidden" style={{ width: "52%" }}>
        <motion.img
          src={loginBg}
          alt="Interior karya Livora"
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.2, ease }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.15) 55%, transparent)" }} />
        <motion.div
          className="absolute text-white" style={{ bottom: 56, left: 56, right: 56 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease }}
        >
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/70">Akun Livora</p>
          <p className="serif mt-4 text-4xl font-light leading-tight">Ruang Anda, tetap aman.</p>
          <p className="mt-3 max-w-sm text-sm font-light text-white/75">
            Atur ulang password dalam beberapa langkah dan kembali ke konsultasi Anda.
          </p>
        </motion.div>
      </div>}

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          className="w-full" style={{ maxWidth: 400 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          <Link to="/" className="inline-block">
            <img src={logoLivora} alt="Livora" className="h-8 w-auto" />
          </Link>
          <p className="mt-10 text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>{eyebrow}</p>
          <h1 className="serif mt-3 text-[32px] font-light text-neutral-900 leading-tight">{title}</h1>
          <p className="mt-2 text-[14px] text-neutral-500 leading-relaxed">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <Link
            to="/login"
            className="group mt-8 inline-flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" /> Kembali ke halaman masuk
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function SuccessBadge({ icon }: { icon: ReactNode }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl shadow-[#C9974A]/30"
      style={{ background: GOLD }}
    >
      {icon}
    </motion.div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      await api.post("/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err: any) {
      toast.error(err?.response?.status === 429 ? "Terlalu banyak percobaan. Coba lagi dalam 1 menit." : "Gagal mengirim tautan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      eyebrow="Lupa password"
      title={sent ? "Cek email Anda" : "Atur ulang password"}
      subtitle={sent ? "Jika email terdaftar, kami telah mengirim tautan untuk membuat password baru." : "Masukkan email akun Anda, kami kirimkan tautan untuk membuat password baru."}
    >
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border border-neutral-200 bg-white p-7 text-center">
            <SuccessBadge icon={<Mail size={26} />} />
            <p className="mt-5 text-[14px] text-neutral-700">Tautan dikirim ke</p>
            <p className="mt-1 font-medium text-neutral-900 break-all">{email}</p>
            <p className="mt-4 text-[12.5px] text-neutral-500">Tautan berlaku 60 menit. Tidak ada di kotak masuk? Periksa folder spam.</p>
            <button onClick={() => setSent(false)} className="mt-5 text-[13px] font-medium hover:underline" style={{ color: GOLD }}>
              Kirim ulang / ganti email
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
            <label className="block">
              <span className="text-[12px] font-medium text-neutral-700">Email</span>
              <div className="relative mt-1.5">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input style={{ paddingLeft: 44, paddingRight: 44 }} type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className={inputCls} />
                <AnimatePresence>
                  {valid && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-4 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: GOLD }}>
                      <Check size={12} strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </label>
            <button type="submit" disabled={!valid || loading} className={btnCls}>
              {loading ? "Mengirim..." : "Kirim tautan reset"}
              {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </Shell>
  );
}

const rules = [
  { label: "Minimal 8 karakter", test: (p: string) => p.length >= 8 },
  { label: "Huruf besar & kecil", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "Mengandung angka", test: (p: string) => /\d/.test(p) },
  { label: "Mengandung simbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];
const strengthLabel = ["Sangat lemah", "Lemah", "Cukup", "Kuat", "Sangat kuat"];

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const score = useMemo(() => rules.filter((r) => r.test(password)).length, [password]);
  const matches = confirm.length > 0 && confirm === password;
  const canSubmit = password.length >= 8 && matches && !loading;

  if (!token || !email) {
    return (
      <Shell eyebrow="Tautan tidak valid" title="Tautan tidak lengkap" subtitle="Tautan reset password ini rusak atau tidak lengkap. Silakan minta tautan baru.">
        <Link to="/forgot-password" className={btnCls}>Minta tautan baru <ArrowRight size={16} /></Link>
      </Shell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.post("/reset-password", { token, email, password, password_confirmation: confirm });
      setDone(true);
      setTimeout(() => navigate("/login"), 2800);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gagal memperbarui password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      eyebrow="Password baru"
      title={done ? "Password diperbarui" : "Buat password baru"}
      subtitle={done ? "Semua sesi lama telah dikeluarkan. Mengarahkan ke halaman masuk..." : `Untuk akun ${email}`}
    >
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-neutral-200 bg-white p-7 text-center">
            <SuccessBadge icon={<ShieldCheck size={28} />} />
            <Link to="/login" className={`${btnCls} mt-6`}>Masuk sekarang <ArrowRight size={16} /></Link>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <label className="block">
              <span className="text-[12px] font-medium text-neutral-700">Password baru</span>
              <div className="relative mt-1.5">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input style={{ paddingLeft: 44, paddingRight: 44 }} type={show ? "text" : "password"} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" className={inputCls} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                    <motion.div className="h-full rounded-full" style={{ background: GOLD }} initial={false} animate={{ width: i < score ? "100%" : "0%" }} transition={{ duration: 0.35, ease }} />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-neutral-500">Kekuatan: <span className="font-medium text-neutral-800">{password ? strengthLabel[score] : "—"}</span></p>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {rules.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li key={r.label} className={`flex items-center gap-1.5 text-[11.5px] transition-colors ${ok ? "text-neutral-800" : "text-neutral-400"}`}>
                      <motion.span animate={{ scale: ok ? 1 : 0.8, backgroundColor: ok ? GOLD : "#e5e5e5" }} className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-white">
                        <Check size={9} strokeWidth={3} />
                      </motion.span>
                      {r.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            <label className="block">
              <span className="text-[12px] font-medium text-neutral-700">Ulangi password</span>
              <div className="relative mt-1.5">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input style={{ paddingLeft: 44, paddingRight: 44 }} type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ketik ulang password" className={inputCls} />
                {confirm && (
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium ${matches ? "" : "text-red-500"}`} style={matches ? { color: GOLD } : undefined}>
                    {matches ? "Cocok" : "Belum cocok"}
                  </span>
                )}
              </div>
            </label>

            <button type="submit" disabled={!canSubmit} className={btnCls}>
              {loading ? "Menyimpan..." : "Simpan password baru"}
              {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </Shell>
  );
}
