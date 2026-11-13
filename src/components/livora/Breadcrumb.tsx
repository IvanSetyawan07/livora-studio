import { Link } from "react-router-dom";

interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  items: Crumb[];
}

export const PageBreadcrumb = ({ items }: Props) => (
  <nav
    aria-label="Breadcrumb"
    className="container-livora pt-24 md:pt-28 pb-1 flex flex-wrap items-center gap-y-1 text-xs tracking-[0.1em]"
    style={{ color: "#C9A97A" }}
  >
    {items.map((item, idx) => {
      const isLast = idx === items.length - 1;
      return (
        <span key={idx} className="inline-flex items-center">
          {item.to && !isLast ? (
            <Link to={item.to} className="py-1.5 px-0.5 hover:opacity-70 active:opacity-60 transition-opacity">
              {item.label}
            </Link>
          ) : (
            <span className="py-1.5" style={{ color: isLast ? "#1A1A1A" : "#C9A97A" }}>{item.label}</span>
          )}
          {!isLast && <span className="mx-2 text-[#C9A97A]/60">/</span>}
        </span>
      );
    })}
  </nav>
);