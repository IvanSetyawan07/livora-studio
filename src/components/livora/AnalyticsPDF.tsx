import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { padding: 44, fontFamily: "Helvetica", color: "#1c1c1c", backgroundColor: "#f7f1e8" },
  eyebrow: { fontSize: 8, letterSpacing: 3, textTransform: "uppercase", color: "#8a8072", marginBottom: 6 },
  title: { fontFamily: "Times-Roman", fontSize: 28, marginBottom: 4 },
  sub: { fontSize: 10, color: "#6f665a", marginBottom: 18 },
  section: { marginBottom: 20 },
  h2: { fontFamily: "Times-Roman", fontSize: 14, marginBottom: 10, borderBottom: 1, borderColor: "#d9cfbf", paddingBottom: 4 },
  row: { flexDirection: "row", paddingVertical: 4.5, borderBottom: 0.5, borderColor: "#e3d9c9" },
  headRow: { flexDirection: "row", paddingVertical: 5, borderBottom: 1, borderColor: "#1c1c1c" },
  th: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: "#6f665a" },
  td: { fontSize: 9.5 },
  c1: { flex: 3 }, c2: { flex: 1.5 }, c3: { flex: 1, textAlign: "right" }, c4: { flex: 1, textAlign: "right" },
  kpiWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 18 },
  kpi: { width: "25%", paddingRight: 10, marginBottom: 12 },
  kpiLabel: { fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a8072", marginBottom: 3 },
  kpiValue: { fontFamily: "Times-Roman", fontSize: 20 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  barLabel: { fontSize: 8.5, width: 130, color: "#3b3730" },
  barTrack: { flex: 1, height: 9, backgroundColor: "#e8dfd0", borderRadius: 2 },
  barFill: { height: 9, borderRadius: 2 },
  barValue: { fontSize: 8.5, width: 34, textAlign: "right" },
  spark: { flexDirection: "row", alignItems: "flex-end", height: 90, borderBottom: 0.7, borderColor: "#cbbfa9", marginBottom: 4 },
  sparkCol: { flex: 1, marginHorizontal: 0.7 },
  caption: { fontSize: 7.5, color: "#8a8072" },
  footer: { position: "absolute", bottom: 22, left: 44, right: 44, fontSize: 7.5, color: "#8a8072", letterSpacing: 2, textTransform: "uppercase", textAlign: "center" },
});

function fmtSec(v: number) {
  if (!v) return "0s";
  const m = Math.floor(v / 60);
  return m > 0 ? `${m}m ${Math.round(v % 60)}s` : `${Math.round(v)}s`;
}

