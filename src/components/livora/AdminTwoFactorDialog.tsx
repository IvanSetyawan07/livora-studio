import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const ADMIN_DEVICE_KEY = "livora_admin_device";

export type TwoFactorChallenge = { challenge: string; email_masked: string };

type Props = {
  challenge: TwoFactorChallenge;
  onSuccess: (data: { token: string; user: any }) => void;
  onCancel: () => void;
};

/** Langkah kedua login admin: kode 6 angka yang dikirim ke email. */
export default function AdminTwoFactorDialog({ challenge, onSuccess, onCancel }: Props) {
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(45);
  const [masked, setMasked] = useState(challenge.email_masked);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (value = code) => {
    if (value.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/login/2fa", { challenge: challenge.challenge, code: value, remember });
      if (data.device_token) localStorage.setItem(ADMIN_DEVICE_KEY, data.device_token);
      onSuccess(data);
    } catch (e: any) {
      const res = e?.response?.data;
      if (res?.code === "expired" || res?.code === "locked") {
        toast.error(res.message);
        onCancel();
        return;
      }
      setError(res?.message || "Verifikasi gagal. Coba lagi.");
      setCode("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const { data } = await api.post("/login/2fa/resend", { challenge: challenge.challenge });
      if (data.email_masked) setMasked(data.email_masked);
      toast.success("Kode baru telah dikirim");
      setCooldown(45);
    } catch (e: any) {
      const res = e?.response?.data;
      if (res?.code === "expired") {
        toast.error(res.message);
        onCancel();
        return;
      }
      toast.error(res?.message || "Gagal mengirim ulang kode");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-2fa-title"
      style={{ fontFamily: "'Work Sans', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C9974A]/10 text-[#C9974A]">
          <ShieldCheck size={20} />
        </div>
        <h3 id="admin-2fa-title" className="mt-3 text-[17px] font-medium text-neutral-900">Verifikasi admin</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
          Kami mengirim kode 6 angka ke <span className="font-medium text-neutral-700">{masked}</span>. Kode berlaku 10 menit.
        </p>

        <input
          ref={inputRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          aria-label="Kode verifikasi"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
            setError(null);
            if (v.length === 6) submit(v);
          }}
          className={`mt-4 h-12 w-full rounded-lg border text-center text-[22px] tracking-[0.5em] text-neutral-900 outline-none transition focus:border-[#C9974A] ${
            error ? "border-red-400" : "border-neutral-200"
          }`}
          placeholder="••••••"
        />
        {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}

        <button
          type="button"
          onClick={() => setRemember(!remember)}
          className="mt-4 flex items-center gap-2 text-left text-[12.5px] text-neutral-600"
        >
          <span
            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
              remember ? "border-[#C9974A] bg-[#C9974A]" : "border-neutral-300 bg-white"
            }`}
          >
            {remember && <Check size={10} className="text-white" strokeWidth={3} />}
          </span>
          Ingat perangkat ini selama 30 hari
        </button>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-11 flex-1 rounded-lg border border-neutral-200 bg-white text-[14px] font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => submit()}
            disabled={loading || code.length !== 6}
            className="h-11 flex-1 rounded-lg bg-[#C9974A] text-[14px] font-medium text-white hover:bg-[#b88639] transition disabled:opacity-50"
          >
            {loading ? "Memeriksa..." : "Verifikasi"}
          </button>
        </div>

        <p className="mt-4 text-center text-[12px] text-neutral-500">
          Tidak menerima kode?{" "}
          {cooldown > 0 ? (
            <span>Kirim ulang dalam {cooldown} dtk</span>
          ) : (
            <button type="button" onClick={resend} className="font-medium text-[#C9974A] hover:underline">
              Kirim ulang
            </button>
          )}
        </p>
      </div>
    </div>,
    document.body,
  );
}
