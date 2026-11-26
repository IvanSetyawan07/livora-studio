import { createContext, useContext, type ReactNode } from "react";
import { api, authStorage } from "@/lib/api";

export type PermissionLevel = "none" | "view" | "edit";

export type AdminBootstrapData = {
  tokenKey: string;
  user: any;
  perm: {
    role: string;
    is_owner?: boolean;
    permissions: Record<string, string>;
  };
  fetchedAt: number;
};

let cachedBootstrap: AdminBootstrapData | null = null;
let inflightBootstrap: Promise<AdminBootstrapData> | null = null;
const BOOTSTRAP_TTL_MS = 2 * 60 * 1000;

function currentTokenKey(): string {
  return authStorage.getToken() || "__session__";
}

export function getCachedAdminBootstrap(): AdminBootstrapData | null {
  if (!cachedBootstrap) return null;
  if (cachedBootstrap.tokenKey !== currentTokenKey()) {
    cachedBootstrap = null;
    return null;
  }
  return cachedBootstrap;
}

export function clearAdminBootstrapCache(): void {
  cachedBootstrap = null;
  inflightBootstrap = null;
}

/**
 * Memuat `/me` secara cepat, memvalidasi role admin, lalu mengambil `/admin/my-permissions`
 * secara paralel dalam satu gelombang request dan menyimpannya di memori sesi agar
 * perpindahan antar halaman `/admin/*` dan `/admin/ai-marketing/*` berlangsung instan (0ms).
 */
export async function fetchAdminBootstrap(force = false): Promise<AdminBootstrapData> {
  const tokenKey = currentTokenKey();
  if (!force && cachedBootstrap && cachedBootstrap.tokenKey === tokenKey) {
    if (Date.now() - cachedBootstrap.fetchedAt < BOOTSTRAP_TTL_MS) {
      return cachedBootstrap;
    }
  }
  if (!force && inflightBootstrap) {
    return inflightBootstrap;
  }

  inflightBootstrap = (async () => {
    const [meRes, permRes] = await Promise.all([
      api.get("/me"),
      api.get("/admin/my-permissions").catch((err) => ({ __permErr: err } as any)),
    ]);

    const me = meRes.data;
    if (me?.role !== "admin") {
      clearAdminBootstrapCache();
      const forbidden: any = new Error("Bukan akun admin");
      forbidden.code = "NOT_ADMIN";
      forbidden.userRole = me?.role;
      throw forbidden;
    }

    if (permRes && "__permErr" in permRes) {
      throw permRes.__permErr;
    }

    const next: AdminBootstrapData = {
      tokenKey,
      user: me,
      perm: permRes.data ?? { role: me?.admin_role ?? "viewer", permissions: {} },
      fetchedAt: Date.now(),
    };
    cachedBootstrap = next;
    return next;
  })();

  try {
    return await inflightBootstrap;
  } finally {
    inflightBootstrap = null;
  }
}

export type AdminPermissionValue = {
  user: { id?: number; name?: string; email?: string; role?: string; admin_role?: string } | null;
  role: string;
  isOwner: boolean;
  permissions: Record<string, string>;
  levelOf: (feature?: string) => PermissionLevel;
  canView: (feature?: string) => boolean;
  canEdit: (feature?: string) => boolean;
  currentLevel: PermissionLevel;
};

const defaultValue: AdminPermissionValue = {
  user: null,
  role: "viewer",
  isOwner: false,
  permissions: {},
  levelOf: () => "none",
  canView: () => false,
  canEdit: () => false,
  currentLevel: "none",
};

const AdminPermissionContext = createContext<AdminPermissionValue>(defaultValue);

export function AdminPermissionProvider({
  value,
  children,
}: {
  value: AdminPermissionValue;
  children: ReactNode;
}) {
  return <AdminPermissionContext.Provider value={value}>{children}</AdminPermissionContext.Provider>;
}

export function useAdminPermission(): AdminPermissionValue {
  return useContext(AdminPermissionContext);
}
