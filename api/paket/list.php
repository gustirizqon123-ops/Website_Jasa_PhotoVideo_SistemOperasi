<?php
/* ==========================================================================
   api/paket/list.php   (milik A)
   Letak file : api/paket/list.php
   Method     : GET
   Login      : Tidak perlu
   Dipakai di : daftar paket di Katalog (js/katalog.js)

   Parameter (query, opsional): ?kategori=ID -- kalau diisi, hanya paket
   dengan kategori_id itu yang dikembalikan. Kalau kosong, semua paket.

   Lihat API.md bagian 4.1 untuk kontrak lengkapnya (bentuk respons,
   kemungkinan error).
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  kirim_error('Method tidak diizinkan', 405);
}

$kategoriId = $_GET['kategori'] ?? null;

// Validasi: kalau parameter "kategori" diisi, HARUS angka. ctype_digit
// dipakai (bukan is_numeric) supaya "1.5" atau "-1" juga ditolak --
// id kategori selalu bilangan bulat positif.
if ($kategoriId !== null && $kategoriId !== '' && !ctype_digit((string) $kategoriId)) {
  kirim_error('Parameter kategori harus berupa angka', 400);
}

try {
  // JOIN ke tabel kategori supaya frontend langsung dapat NAMA kategori
  // ("Wedding"), tidak perlu memanggil api/kategori/list.php terpisah
  // hanya untuk menampilkan nama di kartu paket.
  $sql = 'SELECT p.id, p.kategori_id, k.nama_kategori AS kategori,
                 p.nama, p.deskripsi, p.harga, p.gambar
          FROM paket p
          JOIN kategori k ON k.id = p.kategori_id';

  $parameter = [];

  if ($kategoriId !== null && $kategoriId !== '') {
    $sql .= ' WHERE p.kategori_id = :kategori_id';
    $parameter['kategori_id'] = (int) $kategoriId;
  }

  $sql .= ' ORDER BY p.id';

  $stmt = $pdo->prepare($sql);
  $stmt->execute($parameter);
  $baris = $stmt->fetchAll();

  // Rapikan tipe data: id/kategori_id/harga harus angka, bukan string
  // (PDO mengembalikan semua kolom sebagai string secara default).
  $data = array_map(function ($satu) {
    return [
      'id' => (int) $satu['id'],
      'kategori_id' => (int) $satu['kategori_id'],
      'kategori' => $satu['kategori'],
      'nama' => $satu['nama'],
      'deskripsi' => $satu['deskripsi'],
      'harga' => (int) $satu['harga'],
      'gambar' => $satu['gambar'],
    ];
  }, $baris);

  kirim_sukses($data);
} catch (PDOException $e) {
  error_log('paket/list.php: ' . $e->getMessage());
  kirim_error('Gagal mengambil daftar paket', 500);
}