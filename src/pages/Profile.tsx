import OrdersTab from "@/components/shop/OrdersTab";
import { Navbar } from "@/components/livora/Navbar";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, authStorage } from "@/lib/api";
import {
  getMyConsultations,
  getConsultation,
  getMyActivities,
  stageIndex,
  isTerminal,
  CONSULTATION_STAGES,
  type Consultation,
  type ConsultationActivity,
} from "@/lib/consultations";
import { updateProfile, changePassword } from "@/lib/profile";
import { getWishlist, removeFromWishlist, type WishlistEntry } from "@/lib/wishlist";
import { cancelConsultation } from "@/lib/consultationMessages";
import { toast } from "sonner";
import { imgUrl } from "@/lib/adminApi";
import {
  Bookmark, User as UserIcon,
  ClipboardList, MessageCircle, XCircle, Check, Bell,
} from "lucide-react";

type User = { id: number; name: string; email: string; phone?: string | null; address?: string | null };

const TABS = [
  { key: "profile", label: "Edit Profile", icon: UserIcon },
  { key: "consultations", label: "My Consultations", icon: ClipboardList },
  { key: "orders", label: "My Orders", icon: ClipboardList },
  { key: "wishlist", label: "Saved", icon: Bookmark },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// URL <-> tab mapping: /profile, /profile/consultations, /profile/saved
const PATH_TO_TAB: Record<string, TabKey> = { consultations: "consultations", orders: "orders", saved: "wishlist" };
const TAB_TO_PATH: Record<TabKey, string> = {
  profile: "/profile",
  consultations: "/profile/consultations",
  orders: "/profile/orders",
  wishlist: "/profile/saved",
};

export default function Profile() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const activeTab: TabKey = tabParam ? (PATH_TO_TAB[tabParam] ?? "profile") : "profile";
  const [user, setUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<ConsultationActivity[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me");
        setUser(data);
      } catch {
        toast.error("Anda harus login terlebih dahulu");
        navigate("/login");
      }
    })();
  }, [navigate]);

  useEffect(() => {
    getMyActivities().then(setActivities).catch(() => {});
  }, []);

  const unreadConsultationActivities = activities.filter((a) => !a.user_read_at).length;

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6 pt-28 md:p-10 md:pt-36">
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
        <div data-lenis-prevent className="flex gap-1.5 overflow-x-auto no-scrollbar mb-8 bg-secondary/50 p-1.5 rounded-lg max-w-full sm:w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            const badge = tab.key === "consultations" ? unreadConsultationActivities : 0;
            return (
              <button
                key={tab.key}
                onClick={() => navigate(TAB_TO_PATH[tab.key], { replace: true })}
                className={`relative shrink-0 min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-md text-xs uppercase tracking-[0.16em] whitespace-nowrap transition-colors ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <Icon size={14} />
                {tab.label}
                {badge > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "profile" && user && (
          <ProfileTab user={user} onUpdated={setUser} />
        )}
        {activeTab === "consultations" && <ConsultationsTab />}
        {activeTab === "orders" && <OrdersTab />}
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
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [detail, setDetail] = useState<Consultation>(consultation);

  useEffect(() => {
    // Load full detail (with stage_files, progress_updates, status_history, activities) once.
    getConsultation(consultation.id).then(setDetail).catch(() => {});
  }, [consultation.id]);

  const isCancelled = detail.status === "cancelled";
  const isRejected = detail.status === "rejected";
  const isClosed = isCancelled || isRejected || detail.status === "completed";

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelling(true);
    try {
      await cancelConsultation(detail.id, cancelReason.trim() || undefined);
      toast.success("Consultation dibatalkan.");
      setCancelOpen(false);
      setCancelReason("");
      const fresh = await getConsultation(detail.id);
      setDetail(fresh);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal membatalkan.");
    } finally {
      setCancelling(false);
    }
  };

  const badgeClass = isCancelled
    ? "bg-red-50 text-red-600"
    : isRejected
    ? "bg-amber-50 text-amber-700"
    : detail.status === "completed"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-secondary text-foreground";

  const thumbnail = detail.attachments?.[0] ? imgUrl(detail.attachments[0]) : null;
  const cardActivities = detail.activities ?? [];
  const latestUpdate = [...cardActivities].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
  const hasUnread = cardActivities.some((a) => a.audience !== "admin" && !a.user_read_at);

    const openDetails = () => navigate(`/profile/consultations/${detail.id}`);
  const openChat = () => navigate(`/profile/consultations/${detail.id}#notes`);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden relative">
      {hasUnread && (
        <span
          className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-card"
          aria-label="Unread update"
          title="Unread update"
        />
      )}
      {/* Header */}
      <div className="flex flex-wrap sm:flex-nowrap items-start gap-3 sm:gap-4 p-4 sm:p-6 pb-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-secondary shrink-0">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground text-center px-1">
              No image
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1 truncate">
            {detail.service_type ?? "Design Consultation"}
          </p>
          <h3 className="serif text-lg sm:text-xl leading-snug">{detail.project_type ?? "Consultation"} Request</h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            {new Date(detail.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <span className={`shrink-0 text-[11px] px-3 py-1 rounded-full uppercase tracking-wider ${badgeClass}`}>
          {detail.status_label ?? detail.status}
        </span>
      </div>

      {/* 9-stage horizontal progress tracker */}
      {!isCancelled && !isRejected && (
        <div className="px-6 pb-4 -mx-1 overflow-x-auto no-scrollbar">
          <StageDots status={detail.status} />
        </div>
      )}

      {/* Latest update */}
      {latestUpdate && (
        <div className="mx-6 mb-4 rounded-lg bg-secondary/40 border border-border p-3 flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-[#C9974A]/15 text-[#C9974A] flex items-center justify-center shrink-0">
            <Bell size={13} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{latestUpdate.title}</p>
            {latestUpdate.body && <p className="text-xs text-muted-foreground line-clamp-1">{latestUpdate.body}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(latestUpdate.created_at).toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 sm:px-6 pb-5 pt-3 border-t border-border flex flex-wrap items-center gap-2.5 sm:gap-3">
        <button
          onClick={openDetails}
          className="inline-flex items-center justify-center min-h-[44px] gap-1.5 text-[11px] uppercase tracking-[0.2em] bg-foreground text-background px-4 py-2.5 rounded hover:opacity-90"
        >
          {isClosed ? "View Details" : "On Progress"}
        </button>
        <button
          onClick={openChat}
          className="inline-flex items-center justify-center min-h-[44px] gap-1.5 text-[11px] uppercase tracking-[0.2em] border border-border px-4 py-2.5 rounded hover:bg-secondary/50"
        >
          <MessageCircle size={13} /> Contact Us
        </button>
        {!isClosed && (
          <button
            onClick={() => setCancelOpen(true)}
            disabled={cancelling}
            className="sm:ml-auto inline-flex items-center min-h-[44px] px-2 gap-1.5 text-[11px] uppercase tracking-[0.2em] text-red-600 hover:underline disabled:opacity-60"
          >
            <XCircle size={13} /> {cancelling ? "Cancelling…" : "Cancel Request"}
          </button>
        )}
      </div>

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleCancelSubmit} className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6 border border-border shadow-xl" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <h4 className="serif text-xl">Batalkan Konsultasi?</h4>
            <p className="mt-1 text-xs text-muted-foreground">Opsional — tulis alasan singkat pembatalan Anda.</p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Alasan pembatalan (opsional)..."
              className="mt-4 w-full rounded-lg border border-border bg-background p-3 text-base sm:text-sm outline-none focus:border-foreground"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setCancelOpen(false)} className="h-11 flex-1 rounded-lg border border-border text-sm">Kembali</button>
              <button type="submit" disabled={cancelling} className="h-11 flex-1 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50">
                {cancelling ? "Membatalkan…" : "Ya, Batalkan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/** Compact horizontal 9-stage tracker used on the consultation card. */
function StageDots({ status }: { status: string }) {
  const currentIdx = stageIndex(status);
  const terminal = isTerminal(status);
  return (
    <div className="flex items-center gap-1.5 min-w-max py-1">
      {CONSULTATION_STAGES.map((stage, i) => {
        const done = currentIdx >= 0 && (i < currentIdx || (terminal && i === currentIdx));
        const current = !terminal && i === currentIdx;
        return (
          <div key={stage.key} className="flex items-center gap-1.5" title={stage.label}>
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
                done || current ? "" : "bg-secondary text-muted-foreground"
              }`}
              style={
                done
                  ? { backgroundColor: "#C9974A", color: "white" }
                  : current
                  ? { border: "2px solid #C9974A", color: "#C9974A" }
                  : undefined
              }
            >
              {done ? <Check size={10} /> : i + 1}
            </span>
            {i < CONSULTATION_STAGES.length - 1 && (
              <span className={`w-4 h-px shrink-0 ${i < currentIdx ? "" : "bg-border"}`} style={i < currentIdx ? { backgroundColor: "#C9974A" } : undefined} />
            )}
          </div>
        );
      })}
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
      {items.map((entry) => {
        const slug = entry.entity?.slug;
        const target =
          !slug ? null :
          entry.type === "item" ? `/items/${slug}` :
          entry.type === "project" ? `/projects/${slug}` :
          entry.type === "collection" ? `/collection/${slug}` :
          `/catalog`;
        const thumb = (
          <div className="aspect-square bg-secondary/40 overflow-hidden">
            {entry.entity?.image ? (
              <img
                src={imgUrl(entry.entity.image)}
                alt={entry.entity.name ?? ""}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}
          </div>
        );
        return (
          <div key={entry.id} className="bg-card border border-border rounded-lg overflow-hidden group flex flex-col">
            {target ? <Link to={target} className="block">{thumb}</Link> : thumb}
            <div className="p-3 flex-1 flex flex-col justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{entry.type}</p>
                {target ? (
                  <Link to={target} className="block text-sm font-medium truncate hover:underline">
                    {entry.entity?.name ?? "Untitled"}
                  </Link>
                ) : (
                  <p className="text-sm truncate">{entry.entity?.name ?? "Untitled"}</p>
                )}
              </div>
              <button
                onClick={() => handleRemove(entry)}
                className="self-start min-h-[36px] py-1 text-[11px] text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}