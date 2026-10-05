# WhatsApp Flow: Form Pengiriman (opsional)

Tanpa Flow, bot mengirim tautan form web (sudah berjalan). Dengan Flow, pelanggan mengisi data langsung di WhatsApp.

1. WhatsApp Manager → Flows → Create flow, nama "Livora Pengiriman", satu layar `SHIPPING`.
2. Field (name persis): `recipient`, `phone`, `street`, `district`, `city`, `province`, `postal_code`, `landmark`,
   `building_type` (dropdown), `floor`, `has_lift` (opt-in), `needs_installation` (opt-in), `notes`.
3. Footer action: `complete`, payload berisi semua field di atas + `"flow_token": "${data.flow_token}"`.
4. Publish, salin Flow ID ke `SHOP_WA_FLOW_ID` di `backend/.env`, lalu `php artisan config:clear`.
5. Barang custom & spesifikasi tetap lewat form web (Flow hanya alamat).
