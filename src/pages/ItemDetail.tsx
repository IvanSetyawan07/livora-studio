import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { PageBreadcrumb } from "@/components/livora/Breadcrumb";
import { Footer } from "@/components/livora/Footer";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { items } from "@/data/items";
import { useItemBySlug, type FurnitureVariant, type GalleryImage } from "@/lib/itemsApi";
import { useProjectBySlug } from "@/lib/projectsApi";
import { trackClick, trackView } from "@/lib/adminApi";

const GOLD = "#C9A97A";

const ItemDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectSlug = searchParams.get("from");
  const { project } = useProjectBySlug(projectSlug ?? undefined);
  const { item, loading } = useItemBySlug(slug);

  const [activeVariantId, setActiveVariantId] = useState<number | null>(null);
  const [sheetCategory, setSheetCategory] = useState<string | null>(null);

  // Reset variant when item loads
  useEffect(() => {
    if (item?.variants && item.variants.length > 0) {
      setActiveVariantId(item.variants[0].id);
    } else {
      setActiveVariantId(null);
    }
  }, [item?.apiId]);

  // SEO
  useEffect(() => {
    if (!item) return;
    document.title = `${item.name} — LIVORA`;
    const meta =
      document.querySelector('meta[name="description"]') ??
      (() => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
        return m;
      })();
    meta.setAttribute(
      "content",
      `${item.name} (${item.code}) — ${item.category} by LIVORA. ${item.specs.material}.`,
    );
    window.scrollTo(0, 0);
  }, [item]);

  // Analytics
  const startRef = useRef<number>(Date.now());
  useEffect(() => {
    const id = item?.apiId;
    if (!id) return;
    startRef.current = Date.now();
    trackClick("item", id);
    return () => {
      const sec = Math.round((Date.now() - startRef.current) / 1000);
      trackView("item", id, sec);
    };
  }, [item?.apiId]);

  // Active variant
  const activeVariant: FurnitureVariant | null = useMemo(
    () => item?.variants?.find((v) => v.id === activeVariantId) ?? null,
    [item, activeVariantId],
  );

  // Gallery (item-level) — shown BELOW the main product image, not overlapping it
  const galleryImages: GalleryImage[] = useMemo(() => item?.gallery ?? [], [item]);

  // Main image is driven ONLY by the selected variant (or item default).
  // Gallery no longer hijacks the main image.
  const mainImage =
    activeVariant?.furniture_image ||
    activeVariant?.preview_image ||
    item?.image ||
    "";

  // Group variants by category (fabric | leather | wood | metal | marble | other)
  const variantGroups = useMemo(() => {
    const groups: Record<string, FurnitureVariant[]> = {};
    (item?.variants ?? []).forEach((v) => {
      if (!v.is_active) return;
      (groups[v.category] ||= []).push(v);
    });
    return groups;
  }, [item]);

  // For a given category, the currently selected variant (or first as fallback)
  const selectedByCategory = (cat: string): FurnitureVariant | undefined => {
    const list = variantGroups[cat] ?? [];
    return list.find((v) => v.id === activeVariantId) ?? list[0];
  };

  if (!item) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="serif text-4xl font-light mb-4">
            {loading ? "Loading…" : "Item not found"}
          </p>
          <Link to="/" className="text-xs uppercase tracking-[0.3em] underline-grow">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const related = (item.related && item.related.length > 0
    ? item.related
    : items.filter((i) => i.slug !== item.slug).slice(0, 5));

  const goldLabel: React.CSSProperties = {
    color: GOLD,
    fontSize: "10px",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
  };

  return (
    <>
      <Navbar />
      <main style={{ background: "#FFFFFF", paddingTop: "80px" }}>
        <PageBreadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Projects", to: "/projects" },
            ...(project ? [{ label: project.name, to: `/projects/${project.slug}` }] : []),
            { label: item.name },
          ]}
        />

        {/* MAIN SPLIT — image only (no gallery overlay) + configurator */}
        <section className="grid grid-cols-1 md:grid-cols-[55%_45%]">
          {/* LEFT: main product image (controlled by variant only) */}
          <div style={{ background: "#ffffff", padding: "60px" }}>
            <div
              className="relative"
              style={{
                border: "1px solid #E8E4DF",
                borderRadius: "12px",
                background: "#FFFFFF",
                aspectRatio: "1 / 1",
                overflow: "hidden",
              }}
            >
              {mainImage ? (
                <img
                  key={mainImage}
                  src={mainImage}
                  alt={item.name}
                  className="animate-fade-in"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ItemIllustration name={item.name} size={280} strokeWidth={1.1} />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: details + configurator */}
          <div style={{ background: "#FFFFFF", padding: "60px 48px" }}>
            <span
              style={{
                display: "inline-block",
                background: "#F5EFE8",
                color: GOLD,
                fontSize: "10px",
                letterSpacing: "0.15em",
                padding: "4px 12px",
                borderRadius: "20px",
                textTransform: "uppercase",
              }}
            >
              {item.collection?.name ?? item.category}
            </span>

            <h1
              className="serif font-light"
              style={{ fontSize: "40px", color: "#1A1A1A", marginTop: "20px", lineHeight: 1.1 }}
            >
              {item.name}
            </h1>
            <p style={{ fontSize: "12px", color: "#9A9A9A", letterSpacing: "0.2em", marginTop: "8px" }}>
              {item.code}
            </p>

            {activeVariant?.description && (
              <p key={activeVariant.id} className="animate-fade-in" style={{ fontSize: 14, color: "#5A5A5A", marginTop: 16, lineHeight: 1.7 }}>
                {activeVariant.description}
              </p>
            )}

            <div className="h-px w-full bg-[#1A1A1A]/10" style={{ margin: "28px 0" }} />

            {/* CHOOSE YOUR DESIGN — one clickable ROW per category (BoConcept style) */}
            {Object.keys(variantGroups).length > 0 ? (
              <div>
                <h2 className="serif font-light" style={{ fontSize: 22, color: "#1A1A1A", marginBottom: 18 }}>
                  Choose Your Design
                </h2>

                <div className="flex flex-col gap-3">
                  {Object.entries(variantGroups).map(([cat, vs]) => {
                    const sel = selectedByCategory(cat);
                    const extra = Math.max(0, vs.length - 1);
                    const isActiveCat = sel?.id === activeVariantId;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSheetCategory(cat)}
                        className="group w-full text-left transition-all hover:border-[color:var(--gold)]"
                        style={
                          {
                            ["--gold" as any]: GOLD,
                            border: `1.5px solid ${isActiveCat ? GOLD : "#E2DED8"}`,
                            borderRadius: 10,
                            padding: "14px 16px",
                            background: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                          } as React.CSSProperties
                        }
                      >
                        {/* Swatch / preview */}
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            overflow: "hidden",
                            flexShrink: 0,
                            background: "#F5EFE8",
                            border: "1px solid #E8E4DF",
                          }}
                        >
                          {sel?.preview_image && (
                            <img
                              src={sel.preview_image}
                              alt={sel.variant_name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          )}
                        </div>

                        {/* Labels */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, color: "#8A8A8A", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                            {cat}
                          </p>
                          <p
                            style={{
                              fontSize: 14,
                              color: "#1A1A1A",
                              marginTop: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {sel?.variant_name ?? "Select"}
                            {sel?.color_name ? ` — ${sel.color_name}` : ""}
                          </p>
                        </div>

                        {/* +N count */}
                        {extra > 0 && (
                          <span style={{ fontSize: 12, color: "#5A5A5A" }}>+ {extra}</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#9A9A9A] group-hover:text-[#1A1A1A] transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <p style={goldLabel}>Texture</p>
                <p style={{ fontSize: 14, color: "#1A1A1A", marginTop: 6, marginBottom: 20 }}>
                  {item.textures.join(", ")}
                </p>
                <p style={goldLabel}>Finish</p>
                <p style={{ fontSize: 14, color: "#1A1A1A", marginTop: 6, marginBottom: 20 }}>
                  {item.specs.finish}
                </p>
              </div>
            )}

            <div className="h-px w-full bg-[#1A1A1A]/10" style={{ margin: "28px 0" }} />

            <p style={goldLabel}>Availability</p>
            <p style={{ fontSize: 14, color: "#1A1A1A", marginTop: 6 }}>{item.specs.availability}</p>

            <button
              onClick={() => navigate(-1)}
              className="mt-10 uppercase hover:opacity-70 transition-opacity"
              style={{
                color: GOLD, background: "none", border: "none",
                fontSize: 12, letterSpacing: "0.1em", padding: 0, cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </div>
        </section>

        {/* GALLERY — placed BELOW the main item image (BoConcept-style grid) */}
        {galleryImages.length > 0 && (
          <section style={{ background: "#FAFAF8", padding: "0 60px 60px" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-none">
              {galleryImages.map((g) => (
                <figure
                  key={g.id}
                  className="overflow-hidden rounded-lg"
                  style={{ background: "#FFFFFF", border: "1px solid #E8E4DF" }}
                >
                  <img
                    src={g.image}
                    alt={g.alt_text ?? g.title ?? item.name}
                    style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
                  />
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* LIFESTYLE — Furniture In Real Spaces */}
        {item.lifestyle && item.lifestyle.length > 0 && (
          <section style={{ padding: "80px 60px", background: "#FFFFFF" }}>
            <h2 className="serif font-light text-center" style={{ fontSize: 32, color: "#1A1A1A", marginBottom: 8 }}>
              Furniture In Real Spaces
            </h2>
            <p className="text-center" style={{ fontSize: 13, color: "#9A9A9A", letterSpacing: "0.1em", marginBottom: 48 }}>
              Inspired settings featuring this design.
            </p>
            <div className="flex flex-wrap gap-4 max-w-7xl mx-auto">
              {item.lifestyle.map((l) => {
                const w =
                  l.layout_type === "full" ? 100 :
                  l.layout_type === "half" ? 50 :
                  l.width_percentage || 50;
                return (
                  <figure
                    key={l.id}
                    className="overflow-hidden rounded-lg group"
                    style={{ width: `calc(${w}% - 1rem)`, minWidth: 240 }}
                  >
                    <div className="overflow-hidden rounded-lg">
                      <img
                        src={l.image}
                        alt={l.caption ?? ""}
                        className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                        style={{ display: "block" }}
                      />
                    </div>
                    {l.caption && (
                      <figcaption style={{ fontSize: 12, color: "#9A9A9A", marginTop: 10, letterSpacing: "0.05em" }}>
                        {l.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </section>
        )}

        {/* STORY */}
        {item.story && (item.story.title || item.story.description || item.story.feature_image) && (
          <section style={{ padding: "80px 60px", background: "#FAFAF8" }}>
            <div className="max-w-4xl mx-auto text-center mb-12">
              {item.story.title && (
                <h2 className="serif font-light" style={{ fontSize: 36, color: "#1A1A1A", marginBottom: 16, lineHeight: 1.2 }}>
                  {item.story.title}
                </h2>
              )}
              {item.story.description && (
                <p style={{ fontSize: 15, color: "#5A5A5A", lineHeight: 1.8, maxWidth: 680, margin: "0 auto" }}>
                  {item.story.description}
                </p>
              )}
            </div>

            {item.story.feature_image && (
              <div className="max-w-6xl mx-auto mb-16 overflow-hidden rounded-xl">
                <img src={item.story.feature_image} alt={item.story.title ?? ""} className="w-full h-auto" />
              </div>
            )}

            {item.story.cards && item.story.cards.length > 0 && (
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {item.story.cards.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E8E4DF",
                      borderRadius: 12,
                      padding: 28,
                    }}
                  >
                    <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
                      {c.icon ?? "Detail"}
                    </p>
                    <h3 className="serif" style={{ fontSize: 20, color: "#1A1A1A", marginBottom: 10, lineHeight: 1.3 }}>
                      {c.title}
                    </h3>
                    {c.description && (
                      <p style={{ fontSize: 13, color: "#7A7A7A", lineHeight: 1.7 }}>{c.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* RELATED / COLLECTION */}
        <section style={{ background: "#FFFFFF", padding: "80px 60px" }}>
          <h2 className="serif font-light" style={{ fontSize: 28, color: "#1A1A1A", marginBottom: 8 }}>
            {item.collection ? `Explore the ${item.collection.name} Collection` : "You May Also Like"}
          </h2>
          <p style={{ fontSize: 13, color: "#9A9A9A", letterSpacing: "0.05em", marginBottom: 32 }}>
            {item.collection ? "Pieces designed to live in harmony." : "Curated picks from our catalogue."}
          </p>

          <div className="flex gap-5 overflow-x-auto pt-4 pb-6 -mx-2 px-2" style={{ scrollbarGutter: "stable" }}>
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/items/${r.slug}${projectSlug ? `?from=${projectSlug}` : ""}`}
                className="item-card"
                style={{
                  flex: "0 0 240px",
                  background: "#FAFAF8",
                  border: "1px solid #E8E4DF",
                  borderRadius: 10,
                  padding: "20px 16px",
                  textAlign: "center",
                  textDecoration: "none",
                  transition: "all 0.3s ease",
                  display: "block",
                }}
              >
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#FFFFFF", borderRadius: 6 }}>
                  {r.image ? (
                    <img src={r.image} alt={r.name} style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain" }} />
                  ) : (
                    <ItemIllustration name={r.name} />
                  )}
                </div>
                <p style={{ fontSize: 13, color: "#1A1A1A", letterSpacing: "0.05em", marginTop: 16 }}>{r.name}</p>
                {r.code && (
                  <p style={{ fontSize: 11, color: "#9A9A9A", letterSpacing: "0.15em", marginTop: 4 }}>{r.code}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* SLIDE-OVER: full list of variants for a category */}
      <Sheet open={!!sheetCategory} onOpenChange={(o) => !o && setSheetCategory(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="serif text-2xl font-light capitalize">
              {sheetCategory ?? ""}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Select a material to preview it on the piece.
            </p>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {(sheetCategory ? variantGroups[sheetCategory] ?? [] : []).map((v) => (
              <VariantCard
                key={v.id}
                v={v}
                active={v.id === activeVariantId}
                onClick={() => { setActiveVariantId(v.id); setSheetCategory(null); }}
                showDetails
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Footer />
    </>
  );
};

function VariantCard({
  v, active, onClick, showDetails = false,
}: {
  v: FurnitureVariant;
  active: boolean;
  onClick: () => void;
  showDetails?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left transition-all hover:-translate-y-0.5"
      style={{
        border: `1.5px solid ${active ? GOLD : "#E8E4DF"}`,
        borderRadius: 10,
        padding: 8,
        background: active ? "#FBF7F1" : "#FFFFFF",
        boxShadow: active ? "0 4px 14px rgba(201,169,122,0.18)" : "none",
      }}
    >
      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 6, background: "#F5EFE8", overflow: "hidden", marginBottom: 8 }}>
        {v.preview_image && (
          <img src={v.preview_image} alt={v.variant_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>
      <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {v.category}
      </p>
      <p style={{ fontSize: 13, color: "#1A1A1A", marginTop: 2, lineHeight: 1.3 }}>
        {v.variant_name}
      </p>
      {v.color_name && (
        <p style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>{v.color_name}</p>
      )}
      {showDetails && v.material_name && (
        <p style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>{v.material_name}</p>
      )}
    </button>
  );
}

export default ItemDetail;
