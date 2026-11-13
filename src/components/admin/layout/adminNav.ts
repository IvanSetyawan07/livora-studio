import {
  Activity,
  BarChart3,
  Bookmark,
  BookOpen,
  Bot,
  Boxes,
  CheckCircle2,
  Cog,
  Database,
  Gauge,
  Lightbulb,
  LineChart,
  Megaphone,
  MousePointerClick,
  PenLine,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MessageCircle,
  QrCode,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sofa,
  Star,
  Store,
  Tags,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  to: string;
  key: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  feature?: string;
  owner?: boolean;
  /** kata kunci tambahan agar mudah dicari lewat kotak pencarian */
  keywords?: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
};

/** Item tunggal di paling atas (tanpa dropdown). */
export const ADMIN_HOME: AdminNavItem = {
  to: "/admin",
  end: true,
  key: "overview",
  label: "Dashboard",
  icon: LayoutDashboard,
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "content",
    label: "Katalog & Konten",
    icon: Sofa,
    items: [
      { to: "/admin/items", key: "items", label: "Furniture", feature: "catalog", icon: Sofa, keywords: "item produk" },
      { to: "/admin/collections", key: "collections", label: "Koleksi", feature: "catalog", icon: BookOpen },
      { to: "/admin/catalogs", key: "catalogs", label: "Katalog digital", feature: "catalog", icon: BookOpen },
      { to: "/admin/taxonomies", key: "taxonomies", label: "Kategori & tema", feature: "catalog", icon: Tags, keywords: "taxonomy type theme" },
      { to: "/admin/projects", key: "projects", label: "Proyek", feature: "projects", icon: FolderKanban, keywords: "project portofolio" },
      { to: "/admin/scan", key: "scan", label: "Scan QR katalog", feature: "catalog", icon: QrCode },
    ],
  },
  {
    id: "landing",
    label: "Tampilan Website",
    icon: Star,
    items: [
      { to: "/admin/landing", key: "landing", label: "Landing page", feature: "landing", icon: Star },
      { to: "/admin/promo-banners", key: "promoBanners", label: "Pop-up Promo", feature: "landing", icon: Megaphone, keywords: "promo diskon popup modal banner" },
      { to: "/admin/banners", key: "banners", label: "Banner tema", feature: "landing", icon: ImageIcon },
    ],
  },
  {
    id: "orders",
    label: "Toko & Pesanan",
    icon: ShoppingBag,
    items: [
      { to: "/admin/shop/board", key: "shopBoard", label: "Pantau proses", feature: "shop_orders", icon: Activity, keywords: "board kanban" },
      { to: "/admin/shop/orders", key: "shopOrders", label: "Pesanan", feature: "shop_orders", icon: ShoppingBag, keywords: "order" },
      { to: "/admin/shop/offline", key: "shopOffline", label: "Pembelian showroom", feature: "shop_orders", icon: Store, keywords: "offline" },
      { to: "/admin/shop/payments", key: "shopPayments", label: "Verifikasi bayar", feature: "shop_payments", icon: Wallet, keywords: "pembayaran payment" },
      { to: "/admin/shop/aftercare", key: "shopAftercare", label: "Klaim & refund", feature: "shop_aftercare", icon: LifeBuoy, keywords: "aftercare" },
      { to: "/admin/shop/scan", key: "shopScan", label: "Scan dokumen", feature: "shop_orders", icon: QrCode },
    ],
  },
  {
    id: "customers",
    label: "Pelanggan",
    icon: Users,
    items: [
      { to: "/admin/consultations", key: "consultations", label: "Konsultasi", feature: "consultations", icon: MessageCircle, keywords: "inquiry lead" },
      { to: "/admin/shop/inbox", key: "shopInbox", label: "Inbox WhatsApp", feature: "shop_inbox", icon: Inbox, keywords: "wa chat" },
      { to: "/admin/support", key: "support", label: "Chat support", feature: "support", icon: MessageCircle },
      { to: "/admin/users", key: "users", label: "Pengguna", feature: "users", icon: Users, keywords: "user akun" },
      { to: "/admin/wishlists", key: "wishlists", label: "Wishlist", feature: "wishlists", icon: Bookmark, keywords: "saved" },
      { to: "/admin/invitations", key: "invitations", label: "Sebar undangan", feature: "invitations", icon: Send, keywords: "invite" },
    ],
  },
  {
    id: "growth",
    label: "Marketing & Analitik",
    icon: BarChart3,
    items: [
      { to: "/admin/analytics", key: "analytics", label: "Analitik", feature: "analytics", icon: BarChart3 },
      { to: "/admin/marketing", key: "marketing", label: "Email marketing", feature: "marketing", icon: Mail, keywords: "campaign" },
    ],
  },
  {
    id: "ai",
    label: "AI Marketing",
    icon: Sparkles,
    items: [
      { to: "/admin/ai-marketing", end: true, key: "aiOverview", label: "Ringkasan AI", feature: "marketing", icon: LayoutDashboard, keywords: "ai marketing overview" },
      { to: "/admin/ai-marketing/ai-center/recommendations", key: "aiReco", label: "Rekomendasi", feature: "marketing", icon: Lightbulb, keywords: "ai recommendation" },
      { to: "/admin/ai-marketing/ai-center/actions", key: "aiActions", label: "Aksi AI", feature: "marketing", icon: Zap, keywords: "ai actions" },
      { to: "/admin/ai-marketing/insights", key: "aiInsights", label: "Insight", feature: "marketing", icon: Search },
      { to: "/admin/ai-marketing/seo", key: "aiSeo", label: "SEO Agent", feature: "marketing", icon: LineChart },
      { to: "/admin/ai-marketing/content", key: "aiContent", label: "Content Agent", feature: "marketing", icon: PenLine },
      { to: "/admin/ai-marketing/ads", key: "aiAds", label: "Ads Agent", feature: "marketing", icon: Megaphone, keywords: "iklan" },
      { to: "/admin/ai-marketing/leads", key: "aiLeads", label: "Lead Intelligence", feature: "marketing", icon: Users },
      { to: "/admin/ai-marketing/cro", key: "aiCro", label: "CRO Agent", feature: "marketing", icon: MousePointerClick, keywords: "conversion" },
      { to: "/admin/ai-marketing/campaigns", key: "aiCampaigns", label: "Kampanye AI", feature: "marketing", icon: FolderKanban },
      { to: "/admin/ai-marketing/impact", key: "aiImpact", label: "Dampak", feature: "marketing", icon: TrendingUp, keywords: "impact" },
      { to: "/admin/ai-marketing/approvals", key: "aiApprovals", label: "Persetujuan", feature: "marketing", icon: CheckCircle2, keywords: "approval" },
      { to: "/admin/ai-marketing/activity", key: "aiActivity", label: "Log aktivitas AI", feature: "marketing", icon: Activity },
      { to: "/admin/ai-marketing/usage", key: "aiUsage", label: "Biaya & pemakaian", feature: "marketing", icon: Gauge, keywords: "usage cost" },
      { to: "/admin/ai-marketing/providers", key: "aiProviders", label: "Provider & routing", feature: "marketing", icon: Boxes },
      { to: "/admin/ai-marketing/settings", key: "aiSettings", label: "Pengaturan AI", feature: "marketing", icon: Cog },
    ],
  },
  {
    id: "system",
    label: "Sistem & Pengaturan",
    icon: Settings2,
    items: [
      { to: "/admin/shop/settings", key: "shopSettings", label: "Pengaturan toko", feature: "shop_system", icon: Settings2 },
      { to: "/admin/shop/health", key: "shopHealth", label: "Kesehatan & funnel", feature: "shop_system", icon: Activity, keywords: "health" },
      { to: "/admin/shop/database", key: "shopDatabase", label: "Database toko", feature: "shop_database", icon: Database },
      { to: "/admin/shop/bot-simulator", key: "shopBot", label: "Simulator bot", feature: "shop_system", icon: Bot, keywords: "ai" },
      { to: "/admin/shop/bot-logs", key: "shopBotLogs", label: "Log AI & uji", feature: "shop_system", icon: FileText, keywords: "ai log" },
      { to: "/admin/roles", key: "roles", label: "Peran & hak akses", icon: ShieldCheck, owner: true, keywords: "role permission" },
    ],
  },
];

export const ALL_ADMIN_NAV: AdminNavItem[] = [
  ADMIN_HOME,
  ...ADMIN_NAV_GROUPS.flatMap((g) => g.items),
];

/** Cari item + grup yang paling cocok dengan path saat ini (path terpanjang menang). */
export function matchNav(pathname: string) {
  let best: { item: AdminNavItem; group?: AdminNavGroup } | null = null;
  const consider = (item: AdminNavItem, group?: AdminNavGroup) => {
    const hit = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
    if (hit && (!best || item.to.length > best.item.to.length)) best = { item, group };
  };
  consider(ADMIN_HOME);
  ADMIN_NAV_GROUPS.forEach((g) => g.items.forEach((i) => consider(i, g)));
  return best as { item: AdminNavItem; group?: AdminNavGroup } | null;
}
