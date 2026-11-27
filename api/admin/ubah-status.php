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

  // Satu transaksi: status pembayaran dan (kalau perlu) status pesanan
  // berubah bersama, atau tidak sama sekali. FOR UPDATE mengunci baris
  // selama transaksi, supaya dua klik/dua admin bersamaan tidak sama-sama
  // lolos pengecekan di bawah.
  $pdo->beginTransaction();

  // Kolom tambahan dipakai pengecekan di bawah (bentrok tanggal untuk
  // pesanan; jumlah dan pesanan_id untuk pembayaran).
  $kolom = ($tabel === 'pembayaran') ? 'id, pesanan_id, jumlah, status' : 'id, tanggal_acara, status';
  $cek = $pdo->prepare("SELECT {$kolom} FROM {$tabel} WHERE id = :id FOR UPDATE");
  $cek->execute(['id' => (int) $id]);
  $baris = $cek->fetch();

  if (!$baris) {
    $pdo->rollBack();
    kirim_error('Data tidak ditemukan', 404);
  }

  /* BENTROK TANGGAL (perbaikan 2026-11-27): pesanan "batal" tidak mengunci
     tanggalnya, jadi tanggal itu bisa dipesan orang lain. Kalau pesanan
     batal diaktifkan lagi, pastikan tanggalnya belum dipakai pesanan aktif
     lain -- aturan yang sama dengan pesanan/buat.php. */
  if ($target === 'pesanan' && $baris['status'] === 'batal' && $status !== 'batal') {
    $stmtBentrok = $pdo->prepare(
      "SELECT kode_pesanan FROM pesanan
        WHERE tanggal_acara = :tanggal AND status != 'batal' AND id != :id
        LIMIT 1"
    );
    $stmtBentrok->execute(['tanggal' => $baris['tanggal_acara'], 'id' => (int) $id]);
    $bentrok = $stmtBentrok->fetch();
    if ($bentrok) {
      $pdo->rollBack();
      kirim_error('Tanggal acara pesanan ini sudah dipakai pesanan ' . $bentrok['kode_pesanan'] . '. Pesanan tidak bisa diaktifkan lagi', 409);
    }
  }

  /* TIDAK BOLEH MELEBIHI TOTAL (perbaikan 2026-11-27): sisa tagihan hanya
     menghitung pembayaran terverifikasi, jadi bukti "menunggu" yang
     diverifikasi belakangan (misalnya setelah admin mencatat pelunasan)
     bisa membuat total pembayaran melebihi harga. Pembayaran yang sudah
     terverifikasi tidak dicek ulang (sudah termasuk dalam hitungan). */
  if ($target === 'pembayaran' && $status === 'terverifikasi' && $baris['status'] !== 'terverifikasi') {
    $stmtPesanan = $pdo->prepare('SELECT total_harga FROM pesanan WHERE id = :id FOR UPDATE');
    $stmtPesanan->execute(['id' => (int) $baris['pesanan_id']]);
    $sisa = sisa_tagihan($pdo, (int) $baris['pesanan_id'], (int) $stmtPesanan->fetchColumn());
    if ((int) $baris['jumlah'] > $sisa) {
      $pdo->rollBack();
      kirim_error('Jumlah pembayaran ini melebihi sisa tagihan (Rp' . number_format($sisa, 0, ',', '.') . '). Tolak pembayaran ini, atau periksa pembayaran yang sudah tercatat', 409);
    }
  }

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