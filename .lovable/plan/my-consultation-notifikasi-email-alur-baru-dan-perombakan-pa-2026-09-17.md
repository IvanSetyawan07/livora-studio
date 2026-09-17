# My Consultation — Notifikasi Email, Alur Baru, dan Perombakan Panel Admin

Lanjutan dari fitur konsultasi yang sudah berjalan. Tidak ada pembangunan ulang: alur 9 tahap, chat, dan unggahan yang ada tetap dipakai.

## Fase 1 — Perbaikan yang mendesak
- Perbaiki bukti pembayaran dan invoice yang gagal dibuka (poin 5), dan pastikan admin bisa membuka kwitansi yang dikirim pelanggan langsung dari halaman detail (poin 4).
- Tombol pada kartu konsultasi: "On Progress" selama proyek berjalan, "View Details" hanya setelah selesai (poin 2).
- Tukar urutan tahap: dokumen Agreement ditandatangani lebih dulu, baru permintaan DP (poin 3). Data lama tetap terbaca.

## Fase 2 — Email di setiap titik penting
Email otomatis ke pelanggan, semuanya memuat tautan langsung ke halaman My Consultation miliknya (yang meminta login lebih dulu):
- Permintaan disetujui
- Jadwal pertemuan: tanggal, jam, jenis pertemuan, dan tautan rapat yang dibuatkan atas nama pemesan
- Dokumen yang sudah ditandatangani kedua pihak beserta meterai
- Permintaan DP dan konfirmasi DP diterima
- Setiap pembaruan progres proyek
- Tagihan pelunasan dan pemberitahuan proyek selesai

Semua memakai satu tampilan surat Livora yang konsisten. Kegagalan kirim tidak membatalkan aksi dan tercatat untuk dicoba ulang.

## Fase 3 — Tanda tangan, meterai, dan dokumen final (poin 6)
- Setelah pelanggan tanda tangan, sistem menyusun PDF perjanjian dengan tanda tangan pelanggan tertempel otomatis.
- Admin menerima pemberitahuan, membuka PDF itu, lalu menandatangani; tanda tangan Livora ditempel otomatis di dokumen yang sama.
- Meterai dibayar dan diurus dari sisi admin. Sebelum dokumen final dirilis, admin memberi konfirmasi bahwa tanda tangan dan meterai sudah benar, atau mengunggah versi final bermeterai.
- Setelah itu pelanggan dan admin sama-sama bisa melihat dan mengunduh dokumen final.

## Fase 4 — Pemberitahuan dua arah dengan suara (poin 7 & 8)
- Komentar "Ask about this update" dari pelanggan memunculkan lonceng pemberitahuan di admin, lengkap dengan nada notifikasi.
- Pelanggan juga mendapat nada notifikasi saat admin membalas.
- Balasan/komentar juga dikirim ke email seluruh admin terdaftar, serta ke WhatsApp pelanggan bila nomor WhatsApp Livora sudah aktif.
- Panel admin mendapat daftar khusus "Pertanyaan Pelanggan" agar komentar tidak terlewat.

## Fase 5 — Dokumentasi kunjungan & berita acara (poin 9 & 11)
- Admin bisa membuat catatan dokumentasi kunjungan pelanggan ke proyek: tanggal, catatan, dan foto. Pelanggan melihatnya di halaman My Consultation.
- Sebelum proyek ditutup, admin mengunggah dokumen berita acara serah terima; pelanggan bisa membukanya dan status selesai baru bisa diberikan setelah dokumen itu ada.

## Fase 6 — Panduan tahap untuk pelanggan (poin 10)
Panel penjelas di sisi kiri halaman My Consultation: tahap saat ini, arti tahap tersebut, dan langkah yang harus pelanggan lakukan berikutnya.

## Fase 7 — Perombakan tampilan admin (poin 12)
- Halaman detail konsultasi disusun ulang menjadi bagian yang jelas: Ringkasan, Tindakan Berikutnya, Pembayaran, Dokumen, Progres, Pertanyaan Pelanggan.
- Kotak "Tindakan Berikutnya" menonjolkan satu hal yang harus admin kerjakan sekarang, dengan penjelasan singkat pada setiap tombol.
- Daftar konsultasi mendapat penanda perhatian: bukti pembayaran menunggu, tanda tangan menunggu, komentar belum dibalas.

## Catatan teknis
- Laravel/Sanctum + React/Vite yang ada. Migrasi tambahan yang ringkas untuk dokumentasi kunjungan, berita acara, dan status meterai/konfirmasi admin.
- Penempelan tanda tangan pada PDF memakai layanan PDF yang sudah ada di proyek.
- URL berkas diseragamkan lewat satu pembantu agar bukti dan invoice selalu terbuka.

## Yang perlu Anda siapkan
- Kredensial WhatsApp (Twilio) bila notifikasi WhatsApp ingin aktif.
- Kredensial e-meterai bila pembelian meterai ingin otomatis; tanpa itu, meterai tetap bisa diurus manual oleh admin lewat unggahan dokumen final.
- Menjalankan migrasi database di server setelah perubahan dikirim.
