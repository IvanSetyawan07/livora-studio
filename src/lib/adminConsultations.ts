import { api } from "@/lib/api";
import type { Consultation, ConsultationActivity } from "@/lib/consultations";
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
  payload: {
    meeting_date: string;
    meeting_time?: string;
    meeting_location?: string;
    meeting_link?: string;
    meeting_type?: string;
    note?: string;
  },
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

export const requestFinalPayment = (
  id: number,
  amount: number,
  note?: string,
  invoice?: File,
) => {
  const form = new FormData();
  form.append("final_payment_amount", String(amount));
  if (note) form.append("note", note);
  if (invoice) form.append("invoice", invoice);
  return api
    .post<Consultation>(`/admin/consultations/${id}/request-final-payment`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const countersignAgreement = (
  id: number,
  countersignerName: string,
  signatureData?: string,
) =>
  api
    .post<Consultation>(`/admin/consultations/${id}/countersign`, {
      countersigner_name: countersignerName,
      signature_data: signatureData,
    })
    .then((r) => r.data);
export type AgreementDraft = {
  content: string;
  is_custom: boolean;
  generated_at: string | null;
};

export const getAgreementDraft = (id: number) =>
  api.get<AgreementDraft>(`/admin/consultations/${id}/agreement/draft`).then((r) => r.data);

export const saveAgreementContent = (id: number, content: string) =>
  api
    .post<{ content: string; is_custom: boolean }>(
      `/admin/consultations/${id}/agreement/content`,
      { content },
    )
    .then((r) => r.data);

export const generateAgreement = (id: number, content?: string, note?: string) =>
  api
    .post<Consultation>(`/admin/consultations/${id}/agreement/generate`, { content, note })
    .then((r) => r.data);

export const applyMeterai = (id: number, serial?: string) =>
  api
    .post<Consultation>(`/admin/consultations/${id}/meterai/apply`, { serial: serial || null })
    .then((r) => r.data);

export const approveProof = (id: number, fileId: number) =>
  api.post<Consultation>(`/admin/consultations/${id}/stage-files/${fileId}/approve`).then((r) => r.data);

export const rejectProof = (id: number, fileId: number, reason: string) =>
  api
    .post<Consultation>(`/admin/consultations/${id}/stage-files/${fileId}/reject`, { reason })
    .then((r) => r.data);

export const adminCommentOnProgress = (id: number, progressId: number, body: string) =>
  api
    .post<Consultation>(`/admin/consultations/${id}/progress/${progressId}/comments`, { body })
    .then((r) => r.data);

export const getAdminActivities = () =>
  api.get<ConsultationActivity[]>("/admin/consultations/activities").then((r) => r.data);

export const getAdminActivitiesUnread = () =>
  api.get<{ unread: number }>("/admin/consultations/activities/unread").then((r) => r.data.unread);

export const markAdminActivitiesRead = () =>
  api.post("/admin/consultations/activities/read").then((r) => r.data);

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