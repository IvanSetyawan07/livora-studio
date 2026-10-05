import { api, API_BASE_URL, authStorage } from "@/lib/api";

export type CartLine = {
  id: number;
  quantity: number;
  note: string | null;
  selected: boolean;
  item: { id: number; title: string; slug: string; code: string | null; image: string | null; fulfillment_type: string } | null;
  variant: { id: number; name: string; color: string | null } | null;
  availability: "available" | "limited" | "out_of_stock";
};

export type OrderItem = {
  id: number;
  title: string;
  code: string | null;
  variant_name: string | null;
  image: string | null;
  fulfillment_type: string;
  quantity: number;
  note: string | null;
  unit_price?: number;
  unit_discount?: number;
  discount_label?: string | null;
};

export type ShopPayment = {
  id: number;
  method: string | null;
  amount: number;
  status: string;
  expires_at: string | null;
  paid_at: string | null;
  qr_url: string | null;
  proofs: { id: number; status: string; reason: string | null; created_at: string }[];
};

export type ShopDocument = { id: number; number: string; title: string; status: string; version: number; issued_at: string; paid_at: string | null };

export type Quote = {
  subtotal: number; product_discount: number; extra_discount: number; dpp: number; ppn: number;
  shipping_fee: number; installation_fee: number; other_fee: number; grand_total: number;
  quote_version?: number; quote_sent_at?: string; quote_expires_at?: string;
};

export type ShopOrder = {
  code: string;
  status: string;
  status_label: string;
  order_type: string;
  source: string;
  created_at: string;
  expires_at: string | null;
  quote_expires_at: string | null;
  items: OrderItem[];
  grand_total: number | null;
  note?: string | null;
  shipping?: Record<string, any> | null;
  courier?: string | null;
  tracking_number?: string | null;
  delivery_date?: string | null;
  shipped_at?: string | null;
  received_at?: string | null;
  paid_at?: string | null;
  quote?: Quote | null;
  payments?: ShopPayment[];
  documents?: ShopDocument[];
  payment_options?: { qris: boolean; bank: { name: string; account: string | null; holder: string | null } };
};

/** Urutan tahap yang ditampilkan ke pelanggan (disederhanakan). */
export const ORDER_STEPS: { key: string; label: string; hint: string; statuses: string[] }[] = [
  { key: "wa", label: "Chat WhatsApp", hint: "Kirim pesan berisi kode pesanan ke WhatsApp Livora.", statuses: ["menunggu_wa", "wa_terhubung"] },
  { key: "data", label: "Data pengiriman", hint: "Isi alamat & detail lokasi lewat tautan yang kami kirim.", statuses: ["menunggu_data", "data_lengkap", "menunggu_review_admin"] },
  { key: "quote", label: "Penawaran", hint: "Periksa rincian harga, lalu setujui bila sesuai.", statuses: ["penawaran"] },
  { key: "pay", label: "Pembayaran", hint: "Bayar lunas dengan QRIS atau transfer BCA.", statuses: ["menunggu_bayar"] },
  { key: "process", label: "Diproses", hint: "Pesanan disiapkan tim kami.", statuses: ["dibayar", "diproses", "perlu_tindakan"] },
  { key: "ship", label: "Pengiriman", hint: "Pesanan dalam perjalanan ke alamat Anda.", statuses: ["siap_kirim", "dikirim"] },
  { key: "done", label: "Selesai", hint: "Pesanan sudah diterima.", statuses: ["diterima", "selesai"] },
];

export const stepIndex = (status: string) => ORDER_STEPS.findIndex((s) => s.statuses.includes(status));

export const rupiah = (v?: number | null) =>
  v === null || v === undefined ? "—" : "Rp " + Math.round(v).toLocaleString("id-ID");

export const getCart = () => api.get<CartLine[]>("/cart").then((r) => r.data);
export const getCartCount = () => api.get<{ count: number }>("/cart/count").then((r) => r.data.count);
export const addToCart = (body: { item_id: number; variant_id?: number | null; quantity?: number; note?: string }) =>
  api.post<CartLine>("/cart", body).then((r) => {
    window.dispatchEvent(new Event("livora:cart-changed"));
    return r.data;
  });
export const updateCartLine = (id: number, body: Partial<Pick<CartLine, "quantity" | "note" | "selected">>) =>
  api.patch<CartLine>(`/cart/${id}`, body).then((r) => {
    window.dispatchEvent(new Event("livora:cart-changed"));
    return r.data;
  });
export const removeCartLine = (id: number) =>
  api.delete(`/cart/${id}`).then(() => window.dispatchEvent(new Event("livora:cart-changed")));

export const createOrder = (body: { cart_item_ids: number[]; note?: string; wa_consent: boolean; phone?: string }, idemKey: string) =>
  api.post<{ order: ShopOrder; wa_url: string }>("/orders", body, { headers: { "Idempotency-Key": idemKey } }).then((r) => {
    window.dispatchEvent(new Event("livora:cart-changed"));
    return r.data;
  });
