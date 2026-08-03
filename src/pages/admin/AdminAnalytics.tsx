import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, Legend, PieChart, Pie, Cell,
} from "recharts";
import { pdf } from "@react-pdf/renderer";
import { Download, CalendarRange, Filter } from "lucide-react";
import AnalyticsPDF from "@/components/livora/AnalyticsPDF";

type Scope = "all" | "catalog" | "marketing" | "audience";

const SCOPES: { value: Scope; label: string; hint: string }[] = [
  { value: "all", label: "All Reports", hint: "Semua ringkasan performa" },
  { value: "catalog", label: "Catalog & Collection", hint: "Item, Collection, Catalog, Project" },
  { value: "marketing", label: "Marketing & Ads", hint: "Email campaign, leads, wishlist" },
  { value: "audience", label: "Audience", hint: "User & aktivitas login" },
];

const PRESETS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "365D", days: 365 },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));

const PIE_COLORS = ["hsl(var(--foreground))", "hsl(var(--accent))", "#b08d57", "#8a8072", "#c9bda9"];

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(iso(new Date()));
  const [scope, setScope] = useState<Scope>("all");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/admin/analytics/overview", { params: { from, to, scope } }).then((r) => setData(r.data)),
      api.get("/admin/analytics/users").then((r) => setUsers(r.data)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to, scope]);

  useEffect(() => { load(); }, [load]);

  const fmtSec = (s: number) => {
    if (!s) return "0s";
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
  };

  const showCatalog = scope === "all" || scope === "catalog";
  const showMarketing = scope === "all" || scope === "marketing";
  const showAudience = scope === "all" || scope === "audience";

  const kpis = useMemo(() => {
    if (!data) return [];
    const t = data.totals ?? {};
    const base = [
      { label: "Total Clicks", value: t.clicks ?? 0 },
      { label: "Total Views", value: t.views ?? 0 },
      { label: "Avg. Duration", value: fmtSec(t.avgDuration ?? 0) },
    ];
    const mkt = [
      { label: "Campaigns", value: data.marketing?.campaignsTotal ?? 0 },
      { label: "Emails Sent", value: data.marketing?.emailsSent ?? 0 },
      { label: "New Leads", value: t.leads ?? 0 },
      { label: "Saved (Wishlist)", value: t.wishlist ?? 0 },
    ];
    const aud = [
      { label: "Total Users", value: data.usersTotal ?? 0 },
      { label: "New Users", value: data.usersNew ?? 0 },
      { label: "Active (5 min)", value: data.usersActive ?? 0 },
      { label: "Chat Sessions", value: t.chatSessions ?? 0 },
    ];
    if (scope === "catalog") return base;
    if (scope === "marketing") return mkt;
    if (scope === "audience") return aud;
    return [...base, mkt[1], aud[1]];
  }, [data, scope]);

  const exportPDF = async () => {
    setExporting(true);
    try {
      const blob = await pdf(
        <AnalyticsPDF overview={data} users={users} scope={scope} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `livora-analytics-${scope}-${from}_${to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Reporting</p>
          <h1 className="serif text-4xl">Analytics</h1>
          {data?.period && (
            <p className="text-xs text-muted-foreground mt-2">
              Masa laporan: {data.period.from} → {data.period.to} ({data.period.days} hari)
            </p>
          )}
        </div>
        <button
          onClick={exportPDF}
          disabled={exporting || !data}
          className="inline-flex items-center gap-2 px-4 py-2 border border-foreground text-xs uppercase tracking-[0.3em] hover:bg-foreground hover:text-background transition disabled:opacity-50"
        >
          <Download size={14} />
          {exporting ? "Preparing..." : "Export PDF"}
        </button>
      </div>

      {/* Period + scope controls */}
      <div className="bg-card border border-border rounded-lg p-5 mb-8 flex flex-wrap items-end gap-5">
        <div>
          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            <CalendarRange size={13} /> Masa Pembukaan
          </label>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
            className="bg-background border border-border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Masa Penutupan</label>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}
            className="bg-background border border-border rounded px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => { setFrom(daysAgo(p.days - 1)); setTo(iso(new Date())); }}
              className="px-3 py-2 text-xs border border-border rounded hover:border-foreground/50 transition">
              {p.label}
            </button>
          ))}
        </div>
        <div className="min-w-[220px]">
          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            <Filter size={13} /> Report Type
          </label>
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm">
            {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            {SCOPES.find((s) => s.value === scope)?.hint}
          </p>
        </div>
      </div>

      {loading && !data && <p className="text-sm text-muted-foreground">Loading...</p>}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {kpis.map((k) => (
              <div key={k.label} className="bg-card border border-border rounded-lg p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{k.label}</p>
                <p className="serif text-3xl">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Traffic timeline */}
          {(showCatalog || showAudience) && (
            <Card title="Traffic Over Time (Clicks & Views)">
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <AreaChart data={data.timeline}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="clicks" name="Clicks" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground))" fillOpacity={0.12} />
                    <Area type="monotone" dataKey="views" name="Views" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.12} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {showCatalog && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                <div className="lg:col-span-2">
                  <Card title="Clicks by Feature (Item / Collection / Catalog / Project)">
                    <div style={{ width: "100%", height: 260 }}>
                      <ResponsiveContainer>
                        <BarChart data={data.timeline}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="item" name="Items" stackId="a" fill="hsl(var(--foreground))" />
                          <Bar dataKey="collection" name="Collections" stackId="a" fill="#b08d57" />
                          <Bar dataKey="catalog" name="Catalogs" stackId="a" fill="#8a8072" />
                          <Bar dataKey="project" name="Projects" stackId="a" fill="#c9bda9" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
                <Card title="Traffic Share">
                  <div style={{ width: "100%", height: 260 }}>
                    {data.clicksByType?.length ? (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={data.clicksByType} dataKey="clicks" nameKey="type" innerRadius={55} outerRadius={95} paddingAngle={2}>
                            {data.clicksByType.map((_: any, i: number) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <Empty />}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                <ChartCard title="Top Items by Clicks" data={data.topItems} color="hsl(var(--foreground))" />
                <ChartCard title="Top Collections by Clicks" data={data.topCollections} color="#b08d57" />
                <ChartCard title="Top Catalogs by Clicks" data={data.topCatalogs} color="#8a8072" />
                <ChartCard title="Top Projects by Clicks" data={data.topProjects} color="hsl(var(--accent))" />
              </div>

              <Card title="Engagement (Views & Duration)">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Content</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-right p-2">Views</th>
                      <th className="text-right p-2">Avg. Time</th>
                      <th className="text-right p-2">Total Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.viewStats.map((v: any, i: number) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2">{v.title ?? `#${v.target_id}`}</td>
                        <td className="p-2 capitalize text-muted-foreground">{v.target_type}</td>
                        <td className="p-2 text-right">{v.views}</td>
                        <td className="p-2 text-right">{fmtSec(v.avg_seconds)}</td>
                        <td className="p-2 text-right">{fmtSec(v.total_seconds)}</td>
                      </tr>
                    ))}
                    {data.viewStats.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Belum ada data view pada masa ini.</td></tr>}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {showMarketing && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                <Card title="Email Sent Over Time">
                  <div style={{ width: "100%", height: 260 }}>
                    {data.marketing?.timeline?.length ? (
                      <ResponsiveContainer>
                        <AreaChart data={data.marketing.timeline}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="sent" name="Emails" stroke="#b08d57" fill="#b08d57" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <Empty text="Belum ada campaign pada masa ini." />}
                  </div>
                </Card>
                <Card title="Leads by Consultation Stage">
                  <div style={{ width: "100%", height: 260 }}>
                    {data.leads?.byStatus?.length ? (
                      <ResponsiveContainer>
                        <BarChart data={data.leads.byStatus} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="status" width={140} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="total" name="Leads" fill="hsl(var(--foreground))" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <Empty text="Belum ada lead pada masa ini." />}
                  </div>
                </Card>
              </div>

              <Card title="Campaign Log">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Campaign</th>
                      <th className="text-left p-2">Subject</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-right p-2">Sent</th>
                      <th className="text-right p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.marketing?.campaigns ?? []).map((c: any) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="p-2 font-medium">{c.name ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{c.subject ?? "—"}</td>
                        <td className="p-2 capitalize">{c.status}</td>
                        <td className="p-2 text-right">{c.sent_count}</td>
                        <td className="p-2 text-right text-xs text-muted-foreground">
                          {(c.sent_at ?? c.created_at ?? "").toString().slice(0, 10)}
                        </td>
                      </tr>
                    ))}
                    {!(data.marketing?.campaigns ?? []).length && (
                      <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Belum ada campaign pada masa ini.</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {showAudience && (
            <Card title="User Activity">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Role</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="p-2 font-medium">{u.name}</td>
                      <td className="p-2 text-muted-foreground">{u.email}</td>
                      <td className="p-2 capitalize">{u.role}</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs ${u.is_online ? "text-emerald-600" : "text-muted-foreground"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_online ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                          {u.is_online ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{u.last_seen_at ? new Date(u.last_seen_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Belum ada user aktif.</td></tr>}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <h2 className="serif text-xl mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ text = "Belum ada data pada masa ini." }: { text?: string }) {
  return <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">{text}</div>;
}

function ChartCard({ title, data, color }: any) {
  const hasData = Array.isArray(data) && data.length > 0;
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="serif text-xl mb-4">{title}</h2>
      <div style={{ width: "100%", height: 260 }}>
        {hasData ? (
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="title" tick={{ fontSize: 9 }} interval={0} height={50} angle={-20} textAnchor="end" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="clicks" fill={color} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </div>
    </div>
  );
}
