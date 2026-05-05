import styleImg from "@/assets/style-european.jpg";

export const Style = () => (
  <section id="style" className="py-28 md:py-40 container-livora">
    <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
      <div className="reveal md:col-span-5 order-2 md:order-1 space-y-6">
        <p className="text-[10px] uppercase tracking-[0.45em] text-foreground/60">
          <span className="divider-line" /> 03 — Our Style
        </p>
        <h2 className="serif text-5xl md:text-7xl font-light leading-[1.02]">
          Modern.<br />Quiet.<br /><em className="italic">European.</em>
        </h2>
        <p className="text-base md:text-lg text-foreground/75 font-light leading-relaxed max-w-md">
          Inspired by European elegance, refined details and the balance between
          beauty and function. Our spaces speak softly, but with conviction.
        </p>
        <div className="flex gap-3 pt-4 text-[10px] uppercase tracking-[0.3em] text-foreground/60">
          <span className="px-3 py-1.5 border border-border">Refined</span>
          <span className="px-3 py-1.5 border border-border">Balanced</span>
          <span className="px-3 py-1.5 border border-border">Timeless</span>
        </div>
      </div>
      <div className="reveal md:col-span-7 order-1 md:order-2 hover-zoom">
        <img
          src={styleImg}
          alt="Modern quiet European bedroom"
          width={1280}
          height={896}
          loading="lazy"
          className="w-full aspect-[4/5] md:aspect-[5/4] object-cover"
        />
      </div>
    </div>
  </section>
);
