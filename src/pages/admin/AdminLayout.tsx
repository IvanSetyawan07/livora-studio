import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, authStorage } from "@/lib/api";
import {
  LayoutDashboard,
  FolderKanban,
  Sofa,
  Tags,
  Star,
  BarChart3,
  Image as ImageIcon,
  LogOut,
  BookOpen,
} from "lucide-react";

const nav = [
  { to: "/admin", end: true, label: "Overview", icon: LayoutDashboard },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/items", label: "Items / Furniture", icon: Sofa },
  { to: "/admin/collections", label: "Collections", icon: BookOpen },
  { to: "/admin/catalogs", label: "Catalogs", icon: BookOpen },
  { to: "/admin/taxonomies", label: "Taxonomies", icon: Tags },
  { to: "/admin/landing", label: "Landing Highlights", icon: Star },
  { to: "/admin/banners", label: "Theme Banners", icon: ImageIcon },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me");
        if (data?.role !== "admin") {
          alert("Akses ditolak. Khusus admin.");
          navigate("/");
          return;
        }
        setUser(data);
      } catch {
        navigate("/login");
      }
    })();
    const h = setInterval(() => api.post("/heartbeat").catch(() => {}), 30000);
    api.post("/heartbeat").catch(() => {});
    return () => clearInterval(h);
  }, [navigate]);

  const logout = async () => {
    try { await api.post("/logout"); } catch {}
    authStorage.clear();
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Livora
          </p>
          <h1 className="serif text-2xl mt-1">Admin Panel</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-foreground/80 hover:bg-muted"
                }`
              }
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <p className="text-foreground truncate">{user.name}</p>
            <p className="truncate">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-muted text-foreground/80"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}