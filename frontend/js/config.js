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
     tautan wa.me di halaman Konfirmasi. */
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

  /* ---- DURASI TOAST ----
     [UBAH] berapa lama notifikasi kecil (lihat ui.js) tampil di layar,
     dalam milidetik, sebelum hilang otomatis. */
  DURASI_TOAST: 3500,

  /* [TAMBAH] nilai konfigurasi lain yang dipakai lebih dari satu halaman,
     taruh di sini, bukan ditulis langsung (hardcode) di file JS halaman. */
};