import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, authStorage } from "@/lib/api";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "exists" | "ok">("idle");

  const handleEmailBlur = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus("idle");
      return;
    }
    setEmailStatus("checking");
    try {
      const { data } = await api.post("/check-email", { email });
      setEmailStatus(data?.exists ? "exists" : "ok");
    } catch {
      setEmailStatus("idle");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStatus === "exists") {
      toast.error("Email sudah terdaftar. Silakan login.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/register", { name, email, phone, password });
      if (data?.token) authStorage.setToken(data.token);
      toast.success("Register berhasil!");
      navigate("/profile");
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-sm bg-card border border-border rounded-lg p-8 space-y-5"
      >
        <h1 className="serif text-2xl text-center tracking-wide">Create Account</h1>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-border bg-background rounded px-3 py-2 text-sm"
          required
        />
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailStatus("idle");
            }}
            onBlur={handleEmailBlur}
            className={`w-full border rounded px-3 py-2 text-sm bg-background ${
              emailStatus === "exists" ? "border-red-500" : "border-border"
            }`}
            required
          />
          {emailStatus === "checking" && (
            <p className="text-xs text-muted-foreground mt-1">Checking email…</p>
          )}
          {emailStatus === "exists" && (
            <p className="text-xs text-red-600 mt-1">
              Email sudah terdaftar.{" "}
              <Link to="/login" className="underline font-medium">
                Login di sini
              </Link>
            </p>
          )}
          {emailStatus === "ok" && (
            <p className="text-xs text-green-600 mt-1">Email tersedia</p>
          )}
        </div>
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-border bg-background rounded px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border bg-background rounded px-3 py-2 text-sm"
          required
          minLength={6}
        />
        <button
          type="submit"
          disabled={loading || emailStatus === "exists" || emailStatus === "checking"}
          className="w-full bg-foreground text-background py-2 rounded text-sm uppercase tracking-[0.2em] disabled:opacity-60"
        >
          {loading ? "Loading..." : "Register"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Sudah punya akun?{" "}
          <Link to="/login" className="underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
