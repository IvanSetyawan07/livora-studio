import { api } from "@/lib/api";
import type { Consultation } from "@/lib/consultations";
import type { WishlistEntry } from "@/lib/wishlist";

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
  note: string;
}>;

export const getAdminConsultations = () =>
  api.get<Consultation[]>("/admin/consultations").then((res) => res.data);

export const getAdminConsultation = (id: number) =>
  api.get<Consultation>(`/admin/consultations/${id}`).then((res) => res.data);

export const updateAdminConsultation = (id: number, payload: UpdateConsultationPayload) =>
  api.put<Consultation>(`/admin/consultations/${id}`, payload).then((res) => res.data);

export const deleteAdminConsultation = (id: number) =>
  api.delete(`/admin/consultations/${id}`);

export const confirmConsultationEmail = (
  id: number,
  payload: { subject?: string; message?: string } = {},
) => api.post(`/admin/consultations/${id}/confirm-email`, payload).then((r) => r.data);

// ---- Admin wishlist ----

export type AdminWishlistGroup = {
  user: { id: number; name: string; email: string; phone: string | null };
  count: number;
  items: WishlistEntry[];
  last_added: string;
};

export const getAdminWishlists = () =>
  api.get<AdminWishlistGroup[]>("/admin/wishlists").then((r) => r.data);

export const sendWishlistFollowUp = (
  userId: number,
  payload: { subject?: string; message: string },
) => api.post(`/admin/wishlists/user/${userId}/message`, payload).then((r) => r.data);
