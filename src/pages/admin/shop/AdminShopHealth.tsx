import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { adminShop } from "@/lib/shop";

const ago = (d?: string | null) => (d ? new Date(d).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "belum pernah");

/** Kesehatan sistem + funnel (Owner). */
export default function AdminShopHealth() {
  const [h, setH] = useState<Record<string, any> | null>(null);
  const [f, setF] = useState<Record<string, any> | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(() => { adminShop.health().then(setH).catch((e) => toast.error(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { adminShop.funnel(days).then(setF).catch(() => {}); }, [days]);

  if (!h) return <Loader2 className="h-5 w-5 animate-spin" />;
  const retry = async (id: number) => {
    const r = await adminShop.retryFailed(id).catch((e) => ({ ok: false, error: e.message }));
    r.ok ? toast.success("Terkirim") : toast.error(r.error || "Masih gagal");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between"><div><h1 className="text-2xl font-semibold">Kesehatan & funnel</h1><p className="text-sm text-muted-foreground">Pantau webhook, pesan gagal, dan konversi pesanan.</p></div>
        <button type="button" onClick={load} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm"><RefreshCw className="h-4 w-4" /> Muat ulang</button></div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Chat menunggu tim" value={h.sessions_waiting} warn={h.sessions_waiting > 0} />
        <Stat label="Review lewat target" value={h.sla_overdue} warn={h.sla_overdue > 0} />
        <Stat label="Pesan WA gagal" value={h.failed_messages?.length ?? 0} warn={(h.failed_messages?.length ?? 0) > 0} />
        <Stat label="Bayar setelah kedaluwarsa (30 hr)" value={h.unpaid_after_expiry} />
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        {Object.entries(h.webhooks ?? {}).map(([k, w]: [string, any]) => {
          const stale = !w.last_ok || Date.now() - new Date(w.last_ok).getTime() > 3 * 864e5;
          return (
            <div key={k} className="rounded-xl border border-border bg-card p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold capitalize">{stale ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />} Webhook {k}</p>
              <p className="mt-2 text-muted-foreground">Terakhir diterima: {ago(w.last_ok)}</p>
              <p className="text-muted-foreground">Ditolak/error 24 jam: {w.errors_24h}</p>
              {stale && <p className="mt-1 text-xs text-destructive">Tidak ada data masuk dalam 3 hari. Cek alamat webhook di {k === "midtrans" ? "Midtrans" : "Meta"}.</p>}
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="font-semibold">Konfigurasi</h2>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          <li>Penyedia WhatsApp: <b>{h.config?.whatsapp_provider || "belum diatur"}</b></li>
          <li>Midtrans: <b>{h.config?.midtrans ? "terpasang" : "belum"}</b></li>
          <li>Email: <b>{h.config?.mail}</b></li>
          <li>Token Meta berakhir: <b>{h.config?.meta_token_expires_at || "tidak diisi (isi META_WHATSAPP_TOKEN_EXPIRES_AT)"}</b></li>
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="font-semibold">Antrean pesan gagal</h2>
        {!h.failed_messages?.length ? <p className="mt-2 text-muted-foreground">Tidak ada.</p> : (
          <ul className="mt-2 divide-y divide-border">
            {h.failed_messages.map((m: any) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-mono text-xs">+{m.phone}</span><span className="min-w-0 flex-1 truncate">{m.body}</span>
                <span className="text-xs text-destructive">{m.error} ({m.attempts}x)</span>
                <button type="button" onClick={() => retry(m.id)} className="h-8 rounded-lg border border-border px-3 text-xs">Coba lagi</button>
                <button type="button" onClick={() => adminShop.dismissFailed(m.id).then(load)} className="h-8 rounded-lg px-2 text-xs text-muted-foreground">Abaikan</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Funnel pesanan</h2>
          <select value={days} onChange={(e) => setDays(+e.target.value)} aria-label="Periode" className="h-9 rounded-lg border border-border bg-background px-2 text-sm"><option value={7}>7 hari</option><option value={30}>30 hari</option><option value={90}>90 hari</option></select></div>
        {f ? (
          <>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={f.steps}><XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="hsl(var(--foreground))" radius={[6, 6, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <p>Diserahkan ke tim: <b>{f.handoffs}</b></p>
              <p>MTO direview: <b>{f.mto_reviewed}</b> · direvisi admin: <b>{f.mto_revised}</b>{f.mto_reviewed ? ` (${Math.round((f.mto_revised / f.mto_reviewed) * 100)}%)` : ""}</p>
              <p className="text-muted-foreground">Pemicu: {Object.entries(f.handoff_triggers ?? {}).map(([k, v]) => `${k} ${v}`).join(", ") || "—"}</p>
            </div>
          </>
        ) : <Loader2 className="mt-4 h-4 w-4 animate-spin" />}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <h2 className="font-semibold">Log webhook terbaru</h2>
        <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto">
          {h.recent?.map((l: any) => <li key={l.id} className="flex gap-3 py-1.5 text-xs"><span className="w-28 shrink-0 text-muted-foreground">{ago(l.created_at)}</span><span className="w-20">{l.source}</span><span className={l.status === "ok" ? "" : "text-destructive"}>{l.status}</span><span className="truncate text-muted-foreground">{l.error}</span></li>)}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return <div className={`rounded-xl border p-4 ${warn ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}><p className="text-2xl font-semibold">{value ?? 0}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}
