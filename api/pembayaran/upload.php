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
require_once __DIR__ . '/../config/pesanan.php'; // minimal_dp(), sisa_tagihan()

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim_error('Method tidak diizinkan', 405);
}

cek_kiriman_terlalu_besar('Ukuran file maksimal 2 MB');

/* FormData -> field teks biasa ada di $_POST, file ada di $_FILES.
   (Beda dengan buat.php yang bodinya JSON dan dibaca dari php://input.) */
$kodePesanan = ambil_teks($_POST, 'kode_pesanan');
$metode = ambil_teks($_POST, 'metode');
$jenis = ambil_teks($_POST, 'jenis');
$jumlah = $_POST['jumlah'] ?? null;
$noWa = ambil_teks($_POST, 'no_wa'); // harus sama dengan nomor WhatsApp saat memesan

/* ========================= 1. FIELD WAJIB ========================= */
if ($kodePesanan === '' || $metode === '' || $jenis === '' || $jumlah === null || $jumlah === '') {
  kirim_error('Field wajib belum lengkap', 400);
}
if (!isset($_FILES['bukti']) || $_FILES['bukti']['error'] === UPLOAD_ERR_NO_FILE) {
  kirim_error('Field wajib belum lengkap', 400);
}

/* ========================= 2. METODE DAN JENIS =========================
   Nilai yang sah HARUS SAMA dengan API.md bagian 2. */
$metodeSah = ['qris']; // pelanggan hanya membayar lewat QRIS (keputusan 2026-11-14). Admin tetap bisa mencatat metode lain lewat catat-pembayaran.php
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
  $stmtPesanan = $pdo->prepare('SELECT id, no_wa, total_harga, status FROM pesanan WHERE kode_pesanan = :kode');
  $stmtPesanan->execute(['kode' => $kodePesanan]);
  $pesanan = $stmtPesanan->fetch();

  /* Kode pesanan berurutan (FV-0001, FV-0002, ...) jadi mudah ditebak.
     Perbaikan keamanan 2026-11-25: nomor WhatsApp pemesan juga harus cocok,
     supaya orang lain tidak bisa mengirim bukti ke pesanan yang bukan
     miliknya. 08xx dan 62xx dianggap sama. Kalau tidak cocok, pesannya
     SAMA dengan kode yang tidak ada, supaya tidak membocorkan kode mana
     yang benar-benar terpakai. */
  $samakanWa = function ($nomor) {
    $angka = preg_replace('/\D/', '', (string) $nomor);
    return strpos($angka, '62') === 0 ? '0' . substr($angka, 2) : $angka;
  };
  if (!$pesanan || $noWa === '' || $samakanWa($noWa) !== $samakanWa($pesanan['no_wa'])) {
    kirim_error('Pesanan tidak ditemukan', 404);
  }
  if ($pesanan['status'] === 'batal') {
    kirim_error('Pesanan sudah dibatalkan, pembayaran tidak bisa dikirim', 409);
  }

  /* ========================= 4b. ATURAN JUMLAH DP / LUNAS =========================
     Sisa tagihan = total dikurangi pembayaran yang sudah TERVERIFIKASI
     (lihat config/pesanan.php). Untuk pesanan baru, sisa = total_harga.
     - lunas : jumlah HARUS sama dengan sisa tagihan
     - dp    : minimal DP_MINIMAL_PERSEN% dari total, dan kurang dari sisa
               (kalau sama dengan sisa, itu namanya lunas) */
  $totalHarga = (int) $pesanan['total_harga'];
  $sisa = sisa_tagihan($pdo, (int) $pesanan['id'], $totalHarga);

  if ($sisa === 0) {
    kirim_error('Pesanan ini sudah lunas', 409);
  }

  /* Bukti sebelumnya belum diperiksa admin -> jangan terima bukti kedua
     (perbaikan 2026-11-25), supaya admin tidak melihat dua pembayaran
     "Menunggu" untuk satu pesanan. Setelah admin menolak/memverifikasi,
     pelanggan bebas mengirim lagi. */
  $stmtMenunggu = $pdo->prepare("SELECT id FROM pembayaran WHERE pesanan_id = :id AND status = 'menunggu' LIMIT 1");
  $stmtMenunggu->execute(['id' => (int) $pesanan['id']]);
  if ($stmtMenunggu->fetch()) {
    kirim_error('Bukti pembayaran sebelumnya masih diperiksa admin. Mohon tunggu konfirmasi, atau hubungi admin lewat WhatsApp', 409);
  }

  $formatRp = function ($angka) { return 'Rp' . number_format($angka, 0, ',', '.'); };

  if ($jenis === 'lunas' && $jumlah !== $sisa) {
    kirim_error('Pembayaran lunas harus sebesar ' . $formatRp($sisa), 400);
  }
  if ($jenis === 'dp') {
    $dpMinimal = minimal_dp($totalHarga);
    if ($jumlah >= $sisa) {
      kirim_error('Jumlah DP harus kurang dari ' . $formatRp($sisa) . '. Pilih Lunas untuk membayar penuh', 400);
    }
    if ($jumlah < $dpMinimal) {
      kirim_error('DP minimal ' . DP_MINIMAL_PERSEN . '% dari total (' . $formatRp($dpMinimal) . ')', 400);
    }
  }

  /* ========================= 5. VALIDASI FILE =========================
     Tipe file dicek dari ISI file (finfo), BUKAN hanya dari ekstensi nama
     file -- supaya file ".jpg" palsu yang isinya bukan gambar tetap ditolak. */
  $file = $_FILES['bukti'];
  cek_file_unggahan($file, 'Ukuran file maksimal 2 MB'); // response.php

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
  $fileTersimpan = $pathTujuan; // dihapus lagi di catch kalau INSERT gagal

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
  // File sudah tersimpan tapi data gagal masuk -> hapus supaya tidak jadi
  // file yatim tanpa baris pembayaran (perbaikan 2026-11-27)
  if (isset($fileTersimpan) && is_file($fileTersimpan)) {
    @unlink($fileTersimpan);
  }
  error_log('pembayaran/upload.php: ' . $e->getMessage());
  kirim_error('Gagal menyimpan pembayaran', 500);
}