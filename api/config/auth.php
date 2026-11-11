<?php
/* ==========================================================================
   api/config/auth.php   (milik C)
   Letak file : api/config/auth.php
   Dipakai di : SEMUA file api/admin/*.php, KECUALI login.php

   TUGAS FILE INI
   Menyediakan satu fungsi: cek_login(). Panggil fungsi ini di baris paling
   atas setiap endpoint admin (setelah require koneksi.php dan response.php).
   Kalau admin belum login, fungsi ini langsung menghentikan skrip dan
   mengirim respons error 401 sesuai format di API.md. Kalau sudah login,
   fungsi ini tidak melakukan apa-apa (skrip lanjut seperti biasa).

   CARA PAKAI di endpoint admin, contoh api/admin/pesanan.php:

     <?php
     require_once __DIR__ . '/../config/response.php';
     require_once __DIR__ . '/../config/koneksi.php';
     require_once __DIR__ . '/../config/auth.php';

     cek_login();   // <-- WAJIB dipanggil sebelum kode lain di endpoint admin

     // ... kode endpoint, aman dipakai karena sudah pasti admin sedang login ...

   [UBAH] nama kunci session ("admin_id") boleh diganti, asal konsisten
   dipakai juga di login.php dan logout.php.
   ========================================================================== */

/* session_start() wajib dipanggil di SETIAP file yang membaca/menulis $_SESSION,
   dan harus di baris paling atas sebelum ada output apa pun ke layar.
   if (session_status() === PHP_SESSION_NONE) mencegah error "session sudah dimulai"
   kalau file ini ternyata di-require dua kali. */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Mengecek apakah admin sedang login.
 * Dipanggil di awal setiap endpoint admin (kecuali login.php).
 *
 * - Kalau session berisi admin_id -> admin sudah login, fungsi selesai tanpa efek.
 * - Kalau tidak ada -> kirim respons 401 sesuai format API.md, lalu exit().
 *   kirim_error() sendiri sudah memanggil exit, jadi baris setelah cek_login()
 *   TIDAK akan dijalankan kalau admin belum login.
 */
function cek_login() {
    if (empty($_SESSION['admin_id'])) {
        // kirim_error() ada di response.php (sudah di-require sebelum file ini)
        kirim_error('Silakan login terlebih dahulu', 401);
        // baris di bawah ini tidak akan pernah tercapai (kirim_error sudah exit),
        // ditulis supaya jelas saja bagi pembaca kode.
        return;
    }
}

/**
 * [TAMBAH] Kalau nanti butuh, fungsi kecil untuk mengambil data admin yang
 * sedang login (dipakai misalnya untuk menampilkan "Administrator" di header).
 * Dipanggil SETELAH cek_login(), supaya sudah pasti session-nya ada.
 */
function admin_sekarang() {
    return [
        'id'   => (int) ($_SESSION['admin_id'] ?? 0),
        'nama' => $_SESSION['admin_nama'] ?? 'Administrator',
    ];
}
