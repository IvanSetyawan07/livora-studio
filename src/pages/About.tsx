import { useEffect } from "react";
import { Link } from "react-router-dom";
import aboutImg from "@/assets/about-livora.jpg";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { PageBreadcrumb } from "@/components/livora/Breadcrumb";
import { useReveal } from "@/hooks/useReveal";

const missions = [
  { t: "Integrate", d: "the complex journey of interior designing." },
  { t: "Construct", d: "top-class quality and adaptive design, furniture and installation." },
  { t: "Create", d: "long-lasting and meaningful impact in every space." },
];

const AboutPage = () => {
  useReveal();

  useEffect(() => {
    document.title = "About — LIVORA";
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
      "About LIVORA — a single point of contact for your dream space. Our vision and mission for interior creation.",
    );
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: "80px", background: "hsl(var(--background))" }}>
        <PageBreadcrumb items={[{ label: "Home", to: "/" }, { label: "About" }]} />

        <section className="container-livora pt-8 pb-28 md:pb-40">
          {/* About Us */}
          <div className="reveal mb-12 md:mb-16">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] text-foreground/60 mb-5">
              <span className="divider-line" />
              About Us
            </p>
            <h1 className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] text-balance">
              A single point of contact for <em className="italic">your dream space.</em>
            </h1>
          </div>

          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-start">
            <div className="reveal md:col-span-7 hover-zoom">
              <img
                src={aboutImg}
                alt="Livora founder portrait"
                width={1280}
                height={896}
                loading="lazy"
                className="w-full aspect-[5/4] object-cover"
              />
            </div>
            <div className="reveal md:col-span-5 md:pt-8 space-y-8">
              <p className="text-base md:text-lg leading-relaxed text-foreground/80 font-light">
                At Livora, we believe creating your dream space shouldn't be a complex struggle. Most paths to a
                beautiful interior are blocked by disconnected services. We were founded to solve that fundamental
                problem.
              </p>
              <p className="text-base md:text-lg leading-relaxed text-foreground/80 font-light">
                We act as your <span className="text-foreground">Designers</span> — tailoring spaces to your needs; your{" "}
                <span className="text-foreground">Importers</span> — sourcing high-quality materials directly; and your{" "}
                <span className="text-foreground">Contractors</span> — ensuring every detail is installed to perfection.
              </p>
            </div>
          </div>

          {/* Vision */}
          <div className="reveal mt-24 md:mt-32 max-w-4xl">
            <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 mb-5">
              <span className="divider-line" />
              Vision
            </p>
            <h3 className="serif text-3xl md:text-5xl font-light italic leading-snug text-foreground/90">
              "To be the leading One-Stop ecosystem for interior creation — where design, supply and construction merge
              seamlessly."
            </h3>
          </div>

          {/* Mission */}
          <div className="mt-24 md:mt-32">
            <div className="reveal mb-12 md:mb-16">
              <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 mb-5">
                <span className="divider-line" />
                Mission
              </p>
              <h3 className="serif text-4xl md:text-5xl font-light leading-tight">
                Three principles, <em className="italic">one philosophy.</em>
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {missions.map((m, i) => (
                <div key={m.t} className="reveal group mission-card" style={{ transitionDelay: `${i * 100}ms` }}>
                  <h4
                    className="serif text-3xl md:text-4xl font-light mb-4 origin-left transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                    style={{ color: "#1A1A1A" }}
                  >
                    {m.t}
                  </h4>
                  <p className="font-light" style={{ color: "#6B6B6B", lineHeight: 1.7 }}>
                    {m.d}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20">
            <Link
              to="/"
              className="text-[11px] uppercase tracking-[0.3em] text-foreground/70 hover:text-foreground underline-grow"
            >
              ← Back to home
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AboutPage;