function BarList({ rows, valueKey = "clicks", labelKey = "title", color = "#1c1c1c" }: any) {
  const list = (rows ?? []).slice(0, 10);
  if (!list.length) return <Text style={{ fontSize: 9, color: "#8a8072" }}>No data in this period.</Text>;
  const max = Math.max(...list.map((r: any) => Number(r[valueKey]) || 0), 1);
  return (
    <View>
      {list.map((r: any, i: number) => (
        <View key={i} style={s.barRow}>
          <Text style={s.barLabel}>{String(r[labelKey] ?? "—").slice(0, 30)}</Text>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${((Number(r[valueKey]) || 0) / max) * 100}%`, backgroundColor: color }]} />
          </View>
          <Text style={s.barValue}>{r[valueKey]}</Text>
        </View>
      ))}
    </View>
  );
}

function Sparkline({ data, keyName, color = "#1c1c1c", label }: any) {
  const list = (data ?? []).slice(-60);
  const max = Math.max(...list.map((d: any) => Number(d[keyName]) || 0), 1);
  if (!list.length) return <Text style={{ fontSize: 9, color: "#8a8072" }}>No data in this period.</Text>;
  return (
    <View>
      <View style={s.spark}>
        {list.map((d: any, i: number) => (
          <View key={i} style={s.sparkCol}>
            <View style={{ height: Math.max(1, ((Number(d[keyName]) || 0) / max) * 88), backgroundColor: color }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={s.caption}>{list[0]?.date}</Text>
        <Text style={s.caption}>{label} · peak {max}</Text>
        <Text style={s.caption}>{list[list.length - 1]?.date}</Text>
      </View>
    </View>
  );
}

function Kpis({ items }: { items: { label: string; value: any }[] }) {
  return (
    <View style={s.kpiWrap}>
      {items.map((k) => (
        <View key={k.label} style={s.kpi}>
          <Text style={s.kpiLabel}>{k.label}</Text>
          <Text style={s.kpiValue}>{k.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AnalyticsPDF({
  overview, users, scope = "all",
}: { overview: any; users: any[]; scope?: string }) {
  const date = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  const p = overview?.period ?? {};
  const t = overview?.totals ?? {};
  const showCatalog = scope === "all" || scope === "catalog";
  const showMarketing = scope === "all" || scope === "marketing";
  const showAudience = scope === "all" || scope === "audience";
  const scopeLabel =
    scope === "catalog" ? "Catalog & Collection Report"
    : scope === "marketing" ? "Marketing & Ads Report"
    : scope === "audience" ? "Audience Report"
    : "Full Performance Report";

  return (
    <Document>
      {/* ---- Cover / summary ---- */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>Livora · Analytics</Text>
        <Text style={s.title}>{scopeLabel}</Text>
        <Text style={s.sub}>
          Reporting period {p.from ?? "—"} → {p.to ?? "—"} ({p.days ?? 0} days) · Generated {date}
        </Text>

        <Kpis items={[
          { label: "Total Clicks", value: t.clicks ?? 0 },
          { label: "Total Views", value: t.views ?? 0 },
          { label: "Avg. Duration", value: fmtSec(t.avgDuration ?? 0) },
          { label: "New Users", value: overview?.usersNew ?? 0 },
          { label: "Total Users", value: overview?.usersTotal ?? 0 },
          { label: "New Leads", value: t.leads ?? 0 },
          { label: "Saved Items", value: t.wishlist ?? 0 },
          { label: "Emails Sent", value: overview?.marketing?.emailsSent ?? 0 },
        ]} />

        <View style={s.section}>
          <Text style={s.h2}>Daily Clicks</Text>
          <Sparkline data={overview?.timeline} keyName="clicks" color="#1c1c1c" label="Clicks" />
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Daily Views</Text>
          <Sparkline data={overview?.timeline} keyName="views" color="#b08d57" label="Views" />
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Content Inventory</Text>
          <View style={s.headRow}>
            <Text style={[s.th, s.c1]}>Feature</Text>
            <Text style={[s.th, s.c3]}>Published</Text>
          </View>
          {Object.entries(overview?.inventory ?? {}).map(([k, v]) => (
            <View key={k} style={s.row}>
              <Text style={[s.td, s.c1]}>{k}</Text>
              <Text style={[s.td, s.c3]}>{String(v)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.footer}>Livora — PT. Langgeng Cipta Ruang</Text>
      </Page>

      {/* ---- Catalog performance ---- */}
      {showCatalog && (
        <Page size="A4" style={s.page}>
          <Text style={s.eyebrow}>Catalog & Collection</Text>
          <Text style={s.title}>Content Performance</Text>
          <Text style={s.sub}>{p.from} → {p.to}</Text>

          <View style={s.section}>
            <Text style={s.h2}>Top Items by Clicks</Text>
            <BarList rows={overview?.topItems} color="#1c1c1c" />
          </View>
          <View style={s.section}>
            <Text style={s.h2}>Top Collections by Clicks</Text>
            <BarList rows={overview?.topCollections} color="#b08d57" />
          </View>
          <View style={s.section}>
            <Text style={s.h2}>Top Catalogs by Clicks</Text>
            <BarList rows={overview?.topCatalogs} color="#8a8072" />
          </View>
          <View style={s.section}>
            <Text style={s.h2}>Top Projects by Clicks</Text>
            <BarList rows={overview?.topProjects} color="#5c5449" />
          </View>

          <Text style={s.footer}>Livora — PT. Langgeng Cipta Ruang</Text>
        </Page>
      )}

      {showCatalog && (
        <Page size="A4" style={s.page}>
          <Text style={s.eyebrow}>Engagement</Text>
          <Text style={s.title}>Views & Dwell Time</Text>
          <Text style={s.sub}>{p.from} → {p.to}</Text>

          <View style={s.headRow}>
            <Text style={[s.th, s.c1]}>Content</Text>
            <Text style={[s.th, s.c2]}>Type</Text>
            <Text style={[s.th, s.c3]}>Views</Text>
            <Text style={[s.th, s.c4]}>Avg</Text>
            <Text style={[s.th, s.c4]}>Total</Text>
          </View>
          {(overview?.viewStats ?? []).slice(0, 25).map((v: any, i: number) => (
            <View key={i} style={s.row}>
              <Text style={[s.td, s.c1]}>{v.title ?? `#${v.target_id}`}</Text>
              <Text style={[s.td, s.c2]}>{v.target_type}</Text>
              <Text style={[s.td, s.c3]}>{v.views}</Text>
              <Text style={[s.td, s.c4]}>{fmtSec(v.avg_seconds)}</Text>
              <Text style={[s.td, s.c4]}>{fmtSec(v.total_seconds)}</Text>
            </View>
          ))}
          {!(overview?.viewStats ?? []).length && (
            <Text style={{ fontSize: 9, color: "#8a8072", marginTop: 8 }}>No data in this period.</Text>
          )}
          <Text style={s.footer}>Livora — PT. Langgeng Cipta Ruang</Text>
        </Page>
      )}

      {/* ---- Marketing ---- */}
      {showMarketing && (
        <Page size="A4" style={s.page}>
          <Text style={s.eyebrow}>Marketing & Ads</Text>
          <Text style={s.title}>Campaign Performance</Text>
          <Text style={s.sub}>{p.from} → {p.to}</Text>

          <Kpis items={[
            { label: "Campaigns", value: overview?.marketing?.campaignsTotal ?? 0 },
            { label: "Emails Sent", value: overview?.marketing?.emailsSent ?? 0 },
            { label: "New Leads", value: t.leads ?? 0 },
            { label: "Chat Sessions", value: t.chatSessions ?? 0 },
          ]} />

          <View style={s.section}>
            <Text style={s.h2}>Emails Sent per Day</Text>
            <Sparkline data={overview?.marketing?.timeline} keyName="sent" color="#b08d57" label="Emails" />
          </View>

          <View style={s.section}>
            <Text style={s.h2}>Leads by Stage</Text>
            <BarList rows={overview?.leads?.byStatus} valueKey="total" labelKey="status" color="#5c5449" />
          </View>

          <View style={s.section}>
            <Text style={s.h2}>Campaign Log</Text>
            <View style={s.headRow}>
              <Text style={[s.th, s.c1]}>Campaign</Text>
              <Text style={[s.th, s.c2]}>Status</Text>
              <Text style={[s.th, s.c3]}>Sent</Text>
              <Text style={[s.th, s.c4]}>Date</Text>
            </View>
            {(overview?.marketing?.campaigns ?? []).map((c: any) => (
              <View key={c.id} style={s.row}>
                <Text style={[s.td, s.c1]}>{c.name ?? c.subject ?? "—"}</Text>
                <Text style={[s.td, s.c2]}>{c.status}</Text>
                <Text style={[s.td, s.c3]}>{c.sent_count}</Text>
                <Text style={[s.td, s.c4]}>{String(c.sent_at ?? c.created_at ?? "").slice(0, 10)}</Text>
              </View>
            ))}
            {!(overview?.marketing?.campaigns ?? []).length && (
              <Text style={{ fontSize: 9, color: "#8a8072", marginTop: 8 }}>No campaigns in this period.</Text>
            )}
          </View>

          <Text style={s.footer}>Livora — PT. Langgeng Cipta Ruang</Text>
        </Page>
      )}

      {/* ---- Audience ---- */}
      {showAudience && (
        <Page size="A4" style={s.page}>
          <Text style={s.eyebrow}>Audience</Text>
          <Text style={s.title}>Users & Activity</Text>
          <Text style={s.sub}>{users.length} tracked users · {overview?.usersNew ?? 0} new this period</Text>

          <View style={s.headRow}>
            <Text style={[s.th, s.c1]}>Name</Text>
            <Text style={[s.th, s.c1]}>Email</Text>
            <Text style={[s.th, s.c2]}>Role</Text>
            <Text style={[s.th, s.c2]}>Status</Text>
          </View>
          {users.map((u) => (
            <View key={u.id} style={s.row}>
              <Text style={[s.td, s.c1]}>{u.name || "—"}</Text>
              <Text style={[s.td, s.c1]}>{u.email}</Text>
              <Text style={[s.td, s.c2]}>{u.role}</Text>
              <Text style={[s.td, s.c2]}>{u.is_online ? "Online" : "Offline"}</Text>
            </View>
          ))}

          <Text style={s.footer}>Livora — PT. Langgeng Cipta Ruang</Text>
        </Page>
      )}
    </Document>
  );
}
