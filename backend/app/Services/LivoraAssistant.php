<?php

namespace App\Services;

use App\Models\Catalog;
use App\Models\Collection;
use App\Models\Item;
use App\Models\Project;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * Livora Concierge — AI assistant.
 *
 * Menggabungkan brand profile + panduan navigasi website (static knowledge,
 * lihat BRAND_PROFILE & SITE_GUIDE) dengan retrieval dari database (items,
 * collections, projects, catalogs), lalu memanggil Gemini API.
 *
 * Catatan: SITE_GUIDE sengaja hanya berisi alur yang aman dilihat user (browsing,
 * konsultasi, chat AI → CS). Detail implementasi backend (skema database, alur
 * admin, marketing, analytics) TIDAK dimasukkan ke static knowledge ini.
 *
 * PENTING: model (Gemini) HANYA memilih `type` + `slug` dari data yang sudah
 * disediakan di context. Gambar dan URL asli SELALU di-resolve ulang di sini
 * dari database — supaya tidak ada link/gambar hasil karangan model.
 *
 * PROTEKSI YANG AKTIF DI FILE INI (lihat method reply()):
 * 1) emergencyLimitReached() — jaring pengaman darurat GLOBAL, angka sangat
 *    tinggi, cuma untuk kondisi ekstrem (bug/insiden), TIDAK untuk operasional
 *    harian normal. Tidak akan mematikan AI karena traffic customer wajar.
 * 2) checkSpam() — rate-limit PER USER/SESI (bukan global), jadi kalau satu
 *    orang spam, customer lain tetap bisa chat normal. Baru memblokir kalau
 *    volume tinggi DAN pesannya berulang/identik (ciri bot), bukan cuma
 *    karena user chat cepat.
 */
class LivoraAssistant
{
    /**
     * Mapping tipe konten -> pola URL halaman detail di frontend.
     * SESUAIKAN kalau route React kamu bukan singular seperti ini.
     */
    private const FRONTEND_PATHS = [
        'item'       => '/items/%s',
        'collection' => '/collection/%s',
        'catalog'    => '/catalog/%s',
        'project'    => '/projects/%s',
    ];

    /** Halaman untuk booking konsultasi. Sesuaikan kalau path-nya beda. */
    private const CONSULTATION_PATH = '/appointment';

    /**
     * Sinonim EN<->ID untuk keyword furniture, supaya query "meja" tetap match
     * title bahasa Inggris ("table") dan sebaliknya. Ini cuma MEMPERLUAS kata
     * kunci pencarian, bukan mengganti kata kunci asli user.
     */
    private const KEYWORD_SYNONYMS = [
        'meja'        => ['table', 'desk', 'console'],
        'kursi'       => ['chair', 'armchair', 'stool', 'bench'],
        'sofa'        => ['couch', 'sectional'],
        'lemari'      => ['cabinet', 'wardrobe', 'closet', 'credenza'],
        'rak'         => ['shelf', 'shelving', 'rack'],
        'tidur'       => ['bed', 'bedroom'],
        'ranjang'     => ['bed', 'bedroom'],
        'kasur'       => ['mattress', 'bed'],
        'nakas'       => ['bedside', 'nightstand'],
        'lampu'       => ['lamp', 'light', 'lighting', 'pendant'],
        'karpet'      => ['rug', 'carpet'],
        'cermin'      => ['mirror'],
        'bantal'      => ['pillow', 'cushion'],
        'gorden'      => ['curtain'],
        'partisi'     => ['partition', 'divider'],
        'marmer'      => ['marble'],
        'batu'        => ['stone', 'travertine', 'limestone'],
        'kayu'        => ['wood', 'oak', 'walnut', 'teak', 'ash'],
        'kulit'       => ['leather'],
        'kain'        => ['fabric', 'linen', 'boucle', 'velvet'],
        'tamu'        => ['living', 'lounge'],
        'makan'       => ['dining'],
        'kamar'       => ['bedroom', 'bed'],
        'kantor'      => ['office', 'workspace', 'executive'],
        'aksesoris'   => ['accessories', 'accent', 'decor'],
    ];

    /**
     * Jaring pengaman darurat (BUKAN kuota operasional harian) — proteksi
     * biaya API kalau ada bug/insiden aneh (mis. infinite loop, bot masif).
     * Angkanya sengaja sangat tinggi supaya nyaris tidak pernah tersentuh
     * oleh traffic customer normal, jadi AI tidak akan tiba-tiba "mati"
     * di tengah hari karena ramai chat wajar.
     */
    private const EMERGENCY_DAILY_LIMIT = 50000;

    /**
     * Anti-spam PER USER/SESI (bukan global) — user lain tidak terpengaruh
     * walau satu user kena block. Threshold longgar supaya customer yang
     * lagi semangat nanya beruntun tidak ke-block; yang ditangkap cuma pola
     * bot (pesan sangat cepat DAN berulang/identik).
     */
    private const SPAM_WINDOW_SECONDS      = 60; // jendela waktu yang dipantau
    private const SPAM_MAX_MESSAGES        = 12; // maks pesan dalam jendela sebelum dicurigai
    private const SPAM_COOLDOWN_SECONDS    = 20; // masa tunggu setelah kena flag (sengaja pendek)
    private const SPAM_DUPLICATE_THRESHOLD = 3;  // berapa kali pesan identik berturut-turut baru dianggap bot

