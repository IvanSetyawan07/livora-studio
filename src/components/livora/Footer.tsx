export const Footer = () => (
  <footer className="bg-foreground text-background py-16">
    <div className="container-livora">
      <div className="grid md:grid-cols-3 gap-10 items-end">
        <div>
          <p className="serif text-3xl tracking-[0.35em] font-light">LIVORA</p>
          <p className="text-xs uppercase tracking-[0.3em] text-background/50 mt-3">PT. Langgeng Cipta Ruang</p>
        </div>
        <p className="serif text-2xl md:text-3xl italic font-light text-center text-background/80">
          Imagine. Create. Realize.
        </p>
        <p className="text-xs uppercase tracking-[0.3em] text-background/50 md:text-right">
          © {new Date().getFullYear()} Livora — All rights reserved
        </p>
      </div>
    </div>
  </footer>
);
