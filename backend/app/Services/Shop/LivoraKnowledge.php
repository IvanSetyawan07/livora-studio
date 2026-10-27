<?php

namespace App\Services\Shop;

use App\Models\FurnitureType;
use App\Models\Item;
use App\Models\Theme;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Collection;

/**
 * Basis pengetahuan Livi tentang Livora + pencari produk yang lebih pintar.
 * Isi TEXT bersumber dari situs livoralcr.com (profil, layanan, gaya, alur konsultasi, kontak).
 * Fakta tambahan bisa ditambah tanpa deploy lewat ShopSettings::set(['livora_knowledge_extra' => '...']).
 */
class LivoraKnowledge
{
    public const TEXT = <<<'K'
IDENTITAS
- Livora (di situs juga ditulis Livora Studio / Livora Architechture), dikelola PT. Langgeng Cipta Ruang. Tagline: "Bayangkan. Ciptakan. Wujudkan."
- Livora adalah satu titik kontak untuk desain interior, pengadaan furnitur, dan konstruksi. Peran Livora ada tiga: Desainer (menyesuaikan ruang dengan kebutuhan), Importir (mengadakan material berkualitas langsung dari sumbernya), dan Kontraktor (memastikan setiap detail terpasang dengan baik).
- Latar belakang: mewujudkan ruang impian sering terhambat oleh layanan yang terpisah-pisah; Livora didirikan untuk menyelesaikan masalah itu supaya customer cukup berurusan dengan satu pihak.
- Visi: menjadi ekosistem One-Stop terdepan untuk kreasi interior, tempat desain, pengadaan, dan konstruksi menyatu mulus.
- Misi: mengintegrasikan perjalanan desain interior yang rumit; membangun kualitas terbaik lewat desain adaptif, furnitur, dan instalasi; menciptakan dampak bermakna dan tahan lama di setiap ruang.
- Pengalaman project: hospitality (hotel), residential (rumah tinggal), commercial/office.

EMPAT LAYANAN
1. Decorative Interior: konsep interior, styling, dan perencanaan ruang untuk mengubah dinding kosong dan lantai polos menjadi ruang yang hidup, sesuai kehidupan, selera, dan visi customer.
2. Loose Furniture (furnitur lepas): furnitur kurasi Livora dari katalog showroom, bisa dipesan per item (tidak harus satu set). Fokus pada kriya yang baik: lekukan, serat, dan jahitan.
3. Interior Contractor & Architecture: kontraktor dan pekerjaan arsitektur, dari cetak biru sampai finishing dan instalasi.
4. Material Innovation, Accessories & Fittings: material, aksesori, dan fitting yang inovatif dan tahan lama; pilihan material dan finishing menentukan tampilan ruang bertahun-tahun.
- Lewat WhatsApp Livi paling banyak membantu Loose Furniture (kenalan produk, cek harga lewat tim, mencatat pesanan). Tiga layanan lain biasanya dimulai dengan konsultasi.

GAYA LIVORA
- Gaya utama: Modern, Tenang, Eropa. Terinspirasi keanggunan Eropa, detail halus, keseimbangan antara keindahan dan fungsi. Ruang yang "berbicara pelan tapi penuh keyakinan". Kata kuncinya: halus, seimbang, abadi.
- Lima bahasa ruang yang dikerjakan: (1) Modern Tenang Eropa, (2) Tropis Modern: rimbun dan hangat, (3) Industrial: mentah dan berani, (4) Japandi: hangat dan minimal, (5) Skandinavia: terang dan lembut. Satu standar kriya untuk semuanya.

KOLEKSI FURNITUR
- Koleksi dikurasi dari pemasok berkualitas tinggi di Eropa dan Asia, dengan keseimbangan antara keahlian premium dan nilai yang tepat.
- Di situs, koleksi dijelajahi per tema dan kategori: Terbaru, Sofa, Kursi, Meja, Tempat Tidur, Aksesori. Customer bisa memasukkan produk ke keranjang lalu meminta harga.
- Harga tidak dipublikasikan di situs. Harga dikonfirmasi tim karena bergantung material, dimensi, finishing, dan volume. Harga final termasuk ongkir dan PPN dikirim tim lewat penawaran resmi.
- Beberapa barang berstatus made-to-order (butuh waktu produksi); jangan menyebut angka hari kecuali ada di DATA.

CARA PESAN LEWAT WHATSAPP
1. Customer memilih produk di situs (livoralcr.com), memasukkannya ke keranjang, lalu mengirim kode keranjang (format CRT-XXXX) ke Livi.
2. Livi mengecek isi keranjang dan mengumpulkan data pengiriman lewat chat (nama penerima, alamat, kota, titik peta, akses gedung seperti lantai dan lift barang, perlu pemasangan atau tidak, faktur pajak bila perlu).
3. Customer memilih metode kirim: ambil di showroom, armada Livora, ekspedisi kargo (luar kota), atau kurir instan (barang kecil).
4. Pesanan tercatat dengan status menunggu harga. Tim menyiapkan penawaran resmi, lalu customer membayar lewat QRIS atau transfer bank.
5. Pembayaran baru dianggap diterima setelah diverifikasi admin. Livi tidak pernah menyatakan pembayaran sudah lunas.

MY CONSULTATION (untuk desain, interior, kontraktor, dan kebutuhan project)
- Customer mengajukan konsultasi lewat formulir My Consultation di livoralcr.com: nama, email, nomor telepon, metode komunikasi yang disukai, lokasi, jenis konsultasi, jenis layanan. Bisa melampirkan foto ruangan, floor plan, atau gambar inspirasi.
- Jenis konsultasi: Inspiration & Styling, Product Selection, Room Design, Full Interior Project.
- Yang customer dapat: konsultasi personal, perencanaan ruang 3D, panduan material dan finishing, serta pengiriman dan instalasi.
- Tahapan: Inquiry Submitted, Under Review, Contacted, Meeting Scheduled (bisa tatap muka atau online), Consultation in Progress, Agreement dengan tanda tangan elektronik, DP Payment, Project Paid, Project Running, Completed. Customer memantau semuanya di halaman My Consultation dan bisa chat dengan tim di sana.
- DP: untuk project tertentu Livora meminta uang muka (DP); customer mengunggah bukti bayar di sistem dan diverifikasi dulu. Nilai dan jadwal pembayaran tertulis di proposal, invoice, atau dokumen project.
- Selama project berjalan, tim memberi pembaruan progres di My Consultation (persentase, catatan, foto, komentar).
- Mengajukan konsultasi bukan berarti project otomatis disetujui. Livora bisa menolak permintaan karena ketidaksesuaian kebutuhan, kapasitas, lokasi atau jenis project, atau informasi yang kurang lengkap.
- Customer bisa membatalkan konsultasi selama masih memungkinkan. Ketentuan pembatalan setelah agreement atau pembayaran mengikuti dokumen project.

KONTAK
- Alamat showroom/kantor: Jl. Bangka Raya No. 45, Pela Mampang, Mampang Prapatan, Jakarta Selatan 12720.
- WhatsApp tim: +62 821 2043 307. Web: livoralcr.com. Instagram: @livoraid. Email: livoralcrmarketing@gmail.com.

BELUM ADA DI DATA (jangan dijanjikan atau ditebak; katakan terus terang lalu bantu dengan cara lain)
- Harga, diskon, stok, tanggal kirim, ongkir, estimasi waktu produksi, kisaran budget project, area layanan di luar Jakarta, biaya konsultasi (jangan bilang gratis atau berbayar), kemampuan custom tertentu.
- Untuk hal-hal itu: jelaskan apa yang menentukan jawabannya, kumpulkan detail kebutuhan customer supaya tim bisa menjawab tepat, lalu tawarkan tim atau booking konsultasi.
K;

