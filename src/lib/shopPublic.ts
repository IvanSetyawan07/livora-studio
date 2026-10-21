import { api } from "@/lib/api";

/** Keranjang anonim (tanpa login) + halaman bertoken — alur WA-first. */

export type PublicCartLine = {
  item_id: number;
  variant_id?: number | null;
  quantity: number;
  note?: string;
  title: string;
  code?: string | null;
  image?: string | null;
  slug?: string;
};

const KEY = "livora_public_cart";

export const getPublicCart = (): PublicCartLine[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export const savePublicCart = (lines: PublicCartLine[]) => {
  localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event("livora-cart-changed"));
};

export const addPublicCartLine = (line: PublicCartLine) => {
  const lines = getPublicCart();
  const existing = lines.find((l) => l.item_id === line.item_id && l.variant_id === line.variant_id);
  if (existing) existing.quantity += line.quantity;
  else lines.push(line);
  savePublicCart(lines);
};

export const clearPublicCart = () => savePublicCart([]);

/** Simpan keranjang ke server → kode CRT-XXXX + URL wa.me berisi kode. */
export const checkoutPublicCart = (lines: PublicCartLine[]) =>
  api
    .post<{ code: string; wa_url: string }>("/shop/carts", {
      items: lines.map((l) => ({ item_id: l.item_id, variant_id: l.variant_id ?? null, quantity: l.quantity, note: l.note })),
      session_id: sessionStorage.getItem("livora_session") ?? undefined,
    })
    .then((r) => r.data);

// ── Halaman bertoken ──

export type ConfirmPage = {
  code: string;
  status: string;
  status_label: string;
  customer_name: string | null;
  shipping: Record<string, any> | null;
  shipping_method: string | null;
  items: { title: string; variant_name: string | null; quantity: number; unit_price: number; unit_discount: number; discount_label: string | null }[];
  quote: { subtotal: number; product_discount: number; extra_discount: number; ppn: number; shipping_fee: number; installation_fee: number; other_fee: number; grand_total: number } | null;
  quote_version: number;
  quote_expires_at: string | null;
  expired: boolean;
  confirmable: boolean;
  payment_url: string | null;
};

export type PayPage = {
  code: string;
  status: string;
  paid: boolean;
  grand_total: number;
  unique_code: number | null;
  transfer_total: number;
  payment_due_at: string | null;
  bank: { name: string; account: string | null; holder: string | null };
  qris: boolean;
  wa_number: string | null;
  invoice_number: string | null;
  invoice_id: number | null;
  items: { title: string; variant_name: string | null; quantity: number }[];
};

export const getConfirmPage = (code: string, token: string) =>
  api.get<ConfirmPage>(`/shop/order/${code}/confirm`, { params: { token } }).then((r) => r.data);

export const confirmOrder = (code: string, token: string) =>
  api.post<{ ok: boolean; payment_url: string }>(`/shop/order/${code}/confirm`, { token }).then((r) => r.data);

export const reviseOrder = (code: string, token: string, note: string) =>
  api.post(`/shop/order/${code}/revise`, { token, note }).then((r) => r.data);

export const getPayPage = (code: string, token: string) =>
  api.get<PayPage>(`/shop/order/${code}/pay`, { params: { token } }).then((r) => r.data);

export const invoicePdfUrl = (code: string, token: string) =>
  `${api.defaults.baseURL}/shop/order/${code}/invoice.pdf?token=${encodeURIComponent(token)}`;
