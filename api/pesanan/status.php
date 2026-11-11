<?php
/* ==========================================================================
   api/pesanan/status.php   (milik A)
   Letak file : api/pesanan/status.php
   Method     : GET
   Login      : Tidak perlu
   Dipakai di : halaman Cek Status Pesanan

   Mengembalikan status pesanan berdasarkan kode_pesanan + no_wa.
   no_wa dipakai sebagai verifikasi karena kode pesanan berurutan dan mudah
   ditebak. Kode salah dan nomor tidak cocok sengaja menghasilkan pesan
   error yang SAMA (404), supaya orang tidak bisa menebak kode yang ada.

   Lihat API.md bagian 4.3 untuk kontrak lengkapnya.
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  kirim_error('Method tidak diizinkan', 405);
}

$kode = strtoupper(trim($_GET['kode'] ?? ''));
$noWa = trim($_GET['no_wa'] ?? '');

if ($kode === '' || $noWa === '') {
  kirim_error('Kode pesanan dan nomor WhatsApp wajib diisi', 400);
}

/* buat.php menyimpan no_wa apa adanya (boleh diawali 08 atau 62), jadi
   cocokkan kedua bentuknya: 0812... dan 62812... dianggap nomor yang sama. */
if (strpos($noWa, '08') === 0) {
  $noWaAlt = '62' . substr($noWa, 1);
} elseif (strpos($noWa, '62') === 0) {
  $noWaAlt = '0' . substr($noWa, 2);
} else {
  $noWaAlt = $noWa;
}

try {
  $stmt = $pdo->prepare(
    'SELECT p.id, p.kode_pesanan, p.nama, pk.nama AS nama_paket,
            p.tanggal_acara, p.jam, p.lokasi, p.total_harga, p.status, p.dibuat_pada
       FROM pesanan p
       JOIN paket pk ON pk.id = p.paket_id
      WHERE p.kode_pesanan = :kode AND p.no_wa IN (:wa1, :wa2)'
  );
  $stmt->execute(['kode' => $kode, 'wa1' => $noWa, 'wa2' => $noWaAlt]);
  $pesanan = $stmt->fetch();

  if (!$pesanan) {
    kirim_error('Pesanan tidak ditemukan', 404);
  }

  /* bukti_bayar dan data pribadi (email, no_wa, catatan) sengaja tidak diambil */
  $stmtBayar = $pdo->prepare(
    'SELECT jenis, jumlah, status FROM pembayaran WHERE pesanan_id = :id ORDER BY id'
  );
  $stmtBayar->execute(['id' => $pesanan['id']]);
  $pembayaran = array_map(function ($b) {
    return [
      'jenis' => $b['jenis'],
      'jumlah' => (int) $b['jumlah'],
      'status' => $b['status'],
    ];
  }, $stmtBayar->fetchAll());

  kirim_sukses([
    'kode_pesanan' => $pesanan['kode_pesanan'],
    'nama' => $pesanan['nama'],
    'nama_paket' => $pesanan['nama_paket'],
    'tanggal_acara' => $pesanan['tanggal_acara'],
    'jam' => $pesanan['jam'] !== null ? substr($pesanan['jam'], 0, 5) : null,
    'lokasi' => $pesanan['lokasi'],
    'total_harga' => (int) $pesanan['total_harga'],
    'status' => $pesanan['status'],
    'dibuat_pada' => $pesanan['dibuat_pada'],
    'pembayaran' => $pembayaran,
  ]);
} catch (PDOException $e) {
  error_log('pesanan/status.php: ' . $e->getMessage());
  kirim_error('Gagal mengambil data pesanan', 500);
}
