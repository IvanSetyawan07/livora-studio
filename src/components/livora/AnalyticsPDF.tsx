import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", color: "#1c1c1c", backgroundColor: "#f7f1e8" },
  eyebrow: { fontSize: 8, letterSpacing: 3, textTransform: "uppercase", color: "#8a8072", marginBottom: 6 },
  title: { fontFamily: "Times-Roman", fontSize: 28, marginBottom: 4 },
  sub: { fontSize: 10, color: "#6f665a", marginBottom: 24 },
  section: { marginBottom: 22 },
  h2: { fontFamily: "Times-Roman", fontSize: 15, marginBottom: 10, borderBottom: 1, borderColor: "#d9cfbf", paddingBottom: 4 },
  row: { flexDirection: "row", paddingVertical: 5, borderBottom: 0.5, borderColor: "#e3d9c9" },
  headRow: { flexDirection: "row", paddingVertical: 5, borderBottom: 1, borderColor: "#1c1c1c" },
  th: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: "#6f665a" },
  td: { fontSize: 10 },
  c1: { flex: 3 }, c2: { flex: 1.5 }, c3: { flex: 1, textAlign: "right" }, c4: { flex: 1, textAlign: "right" },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, fontSize: 8, color: "#8a8072", letterSpacing: 2, textTransform: "uppercase", textAlign: "center" },
});

function fmtSec(s: number) {
  if (!s) return "0s";
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
}

export default function AnalyticsPDF({ overview, users }: { overview: any; users: any[] }) {
  const date = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>Livora · Analytics Report</Text>
        <Text style={s.title}>Performance Overview</Text>
        <Text style={s.sub}>Generated {date}</Text>

        <View style={s.section}>
          <Text style={s.h2}>Top Items by Clicks</Text>
          <View style={s.headRow}>
            <Text style={[s.th, s.c1]}>Item</Text>
            <Text style={[s.th, s.c3]}>Clicks</Text>
          </View>
          {(overview?.topItems || []).map((it: any, i: number) => (
            <View key={i} style={s.row}>
              <Text style={[s.td, s.c1]}>{it.title}</Text>
              <Text style={[s.td, s.c3]}>{it.clicks}</Text>
            </View>
          ))}
          {(!overview?.topItems || overview.topItems.length === 0) && (
            <Text style={{ fontSize: 10, color: "#8a8072", marginTop: 8 }}>No data yet.</Text>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Top Projects by Clicks</Text>
          <View style={s.headRow}>
            <Text style={[s.th, s.c1]}>Project</Text>
            <Text style={[s.th, s.c3]}>Clicks</Text>
          </View>
          {(overview?.topProjects || []).map((it: any, i: number) => (
            <View key={i} style={s.row}>
              <Text style={[s.td, s.c1]}>{it.title}</Text>
              <Text style={[s.td, s.c3]}>{it.clicks}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Engagement</Text>
          <View style={s.headRow}>
            <Text style={[s.th, s.c1]}>Type / ID</Text>
            <Text style={[s.th, s.c2]}>Views</Text>
            <Text style={[s.th, s.c3]}>Avg time</Text>
            <Text style={[s.th, s.c4]}>Total</Text>
          </View>
          {(overview?.viewStats || []).slice(0, 20).map((v: any, i: number) => (
            <View key={i} style={s.row}>
              <Text style={[s.td, s.c1]}>{v.target_type} #{v.target_id}</Text>
              <Text style={[s.td, s.c2]}>{v.views}</Text>
              <Text style={[s.td, s.c3]}>{fmtSec(v.avg_seconds)}</Text>
              <Text style={[s.td, s.c4]}>{fmtSec(v.total_seconds)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.footer}>Livora — Design PT. Langgeng Cipta Ruango</Text>
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>Users</Text>
        <Text style={s.title}>Active Audience</Text>
        <Text style={s.sub}>{users.length} registered users</Text>

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
    </Document>
  );
}
