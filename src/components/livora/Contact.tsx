import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Instagram,
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  X,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import {
  gsap,
  ScrollTrigger,
  registerGsap,
  prefersReducedMotion,
} from "@/lib/motionTokens";

export const Contact = () => {
  const { t } = useTranslation();
  const [mapActive, setMapActive] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    registerGsap();
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section.querySelectorAll<HTMLElement>("[data-contact-reveal]"),
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "expo.out",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            once: true,
          },
        },
      );
    }, section);

    const tId = setTimeout(() => ScrollTrigger.refresh(), 100);
    return () => {
      clearTimeout(tId);
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative bg-[#FAF8F4] text-[#232528] py-24 sm:py-28 lg:py-36"
    >
      <div className="container-livora">
        {/* ── Header ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end mb-12 lg:mb-16">
          <div className="lg:col-span-7">
            <p
              data-contact-reveal
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-[#5E93B8] font-medium mb-4"
            >
              <span className="h-px w-8 bg-[#5E93B8]/60" />
              06 · {t("contact.eyebrow", "Visit Our Studio")}
            </p>
            <h2
              data-contact-reveal
              className="serif text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-light leading-[0.98] tracking-[-0.015em] text-[#232528]"
            >
              {t("contact.title")}{" "}
              <em className="italic font-light text-[#5E93B8]">
                {t("contact.title_em")}
              </em>{" "}
              {t("contact.title_end")}
            </h2>
          </div>

          <div className="lg:col-span-5 flex flex-col lg:items-end gap-5">
            <p
              data-contact-reveal
              className="text-sm sm:text-[15px] leading-relaxed font-light text-[#656B73] max-w-[44ch] lg:text-right"
            >
              {t("contact.desc")}
            </p>
            <Link
              data-contact-reveal
              to="/appointment"
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#232528] px-6 py-3.5 text-[11px] uppercase tracking-[0.26em] text-[#FAF8F4] shadow-[0_14px_30px_-14px_rgba(35,37,40,0.4)] hover:bg-[#5E93B8] transition-colors duration-300 self-start lg:self-end"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{t("nav.appointment", "Make an Appointment")}</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* ── Map + Showroom Contact Card ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div
            data-contact-reveal
            className="lg:col-span-7 relative overflow-hidden rounded-[26px] border border-[#232528]/10 min-h-[340px] sm:min-h-[420px] lg:min-h-[500px] bg-[#F1EFEA] shadow-[0_24px_60px_-34px_rgba(35,37,40,0.16)]"
          >
            <iframe
              title="Livora office location"
              src="https://www.google.com/maps?q=-6.2476031,106.8149678&output=embed"
              className={`w-full h-full min-h-[340px] sm:min-h-[420px] lg:min-h-[500px] grayscale contrast-105 transition-all ${
                mapActive ? "pointer-events-auto" : "pointer-events-none"
              }`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {!mapActive ? (
              <div className="absolute inset-0 flex flex-col justify-between p-5 bg-gradient-to-t from-[#232528]/45 via-transparent to-transparent">
                <div className="self-end">
                  <a
                    href="https://maps.google.com/?q=-6.2476031,106.8149678"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-full bg-white/95 text-[#232528] text-xs font-medium shadow-md hover:bg-white transition-colors"
                  >
                    Open Maps <ExternalLink size={13} />
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setMapActive(true)}
                  className="self-center min-h-[44px] px-6 py-2.5 rounded-full bg-white/95 text-[#232528] text-[11px] uppercase tracking-[0.22em] backdrop-blur-md shadow-lg hover:bg-[#232528] hover:text-white active:scale-95 transition-all"
                >
                  Tap to interact with map
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMapActive(false)}
                className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-full bg-[#232528]/90 text-white text-xs shadow-lg"
              >
                <X size={13} /> Lock map
              </button>
            )}
          </div>

          <div
            data-contact-reveal
            className="lg:col-span-5 flex flex-col justify-between rounded-[26px] bg-white border border-[#232528]/10 p-7 sm:p-10 lg:p-12 shadow-[0_24px_60px_-34px_rgba(35,37,40,0.12)]"
          >
            <div>
              <div className="flex items-start gap-4 mb-6">
                <span className="mt-1 h-10 w-10 rounded-full bg-[#EDF4F8] text-[#5E93B8] flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.36em] text-[#5E93B8] font-medium mb-2">
                    {t("contact.find_us", "Showroom & Studio")}
                  </p>
                  <p className="serif text-2xl sm:text-[28px] font-light leading-snug text-[#232528]">
                    Jl. Bangka Raya No.45
                    <br />
                    Jakarta Selatan, 12720
                    <br />
                    Indonesia
                  </p>
                </div>
              </div>

              <div className="h-px bg-[#232528]/10 my-7" />

              <ul className="space-y-2.5">
                <li>
                  <a
                    href="https://wa.me/628212043307"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3.5 min-h-[46px] py-2 text-[#232528]/85 hover:text-[#5E93B8] transition-colors"
                  >
                    <Phone size={17} className="shrink-0 text-[#5E93B8]" />
                    <span className="text-[10px] uppercase tracking-[0.32em] text-[#656B73] w-14 shrink-0">
                      {t("contact.call", "Call")}
                    </span>
                    <span className="text-base sm:text-lg font-light underline-grow">
                      +62 821 2043 307
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://livoralcr.com"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3.5 min-h-[46px] py-2 text-[#232528]/85 hover:text-[#5E93B8] transition-colors"
                  >
                    <Globe size={17} className="shrink-0 text-[#5E93B8]" />
                    <span className="text-[10px] uppercase tracking-[0.32em] text-[#656B73] w-14 shrink-0">
                      {t("contact.web", "Web")}
                    </span>
                    <span className="text-base sm:text-lg font-light underline-grow">
                      livoralcr.com
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://instagram.com/livoraid"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3.5 min-h-[46px] py-2 text-[#232528]/85 hover:text-[#5E93B8] transition-colors"
                  >
                    <Instagram size={17} className="shrink-0 text-[#5E93B8]" />
                    <span className="text-[10px] uppercase tracking-[0.32em] text-[#656B73] w-14 shrink-0">
                      IG
                    </span>
                    <span className="text-base sm:text-lg font-light underline-grow">
                      @livoraid
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-[#232528]/10 flex items-center justify-between gap-4">
              <span className="text-[11px] uppercase tracking-[0.24em] text-[#656B73]">
                Private Consultation
              </span>
              <Link
                to="/appointment"
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.22em] font-medium text-[#232528] hover:text-[#5E93B8] transition-colors"
              >
                Book Visit <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
