<?php
/* ==========================================================================
   api/pembayaran/upload.php   (milik B)
   Letak file : api/pembayaran/upload.php
   Method     : POST (multipart/form-data -- FormData, BUKAN JSON, karena
                membawa file)
   Login      : Tidak perlu
   Dipakai di : halaman Pembayaran (frontend/js/bayar.js)

   Lihat API.md bagian 4.5 untuk kontrak lengkapnya.
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim_error('Method tidak diizinkan', 405);
}

/* FormData -> field teks biasa ada di $_POST, file ada di $_FILES.
   (Beda dengan buat.php yang bodinya JSON dan dibaca dari php://input.) */
$kodePesanan = trim($_POST['kode_pesanan'] ?? '');
$metode = trim($_POST['metode'] ?? '');
$jenis = trim($_POST['jenis'] ?? '');
$jumlah = $_POST['jumlah'] ?? null;

/* ========================= 1. FIELD WAJIB ========================= */
if ($kodePesanan === '' || $metode === '' || $jenis === '' || $jumlah === null || $jumlah === '') {
  kirim_error('Field wajib belum lengkap', 400);
}
if (!isset($_FILES['bukti']) || $_FILES['bukti']['error'] === UPLOAD_ERR_NO_FILE) {
  kirim_error('Field wajib belum lengkap', 400);
}

/* ========================= 2. METODE DAN JENIS =========================
   Nilai yang sah HARUS SAMA dengan API.md bagian 2. */
$metodeSah = ['transfer_bank', 'ewallet', 'qris'];
$jenisSah = ['dp', 'lunas'];

if (!in_array($metode, $metodeSah, true) || !in_array($jenis, $jenisSah, true)) {
  kirim_error('Metode atau jenis pembayaran tidak valid', 400);
}

/* ========================= 3. JUMLAH ========================= */
if (!is_numeric($jumlah) || (int) $jumlah <= 0) {
  kirim_error('Jumlah pembayaran tidak valid', 400);
}
$jumlah = (int) $jumlah;

try {
  /* ========================= 4. PESANAN HARUS ADA ========================= */
  $stmtPesanan = $pdo->prepare('SELECT id, total_harga FROM pesanan WHERE kode_pesanan = :kode');
  $stmtPesanan->execute(['kode' => $kodePesanan]);
  $pesanan = $stmtPesanan->fetch();

  if (!$pesanan) {
    kirim_error('Pesanan tidak ditemukan', 404);
  }

  if ($jumlah > (int) $pesanan['total_harga']) {
    kirim_error('Jumlah pembayaran tidak valid', 400); // tidak boleh melebihi total_harga (API.md 4.5)
  }

  /* ========================= 5. VALIDASI FILE =========================
     Tipe file dicek dari ISI file (finfo), BUKAN hanya dari ekstensi nama
     file -- supaya file ".jpg" palsu yang isinya bukan gambar tetap ditolak. */
  $file = $_FILES['bukti'];

  if ($file['error'] !== UPLOAD_ERR_OK) {
    kirim_error('Gagal menyimpan file', 500);
  }

  $UKURAN_MAKS = 2 * 1024 * 1024; // 2 MB, HARUS SAMA dengan KONFIG.UKURAN_FILE_MAKS di frontend/js/config.js
  if ($file['size'] > $UKURAN_MAKS) {
    kirim_error('Ukuran file maksimal 2 MB', 400);
  }

  $tipeDiizinkan = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'application/pdf' => 'pdf',
  ];

  $info = new finfo(FILEINFO_MIME_TYPE);
  $tipeAsli = $info->file($file['tmp_name']);

  if (!isset($tipeDiizinkan[$tipeAsli])) {
    kirim_error('Tipe file tidak diizinkan', 400);
  }

  /* ========================= 6. SIMPAN FILE =========================
     Nama file diganti ACAK (bin2hex random_bytes), nama asli dari
     pengguna TIDAK dipakai -- mencegah file berbahaya yang namanya
     disamarkan, dan mencegah tabrakan nama file antar pelanggan. */
  $namaFileBaru = 'bukti_' . bin2hex(random_bytes(5)) . '.' . $tipeDiizinkan[$tipeAsli];
  $folderTujuan = __DIR__ . '/../../uploads/bukti-bayar/';
  $pathTujuan = $folderTujuan . $namaFileBaru;

  if (!is_dir($folderTujuan)) {
    // [UBAH] seharusnya folder ini sudah dibuat manual sejak awal proyek
    // (lihat ROADMAP.md Tahap 0/1), baris ini cuma jaga-jaga.
    mkdir($folderTujuan, 0775, true);
  }

  if (!move_uploaded_file($file['tmp_name'], $pathTujuan)) {
    kirim_error('Gagal menyimpan file', 500);
  }

  /* ========================= 7. SIMPAN KE DATABASE ========================= */
  $stmtInsert = $pdo->prepare(
    'INSERT INTO pembayaran (pesanan_id, metode, jenis, jumlah, bukti_bayar, status, dibayar_pada)
     VALUES (:pesanan_id, :metode, :jenis, :jumlah, :bukti_bayar, "menunggu", NOW())'
  );
  $stmtInsert->execute([
    'pesanan_id' => (int) $pesanan['id'],
    'metode' => $metode,
    'jenis' => $jenis,
    'jumlah' => $jumlah,
    'bukti_bayar' => $namaFileBaru,
  ]);

  kirim_sukses([
    'pembayaran_id' => (int) $pdo->lastInsertId(),
    'kode_pesanan' => $kodePesanan,
    'jenis' => $jenis,
    'jumlah' => $jumlah,
    'status' => 'menunggu',
  ], 'Bukti pembayaran berhasil dikirim', 201);
} catch (PDOException $e) {
  error_log('pembayaran/upload.php: ' . $e->getMessage());
  kirim_error('Gagal menyimpan pembayaran', 500);
}