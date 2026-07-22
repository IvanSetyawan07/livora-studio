import { api } from "@/lib/api";

export type ConsultationMessage = {
  id: number;
  consultation_id: number;
  sender_type: "user" | "admin" | "system";
  sender_id: number | null;
  sender?: { id: number; name: string } | null;
  body: string;
  meeting_link: string | null;
  read_at: string | null;
  created_at: string;
};

// ─── User side ──────────────────────────────────────────
export const getMyMessages = (consultationId: number) =>
  api
    .get<ConsultationMessage[]>(`/consultations/${consultationId}/messages`)
    .then((r) => r.data);

export const sendMyMessage = (consultationId: number, body: string) =>
  api
    .post<ConsultationMessage>(`/consultations/${consultationId}/messages`, { body })
    .then((r) => r.data);

export const cancelConsultation = (consultationId: number, reason?: string) =>
  api
    .post(`/consultations/${consultationId}/cancel`, reason ? { reason } : {})
    .then((r) => r.data);

export const getMyConsultationUnread = () =>
  api.get<{ unread: number }>("/my/consultations/unread").then((r) => r.data.unread);

// ─── Admin side ─────────────────────────────────────────
export const getAdminMessages = (consultationId: number) =>
  api
    .get<ConsultationMessage[]>(`/admin/consultations/${consultationId}/messages`)
    .then((r) => r.data);

export const sendAdminMessage = (
  consultationId: number,
  payload: { body: string; meeting_link?: string },
) =>
  api
    .post<ConsultationMessage>(`/admin/consultations/${consultationId}/messages`, payload)
    .then((r) => r.data);
