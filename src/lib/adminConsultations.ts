import { api } from "@/lib/api";
import type { Consultation } from "@/lib/consultations";

export type UpdateConsultationPayload = Partial<{
  status: string;
  admin_notes: string;
  assigned_admin_id: number | null;
  contact_method: string;
  meeting_date: string;
  meeting_time: string;
  meeting_location: string;
  meeting_link: string;
  follow_up_date: string;
}>;

export const getAdminConsultations = () =>
  api.get<Consultation[]>("/admin/consultations").then((res) => res.data);

export const getAdminConsultation = (id: number) =>
  api.get<Consultation>(`/admin/consultations/${id}`).then((res) => res.data);

export const updateAdminConsultation = (id: number, payload: UpdateConsultationPayload) =>
  api.put<Consultation>(`/admin/consultations/${id}`, payload).then((res) => res.data);

export const deleteAdminConsultation = (id: number) =>
  api.delete(`/admin/consultations/${id}`);