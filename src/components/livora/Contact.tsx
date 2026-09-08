import { useTranslation } from "react-i18next";
import { Instagram, MapPin, Phone, Globe } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

export const Contact = () => {
  const { t } = useTranslation();

  return (
    <section id="contact" className="py-28 md:py-40 container-livora">
      <SectionHeader
        eyebrow={t("contact.eyebrow")}
        title={<>{t("contact.title")} <em className="italic">{t("contact.title_em")}</em> {t("contact.title_end")}</>}
      />
      <p className="reveal -mt-8 mb-12 md:mb-16 text-base md:text-lg text-foreground/70 font-light max-w-xl">
        {t("contact.desc")}
      </p>


      <div className="grid md:grid-cols-2 gap-10 md:gap-16 mt-8">
        {/* Left — Map */}
        <div className="reveal overflow-hidden rounded-2xl border border-border min-h-[420px] md:min-h-[520px]">
          <iframe
            title="Livora office location"
            src="https://www.google.com/maps?q=-6.2476031,106.8149678&output=embed"
            className="w-full h-full grayscale contrast-110"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Right — Info */}
        <div className="reveal flex flex-col justify-center bg-muted/40 rounded-2xl p-10 md:p-12">
          <div className="flex items-start gap-3 mb-5">
            <MapPin size={20} className="mt-1 shrink-0 text-foreground/70" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/60 mb-2">{t("contact.find_us")}</p>
              <p className="serif text-xl md:text-2xl font-light leading-snug text-foreground">
                Jl. Bangka Raya No.45<br />
                Jakarta Selatan, 12720<br />
                Indonesia
              </p>
            </div>
          </div>

          <div className="h-px bg-border my-8" />

          <ul className="space-y-5">
            <li>
              <a href="tel:+628212043307" className="group flex items-center gap-4 text-foreground/80 hover:text-foreground transition-colors">
                <Phone size={18} className="shrink-0" />
                <span className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 w-14">{t("contact.call")}</span>
                <span className="text-base md:text-lg font-light underline-grow">+62 821 2043 3307</span>
              </a>
            </li>
            <li>
              <a href="https://livoralcr.com" target="_blank" rel="noreferrer" className="group flex items-center gap-4 text-foreground/80 hover:text-foreground transition-colors">
                <Globe size={18} className="shrink-0" />
                <span className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 w-14">{t("contact.web")}</span>
                <span className="text-base md:text-lg font-light underline-grow">livoralcr.com</span>
              </a>
            </li>
            <li>
              <a href="https://instagram.com/livoraid" target="_blank" rel="noreferrer" className="group flex items-center gap-4 text-foreground/80 hover:text-foreground transition-colors">
                <Instagram size={18} className="shrink-0" />
                <span className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 w-14">IG</span>
                <span className="text-base md:text-lg font-light underline-grow">@livoraid</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};
