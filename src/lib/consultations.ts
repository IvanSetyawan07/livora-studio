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
  created_at: string;
  updated_at: string;
};

/** Submit form appointment/consultation. Bekerja untuk guest maupun user login. */
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

/** "My Consultations" — dipakai di halaman profile user. */
export const getMyConsultations = () =>
  api.get<Consultation[]>("/my/consultations").then((res) => res.data);

export const getConsultation = (id: number) =>
  api.get<Consultation>(`/consultations/${id}`).then((res) => res.data);
