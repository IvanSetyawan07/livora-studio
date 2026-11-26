import {
  Activity,
  BarChart3,
  Bookmark,
  BookOpen,
  Bot,
  Database,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Megaphone,
  MessageCircle,
  QrCode,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sofa,
  Sparkles,
  Star,
  Store,
  Tags,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  to: string;
  key: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  feature?: string;
  /** Jika diisi, menu tampil jika admin punya akses ke salah satu fitur ini. */
  anyFeature?: string[];
  owner?: boolean;
  /** Buka workspace terpisah (mis. AI Marketing Studio). */
  externalWorkspace?: boolean;
  /** Kata kunci tambahan agar mudah dicari lewat kotak pencarian Ctrl+K. */
  keywords?: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Default tertutup agar tidak membingungkan admin harian. */
  defaultCollapsed?: boolean;
  items: AdminNavItem[];
};

/** Item tunggal di paling atas (tanpa dropdown). */
export const ADMIN_HOME: AdminNavItem = {
  to: "/admin",
  end: true,
  key: "overview",
  label: "Ringkasan Harian",
  icon: LayoutDashboard,
  keywords: "dashboard beranda home overview harian ringkasan",
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "orders",
    label: "Pesanan & Toko",
    icon: ShoppingBag,
    items: [
      {
        to: "/admin/shop/orders",
        key: "shopOrders",
        label: "Pesanan",
        feature: "shop_orders",
        icon: ShoppingBag,
        keywords: "order pesanan board kanban pantau proses produksi pengiriman invoice",
      },
      {
        to: "/admin/shop/payments",
        key: "shopPayments",
        label: "Verifikasi Pembayaran",
        feature: "shop_payments",
        icon: Wallet,
        keywords: "pembayaran bayar bukti transfer qris midtrans lunas",
      },
      {
        to: "/admin/shop/offline",
        key: "shopOffline",
        label: "Kasir Showroom",
        feature: "shop_orders",
        icon: Store,
        keywords: "offline pos kasir pembelian showroom walk in langsung",
      },
      {
        to: "/admin/shop/aftercare",
        key: "shopAftercare",
        label: "Klaim & Pengembalian",
        feature: "shop_aftercare",
        icon: LifeBuoy,
        keywords: "aftercare klaim refund retur komplain garansi",
      },
    ],
  },
  {
    id: "customers",
    label: "Pelanggan & Pesan",
    icon: MessageCircle,
    items: [
      {
        to: "/admin/consultations",
        key: "consultations",
        label: "Konsultasi & Janji Temu",
        feature: "consultations",
        icon: MessageCircle,
        keywords: "konsultasi appointment janji temu proyek inquiry lead",
      },
      {
        to: "/admin/shop/inbox",
        key: "shopInbox",
        label: "Chat WhatsApp (Livi)",
        feature: "shop_inbox",
        icon: Inbox,
        keywords: "whatsapp wa chat inbox pesan livi",
      },
      {
        to: "/admin/support",
        key: "support",
        label: "Chat Website (Livi)",
        feature: "support",
        icon: MessageCircle,
        keywords: "support chat livechat website livi cs",
      },
      {
        to: "/admin/users",
        key: "users",
        label: "Data Pelanggan",
        feature: "users",
        icon: Users,
        keywords: "user pengguna pelanggan akun member admin",
      },
      {
        to: "/admin/wishlists",
        key: "wishlists",
        label: "Wishlist Pelanggan",
        feature: "wishlists",
        icon: Bookmark,
        keywords: "wishlist simpan favorit produk",
      },
      {
        to: "/admin/invitations",
        key: "invitations",
        label: "Sebar Undangan",
        feature: "invitations",
        icon: Send,
        keywords: "invite undangan rsvp acara event tamu",
      },
    ],
  },
  {
    id: "content",
    label: "Katalog & Portofolio",
    icon: Sofa,
    items: [
      {
        to: "/admin/items",
        key: "items",
        label: "Produk Furnitur",
        feature: "catalog",
        icon: Sofa,
        keywords: "furniture item produk harga diskon promo stok foto warna cutout",
      },
      {
        to: "/admin/collections",
        key: "collections",
        label: "Koleksi Furnitur",
        feature: "catalog",
        icon: BookOpen,
        keywords: "koleksi collection seri tema",
      },
      {
        to: "/admin/catalogs",
        key: "catalogs",
        label: "Lookbook Hotspot",
        feature: "catalog",
        icon: BookOpen,
        keywords: "katalog digital lookbook hotspot pdf ruangan",
      },
      {
        to: "/admin/taxonomies",
        key: "taxonomies",
        label: "Kategori & Foto Galeri",
        feature: "catalog",
        icon: Tags,
        keywords: "taxonomy kategori tema scope jenis furnitur banner permanent gallery",
      },
      {
        to: "/admin/projects",
        key: "projects",
        label: "Portofolio Proyek",
        feature: "projects",
        icon: FolderKanban,
        keywords: "project proyek portofolio interior rumah selected works",
      },
      {
        to: "/admin/scan",
        key: "scan",
        label: "Scan QR Serbaguna",
        anyFeature: ["catalog", "shop_orders"],
        icon: QrCode,
        keywords: "scan qr barcode katalog dokumen invoice order produk",
      },
    ],
  },
  {
    id: "landing",
    label: "Tampilan Website",
    icon: Star,
    items: [
      {
        to: "/admin/landing",
        key: "landing",
        label: "Atur Halaman Depan",
        feature: "landing",
        icon: Star,
        keywords: "landing page homepage beranda selected works new arrivals",
      },
      {
        to: "/admin/promo-banners",
        key: "promoBanners",
        label: "Pop-up Promo",
        feature: "landing",
        icon: Megaphone,
        keywords: "promo diskon popup modal banner pengumuman",
      },
    ],
  },
  {
    id: "growth",
    label: "Laporan & Marketing",
    icon: BarChart3,
    items: [
      {
        to: "/admin/analytics",
        key: "analytics",
        label: "Laporan & Statistik",
        feature: "analytics",
        icon: BarChart3,
        keywords: "analitik laporan statistik pengunjung trafik klik pdf",
      },
      {
        to: "/admin/marketing",
        key: "marketing",
        label: "Broadcast Email",
        feature: "marketing",
        icon: Mail,
        keywords: "email marketing campaign newsletter broadcast blast",
      },
      {
        to: "/admin/ai-marketing",
        key: "aiMarketing",
        label: "AI Marketing Studio",
        feature: "marketing",
        icon: Sparkles,
        externalWorkspace: true,
        keywords: "ai marketing seo ads iklan konten sosmed cro leads google maps",
      },
    ],
  },
  {
    id: "system",
    label: "Pengaturan & Sistem",
    icon: Settings2,
    items: [
      {
        to: "/admin/shop/settings",
        key: "shopSettings",
        label: "Pengaturan Toko",
        feature: "shop_system",
        icon: Settings2,
        keywords: "pengaturan setting toko jam buka rekening whatsapp bot livi",
      },
      {
        to: "/admin/roles",
        key: "roles",
        label: "Tim & Hak Akses",
        icon: ShieldCheck,
        owner: true,
        keywords: "role peran hak akses tim admin izin",
      },
      {
        to: "/admin/shop/database",
        key: "shopDatabase",
        label: "Database & Ekspor",
        feature: "shop_database",
        icon: Database,
        keywords: "database ekspor csv excel rekap data toko",
      },
    ],
  },
  {
    id: "technical",
    label: "Alat Teknis (IT)",
    icon: Wrench,
    defaultCollapsed: true,
    items: [
      {
        to: "/admin/shop/health",
        key: "shopHealth",
        label: "Kesehatan Sistem",
        feature: "shop_system",
        icon: Activity,
        keywords: "health kesehatan funnel webhook midtrans error sistem",
      },
      {
        to: "/admin/shop/bot-simulator",
        key: "shopBot",
        label: "Simulator Bot Livi",
        feature: "shop_system",
        icon: Bot,
        keywords: "simulator bot ai latihan sandbox uji coba livi",
      },
      {
        to: "/admin/shop/bot-logs",
        key: "shopBotLogs",
        label: "Log & Uji Bot",
        feature: "shop_system",
        icon: FileText,
        keywords: "ai log bot percakapan pengujian",
      },
    ],
  },
];

