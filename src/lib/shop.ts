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
  kind?: string;
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
  has_mto?: boolean;
  spec_approved_at?: string | null;
  production_started_at?: string | null;
  custom_spec?: { order_item_id: number; dimensions?: string; material?: string; color?: string; notes?: string }[] | null;
  delivery?: { receiver_name: string | null; received_at: string | null; notes: string | null } | null;
  claims?: { id: number; type: string; description: string; status: string; resolution: string | null; photo_count: number; created_at: string }[];
  refunds?: { id: number; amount: number; status: string; reason: string; admin_note: string | null; bank_name: string | null; account: string | null; created_at: string }[];
  changes?: { id: number; description: string; price_delta: number; ppn: number; total: number; status: string; payment_id: number | null; created_at: string }[];
  warranty_days?: number;
  return_days?: number;
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
export const approveQuote = (code: string, acceptTerms = false) => api.post<ShopOrder>(`/orders/${code}/approve-quote`, { accept_terms: acceptTerms }).then((r) => r.data);
export const requestRefund = (code: string, body: { reason: string; bank_name: string; account_number: string; account_holder: string }) =>
  api.post<ShopOrder>(`/orders/${code}/refund`, body).then((r) => r.data);
export const openClaim = (code: string, type: string, description: string, photos: File[]) => {
  const f = new FormData();
  f.append("type", type);
  f.append("description", description);
  photos.forEach((p) => f.append("photos[]", p));
  return api.post<ShopOrder>(`/orders/${code}/claims`, f, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
};
export const respondChange = (code: string, id: number, approve: boolean) => api.post<ShopOrder>(`/orders/${code}/changes/${id}`, { approve }).then((r) => r.data);
export const trackFunnel = (event: "konsultasi_klik") => {
  let s = sessionStorage.getItem("livora_sid");
  if (!s) { s = crypto.randomUUID(); sessionStorage.setItem("livora_sid", s); }
  api.post("/funnel", { event, path: window.location.pathname, session: s }).catch(() => {});
};
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
  audit: (page = 1, action?: string) => api.get("/admin/shop/audit", { params: { page, action } }).then((r) => r.data),
  extras: (code: string) => api.get(`/admin/shop/orders/${code}/extras`).then((r) => r.data),
  startProduction: (code: string) => api.post(`/admin/shop/orders/${code}/production`).then((r) => r.data),
  bast: (code: string, photos: File[], receiver_name: string, signature?: File | null, notes?: string) => {
    const f = new FormData();
    photos.forEach((p) => f.append("photos[]", p));
    if (signature) f.append("signature", signature);
    f.append("receiver_name", receiver_name);
    if (notes) f.append("notes", notes);
    return api.post(`/admin/shop/orders/${code}/bast`, f, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  linkProject: (code: string, project_id: number | null) => api.post(`/admin/shop/orders/${code}/project`, { project_id }).then((r) => r.data),
  projects: () => api.get<{ id: number; title: string }[]>("/admin/shop/projects").then((r) => r.data),
  createChange: (code: string, description: string, price_delta: number) => api.post(`/admin/shop/orders/${code}/changes`, { description, price_delta }).then((r) => r.data),
  createRefund: (code: string, body: Record<string, unknown>) => api.post(`/admin/shop/orders/${code}/refunds`, body).then((r) => r.data),
  claims: (status?: string) => api.get("/admin/shop/claims", { params: { status } }).then((r) => r.data as any[]),
  updateClaim: (id: number, status: string, resolution?: string) => api.post(`/admin/shop/claims/${id}`, { status, resolution }).then((r) => r.data),
  refunds: (status?: string) => api.get("/admin/shop/refunds", { params: { status } }).then((r) => r.data as any[]),
  updateRefund: (id: number, action: string, extra: { note?: string; amount?: number; proof?: File | null } = {}) => {
    const f = new FormData();
    f.append("action", action);
    if (extra.note) f.append("note", extra.note);
    if (extra.amount !== undefined) f.append("amount", String(extra.amount));
    if (extra.proof) f.append("proof", extra.proof);
    return api.post(`/admin/shop/refunds/${id}`, f, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  inbox: (status?: string) => api.get("/admin/shop/inbox", { params: { status } }).then((r) => r.data as any[]),
  inboxMessages: (id: number) => api.get(`/admin/shop/inbox/${id}`).then((r) => r.data as any[]),
  inboxReply: (id: number, body: string, note = false) => api.post(`/admin/shop/inbox/${id}/reply`, { body, note }).then((r) => r.data),
  inboxAction: (id: number, action: string) => api.post(`/admin/shop/inbox/${id}/action`, { action }).then((r) => r.data),
  settings: () => api.get("/admin/shop/settings").then((r) => r.data as Record<string, any>),
  saveSettings: (body: Record<string, unknown>) => api.post("/admin/shop/settings", body).then((r) => r.data as Record<string, any>),
  health: () => api.get("/admin/shop/health").then((r) => r.data as Record<string, any>),
  retryFailed: (id: number) => api.post(`/admin/shop/health/failed/${id}/retry`).then((r) => r.data),
  dismissFailed: (id: number) => api.post(`/admin/shop/health/failed/${id}/dismiss`).then((r) => r.data),
  funnel: (days = 30) => api.get("/admin/shop/funnel", { params: { days } }).then((r) => r.data as Record<string, any>),
  simulate: (phone: string, text: string) => api.post("/admin/shop/bot/simulate", { phone, text }).then((r) => r.data as { replies: string[]; session: string; flow?: boolean }),
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
