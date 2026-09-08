import { useTranslation } from "react-i18next";
import aboutImg from "@/assets/about-livora.jpg";
import { SectionHeader } from "./SectionHeader";

export const About = () => {
  const { t } = useTranslation();
  const missions = t("about.missions", { returnObjects: true }) as { t: string; d: string }[];

  return (
    <section id="about" className="py-28 md:py-40 container-livora">
      <SectionHeader
        eyebrow={t("about.eyebrow")}
        title={
          <>
            {t("about.title")} <em className="italic">{t("about.title_em")}</em>
          </>
        }
      />

      {/* ROW 1 — About */}
      <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-start">
        <div className="reveal md:col-span-7 hover-zoom">
          <img
            src={aboutImg}
            alt="Livora Architechture interior"
            width={1280}
            height={896}
            loading="lazy"
            className="w-full aspect-[5/4] object-cover"
          />
        </div>
        <div className="reveal md:col-span-5 md:pt-8 space-y-8">
          <p className="text-base md:text-lg leading-relaxed text-foreground/80 font-light">
            {t("about.p1")}
          </p>
          <p className="text-base md:text-lg leading-relaxed text-foreground/80 font-light">
            {t("about.p2")} <span className="text-foreground">{t("about.p2_designers")}</span> {t("about.p2_mid")}{" "}
            <span className="text-foreground">{t("about.p2_importers")}</span> {t("about.p2_mid2")}{" "}
            <span className="text-foreground">{t("about.p2_contractors")}</span> {t("about.p2_end")}
          </p>
        </div>
      </div>

      {/* ROW 2 — Vision */}
      <div id="vision" className="reveal mt-24 md:mt-32 max-w-4xl">
        <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 mb-5">
          <span className="divider-line" />
          {t("about.vision_eyebrow")}
        </p>
        <h3 className="serif text-3xl md:text-5xl font-light italic leading-snug text-foreground/90">
          &ldquo;{t("about.vision_quote")}&rdquo;
        </h3>
      </div>

      {/* ROW 3 — Mission */}
      <div id="mission" className="mt-24 md:mt-32">
        <div className="reveal mb-12 md:mb-16">
          <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 mb-5">
            <span className="divider-line" />
            {t("about.mission_eyebrow")}
          </p>
          <h3 className="serif text-4xl md:text-5xl font-light leading-tight">
            {t("about.mission_title")} <em className="italic">{t("about.mission_title_em")}</em>
          </h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {(Array.isArray(missions) ? missions : []).map((m, i) => (
            <div key={m.t} className="reveal group mission-card" style={{ transitionDelay: `${i * 100}ms` }}>
              <p className="text-[11px] uppercase mb-6" style={{ color: "#C9A97A", letterSpacing: "0.15em" }}>
                {String(i + 1).padStart(2, "0")}
              </p>
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
    </section>
  );
};
