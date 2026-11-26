import { Navigate } from "react-router-dom";

/**
 * Rute lama /admin/banners dialihkan ke Kategori & Foto Galeri (tab Jenis Furnitur)
 * agar semua foto thumbnail & banner kategori tersimpan aman di server database.
 */
export default function AdminBanners() {
  return <Navigate to="/admin/taxonomies?tab=furniture-types" replace />;
}
