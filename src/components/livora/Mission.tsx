import { SectionHeader } from "./SectionHeader";

const missions = [
  { n: "01", t: "Simplify", d: "the complex journey of interior designing." },
  { n: "02", t: "Deliver", d: "top-class quality and adaptive design, furniture and installation." },
  { n: "03", t: "Create", d: "long-lasting and meaningful impact in every space." },
];

export const Mission = () => (
  <section id="mission" className="py-28 md:py-40 bg-secondary/60">
    <div className="container-livora">
      <SectionHeader
        eyebrow="02 — Mission"
        title={<>Three principles, <em className="italic">one philosophy.</em></>}
      />

      <div className="grid md:grid-cols-3 gap-10 md:gap-6">
        {missions.map((m, i) => (
          <div
            key={m.n}
            className="reveal border-t border-foreground/20 pt-8 group"
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <p className="text-xs tracking-[0.3em] text-foreground/50 mb-6">{m.n}</p>
            <h3 className="serif text-3xl md:text-4xl font-light mb-4 group-hover:translate-x-1 transition-transform duration-500">
              {m.t}
            </h3>
            <p className="text-foreground/70 font-light leading-relaxed">{m.d}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
