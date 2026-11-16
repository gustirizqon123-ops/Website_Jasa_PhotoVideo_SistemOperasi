<?php
require_once __DIR__ . '/response.php';

/* ZONA WAKTU (perbaikan 2026-11-16)
   Studio ada di Banjarmasin (WITA, UTC+8). Tanpa baris ini PHP memakai zona
   bawaan server: di XAMPP "Europe/Berlin", di hosting biasanya UTC. Akibatnya
   cek "tanggal acara tidak boleh di masa lalu" (pesanan/buat.php) meleset
   7-8 jam: antara pukul 00.00-07.59 WITA pelanggan masih bisa memesan
   tanggal KEMARIN. */
date_default_timezone_set('Asia/Makassar');

$host = 'localhost';
$db   = 'db_foto_video';
$user = 'root';
$pass = '';

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
  kirim_error('Koneksi database gagal', 500);
}