    /**
     * Brand/company knowledge — dipakai untuk pertanyaan profil perusahaan.
     * Sumber: Company Profile Livora 2026 (PT. Langgeng Cipta Ruang).
     *
     * PENTING (identitas — sering salah dipahami, JANGAN diubah tanpa cek company profile):
     * - Livora = SHOWROOM interior & furniture, BUKAN "design studio" berdiri sendiri, BUKAN
     *   "Livora Architechture".
     * - PT. Langgeng Cipta Ruang = entitas/pusat resmi yang menaungi Livora (lihat header company
     *   profile: "PT. LANGGENG CIPTA RUANG" di atas logo "LIVORA").
     * - Showroom & kantor Livora ada di Jakarta Selatan, BUKAN Bandung. "Cihampelas, Bandung"
     *   yang muncul di portofolio adalah lokasi PROJECT KLIEN, bukan asal perusahaan.
     */
    public const BRAND_PROFILE = <<<'TXT'
Livora adalah showroom interior & furniture yang berada di bawah naungan PT. Langgeng Cipta Ruang
— PT. Langgeng Cipta Ruang adalah entitas/pusat resmi Livora, dan Livora adalah brand showroom &
layanan yang tampil ke pelanggan. Livora BUKAN "design studio" yang berdiri sendiri, dan BUKAN
berasal dari atau berpusat di Bandung — showroom & kantor kami ada di Jakarta Selatan (Bandung
hanya lokasi salah satu project klien di portofolio kami).

Livora hadir sebagai satu pintu (single point of contact) untuk seluruh proses mewujudkan ruang
impian klien: berperan sebagai Designer yang merancang ruang sesuai kebutuhan, Importer yang
menyediakan material berkualitas langsung, dan Contractor yang memastikan setiap detail terpasang
sempurna.

Visi: Menjadi ekosistem "One-Stop" terdepan untuk interior, di mana desain, pengadaan material,
dan konstruksi menyatu untuk menjawab kebutuhan pelanggan.

Misi:
- Menyederhanakan proses menciptakan ruang interior yang kompleks.
- Menghadirkan kualitas kelas atas serta desain, furniture, dan instalasi yang adaptif.
- Menciptakan dampak yang bermakna dan tahan lama dari setiap ruang yang kami buat.

Gaya desain: perpaduan Modern & European — elegan, detail halus, seimbang antara estetika dan
fungsi, tetap disesuaikan dengan kebutuhan hidup modern klien.

4 layanan utama:
- Decorative Interior — konsep interior, styling, dan space planning.
- Loose Furniture — furniture lepas dari katalog showroom kami; bisa dipesan per item sesuai
  kebutuhan (tidak harus beli satu set penuh).
- Interior Contractor & Architecture — kontraktor & pekerjaan arsitektur, dari perencanaan hingga
  instalasi.
- Material Innovation, Accessories & Fitting — material, aksesori, dan fitting inovatif untuk
  menyempurnakan ruang.

Portofolio: sudah menangani berbagai tipe project — hospitality (hotel), residential (rumah
tinggal), dan commercial/office. Kami hanya bekerja sama dengan supplier berkualitas tinggi &
terpercaya untuk menjaga standar material dengan harga yang wajar.

Showroom & kontak:
- Alamat: Jl. Bangka Raya No. 45, RT.11/RW.11, Pela Mampang, Kec. Mampang Prapatan, Kota Jakarta
  Selatan, DKI Jakarta 12720.
- Telp/WhatsApp: +62 821-2043-307.
- Instagram: @livoraid.

Cara kerja / alur project:
1. Inquiry / Book Consultation lewat halaman Appointment di website.
2. Under Review — tim Livora meninjau kebutuhan.
3. Contacted & Meeting Scheduled (online, kunjungan ke showroom, atau on-site di lokasi klien).
4. Consultation in Progress — konsep & penawaran.
5. DP Payment, penandatanganan agreement, lalu project berjalan dengan progress update 0–100%.
6. Completed & handover.

Katalog website: Furniture (per kategori & tipe), Collections (paket kurasi per ruangan),
Projects (portofolio), dan Catalog (editorial scene dengan hotspot produk).

Kebijakan komunikasi:
- Harga tidak dipublikasikan; harga selalu lewat konsultasi karena bergantung material,
  dimensi, finishing, dan volume.
- Estimasi lead time custom furniture umumnya beberapa minggu, tergantung kompleksitas —
  angka pasti harus dikonfirmasi consultant.
TXT;

    /**
     * Panduan navigasi/alur website — versi aman-untuk-user dari peta fitur (ERD) internal.
     * Dipakai supaya Concierge bisa mengarahkan user (terutama yang baru pertama kali) dengan
     * langkah yang jelas, TANPA membocorkan detail implementasi backend (nama tabel, logika admin,
     * marketing, atau analytics internal) — itu semua sengaja TIDAK dimasukkan ke sini.
     */
    public const SITE_GUIDE = <<<'TXT'
Alur menjelajah website (dari sudut pandang pengunjung — dipakai untuk mengarahkan user baru):
1. Mulai dari halaman utama, atau langsung ke menu Collections / Catalog untuk cari inspirasi
   ruangan, atau menu Furniture kalau sudah tahu jenis barang yang dicari.
2. Di halaman listing, user bisa pilih kategori/tipe untuk mempersempit pilihan.
3. Buka halaman detail sebuah Item untuk lihat varian warna/material, galeri foto, dan cerita
   produknya.
4. User bisa simpan ke Wishlist untuk ditinjau lagi nanti, atau tanya langsung ke kamu (Livi) untuk rekomendasi lebih lanjut.
5. Kalau user mau lihat contoh hasil kerja Livora di project nyata, arahkan ke menu Projects
   (portofolio).
6. Kalau user sudah yakin dengan kebutuhannya, atau butuh survey & penawaran resmi, arahkan ke
   halaman Appointment untuk booking konsultasi.

Alur setelah booking konsultasi:
1. User mengisi form Appointment (kebutuhan, lokasi, kontak).
2. Tim Livora meninjau pengajuan.
3. Dijadwalkan meeting — bisa online, kunjungan langsung ke showroom, atau survey on-site ke
   lokasi klien.
4. Konsultasi berjalan: pembahasan konsep & penawaran.
5. DP payment & penandatanganan agreement.
6. Project berjalan dengan update progress berkala (0–100%).
7. Selesai & handover ke klien.

Posisi kamu (Livi) dalam alur ini:
- Kamu adalah lapis pertama yang menjawab pertanyaan produk & profil perusahaan, sekaligus
  menunjukkan konten relevan lewat "recommendations".
- Kalau pertanyaan butuh penanganan manusia (survey, negosiasi, komplain, atau user eksplisit
  minta bicara dengan CS), serahkan ke customer service Livora (set needs_escalation true) —
  jangan berpura-pura bisa menjadwalkan meeting atau membuat keputusan yang sebenarnya wewenang
  tim CS/admin.
TXT;

