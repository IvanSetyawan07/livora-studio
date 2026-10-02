/**
 * Ketentuan Layanan & Kebijakan Privasi untuk AKUN Livora (Create Account / Login).
 * Berlaku untuk seluruh website Livora. Ketentuan khusus fitur My Consultation
 * (DP, agreement, meterai, project progress) tetap berada di consultationPolicies.ts.
 * Versi dipusatkan di sini agar mudah diperbarui saat konten berubah.
 */

import { LIVORA_CONTACT_EMAIL, type PolicyDocument } from "./consultationPolicies";

export const ACCOUNT_TERMS_VERSION = "1.0";
export const ACCOUNT_PRIVACY_VERSION = "1.0";
export const ACCOUNT_POLICY_LAST_UPDATED = "2026-10-02";

export const ACCOUNT_TERMS_OF_SERVICE: PolicyDocument = {
  modalTitle: "Terms of Service",
  title: "Ketentuan Layanan Livora – Akun Pengguna",
  lastUpdated: ACCOUNT_POLICY_LAST_UPDATED,
  intro: [
    "Selamat datang di Livora, showroom interior dan furniture di bawah naungan PT. Langgeng Cipta Ruang. Ketentuan Layanan ini mengatur pembuatan dan penggunaan akun Livora serta penggunaan website livoralcr.com.",
    "Dengan membuat akun atau menggunakan website Livora, pengguna menyatakan telah membaca, memahami, dan menyetujui Ketentuan Layanan ini.",
    "Penggunaan fitur My Consultation tunduk pada Ketentuan Layanan tersendiri yang ditampilkan pada saat pengguna mengajukan konsultasi.",
  ],
  sections: [
    {
      heading: "1. Tentang Livora dan Akun",
      paragraphs: [
        "Akun Livora memungkinkan pengguna menyimpan item favorit, mengelola informasi profil, mengajukan dan memantau konsultasi, serta berinteraksi dengan layanan yang tersedia di website.",
        "Beberapa bagian website, seperti katalog, koleksi, dan proyek, dapat diakses tanpa akun.",
      ],
    },
    {
      heading: "2. Syarat Pembuatan Akun",
      paragraphs: ["Untuk membuat akun, pengguna menyatakan bahwa:"],
      bullets: [
        "berusia minimal 17 tahun atau memiliki kapasitas hukum yang sesuai, atau telah memperoleh persetujuan orang tua atau wali",
        "informasi yang diberikan (nama, email, nomor HP) benar, akurat, dan terkini",
        "alamat email dan nomor HP yang didaftarkan adalah milik pengguna sendiri",
        "pengguna belum pernah dikeluarkan dari layanan Livora karena pelanggaran",
      ],
    },
    {
      heading: "3. Keamanan Akun",
      paragraphs: [
        "Pengguna bertanggung jawab menjaga kerahasiaan password dan akses ke akunnya, termasuk akun Google yang dipakai untuk masuk ke Livora.",
        "Seluruh aktivitas yang terjadi melalui akun dianggap dilakukan oleh pemilik akun. Segera hubungi Livora apabila Anda menduga akun Anda diakses tanpa izin.",
      ],
    },
    {
      heading: "4. Masuk dengan Google",
      paragraphs: [
        "Pengguna dapat masuk atau mendaftar menggunakan akun Google. Dalam hal ini Livora menerima informasi dasar dari Google, seperti nama, alamat email, dan foto profil, sesuai izin yang Anda berikan.",
        "Penggunaan akun Google tetap tunduk pada ketentuan Google. Livora tidak menerima password akun Google Anda.",
      ],
    },
    {
      heading: "5. Penggunaan Website yang Diizinkan",
      paragraphs: ["Pengguna dapat menggunakan website Livora untuk melihat katalog, koleksi, dan proyek, menyimpan item favorit, serta menghubungi Livora untuk keperluan yang sah."],
    },
    {
      heading: "6. Penggunaan yang Dilarang",
      paragraphs: ["Pengguna tidak diperkenankan untuk:"],
      bullets: [
        "memberikan data palsu atau menyamar sebagai orang lain",
        "mengakses akun atau data milik pengguna lain tanpa izin",
        "mengganggu, merusak, atau mencoba mengeksploitasi sistem, termasuk melalui scraping atau akses otomatis tanpa izin",
        "mengunggah atau mengirim konten yang melanggar hukum, menyesatkan, atau melanggar hak pihak lain",
        "menyalahgunakan layanan chat atau fitur komunikasi Livora, termasuk untuk spam atau pelecehan",
        "menggunakan website untuk tujuan yang bertentangan dengan hukum yang berlaku",
      ],
    },
    {
      heading: "7. Fitur Saved (Wishlist)",
      paragraphs: [
        "Pengguna dapat menyimpan furniture, koleksi, atau proyek ke dalam daftar Saved. Menyimpan item bukan merupakan pemesanan, reservasi, atau jaminan ketersediaan dan harga.",
      ],
    },
    {
      heading: "8. Informasi Produk, Harga, dan Ketersediaan",
      paragraphs: [
        "Livora berupaya menampilkan informasi produk, gambar, dan proyek secara akurat. Namun warna, ukuran, material, ketersediaan, dan harga dapat berbeda dari yang ditampilkan di layar, dan dapat berubah sewaktu-waktu.",
        "Informasi final disampaikan oleh tim Livora melalui konsultasi atau komunikasi resmi.",
      ],
    },
    {
      heading: "9. Asisten Chat",
      paragraphs: [
        "Website Livora dapat menyediakan asisten chat berbasis kecerdasan buatan (AI) untuk membantu menjawab pertanyaan umum dan memberikan rekomendasi. Jawaban asisten bersifat informatif dan dapat tidak lengkap atau keliru.",
        "Jawaban asisten bukan penawaran resmi, janji harga, atau persetujuan project. Untuk hal yang penting, pengguna dapat meminta dihubungkan dengan tim Livora.",
      ],
    },
    {
      heading: "10. Hak Kekayaan Intelektual",
      paragraphs: [
        "Seluruh konten di website Livora, termasuk logo, merek, foto, desain, gambar, video, teks, dan tata letak, merupakan milik Livora, PT. Langgeng Cipta Ruang, atau pemberi lisensinya dan dilindungi hukum yang berlaku.",
        "Pengguna tidak diperkenankan menyalin, memperbanyak, mengubah, atau menggunakan konten tersebut untuk tujuan komersial tanpa izin tertulis.",
      ],
    },
    {
      heading: "11. Penangguhan dan Penghapusan Akun",
      paragraphs: [
        "Livora dapat menangguhkan atau menghapus akun apabila terdapat pelanggaran terhadap Ketentuan Layanan ini, penyalahgunaan, atau alasan keamanan.",
        "Pengguna dapat meminta penghapusan akun dengan menghubungi Livora. Beberapa data dapat tetap disimpan apabila diperlukan untuk kewajiban hukum, administrasi, atau penyelesaian transaksi dan konsultasi yang sedang berjalan.",
      ],
    },
    {
      heading: "12. Ketersediaan Layanan",
      paragraphs: [
        "Livora berupaya menjaga website tetap tersedia, tetapi tidak menjamin layanan akan selalu bebas gangguan. Layanan dapat terhenti sementara karena pemeliharaan, gangguan teknis, atau faktor di luar kendali Livora.",
      ],
    },
    {
      heading: "13. Batasan Tanggung Jawab",
      paragraphs: [
        "Sejauh diizinkan oleh hukum yang berlaku, Livora tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan atau ketidakmampuan menggunakan website, termasuk kehilangan data akibat gangguan teknis, penggunaan akun oleh pihak lain karena kelalaian pengguna menjaga password, serta tindakan pihak ketiga di luar kendali Livora.",
        "Ketentuan ini tidak menghapus hak pengguna yang dijamin oleh peraturan perundang-undangan, termasuk ketentuan perlindungan konsumen.",
      ],
    },
    {
      heading: "14. Perubahan Ketentuan",
      paragraphs: [
        "Livora dapat memperbarui Ketentuan Layanan ini dari waktu ke waktu. Versi terbaru dan tanggal pembaruannya ditampilkan pada halaman ini.",
        "Apabila terdapat perubahan yang material, Livora dapat memberi tahu pengguna melalui email atau pemberitahuan di website. Penggunaan layanan setelah perubahan berlaku dianggap sebagai persetujuan terhadap versi terbaru.",
      ],
    },
    {
      heading: "15. Hukum yang Berlaku",
      paragraphs: [
        "Ketentuan Layanan ini diatur oleh hukum Republik Indonesia. Apabila terjadi perselisihan, para pihak akan mengupayakan penyelesaian secara musyawarah terlebih dahulu sebelum menempuh jalur hukum.",
      ],
    },
    {
      heading: "16. Hubungi Kami",
      paragraphs: [
        `Apabila Anda memiliki pertanyaan terkait Ketentuan Layanan ini, Anda dapat menghubungi Livora melalui ${LIVORA_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const ACCOUNT_PRIVACY_POLICY: PolicyDocument = {
  modalTitle: "Privacy Policy",
  title: "Kebijakan Privasi Livora – Akun Pengguna",
  lastUpdated: ACCOUNT_POLICY_LAST_UPDATED,
  intro: [
    "Livora, di bawah naungan PT. Langgeng Cipta Ruang, menghargai privasi pengguna dan berkomitmen menangani data pribadi secara bertanggung jawab.",
    "Kebijakan Privasi ini menjelaskan data apa yang kami kumpulkan saat Anda membuat akun dan menggunakan website Livora, untuk apa data tersebut digunakan, dengan siapa dibagikan, serta hak Anda atas data tersebut.",
    "Pengolahan data tambahan yang terjadi saat Anda menggunakan My Consultation dijelaskan dalam Kebijakan Privasi My Consultation.",
  ],
  sections: [
    {
      heading: "1. Data yang Kami Kumpulkan",
      paragraphs: ["Saat Anda membuat akun dan menggunakan website, kami dapat mengumpulkan:"],
      bullets: [
        "data akun: nama, alamat email, nomor HP, dan password (disimpan dalam bentuk terenkripsi/hash, bukan teks asli)",
        "data dari Google apabila Anda masuk dengan Google: nama, alamat email, dan foto profil",
        "data profil yang Anda isi sendiri, seperti alamat dan foto profil",
        "data aktivitas di website, seperti item yang Anda simpan di Saved, halaman atau item yang dilihat atau diklik, serta riwayat aktivitas akun",
        "data teknis, seperti alamat IP, waktu dan jumlah login, jenis perangkat, dan browser",
        "isi pesan yang Anda kirim melalui chat di website",
      ],
    },
    {
      heading: "2. Tujuan Penggunaan Data",
      paragraphs: ["Data Anda digunakan untuk:"],
      bullets: [
        "membuat, mengelola, dan mengamankan akun Anda",
        "memverifikasi identitas saat login dan mencegah akses tidak sah",
        "menyimpan dan menampilkan item Saved Anda",
        "menghubungi Anda terkait akun, konsultasi, dan permintaan yang Anda ajukan",
        "menjawab pertanyaan melalui chat dan layanan pelanggan",
        "memahami penggunaan website dan meningkatkan layanan, tampilan, serta konten",
        "memenuhi kewajiban hukum yang berlaku",
      ],
    },
    {
      heading: "3. Dasar Pemrosesan dan Persetujuan",
      paragraphs: [
        "Kami memproses data pribadi Anda berdasarkan persetujuan yang Anda berikan saat membuat akun, serta kepentingan sah lain yang diperbolehkan hukum, seperti keamanan dan pemenuhan permintaan Anda.",
        "Anda dapat menarik persetujuan dengan menghubungi kami. Penarikan persetujuan dapat berarti sebagian layanan, termasuk akun Anda, tidak dapat dilanjutkan.",
      ],
    },
    {
      heading: "4. Informasi Marketing",
      paragraphs: [
        "Livora dapat mengirimkan email berisi informasi, penawaran, atau konten editorial kepada pengguna. Anda dapat meminta untuk berhenti menerima email promosi kapan saja melalui tautan berhenti berlangganan di email atau dengan menghubungi kami.",
        "Email yang berkaitan dengan akun, keamanan, dan konsultasi yang sedang berjalan tetap dapat dikirim.",
      ],
    },
    {
      heading: "5. Asisten Chat dan Layanan Pelanggan",
      paragraphs: [
        "Pesan yang Anda kirim melalui chat dapat disimpan dan dilihat oleh tim Livora untuk memberikan bantuan dan meningkatkan layanan. Apabila percakapan diteruskan ke layanan pelanggan, tim Livora dapat melihat riwayat percakapan tersebut.",
        "Agar asisten dapat menjawab, isi pesan Anda dapat diproses oleh penyedia layanan kecerdasan buatan pihak ketiga. Mohon tidak mengirimkan informasi yang sangat sensitif melalui chat, seperti password, nomor kartu, atau dokumen identitas.",
      ],
    },
    {
      heading: "6. Cookies dan Teknologi Serupa",
      paragraphs: [
        "Website Livora menggunakan cookies, session, dan penyimpanan lokal di browser untuk menjaga login, mengingat preferensi, mendukung keamanan, dan memahami penggunaan website.",
        "Anda dapat mengatur atau menghapus cookies melalui pengaturan browser. Sebagian fitur, seperti login, dapat tidak berfungsi apabila cookies dinonaktifkan.",
      ],
    },
    {
      heading: "7. Berbagi Data dengan Pihak Ketiga",
      paragraphs: [
        "Livora tidak menjual data pribadi Anda. Data dapat dibagikan kepada penyedia layanan yang membantu operasional website, dengan akses terbatas sesuai kebutuhan, yaitu:",
      ],
      bullets: [
        "penyedia hosting dan infrastruktur server",
        "penyedia penyimpanan file dan gambar",
        "penyedia layanan email dan pengiriman pesan",
        "penyedia autentikasi, termasuk Google untuk fitur masuk dengan Google",
        "penyedia layanan kecerdasan buatan untuk asisten chat",
        "penyedia analitik dan pengukuran penggunaan website",
      ],
    },
    {
      heading: "8. Pengungkapan Berdasarkan Hukum",
      paragraphs: [
        "Livora dapat mengungkapkan data pribadi apabila diwajibkan oleh hukum, putusan pengadilan, atau permintaan resmi dari instansi berwenang, atau untuk melindungi hak, keamanan, dan properti Livora dan penggunanya.",
      ],
    },
    {
      heading: "9. Keamanan Data",
      paragraphs: [
        "Kami menerapkan langkah pengamanan yang wajar, termasuk penyimpanan password dalam bentuk hash, pembatasan akses data, dan penggunaan koneksi terenkripsi (HTTPS).",
        "Tidak ada sistem yang sepenuhnya bebas risiko. Pengguna turut bertanggung jawab menjaga kerahasiaan password dan perangkatnya.",
      ],
    },
    {
      heading: "10. Penyimpanan Data",
      paragraphs: [
        "Data akun disimpan selama akun aktif dan selama diperlukan untuk tujuan yang dijelaskan di atas. Setelah akun dihapus, data dapat tetap disimpan dalam jangka waktu tertentu apabila diperlukan untuk kewajiban hukum, administrasi, keamanan, atau penyelesaian sengketa.",
      ],
    },
    {
      heading: "11. Hak Pengguna",
      paragraphs: ["Sesuai peraturan perlindungan data pribadi yang berlaku di Indonesia, Anda dapat:"],
      bullets: [
        "meminta informasi tentang data pribadi Anda yang kami proses",
        "melihat dan memperbarui data profil melalui halaman Profile",
        "meminta perbaikan data yang tidak akurat",
        "meminta penghapusan data atau akun Anda",
        "menarik persetujuan atau mengajukan keberatan atas pemrosesan tertentu",
      ],
    },
    {
      heading: "12. Anak di Bawah Umur",
      paragraphs: [
        "Layanan Livora ditujukan bagi pengguna yang berusia minimal 17 tahun atau memiliki kapasitas hukum yang sesuai. Kami tidak dengan sengaja mengumpulkan data anak tanpa persetujuan orang tua atau wali.",
        "Apabila Anda mengetahui bahwa seorang anak telah mendaftar tanpa persetujuan, hubungi kami agar data tersebut dapat ditindaklanjuti.",
      ],
    },
    {
      heading: "13. Perubahan Kebijakan Privasi",
      paragraphs: [
        "Livora dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Versi terbaru dan tanggal pembaruannya ditampilkan pada halaman ini, dan perubahan yang material dapat diberitahukan melalui email atau pemberitahuan di website.",
      ],
    },
    {
      heading: "14. Hubungi Kami",
      paragraphs: [
        `Untuk pertanyaan, permintaan, atau keluhan mengenai privasi dan penggunaan data pribadi, hubungi Livora (PT. Langgeng Cipta Ruang) melalui ${LIVORA_CONTACT_EMAIL}.`,
      ],
    },
  ],
};