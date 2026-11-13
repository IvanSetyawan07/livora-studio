import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Instagram, MapPin, Phone, Globe, ExternalLink, X } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

export const Contact = () => {
  const { t } = useTranslation();
  const [mapActive, setMapActive] = useState(false);

  return (
    <section id="contact" className="py-20 md:py-40 container-livora">
      <SectionHeader
        eyebrow={t("contact.eyebrow")}
        title={<>{t("contact.title")} <em className="italic">{t("contact.title_em")}</em> {t("contact.title_end")}</>}
      />
      <p className="reveal -mt-6 md:-mt-8 mb-10 md:mb-16 text-base md:text-lg text-foreground/70 font-light max-w-xl">
        {t("contact.desc")}
      </p>

      <div className="grid md:grid-cols-2 gap-8 md:gap-16 mt-8">
        <div className="reveal relative overflow-hidden rounded-2xl border border-border min-h-[340px] sm:min-h-[420px] md:min-h-[520px] bg-muted">
          <iframe
            title="Livora office location"
            src="https://www.google.com/maps?q=-6.2476031,106.8149678&output=embed"
            className={`w-full h-full min-h-[340px] sm:min-h-[420px] md:min-h-[520px] grayscale contrast-110 transition-all ${
              mapActive ? "pointer-events-auto" : "pointer-events-none"
            }`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {!mapActive ? (
            <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/55 via-transparent to-transparent">
              <div className="self-end">
                <a
                  href="https://maps.google.com/?q=-6.2476031,106.8149678"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-full bg-white/95 text-neutral-900 text-xs font-medium shadow-md hover:bg-white transition-colors"
                >
                  Open Maps <ExternalLink size={13} />
                </a>
              </div>
              <button
                type="button"
                onClick={() => setMapActive(true)}
                className="self-center min-h-[44px] px-5 py-2.5 rounded-full bg-neutral-900/90 text-white text-xs uppercase tracking-[0.2em] backdrop-blur-sm shadow-lg active:scale-95 transition-transform"
              >
                Tap to interact with map
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMapActive(false)}
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-full bg-neutral-900/90 text-white text-xs shadow-lg"
            >
              <X size={13} /> Lock map
            </button>
          )}
        </div>

        <div className="reveal flex flex-col justify-center bg-muted/40 rounded-2xl p-6 sm:p-10 md:p-12">
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

          <div className="h-px bg-border my-6 md:my-8" />

          <ul className="space-y-2 sm:space-y-3">
            <li>
              <a href="https://wa.me/628212043307" target="_blank" rel="noreferrer" className="group flex items-center gap-3 sm:gap-4 min-h-[44px] py-2 text-foreground/80 hover:text-foreground transition-colors">
                <Phone size={18} className="shrink-0" />
                <span className="text-[10px] uppercase tracking-[0.35em] text-foreground/50 w-12 sm:w-14 shrink-0">{t("contact.call")}</span>
                <span className="text-base md:text-lg font-light underline-grow">+62 821 2043 307</span>
              </a>
            </li>
            <li>
              <a href="https://livoralcr.com" target="_blank" rel="noreferrer" className="group flex items-center gap-3 sm:gap-4 min-h-[44px] py-2 text-foreground/80 hover:text-foreground transition-colors">
                <Globe size={18} className="shrink-0" />
                <span className="text-[10px] uppercase tracking-[0.35em] text-foreground/50 w-12 sm:w-14 shrink-0">{t("contact.web")}</span>
                <span className="text-base md:text-lg font-light underline-grow">livoralcr.com</span>
              </a>
            </li>
            <li>
              <a href="https://instagram.com/livoraid" target="_blank" rel="noreferrer" className="group flex items-center gap-3 sm:gap-4 min-h-[44px] py-2 text-foreground/80 hover:text-foreground transition-colors">
                <Instagram size={18} className="shrink-0" />
                <span className="text-[10px] uppercase tracking-[0.35em] text-foreground/50 w-12 sm:w-14 shrink-0">IG</span>
                <span className="text-base md:text-lg font-light underline-grow">@livoraid</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};