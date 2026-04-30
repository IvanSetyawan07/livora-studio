interface Props {
  eyebrow: string;
  title: React.ReactNode;
  align?: "left" | "center";
}

export const SectionHeader = ({ eyebrow, title, align = "left" }: Props) => (
  <div className={`reveal mb-12 md:mb-16 ${align === "center" ? "text-center" : ""}`}>
    <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] text-foreground/60 mb-5">
      {align === "left" && <span className="divider-line" />}
      {eyebrow}
    </p>
    <h2 className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] text-balance">
      {title}
    </h2>
  </div>
);
