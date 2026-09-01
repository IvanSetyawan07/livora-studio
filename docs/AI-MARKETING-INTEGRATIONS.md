# AI Marketing — Daftar Koneksi Platform

Prinsip: **tidak ada data dummy**. Selama kredensial kosong, dashboard menampilkan
blok "Not connected" beserta nama env key-nya, bukan angka contoh.

Semua kredensial ditaruh di **`backend/.env`**, dibaca lewat **`backend/config/services.php`**.
Setelah mengisi: `php artisan config:clear`.

| Halaman dashboard | Platform | Env key |
|---|---|---|
| SEO (KPI + AI opportunities) | Google Search Console — **sudah live** | `GOOGLE_MARKETING_CLIENT_ID`, `GOOGLE_MARKETING_CLIENT_SECRET`, `GOOGLE_MARKETING_REDIRECT_URI` |
| SEO › Local SEO | Google Business Profile | `GOOGLE_BUSINESS_ACCOUNT_ID`, `GOOGLE_BUSINESS_LOCATION_ID` (+ scope `business.manage` pada OAuth Google di atas) |
| Ads | Meta Ads | `META_ADS_ACCESS_TOKEN`, `META_ADS_ACCOUNT_ID`, `META_ADS_API_VERSION` |
| Ads | Google Ads | `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_REFRESH_TOKEN` |
| Content / Social | Meta Graph (IG + FB) | `META_GRAPH_ACCESS_TOKEN`, `META_PAGE_ID`, `META_INSTAGRAM_BUSINESS_ID` |
| Content / Social | TikTok | `TIKTOK_ACCESS_TOKEN`, `TIKTOK_BUSINESS_ID` |
| Content / Social | YouTube | `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID` |
| Overview (Performance + Channel mix) | Google Analytics 4 | `GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_JSON` |
| Leads (statistik email) | Mailgun / Resend / SES | `MAILGUN_SECRET` atau `RESEND_API_KEY` |
| AI reasoning (semua agent) | Gemini / Groq / Anthropic — **sudah live** | `GEMINI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY` |

## Catatan per platform

- **Meta (Ads + Graph)**: buat App di developers.facebook.com, tambahkan System User di
  Business Manager, beri akses ke Ad Account & Page, generate long-lived token dengan
  scope `ads_read`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights`.
- **Google Ads**: developer token dari akun Manager (MCC), lalu OAuth refresh token
  memakai client yang sama dengan `GOOGLE_MARKETING_*`.
- **GA4**: pakai service account, beri role Viewer pada property, simpan path file JSON.
- **Google Business Profile**: aktifkan "My Business Business Information API" di project
  Google Cloud yang sama, tambahkan scope `https://www.googleapis.com/auth/business.manage`
  di `GoogleIntegrationController::SCOPES`, lalu connect ulang dari halaman SEO.

## Yang sudah live sekarang

- Search Console (OAuth + KPI 28 hari + SEO Agent insights)
- CRO Agent (funnel dari database + AIProviderManager)
- Dashboard KPI, priorities, recommendations, approvals, insights, activity, usage/providers
- AI Chat (Ask Livora) di shell AI Marketing

## Yang sengaja kosong (menunggu kredensial di atas)

Ads, Content/Social, Local SEO, Overview performance chart & channel mix,
metrik email di halaman Leads.

## Endpoint data nyata (tanpa AI, tanpa fixture)

| Endpoint | Sumber |
|---|---|
| `GET /api/ai/seo/search-console-summary?days=28` | Google Search Console (cache 20 menit) |
| `GET /api/ai/cro/funnel-summary` | tabel `consultations` + `consultation_status_histories` |

## Verifikasi di server

```bash
cd backend
php artisan config:clear
php artisan route:list --path=ai
php artisan ai:run-agent seo --limit=5
php artisan ai:run-agent cro --limit=5
```
