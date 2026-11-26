import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
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
  MessageCircle,
  Loader2,
  UserCog,
} from "lucide-react";
import {
  PageHeader,
  AdminHelpBanner,
  DebouncedSearchInput,
  EmptyState,
  ErrorState,
  TableSkeleton,
  StatusBadge,
  useAdminDialog,
} from "@/components/admin/kit";
import { useAdminPermission } from "@/components/admin/AdminPermissionContext";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: string;
  admin_role?: string | null;
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

type RoleFilter = "all" | "user" | "admin";

const ADMIN_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  cs: "Customer Service",
  finance: "Keuangan",
  production: "Produksi",
};

const ACTIVITY_LABELS: Record<string, string> = {
  login: "Masuk ke akun",
  logout: "Keluar dari akun",
  register: "Mendaftar akun baru",
  page_view: "Membuka halaman",
  wishlist_add: "Menyimpan ke wishlist",
  consultation_create: "Mengajukan konsultasi",
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

const toWaPhone = (phone?: string | null) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
};

const providerLabel = (p?: string | null) => {
  if (!p) return "Email & Kata Sandi";
  if (p.toLowerCase() === "google") return "Akun Google";
  return p;
};

const activityIcon = (type: string) => {
  if (type === "login") return <LogIn className="w-3.5 h-3.5 text-[#5E93B8]" />;
  if (type === "logout") return <LogOut className="w-3.5 h-3.5 text-[#656B73]" />;
  if (type === "register") return <UserIcon className="w-3.5 h-3.5 text-emerald-600" />;
  return <Eye className="w-3.5 h-3.5 text-[#656B73]" />;
};

