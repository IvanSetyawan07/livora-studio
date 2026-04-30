import aboutImg from "@/assets/about-livora.jpg";
import { SectionHeader } from "./SectionHeader";

export const About = () => (
  <section id="about" className="py-28 md:py-40 container-livora">
    <SectionHeader
      eyebrow="01 — About Us"
      title={<>A single point of contact for <em className="italic">your dream space.</em></>}
    />

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

        <div className="pt-6 border-t border-border">
          <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 mb-3">Vision</p>
          <p className="serif text-2xl md:text-3xl font-light italic leading-snug">
            "To be the leading One-Stop ecosystem for interior creation — where design, supply
            and construction merge seamlessly."
          </p>
        </div>
      </div>
    </div>
  </section>
);
