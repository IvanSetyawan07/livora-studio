import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { PageBreadcrumb } from "@/components/livora/Breadcrumb";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { PromoBadge, PromoPriceTag } from "@/components/livora/PromoPriceTag";
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
      <main className="bg-background min-h-screen">
        <PageBreadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Furniture", to: "/furniture" },
            { label: `${kindLabel}: ${title}` },
          ]}
        />

        <section className="container-livora py-8 md:py-14">
          <p className="text-[11px] text-[#C9A97A] tracking-[0.25em] uppercase mb-2 md:mb-3">
            {kindLabel}
          </p>
          <h1 className="serif font-light text-3xl sm:text-4xl md:text-5xl text-[#1A1A1A] leading-[1.1] mb-2">
            {title}
          </h1>
          <p className="text-[13px] text-[#9A9A9A] mb-8 md:mb-10">
            {loading ? "Loading…" : `${items.length} piece${items.length === 1 ? "" : "s"} found`}
          </p>

          {!loading && items.length === 0 && (
            <p className="text-sm text-[#5A5A5A]">Belum ada item untuk kategori ini.</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-5 gap-y-8 sm:gap-y-10">
            {items.map((it: any) => {
              const image = imgUrl(it.image);
              return (
                <Link
                  key={it.id}
                  to={`/items/${it.slug}`}
                  className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div
                    className="item-card active:scale-[0.98] relative"
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
                  >
                    {it.is_on_promo && (
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <PromoBadge text={it.promo_badge_text || "PROMO"} />
                      </div>
                    )}
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