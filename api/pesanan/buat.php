<?php
/* ==========================================================================
   api/pesanan/buat.php   (milik B)
   Letak file : api/pesanan/buat.php
   Method     : POST
   Login      : Tidak perlu
   Dipakai di : halaman Pemesanan (frontend/js/pemesanan.js)

   Menyimpan pesanan baru, status awal selalu "menunggu", lalu membuat
   kode_pesanan otomatis format "FV-0012" (4 digit, dari id pesanan).

   Lihat API.md bagian 4.4 untuk kontrak lengkapnya (urutan validasi di
   bawah SENGAJA mengikuti urutan error yang didaftarkan di sana).
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim_error('Method tidak diizinkan', 405);
}

$body = json_decode(file_get_contents('php://input'), true);

$paketId = $body['paket_id'] ?? null;
$nama = trim($body['nama'] ?? '');
$noWa = trim($body['no_wa'] ?? '');
$email = trim($body['email'] ?? '');
$tanggalAcara = trim($body['tanggal_acara'] ?? '');
$jam = trim($body['jam'] ?? '');
$lokasi = trim($body['lokasi'] ?? '');
$catatan = trim($body['catatan'] ?? '');

/* ========================= 1. VALIDASI FIELD WAJIB ========================= */
if (
  $paketId === null || $paketId === '' ||
  $nama === '' || $noWa === '' || $tanggalAcara === '' || $lokasi === ''
) {
  kirim_error('Field wajib belum lengkap', 400);
}

if (mb_strlen($nama) > 100) {
  kirim_error('Field wajib belum lengkap', 400); // nama kepanjangan dianggap input tidak valid
}
if (mb_strlen($lokasi) > 255) {
  kirim_error('Field wajib belum lengkap', 400);
}

/* ========================= 2. FORMAT NOMOR WHATSAPP =========================
   Sesuai API.md bagian 1 ("Format data"): angka saja, diawali 08 atau 62,
   9-15 digit total. */
if (!preg_match('/^(08|62)[0-9]{7,13}$/', $noWa)) {
  kirim_error('Format nomor WhatsApp tidak valid', 400);
}

/* ========================= 3. EMAIL (OPSIONAL) ========================= */
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  kirim_error('Field wajib belum lengkap', 400); // format email salah dianggap input tidak lengkap/valid
}

/* ========================= 4. TANGGAL ACARA ========================= */
$bagianTanggal = explode('-', $tanggalAcara);
$tanggalValid = count($bagianTanggal) === 3
  && checkdate((int) $bagianTanggal[1], (int) $bagianTanggal[2], (int) $bagianTanggal[0]);

if (!$tanggalValid) {
  kirim_error('Field wajib belum lengkap', 400); // format tanggal rusak total
}
if ($tanggalAcara < date('Y-m-d')) {
  kirim_error('Tanggal acara tidak boleh di masa lalu', 400);
}

/* ========================= 5. JAM (OPSIONAL) ========================= */
if ($jam !== '' && !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $jam)) {
  kirim_error('Field wajib belum lengkap', 400);
}

if (!ctype_digit((string) $paketId)) {
  kirim_error('Field wajib belum lengkap', 400);
}

try {
  /* ========================= 6. PAKET HARUS ADA ========================= */
  $stmtPaket = $pdo->prepare('SELECT id, nama, harga FROM paket WHERE id = :id');
  $stmtPaket->execute(['id' => (int) $paketId]);
  $paket = $stmtPaket->fetch();

  if (!$paket) {
    kirim_error('Paket tidak ditemukan', 404);
  }

  /* ========================= 7. BENTROK TANGGAL =========================
     "tanggal dianggap sudah dipesan jika ada pesanan lain dengan
     tanggal_acara yang sama DAN status bukan 'batal'" (API.md 4.4). */
  $stmtBentrok = $pdo->prepare(
    "SELECT id FROM pesanan WHERE tanggal_acara = :tanggal AND status != 'batal'"
  );
  $stmtBentrok->execute(['tanggal' => $tanggalAcara]);

  if ($stmtBentrok->fetch()) {
    kirim_error('Tanggal tersebut sudah dipesan, silakan pilih tanggal lain', 409);
  }

  /* ========================= 8. SIMPAN PESANAN =========================
     total_harga disalin dari harga paket SAAT INI (bukan dikirim
     frontend), sesuai catatan di API.md 4.4. kode_pesanan diisi
     SETELAH insert, karena butuh id yang baru dibuat. */
  $pdo->beginTransaction();

  $stmtInsert = $pdo->prepare(
    'INSERT INTO pesanan
       (kode_pesanan, paket_id, nama, no_wa, email, tanggal_acara, jam, lokasi, catatan, total_harga, status, dibuat_pada)
     VALUES
       (NULL, :paket_id, :nama, :no_wa, :email, :tanggal_acara, :jam, :lokasi, :catatan, :total_harga, "menunggu", NOW())'
  );
  $stmtInsert->execute([
    'paket_id' => (int) $paketId,
    'nama' => $nama,
    'no_wa' => $noWa,
    'email' => $email !== '' ? $email : null,
    'tanggal_acara' => $tanggalAcara,
    'jam' => $jam !== '' ? $jam : null,
    'lokasi' => $lokasi,
    'catatan' => $catatan !== '' ? $catatan : null,
    'total_harga' => (int) $paket['harga'],
  ]);

  $idBaru = (int) $pdo->lastInsertId();
  $kodePesanan = 'FV-' . str_pad($idBaru, 4, '0', STR_PAD_LEFT); // contoh: FV-0012

  $stmtUpdateKode = $pdo->prepare('UPDATE pesanan SET kode_pesanan = :kode WHERE id = :id');
  $stmtUpdateKode->execute(['kode' => $kodePesanan, 'id' => $idBaru]);

  $pdo->commit();

  kirim_sukses([
    'kode_pesanan' => $kodePesanan,
    'nama' => $nama,
    'no_wa' => $noWa,
    'paket_id' => (int) $paketId,
    'nama_paket' => $paket['nama'],
    'tanggal_acara' => $tanggalAcara,
    'jam' => $jam !== '' ? $jam : null,
    'lokasi' => $lokasi,
    'total_harga' => (int) $paket['harga'],
    'status' => 'menunggu',
  ], 'Pesanan berhasil dibuat', 201);
} catch (PDOException $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  error_log('pesanan/buat.php: ' . $e->getMessage());
  kirim_error('Gagal menyimpan pesanan', 500);
}