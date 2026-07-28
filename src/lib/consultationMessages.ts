import { api } from "@/lib/api";

export type ConsultationMessage = {
  id: number;
  consultation_id: number;
  sender_type: "user" | "admin" | "system";
  sender_id: number | null;
  sender?: { id: number; name: string } | null;
  body: string;
  meeting_link: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  read_at: string | null;
  created_at: string;
};

// ─── User side ──────────────────────────────────────────
export const getMyMessages = (consultationId: number, since?: number) =>
  api
    .get<ConsultationMessage[]>(`/consultations/${consultationId}/messages`, {
      params: since ? { since } : undefined,
    })
    .then((r) => r.data);

export const sendMyMessage = (
  consultationId: number,
  payload: { body?: string; attachment?: File },
) => {
  const form = new FormData();
  if (payload.body) form.append("body", payload.body);
  if (payload.attachment) form.append("attachment", payload.attachment);
  return api
    .post<ConsultationMessage>(`/consultations/${consultationId}/messages`, form)
    .then((r) => r.data);
};

export const cancelConsultation = (consultationId: number, reason?: string) =>
  api
    .post(`/consultations/${consultationId}/cancel`, reason ? { reason } : {})
    .then((r) => r.data);

export const getMyConsultationUnread = () =>
  api.get<{ unread: number }>("/my/consultations/unread").then((r) => r.data.unread);

// ─── Admin side ─────────────────────────────────────────
export const getAdminMessages = (consultationId: number, since?: number) =>
  api
    .get<ConsultationMessage[]>(`/admin/consultations/${consultationId}/messages`, {
      params: since ? { since } : undefined,
    })
    .then((r) => r.data);

export const sendAdminMessage = (
  consultationId: number,
  payload: { body?: string; meeting_link?: string; attachment?: File },
) => {
  const form = new FormData();
  if (payload.body) form.append("body", payload.body);
  if (payload.meeting_link) form.append("meeting_link", payload.meeting_link);
  if (payload.attachment) form.append("attachment", payload.attachment);
  return api
    .post<ConsultationMessage>(`/admin/consultations/${consultationId}/messages`, form)
    .then((r) => r.data);
};