    /** Kata Indonesia yang sering dipakai customer → kata yang mungkin ada di judul produk/kategori. */
    protected const SYNONYMS = [
        'sofa' => ['sofa', 'couch', 'sectional', 'loveseat'],
        'sopa' => ['sofa', 'couch', 'sectional'],
        'kursi' => ['chair', 'armchair', 'stool', 'bench', 'seat'],
        'bangku' => ['bench', 'stool', 'chair'],
        'meja' => ['table', 'desk', 'console'],
        'kasur' => ['bed'],
        'ranjang' => ['bed'],
        'tempat tidur' => ['bed'],
        'lemari' => ['cabinet', 'wardrobe', 'storage', 'shelf', 'sideboard'],
        'rak' => ['shelf', 'cabinet', 'storage'],
        'lampu' => ['lamp', 'light', 'pendant', 'sconce'],
        'karpet' => ['rug', 'carpet'],
        'aksesori' => ['accessories', 'decor', 'vase'],
        'aksesoris' => ['accessories', 'decor', 'vase'],
        'dekor' => ['decor', 'accessories'],
        'cermin' => ['mirror'],
    ];

    protected const STOPWORDS = [
        'halo', 'hallo', 'hai', 'lihat', 'liat', 'tolong', 'dong', 'bisa', 'minta', 'cari', 'carikan', 'ingin', 'pengen', 'produk', 'barang',
        'furniture', 'furnitur', 'livora', 'selamat', 'pagi', 'siang', 'sore', 'malam', 'terima', 'kasih', 'makasih', 'tanya', 'kakak',
        'apakah', 'apa', 'yang', 'untuk', 'dengan', 'dari', 'atau', 'ada', 'lagi', 'tapi', 'juga', 'sudah', 'belum', 'mohon', 'bantu',
        'pesan', 'beli', 'harga', 'berapa', 'gimana', 'bagaimana', 'kapan', 'dimana', 'punya', 'mau', 'koleksi', 'katalog', 'model',
    ];

