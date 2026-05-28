import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, authStorage } from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/login", { email, password });
      authStorage.setToken(data.token);

      // Ambil role terbaru dari /me biar pasti akurat
      const me = await api.get("/me");
      const user = me.data;
      localStorage.setItem("user", JSON.stringify(user));

      console.log("Logged in user:", user);

      if (user?.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.log("Login error:", err?.response?.data ?? err);
      alert("Email atau password salah");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-card border border-border rounded-lg p-8 space-y-5"
      >
        <h1 className="serif text-2xl text-center tracking-wide">Login</h1>
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border bg-background rounded px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-foreground text-background py-2 rounded text-sm uppercase tracking-[0.2em] disabled:opacity-60"
        >
          {loading ? "Loading..." : "Login"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Belum punya akun?{" "}
          <Link to="/register" className="underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}