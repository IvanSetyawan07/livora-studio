import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  PageHeader,
  AdminHelpBanner,
  ErrorState,
  TableSkeleton,
  StatusBadge,
  useAdminDialog,
} from "@/components/admin/kit";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  cs: "Customer Service",
  finance: "Keuangan",
  production: "Produksi",
};
const EDITABLE = ["cs", "finance", "production"];
const LEVELS = [
  { v: "none", l: "Tidak ada akses" },
  { v: "view", l: "Lihat saja" },
  { v: "edit", l: "Lihat & ubah" },
];

type AdminRow = { id: number; name: string; email: string; admin_role: string | null };
type RolesPayload = {
  features: Record<string, string>;
  matrix: Record<string, Record<string, string>>;
  admins: AdminRow[];
};

const errMsg = (e: any) => e?.response?.data?.message ?? e?.message ?? "Terjadi kesalahan";

export default function AdminRoles() {
  const dialog = useAdminDialog();
  const [data, setData] = useState<RolesPayload | null>(null);
  const [savedMatrix, setSavedMatrix] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<RolesPayload>("/admin/roles");
      setData(r.data);
      setSavedMatrix(JSON.stringify(r.data.matrix ?? {}));
    } catch (e) {
      const msg = errMsg(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = data ? JSON.stringify(data.matrix ?? {}) !== savedMatrix : false;

  const setLevel = (role: string, feature: string, value: string) =>
    setData(
      (d) =>
        d && {
          ...d,
          matrix: {
            ...d.matrix,
            [role]: { ...d.matrix[role], [feature]: value },
          },
        },
    );

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const { data: r } = await api.post("/admin/roles/permissions", { matrix: data.matrix });
      setData((d) => d && { ...d, matrix: r.matrix });
      setSavedMatrix(JSON.stringify(r.matrix ?? {}));
      toast.success("Perubahan hak akses berhasil disimpan.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (a: AdminRow, nextRole: string) => {
    const currentRole = a.admin_role ?? "owner";
    if (nextRole === currentRole) return;

    const ok = await dialog.confirm({
      title: `Ubah Peran ${a.name}?`,
      description: `Peran ${a.name} (${a.email}) akan diubah dari ${ROLE_LABEL[currentRole] ?? currentRole} menjadi ${ROLE_LABEL[nextRole] ?? nextRole}.`,
      confirmText: "Ya, Ubah Peran",
      cancelText: "Batal",
    });
    if (!ok) return;

    try {
      await api.post(`/admin/shop/admins/${a.id}/role`, { admin_role: nextRole });
      setData(
        (d) =>
          d && {
            ...d,
            admins: d.admins.map((x) => (x.id === a.id ? { ...x, admin_role: nextRole } : x)),
          },
      );
      toast.success(`${a.name} sekarang berperan sebagai ${ROLE_LABEL[nextRole] ?? nextRole}.`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khusus Owner"
        title="Peran & Hak Akses Tim"
        description="Atur siapa yang menjadi CS, Keuangan, atau Produksi, serta menu apa saja yang boleh dibuka atau diubah."
        actions={
          <Link
            to="/admin/users"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE4DA] bg-white px-3.5 text-xs font-medium text-[#232528] hover:border-[#5E93B8] hover:bg-[#EDF4F8]/50"
          >
            Angkat Admin dari Daftar Pengguna <ArrowUpRight className="h-3.5 w-3.5 text-[#5E93B8]" />
          </Link>
        }
      />

      <AdminHelpBanner title="Cara Kerja Hak Akses" storageKey="admin-roles-help">
        <b>Owner</b> selalu memiliki akses penuh ke semua fitur. Untuk menambahkan anggota tim admin baru, buka{" "}
        <Link to="/admin/users" className="font-medium text-[#35678B] underline">
          Daftar Pengguna
        </Link>{" "}
        dan ubah jenis akunnya menjadi <b>Tim Admin</b>.
      </AdminHelpBanner>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading || !data ? (
        <TableSkeleton rows={6} cols={4} />
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-header text-lg text-[#232528]">Peran Setiap Anggota Admin</h2>
              <span className="text-xs text-[#656B73]">{data.admins.length} anggota tim</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#EAE4DA] bg-white shadow-sm">
              {data.admins.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE4DA]/80 px-4 py-3.5 first:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-[#232528]">{a.name}</p>
                      {(a.admin_role ?? "owner") === "owner" && (
                        <StatusBadge tone="info">
                          <ShieldCheck className="mr-1 h-3 w-3" /> Akses Penuh
                        </StatusBadge>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#656B73]">{a.email}</p>
                  </div>
                  <select
                    aria-label={`Peran ${a.name}`}
                    value={a.admin_role ?? "owner"}
                    onChange={(e) => changeRole(a, e.target.value)}
                    className="h-9 rounded-lg border border-[#EAE4DA] bg-[#FAF8F4] px-3 text-sm text-[#232528] focus:border-[#5E93B8] focus:outline-none"
                  >
                    {Object.entries(ROLE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-header text-lg text-[#232528]">Hak Akses Menu per Peran</h2>
                <p className="text-xs text-[#656B73]">
                  Sesuaikan batasan menu untuk CS, Keuangan, dan Produksi lalu klik Simpan Perubahan.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {dirty && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    Ada perubahan belum disimpan
                  </span>
                )}
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !dirty}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#232528] px-4 text-xs font-medium text-white transition-opacity disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#EAE4DA] bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-[#FAF8F4] text-left text-[11px] font-medium uppercase tracking-wider text-[#656B73]">
                  <tr>
                    <th className="p-3.5">Menu / Fitur</th>
                    {EDITABLE.map((r) => (
                      <th key={r} className="p-3.5">
                        {ROLE_LABEL[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.features).map(([f, label]) => (
                    <tr key={f} className="border-t border-[#EAE4DA]/80 hover:bg-[#FAF8F4]/50">
                      <td className="p-3.5 font-medium text-[#232528]">{label}</td>
                      {EDITABLE.map((r) => {
                        const val = data.matrix[r]?.[f] ?? "none";
                        return (
                          <td key={r} className="p-2.5">
                            <select
                              aria-label={`${label} untuk ${ROLE_LABEL[r]}`}
                              value={val}
                              onChange={(e) => setLevel(r, f, e.target.value)}
                              className={`h-9 w-full rounded-lg border px-2.5 text-sm focus:border-[#5E93B8] focus:outline-none ${
                                val === "edit"
                                  ? "border-[#5E93B8]/40 bg-[#EDF4F8]/70 text-[#232528]"
                                  : val === "view"
                                    ? "border-[#EAE4DA] bg-white text-[#232528]"
                                    : "border-[#EAE4DA] bg-[#FAF8F4] text-[#656B73]"
                              }`}
                            >
                              {LEVELS.map((l) => (
                                <option key={l.v} value={l.v}>
                                  {l.l}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