    /** Teks pengetahuan lengkap, termasuk jam kerja, kebijakan purna jual dari pengaturan toko, dan tambahan dari Owner. */
    public static function text(): string
    {
        $out = self::TEXT;

        $out .= "\n\nJAM KERJA TIM (WIB): ".self::hoursText().'. Di luar jam itu Livi tetap melayani, tim membalas saat jam kerja.';
        $warranty = (int) ShopSettings::get('warranty_days', 0);
        $return = (int) ShopSettings::get('return_days', 0);
        if ($warranty > 0 || $return > 0) {
            $out .= "\nPURNA JUAL TERCATAT DI SISTEM:".($warranty > 0 ? " garansi {$warranty} hari" : '').($return > 0 ? "; batas pengajuan retur {$return} hari" : '')
                .'. Syarat dan detail klaim dikonfirmasi tim.';
        }
        $extra = trim((string) ShopSettings::get('livora_knowledge_extra', ''));
        if ($extra !== '') $out .= "\n\nINFO TAMBAHAN DARI OWNER:\n".mb_substr($extra, 0, 6000);

        return $out;
    }

    protected static function hoursText(): string
    {
        $h = (array) ShopSettings::get('business_hours', []);
        $names = [1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu', 7 => 'Minggu', 0 => 'Minggu'];
        $days = array_values(array_unique(array_map('intval', (array) ($h['days'] ?? [1, 2, 3, 4, 5, 6]))));
        sort($days);
        if (!$days) return 'jam kerja belum diatur';
        $consecutive = count($days) > 2 && $days === range($days[0], $days[0] + count($days) - 1);
        $dayText = $consecutive ? $names[$days[0]].'–'.$names[end($days)] : implode(', ', array_map(fn ($d) => $names[$d] ?? (string) $d, $days));

        return $dayText.', '.str_replace(':', '.', (string) ($h['start'] ?? '09:00')).'–'.str_replace(':', '.', (string) ($h['end'] ?? '17:00'));
    }

    /** Ringkasan katalog (jenis produk + contoh + tema gaya) supaya Livi bisa merekomendasikan tanpa menunggu kata kunci cocok. */
    public static function catalogOverview(): array
    {
        return Cache::remember('livi_catalog_overview_v1', 600, function () {
            try {
                $out = [];
                foreach (FurnitureType::withCount('items')->orderByDesc('items_count')->limit(15)->get() as $t) {
                    if ((int) $t->items_count < 1) continue;
                    $out[] = [
                        'jenis' => (string) $t->name,
                        'jumlah_produk' => (int) $t->items_count,
                        'contoh_produk' => Item::where('type_id', $t->id)->orderByDesc('id')->limit(4)->get()->map(fn ($i) => (string) $i->title)->filter()->values()->all(),
                    ];
                }

                return [
                    'total_produk' => Item::count(),
                    'jenis_produk' => $out,
                    'tema_gaya' => Theme::orderBy('name')->limit(12)->get()->map(fn ($x) => (string) $x->name)->filter()->values()->all(),
                ];
            } catch (\Throwable $e) {
                return [];
            }
        });
    }

    /**
     * Cari produk dari kalimat bebas customer: paham sinonim Indonesia→Inggris (sofa/couch, kursi/chair, ...),
     * mencocokkan judul, kode, jenis, kategori, dan tema.
     *
     * @return Collection<int, Item>
     */
    public static function findItems(string $text, int $limit = 5): Collection
    {
        $lower = mb_strtolower($text);
        $terms = [];
        foreach (self::SYNONYMS as $key => $alts) {
            if (preg_match('/(?<![\p{L}\p{N}])'.preg_quote($key, '/').'(?![\p{L}\p{N}])/u', $lower)) $terms = array_merge($terms, [$key], $alts);
        }
        foreach (preg_split('/[^\p{L}\p{N}]+/u', $lower) ?: [] as $w) {
            if (mb_strlen($w) >= 4 && !in_array($w, self::STOPWORDS, true)) $terms[] = $w;
        }
        $terms = array_slice(array_values(array_unique($terms)), 0, 10);
        if (!$terms) return collect();

        try {
            return Item::query()->where(function ($q) use ($terms) {
                foreach ($terms as $t) {
                    $like = '%'.$t.'%';
                    $q->orWhere('title', 'like', $like)->orWhere('code', 'like', $like)
                        ->orWhereHas('type', fn ($x) => $x->where('name', 'like', $like))
                        ->orWhereHas('categories', fn ($x) => $x->where('name', 'like', $like))
                        ->orWhereHas('themes', fn ($x) => $x->where('name', 'like', $like));
                }
            })->orderByDesc('id')->limit($limit)->get();
        } catch (\Throwable $e) {
            return collect();
        }
    }
}