// Klien API modul C4. Semua endpoint ada di /admin/c4 (khusus owner) dan hanya
// menyentuh tabel c4_* — tidak pernah mengubah data website.
import { api } from "@/lib/api";
import type { C4Domain, C4Element, C4Graph, C4Relation, C4SyncRun } from "./types";

const base = "/admin/c4";

export interface ElementInput {
  name?: string | null;
  level?: number;
  kind?: string;
  technology?: string | null;
  description?: string | null;
  domain_key?: string | null;
  parent_key?: string | null;
  color?: string | null;
  note?: string | null;
  is_hidden?: boolean;
}
export interface RelationInput {
  from_key?: string;
  to_key?: string;
  kind?: string;
  label?: string | null;
  technology?: string | null;
  domain_key?: string | null;
  note?: string | null;
  is_hidden?: boolean;
}
export interface DomainInput {
  key?: string;
  name?: string;
  color?: string;
  description?: string | null;
  sort_order?: number | null;
}
export interface LayoutPos {
  key: string;
  x: number;
  y: number;
}

export const c4Api = {
  graph: () => api.get<C4Graph>(`${base}/graph`).then((r) => r.data),

  createElement: (d: ElementInput) => api.post<C4Element>(`${base}/elements`, d).then((r) => r.data),
  updateElement: (id: number, d: ElementInput) => api.put<C4Element>(`${base}/elements/${id}`, d).then((r) => r.data),
  deleteElement: (id: number) => api.delete<{ deleted?: boolean; hidden?: boolean; message?: string }>(`${base}/elements/${id}`).then((r) => r.data),
  resetElement: (id: number) => api.post<C4Element>(`${base}/elements/${id}/reset`).then((r) => r.data),

  createRelation: (d: RelationInput) => api.post<C4Relation>(`${base}/relations`, d).then((r) => r.data),
  updateRelation: (id: number, d: RelationInput) => api.put<C4Relation>(`${base}/relations/${id}`, d).then((r) => r.data),
  deleteRelation: (id: number) => api.delete<{ deleted?: boolean; hidden?: boolean; message?: string }>(`${base}/relations/${id}`).then((r) => r.data),
  resetRelation: (id: number) => api.post<C4Relation>(`${base}/relations/${id}/reset`).then((r) => r.data),

  createDomain: (d: DomainInput) => api.post<C4Domain>(`${base}/domains`, d).then((r) => r.data),
  updateDomain: (id: number, d: DomainInput) => api.put<C4Domain>(`${base}/domains/${id}`, d).then((r) => r.data),
  deleteDomain: (id: number) => api.delete(`${base}/domains/${id}`).then((r) => r.data),

  layouts: (viewKey: string) => api.get<{ positions?: LayoutPos[] } | LayoutPos[]>(`${base}/layouts`, { params: { view_key: viewKey } }).then((r) => (Array.isArray(r.data) ? r.data : (r.data.positions ?? []))),
  saveLayout: (viewKey: string, positions: LayoutPos[]) => api.put(`${base}/layouts`, { view_key: viewKey, positions }).then((r) => r.data),
  resetLayout: (viewKey: string) => api.delete(`${base}/layouts`, { params: { view_key: viewKey } }).then((r) => r.data),

  sync: (dryRun = false) => api.post<C4SyncRun>(`${base}/sync`, { dry_run: dryRun }).then((r) => r.data),
  syncRuns: (limit = 15) => api.get<C4SyncRun[]>(`${base}/sync-runs`, { params: { limit } }).then((r) => r.data),
  purgeStale: () => api.post<{ elements: number; relations: number }>(`${base}/purge-stale`).then((r) => r.data),
  ingestFrontend: (payload: unknown) => api.post<C4SyncRun>(`${base}/ingest/frontend`, { payload }).then((r) => r.data),
};

/** Ambil pesan error yang ramah dari respons Laravel (422/409/dll). */
export function errMessage(e: unknown): string {
  const x = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } }; message?: string };
  const errs = x.response?.data?.errors;
  if (errs) {
    const first = Object.values(errs)[0]?.[0];
    if (first) return first;
  }
  return x.response?.data?.message ?? x.message ?? "Terjadi kesalahan.";
}
