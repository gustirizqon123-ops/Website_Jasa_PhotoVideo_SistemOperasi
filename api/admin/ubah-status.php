<?php
/* ==========================================================================
   api/admin/ubah-status.php   (milik C)
   Letak file : api/admin/ubah-status.php
   Method     : POST
   Login      : Ya (lewat api/config/auth.php)
   Dipakai di : dropdown "Ubah Status" di halaman Detail Pesanan, tombol
                verifikasi/tolak bukti bayar

   Mengubah status PESANAN atau PEMBAYARAN -- dibedakan field "target"
   di body, BUKAN dua endpoint terpisah (lihat API.md bagian 5.4).

   KONFIRMASI OTOMATIS: kalau pembayaran diubah menjadi "terverifikasi",
   pesanan pemiliknya yang masih "menunggu" ikut menjadi "dikonfirmasi"
   (lihat konfirmasi_otomatis() di config/pesanan.php).
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/pesanan.php';

cek_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim_error('Method tidak diizinkan', 405);
}

/* Status yang sah PER TARGET. HARUS SAMA dengan API.md bagian 2. */
$statusSahPerTarget = [
  'pesanan' => ['menunggu', 'dikonfirmasi', 'selesai', 'batal'],
  'pembayaran' => ['menunggu', 'terverifikasi', 'ditolak'],
];

$body = json_decode(file_get_contents('php://input'), true);

$target = $body['target'] ?? null;
$id = $body['id'] ?? null;
$status = $body['status'] ?? null;

if (!in_array($target, ['pesanan', 'pembayaran'], true)) {
  kirim_error('Target tidak valid', 400);
}

if ($id === null || !ctype_digit((string) $id)) {
  kirim_error('Field wajib belum lengkap', 400);
}

if ($status === null || !in_array($status, $statusSahPerTarget[$target], true)) {
  kirim_error('Status tidak valid untuk target ini', 400);
}

try {
  // Nama tabel diambil LANGSUNG dari daftar putih di atas ($target hanya
  // bisa "pesanan" atau "pembayaran", sudah divalidasi di atas) -- BUKAN
  // dari input mentah -- supaya aman dari SQL injection lewat nama tabel.
  $tabel = $target;

  // Kolom pesanan_id hanya ada di tabel pembayaran -- dipakai untuk
  // konfirmasi otomatis di bawah.
  $kolom = ($tabel === 'pembayaran') ? 'id, pesanan_id' : 'id';
  $cek = $pdo->prepare("SELECT {$kolom} FROM {$tabel} WHERE id = :id");
  $cek->execute(['id' => (int) $id]);
  $baris = $cek->fetch();

  if (!$baris) {
    kirim_error('Data tidak ditemukan', 404);
  }

  // Satu transaksi: status pembayaran dan (kalau perlu) status pesanan
  // berubah bersama, atau tidak sama sekali.
  $pdo->beginTransaction();

  $update = $pdo->prepare("UPDATE {$tabel} SET status = :status WHERE id = :id");
  $update->execute([
    'status' => $status,
    'id' => (int) $id,
  ]);

  $pesananIkutBerubah = false;
  if ($target === 'pembayaran' && $status === 'terverifikasi') {
    $pesananIkutBerubah = konfirmasi_otomatis($pdo, (int) $baris['pesanan_id']);
  }

  $pdo->commit();

  $data = [
    'target' => $target,
    'id' => (int) $id,
    'status' => $status,
  ];
  if ($target === 'pembayaran') {
    // true kalau pesanan "menunggu" barusan otomatis menjadi "dikonfirmasi"
    $data['status_pesanan_berubah'] = $pesananIkutBerubah;
  }

  kirim_sukses($data, 'Status berhasil diperbarui');
} catch (PDOException $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  error_log('admin/ubah-status.php: ' . $e->getMessage());
  kirim_error('Gagal memperbarui status', 500);
}