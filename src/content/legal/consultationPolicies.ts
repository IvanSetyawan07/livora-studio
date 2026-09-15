/**
 * Ketentuan Layanan & Kebijakan Privasi untuk fitur My Consultation.
 * Versi dipusatkan di sini agar mudah diperbarui saat konten berubah.
 */

export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";
export const POLICY_LAST_UPDATED = "2026-09-15";

export const LIVORA_CONTACT_EMAIL = "livoralcrmarketing@gmail.com";

export type PolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type PolicyDocument = {
  modalTitle: string;
  title: string;
  intro: string[];
  sections: PolicySection[];
};

export const formatPolicyDate = (iso: string = POLICY_LAST_UPDATED) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export const TERMS_OF_SERVICE: PolicyDocument = {
  modalTitle: "Terms of Service",
  title: "Ketentuan Layanan Livora – My Consultation",
  intro: [
    "Selamat datang di layanan My Consultation Livora. Ketentuan Layanan ini mengatur penggunaan layanan konsultasi yang disediakan oleh Livora melalui website dan sistem My Consultation.",
    "Dengan mengirimkan permintaan konsultasi atau menggunakan layanan My Consultation, pengguna menyatakan telah membaca, memahami, dan menyetujui Ketentuan Layanan ini.",
  ],
  sections: [
    {
      heading: "1. Tentang Layanan My Consultation",
      paragraphs: [
        "My Consultation merupakan layanan yang memungkinkan pengguna untuk mengajukan permintaan konsultasi kepada Livora mengenai kebutuhan desain, interior, furniture, styling, maupun kebutuhan project lainnya.",
        "Melalui layanan ini, pengguna dapat memberikan informasi mengenai kebutuhan mereka dan berkomunikasi dengan tim Livora selama proses konsultasi dan project.",
        "Layanan dapat mencakup:",
      ],
      bullets: ["Inspiration & Styling", "Product Selection", "Room Design", "Full Interior Project"],
    },
    {
      heading: "2. Pengajuan Permintaan Konsultasi",
      paragraphs: [
        "Pengguna dapat mengirimkan permintaan konsultasi dengan memberikan informasi yang diperlukan melalui formulir My Consultation.",
        "Informasi tersebut dapat meliputi:",
      ],
      bullets: [
        "nama",
        "email",
        "nomor telepon",
        "metode komunikasi",
        "lokasi",
        "jenis konsultasi",
        "jenis layanan",
        "jenis project",
        "perkiraan area",
        "preferensi gaya",
        "pertanyaan atau kebutuhan project",
        "file atau gambar pendukung",
      ],
    },
    {
      heading: "3. Permintaan Konsultasi Bukan Berarti Project Telah Disetujui",
      paragraphs: [
        "Pengiriman formulir My Consultation merupakan permintaan konsultasi, bukan persetujuan otomatis atas suatu project.",
        "Setelah formulir dikirim, permintaan akan masuk ke proses peninjauan oleh tim Livora. Livora dapat menerima, meminta informasi tambahan, menjadwalkan konsultasi, atau menolak permintaan berdasarkan pertimbangan yang relevan.",
        "Pengajuan konsultasi juga tidak secara otomatis menciptakan hubungan kontraktual untuk suatu project.",
      ],
    },
    {
      heading: "4. Proses Konsultasi",
      paragraphs: ["Proses My Consultation dapat mencakup beberapa tahapan, termasuk:"],
      bullets: [
        "Inquiry Submitted",
        "Under Review",
        "Contacted",
        "Meeting Scheduled",
        "Consultation in Progress",
        "DP Payment",
        "Project Paid",
        "Project Running",
        "Completed",
      ],
    },
    {
      heading: "5. Komunikasi dan Penjadwalan",
      paragraphs: [
        "Livora dapat menghubungi pengguna melalui metode komunikasi yang dipilih atau metode komunikasi lain yang diperlukan untuk keperluan consultation.",
        "Informasi meeting dapat meliputi tanggal, waktu, lokasi, atau meeting link.",
        "Jadwal konsultasi dapat berubah berdasarkan ketersediaan pengguna, tim Livora, kondisi project, atau keadaan lainnya.",
        "Pengguna bertanggung jawab memastikan bahwa informasi kontak yang diberikan dapat digunakan untuk komunikasi.",
      ],
    },
    {
      heading: "6. File dan Materi yang Diunggah Pengguna",
      paragraphs: [
        "Pengguna dapat mengunggah foto, floor plan, gambar inspirasi, dokumen, atau materi lain yang berkaitan dengan consultation.",
        "Dengan mengunggah materi tersebut, pengguna menyatakan bahwa mereka memiliki hak atau izin yang diperlukan untuk menggunakan dan membagikan materi tersebut kepada Livora.",
        "Pengguna memberikan kepada Livora izin terbatas untuk menyimpan, melihat, dan menggunakan materi tersebut sejauh diperlukan untuk memberikan layanan konsultasi dan mengelola project.",
      ],
    },
    {
      heading: "7. Komunikasi dalam Consultation",
      paragraphs: [
        "Pengguna dapat berkomunikasi dengan tim Livora melalui fitur komunikasi atau chat yang tersedia dalam consultation.",
        "Pesan dan file yang dikirim melalui fitur tersebut dapat menjadi bagian dari riwayat consultation dan digunakan untuk membantu Livora memberikan layanan.",
        "Pengguna tidak diperbolehkan menggunakan fitur komunikasi untuk mengirimkan materi yang melanggar hukum, mengandung malware, atau melanggar hak pihak lain.",
      ],
    },
    {
      heading: "8. Pembayaran",
      paragraphs: [
        "Dalam project tertentu, Livora dapat meminta pembayaran uang muka atau Down Payment (DP) sebelum project dilanjutkan ke tahap berikutnya.",
        "Pengguna dapat diminta mengunggah bukti pembayaran melalui sistem.",
        "Pembayaran hanya dianggap diterima atau terverifikasi setelah dilakukan pemeriksaan sesuai prosedur Livora.",
        "Untuk project yang telah berjalan, Livora juga dapat meminta final payment sesuai ketentuan project yang telah disepakati.",
        "Nilai pembayaran, jadwal pembayaran, dan ketentuan pembayaran project dapat ditentukan dalam proposal, invoice, atau dokumen project yang berlaku.",
      ],
    },
    {
      heading: "9. Agreement dan Persetujuan Elektronik",
      paragraphs: [
        "Setelah tahap pembayaran atau tahapan project tertentu, Livora dapat menyediakan dokumen agreement untuk disetujui oleh pengguna.",
        "Pengguna dapat diminta untuk memberikan nama penandatangan dan melakukan tanda tangan elektronik melalui sistem.",
        "Data terkait proses penandatanganan dapat dicatat sebagai bagian dari administrasi agreement, termasuk waktu penandatanganan dan dokumen yang telah ditandatangani.",
        "Agreement project merupakan dokumen yang terpisah dari Ketentuan Layanan ini.",
        "Apabila diperlukan, Livora dapat melakukan countersignature dan membuat versi final dari agreement yang telah ditandatangani oleh kedua pihak.",
      ],
    },
    {
      heading: "10. Project Progress",
      paragraphs: ["Untuk project yang telah dimulai, Livora dapat memberikan pembaruan progress melalui sistem My Consultation.", "Pembaruan dapat mencakup:"],
      bullets: ["persentase progress", "catatan progress", "foto progress", "komentar terkait progress"],
    },
    {
      heading: "11. Pembatalan",
      paragraphs: [
        "Pengguna dapat mengajukan pembatalan consultation melalui fitur yang tersedia, sepanjang consultation tersebut masih memungkinkan untuk dibatalkan.",
        "Livora juga dapat membatalkan atau menghentikan consultation apabila terdapat alasan operasional, informasi yang tidak valid, pelanggaran terhadap Ketentuan Layanan, atau alasan lain yang dianggap relevan.",
        "Ketentuan pembatalan project setelah agreement atau pembayaran dapat mengikuti dokumen project, proposal, invoice, atau agreement yang berlaku.",
      ],
    },
    {
      heading: "12. Penolakan Permintaan",
      paragraphs: ["Livora berhak menolak suatu permintaan consultation berdasarkan pertimbangan seperti:"],
      bullets: [
        "ketidaksesuaian kebutuhan dengan layanan Livora",
        "keterbatasan kapasitas",
        "lokasi atau jenis project",
        "informasi yang tidak lengkap atau tidak valid",
        "alasan operasional lainnya",
      ],
    },
    {
      heading: "13. Hak Kekayaan Intelektual",
      paragraphs: [
        "Seluruh merek, logo, desain antarmuka, sistem, software, konten, dan materi yang disediakan oleh Livora merupakan milik Livora atau pihak yang memberikan hak kepada Livora, kecuali dinyatakan lain.",
        "Pengguna tidak diperbolehkan menyalin, mendistribusikan, memodifikasi, menjual, atau menggunakan bagian dari sistem Livora untuk tujuan yang tidak diizinkan tanpa persetujuan yang diperlukan.",
        "Materi yang diberikan oleh pengguna tetap menjadi milik pengguna atau pemegang haknya, dengan ketentuan penggunaan sebagaimana dijelaskan dalam Ketentuan Layanan dan Kebijakan Privasi ini.",
      ],
    },
    {
      heading: "14. Penggunaan yang Dilarang",
      paragraphs: ["Pengguna tidak diperbolehkan:"],
      bullets: [
        "memberikan informasi palsu atau menyesatkan",
        "menggunakan akun atau consultation milik orang lain tanpa izin",
        "mengunggah file berbahaya atau malware",
        "mencoba mengakses sistem atau data yang tidak menjadi haknya",
        "mengganggu keamanan atau operasional sistem",
        "menggunakan layanan untuk tujuan yang melanggar hukum",
        "melakukan aktivitas lain yang dapat merugikan Livora atau pihak ketiga",
      ],
    },
    {
      heading: "15. Ketersediaan Layanan",
      paragraphs: [
        "Livora berupaya menjaga agar My Consultation dapat digunakan dengan baik. Namun, layanan dapat mengalami gangguan, maintenance, keterlambatan, atau penghentian sementara karena alasan teknis, keamanan, pemeliharaan, atau kondisi di luar kendali Livora.",
      ],
    },
    {
      heading: "16. Ketentuan Mengenai Hasil Konsultasi",
      paragraphs: [
        "Informasi, rekomendasi, konsep, saran desain, atau informasi lain yang diberikan dalam proses consultation dimaksudkan untuk membantu pengguna dalam mengambil keputusan.",
        "Hasil consultation dapat dipengaruhi oleh informasi yang diberikan pengguna, kondisi lokasi, perubahan kebutuhan, ketersediaan produk, serta faktor lainnya.",
      ],
    },
    {
      heading: "17. Batasan Tanggung Jawab",
      paragraphs: ["Sejauh diizinkan oleh hukum yang berlaku, Livora tidak bertanggung jawab atas kerugian yang timbul akibat:"],
      bullets: [
        "informasi yang diberikan pengguna secara tidak akurat",
        "penggunaan layanan yang tidak sesuai dengan ketentuan",
        "gangguan sistem atau layanan pihak ketiga",
        "keterlambatan yang disebabkan oleh keadaan di luar kendali Livora",
        "tindakan pengguna atau pihak lain yang berada di luar kendali Livora",
      ],
    },
    {
      heading: "18. Perubahan Ketentuan",
      paragraphs: [
        "Livora dapat memperbarui Ketentuan Layanan ini dari waktu ke waktu untuk menyesuaikan perubahan layanan, fitur, operasional, atau persyaratan lainnya.",
        "Versi terbaru akan ditampilkan pada halaman ini beserta tanggal pembaruannya.",
      ],
    },
    {
      heading: "19. Hubungi Kami",
      paragraphs: [
        `Apabila Anda memiliki pertanyaan terkait Ketentuan Layanan ini, Anda dapat menghubungi Livora melalui ${LIVORA_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const PRIVACY_POLICY: PolicyDocument = {
  modalTitle: "Kebijakan Privasi",
  title: "Kebijakan Privasi Livora – My Consultation",
  intro: [
    "Livora menghargai privasi pengguna dan berkomitmen untuk menangani informasi pribadi secara bertanggung jawab.",
    "Kebijakan Privasi ini menjelaskan jenis informasi yang dapat dikumpulkan melalui My Consultation, bagaimana informasi tersebut digunakan, disimpan, dan dikelola selama pengguna menggunakan layanan Livora.",
    "Dengan menggunakan My Consultation, pengguna memahami bahwa informasi dapat diproses sebagaimana dijelaskan dalam Kebijakan Privasi ini.",
  ],
  sections: [
    {
      heading: "1. Informasi yang Kami Kumpulkan",
      paragraphs: [
        "Saat menggunakan My Consultation, Livora dapat mengumpulkan informasi yang diberikan secara langsung oleh pengguna, termasuk informasi pribadi (nama depan, nama belakang, alamat email, nomor telepon) dan informasi consultation:",
      ],
      bullets: [
        "metode kontak",
        "jenis konsultasi",
        "lokasi",
        "jenis layanan",
        "jenis project",
        "perkiraan luas area",
        "preferensi gaya",
        "pertanyaan atau pesan project",
      ],
    },
    {
      heading: "2. File dan Materi yang Diunggah",
      paragraphs: ["Pengguna dapat mengunggah file yang berkaitan dengan consultation, seperti:"],
      bullets: ["foto ruangan", "floor plan", "gambar inspirasi", "dokumen project", "materi pendukung lainnya"],
    },
    {
      heading: "3. Informasi yang Terbentuk Selama Consultation",
      paragraphs: ["Selain informasi yang diberikan saat mengisi formulir, Livora dapat menyimpan informasi yang dihasilkan selama proses consultation, termasuk:"],
      bullets: [
        "status consultation",
        "riwayat perubahan status",
        "informasi meeting",
        "tanggal dan waktu meeting",
        "lokasi atau meeting link",
        "informasi follow-up",
        "catatan yang berkaitan dengan consultation",
        "aktivitas consultation",
        "informasi komunikasi antara pengguna dan tim Livora",
      ],
    },
    {
      heading: "4. Pesan dan Lampiran Komunikasi",
      paragraphs: ["Apabila pengguna menggunakan fitur chat atau komunikasi dalam consultation, Livora dapat menyimpan:"],
      bullets: ["isi pesan", "waktu pengiriman", "pengirim pesan", "lampiran", "nama file", "informasi teknis terkait lampiran"],
    },
    {
      heading: "5. Informasi Pembayaran",
      paragraphs: ["Dalam proses project, Livora dapat memproses informasi terkait pembayaran, termasuk:"],
      bullets: [
        "jumlah DP",
        "waktu pembayaran",
        "status pembayaran",
        "bukti pembayaran",
        "jumlah final payment",
        "permintaan final payment",
        "waktu pembayaran akhir",
        "dokumen atau invoice yang berkaitan dengan pembayaran",
      ],
    },
    {
      heading: "6. Agreement dan Tanda Tangan Elektronik",
      paragraphs: ["Apabila suatu project memerlukan agreement, Livora dapat memproses dan menyimpan:"],
      bullets: [
        "dokumen agreement",
        "nama pihak yang menandatangani",
        "waktu penandatanganan",
        "tanda tangan elektronik atau gambar tanda tangan",
        "dokumen yang telah ditandatangani",
        "informasi countersignature Livora",
        "dokumen final agreement",
      ],
    },
    {
      heading: "7. Informasi Meterai Elektronik",
      paragraphs: [
        "Dalam kondisi tertentu, dokumen agreement dapat diproses untuk kebutuhan meterai elektronik.",
        "Untuk keperluan tersebut, sistem dapat menyimpan status, referensi, waktu penyelesaian, atau informasi teknis yang berkaitan dengan proses tersebut.",
      ],
    },
    {
      heading: "8. Informasi Project Progress",
      paragraphs: ["Setelah project berjalan, Livora dapat mengumpulkan dan menyimpan:"],
      bullets: ["persentase progress", "catatan progress", "foto progress", "komentar terkait progress", "informasi mengenai pihak yang membuat pembaruan"],
    },
    {
      heading: "9. Informasi Akun dan Identitas Pengguna",
      paragraphs: [
        "Apabila pengguna memiliki akun Livora, consultation dapat dikaitkan dengan akun tersebut.",
        "Untuk pengguna yang tidak masuk menggunakan akun, sistem dapat menggunakan informasi seperti alamat email untuk mengidentifikasi atau menghubungkan consultation dengan data pengguna yang sudah tersedia apabila diperlukan.",
      ],
    },
    {
      heading: "10. Bagaimana Kami Menggunakan Informasi",
      paragraphs: ["Livora dapat menggunakan informasi pengguna untuk:"],
      bullets: [
        "menerima dan meninjau permintaan consultation",
        "menghubungi pengguna",
        "menjadwalkan consultation",
        "menjalankan proses consultation",
        "mengelola project",
        "memproses pembayaran dan bukti pembayaran",
        "mengelola agreement",
        "memberikan pembaruan project",
        "menyediakan customer support",
        "menjaga riwayat consultation",
        "meningkatkan kualitas layanan",
        "menjaga keamanan sistem",
        "memenuhi kewajiban hukum atau kebutuhan administrasi yang sah",
      ],
    },
    {
      heading: "11. Pemberitahuan dan Komunikasi",
      paragraphs: ["Livora dapat mengirimkan pemberitahuan terkait consultation melalui email atau fitur notifikasi yang tersedia. Pemberitahuan dapat mencakup:"],
      bullets: [
        "konfirmasi inquiry",
        "perubahan status",
        "meeting",
        "permintaan pembayaran",
        "agreement",
        "progress project",
        "pesan dari tim Livora",
        "penyelesaian consultation atau project",
      ],
    },
    {
      heading: "12. Penggunaan Informasi oleh Tim Livora",
      paragraphs: [
        "Informasi consultation dapat diakses oleh personel atau administrator Livora yang memiliki kewenangan dan membutuhkan informasi tersebut untuk menjalankan layanan.",
        "Akses terhadap informasi dibatasi sesuai kebutuhan operasional.",
      ],
    },
    {
      heading: "13. Penyedia Layanan Pihak Ketiga",
      paragraphs: [
        "Untuk menyediakan layanan, Livora dapat menggunakan penyedia layanan pihak ketiga seperti penyedia hosting, storage, email, komunikasi, pembayaran, atau layanan teknis lainnya.",
        "Pihak ketiga tersebut dapat memproses informasi tertentu hanya sejauh diperlukan untuk menyediakan layanan yang relevan.",
      ],
    },
    {
      heading: "14. Keamanan Data",
      paragraphs: [
        "Livora mengambil langkah yang wajar untuk menjaga keamanan informasi pengguna dari akses, penggunaan, perubahan, pengungkapan, atau penghancuran yang tidak sah.",
        "Namun, tidak ada sistem elektronik yang dapat dijamin sepenuhnya bebas dari risiko keamanan.",
        "Pengguna juga bertanggung jawab menjaga keamanan akun dan informasi akses mereka sendiri.",
      ],
    },
    {
      heading: "15. Penyimpanan Data",
      paragraphs: ["Livora menyimpan informasi selama diperlukan untuk:"],
      bullets: [
        "menyediakan layanan",
        "mengelola consultation dan project",
        "mempertahankan catatan administrasi",
        "menangani pembayaran",
        "mengelola agreement",
        "menyelesaikan sengketa",
        "memenuhi kewajiban hukum yang berlaku",
      ],
    },
    {
      heading: "16. Pengungkapan Informasi",
      paragraphs: ["Livora tidak membagikan informasi pribadi pengguna secara sembarangan. Informasi dapat diungkapkan apabila:"],
      bullets: [
        "diperlukan untuk menyediakan layanan",
        "diperlukan oleh penyedia layanan yang bekerja untuk Livora",
        "diperlukan untuk melindungi keamanan sistem",
        "diwajibkan atau diizinkan oleh hukum",
        "diperlukan untuk menjalankan, melindungi, atau menegakkan hak Livora dan pihak terkait",
      ],
    },
    {
      heading: "17. Hak Pengguna",
      paragraphs: [
        "Sesuai dengan ketentuan yang berlaku, pengguna dapat memiliki hak untuk meminta informasi mengenai data pribadinya, meminta perbaikan, atau meminta penghapusan data tertentu.",
        "Permintaan dapat dibatasi apabila informasi tersebut perlu dipertahankan untuk kepentingan hukum, administrasi, keamanan, pembayaran, agreement, atau kepentingan sah lainnya.",
      ],
    },
    {
      heading: "18. Penghapusan Data",
      paragraphs: ["Pengguna dapat menghubungi Livora apabila ingin meminta penghapusan informasi tertentu. Namun, tidak semua data dapat langsung dihapus apabila masih diperlukan untuk:"],
      bullets: ["transaksi", "agreement", "catatan pembayaran", "keamanan", "penyelesaian sengketa", "kewajiban hukum"],
    },
    {
      heading: "19. Cookies dan Informasi Teknis",
      paragraphs: [
        "Website Livora dapat menggunakan cookies, session information, atau teknologi serupa untuk menjaga fungsi website, membantu keamanan, mengingat preferensi, dan memahami penggunaan layanan.",
        "Sistem juga dapat mencatat informasi teknis tertentu yang diperlukan untuk keamanan dan operasional layanan.",
      ],
    },
    {
      heading: "20. Anak di Bawah Umur",
      paragraphs: [
        "Layanan My Consultation ditujukan untuk pengguna yang memiliki kapasitas hukum yang sesuai untuk menggunakan layanan.",
        "Apabila diperlukan persetujuan dari orang tua atau wali berdasarkan hukum yang berlaku, pengguna bertanggung jawab memastikan persetujuan tersebut diperoleh sebelum menggunakan layanan.",
      ],
    },
    {
      heading: "21. Perubahan Kebijakan Privasi",
      paragraphs: [
        "Livora dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu.",
        "Apabila terdapat perubahan, versi terbaru dan tanggal pembaruan akan ditampilkan pada halaman ini.",
      ],
    },
    {
      heading: "22. Hubungi Kami",
      paragraphs: [
        `Untuk pertanyaan, permintaan, atau keluhan mengenai privasi dan penggunaan informasi pribadi, hubungi Livora melalui ${LIVORA_CONTACT_EMAIL}.`,
      ],
    },
  ],
};
