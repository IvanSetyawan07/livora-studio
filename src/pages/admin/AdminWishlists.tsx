import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getAdminWishlists, sendWishlistFollowUp, type AdminWishlistGroup } from "@/lib/adminConsultations";
import { imgUrl } from "@/lib/adminApi";

export default function AdminWishlists() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<AdminWishlistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminWishlistGroup | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getAdminWishlists()
      .then(setGroups)
      .catch(() => toast.error("Gagal memuat wishlist"))
      .finally(() => setLoading(false));
  }, []);

  const sendEmail = async () => {
    if (!selected || !message.trim()) {
      toast.error("Pesan tidak boleh kosong");
      return;
    }
    setSending(true);
    try {
      await sendWishlistFollowUp(selected.user.id, { subject: subject || undefined, message });
      toast.success("Email follow-up terkirim");
      setMessage("");
      setSubject("");
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal kirim email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Admin Panel</p>
            <h1 className="serif text-4xl">User Wishlists</h1>
          </div>
          <button onClick={() => navigate("/admin")} className="text-sm underline text-muted-foreground">
            ← Back
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada user yang menyimpan item.</p>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="w-full overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Saved Items</th>
                  <th className="text-left px-4 py-3">Last Added</th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.user.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{g.user.name}</div>
                      <div className="text-xs text-muted-foreground">{g.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{g.user.phone ?? "-"}</td>
                    <td className="px-4 py-3">{g.count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(g.last_added).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 space-x-3">
                      <button
                        onClick={() => setSelected(g)}
                        className="text-xs underline"
                      >
                        View / Email
                      </button>
                      {g.user.phone && (
                        <a
                          href={`https://wa.me/${g.user.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline text-green-700"
                        >
                          WhatsApp
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="serif text-2xl">{selected.user.name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.user.email}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground">
                  ✕
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Saved items ({selected.count})
                </h3>
                {/* FIX: tambah thumbnail gambar tiap item, sebelumnya cuma render nama + type */}
                <ul className="space-y-1 text-sm">
                  {selected.items.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 border-b border-border/40 py-2">
                      <div className="w-12 h-12 rounded overflow-hidden bg-secondary/40 flex-shrink-0 flex items-center justify-center">
                        {it.entity?.image ? (
                          <img
                            src={imgUrl(it.entity.image)}
                            alt={it.entity?.name ?? "Item"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] text-muted-foreground">N/A</span>
                        )}
                      </div>
                      <div className="flex-1 flex justify-between items-center min-w-0">
                        <span className="truncate">{it.entity?.name ?? "—"}</span>
                        <span className="text-xs uppercase text-muted-foreground ml-2 flex-shrink-0">{it.type}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="serif text-lg">Send follow-up email</h3>
                <input
                  type="text"
                  placeholder="Custom subject (optional)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                />
                <textarea
                  rows={6}
                  placeholder="Tulis pesan untuk user…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                />
                <button
                  onClick={sendEmail}
                  disabled={sending}
                  className="w-full bg-foreground text-background py-3 rounded text-xs uppercase tracking-[0.25em] disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send Email"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}