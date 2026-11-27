<?php
/* ==========================================================================
   api/admin/catat-pembayaran.php   (milik C)
   Letak file : api/admin/catat-pembayaran.php
   Method     : POST (multipart/form-data -- FormData, karena bisa membawa file)
   Login      : WAJIB (cek_login())
   Dipakai di : form "Catat Pembayaran" di halaman Detail Pesanan
                (frontend/js/admin/pesanan-detail.js)

   KENAPA ENDPOINT INI ADA (keputusan kelompok 2026-11-12, pilihan "b"):
   halaman Pembayaran pelanggan hanya bisa dipakai tepat setelah memesan
   (datanya dari sessionStorage). Jadi PELUNASAN setelah DP, dan bukti
   ULANG setelah bukti pertama ditolak, dikirim pelanggan lewat WhatsApp,
   lalu ADMIN yang mencatatnya di sini.

   Karena dicatat admin setelah memeriksa buktinya sendiri, pembayaran
   langsung berstatus "terverifikasi", dan pesanan "menunggu" otomatis
   menjadi "dikonfirmasi" (lihat konfirmasi_otomatis() di config/pesanan.php).

   Lihat API.md bagian 5.6 untuk kontrak lengkapnya.
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/pesanan.php';

cek_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim_error('Method tidak diizinkan', 405);
}

cek_kiriman_terlalu_besar('Ukuran file maksimal 2 MB');

$pesananId = $_POST['pesanan_id'] ?? '';
$metode = ambil_teks($_POST, 'metode');
$jenis = ambil_teks($_POST, 'jenis');
$jumlah = $_POST['jumlah'] ?? '';

/* ========================= 1. VALIDASI FIELD ========================= */
if ($pesananId === '' || $metode === '' || $jenis === '' || $jumlah === '') {
  kirim_error('Field wajib belum lengkap', 400);
}
if (!ctype_digit((string) $pesananId)) {
  kirim_error('Field wajib belum lengkap', 400);
}

/* Nilai yang sah HARUS SAMA dengan API.md bagian 2 (dan upload.php). */
if (!in_array($metode, ['transfer_bank', 'ewallet', 'qris'], true) || !in_array($jenis, ['dp', 'lunas'], true)) {
  kirim_error('Metode atau jenis pembayaran tidak valid', 400);
}
if (!ctype_digit((string) $jumlah) || (int) $jumlah <= 0) {
  kirim_error('Jumlah pembayaran tidak valid', 400);
}
$pesananId = (int) $pesananId;
$jumlah = (int) $jumlah;

/* ========================= 2. VALIDASI FILE (OPSIONAL) =========================
   Bukti boleh tidak dilampirkan (misalnya admin sudah mengecek mutasi
   rekening langsung). Kalau dilampirkan, aturannya SAMA dengan upload.php:
   dicek dari ISI file, maks. 2 MB, JPG/PNG/PDF. */
$adaBukti = isset($_FILES['bukti']) && $_FILES['bukti']['error'] !== UPLOAD_ERR_NO_FILE;
$ekstensiBukti = null;

if ($adaBukti) {
  $file = $_FILES['bukti'];
  cek_file_unggahan($file, 'Ukuran file maksimal 2 MB'); // response.php
  if ($file['size'] > 2 * 1024 * 1024) {
    kirim_error('Ukuran file maksimal 2 MB', 400);
  }
  $tipeDiizinkan = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'application/pdf' => 'pdf'];
  $tipeAsli = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
  if (!isset($tipeDiizinkan[$tipeAsli])) {
    kirim_error('Tipe file tidak diizinkan', 400);
  }
  $ekstensiBukti = $tipeDiizinkan[$tipeAsli];
}

$pathBukti = null;