export const ALL_ADMIN_NAV: AdminNavItem[] = [
  ADMIN_HOME,
  ...ADMIN_NAV_GROUPS.flatMap((g) => g.items),
];

/**
 * Alias rute lama/terkonsolidasi agar bookmark, link lama, breadcrumb, dan cek izin
 * tetap bekerja 100% tanpa 404 atau salah izin.
 */
const ROUTE_ALIASES: Array<{ prefix: string; targetTo: string }> = [
  { prefix: "/admin/banners", targetTo: "/admin/taxonomies" },
  { prefix: "/admin/shop/board", targetTo: "/admin/shop/orders" },
  { prefix: "/admin/shop/scan", targetTo: "/admin/scan" },
];

/** Cek apakah admin boleh melihat item menu tertentu. */
export function canAccessNavItem(
  item: AdminNavItem,
  isOwner: boolean,
  levelOf: (feature?: string) => string,
): boolean {
  if (item.owner) return isOwner;
  if (item.anyFeature?.length) {
    return item.anyFeature.some((f) => levelOf(f) !== "none");
  }
  return levelOf(item.feature) !== "none";
}

/** Hitung level izin tertinggi untuk sebuah item menu ("none" | "view" | "edit"). */
export function resolveNavItemLevel(
  item: AdminNavItem,
  isOwner: boolean,
  levelOf: (feature?: string) => string,
): "none" | "view" | "edit" {
  if (item.owner) return isOwner ? "edit" : "none";
  if (item.anyFeature?.length) {
    const levels = item.anyFeature.map((f) => levelOf(f));
    if (levels.includes("edit")) return "edit";
    if (levels.includes("view")) return "view";
    return "none";
  }
  const lvl = levelOf(item.feature);
  return lvl === "edit" || lvl === "view" ? lvl : "none";
}

/** Cari item + grup yang paling cocok dengan path saat ini (path terpanjang menang). */
export function matchNav(pathname: string) {
  let normalized = pathname;
  for (const alias of ROUTE_ALIASES) {
    if (pathname === alias.prefix || pathname.startsWith(alias.prefix + "/")) {
      normalized = alias.targetTo;
      break;
    }
  }

  let best: { item: AdminNavItem; group?: AdminNavGroup } | null = null;
  const consider = (item: AdminNavItem, group?: AdminNavGroup) => {
    const hit = item.end ? normalized === item.to : normalized === item.to || normalized.startsWith(item.to + "/");
    if (hit && (!best || item.to.length > best.item.to.length)) best = { item, group };
  };
  consider(ADMIN_HOME);
  ADMIN_NAV_GROUPS.forEach((g) => g.items.forEach((i) => consider(i, g)));
  return best as { item: AdminNavItem; group?: AdminNavGroup } | null;
}
