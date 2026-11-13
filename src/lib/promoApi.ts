import { api } from "@/lib/api";
import { imgUrl } from "@/lib/adminApi";
import { mapApiItem, type RichItem } from "@/lib/itemsApi";

export interface PromoBanner {
  id: number;
  title: string;
  subtitle?: string | null;
  label?: string | null;
  description?: string | null;
  image_url: string;
  cta_text?: string | null;
  cta_link?: string | null;
  order_index: number;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BulkDiscountPayload {
  item_ids: number[];
  discount_type?: "PERCENTAGE" | "FIXED_AMOUNT" | null;
  discount_value?: number;
  promo_badge_text?: string | null;
  promo_start_date?: string | null;
  promo_end_date?: string | null;
}

/** Mengambil daftar banner promo aktif untuk homepage pop-up & halaman promo */
export async function getPublicPromoBanners(): Promise<PromoBanner[]> {
  try {
    const res = await api.get<PromoBanner[]>("/promo-banners");
    return (res.data || []).map((b) => ({
      ...b,
      image_url: imgUrl(b.image_url),
    }));
  } catch (err) {
    console.warn("Gagal memuat promo banners:", err);
    return [];
  }
}

/** Admin: daftar seluruh banner promo */
export async function getAdminPromoBanners(): Promise<PromoBanner[]> {
  const res = await api.get<PromoBanner[]>("/admin/promo-banners");
  return res.data || [];
}

/** Admin: simpan banner promo baru */
export async function createPromoBanner(formData: FormData): Promise<PromoBanner> {
  const res = await api.post<PromoBanner>("/admin/promo-banners", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/** Admin: perbarui banner promo */
export async function updatePromoBanner(id: number, formData: FormData): Promise<PromoBanner> {
  const res = await api.post<PromoBanner>(`/admin/promo-banners/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/** Admin: toggle status aktif/nonaktif cepat */
export async function togglePromoBanner(id: number): Promise<{ ok: boolean; is_active: boolean; banner: PromoBanner }> {
  const res = await api.patch<{ ok: boolean; is_active: boolean; banner: PromoBanner }>(
    `/admin/promo-banners/${id}/toggle`
  );
  return res.data;
}

/** Admin: hapus banner promo */
export async function deletePromoBanner(id: number): Promise<void> {
  await api.delete(`/admin/promo-banners/${id}`);
}

/** Admin: terapkan diskon secara massal (bulk-assign) */
export async function bulkDiscountItems(payload: BulkDiscountPayload): Promise<{ ok: boolean; updated_count: number; message: string }> {
  const res = await api.post<{ ok: boolean; updated_count: number; message: string }>(
    "/admin/items/bulk-discount",
    payload
  );
  return res.data;
}

/** Mengambil item-item yang sedang promo */
export async function getPromoItems(params?: { type?: string; sort?: string }): Promise<RichItem[]> {
  try {
    const res = await api.get<any[]>("/items", {
      params: {
        promo: 1,
        ...params,
      },
    });
    const mapped = (res.data || []).map(mapApiItem);
    if (mapped.length > 0) {
      return mapped.filter((i) => i.is_on_promo !== false);
    }
    // Fallback: periksa seluruh items dan filter yang is_on_promo == true
    const allRes = await api.get<any[]>("/items");
    const allMapped = (allRes.data || []).map(mapApiItem);
    return allMapped.filter((i) => Boolean(i.is_on_promo));
  } catch (err) {
    console.warn("Gagal memuat promo items:", err);
    return [];
  }
}
