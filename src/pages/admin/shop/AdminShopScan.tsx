import AdminScan from "@/pages/admin/AdminScan";

/**
 * Rute /admin/shop/scan menggunakan Pemindai QR Serbaguna yang sama dengan /admin/scan
 * agar admin bisa memindai QR Invoice/Proforma sekaligus QR Produk dari satu tempat
 * dengan mesin html5-qrcode yang kompatibel di semua browser.
 */
export default function AdminShopScan() {
  return <AdminScan />;
}