    /**
     * Entry point utama. Urutan proteksi:
     * 1. Jaring pengaman darurat global (nyaris tidak pernah kena di operasional normal).
     * 2. Anti-spam per user/sesi (tidak mempengaruhi user lain).
     * 3. Baru lanjut ke retrieval + panggil Gemini seperti biasa.
     */
    public function reply(string $message, array $history = [], array $options = []): array
    {
        $requestId = (string) \Illuminate\Support\Str::uuid();
        $startedAt = microtime(true);

        if ($this->emergencyLimitReached()) {
            Log::critical('LivoraAssistant: emergency daily limit tercapai', [
                'request_id' => $requestId,
            ]);
            return [
                'reply' => 'Maaf, sistem kami sedang mengalami gangguan sementara 🙏 Saya hubungkan langsung ke customer service kami ya.',
                'needs_escalation' => true,
                'recommendations' => [],
                'quick_replies' => [],
                'learned_profile' => (array) ($options['customer_profile'] ?? []),
                'show_consultation' => false,
            ];
        }

        if ($this->checkSpam($message, $options)) {
            Log::info('LivoraAssistant: pola spam/bot terdeteksi', [
                'request_id' => $requestId,
            ]);
            return [
                'reply' => 'Sepertinya ada beberapa pesan yang sama terkirim berturut-turut dalam waktu singkat 🙏 Boleh tunggu sebentar ya sebelum lanjut chat lagi — kalau butuh bantuan segera, saya hubungkan langsung ke customer service kami sekarang.',
                'needs_escalation' => true,
                'recommendations' => [],
                'quick_replies' => [],
                'learned_profile' => (array) ($options['customer_profile'] ?? []),
                'show_consultation' => false,
            ];
        }

        $existingProfile = (array) ($options['customer_profile'] ?? []);
        $context = $this->buildContext($message, $options);
        $systemPrompt = $this->systemPrompt($context, $existingProfile, $options);

        $contents = [];
        foreach ($history as $h) {
            $role = ($h['role'] ?? 'user') === 'user' ? 'user' : 'model';
            $text = trim((string) ($h['text'] ?? ''));
            if ($text === '') {
                continue;
            }
            $contents[] = ['role' => $role, 'parts' => [['text' => $text]]];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $message]]];

        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            return [
                'reply' => 'Maaf, asisten AI kami sedang tidak aktif. Mau saya hubungkan ke customer service Livora?',
                'needs_escalation' => true,
                'recommendations' => [],
                'quick_replies' => [],
                'learned_profile' => CustomerNeedProfile::merge($existingProfile, [], $message),
                'show_consultation' => false,
            ];
        }

        $model = config('services.gemini.model');
        if (!$model) {
            Log::critical('LivoraAssistant: GEMINI_MODEL tidak diset di .env/config');
            return [
                'reply' => 'Maaf, asisten AI kami sedang tidak aktif. Mau saya hubungkan ke customer service Livora?',
                'needs_escalation' => true,
                'recommendations' => [],
                'quick_replies' => [],
                'learned_profile' => CustomerNeedProfile::merge($existingProfile, [], $message),
                'show_consultation' => false,
            ];
        }

        try {
            $response = Http::timeout(45)->withHeaders([
                'x-goog-api-key' => $apiKey,
                'content-type'   => 'application/json',
            ])->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
                'contents'           => $contents,
                'generationConfig'   => [
                    'responseMimeType' => 'application/json',
                    'maxOutputTokens'  => 1800,
                    'thinkingConfig'   => ['thinkingLevel' => 'low'],
                ],
            ]);

            if (!$response->successful()) {
                Log::error('Gemini API error', [
                    'request_id' => $requestId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new \RuntimeException('Gemini API request failed');
            }

            // Ambil semua part teks, skip part "thought" (reasoning internal model)
            // supaya tidak pernah bocor ke user.
            $parts = $response->json('candidates.0.content.parts', []);
            $rawText = '';
            foreach ($parts as $part) {
                if (!empty($part['thought'])) {
                    continue;
                }
                $rawText .= $part['text'] ?? '';
            }

            $cleaned = trim(preg_replace('/```json|```/', '', $rawText));
            $parsed  = json_decode($cleaned, true);

            if (!is_array($parsed) || !isset($parsed['reply'])) {
                Log::warning('LivoraAssistant: gagal parse JSON dari model', ['raw' => $rawText]);
                return [
                    'reply' => $rawText !== '' ? $rawText : 'Maaf, saya belum bisa menjawab itu. Mau saya hubungkan ke customer service kami?',
                    'needs_escalation' => $rawText === '',
                    'recommendations' => [],
                    'quick_replies' => [],
                    'learned_profile' => CustomerNeedProfile::merge($existingProfile, [], $message),
                    'show_consultation' => false,
                ];
            }

            $recommendations = $this->resolveRecommendations($parsed['recommendations'] ?? []);
            $quickReplies = $this->sanitizeQuickReplies($parsed['quick_replies'] ?? []);
            $learnedProfile = CustomerNeedProfile::merge(
                $existingProfile,
                is_array($parsed['learned_profile'] ?? null) ? $parsed['learned_profile'] : [],
                $message,
            );

            Log::info('LivoraAssistant reply', [
                'request_id' => $requestId,
                'duration_ms' => round((microtime(true) - $startedAt) * 1000),
                'needs_escalation' => (bool) ($parsed['needs_escalation'] ?? false),
                'recommendation_count' => count($recommendations),
                'profile_keys' => array_keys($learnedProfile),
            ]);

            return [
                'reply' => (string) $parsed['reply'],
                'needs_escalation' => (bool) ($parsed['needs_escalation'] ?? false),
                'recommendations' => $recommendations,
                'quick_replies' => $quickReplies,
                'learned_profile' => $learnedProfile,
                'show_consultation' => (bool) ($parsed['show_consultation'] ?? false),
            ];
        } catch (\Throwable $e) {
            Log::error('LivoraAssistant error: ' . $e->getMessage());
            return [
                'reply' => 'Maaf, saya sedang tidak bisa memproses pertanyaan itu. Mau saya hubungkan ke customer service kami?',
                'needs_escalation' => true,
                'recommendations' => [],
                'quick_replies' => [],
                'learned_profile' => CustomerNeedProfile::merge($existingProfile, [], $message),
                'show_consultation' => false,
            ];
        }
    }

    /**
     * Jaring pengaman darurat GLOBAL. Angkanya sangat tinggi (lihat
     * EMERGENCY_DAILY_LIMIT) — tujuannya cuma menahan kalau ada insiden
     * ekstrem (bug infinite loop, bot masif), BUKAN pembatas operasional
     * harian. Traffic customer normal, sebanyak apapun, tidak akan
     * menyentuh angka ini.
     */
    private function emergencyLimitReached(): bool
    {
        $key = 'gemini_emergency_' . now('UTC')->format('Y-m-d');
        $used = Cache::increment($key);
        if ($used === 1) {
            Cache::put($key, 1, now('UTC')->endOfDay());
        }
        return $used > self::EMERGENCY_DAILY_LIMIT;
    }

    /**
     * Rate-limit + deteksi pola bot PER USER/SESI. TIDAK pernah mempengaruhi
     * user lain. Dua syarat harus dua-duanya terpenuhi sebelum benar-benar
     * di-cooldown:
     *  1) volume pesan melewati SPAM_MAX_MESSAGES dalam SPAM_WINDOW_SECONDS
     *  2) sebagian besar pesan itu identik/duplikat (ciri bot, bukan manusia
     *     yang ngetik cepat tapi isinya beda-beda)
     * Kalau cuma syarat (1) terpenuhi tanpa (2), dianggap "rame tapi wajar"
     * dan tetap dijawab normal — cuma dicatat ke log untuk dipantau.
     *
     * Identitas diambil dari $options['session_id'] atau $options['user_id']
     * kalau dikirim dari controller; fallback ke IP kalau tidak ada.
     * Sebaiknya controller selalu kirim session_id/user_id supaya akurat,
     * karena banyak user bisa berbagi IP yang sama (mis. WiFi kantor).
     */
    private function checkSpam(string $message, array $options): bool
    {
        $identity = $options['session_id']
            ?? $options['user_id']
            ?? request()->ip()
            ?? 'unknown';
        $hash = md5((string) $identity);

        $cooldownKey = 'gemini_spam_cooldown_' . $hash;
        if (Cache::has($cooldownKey)) {
            return true;
        }

        // Hitung volume pesan dalam window berjalan.
        $windowKey = 'gemini_spam_window_' . $hash;
        $count = Cache::increment($windowKey);
        if ($count === 1) {
            Cache::put($windowKey, 1, now()->addSeconds(self::SPAM_WINDOW_SECONDS));
        }

        // Lacak pesan identik berturut-turut (ciri khas bot/script).
        $lastMsgKey = 'gemini_spam_lastmsg_' . $hash;
        $dupCountKey = 'gemini_spam_dupcount_' . $hash;
        $normalized = mb_strtolower(trim($message));
        $lastMsg = Cache::get($lastMsgKey);

        if ($lastMsg !== null && $lastMsg === $normalized) {
            $dupCount = Cache::increment($dupCountKey);
        } else {
            $dupCount = 1;
            Cache::put($dupCountKey, 1, now()->addSeconds(self::SPAM_WINDOW_SECONDS));
        }
        Cache::put($lastMsgKey, $normalized, now()->addSeconds(self::SPAM_WINDOW_SECONDS));

        $volumeExceeded = $count > self::SPAM_MAX_MESSAGES;
        $looksLikeBot   = $dupCount >= self::SPAM_DUPLICATE_THRESHOLD;

        if ($volumeExceeded && $looksLikeBot) {
            Cache::put($cooldownKey, true, now()->addSeconds(self::SPAM_COOLDOWN_SECONDS));
            return true;
        }

        if ($volumeExceeded) {
            // Rame tapi kelihatannya manusia asli — jangan diblokir, cukup dicatat.
            Log::info('LivoraAssistant: volume tinggi tapi bukan pola bot', [
                'identity_hash' => $hash,
                'count' => $count,
            ]);
        }

        return false;
    }

    private function systemPrompt(string $context, array $customerProfile = [], array $options = []): string
    {
        $brand = self::BRAND_PROFILE;
        $siteGuide = self::SITE_GUIDE;
        $profileText = CustomerNeedProfile::toPromptText($customerProfile);

        $browsingLines = [];
        if (!empty($options['page_path'])) {
            $browsingLines[] = 'Halaman yang sedang dibuka user: ' . $options['page_path'];
        }
        if (!empty($options['category_slug'])) {
            $browsingLines[] = 'Kategori yang sedang dilihat: ' . $options['category_slug'];
        }
        if (!empty($options['wishlist_titles']) && is_array($options['wishlist_titles'])) {
            $browsingLines[] = 'Produk yang sudah disimpan user di Wishlist: ' . implode(', ', array_slice($options['wishlist_titles'], 0, 6));
        }
        $browsingContext = empty($browsingLines) ? 'Tidak ada konteks halaman khusus.' : implode("\n", $browsingLines);

        return <<<PROMPT
Kamu adalah "Livi", Design & Furniture Concierge (asisten AI resmi) showroom Livora (di bawah PT. Langgeng Cipta Ruang).

Peranmu:
1. Memahami kebutuhan ruang, gaya hidup, selera material, dan masalah desain yang sebenarnya sedang dialami user — layaknya interior advisor showroom kelas atas yang hangat, cerdas, dan peka.
2. Menjawab pertanyaan tentang profil showroom, layanan, alur kerja, dan product knowledge (furniture, material, finishing, koleksi, project) secara akurat berdasarkan data di bawah.
3. Aktif mempelajari kebutuhan user di setiap giliran percakapan (menyimpan ke field "learned_profile"), lalu memanfaatkan pemahaman itu agar rekomendasi dan jawaban makin presisi dari waktu ke waktu.
4. Merekomendasikan produk/koleksi/katalog/project yang paling cocok lengkap dengan alasan singkat ("reason") kenapa pilihan itu pas dengan kebutuhan user.
5. Menutup jawaban dengan langkah lanjutan yang natural: jika kebutuhan user masih terlalu umum, ajukan MAKSIMAL 1 pertanyaan klarifikasi singkat & relevan (mis. ruangan apa, kapasitas duduk, atau nuansa warna/material yang disuka) agar kamu makin paham — jangan pernah terdengar seperti formulir interogasi!

Aturan jawaban:
- Livora adalah SHOWROOM di bawah PT. Langgeng Cipta Ruang. WAJIB pakai istilah "showroom" saat menjelaskan Livora — JANGAN PERNAH menyebutnya "design studio" berdiri sendiri atau "Livora Studio" atau "Livora Architechture". JANGAN PERNAH bilang Livora berasal dari atau berpusat di Bandung — showroom kami ada di Jakarta Selatan tepatnya di Jl. Bangka Raya No. 45 Pela Mampang, Kec. Mampang Prapatan.
- Untuk pertanyaan profil/layanan/alur kerja/lokasi showroom/kontak, jawab dari bagian "Profil Livora".
- Untuk pertanyaan "gimana cara pakai website ini", "mulai dari mana", atau bingung mulai konsultasi, jawab ringkas & urut pakai "Panduan Navigasi Website", sertakan "recommendations" bila relevan, dan set "show_consultation" true bila tepat.
- Untuk pertanyaan produk, jawab dari bagian "Data produk relevan". Jangan mengarang spesifikasi, dimensi, stok, atau harga yang tidak tercantum.
- Harga tidak pernah disebut angka pastinya. Kalau user tanya harga/penawaran/diskon, jelaskan hangat bahwa harga ditentukan lewat konsultasi karena bergantung material, dimensi, dan finishing — tetap tampilkan rekomendasi produknya bila ada di context, lalu set needs_escalation true.
- Kalau data produk yang relevan kosong, katakan jujur kamu belum punya detail spesifiknya dan tawarkan bantuan tim/CS (needs_escalation true).
- Set needs_escalation true bila user minta jadwal survey, komplain, negosiasi, pemesanan langsung, atau eksplisit minta bicara dengan manusia/CS.
- Gunakan "Profil Kebutuhan User" dan "Konteks Halaman" di bawah secara natural (mis. bila user sudah pernah bilang suka ruang tamu modern atau menyimpan barang di wishlist, sesuaikan rekomendasimu tanpa membocorkan istilah teknis JSON/database).
- BAHASA (aturan wajib): selalu balas dalam bahasa yang dipakai user pada pesan terakhirnya. User menulis Bahasa Indonesia → jawab penuh Bahasa Indonesia. User menulis bahasa Inggris → jawab penuh bahasa Inggris (natural). Campur ID+EN → ikuti bahasa paling dominan. Jangan mencampur dua bahasa atau menerjemahkan nama produk/koleksi/merek. Nada hangat, elegan, ringkas, profesional.
- Jawaban maksimal ~130 kata, boleh pakai bullet pendek yang rapi.
- JANGAN PERNAH menulis URL atau nama file gambar di dalam teks "reply". Semua link dan gambar HANYA lewat field "recommendations".

Aturan rekomendasi (field "recommendations"):
- Setiap entri WAJIB pakai "slug" yang benar-benar tercantum di "Data produk relevan" (lihat "Slug: ..."). JANGAN mengarang slug.
- Maksimal 6 rekomendasi. WAJIB: kalau user menyebut lebih dari satu jenis barang ("sofa dan meja"), kirim minimal satu rekomendasi UNTUK SETIAP jenis yang diminta.
- Tambahkan field "reason" (maks 10 kata) yang menjelaskan singkat kenapa item/koleksi itu cocok dengan kebutuhan user.
- "type" harus salah satu dari: "item", "collection", "catalog", "project".
- Suasana/gaya ruangan ("cozy", "japandi", "minimalis") → rekomendasikan "collection" atau "catalog".
- Barang spesifik ("sofa", "meja kopi", "kursi") → rekomendasikan "item".
- Portofolio/project → rekomendasikan "project".
- Kalau tidak ada yang benar-benar relevan, kirim array kosong.

Aturan "quick_replies":
- Kirim 2–3 saran balasan lanjutan singkat (masing-masing maks 6 kata, dalam bahasa yang sama dengan user) yang paling membantu user melangkah lebih jauh (mis. mempersempit gaya/ruangan, membandingkan material, atau lanjut konsultasi). Jangan pakai kalimat generik yang sama terus.

Aturan "learned_profile":
- Isi HANYA field yang benar-benar terungkap dari percakapan ini (biarkan null atau [] bila belum disebut — jangan mengarang!).
- "core_need_summary": rangkum dalam 1 kalimat singkat apa kebutuhan paling utama user saat ini (gabungkan info lama + info baru).

Set "show_consultation" true kalau user tampak siap lanjut ke tahap konsultasi (sudah mengerucutkan pilihan, tanya layanan interior/kontraktor, atau minta booking/jadwal).

Balas HANYA JSON valid, tanpa teks lain, dengan format persis ini:
{
  "reply": "isi jawaban natural, hangat, konsultatif, tanpa URL/nama file",
  "needs_escalation": true atau false,
  "show_consultation": true atau false,
  "recommendations": [
    {"type": "item atau collection atau catalog atau project", "slug": "slug-yang-ada-di-context", "reason": "alasan singkat kenapa cocok"}
  ],
  "quick_replies": [
    "pilihan lanjutan 1",
    "pilihan lanjutan 2"
  ],
  "learned_profile": {
    "project_type": null,
    "rooms": [],
    "furniture_needs": [],
    "style_preferences": [],
    "material_color_prefs": [],
    "service_interest": null,
    "space_or_dimension": null,
    "timeline": null,
    "location": null,
    "core_need_summary": null
  }
}

Profil Kebutuhan User yang Sudah Livi Pelajari:
{$profileText}

Konteks Halaman & Minat User Saat Ini:
{$browsingContext}

Profil Livora:
{$brand}

Panduan Navigasi Website:
{$siteGuide}

Data produk relevan:
{$context}
PROMPT;
    }

    /**
     * Ubah daftar {type, slug, reason?} dari model menjadi kartu lengkap (judul, gambar,
     * url, reason) dengan query ulang ke database. Slug yang tidak ditemukan di-skip
     * diam-diam (bukan error) supaya tidak ada card kosong/rusak yang tampil.
     */
    private function resolveRecommendations(array $items): array
    {
        $cards = [];

        foreach (array_slice($items, 0, 6) as $rec) {
            $type = is_array($rec) ? ($rec['type'] ?? null) : null;
            $slug = is_array($rec) ? ($rec['slug'] ?? null) : null;
            $reason = is_array($rec) && is_scalar($rec['reason'] ?? null)
                ? trim((string) $rec['reason'])
                : null;
            if (!$type || !$slug || !isset(self::FRONTEND_PATHS[$type])) {
                continue;
            }

            $card = match ($type) {
                'item'       => $this->cardFromItem($slug),
                'collection' => $this->cardFromCollection($slug),
                'catalog'    => $this->cardFromCatalog($slug),
                'project'    => $this->cardFromProject($slug),
                default      => null,
            };

            if ($card) {
                if ($reason) {
                    $card['reason'] = mb_substr($reason, 0, 90);
                }
                $cards[] = $card;
            }
        }

        return $cards;
    }

    private function sanitizeQuickReplies(mixed $raw): array
    {
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        $seen = [];
        foreach ($raw as $entry) {
            if (!is_scalar($entry)) {
                continue;
            }
            $text = trim((string) $entry);
            if ($text === '' || mb_strlen($text) > 70) {
                continue;
            }
            $key = mb_strtolower($text);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $text;
            if (count($out) >= 3) {
                break;
            }
        }
        return $out;
    }

    private function cardFromItem(string $slug): ?array
    {
        $item = Item::query()->with(['type', 'collection'])->where('slug', $slug)->first();
        if (!$item) {
            return null;
        }

        return [
            'type'        => 'item',
            'title'       => $item->title,
            'subtitle'    => optional($item->type)->name ?? optional($item->collection)->name,
            'description' => $this->shorten($item->description),
            'image'       => $this->absoluteUrl($this->firstNonEmpty($item, ['image', 'thumbnail', 'cover_image'])),
            'url'         => $this->frontendUrl('item', $item->slug),
        ];
    }

    private function cardFromCollection(string $slug): ?array
    {
        $c = Collection::query()->where('slug', $slug)->first();
        if (!$c) {
            return null;
        }

        return [
            'type'        => 'collection',
            'title'       => $c->name,
            'subtitle'    => 'Living Collection',
            'description' => $this->shorten($c->description),
            'image'       => $this->absoluteUrl($this->firstNonEmpty($c, ['card_banner', 'featured_image', 'hero_banner', 'thumbnail', 'image', 'cover_image', 'banner'])),
            'url'         => $this->frontendUrl('collection', $c->slug),
        ];
    }

    private function cardFromCatalog(string $slug): ?array
    {
        $cat = Catalog::query()->where('slug', $slug)->first();
        if (!$cat) {
            return null;
        }

        return [
            'type'        => 'catalog',
            'title'       => $cat->title,
            'subtitle'    => $cat->category ?? $cat->taxonomy,
            'description' => $this->shorten($cat->description),
            'image'       => $this->absoluteUrl($this->firstNonEmpty($cat, ['cover_image', 'scene_1_image', 'thumbnail', 'image', 'banner'])),
            'url'         => '/catalog/' . \Illuminate\Support\Str::slug($cat->category ?: 'all') . '/' . $cat->slug,
        ];
    }

    private function cardFromProject(string $slug): ?array
    {
        $p = Project::query()->where('slug', $slug)->first();
        if (!$p) {
            return null;
        }

        $subtitle = trim(($p->location ?? '') . ($p->year ? " · {$p->year}" : ''));

        return [
            'type'        => 'project',
            'title'       => $p->title,
            'subtitle'    => $subtitle !== '' ? $subtitle : null,
            'description' => $this->shorten($p->description),
            'image'       => $this->absoluteUrl($this->firstNonEmpty($p, ['hero_image', 'thumbnail', 'image', 'cover_image'])),
            'url'         => $this->frontendUrl('project', $p->slug),
        ];
    }

    /** Ambil field pertama yang tidak kosong dari sebuah model (dicoba berurutan). */
    private function firstNonEmpty($model, array $fields): ?string
    {
        foreach ($fields as $f) {
            if (!empty($model->{$f})) {
                return (string) $model->{$f};
            }
        }
        return null;
    }

    private function shorten(?string $text, int $limit = 90): ?string
    {
        if (!$text) {
            return null;
        }
        $text = trim($text);
        return mb_strlen($text) > $limit ? mb_substr($text, 0, $limit - 1) . '…' : $text;
    }

    private function frontendUrl(string $type, string $slug): string
    {
        $pattern = self::FRONTEND_PATHS[$type] ?? '/%s';
        return sprintf($pattern, $slug);
    }

    /** Path konsultasi, dipakai frontend saat show_consultation true. */
    public function consultationUrl(): string
    {
        return self::CONSULTATION_PATH;
    }

    /**
     * Ubah path storage relatif jadi URL absolut. Mengikuti pola yang sudah
     * dipakai di project ini: base URL storage = APP_URL tanpa "/api".
     */
    private function absoluteUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        // Kembalikan path relatif "/storage/..." saja — frontend (imgUrl) yang
        // menempelkan origin backend, supaya tidak bergantung APP_URL yang bisa salah.
        $path = '/' . ltrim($path, '/');
        return str_starts_with($path, '/storage/') ? $path : '/storage' . $path;
    }

    /** Retrieval dari database + konteks halaman + profil kebutuhan user yang dipelajari. */
    public function buildContext(string $message, array $options = []): string
    {
        $chunks = [];

        $focusSlug = $options['item_slug'] ?? null;
        if ($focusSlug) {
            $item = Item::query()->with(['type', 'collection'])->where('slug', $focusSlug)->first();
            if ($item) {
                $chunks[] = '[Item yang sedang dilihat user] ' . $this->describeItem($item);
            }
        }

        $keywords = $this->extractKeywords($message);
        $intent = (new \App\Services\IntentClassifier())->classify($message);

        // Perkuat keyword dari kategori halaman aktif atau profil kebutuhan yang sudah dipelajari
        // bila pesan user pendek/kontekstual (mis. "yang warna terang ada?", "bagus yang mana?")
        $extraHints = [];
        if (!empty($options['category_slug']) && is_string($options['category_slug'])) {
            $extraHints[] = $options['category_slug'];
        }
        if (count($keywords) <= 2 && !empty($options['customer_profile']) && is_array($options['customer_profile'])) {
            $extraHints = array_merge($extraHints, CustomerNeedProfile::toSearchTerms($options['customer_profile']));
        }
        if (!empty($extraHints)) {
            $keywords = array_slice(
                array_values(array_unique(array_merge($keywords, $this->extractKeywords(implode(' ', $extraHints))))),
                0,
                14,
            );
        }

        if (!empty($keywords)) {
            // product_search / general → query Item termasuk type.name, collection.name, material_detail
            if (in_array($intent, [
                \App\Services\IntentClassifier::PRODUCT_SEARCH,
                \App\Services\IntentClassifier::GENERAL,
            ], true)) {
                $groups = $this->keywordGroups($keywords);
                $seen = [];

                foreach ($groups as $group) {
                    $items = Item::query()
                        ->when($focusSlug, fn ($q) => $q->where('slug', '!=', $focusSlug))
                        ->when($seen, fn ($q) => $q->whereNotIn('slug', $seen))
                        ->where(function ($q) use ($group) {
                            foreach ($group as $kw) {
                                $q->orWhere('title', 'like', "%{$kw}%")
                                  ->orWhere('description', 'like', "%{$kw}%")
                                  ->orWhere('texture', 'like', "%{$kw}%")
                                  ->orWhere('finish', 'like', "%{$kw}%")
                                  ->orWhere('material_detail', 'like', "%{$kw}%")
                                  ->orWhereHas('type', fn ($tq) => $tq->where('name', 'like', "%{$kw}%")->orWhere('slug', 'like', "%{$kw}%"))
                                  ->orWhereHas('collection', fn ($cq) => $cq->where('name', 'like', "%{$kw}%"));
                            }
                        })
                        ->with(['type', 'collection'])
                        ->limit(4)
                        ->get();

                    if ($items->isEmpty()) {
                        continue;
                    }

                    $label = $group[0];
                    foreach ($items as $item) {
                        $seen[] = $item->slug;
                        $chunks[] = "[Item · permintaan \"{$label}\"] " . $this->describeItem($item);
                    }
                }
            }

            // portfolio / general → boleh query Project
            if (in_array($intent, [
                \App\Services\IntentClassifier::PORTFOLIO,
                \App\Services\IntentClassifier::GENERAL,
            ], true)) {
                $projects = Project::query()
                    ->where(function ($q) use ($keywords) {
                        foreach ($keywords as $kw) {
                            $q->orWhere('title', 'like', "%{$kw}%")
                              ->orWhere('subtitle', 'like', "%{$kw}%")
                              ->orWhere('description', 'like', "%{$kw}%")
                              ->orWhere('location', 'like', "%{$kw}%");
                        }
                    })
                    ->limit(3)
                    ->get(['id', 'title', 'subtitle', 'description', 'location', 'year', 'slug']);

                foreach ($projects as $p) {
                    $chunks[] = "[Project] {$p->title} ({$p->location}, {$p->year}) — {$p->description} | Slug: {$p->slug}";
                }
            }

            // product_search / style_mood / general → boleh query Collection
            if (in_array($intent, [
                \App\Services\IntentClassifier::PRODUCT_SEARCH,
                \App\Services\IntentClassifier::STYLE_MOOD,
                \App\Services\IntentClassifier::GENERAL,
            ], true)) {
                $collections = Collection::query()
                    ->where(function ($q) use ($keywords) {
                        foreach ($keywords as $kw) {
                            $q->orWhere('name', 'like', "%{$kw}%")
                              ->orWhere('description', 'like', "%{$kw}%");
                        }
                    })
                    ->limit(3)
                    ->get(['id', 'name', 'description', 'slug']);

                foreach ($collections as $c) {
                    $chunks[] = "[Collection] {$c->name} — {$c->description} | Slug: {$c->slug}";
                }
            }

            // style_mood / general → boleh query Catalog
            if (in_array($intent, [
                \App\Services\IntentClassifier::STYLE_MOOD,
                \App\Services\IntentClassifier::GENERAL,
            ], true)) {
                $catalogs = Catalog::query()
                    ->where(function ($q) use ($keywords) {
                        foreach ($keywords as $kw) {
                            $q->orWhere('title', 'like', "%{$kw}%")
                              ->orWhere('description', 'like', "%{$kw}%")
                              ->orWhere('category', 'like', "%{$kw}%")
                              ->orWhere('taxonomy', 'like', "%{$kw}%");
                        }
                    })
                    ->limit(3)
                    ->get(['id', 'title', 'description', 'category', 'taxonomy', 'slug']);

                foreach ($catalogs as $cat) {
                    $chunks[] = "[Catalog] {$cat->title} (Kategori: {$cat->category}, Gaya: {$cat->taxonomy}) — {$cat->description} | Slug: {$cat->slug}";
                }
            }
        }

        // company_info: sengaja tidak query apapun di atas — brand profile
        // di systemPrompt() sudah cukup untuk jawab pertanyaan jenis ini.

        if (empty($chunks)) {
            $chunks = $this->generalPicks();
        }

        return implode("\n", $chunks);
    }

    private function generalPicks(): array
    {
        $chunks = [];

        $items = Item::query()->with(['type', 'collection'])
            ->inRandomOrder()->limit(4)->get();
        foreach ($items as $item) {
            $chunks[] = '[Item] ' . $this->describeItem($item);
        }

        $collections = Collection::query()->orderBy('display_order')
            ->limit(3)->get(['id', 'name', 'description', 'slug']);
        foreach ($collections as $c) {
            $chunks[] = "[Collection] {$c->name} — {$c->description} | Slug: {$c->slug}";
        }

        $catalogs = Catalog::query()->limit(2)
            ->get(['id', 'title', 'description', 'category', 'taxonomy', 'slug']);
        foreach ($catalogs as $cat) {
            $chunks[] = "[Catalog] {$cat->title} (Kategori: {$cat->category}, Gaya: {$cat->taxonomy}) — {$cat->description} | Slug: {$cat->slug}";
        }

        $projects = Project::query()->limit(2)
            ->get(['id', 'title', 'subtitle', 'description', 'location', 'year', 'slug']);
        foreach ($projects as $p) {
            $chunks[] = "[Project] {$p->title} ({$p->location}, {$p->year}) — {$p->description} | Slug: {$p->slug}";
        }

        if (empty($chunks)) {
            $chunks[] = $this->generalSummary();
        }

        return $chunks;
    }

    private function generalSummary(): string
    {
        $collections = Collection::query()
            ->orderBy('display_order')
            ->limit(8)
            ->pluck('name')
            ->filter()
            ->implode(', ');

        $types = \App\Models\FurnitureType::query()
            ->limit(10)
            ->pluck('name')
            ->filter()
            ->implode(', ');

        $catalogs = Catalog::query()
            ->limit(5)
            ->pluck('title')
            ->filter()
            ->implode(', ');

        $lines = [];
        if ($collections !== '') { $lines[] = "Koleksi tersedia: {$collections}."; }
        if ($types !== '') { $lines[] = "Kategori furniture: {$types}."; }
        if ($catalogs !== '') { $lines[] = "Beberapa katalog: {$catalogs}."; }

        if (empty($lines)) {
            return '[Info umum] Data katalog belum tersedia saat ini.';
        }

        return "[Info umum]\n" . implode("\n", $lines);
    }

    private function describeItem($item)
    {
        $typeName = $item->type ? $item->type->name : null;
        $collectionName = $item->collection ? $item->collection->name : null;

        $parts = [];
        $parts[] = "Nama: {$item->title}";
        if ($typeName) $parts[] = "Kategori: {$typeName}";
        if ($collectionName) $parts[] = "Koleksi: {$collectionName}";
        if ($item->width_cm && $item->depth_cm && $item->height_cm) {
            $parts[] = 'Dimensi: ' . round((float) $item->width_cm) . 'x' . round((float) $item->depth_cm) . 'x' . round((float) $item->height_cm) . ' cm';
        }
        if ($item->material_detail) $parts[] = "Material: {$item->material_detail}";
        if ($item->description) $parts[] = "Deskripsi: {$item->description}";
        if ($item->texture) $parts[] = "Tekstur: {$item->texture}";
        if ($item->finish) $parts[] = "Finishing: {$item->finish}";
        if ($item->availability) $parts[] = "Ketersediaan: {$item->availability}";
        $parts[] = "Slug: {$item->slug}";

        return implode(" | ", $parts);
    }

    private function extractKeywords(string $message): array
    {
        $stopwords = ['yang', 'dan', 'atau', 'saya', 'kamu', 'ada', 'ini', 'itu', 'untuk', 'dengan',
            'apakah', 'apa', 'bagaimana', 'mau', 'bisa', 'tentang', 'produk', 'the', 'and', 'is',
            'are', 'for', 'about', 'this', 'that', 'you'];

        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower(trim($message)));
        $words = array_filter($words ?: [], fn ($w) => mb_strlen($w) > 2 && !in_array($w, $stopwords, true));
        $words = array_values(array_unique($words));

        // Perluas kata kunci Indonesia dengan padanan Inggris (dan sebaliknya)
        // supaya tetap match kalau title/description produk ditulis dalam
        // bahasa Inggris di database. Kata kunci asli tetap dipertahankan,
        // sinonim cuma ditambahkan di belakang.
        $expanded = $words;
        foreach ($words as $w) {
            if (isset(self::KEYWORD_SYNONYMS[$w])) {
                foreach (self::KEYWORD_SYNONYMS[$w] as $syn) {
                    $expanded[] = $syn;
                }
            }
        }

        return array_slice(array_values(array_unique($expanded)), 0, 12);
    }

    /**
     * Kelompokkan keyword jadi "permintaan" terpisah. Kata yang punya padanan
     * di KEYWORD_SYNONYMS (mis. "sofa", "meja") jadi grup sendiri bersama
     * sinonimnya; sisanya digabung jadi satu grup umum. Ini membuat query item
     * dijalankan per jenis barang, jadi permintaan multi-barang
     * ("sofa dan meja") terwakili semuanya.
     */
    private function keywordGroups(array $keywords): array
    {
        $reverse = [];
        foreach (self::KEYWORD_SYNONYMS as $id => $syns) {
            foreach ([$id, ...$syns] as $w) {
                $reverse[$w] = $id;
            }
        }

        $groups = [];
        $rest = [];
        foreach ($keywords as $kw) {
            $canonical = $reverse[$kw] ?? null;
            if ($canonical === null) {
                $rest[] = $kw;
                continue;
            }
            if (!isset($groups[$canonical])) {
                $groups[$canonical] = array_values(array_unique([$canonical, ...self::KEYWORD_SYNONYMS[$canonical]]));
            }
        }

        $result = array_values($groups);
        if (!empty($rest)) {
            $result[] = $rest;
        }
        if (empty($result)) {
            $result[] = $keywords;
        }

        return array_slice($result, 0, 4);
    }
}