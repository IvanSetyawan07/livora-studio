import { api } from "@/lib/api";

export type InviteCategory = "rekanan" | "pelanggan" | "pendaftar";
export type InviteStatus = "draft" | "siap" | "terkirim" | "gagal" | "dibalas";

export type InviteStats = {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  rsvp: Record<string, number>;
};

export type InviteEvent = {
  id: number;
  name: string;
  event_date: string | null;
  location: string | null;
  description_format: string | null;
  ai_instructions: string | null;
  knowledge: string | null;
  default_image_url: string | null;
  wa_template_name: string | null;
  wa_template_lang: string;
  template_has_buttons: boolean;
  sheet_csv_url: string | null;
  sheet_name_column: string | null;
  sheet_phone_column: string | null;
  is_active: boolean;
  stats: InviteStats;
  wa_ready: boolean;
  ai_ready: boolean;
};

export type InviteGuest = {
  id: number;
  event_id: number;
  name: string;
  phone: string;
  category: InviteCategory;
  source: "manual" | "import" | "sheet";
  description: string | null;
  image_path: string | null;
  image_url: string | null;
  status: InviteStatus;
  send_channel: "otomatis" | "manual" | null;
  sent_at: string | null;
  rsvp: "hadir" | "tidak" | null;
  rsvp_at: string | null;
  error_note: string | null;
  notes: string | null;
};

export type InviteChatMessage = { id?: number; role: "user" | "assistant"; content: string };
export type SendResult = { id: number; name: string; ok: boolean; error: string | null; mode?: string };
export type TemplateCheck = {
  ok: boolean;
  found: boolean;
  status: string | null;
  category: string | null;
  languages: { language: string; status: string }[];
  lang_matched: boolean;
  checks: { key: string; ok: boolean; detail: string }[];
  message: string;
  code?: string;
};
const base = "/admin/invites";
const form = (field: string, files: File[]) => {
  const fd = new FormData();
  files.forEach((f) => fd.append(field, f));
  return fd;
};
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

/** Pesan error yang ramah dari respons Laravel. */
export const inviteError = (e: any): string => {
  const d = e?.response?.data;
  if (d?.errors) return Object.values(d.errors).flat().join(" ");
  return d?.message || e?.message || "Terjadi kesalahan";
};

export const invites = {
  events: () => api.get<InviteEvent[]>(`${base}/events`).then((r) => r.data),
  createEvent: (body: Partial<InviteEvent>) => api.post<InviteEvent>(`${base}/events`, body).then((r) => r.data),
  updateEvent: (id: number, body: Partial<InviteEvent>) => api.put<InviteEvent>(`${base}/events/${id}`, body).then((r) => r.data),
  deleteEvent: (id: number) => api.delete(`${base}/events/${id}`).then((r) => r.data),
  setEventImage: (id: number, file: File) => api.post<InviteEvent>(`${base}/events/${id}/image`, form("image", [file]), multipart).then((r) => r.data),
  removeEventImage: (id: number) => api.delete<InviteEvent>(`${base}/events/${id}/image`).then((r) => r.data),

  guests: (eventId: number) => api.get<InviteGuest[]>(`${base}/events/${eventId}/guests`).then((r) => r.data),
  createGuest: (eventId: number, body: Partial<InviteGuest>) => api.post<InviteGuest>(`${base}/events/${eventId}/guests`, body).then((r) => r.data),
  updateGuest: (eventId: number, id: number, body: Partial<InviteGuest>) => api.put<InviteGuest>(`${base}/events/${eventId}/guests/${id}`, body).then((r) => r.data),
  deleteGuest: (eventId: number, id: number) => api.delete(`${base}/events/${eventId}/guests/${id}`).then((r) => r.data),
  deleteGuests: (eventId: number, ids: number[]) => api.post<{ deleted: number }>(`${base}/events/${eventId}/guests/delete`, { ids }).then((r) => r.data),
  importGuests: (eventId: number, rows: { name: string; phone: string; category?: string }[], default_category: InviteCategory) =>
    api.post<{ added: number; skipped: number; errors: string[] }>(`${base}/events/${eventId}/guests/import`, { rows, default_category }).then((r) => r.data),
  generate: (eventId: number, ids: number[], mode: "ai" | "format", overwrite: boolean) =>
    api.post<{ done: number; ai_failed: number }>(`${base}/events/${eventId}/guests/generate`, { ids, mode, overwrite }, { timeout: 120000 }).then((r) => r.data),
  approve: (eventId: number, ids: number[]) => api.post<{ approved: number }>(`${base}/events/${eventId}/guests/approve`, { ids }).then((r) => r.data),
  setGuestImage: (eventId: number, id: number, file: File) => api.post<InviteGuest>(`${base}/events/${eventId}/guests/${id}/image`, form("image", [file]), multipart).then((r) => r.data),
  removeGuestImage: (eventId: number, id: number) => api.delete<InviteGuest>(`${base}/events/${eventId}/guests/${id}/image`).then((r) => r.data),
  bulkImages: (eventId: number, files: File[]) =>
    api.post<{ matched: number; unmatched: string[] }>(`${base}/events/${eventId}/guests/images`, form("images[]", files), { ...multipart, timeout: 120000 }).then((r) => r.data),
  send: (eventId: number, ids: number[], force = false) =>
    api.post<{ results: SendResult[] }>(`${base}/events/${eventId}/guests/send`, { ids, force }, { timeout: 180000 }).then((r) => r.data.results),
  manualLink: (eventId: number, id: number) => api.get<{ url: string; message: string }>(`${base}/events/${eventId}/guests/${id}/manual-link`).then((r) => r.data),
  markSent: (eventId: number, id: number) => api.post<InviteGuest>(`${base}/events/${eventId}/guests/${id}/mark-sent`).then((r) => r.data),
   checkTemplate: (eventId: number, body: { name: string; lang: string; has_buttons: boolean }) =>
    api.post<TemplateCheck>(`${base}/events/${eventId}/check-template`, body, { timeout: 30000 }).then((r) => r.data),
  pullSheet: (eventId: number) => api.post<{ added: number; updated: number; skipped: number; filled: number }>(`${base}/events/${eventId}/pull-sheet`).then((r) => r.data),

  chatHistory: (eventId: number) => api.get<InviteChatMessage[]>(`${base}/events/${eventId}/chat`).then((r) => r.data),
  chat: (eventId: number, message: string) => api.post<{ reply: string }>(`${base}/events/${eventId}/chat`, { message }, { timeout: 60000 }).then((r) => r.data),
  clearChat: (eventId: number) => api.delete(`${base}/events/${eventId}/chat`).then((r) => r.data),
};