import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getAdminConsultations,
  updateAdminConsultation,
  deleteAdminConsultation,
} from "@/lib/adminConsultations";
import type { Consultation } from "@/lib/consultations";

const STATUS_OPTIONS = [
  { value: "new_inquiry", label: "New Inquiry" },
  { value: "under_review", label: "Under Review" },
  { value: "contacted", label: "Contacted" },
  { value: "meeting_scheduled", label: "Meeting Scheduled" },
  { value: "in_progress", label: "Consultation in Progress" },
  { value: "follow_up_required", label: "Follow-up Required" },
  { value: "proposal_sent", label: "Proposal / Recommendation Sent" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminConsultations() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminConsultations();
      setItems(data);
    } catch {
      toast.error("Gagal memuat data consultations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const updated = await updateAdminConsultation(id, { status });
      setItems((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success("Status diperbarui.");
    } catch {
      toast.error("Gagal mengubah status.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus consultation ini? Tindakan ini tidak bisa dibatalkan.")) return;
    try {
      await deleteAdminConsultation(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      toast.success("Consultation dihapus.");
    } catch {
      toast.error("Gagal menghapus consultation.");
    }
  };

  const filtered = filter === "all" ? items : items.filter((c) => c.status === filter);

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Admin Panel
            </p>
            <h1 className="serif text-4xl">Consultations</h1>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="text-sm underline text-muted-foreground"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded ${
              filter === "all" ? "bg-foreground text-background" : "bg-card border border-border"
            }`}
          >
            All
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded ${
                filter === s.value ? "bg-foreground text-background" : "bg-card border border-border"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada consultation untuk filter ini.</p>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Submitted</th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/consultations/${c.id}`)}
                        className="font-medium hover:underline text-left"
                      >
                        {c.first_name} {c.last_name}
                      </button>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{c.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-xs">{c.service_type ?? "-"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={c.status}
                        onChange={(e) => handleStatusChange(c.id, e.target.value)}
                        className="text-xs border border-border rounded px-2 py-1 bg-background"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}