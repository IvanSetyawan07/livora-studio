import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { CATALOG_CATEGORIES } from "@/types/catalog";
import footerEditorialImg from "@/assets/style-european.webp";

type FooterLink = { label: string; to?: string; href?: string };

export const Footer = () => {
  const { t } = useTranslation();

  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: t("footer.catalog"),
      links: CATALOG_CATEGORIES.map((c) => ({
        label: c.label,
        to: `/catalog/${c.slug}`,
      })),
    },
    {
      title: t("footer.company"),
      links: [
        { label: t("nav.about"), to: "/about" },
        { label: t("nav.projects"), to: "/projects" },
        { label: t("nav.furniture"), to: "/furniture" },
        { label: t("nav.collection"), to: "/collection" },
        { label: t("nav.style"), to: "/#style" },
        { label: t("nav.contact"), to: "/#contact" },
        { label: t("nav.appointment"), to: "/appointment" },
      ],
    },
    {
      title: t("footer.contact"),
      links: [
        { label: t("footer.city"), to: "/#contact" },
        { label: "PT. Langgeng Cipta Ruang", to: "/about" },
        {
          label: "livoralcrmarketing@gmail.com",
          href: "mailto:livoralcrmarketing@gmail.com",
        },
        { label: "@livoraid", href: "https://instagram.com/livoraid" },
      ],
    },
  ];

  return (
    <footer className="relative bg-[#FAF8F4] text-[#232528] border-t border-[#232528]/12 pt-16 sm:pt-20 lg:pt-24 pb-8 overflow-x-clip">
      <div className="container-livora">
        {/* Top Architectural Editorial Split (Hanna Stína 00:15–00:16) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 pb-14 lg:pb-20">
          {/* Left: Crisp Editorial Interior Photograph + Studio Statement */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <Link
              to="/appointment"
              className="group relative block overflow-hidden aspect-[16/10] bg-[#F1EFEA]"
            >
              <img
                src={footerEditorialImg}
                alt="LIVORA Jakarta interior studio"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
              />
              <span className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 bg-white/92 backdrop-blur-sm px-3.5 py-1.5 text-[9px] uppercase tracking-[0.26em] text-[#232528]">
                Visit Showroom <ArrowUpRight className="h-3 w-3 text-[#5E93B8]" />
              </span>
            </Link>
            <p className="text-xs sm:text-[13px] font-light leading-relaxed text-[#656B73] max-w-[40ch]">
              {t("footer.company_desc")}
            </p>
          </div>

          {/* Right: 3 Clean Swiss Navigation & Contact Columns */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 lg:pl-8">
            {columns.map((col, idx) => (
              <div
                key={col.title}
                className={idx === 2 ? "col-span-2 sm:col-span-1 min-w-0" : "min-w-0"}
              >
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#5E93B8] font-medium mb-4">
                  {col.title}
                </p>
                <ul className="space-y-1.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.to ? (
                        <Link
                          to={l.to}
                          className="inline-block py-1 text-xs uppercase tracking-[0.14em] text-[#232528]/80 hover:text-[#5E93B8] transition-colors duration-200 font-normal break-words"
                        >
                          {l.label}
                        </Link>
                      ) : (
                        <a
                          href={l.href ?? "#"}
                          target={l.href?.startsWith("http") ? "_blank" : undefined}
                          rel={l.href?.startsWith("http") ? "noreferrer" : undefined}
                          className="inline-block py-1 text-xs tracking-[0.08em] text-[#232528]/80 hover:text-[#5E93B8] transition-colors duration-200 font-normal break-all sm:break-words"
                        >
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Monumental Edge-to-Edge Brand Wordmark */}
        <div className="border-t border-[#232528]/12 pt-6 sm:pt-8 pb-4 select-none">
          <Link
            to="/"
            aria-label="LIVORA Home"
            className="block w-full text-center serif font-light uppercase text-[#232528] leading-[0.84] tracking-[0.16em] hover:text-[#5E93B8] transition-colors duration-500"
            style={{ fontSize: "clamp(3.6rem, 15.8vw, 15.5rem)" }}
          >
            LIVORA
          </Link>
        </div>

        {/* Whisper-Thin Bottom Legal Row */}
        <div className="pt-4 border-t border-[#232528]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] uppercase tracking-[0.24em] text-[#656B73]">
          <span>
            © {new Date().getFullYear()} LIVORA · {t("footer.rights")}
          </span>
          <span>PT. Langgeng Cipta Ruang · Jakarta</span>
        </div>
      </div>
    </footer>
  );
};
