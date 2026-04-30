import furnitureImg from "@/assets/furniture-collection.jpg";

export const Furniture = () => (
  <section id="furniture" className="relative py-28 md:py-40 bg-secondary/40">
    <div className="container-livora grid md:grid-cols-12 gap-10 md:gap-16 items-center">
      <div className="reveal md:col-span-6 hover-zoom">
        <img
          src={furnitureImg}
          alt="Curated furniture collection"
          width={1280}
          height={896}
          loading="lazy"
          className="w-full aspect-[4/3] object-cover"
        />
      </div>
      <div className="reveal md:col-span-6 space-y-6">
        <p className="text-[10px] uppercase tracking-[0.45em] text-foreground/60">
          <span className="divider-line" /> 06 — Furniture Collection
        </p>
        <h2 className="serif text-4xl md:text-6xl font-light leading-[1.05]">
          A wide variety of <em className="italic">textures, forms and tones.</em>
        </h2>
        <p className="text-foreground/75 leading-relaxed font-light text-base md:text-lg max-w-lg">
          From high-quality suppliers across Europe and Asia, our collection is curated
          for the balance between premium craftsmanship and considered value.
        </p>
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
          {[
            { n: "120+", l: "Suppliers" },
            { n: "40+", l: "Collections" },
            { n: "∞", l: "Possibilities" },
          ].map((s) => (
            <div key={s.l}>
              <p className="serif text-3xl md:text-4xl font-light">{s.n}</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/60 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
