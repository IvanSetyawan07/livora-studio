import { api, API_BASE_URL } from "@/lib/api";

const FILE_HOST = API_BASE_URL.replace(/\/api\/?$/, "");

/** Resolve a stored `/storage/...` path into an absolute URL. */
export const fileUrl = (path?: string | null): string => {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : `${FILE_HOST}${path.startsWith("/") ? "" : "/"}${path}`;
};

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
  message?: string;
  terms_accepted?: boolean | string;
  privacy_accepted?: boolean | string;
  terms_version?: string;
  privacy_version?: string;
};

export type ConsultationStageFile = {
  id: number;
  consultation_id: number;
  stage: string;
  kind:
    | "invoice"
    | "payment_proof"
    | "final_invoice"
    | "final_payment_proof"
    | "agreement"
    | "signed_agreement"
    | "progress_photo"
    | "other";
  file_path: string;
  note: string | null;
  uploaded_by: number | null;
  uploader?: { id: number; name: string } | null;
  review_status?: "pending" | "approved" | "rejected" | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  reviewer?: { id: number; name: string } | null;
  created_at: string;
};

export type ConsultationProgressComment = {
  id: number;
  progress_update_id: number;
  consultation_id: number;
  user_id: number | null;
  author_type: "user" | "admin";
  body: string;
  author?: { id: number; name: string } | null;
  created_at: string;
};

export type ConsultationActivity = {
  id: number;
  consultation_id: number;
  audience: "user" | "admin" | "both";
  type: string;
  title: string;
  body: string | null;
  actor?: { id: number; name: string } | null;
  consultation?: { id: number; first_name: string; last_name?: string | null; status: string } | null;
  user_read_at: string | null;
  admin_read_at: string | null;
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
  comments?: ConsultationProgressComment[];
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
  meeting_type?: string | null;
  final_payment_amount?: string | number | null;
  final_payment_requested_at?: string | null;
  final_payment_paid_at?: string | null;
  agreement_signature_path?: string | null;
  agreement_document_path?: string | null;
  livora_countersigned_at?: string | null;
  livora_countersigner_name?: string | null;
  livora_signature_path?: string | null;
  final_agreement_path?: string | null;
  meterai_status?: string | null;
  meterai_reference?: string | null;
  meterai_error?: string | null;
  meterai_completed_at?: string | null;
  activities?: ConsultationActivity[];
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
  { key: "agreement_pending", label: "Agreement & Signature" },
  { key: "dp_pending",        label: "DP Payment" },
  { key: "project_paid",      label: "Project Paid" },
  { key: "project_running",   label: "Project Running" },
  { key: "completed",         label: "Completed" },
] as const;

export type ConsultationStageKey = (typeof CONSULTATION_STAGES)[number]["key"];

export const stageIndex = (status: string): number => {
  // Legacy aliases still floating around in old records.
  if (status === "follow_up_required") return CONSULTATION_STAGES.findIndex((s) => s.key === "in_progress");
  if (status === "proposal_sent")      return CONSULTATION_STAGES.findIndex((s) => s.key === "agreement_pending");
  return CONSULTATION_STAGES.findIndex((s) => s.key === status);
};

/**
 * 10 stage granular di atas dikelompokkan jadi 5 fase besar untuk tampilan
 * "Your Journey" — supaya stepper & daftar progres tidak perlu menampilkan
 * 10 titik/panel sekaligus. Setiap stage asli tetap ada & tetap bisa diakses
 * (lihat ConsultationJourney), cuma dikelompokkan penempatannya.
 */
export const CONSULTATION_PHASES = [
  { key: "inquiry",   label: "Inquiry",   stages: ["new_inquiry", "under_review"] },
  { key: "diskusi",   label: "Diskusi",   stages: ["contacted", "meeting_scheduled", "in_progress"] },
  { key: "agreement", label: "Agreement", stages: ["agreement_pending"] },
  { key: "payment",   label: "Payment",   stages: ["dp_pending", "project_paid"] },
  { key: "project",   label: "Project",   stages: ["project_running", "completed"] },
] as const;

export type ConsultationPhaseKey = (typeof CONSULTATION_PHASES)[number]["key"];

/** Index (0..9) suatu stage -> index fase (0..4) yang menampungnya. */
export const phaseIndexForStageIdx = (stageIdx: number): number => {
  if (stageIdx < 0) return -1;
  const key = CONSULTATION_STAGES[stageIdx]?.key;
  return CONSULTATION_PHASES.findIndex((p) => (p.stages as readonly string[]).includes(key));
};

/** Status mentah dari backend -> index fase (0..4), atau -1 kalau tidak dikenali. */
export const phaseIndexForStatus = (status: string): number => phaseIndexForStageIdx(stageIndex(status));

/** Daftar stage (lengkap dengan index absolutnya di CONSULTATION_STAGES) milik satu fase. */
export const stagesForPhase = (phaseIdx: number) => {
  const phase = CONSULTATION_PHASES[phaseIdx];
  if (!phase) return [];
  return CONSULTATION_STAGES
    .map((stage, absIndex) => ({ stage, absIndex }))
    .filter(({ stage }) => (phase.stages as readonly string[]).includes(stage.key));
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

export const uploadFinalPaymentProof = (id: number, file: File, note?: string) => {
  const form = new FormData();
  form.append("proof", file);
  if (note) form.append("note", note);
  return api
    .post<Consultation>(`/consultations/${id}/final-payment-proof`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const signAgreementWithSignature = (
  id: number,
  signatureName: string,
  signatureData?: string,
) =>
  api
    .post<Consultation>(`/consultations/${id}/sign-agreement`, {
      signature_name: signatureName,
      accept: true,
      signature_data: signatureData,
    })
    .then((r) => r.data);

export const commentOnProgress = (id: number, progressId: number, body: string) =>
  api
    .post<Consultation>(`/consultations/${id}/progress/${progressId}/comments`, { body })
    .then((r) => r.data);

export const getMyActivities = () =>
  api.get<ConsultationActivity[]>("/my/consultations/activities").then((r) => r.data);

export const markMyActivitiesRead = () =>
  api.post("/my/consultations/activities/read").then((r) => r.data);