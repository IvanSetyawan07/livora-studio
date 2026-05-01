import aboutImg from "@/assets/about-livora.jpg";
import { SectionHeader } from "./SectionHeader";

const missions = [
  { n: "01", t: "Simplify", d: "the complex journey of interior designing." },
  { n: "02", t: "Deliver", d: "top-class quality and adaptive design, furniture and installation." },
  { n: "03", t: "Create", d: "long-lasting and meaningful impact in every space." },
];

export const About = () => (
  <section id="about" className="py-28 md:py-40 container-livora">
    <SectionHeader
      eyebrow="01 — About Us"
      title={<>A single point of contact for <em className="italic">your dream space.</em></>}
    />

    {/* ROW 1 — About */}
    <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-start">
      <div className="reveal md:col-span-7 hover-zoom">
        <img
          src={aboutImg}
          alt="Livora studio interior"
          width={1280}
          height={896}
          loading="lazy"
          className="w-full aspect-[5/4] object-cover"
        />
      </div>
      <div className="reveal md:col-span-5 md:pt-8 space-y-8">
        <p className="text-base md:text-lg leading-relaxed text-foreground/80 font-light">
          At Livora, we believe creating your dream space shouldn't be a complex struggle.
          Most paths to a beautiful interior are blocked by disconnected services. We were
          founded to solve that fundamental problem.
        </p>
        <p className="text-base md:text-lg leading-relaxed text-foreground/80 font-light">
          We act as your <span className="text-foreground">Designers</span> — tailoring spaces
          to your needs; your <span className="text-foreground">Importers</span> — sourcing
          high-quality materials directly; and your <span className="text-foreground">Contractors</span> —
          ensuring every detail is installed to perfection.
        </p>
      </div>
    </div>

    {/* ROW 2 — Vision */}
    <div id="vision" className="reveal mt-24 md:mt-32 max-w-4xl">
      <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 mb-5">
        <span className="divider-line" />
        Vision
      </p>
      <h3 className="serif text-3xl md:text-5xl font-light italic leading-snug text-foreground/90">
        "To be the leading One-Stop ecosystem for interior creation — where design, supply
        and construction merge seamlessly."
      </h3>
    </div>

    {/* ROW 3 — Mission */}
    <div id="mission" className="mt-24 md:mt-32">
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
          <div
            key={m.n}
            className="reveal group bg-secondary/50 border border-border rounded-md p-8 md:p-10 shadow-sm hover:shadow-lg transition-shadow duration-500"
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className="origin-left transition-transform duration-300 ease-out group-hover:scale-[1.05]">
              <p className="text-xs tracking-[0.3em] text-foreground/50 mb-6">{m.n}</p>
              <h4 className="serif text-3xl md:text-4xl font-light mb-4">{m.t}</h4>
              <p className="text-foreground/70 font-light leading-relaxed">{m.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