export default function AdminUsers() {
  const { isOwner, user: currentUser } = useAdminPermission();
  const dialog = useAdminDialog();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [activities, setActivities] = useState<UserActivityRow[]>([]);
  const [actLoading, setActLoading] = useState(false);

  // Owner role management state inside drawer
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [editAdminRole, setEditAdminRole] = useState<"owner" | "cs" | "finance" | "production">("cs");
  const [savingRole, setSavingRole] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Gagal memuat data pengguna";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const counts = useMemo(() => {
    const admins = users.filter((u) => u.role === "admin").length;
    return {
      all: users.length,
      user: users.length - admins,
      admin: admins,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter === "admin" && u.role !== "admin") return false;
      if (roleFilter === "user" && u.role === "admin") return false;
      if (!q) return true;
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    });
  }, [search, users, roleFilter]);

  const openDetails = async (u: AdminUser) => {
    setSelected(u);
    setEditRole(u.role === "admin" ? "admin" : "user");
    setEditAdminRole(
      (u.admin_role && ["owner", "cs", "finance", "production"].includes(u.admin_role)
        ? u.admin_role
        : u.role === "admin"
          ? "owner"
          : "cs") as "owner" | "cs" | "finance" | "production",
    );
    setActivities([]);
    setActLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${u.id}/activities`, {
        params: { limit: 100 },
      });
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal memuat riwayat aktivitas pengguna");
    } finally {
      setActLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!selected || !isOwner) return;
    const isSelf = currentUser?.id === selected.id;
    if (isSelf) {
      toast.error("Anda tidak dapat mengubah akses akun Anda sendiri.");
      return;
    }

    const roleSummary =
      editRole === "admin"
        ? `Tim Admin (${ADMIN_ROLE_LABELS[editAdminRole] ?? editAdminRole})`
        : "Pelanggan Biasa (mencabut akses panel admin)";

    const ok = await dialog.confirm({
      title: `Ubah Akses ${selected.name}?`,
      description: `Akun ${selected.email} akan diubah menjadi ${roleSummary}. Perubahan berlaku langsung.`,
      confirmText: "Ya, Ubah Akses",
      cancelText: "Batal",
      tone: editRole === "user" ? "danger" : "default",
    });
    if (!ok) return;

    setSavingRole(true);
    try {
      const payload =
        editRole === "admin"
          ? { role: "admin", admin_role: editAdminRole }
          : { role: "user", admin_role: null };
      const { data } = await api.patch(`/admin/users/${selected.id}/role`, payload);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selected.id
            ? { ...u, role: data.role, admin_role: data.admin_role }
            : u,
        ),
      );
      setSelected((cur) =>
        cur && cur.id === selected.id
          ? { ...cur, role: data.role, admin_role: data.admin_role }
          : cur,
      );
      toast.success(`Akses ${selected.name} berhasil diperbarui.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal memperbarui akses pengguna");
    } finally {
      setSavingRole(false);
    }
  };

  const roleChanged =
    selected &&
    (editRole !== (selected.role === "admin" ? "admin" : "user") ||
      (editRole === "admin" && editAdminRole !== (selected.admin_role ?? "owner")));

  return (
    <div>
      <PageHeader
        eyebrow="Pelanggan & Tim"
        title="Daftar Pengguna"
        description={`${counts.all} akun terdaftar (${counts.user} pelanggan · ${counts.admin} tim admin).`}
      />

      <AdminHelpBanner title="Panduan Singkat" storageKey="admin-users-help">
        Klik <b>Lihat Rincian</b> untuk melihat kontak, riwayat kunjungan, atau menghubungi pelanggan lewat Email & WhatsApp.
        {isOwner
          ? " Sebagai Owner, Anda juga dapat mengangkat pelanggan menjadi Tim Admin atau mencabut akses admin dari panel rincian."
          : ""}
      </AdminHelpBanner>

      {/* Filter & Search Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[#EAE4DA] bg-white p-1">
          {(
            [
              ["all", `Semua (${counts.all})`],
              ["user", `Pelanggan (${counts.user})`],
              ["admin", `Tim Admin (${counts.admin})`],
            ] as [RoleFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRoleFilter(key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === key
                  ? "bg-[#232528] text-white"
                  : "text-[#656B73] hover:text-[#232528]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <DebouncedSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari nama, email, atau nomor HP..."
          className="w-full sm:w-80"
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadUsers} />
      ) : loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserIcon}
          title="Tidak ada pengguna yang cocok"
          description="Coba ubah kata kunci pencarian atau pilih tab filter lain."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#EAE4DA] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EAE4DA] bg-[#FAF8F4] text-left text-[11px] font-medium uppercase tracking-wider text-[#656B73]">
                  <th className="px-4 py-3">Nama Pengguna</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3">Status Akun</th>
                  <th className="px-4 py-3">Cara Masuk</th>
                  <th className="px-4 py-3">Aktivitas</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const wa = toWaPhone(u.phone);
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-[#EAE4DA]/80 last:border-0 transition-colors hover:bg-[#FAF8F4]/70"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EDF4F8] text-[#35678B]">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <UserIcon className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#232528]">{u.name || "Tanpa Nama"}</p>
                            <p className="text-[11px] text-[#656B73]">Terdaftar {fmt(u.created_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5 text-xs">
                          <a
                            href={`mailto:${u.email}`}
                            className="inline-flex items-center gap-1 text-[#232528] hover:text-[#35678B] hover:underline"
                          >
                            <Mail className="h-3 w-3 text-[#656B73]" />
                            {u.email}
                          </a>
                          <div>
                            {wa ? (
                              <a
                                href={`https://wa.me/${wa}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                              >
                                <MessageCircle className="h-3 w-3" />
                                {u.phone}
                              </a>
                            ) : (
                              <span className="text-[#9AA0A6]">Belum ada nomor HP</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === "admin" ? (
                          <StatusBadge tone="info">
                            <Shield className="mr-1 h-3 w-3" />
                            {ADMIN_ROLE_LABELS[u.admin_role ?? "owner"] ?? "Admin"}
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">Pelanggan</StatusBadge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#656B73]">{providerLabel(u.provider)}</td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium text-[#232528]">{u.login_count}x masuk</p>
                        <p className="text-[11px] text-[#656B73]">
                          Terakhir: {fmt(u.last_login_at ?? u.last_seen_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDetails(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3 py-1.5 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
                        >
                          <Info className="h-3.5 w-3.5 text-[#5E93B8]" /> Lihat Rincian
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Drawer Rincian Pengguna ─────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-xl overflow-y-auto bg-[#FAF8F4] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EAE4DA] bg-white px-6 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#5E93B8]">
                  Rincian Pengguna
                </p>
                <h2 className="font-header text-xl text-[#232528]">{selected.name}</h2>
              </div>
              <button
                type="button"
                aria-label="Tutup panel rincian"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-[#656B73] hover:bg-[#FAF8F4] hover:text-[#232528]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Profil & Kontak Langsung */}
              <section className="rounded-xl border border-[#EAE4DA] bg-white p-5">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#656B73]">
                  Informasi Kontak
                </p>
                <div className="space-y-3">
                  <DetailRow icon={<UserIcon className="h-4 w-4" />} label="Nama Lengkap" value={selected.name} />
                  <DetailRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={
                      <a href={`mailto:${selected.email}`} className="text-[#35678B] hover:underline">
                        {selected.email}
                      </a>
                    }
                  />
                  <DetailRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Nomor HP / WhatsApp"
                    value={
                      toWaPhone(selected.phone) ? (
                        <a
                          href={`https://wa.me/${toWaPhone(selected.phone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {selected.phone} (Buka WhatsApp)
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailRow icon={<MapPin className="h-4 w-4" />} label="Alamat" value={selected.address ?? "—"} />
                  <DetailRow
                    icon={<Shield className="h-4 w-4" />}
                    label="Cara Masuk"
                    value={providerLabel(selected.provider)}
                  />
                </div>
              </section>

              {/* Kelola Akses Admin (Khusus Owner) */}
              {isOwner && (
                <section className="rounded-xl border border-[#5E93B8]/30 bg-[#EDF4F8]/50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-[#35678B]" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#35678B]">
                      Kelola Akses Admin (Owner)
                    </p>
                  </div>
                  {currentUser?.id === selected.id ? (
                    <p className="text-xs text-[#656B73]">
                      Ini adalah akun Owner yang sedang Anda gunakan. Akses akun sendiri tidak dapat diturunkan.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-medium text-[#232528]">
                          Jenis Akun
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as "user" | "admin")}
                            className="mt-1 h-9 w-full rounded-lg border border-[#EAE4DA] bg-white px-2.5 text-sm text-[#232528]"
                          >
                            <option value="user">Pelanggan Biasa</option>
                            <option value="admin">Tim Admin Livora</option>
                          </select>
                        </label>
                        {editRole === "admin" && (
                          <label className="block text-xs font-medium text-[#232528]">
                            Peran di Panel Admin
                            <select
                              value={editAdminRole}
                              onChange={(e) =>
                                setEditAdminRole(
                                  e.target.value as "owner" | "cs" | "finance" | "production",
                                )
                              }
                              className="mt-1 h-9 w-full rounded-lg border border-[#EAE4DA] bg-white px-2.5 text-sm text-[#232528]"
                            >
                              {Object.entries(ADMIN_ROLE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!roleChanged || savingRole}
                        onClick={handleSaveRole}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#232528] px-4 text-xs font-medium text-white transition-opacity disabled:opacity-40"
                      >
                        {savingRole && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Simpan Perubahan Akses
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* Ringkasan Aktivitas */}
              <section className="rounded-xl border border-[#EAE4DA] bg-white p-5">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#656B73]">
                  Ringkasan Aktivitas
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat label="Total Masuk" value={`${selected.login_count}x`} />
                  <Stat label="Terakhir Masuk" value={fmt(selected.last_login_at)} small />
                  <Stat label="Terakhir Aktif" value={fmt(selected.last_seen_at)} small />
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Stat label="Tanggal Daftar" value={fmt(selected.created_at)} small />
                  <Stat
                    label="Status Akun"
                    value={
                      selected.role === "admin"
                        ? `Admin (${ADMIN_ROLE_LABELS[selected.admin_role ?? "owner"] ?? "Admin"})`
                        : "Pelanggan"
                    }
                    small
                  />
                </div>

                {selected.last_ip && (
                  <details className="mt-3 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-2 text-xs text-[#656B73]">
                    <summary className="cursor-pointer font-medium text-[#232528]">
                      Info Teknis (untuk Tim IT)
                    </summary>
                    <p className="mt-1.5 font-mono text-[11px]">
                      ID Akun: #{selected.id} · Alamat IP terakhir: {selected.last_ip}
                    </p>
                  </details>
                )}
              </section>

              {/* Riwayat Aktivitas */}
              <section className="rounded-xl border border-[#EAE4DA] bg-white p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-[#5E93B8]" />
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#656B73]">
                    Riwayat Aktivitas Terbaru
                  </p>
                </div>
                {actLoading ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-[#656B73]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat riwayat aktivitas...
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-[#656B73]">Belum ada riwayat aktivitas tercatat.</p>
                ) : (
                  <ul className="space-y-2">
                    {activities.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-lg border border-[#EAE4DA]/80 bg-[#FAF8F4]/70 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#232528]">
                            {activityIcon(a.type)}
                            {ACTIVITY_LABELS[a.type] ?? a.type.replace(/_/g, " ")}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-[#656B73]">
                            <Calendar className="h-3 w-3" />
                            {fmt(a.created_at)}
                          </span>
                        </div>
                        {a.path && (
                          <p className="mt-1 text-[11px] text-[#656B73]">Halaman: {a.path}</p>
                        )}
                        {(a.ip || (a.meta && Object.keys(a.meta).length > 0)) && (
                          <details className="mt-1.5 text-[11px] text-[#656B73]">
                            <summary className="cursor-pointer hover:text-[#232528]">Info Teknis</summary>
                            <div className="mt-1 space-y-0.5 rounded bg-white p-2 font-mono text-[10px] break-all border border-[#EAE4DA]">
                              {a.ip && <div>IP: {a.ip}</div>}
                              {a.meta && Object.keys(a.meta).length > 0 && (
                                <div>Data: {JSON.stringify(a.meta)}</div>
                              )}
                            </div>
                          </details>
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
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-[#5E93B8]">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-[#656B73]">{label}</p>
        <div className="text-sm break-words text-[#232528]">{value}</div>
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
    <div className="rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-[#656B73]">{label}</p>
      <p className={small ? "mt-1 text-xs font-medium text-[#232528]" : "mt-0.5 text-lg font-semibold text-[#232528]"}>
        {value}
      </p>
    </div>
  );
}
