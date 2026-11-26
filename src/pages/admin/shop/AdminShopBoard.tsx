import { Navigate } from "react-router-dom";

/**
 * Pantau Proses sekarang terintegrasi langsung di halaman Pesanan Furnitur
 * lewat tombol toggle [Daftar | Papan Proses] agar tidak ada duplikasi menu.
 * Rute /admin/shop/board tetap aktif dan otomatis membuka mode Papan Proses.
 */
export default function AdminShopBoard() {
  return <Navigate to="/admin/shop/orders?view=board" replace />;
}
