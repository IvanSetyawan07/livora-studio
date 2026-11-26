import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, ExternalLink, Menu } from "lucide-react";
import { matchNav } from "./adminNav";

type Props = {
  onMenu?: () => void;
  menuLabel?: string;
  children?: React.ReactNode;
};

/** Nama sub-halaman yang ramah admin berdasarkan segmen akhir URL. */
export function resolveSubpageLabel(pathname: string, baseTo: string): string | null {
  if (pathname === baseTo) return null;
  if (pathname.endsWith("/create")) return "Buat Baru";
  if (pathname.endsWith("/edit")) return "Ubah Data";
  if (pathname.endsWith("/experience")) return "Galeri & Experience";
  if (pathname.endsWith("/detail")) return "Detail Internal";
  if (baseTo === "/admin/shop/orders" && pathname.startsWith("/admin/shop/orders/")) return "Detail Pesanan";
  if (baseTo === "/admin/consultations" && pathname.startsWith("/admin/consultations/")) return "Detail Konsultasi";
  return null;
}

/** Hitung judul halaman aktif untuk breadcrumb & document.title. */
export function resolveAdminPageTitle(pathname: string): string {
  const match = matchNav(pathname);
  if (!match || match.item.to === "/admin") return "Ringkasan Harian";
  const sub = resolveSubpageLabel(pathname, match.item.to);
  return sub ? `${sub} — ${match.item.label}` : match.item.label;
}

/** Bilah atas: breadcrumb (lokasi saat ini) + slot aksi di kanan. */
export default function AdminTopbar({ onMenu, menuLabel = "Buka menu", children }: Props) {
  const { pathname } = useLocation();
  const match = matchNav(pathname);

  const crumbs: { label: string; to?: string; hideOnMobile?: boolean }[] = [];
  if (!match || match.item.to === "/admin") {
    crumbs.push({ label: "Ringkasan Harian" });
  } else {
    crumbs.push({ label: "Admin", to: "/admin" });
    if (match.group) {
      crumbs.push({ label: match.group.label, hideOnMobile: true });
    }
    const subLabel = resolveSubpageLabel(pathname, match.item.to);
    if (subLabel) {
      crumbs.push({ label: match.item.label, to: match.item.to, hideOnMobile: true });
      crumbs.push({ label: subLabel });
    } else {
      crumbs.push({ label: match.item.label });
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#EAE4DA] bg-[#FAF8F4]/90 px-4 backdrop-blur-md sm:px-6 lg:px-10">
      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          aria-label={menuLabel}
          className="-ml-2 rounded-lg p-2 text-[#232528] transition-colors hover:bg-black/5 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const hiddenCls = c.hideOnMobile ? "hidden sm:inline-flex" : "inline-flex";
          return (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 && (
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 text-[#656B73]/60 ${c.hideOnMobile ? "hidden sm:inline" : ""}`}
                />
              )}
              {c.to && !last ? (
                <Link
                  to={c.to}
                  className={`${hiddenCls} truncate text-[#656B73] transition-colors hover:text-[#232528]`}
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={`${hiddenCls} truncate ${
                    last ? "font-header text-[15px] text-[#232528] sm:text-base" : "text-[#656B73]"
                  }`}
                >
                  {c.label}
                </span>
              )}
            </Fragment>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-full border border-[#E2DACF] bg-white px-3 py-1.5 text-xs font-medium text-[#232528] transition-colors hover:border-[#5E93B8] hover:text-[#3A6D91] sm:inline-flex"
        >
          <span>Lihat Website</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#5E93B8]" />
        </a>
        {children}
      </div>
    </header>
  );
}
