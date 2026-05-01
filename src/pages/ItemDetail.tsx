import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { getItemBySlug, items, slugifyItem } from "@/data/items";
import { getProjectBySlug } from "@/data/projects";

const ItemDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectSlug = searchParams.get("from");
  const project = projectSlug ? getProjectBySlug(projectSlug) : undefined;
  const item = slug ? getItemBySlug(slug) : undefined;
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
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
    }
    window.scrollTo(0, 0);
  }, [item]);

  if (!item) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="serif text-4xl font-light mb-4">Item not found</p>
          <Link to="/" className="text-xs uppercase tracking-[0.3em] underline-grow">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const related = items.filter((i) => i.slug !== item.slug).slice(0, 5);

  const goldLabel: React.CSSProperties = {
    color: "#C9A97A",
    fontSize: "10px",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
  };

  const valueStyle: React.CSSProperties = {
    fontSize: "14px",
    color: "#1A1A1A",
    lineHeight: 1.6,
    marginTop: "6px",
    marginBottom: "20px",
  };

  const Pill = ({ label }: { label: string }) => {
    const isActive = activeTag === label;
    return (
      <button
        onClick={() => setActiveTag(label)}
        title={`View all ${label} items →`}
        style={{
          background: isActive ? "#C9A97A" : "#F5EFE8",
          color: isActive ? "#FFFFFF" : "#8A7560",
          border: `1px solid ${isActive ? "#C9A97A" : "#E0D5C8"}`,
          borderRadius: "20px",
          padding: "6px 16px",
          fontSize: "12px",
          cursor: "pointer",
          transition: "all 0.25s ease",
          marginRight: "8px",
          marginBottom: "8px",
        }}
        onMouseEnter={(e) => {
          if (isActive) return;
          e.currentTarget.style.background = "#C9A97A";
          e.currentTarget.style.color = "#FFFFFF";
          e.currentTarget.style.borderColor = "#C9A97A";
        }}
        onMouseLeave={(e) => {
          if (isActive) return;
          e.currentTarget.style.background = "#F5EFE8";
          e.currentTarget.style.color = "#8A7560";
          e.currentTarget.style.borderColor = "#E0D5C8";
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <>
      <Navbar />
      <main style={{ background: "#FFFFFF", paddingTop: "80px" }}>
        {/* SECTION 1 — BREADCRUMB */}
        <nav
          style={{
            padding: "100px 60px 16px",
            fontSize: "12px",
            color: "#C9A97A",
            letterSpacing: "0.1em",
          }}
        >
          <Link to="/projects" className="hover:opacity-70">Projects</Link>
          <span style={{ margin: "0 10px" }}>/</span>
          {project ? (
            <>
              <Link to={`/projects/${project.slug}`} className="hover:opacity-70">
                {project.name}
              </Link>
              <span style={{ margin: "0 10px" }}>/</span>
            </>
          ) : null}
          <span style={{ color: "#1A1A1A" }}>{item.name}</span>
        </nav>

        {/* SECTION 2 — MAIN CONTENT */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "55% 45%",
          }}
          className="max-md:!grid-cols-1"
        >
          {/* LEFT */}
          <div
            style={{
              background: "#FAFAF8",
              padding: "60px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                border: "1px solid #E8E4DF",
                borderRadius: "12px",
                background: "#FFFFFF",
                width: "100%",
                aspectRatio: "1 / 1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ItemIllustration name={item.name} size={280} strokeWidth={1.1} />
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ background: "#FFFFFF", padding: "60px 48px" }}>
            <span
              style={{
                display: "inline-block",
                background: "#F5EFE8",
                color: "#C9A97A",
                fontSize: "10px",
                letterSpacing: "0.15em",
                padding: "4px 12px",
                borderRadius: "20px",
                textTransform: "uppercase",
              }}
            >
              {item.category}
            </span>

            <h1
              className="serif font-light"
              style={{
                fontSize: "40px",
                color: "#1A1A1A",
                marginTop: "12px",
                lineHeight: 1.1,
              }}
            >
              {item.name}
            </h1>

            <p
              style={{
                fontSize: "12px",
                color: "#9A9A9A",
                letterSpacing: "0.2em",
                marginTop: "8px",
              }}
            >
              {item.code}
            </p>

            <div className="h-px w-full bg-[#1A1A1A]/10" style={{ margin: "28px 0" }} />

            <div>
              <p style={goldLabel}>Dimensions</p>
              <p style={valueStyle}>{item.specs.dimensions}</p>

              <p style={goldLabel}>Material</p>
              <p style={valueStyle}>{item.specs.material}</p>

              <p style={goldLabel}>Finish</p>
              <p style={valueStyle}>{item.specs.finish}</p>

              <p style={goldLabel}>Weight</p>
              <p style={valueStyle}>{item.specs.weight}</p>

              <p style={goldLabel}>Availability</p>
              <p style={{ ...valueStyle, marginBottom: 0 }}>{item.specs.availability}</p>
            </div>

            <div className="h-px w-full bg-[#1A1A1A]/10" style={{ margin: "28px 0" }} />

            <p style={goldLabel}>Themes</p>
            <div style={{ marginTop: "10px", marginBottom: "20px" }}>
              {item.themes.map((t) => (
                <Pill key={t} label={t} />
              ))}
            </div>

            <p style={goldLabel}>Categories</p>
            <div style={{ marginTop: "10px" }}>
              {item.categories.map((c) => (
                <Pill key={c} label={c} />
              ))}
            </div>

            <button
              onClick={() => navigate(-1)}
              className="mt-10 uppercase hover:opacity-70 transition-opacity"
              style={{
                color: "#C9A97A",
                background: "none",
                border: "none",
                fontSize: "12px",
                letterSpacing: "0.1em",
                padding: 0,
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          </div>
        </section>

        {/* SECTION 3 — RELATED ITEMS */}
        <section style={{ background: "#FFFFFF", padding: "60px" }}>
          <h2
            className="serif font-light"
            style={{ fontSize: "22px", color: "#1A1A1A", marginBottom: "28px" }}
          >
            You May Also Like
          </h2>

          <div
            style={{
              display: "flex",
              gap: "20px",
              overflowX: "auto",
              paddingBottom: "8px",
            }}
          >
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/items/${r.slug}${projectSlug ? `?from=${projectSlug}` : ""}`}
                className="item-card"
                style={{
                  flex: "0 0 calc((100% - 80px) / 5)",
                  minWidth: "180px",
                  background: "#FAFAF8",
                  border: "1px solid #E8E4DF",
                  borderRadius: "10px",
                  padding: "28px 16px 20px",
                  textAlign: "center",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                  transition: "all 0.3s ease",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                <div
                  style={{
                    height: "120px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ItemIllustration name={r.name} />
                </div>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#1A1A1A",
                    letterSpacing: "0.05em",
                    marginTop: "16px",
                  }}
                >
                  {r.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default ItemDetail;