try {
  $pdo->beginTransaction();

  /* ========================= 3. PESANAN =========================
     FOR UPDATE: kunci baris pesanan selama transaksi, supaya dua admin
     (atau dua klik) yang mencatat bersamaan tidak sama-sama lolos cek
     sisa tagihan. */
  $stmt = $pdo->prepare('SELECT id, kode_pesanan, total_harga, status FROM pesanan WHERE id = :id FOR UPDATE');
  $stmt->execute(['id' => $pesananId]);
  $pesanan = $stmt->fetch();

  if (!$pesanan) {
    $pdo->rollBack();
    kirim_error('Pesanan tidak ditemukan', 404);
  }
  if ($pesanan['status'] === 'batal') {
    $pdo->rollBack();
    kirim_error('Pesanan sudah dibatalkan, pembayaran tidak bisa dicatat', 409);
  }

  /* ========================= 4. SISA TAGIHAN ========================= */
  $sisa = sisa_tagihan($pdo, $pesananId, (int) $pesanan['total_harga']);

  if ($sisa === 0) {
    $pdo->rollBack();
    kirim_error('Pesanan ini sudah lunas', 409);
  }
  if ($jumlah > $sisa) {
    $pdo->rollBack();
    kirim_error('Jumlah melebihi sisa tagihan (Rp' . number_format($sisa, 0, ',', '.') . ')', 400);
  }

  /* Bukti dari pelanggan yang belum diperiksa harus diputuskan dulu
     (perbaikan 2026-11-27). Kalau tidak, pembayaran yang sama bisa tercatat
     dua kali: sekali di sini, sekali lagi saat bukti itu diverifikasi. */
  $stmtMenunggu = $pdo->prepare("SELECT id FROM pembayaran WHERE pesanan_id = :id AND status = 'menunggu' LIMIT 1");
  $stmtMenunggu->execute(['id' => $pesananId]);
  if ($stmtMenunggu->fetch()) {
    $pdo->rollBack();
    kirim_error('Masih ada bukti pembayaran berstatus Menunggu. Verifikasi atau tolak bukti itu dulu', 409);
  }

  /* ========================= 5. SIMPAN FILE ========================= */
  $namaFileBukti = null;
  if ($adaBukti) {
    $namaFileBukti = 'bukti_' . bin2hex(random_bytes(5)) . '.' . $ekstensiBukti;
    $folder = __DIR__ . '/../../uploads/bukti-bayar/';
    if (!is_dir($folder)) {
      mkdir($folder, 0775, true);
    }
    $pathBukti = $folder . $namaFileBukti;
    if (!move_uploaded_file($_FILES['bukti']['tmp_name'], $pathBukti)) {
      $pathBukti = null;
      $pdo->rollBack();
      kirim_error('Gagal menyimpan file', 500);
    }
  }

  /* ========================= 6. SIMPAN PEMBAYARAN ========================= */
  $stmtInsert = $pdo->prepare(
    "INSERT INTO pembayaran (pesanan_id, metode, jenis, jumlah, bukti_bayar, status, dibayar_pada)
     VALUES (:pesanan_id, :metode, :jenis, :jumlah, :bukti_bayar, 'terverifikasi', NOW())"
  );
  $stmtInsert->execute([
    'pesanan_id' => $pesananId,
    'metode' => $metode,
    'jenis' => $jenis,
    'jumlah' => $jumlah,
    'bukti_bayar' => $namaFileBukti,
  ]);
  $idPembayaran = (int) $pdo->lastInsertId();

  /* ========================= 7. KONFIRMASI OTOMATIS ========================= */
  $statusBerubah = konfirmasi_otomatis($pdo, $pesananId);

  $pdo->commit();

  kirim_sukses([
    'pembayaran_id' => $idPembayaran,
    'pesanan_id' => $pesananId,
    'kode_pesanan' => $pesanan['kode_pesanan'],
    'jenis' => $jenis,
    'jumlah' => $jumlah,
    'status' => 'terverifikasi',
    'bukti_bayar' => $namaFileBukti,
    'sisa_tagihan' => $sisa - $jumlah,
    'status_pesanan' => $statusBerubah ? 'dikonfirmasi' : $pesanan['status'],
    'status_pesanan_berubah' => $statusBerubah,
  ], 'Pembayaran berhasil dicatat', 201);
} catch (PDOException $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  // File sudah tersimpan tapi data gagal masuk -> hapus supaya tidak jadi file yatim
  if ($pathBukti !== null && is_file($pathBukti)) {
    @unlink($pathBukti);
  }
  error_log('admin/catat-pembayaran.php: ' . $e->getMessage());
  kirim_error('Gagal mencatat pembayaran', 500);
}
