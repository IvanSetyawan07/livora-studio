import { api } from "@/lib/api";

export type SupportSender = "user" | "bot" | "admin" | "system";
export type SupportStatus = "bot" | "pending_cs" | "active" | "closed";

export interface SupportMessage {
  id: number;
  sender: SupportSender;
  text: string;
  meta?: Record<string, any> | null;
  created_at?: string;
}

export interface SupportSessionInfo {
  id: number;
  status: SupportStatus;
  admin_name?: string | null;
  requested_at?: string | null;
  accepted_at?: string | null;
}

const VISITOR_KEY = "livora_support_visitor_id";
const ACTIVITY_KEY = "livora_support_last_activity";
const AUTH_KEY = "livora_support_auth_fingerprint";

/** Chat direset otomatis setelah 10 menit tanpa interaksi. */
export const IDLE_RESET_MS = 10 * 60 * 1000;

const newId = () =>
  (crypto.randomUUID?.() ?? `v-${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 60);

export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = newId();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

/** Catat interaksi terakhir user (dipakai untuk idle reset). */
export function touchActivity() {
  localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

/** Buang sesi lama (cache visitor) dan mulai identitas chat baru. */
export function resetVisitor(): string {
  const id = newId();
  localStorage.setItem(VISITOR_KEY, id);
  touchActivity();
  return id;
}

/** True kalau idle > 10 menit ATAU status login berubah (login/logout/ganti akun). */
export function shouldResetSession(): boolean {
  const token = localStorage.getItem("token") ?? "";
  const fingerprint = token ? token.slice(-24) : "guest";
  const prev = localStorage.getItem(AUTH_KEY);
  if (prev !== fingerprint) {
    localStorage.setItem(AUTH_KEY, fingerprint);
    if (prev !== null) return true;
  }
  const last = Number(localStorage.getItem(ACTIVITY_KEY) ?? 0);
  return last > 0 && Date.now() - last > IDLE_RESET_MS;
}


export async function openSession(): Promise<{ session: SupportSessionInfo; messages: SupportMessage[] }> {
  const { data } = await api.post("/support/session", { visitor_id: getVisitorId() });
  return data;
}

export async function fetchMessages(sessionId: number, since = 0) {
  const { data } = await api.get(`/support/sessions/${sessionId}/messages`, {
    params: { visitor_id: getVisitorId(), since },
  });
  return data as { session: SupportSessionInfo; messages: SupportMessage[] };
}

export async function sendMessage(
  sessionId: number,
  text: string,
  ctx?: { item_slug?: string; item_name?: string },
) {
  const { data } = await api.post(`/support/sessions/${sessionId}/messages`, {
    visitor_id: getVisitorId(),
    text,
    ...ctx,
  });
  return data as { session: SupportSessionInfo; messages: SupportMessage[] };
}

export async function requestCs(sessionId: number, payload?: { name?: string; email?: string; reason?: string }) {
  const { data } = await api.post(`/support/sessions/${sessionId}/request-cs`, {
    visitor_id: getVisitorId(),
    ...payload,
  });
  return data as { session: SupportSessionInfo; messages: SupportMessage[] };
}

/** Dipakai halaman lain (mis. ItemDetail) untuk membuka chat dengan konteks produk. */
export type AskBotDetail = { text: string; item_slug?: string; item_name?: string };

export function askConcierge(detail: AskBotDetail) {
  window.dispatchEvent(new CustomEvent<AskBotDetail>("livora:ask-concierge", { detail }));
}
