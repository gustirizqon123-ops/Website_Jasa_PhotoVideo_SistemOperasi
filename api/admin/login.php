<?php
/* ==========================================================================
   api/admin/login.php   (milik C)
   Letak file : api/admin/login.php
   Method     : POST
   Login      : Tidak perlu (justru endpoint UNTUK login)
   Dipakai di : frontend/admin/login.html (lewat js/admin/login.js)

   TUGAS FILE INI
   Mencocokkan username + password yang dikirim dengan tabel `admin`,
   memakai password_verify() (BUKAN membandingkan teks biasa, karena
   password di database tersimpan ter-hash lewat password_hash()).
   Kalau cocok, buat session PHP ($_SESSION['admin_id']) yang akan dibaca
   oleh api/config/auth.php di semua endpoint admin lain.

   PENTING: file ini TIDAK require_once auth.php (endpoint ini justru
   dipanggil SEBELUM admin login, jadi tidak boleh dihalangi cek login).

   Lihat API.md bagian 5.1 untuk kontrak lengkapnya.
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim_error('Method tidak diizinkan', 405);
}

/* Session harus dimulai SEBELUM ada output apa pun. response.php sudah
   memanggil header(), tapi itu bukan output body, jadi masih aman. */
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

// Baca body JSON. file_get_contents('php://input') dipakai (bukan $_POST)
// karena body dikirim sebagai JSON, sesuai API.md ("POST biasa: JSON di body").
$body = json_decode(file_get_contents('php://input'), true);

$username = trim($body['username'] ?? '');
$password = (string) ($body['password'] ?? '');

if ($username === '' || $password === '') {
  kirim_error('Username dan password wajib diisi', 400);
}

try {
  $stmt = $pdo->prepare('SELECT id, username, password, nama FROM admin WHERE username = :username');
  $stmt->execute(['username' => $username]);
  $admin = $stmt->fetch();

  // Pesan error SENGAJA SAMA untuk "username tidak ada" maupun "password
  // salah" (lihat API.md) -- supaya orang yang mencoba menebak-nebak
  // tidak tahu apakah username-nya benar atau tidak.
  if (!$admin || !password_verify($password, $admin['password'])) {
    kirim_error('Username atau password salah', 401);
  }

  // [UBAH/KEAMANAN] regenerate id session setelah login berhasil, supaya
  // id session yang dipakai sebelum login tidak bisa dipakai lagi
  // (mencegah serangan "session fixation").
  session_regenerate_id(true);

  $_SESSION['admin_id'] = (int) $admin['id'];
  $_SESSION['admin_nama'] = $admin['nama'];

  kirim_sukses(['nama' => $admin['nama']], 'Login berhasil');
} catch (PDOException $e) {
  error_log('admin/login.php: ' . $e->getMessage());
  kirim_error('Gagal memproses login', 500);
}