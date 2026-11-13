import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CATALOG_CATEGORIES } from "@/types/catalog";

type FooterLink = { label: string; to?: string; href?: string };

export const Footer = () => {
  const { t } = useTranslation();

  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: t("footer.catalog"),
      links: CATALOG_CATEGORIES.map((c) => ({ label: c.label, to: `/catalog/${c.slug}` })),
    },
    {
      title: t("footer.company"),
      links: [
        { label: t("nav.about"), to: "/about" },
        { label: t("nav.projects"), to: "/projects" },
        { label: t("nav.furniture"), to: "/furniture" },
        { label: t("nav.style"), href: "/#style" },
        { label: t("nav.contact"), href: "/#contact" },
        { label: t("nav.appointment"), to: "/appointment" },
      ],
    },
    {
      title: t("footer.contact"),
      links: [
        { label: t("footer.city"), href: "/#contact" },
        { label: "PT. Langgeng Cipta Ruang", to: "/about" },
        { label: "livoralcrmarketing@gmail.com", href: "mailto:livoralcrmarketing@gmail.com" },
      ],
    },
  ];

  return (
    <footer className="bg-foreground text-background/75 py-12 md:py-14">
      <div className="container-livora grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 pb-10 border-b border-background/15">
        <div className="col-span-2 sm:col-span-1">
          <Link to="/" className="serif text-lg tracking-[0.22em] uppercase text-background inline-block mb-3 font-light">
            Livora
          </Link>
          <p className="text-xs font-light leading-relaxed max-w-[240px] text-background/75">{t("footer.company_desc")}</p>
        </div>
        {columns.map((col, idx) => (
          <div key={col.title} className={idx === 2 ? "col-span-2 sm:col-span-1 min-w-0" : "min-w-0"}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-background/70 mb-3 md:mb-4 font-light">{col.title}</p>
            <ul className="space-y-1">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link
                      to={l.to}
                      className="inline-block py-1.5 text-xs text-background/75 hover:text-background transition-colors duration-200 font-light break-words"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      href={l.href ?? "#"}
                      className="inline-block py-1.5 text-xs text-background/75 hover:text-background transition-colors duration-200 font-light break-all sm:break-words"
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
      <div className="container-livora flex flex-col sm:flex-row sm:justify-between gap-2 text-[11px] text-background/65 font-light">
        <span>
          © {new Date().getFullYear()} Livora. {t("footer.rights")}.
        </span>
        <span>PT. Langgeng Cipta Ruang</span>
      </div>
    </footer>
  );
};
