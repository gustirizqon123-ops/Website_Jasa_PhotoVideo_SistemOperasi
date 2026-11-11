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
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';
require_once __DIR__ . '/../config/auth.php';

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

  $cek = $pdo->prepare("SELECT id FROM {$tabel} WHERE id = :id");
  $cek->execute(['id' => (int) $id]);

  if (!$cek->fetch()) {
    kirim_error('Data tidak ditemukan', 404);
  }

  $update = $pdo->prepare("UPDATE {$tabel} SET status = :status WHERE id = :id");
  $update->execute([
    'status' => $status,
    'id' => (int) $id,
  ]);

  kirim_sukses([
    'target' => $target,
    'id' => (int) $id,
    'status' => $status,
  ], 'Status berhasil diperbarui');
} catch (PDOException $e) {
  error_log('admin/ubah-status.php: ' . $e->getMessage());
  kirim_error('Gagal memperbarui status', 500);
}