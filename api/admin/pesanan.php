<?php
/* ==========================================================================
   api/admin/pesanan.php   (milik C)
   Letak file : api/admin/pesanan.php
   Method     : GET
   Login      : Ya (lewat api/config/auth.php)
   Dipakai di : Dashboard (ringkasan + pesanan terbaru), tabel Daftar
                Pesanan, halaman Detail Pesanan

   SATU endpoint, DUA mode, dibedakan oleh ada/tidaknya parameter "id":
   - Tanpa "id"   -> Mode 1: daftar pesanan (bisa difilter ?status=...)
   - Dengan "id"  -> Mode 2: detail satu pesanan (?status= diabaikan)

   Lihat API.md bagian 5.3 untuk kontrak lengkapnya.
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';
require_once __DIR__ . '/../config/auth.php';

cek_login(); // 401 kalau belum login, menghentikan skrip di sini

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  kirim_error('Method tidak diizinkan', 405);
}

/* Daftar status yang sah untuk pesanan. HARUS SAMA dengan yang disepakati
   di API.md bagian 2 ("Nilai yang Disepakati") -- kalau nanti nilainya
   berubah di sana, ubah juga di sini. */
$statusSah = ['menunggu', 'dikonfirmasi', 'selesai', 'batal'];

$id = $_GET['id'] ?? null;

try {
  if ($id !== null && $id !== '') {
    /* ====================== MODE 2: DETAIL PESANAN ====================== */

    if (!ctype_digit((string) $id)) {
      kirim_error('Parameter id harus berupa angka', 400);
    }

    $stmt = $pdo->prepare(
      'SELECT pe.id, pe.kode_pesanan, pe.nama, pe.no_wa, pe.email,
              pe.paket_id, pa.nama AS nama_paket,
              pe.tanggal_acara, pe.jam, pe.lokasi, pe.catatan,
              pe.total_harga, pe.status, pe.dibuat_pada
       FROM pesanan pe
       JOIN paket pa ON pa.id = pe.paket_id
       WHERE pe.id = :id'
    );
    $stmt->execute(['id' => (int) $id]);
    $pesanan = $stmt->fetch();

    if (!$pesanan) {
      kirim_error('Pesanan tidak ditemukan', 404);
    }

    $stmtBayar = $pdo->prepare(
      'SELECT id, metode, jenis, jumlah, bukti_bayar, status, dibayar_pada
       FROM pembayaran
       WHERE pesanan_id = :pesanan_id
       ORDER BY dibayar_pada ASC'
    );
    $stmtBayar->execute(['pesanan_id' => (int) $id]);
    $daftarBayar = $stmtBayar->fetchAll();

    kirim_sukses([
      'id' => (int) $pesanan['id'],
      'kode_pesanan' => $pesanan['kode_pesanan'],
      'nama' => $pesanan['nama'],
      'no_wa' => $pesanan['no_wa'],
      'email' => $pesanan['email'],
      'paket_id' => (int) $pesanan['paket_id'],
      'nama_paket' => $pesanan['nama_paket'],
      'tanggal_acara' => $pesanan['tanggal_acara'],
      'jam' => $pesanan['jam'],
      'lokasi' => $pesanan['lokasi'],
      'catatan' => $pesanan['catatan'],
      'total_harga' => (int) $pesanan['total_harga'],
      'status' => $pesanan['status'],
      'dibuat_pada' => $pesanan['dibuat_pada'],
      'pembayaran' => array_map(function ($bayar) {
        return [
          'id' => (int) $bayar['id'],
          'metode' => $bayar['metode'],
          'jenis' => $bayar['jenis'],
          'jumlah' => (int) $bayar['jumlah'],
          'bukti_bayar' => $bayar['bukti_bayar'],
          'status' => $bayar['status'],
          'dibayar_pada' => $bayar['dibayar_pada'],
        ];
      }, $daftarBayar),
    ]);
  }

  /* ====================== MODE 1: DAFTAR PESANAN ====================== */

  $statusFilter = $_GET['status'] ?? null;
  if ($statusFilter !== null && $statusFilter !== '' && !in_array($statusFilter, $statusSah, true)) {
    kirim_error('Parameter status tidak valid', 400);
  }

  // "ringkasan" SELALU menghitung SEMUA pesanan, tidak terpengaruh filter
  // di atas -- sesuai API.md, dipakai kartu ringkasan di Dashboard.
  $stmtRingkasan = $pdo->query('SELECT status, COUNT(*) AS jumlah FROM pesanan GROUP BY status');
  $baris = $stmtRingkasan->fetchAll();

  // Mulai dari 0 untuk semua status, supaya status yang belum punya
  // pesanan sama sekali tetap muncul sebagai 0 (bukan hilang dari JSON).
  $ringkasan = array_fill_keys($statusSah, 0);
  foreach ($baris as $satu) {
    $ringkasan[$satu['status']] = (int) $satu['jumlah'];
  }

  $sql = 'SELECT pe.id, pe.kode_pesanan, pe.nama, pa.nama AS nama_paket,
                 pe.tanggal_acara, pe.total_harga, pe.status, pe.dibuat_pada
          FROM pesanan pe
          JOIN paket pa ON pa.id = pe.paket_id';

  $parameter = [];
  if ($statusFilter !== null && $statusFilter !== '') {
    $sql .= ' WHERE pe.status = :status';
    $parameter['status'] = $statusFilter;
  }
  $sql .= ' ORDER BY pe.dibuat_pada DESC'; // terbaru lebih dulu

  $stmtDaftar = $pdo->prepare($sql);
  $stmtDaftar->execute($parameter);
  $daftarPesanan = $stmtDaftar->fetchAll();

  $pesanan = array_map(function ($satu) {
    return [
      'id' => (int) $satu['id'],
      'kode_pesanan' => $satu['kode_pesanan'],
      'nama' => $satu['nama'],
      'nama_paket' => $satu['nama_paket'],
      'tanggal_acara' => $satu['tanggal_acara'],
      'total_harga' => (int) $satu['total_harga'],
      'status' => $satu['status'],
      'dibuat_pada' => $satu['dibuat_pada'],
    ];
  }, $daftarPesanan);

  kirim_sukses([
    'ringkasan' => $ringkasan,
    'pesanan' => $pesanan,
  ]);
} catch (PDOException $e) {
  error_log('admin/pesanan.php: ' . $e->getMessage());
  kirim_error('Gagal mengambil data pesanan', 500);
}