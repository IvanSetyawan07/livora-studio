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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
            {items.map((it: any) => {
              const image = imgUrl(it.image);
              return (
                <Link
                  key={it.id}
                  to={`/items/${it.slug}`}
                  className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div
                    className="item-card"
                    style={{
                      background: "#FAFAF8",
                      border: "1px solid #E8E4DF",
                      borderRadius: "10px",
                      overflow: "hidden",
                      aspectRatio: "31 / 20",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#C9A97A";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(201,169,122,0.12)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E8E4DF";
                      e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.04)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={it.title}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-2/3 h-2/3 transition-transform duration-500 group-hover:scale-105">
                        <ItemIllustration name={it.title} size={260} />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 px-1">
                    <h3 className="text-sm font-normal text-foreground leading-snug">{it.title}</h3>
                    {it.code && (
                      <p className="text-[11px] uppercase tracking-[0.15em] text-foreground/50 mt-1">{it.code}</p>
                    )}
                  </div>
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