import { useTranslation } from "react-i18next";
import { CATALOG_CATEGORIES } from "@/types/catalog";

export const Footer = () => {
  const { t } = useTranslation();

  const columns = [
    { title: t("footer.catalog"), links: CATALOG_CATEGORIES.map((c) => c.label) },
    {
      title: t("footer.company"),
      links: [t("nav.about"), t("nav.projects"), t("nav.furniture"), t("nav.style"), t("nav.contact")],
    },
    {
      title: t("footer.contact"),
      links: [t("footer.city"), "PT. Langgeng Cipta Ruang", "livoralcrmarketing@gmail.com"],
    },
  ];

  return (
    <footer className="bg-foreground text-background/60 py-14">
      <div className="container-livora grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 pb-10 border-b border-background/10">
        <div>
          <span className="serif text-lg tracking-[0.22em] uppercase text-background block mb-3 font-light">
            Livora
          </span>
          <p className="text-xs font-light leading-relaxed max-w-[200px]">{t("footer.company_desc")}</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-[9px] uppercase tracking-[0.2em] text-background/30 mb-4 font-light">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-xs text-background/55 hover:text-background transition-colors duration-200 font-light"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-livora flex justify-between text-[10px] text-background/25 font-light">
        <span>
          © {new Date().getFullYear()} Livora. {t("footer.rights")}.
        </span>
        <span>PT. Langgeng Cipta Ruang</span>
      </div>
    </footer>
  );
};
