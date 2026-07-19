import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Search,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Shield,
  Calendar,
  Activity,
  X,
  Info,
  LogIn,
  LogOut,
  Eye,
} from "lucide-react";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: string;
  provider: string | null;
  avatar_url: string | null;
  login_count: number;
  last_login_at: string | null;
  last_seen_at: string | null;
  last_ip: string | null;
  created_at: string;
};

type UserActivityRow = {
  id: number;
  type: string;
  path: string | null;
  ip: string | null;
  user_agent: string | null;
  meta: any;
  created_at: string;
};

const fmt = (v?: string | null) => {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return v;
  }
};

const activityIcon = (type: string) => {
  if (type === "login") return <LogIn className="w-3.5 h-3.5" />;
  if (type === "logout") return <LogOut className="w-3.5 h-3.5" />;
  if (type === "register") return <UserIcon className="w-3.5 h-3.5" />;
  return <Eye className="w-3.5 h-3.5" />;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [activities, setActivities] = useState<UserActivityRow[]>([]);
  const [actLoading, setActLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/users");
        setUsers(data);
      } catch {
        toast.error("Gagal memuat data user");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
    );
  }, [search, users]);

  const openDetails = async (u: AdminUser) => {
    setSelected(u);
    setActivities([]);
    setActLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${u.id}/activities`, {
        params: { limit: 100 },
      });
      setActivities(data);
    } catch {
      toast.error("Gagal memuat aktivitas user");
    } finally {
      setActLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Admin
          </p>
          <h1 className="serif text-4xl">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} akun terdaftar
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, no HP..."
            className="pl-9 pr-3 h-10 w-72 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Kontak</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Login</th>
                <th className="px-4 py-3 font-medium">Terakhir</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">
                    Memuat...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">
                    Tidak ada user.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-foreground/5 flex items-center justify-center overflow-hidden shrink-0">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium leading-tight">{u.name}</p>
                          <p className="text-xs text-muted-foreground">#{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.phone || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-foreground text-background"
                            : "bg-muted text-foreground/80"
                        }`}
                      >
                        <Shield className="w-3 h-3" /> {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize text-muted-foreground">
                        {u.provider ?? "email"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">{u.login_count}x</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {fmt(u.last_login_at ?? u.last_seen_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetails(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border hover:bg-muted text-xs font-medium"
                      >
                        <Info className="w-3.5 h-3.5" /> Rincian
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Details Drawer ─────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-end"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl h-full bg-background overflow-y-auto shadow-2xl animate-in slide-in-from-right"
          >
            <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Rincian User
                </p>
                <h2 className="serif text-2xl">{selected.name}</h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile */}
              <section>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
                  Profil
                </p>
                <div className="space-y-3">
                  <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Nama lengkap" value={selected.name} />
                  <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={selected.email} />
                  <DetailRow icon={<Phone className="w-4 h-4" />} label="Nomor HP" value={selected.phone ?? "—"} />
                  <DetailRow icon={<MapPin className="w-4 h-4" />} label="Alamat" value={selected.address ?? "—"} />
                  <DetailRow icon={<Shield className="w-4 h-4" />} label="Role" value={selected.role} />
                  <DetailRow
                    icon={<Shield className="w-4 h-4" />}
                    label="Provider"
                    value={selected.provider ?? "email/password"}
                  />
                </div>
              </section>

              {/* Stats */}
              <section>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
                  Aktivitas Ringkas
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Total Login" value={`${selected.login_count}x`} />
                  <Stat label="Last Login" value={fmt(selected.last_login_at)} small />
                  <Stat label="Last Seen" value={fmt(selected.last_seen_at)} small />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Stat label="Last IP" value={selected.last_ip ?? "—"} small />
                  <Stat label="Terdaftar" value={fmt(selected.created_at)} small />
                </div>
              </section>

              {/* Activity log */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    Riwayat Aktivitas
                  </p>
                </div>
                {actLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat...</p>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
                ) : (
                  <ul className="space-y-2">
                    {activities.map((a) => (
                      <li
                        key={a.id}
                        className="border border-border rounded-md px-3 py-2 bg-card"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize">
                            {activityIcon(a.type)} {a.type.replace("_", " ")}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {fmt(a.created_at)}
                          </span>
                        </div>
                        {(a.path || a.ip) && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {a.path && <span>{a.path}</span>}
                            {a.path && a.ip && <span> · </span>}
                            {a.ip && <span>IP {a.ip}</span>}
                          </div>
                        )}
                        {a.meta && Object.keys(a.meta).length > 0 && (
                          <div className="mt-1 text-[11px] text-muted-foreground font-mono truncate">
                            {JSON.stringify(a.meta)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-sm break-words">{value}</p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="border border-border rounded-md px-3 py-2 bg-card">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={small ? "text-xs mt-1" : "text-lg font-medium mt-0.5"}>
        {value}
      </p>
    </div>
  );
}