export const getOrders = () => api.get<ShopOrder[]>("/orders").then((r) => r.data);
export const getOrder = (code: string) => api.get<ShopOrder>(`/orders/${code}`).then((r) => r.data);
export const getWaLink = (code: string) => api.get<{ wa_url: string }>(`/orders/${code}/wa-link`).then((r) => r.data.wa_url);
export const approveQuote = (code: string) => api.post<ShopOrder>(`/orders/${code}/approve-quote`).then((r) => r.data);
export const cancelOrder = (code: string, reason?: string) => api.post<ShopOrder>(`/orders/${code}/cancel`, { reason }).then((r) => r.data);
export const startQris = (code: string) =>
  api.post<{ qr_url: string | null; qr_payload: string | null; amount: number; expires_at: string }>(`/orders/${code}/qris`).then((r) => r.data);
export const uploadPaymentProof = (code: string, file: File, amount?: number) => {
  const f = new FormData();
  f.append("proof", file);
  if (amount) f.append("amount", String(amount));
  return api.post<ShopOrder>(`/orders/${code}/payment-proof`, f, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
};

/** Unduh berkas privat dengan token login (tidak bisa lewat tautan biasa). */
export async function downloadPrivate(path: string, filename: string) {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${authStorage.getToken()}`, Accept: "application/pdf" } });
  if (!res.ok) throw new Error("Berkas tidak dapat diunduh");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function openPrivate(path: string) {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${authStorage.getToken()}` } });
  if (!res.ok) throw new Error("Berkas tidak dapat dibuka");
  const url = URL.createObjectURL(await res.blob());
  window.open(url, "_blank", "noopener");
}

// Form pengiriman publik
export const getOrderForm = (code: string, token: string) =>
  api.get(`/order-form/${code}`, { params: { token } }).then((r) => r.data as {
    code: string; items: OrderItem[]; has_mto: boolean; expires_at: string;
    prefill: { recipient?: string; phone?: string; street?: string };
  });
export const submitOrderForm = (code: string, token: string, body: Record<string, unknown>) =>
  api.post(`/order-form/${code}`, { ...body, token }, { params: { token } }).then((r) => r.data);

// ── Admin ──
export const adminShop = {
  summary: () => api.get<Record<string, number>>("/admin/shop/summary").then((r) => r.data),
  orders: (params: { status?: string; q?: string; page?: number }) => api.get("/admin/shop/orders", { params }).then((r) => r.data),
  order: (code: string) => api.get(`/admin/shop/orders/${code}`).then((r) => r.data),
  waConnected: (code: string) => api.post(`/admin/shop/orders/${code}/wa-connected`).then((r) => r.data),
  sendForm: (code: string) => api.post<{ form_url: string }>(`/admin/shop/orders/${code}/send-form`).then((r) => r.data),
  previewQuote: (code: string, body: Record<string, unknown>) => api.post<Quote>(`/admin/shop/orders/${code}/quote-preview`, body).then((r) => r.data),
  sendQuote: (code: string, body: Record<string, unknown>) => api.post(`/admin/shop/orders/${code}/quote`, body).then((r) => r.data),
  advance: (code: string, body: Record<string, unknown>) => api.post(`/admin/shop/orders/${code}/advance`, body).then((r) => r.data),
  cancel: (code: string, reason: string) => api.post(`/admin/shop/orders/${code}/cancel`, { reason }).then((r) => r.data),
  createManual: (body: Record<string, unknown>) => api.post<{ code: string }>("/admin/shop/orders", body).then((r) => r.data),
  proofs: () => api.get("/admin/shop/proofs").then((r) => r.data),
  reviewProof: (id: number, accept: boolean, reason?: string) => api.post(`/admin/shop/proofs/${id}/review`, { accept, reason }).then((r) => r.data),
  items: (q: string) => api.get("/admin/shop/items", { params: { q } }).then((r) => r.data),
  grid: (grid: string, params: Record<string, string> = {}) => api.get(`/admin/shop/database/${grid}`, { params }).then((r) => r.data.rows as Record<string, any>[]),
  findDocument: (number: string) => api.get("/admin/shop/documents/find", { params: { number } }).then((r) => r.data),
  admins: () => api.get("/admin/shop/admins").then((r) => r.data),
  setRole: (id: number, admin_role: string) => api.post(`/admin/shop/admins/${id}/role`, { admin_role }).then((r) => r.data),
  audit: (page = 1) => api.get("/admin/shop/audit", { params: { page } }).then((r) => r.data),
};

export const STATUS_TONE: Record<string, string> = {
  menunggu_wa: "bg-amber-50 text-amber-800 border-amber-200",
  wa_terhubung: "bg-amber-50 text-amber-800 border-amber-200",
  menunggu_data: "bg-amber-50 text-amber-800 border-amber-200",
  data_lengkap: "bg-sky-50 text-sky-800 border-sky-200",
  menunggu_review_admin: "bg-sky-50 text-sky-800 border-sky-200",
  penawaran: "bg-violet-50 text-violet-800 border-violet-200",
  menunggu_bayar: "bg-orange-50 text-orange-800 border-orange-200",
  dibayar: "bg-emerald-50 text-emerald-800 border-emerald-200",
  diproses: "bg-emerald-50 text-emerald-800 border-emerald-200",
  siap_kirim: "bg-emerald-50 text-emerald-800 border-emerald-200",
  dikirim: "bg-emerald-50 text-emerald-800 border-emerald-200",
  diterima: "bg-emerald-50 text-emerald-800 border-emerald-200",
  selesai: "bg-muted text-foreground border-border",
  dibatalkan: "bg-muted text-muted-foreground border-border",
  kedaluwarsa: "bg-muted text-muted-foreground border-border",
  perlu_tindakan: "bg-red-50 text-red-700 border-red-200",
};
