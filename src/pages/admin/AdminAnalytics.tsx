import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    api.get("/admin/analytics/overview").then((r) => setData(r.data));
    api.get("/admin/analytics/users").then((r) => setUsers(r.data));
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const fmtSec = (s: number) => {
    if (!s) return "0s";
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Marketing</p>
      <h1 className="serif text-4xl mb-8">Analytics</h1>

      <div className="grid grid-cols-2 gap-5 mb-10">
        <ChartCard title="Top Items by Clicks" data={data.topItems} dataKey="clicks" color="hsl(var(--foreground))" />
        <ChartCard title="Top Projects by Clicks" data={data.topProjects} dataKey="clicks" color="hsl(var(--accent))" />
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-10">
        <h2 className="serif text-xl mb-4">Engagement (Views & Avg Duration)</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">ID</th>
              <th className="text-right p-2">Views</th>
              <th className="text-right p-2">Avg. Time</th>
              <th className="text-right p-2">Total Time</th>
            </tr>
          </thead>
          <tbody>
            {data.viewStats.map((v: any, i: number) => (
              <tr key={i} className="border-t border-border">
                <td className="p-2 capitalize">{v.target_type}</td>
                <td className="p-2">#{v.target_id}</td>
                <td className="p-2 text-right">{v.views}</td>
                <td className="p-2 text-right">{fmtSec(v.avg_seconds)}</td>
                <td className="p-2 text-right">{fmtSec(v.total_seconds)}</td>
              </tr>
            ))}
            {data.viewStats.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Belum ada data view.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="serif text-xl mb-4">User Activity</h2>
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
      </div>
    </div>
  );
}

function ChartCard({ title, data, dataKey, color }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="serif text-xl mb-4">{title}</h2>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="title" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={dataKey} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
