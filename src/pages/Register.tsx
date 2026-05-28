import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, authStorage } from "@/lib/api";
import { toast } from "sonner";
export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/register", { name, email, password });
      // if (data?.token) authStorage.setToken(data.token);
      // if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Register berhasil ! Silakan login.");
      navigate("/login");
    } catch (error: any) {
      console.log("Register error:", error?.response?.data ?? error);
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
        <h1 className="serif text-2xl text-center tracking-wide">Register</h1>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-border bg-background rounded px-3 py-2 text-sm"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border bg-background rounded px-3 py-2 text-sm"
          required
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
          disabled={loading}
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
