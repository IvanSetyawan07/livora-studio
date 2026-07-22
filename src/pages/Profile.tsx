import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, authStorage } from "@/lib/api";
import { getMyConsultations, type Consultation } from "@/lib/consultations";
import { updateProfile, changePassword } from "@/lib/profile";
import { getWishlist, removeFromWishlist, type WishlistEntry } from "@/lib/wishlist";
import { cancelConsultation } from "@/lib/consultationMessages";
import ConsultationChat from "@/components/livora/ConsultationChat";
import { toast } from "sonner";
import {
  Check, Calendar, MapPin, Video, Bookmark, User as UserIcon,
  ClipboardList, ArrowLeft, MessageCircle, XCircle,
} from "lucide-react";

type User = { id: number; name: string; email: string; phone?: string | null; address?: string | null };

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

const TABS = [
  { key: "profile", label: "Edit Profile", icon: UserIcon },
  { key: "consultations", label: "My Consultations", icon: ClipboardList },
  { key: "wishlist", label: "Saved", icon: Bookmark },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me");
        setUser(data);
      } catch {
        alert("Anda harus login terlebih dahulu");
        navigate("/login");
      }
    })();
  }, [navigate]);

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch {
      /* ignore */
    }
    authStorage.clear();
    navigate("/login");
  };

  const rawName = (user?.name || "").trim();
  const firstName = rawName.includes("@")
    ? rawName.split("@")[0].split(/[._\s]/)[0]
    : rawName.split(/\s+/)[0] || "there";
  const displayFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground mb-1">
              Livora | My Account
            </p>
            <h1 className="serif text-3xl">Hello, {displayFirst}</h1>
          </div>
          <button
            onClick={logout}
            className="bg-foreground text-background px-4 py-2 rounded text-sm uppercase tracking-[0.2em]"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-[0.2em] border-b-2 transition-colors ${
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "profile" && user && (
          <ProfileTab user={user} onUpdated={setUser} />
        )}
        {activeTab === "consultations" && <ConsultationsTab />}
        {activeTab === "wishlist" && <WishlistTab />}
      </div>
    </div>
  );
}

/* ═══════════════════ TAB 1: Edit Profile ═══════════════════ */

function ProfileTab({ user, onUpdated }: { user: User; onUpdated: (u: User) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    const parts = (user.name ?? "").trim().split(" ");
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" ") ?? "");
  }, [user.name]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("Nama depan wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      const { user: updated } = await updateProfile({ name: fullName, phone, address });
      onUpdated(updated);
      toast.success("Profil berhasil diperbarui.");
    } catch {
      toast.error("Gagal memperbarui profil.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }
    setChangingPw(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      toast.success("Password berhasil diperbarui.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gagal mengubah password.");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Info form */}
      <form onSubmit={handleSaveProfile} className="bg-card border border-border rounded-lg p-6">
        <h2 className="serif text-xl mb-6">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ProfileField label="First Name">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-background outline-none focus:border-foreground"
            />
          </ProfileField>
          <ProfileField label="Last Name">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-background outline-none focus:border-foreground"
            />
          </ProfileField>
          <ProfileField label="Email">
            <input
              value={user.email}
              disabled
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-secondary/40 text-muted-foreground cursor-not-allowed"
            />
          </ProfileField>
          <ProfileField label="Phone Number">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+62..."
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-background outline-none focus:border-foreground"
            />
          </ProfileField>
          <ProfileField label="Address" full>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-background outline-none focus:border-foreground resize-none"
            />
          </ProfileField>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-6 bg-foreground text-background px-6 py-2.5 rounded text-xs uppercase tracking-[0.2em] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Password form */}
      <form onSubmit={handleChangePassword} className="bg-card border border-border rounded-lg p-6">
        <h2 className="serif text-xl mb-6">Change Password</h2>
        <div className="grid grid-cols-1 gap-5 max-w-md">
          <ProfileField label="Current Password">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-background outline-none focus:border-foreground"
            />
          </ProfileField>
          <ProfileField label="New Password">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-background outline-none focus:border-foreground"
            />
          </ProfileField>
          <ProfileField label="Confirm New Password">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-background outline-none focus:border-foreground"
            />
          </ProfileField>
        </div>
        <button
          type="submit"
          disabled={changingPw}
          className="mt-6 bg-foreground text-background px-6 py-2.5 rounded text-xs uppercase tracking-[0.2em] disabled:opacity-60"
        >
          {changingPw ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

function ProfileField({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">{label}</label>
      {children}
    </div>
  );
}

/* ═══════════════════ TAB 2: My Consultations ═══════════════════ */

function ConsultationsTab() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    getMyConsultations()
      .then(setConsultations)
      .catch(() => setConsultations([]))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  if (consultations.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {consultations.map((c) => (
        <ConsultationCard key={c.id} consultation={c} onChanged={reload} />
      ))}
    </div>
  );
}

function ConsultationCard({
  consultation,
  onChanged,
}: {
  consultation: Consultation;
  onChanged: () => void;
}) {
  const isCancelled = consultation.status === "cancelled";
  const isClosed = isCancelled || consultation.status === "completed";
  const currentIndex = TIMELINE_STEPS.findIndex((s) => s.key === consultation.status);
  const [chatOpen, setChatOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    const reason = window.prompt(
      "Batalkan permintaan konsultasi ini?\n\nOpsional — tulis alasan singkat:",
      "",
    );
    if (reason === null) return; // dismissed
    setCancelling(true);
    try {
      await cancelConsultation(consultation.id, reason.trim() || undefined);
      toast.success("Consultation dibatalkan.");
      onChanged();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal membatalkan.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
            {consultation.service_type ?? "Design Consultation"}
          </p>
          <h3 className="serif text-xl">{consultation.project_type ?? "Consultation"} Request</h3>
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

      <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-3">
        <button
          onClick={() => setChatOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] border border-border px-3 py-2 rounded hover:bg-secondary/50"
        >
          <MessageCircle size={13} /> {chatOpen ? "Hide Chat" : "Open Chat"}
        </button>
        {!isClosed && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] border border-red-200 text-red-600 px-3 py-2 rounded hover:bg-red-50 disabled:opacity-60"
          >
            <XCircle size={13} /> {cancelling ? "Cancelling…" : "Cancel Request"}
          </button>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">
          Requested {new Date(consultation.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {chatOpen && (
        <div className="mt-4">
          <ConsultationChat consultationId={consultation.id} mode="user" locked={isClosed} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ TAB 3: Wishlist ═══════════════════ */

function WishlistTab() {
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getWishlist()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRemove = async (entry: WishlistEntry) => {
    try {
      await removeFromWishlist(entry.type, entry.entity_id);
      setItems((prev) => prev.filter((i) => i.id !== entry.id));
      toast.success("Dihapus dari wishlist.");
    } catch {
      toast.error("Gagal menghapus dari wishlist.");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Wishlist Anda masih kosong. Jelajahi furniture, koleksi, atau proyek kami dan simpan favorit Anda di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((entry) => (
        <div key={entry.id} className="bg-card border border-border rounded-lg overflow-hidden group">
          <div className="aspect-square bg-secondary/40 overflow-hidden">
            {entry.entity?.image ? (
              <img
                src={entry.entity.image}
                alt={entry.entity.name ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{entry.type}</p>
            <p className="text-sm truncate mb-2">{entry.entity?.name ?? "Untitled"}</p>
            <button
              onClick={() => handleRemove(entry)}
              className="text-[11px] text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}