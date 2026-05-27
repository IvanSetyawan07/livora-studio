import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, authStorage } from "@/lib/api";

type User = { id: number; name: string; email: string };

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me");
        setUser(data);
      } catch {
        alert("Anda harus login terlebih dahulu");
        navigate("/login");
      }
    })();
  }, [navigate]);

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch {
      /* ignore */
    }
    authStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background p-10">
      <h1 className="serif text-3xl mb-4">Dashboard</h1>
      <h2 className="text-lg mb-6">Hello, {user?.name ?? "..."}!</h2>
      <button
        onClick={logout}
        className="bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]"
      >
        Logout
      </button>
    </div>
  );
}
