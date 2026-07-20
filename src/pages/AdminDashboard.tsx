import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, authStorage } from "@/lib/api";

type User = { id: number; name: string; email: string; role: string };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me");
        if (data?.role !== "admin") {
          alert("Akses ditolak. Halaman ini khusus admin.");
          navigate("/");
          return;
        }
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
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    
    <div className="min-h-screen bg-background p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Admin Panel
            </p>
            <h1 className="serif text-4xl">Dashboard Admin</h1>
          </div>
          <button
            onClick={logout}
            className="bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]"
          >
            Logout
          </button>
        </div>
<div
  onClick={() => navigate("/admin/consultations")}
  className="bg-card border border-border rounded-lg p-6 cursor-pointer hover:border-foreground/40 transition-colors"
>
  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Manage</p>
  <h3 className="serif text-xl">Consultations</h3>
</div>
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg mb-2">Selamat datang, {user?.name ?? "..."}</h2>
          <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
          <p className="text-sm text-muted-foreground">Role: {user?.role}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Manage
            </p>
            <h3 className="serif text-xl">Projects</h3>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Manage
            </p>
            <h3 className="serif text-xl">Furniture</h3>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Manage
            </p>
            <h3 className="serif text-xl">Users</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
