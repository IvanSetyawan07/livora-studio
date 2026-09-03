# Checklist Kredensial — Tugas Anda

Semua UI dashboard AI Marketing sudah tampil lengkap (KPI, chart, donut, tabel),
tapi masih berstatus **Not connected**. Begitu key di bawah diisi, panel yang
bersangkutan otomatis hidup. Tidak ada data dummy di mana pun.

**Wadahnya**: `backend/.env` (template lengkap: `backend/.env.example`).
Setelah mengisi, jalankan di server:

```bash
php artisan config:clear && php artisan cache:clear
```

---

## 1. Meta Ads — halaman **Ads** (Spend, Leads, CPL, ROAS, Budget Split, Campaign table)

| Env key | Cara dapat |
| --- | --- |
| `META_ADS_ACCESS_TOKEN` | business.facebook.com → Business Settings → System Users → buat System User (admin) → Generate Token, pilih app + scope `ads_read`, `ads_management` |
| `META_ADS_ACCOUNT_ID` | Ads Manager → dropdown akun, format `act_1234567890` |
| `META_ADS_API_VERSION` | opsional, default `v21.0` |

Tugas: buat/verifikasi Business Manager, hubungkan Ad Account, tambahkan System User sebagai admin Ad Account.

## 2. Google Ads — halaman **Ads**

| Env key | Cara dapat |
| --- | --- |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads Manager (MCC) → Tools → API Center (butuh approval Basic Access) |
| `GOOGLE_ADS_CUSTOMER_ID` | ID akun iklan tanpa tanda hubung |
| `GOOGLE_ADS_REFRESH_TOKEN` | OAuth playground / script dengan scope `https://www.googleapis.com/auth/adwords` memakai `GOOGLE_MARKETING_CLIENT_ID/SECRET` yang sudah ada |

## 3. Instagram & Facebook — halaman **Content / Social**

| Env key | Cara dapat |
| --- | --- |
| `META_GRAPH_ACCESS_TOKEN` | Token long-lived dengan scope `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`, `pages_show_list` |
| `META_PAGE_ID` | Facebook Page → About → Page ID |
| `META_INSTAGRAM_BUSINESS_ID` | Graph API: `/{page-id}?fields=instagram_business_account` |

Prasyarat: akun IG harus **Business/Creator** dan tertaut ke Facebook Page.

## 4. TikTok & YouTube — halaman **Content / Social**

| Env key | Cara dapat |
| --- | --- |
| `TIKTOK_ACCESS_TOKEN` | TikTok for Business → Developer app → OAuth, scope reporting |
| `TIKTOK_BUSINESS_ID` | TikTok Business Center |
| `YOUTUBE_API_KEY` | Google Cloud Console → enable YouTube Data API v3 → Create API Key |
| `YOUTUBE_CHANNEL_ID` | YouTube Studio → Settings → Channel → Advanced |

## 5. GA4 — **Overview** (Performance Overview chart, Avg Engagement KPI)

| Env key | Cara dapat |
| --- | --- |
| `GA4_PROPERTY_ID` | GA4 Admin → Property Settings (angka saja) |
| `GA4_SERVICE_ACCOUNT_JSON` | Google Cloud → Service Account → JSON key. Tambahkan email service account sebagai **Viewer** di GA4 property |

Simpan JSON sebagai satu baris (escaped) atau path file di server.

## 6. Google Business Profile — **Local SEO** (Map views, calls, reviews)

| Env key | Cara dapat |
| --- | --- |
| `GOOGLE_BUSINESS_ACCOUNT_ID` | Business Profile API `accounts.list` → `accounts/{id}` |
| `GOOGLE_BUSINESS_LOCATION_ID` | `accounts/{id}/locations` → `locations/{id}` |

Tugas: minta akses Business Profile API di Google Cloud, dan tambahkan scope
`https://www.googleapis.com/auth/business.manage` ke OAuth client Google yang
sudah dipakai Search Console, lalu connect ulang.

## 7. Email stats — halaman **Leads** (Open/Click rate)

| Env key | Cara dapat |
| --- | --- |
| `RESEND_API_KEY` atau `MAILGUN_SECRET` | Dashboard penyedia email → API Keys (butuh permission read/stats) |

---

## Sudah live (tidak perlu apa-apa)

- Google Search Console → halaman SEO
- CRO agent (funnel dari database konsultasi)
- KPI dashboard, priorities, recommendations, insights, activity, usage
- AI Chat (Ask Livora)

## Urutan yang saya sarankan

1. GA4 (paling banyak menghidupkan panel Overview)
2. Meta Graph (Social) → Meta Ads
3. Google Business Profile (Local SEO)
4. Google Ads
5. TikTok / YouTube
6. Email stats
