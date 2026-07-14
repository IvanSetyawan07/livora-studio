import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { PageBreadcrumb } from "@/components/livora/Breadcrumb";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";

type Kind = "theme" | "category" | "collection";

const KIND_LABEL: Record<Kind, string> = {
  theme: "Theme",
  category: "Category",
  collection: "Collection",
};

export default function FurnitureFilter() {
  const { kind, slug } = useParams<{ kind: Kind; slug: string }>();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kind || !slug) return;
    setLoading(true);
    api
      .get(`/items`, { params: { [kind]: slug } })
      .then((r) => setItems(r.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [kind, slug]);

  const title = useMemo(() => {
    if (!items.length || !kind) return slug ?? "";
    if (kind === "collection") return items[0]?.collection?.name ?? slug;
    const first = items[0];
    const list = kind === "theme" ? first?.themes : first?.categories;
    const match = (list ?? []).find((x: any) => x.slug === slug);
    return match?.name ?? slug;
  }, [items, kind, slug]);

  const kindLabel = kind ? KIND_LABEL[kind] : "";

  useEffect(() => {
    document.title = `${title} — LIVORA`;
  }, [title]);

  return (
    <>
      <Navbar />
      <main style={{ background: "#FFFFFF", paddingTop: 80, minHeight: "100vh" }}>
        <PageBreadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Furniture", to: "/furniture" },
            { label: `${kindLabel}: ${title}` },
          ]}
        />

        <section style={{ padding: "40px 60px 80px" }}>
          <p style={{ fontSize: 11, color: "#C9A97A", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12 }}>
            {kindLabel}
          </p>
          <h1 className="serif font-light" style={{ fontSize: 44, color: "#1A1A1A", lineHeight: 1.1, marginBottom: 8 }}>
            {title}
          </h1>
          <p style={{ fontSize: 13, color: "#9A9A9A", marginBottom: 40 }}>
            {loading ? "Loading…" : `${items.length} piece${items.length === 1 ? "" : "s"} found`}
          </p>

          {!loading && items.length === 0 && (
            <p style={{ fontSize: 14, color: "#5A5A5A" }}>Belum ada item untuk kategori ini.</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((it: any) => {
              const image = imgUrl(it.image);
              return (
                <Link
                  key={it.id}
                  to={`/items/${it.slug}`}
                  className="block group"
                  style={{
                    background: "#FAFAF8",
                    border: "1px solid #E8E4DF",
                    borderRadius: 10,
                    padding: 18,
                    textDecoration: "none",
                    transition: "all 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      height: 200,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      background: "#FFFFFF",
                      borderRadius: 6,
                    }}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={it.title}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                          transition: "transform 0.5s ease",
                        }}
                        className="group-hover:scale-105"
                      />
                    ) : (
                      <ItemIllustration name={it.title} />
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: "#1A1A1A", marginTop: 14 }}>{it.title}</p>
                  {it.code && (
                    <p style={{ fontSize: 11, color: "#9A9A9A", letterSpacing: "0.15em", marginTop: 4 }}>{it.code}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
