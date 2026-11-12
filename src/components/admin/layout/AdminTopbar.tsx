import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Menu } from "lucide-react";
import { matchNav } from "./adminNav";

type Props = {
  onMenu?: () => void;
  menuLabel: string;
  children?: React.ReactNode;
};

/** Bilah atas: breadcrumb (lokasi saat ini) + slot aksi di kanan. */
export default function AdminTopbar({ onMenu, menuLabel, children }: Props) {
  const { pathname } = useLocation();
  const match = matchNav(pathname);
  const crumbs: { label: string; to?: string }[] = [{ label: "Admin", to: "/admin" }];
  if (match?.group) crumbs.push({ label: match.group.label });
  if (match && match.item.to !== "/admin") crumbs.push({ label: match.item.label, to: match.item.to });
  if (!match || match.item.to === "/admin") crumbs[0] = { label: "Dashboard" };

  // Sub-halaman (mis. /admin/items/123) → tampilkan sebagai crumb terakhir.
  const isDeeper = match && match.item.to !== "/admin" && pathname !== match.item.to;
  if (isDeeper) crumbs.push({ label: "Detail" });

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      {onMenu && (
        <button
          onClick={onMenu}
          aria-label={menuLabel}
          className="-ml-2 rounded-lg p-2 transition-colors hover:bg-muted lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
              {c.to && !last ? (
                <Link
                  to={c.to}
                  className={`truncate text-muted-foreground transition-colors hover:text-foreground ${i === 0 ? "" : "hidden sm:inline"}`}
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={`truncate ${last ? "serif text-base text-foreground" : "hidden text-muted-foreground sm:inline"}`}
                >
                  {c.label}
                </span>
              )}
            </Fragment>
          );
        })}
      </nav>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}
