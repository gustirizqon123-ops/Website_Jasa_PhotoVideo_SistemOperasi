/* ==========================================================================
   js/config.js   (milik A)
   Letak file : frontend/js/config.js
   Dimuat di  : SEMUA halaman, PALING PERTAMA dari semua file JS
                (sebelum util.js, api.js, ui.js, komponen.js, dan file
                halaman seperti katalog.js/pemesanan.js/dst)

   TUGAS FILE INI
   Menyimpan nilai-nilai yang dipakai di banyak tempat, supaya kalau ada
   yang berubah (nomor WhatsApp admin, batas ukuran file, dll), cukup
   diubah SATU kali di sini -- tidak perlu mencari satu-satu di tiap file JS.

   File ini TIDAK membuat fungsi apa pun, hanya menyimpan nilai (konstanta)
   di satu objek global bernama KONFIG, supaya tidak mengotori nama-nama
   lain di file JS halaman (hindari tabrakan nama variabel).

   CARA PAKAI di file JS lain:
     KONFIG.NOMOR_WA_ADMIN
     KONFIG.UKURAN_FILE_MAKS

   ========================================================================== */

var KONFIG = {

  /* ---- WHATSAPP ADMIN ----
     [UBAH] nomor WhatsApp admin, format internasional TANPA tanda "+"
     dan tanpa angka 0 di depan. Contoh nomor 0812-3456-7890 ditulis
     "6281234567890". Dipakai oleh util.js (linkWhatsApp()) untuk membuat
     tautan wa.me di halaman Konfirmasi (konfirmasi.js) dan tombol
     "Konsultasi via WhatsApp" di Katalog (katalog.js).
     Nomor di teks footer (komponen/footer.html) ditulis terpisah, ubah juga. */
  NOMOR_WA_ADMIN: '6281234567890',

  /* ---- NAMA STUDIO ----
     [UBAH] dipakai di footer, halaman konfirmasi, dan judul beberapa
     halaman kalau suatu saat ditulis lewat JS (sekarang masih ditulis
     langsung di HTML, variabel ini untuk konsistensi dan dipakai di
     pesan WhatsApp otomatis). */
  NAMA_STUDIO: 'For Us Picture.',

  /* ---- ATURAN UNGGAH BUKTI BAYAR ----
     Harus SAMA dengan aturan di api/pembayaran/upload.php (lihat API.md
     bagian 4.5). Dipakai oleh bayar.js (punya B) untuk validasi di sisi
     pengguna SEBELUM file dikirim ke server -- validasi di server tetap
     wajib ada, ini hanya supaya pengguna tahu lebih cepat. */
  UKURAN_FILE_MAKS: 2 * 1024 * 1024,              // 2 MB, dalam byte
  TIPE_FILE_DIIZINKAN: ['image/jpeg', 'image/png', 'application/pdf'],

  /* ---- ATURAN DP ----
     DP minimal sekian persen dari total harga. Harus SAMA dengan
     DP_MINIMAL_PERSEN di api/config/pesanan.php. Dipakai bayar.js untuk
     mengisi otomatis kolom jumlah dan validasi sebelum dikirim. */
  DP_MINIMAL_PERSEN: 50,

  /* ---- DURASI PAKET PER KATEGORI ----
     Teks durasi di bawah nama paket (modal detail Katalog dan ringkasan
     Pemesanan), ditentukan dari kategori_id paket (lihat tabel kategori:
     1 Wedding, 2 Wisuda, 3 Event). Disusun oleh teksDurasiPaket() di util.js.
     [UBAH] kalau aturan durasi studio berubah, cukup ubah di sini. */
  DURASI_PER_KATEGORI: {
    1: '8 jam dokumentasi',
    2: '1 jam sesi foto',
    3: 'Maksimal 8 jam dokumentasi',
  },

  /* ---- TAMBAH JAM (hanya informasi) ----
     Kategori yang boleh menambah jam, dan harganya per jam. Keputusan
     kelompok: ini HANYA informasi untuk pelanggan, total harga pesanan di
     sistem TIDAK berubah. Pelanggan menulis kebutuhan jam tambahan di
     Catatan / WhatsApp, lalu admin yang mengonfirmasi. */
  TAMBAH_JAM: {
    kategori_id: 3,   // Event
    harga: 250000,    // per jam
  },

  /* ---- DURASI TOAST ----
     [UBAH] berapa lama notifikasi kecil (lihat ui.js) tampil di layar,
     dalam milidetik, sebelum hilang otomatis. */
  DURASI_TOAST: 3500,

  /* [TAMBAH] nilai konfigurasi lain yang dipakai lebih dari satu halaman,
     taruh di sini, bukan ditulis langsung (hardcode) di file JS halaman. */
};