import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminOverview() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get("/admin/analytics/overview").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const stats = [
    { label: "Total Users", value: data.usersTotal },
    { label: "Active (5 min)", value: data.usersActive },
    { label: "Active Today", value: data.usersToday },
  ];

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Dashboard</p>
      <h1 className="serif text-4xl mb-8">Overview</h1>

      <div className="grid grid-cols-3 gap-5 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{s.label}</p>
            <p className="serif text-4xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <OverviewChart title="Top Items by Clicks" data={data.topItems} color="hsl(var(--foreground))" />
        <OverviewChart title="Top Projects by Clicks" data={data.topProjects} color="hsl(var(--accent))" />
      </div>
    </div>
  );
}

function OverviewChart({ title, data, color }: any) {
  const hasData = Array.isArray(data) && data.length > 0;
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="serif text-xl mb-4">{title}</h2>
      <div style={{ width: "100%", height: 280 }}>
        {hasData ? (
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="title" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="clicks" fill={color} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">
            Belum ada data klik.<br />Buka halaman item / project untuk mengisi grafik.
          </div>
        )}
      </div>
    </div>
  );
}
