import { api } from "@/lib/api";
import type { SupportMessage, SupportStatus } from "@/lib/supportChat";

export interface AdminSupportSession {
  id: number;
  status: SupportStatus;
  name: string | null;
  email: string | null;
  user_id: number | null;
  visitor_number: number | null;
  display_name: string;
  admin_name: string | null;
  request_reason: string | null;
  requested_at: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_admin: number;
}
export async function rejectSupportSession(sessionId: number) {
  const {data} = await api.post(`/admin/support/sessions/${sessionId}/reject`);
  return data;
}

export async function deleteSupportSession(sessionId: number) {
  const {data} = await api.delete(`/admin/support/sessions/${sessionId}`);
  return data;
}
export async function getSupportSessions(status = "all") {
  const { data } = await api.get("/admin/support/sessions", { params: { status } });
  return data as { sessions: AdminSupportSession[]; pending: number };
}

export async function getSupportMessages(sessionId: number, since = 0) {
  const { data } = await api.get(`/admin/support/sessions/${sessionId}/messages`, { params: { since } });
  return data as { session: any; messages: SupportMessage[] };
}

export async function acceptSupportSession(sessionId: number) {
  const { data } = await api.post(`/admin/support/sessions/${sessionId}/accept`);
  return data;
}

export async function replySupportSession(sessionId: number, text: string) {
  const { data } = await api.post(`/admin/support/sessions/${sessionId}/messages`, { text });
  return data as SupportMessage;
}

export async function closeSupportSession(sessionId: number) {
  const { data } = await api.post(`/admin/support/sessions/${sessionId}/close`);
  return data;
}
