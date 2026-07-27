import { api } from "@/lib/api";

export type ConsultationPayload = {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  contact_method?: string;
  consultation_type?: string;
  location?: string;
  service_type?: string;
  project_type?: string;
  estimated_area?: string;
  preferred_style?: string;
  message: string;
};

export type ConsultationStageFile = {
  id: number;
  consultation_id: number;
  stage: string;
  kind:
    | "invoice"
    | "payment_proof"
    | "agreement"
    | "signed_agreement"
    | "progress_photo"
    | "other";
  file_path: string;
  note: string | null;
  uploaded_by: number | null;
  uploader?: { id: number; name: string } | null;
  created_at: string;
};

export type ConsultationProgressUpdate = {
  id: number;
  consultation_id: number;
  percentage: number;
  note: string | null;
  photos: string[] | null;
  created_by: number | null;
  creator?: { id: number; name: string } | null;
  created_at: string;
};

export type ConsultationStatusHistoryEntry = {
  id: number;
  previous_status: string | null;
  new_status: string;
  changed_by: number | null;
  changed_by_user?: { id: number; name: string } | null;
  note: string | null;
  created_at: string;
};

export type Consultation = ConsultationPayload & {
  id: number;
  user_id: number | null;
  attachments: string[];
  status: string;
  status_label?: string;
  admin_notes: string | null;
  assigned_admin_id: number | null;
  meeting_date: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  meeting_link: string | null;
  follow_up_date: string | null;
  rejection_reason: string | null;
  dp_amount: string | number | null;
  dp_paid_at: string | null;
  agreement_signed_at: string | null;
  agreement_signature_name: string | null;
  project_progress: number;
  created_at: string;
  updated_at: string;
  unread_messages_count?: number;
  status_history?: ConsultationStatusHistoryEntry[];
  statusHistory?: ConsultationStatusHistoryEntry[];
  stage_files?: ConsultationStageFile[];
  stageFiles?: ConsultationStageFile[];
  progress_updates?: ConsultationProgressUpdate[];
  progressUpdates?: ConsultationProgressUpdate[];
};

/** 10-stage linear flow used by the timeline UI. */
export const CONSULTATION_STAGES = [
  { key: "new_inquiry",       label: "Inquiry Submitted" },
  { key: "under_review",      label: "Under Review" },
  { key: "contacted",         label: "Contacted" },
  { key: "meeting_scheduled", label: "Meeting Scheduled" },
  { key: "in_progress",       label: "Consultation in Progress" },
  { key: "dp_pending",        label: "DP Payment" },
  { key: "project_paid",      label: "Project Paid" },
  { key: "project_running",   label: "Project Running" },
  { key: "completed",         label: "Completed" },
] as const;

export type ConsultationStageKey = (typeof CONSULTATION_STAGES)[number]["key"];

export const stageIndex = (status: string): number => {
  // Legacy aliases still floating around in old records.
  if (status === "follow_up_required") return CONSULTATION_STAGES.findIndex((s) => s.key === "in_progress");
  if (status === "proposal_sent")      return CONSULTATION_STAGES.findIndex((s) => s.key === "project_paid");
  return CONSULTATION_STAGES.findIndex((s) => s.key === status);
};

export const isTerminal = (status: string) =>
  status === "cancelled" || status === "rejected" || status === "completed";

export const submitConsultation = (payload: ConsultationPayload, files: File[] = []) => {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, String(value));
    }
  });
  files.forEach((file) => form.append("attachments[]", file));
  return api
    .post<Consultation>("/consultations", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);
};

export const getMyConsultations = () =>
  api.get<Consultation[]>("/my/consultations").then((res) => res.data);

export const getConsultation = (id: number) =>
  api.get<Consultation>(`/consultations/${id}`).then((res) => res.data);

// ── User actions for stage 6 & 7 ─────────────────────────────
export const uploadDpProof = (id: number, file: File, note?: string) => {
  const form = new FormData();
  form.append("proof", file);
  if (note) form.append("note", note);
  return api
    .post<Consultation>(`/consultations/${id}/dp-proof`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const signAgreement = (id: number, signatureName: string) =>
  api
    .post<Consultation>(`/consultations/${id}/sign-agreement`, {
      signature_name: signatureName,
      accept: true,
    })
    .then((r) => r.data);
