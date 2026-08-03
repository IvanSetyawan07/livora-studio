import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { getAdminConsultations } from "@/lib/adminConsultations";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Sofa, FolderKanban, BookOpen, Mail, MessageCircle, Bookmark, Users, BarChart3, Tags, Filter,
} from "lucide-react";

type Group = "all" | "catalog" | "marketing" | "audience";

const GROUPS: { value: Group; label: string }[] = [
  { value: "all", label: "All Features" },
  { value: "catalog", label: "Catalog & Collection" },
  { value: "marketing", label: "Marketing & Ads" },
  { value: "audience", label: "Audience & Support" },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function AdminOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [newInquiries, setNewInquiries] = useState<number | null>(null);
  const [group, setGroup] = useState<Group>("all");
  const [days, setDays] = useState(30);

  useEffect(() => {
    const to = iso(new Date());
    const from = iso(new Date(Date.now() - (days - 1) * 86400000));
    api.get("/admin/analytics/overview", { params: { from, to } })
      .then((r) => setData(r.data)).catch(() => {});
  }, [days]);

  useEffect(() => {
    getAdminConsultations()
      .then((list) => setNewInquiries(list.filter((c) => c.status === "new_inquiry").length))
      .catch(() => setNewInquiries(0));
  }, []);

  const modules = useMemo(() => {
    const t = data?.totals ?? {};
    const inv = data?.inventory ?? {};
    return [
      { group: "catalog", label: "Items / Furniture", value: inv.items ?? 0, note: `${data?.topItems?.length ?? 0} item ter-klik`, to: "/admin/items", icon: Sofa },
      { group: "catalog", label: "Collections", value: inv.collections ?? 0, note: `${data?.topCollections?.length ?? 0} collection ter-klik`, to: "/admin/collections", icon: BookOpen },
      { group: "catalog", label: "Catalogs", value: inv.catalogs ?? 0, note: `${data?.topCatalogs?.length ?? 0} catalog ter-klik`, to: "/admin/catalogs", icon: BookOpen },
      { group: "catalog", label: "Projects", value: inv.projects ?? 0, note: `${data?.topProjects?.length ?? 0} project ter-klik`, to: "/admin/projects", icon: FolderKanban },
      { group: "catalog", label: "Taxonomies", value: "—", note: "Type, theme, category, banner", to: "/admin/taxonomies", icon: Tags },
      { group: "marketing", label: "Email Campaigns", value: data?.marketing?.campaignsTotal ?? 0, note: `${data?.marketing?.emailsSent ?? 0} email terkirim`, to: "/admin/marketing", icon: Mail },
      { group: "marketing", label: "Consultations", value: t.leads ?? 0, note: `${newInquiries ?? 0} inquiry baru`, to: "/admin/consultations", icon: MessageCircle, badge: newInquiries ?? 0 },
      { group: "marketing", label: "Saved (Wishlist)", value: t.wishlist ?? 0, note: "Item disimpan user", to: "/admin/wishlists", icon: Bookmark },
      { group: "audience", label: "Users", value: data?.usersTotal ?? 0, note: `${data?.usersActive ?? 0} online sekarang`, to: "/admin/users", icon: Users },
      { group: "audience", label: "Chat Support", value: t.chatSessions ?? 0, note: "Sesi chat periode ini", to: "/admin/support", icon: MessageCircle },
      { group: "audience", label: "Analytics", value: t.clicks ?? 0, note: `${t.views ?? 0} views`, to: "/admin/analytics", icon: BarChart3 },
    ].filter((m) => group === "all" || m.group === group);
  }, [data, group, newInquiries]);

  if (!data) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const t = data.totals ?? {};
  const headline =
    group === "marketing"
      ? [
          { label: "Campaigns", value: data.marketing?.campaignsTotal ?? 0 },
          { label: "Emails Sent", value: data.marketing?.emailsSent ?? 0 },
          { label: "New Leads", value: t.leads ?? 0 },
          { label: "Saved Items", value: t.wishlist ?? 0 },
        ]
      : group === "audience"
      ? [
          { label: "Total Users", value: data.usersTotal },
          { label: "New Users", value: data.usersNew },
          { label: "Active (5 min)", value: data.usersActive },
          { label: "Chat Sessions", value: t.chatSessions ?? 0 },
        ]
      : [
          { label: "Total Clicks", value: t.clicks ?? 0 },
          { label: "Total Views", value: t.views ?? 0 },
          { label: "New Users", value: data.usersNew ?? 0 },
          { label: "New Leads", value: t.leads ?? 0 },
        ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Dashboard</p>
          <h1 className="serif text-4xl">Overview</h1>
          <p className="text-xs text-muted-foreground mt-2">
            Ringkasan seluruh fitur · {data.period?.from} → {data.period?.to}
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              <Filter size={13} /> Feature Group
            </label>
            <select value={group} onChange={(e) => setGroup(e.target.value as Group)}
              className="bg-background border border-border rounded px-3 py-2 text-sm min-w-[200px]">
              {GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Periode</label>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="bg-background border border-border rounded px-3 py-2 text-sm">
              <option value={7}>7 hari</option>
              <option value={30}>30 hari</option>
              <option value={90}>90 hari</option>
              <option value={365}>1 tahun</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {headline.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{s.label}</p>
            <p className="serif text-4xl">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Feature summary grid */}
      <h2 className="serif text-xl mb-4">Feature Summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} onClick={() => navigate(m.to)}
              className="bg-card border border-border rounded-lg p-5 cursor-pointer hover:border-foreground/40 transition-colors flex items-start gap-4">
              <span className="mt-1 text-muted-foreground"><Icon size={18} /></span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="serif text-lg">{m.label}</h3>
                  {"badge" in m && (m as any).badge > 0 && (
                    <span className="bg-foreground text-background text-[10px] rounded-full px-2 py-0.5 uppercase tracking-wider">
                      {(m as any).badge} New
                    </span>
                  )}
                </div>
                <p className="serif text-2xl mt-1">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.note}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {(group === "all" || group === "catalog" || group === "audience") && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="serif text-xl mb-4">Traffic Over Time</h2>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="clicks" name="Clicks" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground))" fillOpacity={0.12} />
                <Area type="monotone" dataKey="views" name="Views" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(group === "all" || group === "catalog") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <OverviewChart title="Top Items by Clicks" data={data.topItems} color="hsl(var(--foreground))" />
          <OverviewChart title="Top Collections by Clicks" data={data.topCollections} color="#b08d57" />
          <OverviewChart title="Top Catalogs by Clicks" data={data.topCatalogs} color="#8a8072" />
          <OverviewChart title="Top Projects by Clicks" data={data.topProjects} color="hsl(var(--accent))" />
        </div>
      )}

      {group === "marketing" && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="serif text-xl mb-4">Emails Sent Over Time</h2>
          <div style={{ width: "100%", height: 280 }}>
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
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Belum ada campaign pada periode ini.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewChart({ title, data, color }: any) {
  const hasData = Array.isArray(data) && data.length > 0;
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="serif text-xl mb-4">{title}</h2>
      <div style={{ width: "100%", height: 260 }}>
        {hasData ? (
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="title" hide />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="clicks" fill={color} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">
            Belum ada data klik pada periode ini.
          </div>
        )}
      </div>
    </div>
  );
}
