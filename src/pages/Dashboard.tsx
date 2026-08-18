import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { clearSession, rememberIntendedPath } from "@/lib/authGuard";
import { getMyConsultations, type Consultation } from "@/lib/consultations";
import { Check, Calendar, MapPin, Video } from "lucide-react";

type User = { id: number; name: string; email: string };

// Urutan timeline utama (di luar status "Cancelled" yang ditampilkan terpisah)
const TIMELINE_STEPS = [
  { key: "new_inquiry", label: "Inquiry Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "contacted", label: "Contacted" },
  { key: "meeting_scheduled", label: "Meeting Scheduled" },
  { key: "in_progress", label: "Consultation in Progress" },
  { key: "follow_up_required", label: "Follow-up Required" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "completed", label: "Completed" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me");
        setUser(data);
      } catch {
        rememberIntendedPath("/dashboard");
        toast.error("Silakan masuk terlebih dahulu");
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate]);

  useEffect(() => {
    getMyConsultations()
      .then(setConsultations)
      .catch(() => setConsultations([]))
      .finally(() => setLoadingConsultations(false));
  }, []);

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch {
      /* ignore */
    }
    clearSession();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="serif text-3xl mb-1">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Hello, {user?.name ?? "..."}!</p>
          </div>
          <button
            onClick={logout}
            className="bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]"
          >
            Logout
          </button>
        </div>

        <section>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground mb-2">
            Livora | Design Consultation
          </p>
          <h2 className="serif text-2xl mb-6">My Consultations</h2>

          {loadingConsultations ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : consultations.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
               <p className="text-sm text-muted-foreground mb-4">
                You haven't submitted a design consultation yet.
              </p>
              <a
                href="/appointment"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] border-b border-foreground pb-1"
              >
                Start Your Design Journey
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {consultations.map((c) => (
                <ConsultationCard key={c.id} consultation={c} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ConsultationCard({ consultation }: { consultation: Consultation }) {
  const isCancelled = consultation.status === "cancelled";
  const currentIndex = TIMELINE_STEPS.findIndex((s) => s.key === consultation.status);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
            {consultation.service_type ?? "Design Consultation"}
          </p>
          <h3 className="serif text-xl">
            {consultation.project_type ?? "Consultation"} Request
          </h3>
        </div>

        <span
          className={`text-xs px-3 py-1.5 rounded-full uppercase tracking-wider ${
            isCancelled
              ? "bg-red-50 text-red-600"
              : consultation.status === "completed"
              ? "bg-green-50 text-green-700"
              : "bg-secondary text-foreground"
          }`}
        >
          {isCancelled ? "Cancelled" : consultation.status_label ?? consultation.status}
        </span>
      </div>

      {/* Meta info kalau ada jadwal meeting */}
      {(consultation.meeting_date || consultation.meeting_location || consultation.meeting_link) && (
        <div className="flex flex-wrap gap-4 mb-5 text-xs text-muted-foreground">
          {consultation.meeting_date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} />
              {new Date(consultation.meeting_date).toLocaleDateString("id-ID", {
                day: "numeric", month: "long", year: "numeric",
              })}
              {consultation.meeting_time ? ` · ${consultation.meeting_time}` : ""}
            </span>
          )}
          {consultation.meeting_location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} /> {consultation.meeting_location}
            </span>
          )}
          {consultation.meeting_link && (
            <a
              href={consultation.meeting_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 underline"
            >
              <Video size={13} /> Join Meeting Link
            </a>
          )}
        </div>
      )}

      {/* Timeline */}
      {!isCancelled && (
        <div className="relative flex items-start justify-between mt-2">
          {TIMELINE_STEPS.map((step, i) => {
            const reached = currentIndex >= 0 && i <= currentIndex;
            const isLast = i === TIMELINE_STEPS.length - 1;
            return (
              <div key={step.key} className="flex-1 flex flex-col items-center relative">
                {!isLast && (
                  <div
                    className={`absolute top-3 left-1/2 w-full h-[2px] ${
                      i < currentIndex ? "bg-foreground" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                    reached ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {reached ? <Check size={12} /> : i + 1}
                </div>
                <p
                  className={`mt-2 text-[10px] text-center leading-tight max-w-[70px] ${
                    reached ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {consultation.message && (
        <p className="text-xs text-muted-foreground mt-6 pt-5 border-t border-border leading-relaxed line-clamp-2">
          "{consultation.message}"
        </p>
      )}
    </div>
  );
}