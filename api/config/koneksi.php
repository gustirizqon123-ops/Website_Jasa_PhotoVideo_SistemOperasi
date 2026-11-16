<?php
require_once __DIR__ . '/response.php';

/* ZONA WAKTU (perbaikan 2026-11-16)
   Studio ada di Banjarmasin (WITA, UTC+8). Tanpa baris ini PHP memakai zona
   bawaan server: di XAMPP "Europe/Berlin", di hosting biasanya UTC. Akibatnya
   cek "tanggal acara tidak boleh di masa lalu" (pesanan/buat.php) meleset
   7-8 jam: antara pukul 00.00-07.59 WITA pelanggan masih bisa memesan
   tanggal KEMARIN. */
date_default_timezone_set('Asia/Makassar');

/* DATA LOGIN DATABASE (Tahap 0.7 hosting, 2026-11-16)
   Nilai bawaan di bawah = XAMPP (root tanpa password), jadi di laptop
   TIDAK perlu mengubah apa pun.

   Di HOSTING: buat file api/config/kredensial.php (salin dari
   kredensial.contoh.php) berisi data MySQL dari panel hosting. Kalau file
   itu ada, nilainya MENGGANTIKAN nilai bawaan. File kredensial.php
   diabaikan Git (.gitignore) supaya password hosting TIDAK PERNAH masuk ke
   GitHub (repository ini publik). Jangan menulis password hosting di sini. */
$host = 'localhost';
$db   = 'db_foto_video';
$user = 'root';
$pass = '';

$fileKredensial = __DIR__ . '/kredensial.php';
if (is_file($fileKredensial)) {
    $kredensial = require $fileKredensial;
    $host = $kredensial['host'] ?? $host;
    $db   = $kredensial['db']   ?? $db;
    $user = $kredensial['user'] ?? $user;
    $pass = $kredensial['pass'] ?? $pass;
    unset($kredensial);
}

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    // Jam MySQL juga WITA, supaya NOW() (dibuat_pada pesanan, dibayar_pada
    // pembayaran) sama dengan jam PHP di atas, termasuk di hosting yang
    // MySQL-nya memakai UTC.
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
  // Pesan asli (berisi nama host/user) hanya ke log, bukan ke respons
  error_log('koneksi.php: ' . $e->getMessage());
  kirim_error('Koneksi database gagal', 500);
}