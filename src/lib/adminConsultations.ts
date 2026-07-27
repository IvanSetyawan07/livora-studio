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

// ─── 10-stage workflow admin actions ───────────────────────────
export const approveConsultation = (id: number, note?: string) =>
  api.post<Consultation>(`/admin/consultations/${id}/approve`, { note }).then((r) => r.data);

export const rejectConsultation = (id: number, reason: string) =>
  api.post<Consultation>(`/admin/consultations/${id}/reject`, { reason }).then((r) => r.data);

export const scheduleMeeting = (
  id: number,
  payload: { meeting_date: string; meeting_time?: string; meeting_location?: string; meeting_link?: string; note?: string },
) => api.post<Consultation>(`/admin/consultations/${id}/schedule-meeting`, payload).then((r) => r.data);

export const startMeeting = (id: number, note?: string) =>
  api.post<Consultation>(`/admin/consultations/${id}/start-meeting`, { note }).then((r) => r.data);

export const requestDp = (id: number, amount: number, note?: string, invoice?: File) => {
  const form = new FormData();
  form.append("dp_amount", String(amount));
  if (note) form.append("note", note);
  if (invoice) form.append("invoice", invoice);
  return api
    .post<Consultation>(`/admin/consultations/${id}/request-dp`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const markDpPaid = (id: number) =>
  api.post<Consultation>(`/admin/consultations/${id}/mark-paid`).then((r) => r.data);

export const uploadAgreement = (id: number, file: File, note?: string) => {
  const form = new FormData();
  form.append("agreement", file);
  if (note) form.append("note", note);
  return api
    .post<Consultation>(`/admin/consultations/${id}/upload-agreement`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const postProgress = (
  id: number,
  percentage: number,
  note?: string,
  photos: File[] = [],
) => {
  const form = new FormData();
  form.append("percentage", String(percentage));
  if (note) form.append("note", note);
  photos.forEach((f) => form.append("photos[]", f));
  return api
    .post<Consultation>(`/admin/consultations/${id}/progress`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const completeConsultation = (id: number, note?: string) =>
  api.post<Consultation>(`/admin/consultations/${id}/complete`, { note }).then((r) => r.data);

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
