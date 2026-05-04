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
    style={{
      padding: "100px 60px 0px 60px",
      fontSize: "12px",
      color: "#C9A97A",
      letterSpacing: "0.1em",
    }}
  >
    {items.map((item, idx) => {
      const isLast = idx === items.length - 1;
      return (
        <span key={idx}>
          {item.to && !isLast ? (
            <Link to={item.to} className="hover:opacity-70">
              {item.label}
            </Link>
          ) : (
            <span style={{ color: isLast ? "#1A1A1A" : "#C9A97A" }}>{item.label}</span>
          )}
          {!isLast && <span style={{ margin: "0 10px" }}>/</span>}
        </span>
      );
    })}
  </nav>
);
