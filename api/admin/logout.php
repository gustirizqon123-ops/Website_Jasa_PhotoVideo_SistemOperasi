<?php
/* ==========================================================================
   api/admin/logout.php   (milik C)
   Letak file : api/admin/logout.php
   Method     : POST
   Login      : Ya
   Dipakai di : tombol "Keluar" di sidebar (frontend/js/admin/layout.js,
                sudah dipasang sejak Tahap 1 -- lihat siapkanTombolKeluar())

   TUGAS FILE INI
   Menghapus session admin di server, supaya endpoint admin lain menolak
   permintaan berikutnya (401) sampai admin login lagi.

   Lihat API.md bagian 5.2 untuk kontrak lengkapnya.
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';
require_once __DIR__ . '/../config/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim_error('Method tidak diizinkan', 405);
}

cek_login(); // dari auth.php -- menolak dengan 401 kalau belum login

// Kosongkan semua data session, lalu hapus session-nya sepenuhnya.
$_SESSION = [];

if (ini_get('session.use_cookies')) {
  // Hapus cookie dengan pengaturan yang SAMA seperti saat dibuat (termasuk
  // samesite, lihat mulai_session() di auth.php), supaya browser benar-benar
  // menghapusnya.
  $parameter = session_get_cookie_params();
  setcookie(session_name(), '', [
    'expires'  => time() - 42000,
    'path'     => $parameter['path'],
    'domain'   => $parameter['domain'],
    'secure'   => $parameter['secure'],
    'httponly' => $parameter['httponly'],
    'samesite' => $parameter['samesite'] ?? 'Lax',
  ]);
}

session_destroy();

kirim_sukses(null, 'Berhasil keluar');