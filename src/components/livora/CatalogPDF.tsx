import {
  Document,
  Page,
  Text,
  View,
  Image as PdfImage,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

export type CatalogPDFData = {
  title: string;
  tagline?: string;
  category?: string;
  aboutTitle?: string;
  aboutBody?: string;
  coverImage?: string;
  scenes?: { image?: string; alt?: string }[];
  items?: { title: string; image?: string; category?: string; slug?: string }[];
};

const styles = StyleSheet.create({
  page: { backgroundColor: "#F7F5F0", padding: 0, fontFamily: "Helvetica", color: "#1a1a1a" },
  cover: { height: "100%", justifyContent: "space-between", padding: 48 },
  coverTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 14, letterSpacing: 4, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 8, letterSpacing: 2, color: "#555" },
  coverImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.35 },
  coverBottom: {},
  category: { fontSize: 9, letterSpacing: 3, color: "#8B7355", marginBottom: 16 },
  title: { fontSize: 44, fontFamily: "Times-Roman", lineHeight: 1.1, marginBottom: 12 },
  tagline: { fontSize: 12, color: "#333", maxWidth: 380, lineHeight: 1.5 },
  section: { padding: 48 },
  h1: { fontSize: 22, fontFamily: "Times-Roman", marginBottom: 4 },
  eyebrow: { fontSize: 8, letterSpacing: 3, color: "#8B7355", marginBottom: 10 },
  body: { fontSize: 10.5, lineHeight: 1.65, color: "#333" },
  divider: { height: 1, backgroundColor: "#d9d2c5", marginVertical: 20 },
  sceneImg: { width: "100%", height: 360, objectFit: "cover", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  card: { width: "50%", padding: 6 },
  cardInner: { backgroundColor: "#fff", padding: 10 },
  cardImg: { width: "100%", height: 150, objectFit: "cover", marginBottom: 8 },
  cardTitle: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  cardCat: { fontSize: 8, color: "#8B7355", letterSpacing: 1.5, marginTop: 2 },
  footer: { position: "absolute", bottom: 20, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#888", letterSpacing: 1.5 },
});

const safe = (src?: string) => (src && /^https?:\/\//.test(src) ? src : undefined);

const Footer = ({ page, total }: { page: number; total: number }) => (
  <View style={styles.footer} fixed>
    <Text>LIVORA · CATALOG</Text>
    <Text>{`${page} / ${total}`}</Text>
  </View>
);

export function CatalogPDFDocument({ data }: { data: CatalogPDFData }) {
  const items = data.items ?? [];
  const scenes = (data.scenes ?? []).filter((s) => safe(s.image));
  const itemsPerPage = 6;
  const itemPages: typeof items[] = [];
  for (let i = 0; i < items.length; i += itemsPerPage) itemPages.push(items.slice(i, i + itemsPerPage));
  const total = 1 + (data.aboutBody ? 1 : 0) + scenes.length + itemPages.length;

  let page = 0;
  const next = () => ++page;

  return (
    <Document title={data.title} author="Livora">
      {/* Cover */}
      <Page size="A4" style={styles.page}>
        {safe(data.coverImage) && <PdfImage src={safe(data.coverImage)!} style={styles.coverImg} />}
        <View style={styles.cover}>
          <View style={styles.coverTop}>
            <Text style={styles.brand}>LIVORA</Text>
            <Text style={styles.meta}>CATALOG · {new Date().getFullYear()}</Text>
          </View>
          <View style={styles.coverBottom}>
            {data.category && <Text style={styles.category}>{data.category.toUpperCase()}</Text>}
            <Text style={styles.title}>{data.title}</Text>
            {data.tagline && <Text style={styles.tagline}>{data.tagline}</Text>}
          </View>
        </View>
        <Footer page={next()} total={total} />
      </Page>

      {/* About */}
      {data.aboutBody && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.eyebrow}>ABOUT</Text>
            <Text style={styles.h1}>{data.aboutTitle || "About this collection"}</Text>
            <View style={styles.divider} />
            <Text style={styles.body}>{data.aboutBody}</Text>
          </View>
          <Footer page={next()} total={total} />
        </Page>
      )}

      {/* Scenes */}
      {scenes.map((s, i) => (
        <Page key={`scene-${i}`} size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.eyebrow}>SCENE {String(i + 1).padStart(2, "0")}</Text>
            <Text style={styles.h1}>{data.title}</Text>
            <View style={styles.divider} />
            <PdfImage src={safe(s.image)!} style={styles.sceneImg} />
            {s.alt && <Text style={styles.body}>{s.alt}</Text>}
          </View>
          <Footer page={next()} total={total} />
        </Page>
      ))}

      {/* Items grid */}
      {itemPages.map((chunk, pi) => (
        <Page key={`items-${pi}`} size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.eyebrow}>ITEMS IN THIS COLLECTION</Text>
            <Text style={styles.h1}>Curated pieces</Text>
            <View style={styles.divider} />
            <View style={styles.grid}>
              {chunk.map((it, i) => (
                <View key={i} style={styles.card} wrap={false}>
                  <View style={styles.cardInner}>
                    {safe(it.image) && <PdfImage src={safe(it.image)!} style={styles.cardImg} />}
                    <Text style={styles.cardTitle}>{it.title}</Text>
                    {it.category && <Text style={styles.cardCat}>{it.category.toUpperCase()}</Text>}
                  </View>
                </View>
              ))}
            </View>
          </View>
          <Footer page={next()} total={total} />
        </Page>
      ))}
    </Document>
  );
}

export async function downloadCatalogPDF(data: CatalogPDFData) {
  const blob = await pdf(<CatalogPDFDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(data.title || "catalog").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
