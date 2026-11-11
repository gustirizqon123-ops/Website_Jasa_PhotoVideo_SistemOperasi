<?php
/* ==========================================================================
   api/paket/detail.php   (milik A)
   Letak file : api/paket/detail.php
   Method     : GET
   Login      : Tidak perlu
   Dipakai di : modal "Lihat detail" di Katalog, kartu ringkasan paket di
                halaman Pemesanan (keduanya lewat js/katalog.js / nanti
                pemesanan.js milik B)

   Parameter (query, WAJIB): ?id=ID

   Lihat API.md bagian 4.2 untuk kontrak lengkapnya.
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  kirim_error('Method tidak diizinkan', 405);
}

$id = $_GET['id'] ?? null;

if ($id === null || $id === '' || !ctype_digit((string) $id)) {
  kirim_error('Parameter id wajib berupa angka', 400);
}

try {
  $stmt = $pdo->prepare(
    'SELECT p.id, p.kategori_id, k.nama_kategori AS kategori,
            p.nama, p.deskripsi, p.harga, p.gambar
     FROM paket p
     JOIN kategori k ON k.id = p.kategori_id
     WHERE p.id = :id'
  );
  $stmt->execute(['id' => (int) $id]);
  $paket = $stmt->fetch();

  if (!$paket) {
    kirim_error('Paket tidak ditemukan', 404);
  }

  kirim_sukses([
    'id' => (int) $paket['id'],
    'kategori_id' => (int) $paket['kategori_id'],
    'kategori' => $paket['kategori'],
    'nama' => $paket['nama'],
    'deskripsi' => $paket['deskripsi'],
    'harga' => (int) $paket['harga'],
    'gambar' => $paket['gambar'],
  ]);
} catch (PDOException $e) {
  error_log('paket/detail.php: ' . $e->getMessage());
  kirim_error('Gagal mengambil detail paket', 500);
}