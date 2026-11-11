<?php
/* ==========================================================================
   api/admin/paket.php   (milik A)
   Letak file : api/admin/paket.php
   Method     : POST SAJA (semua aksi -- tambah/ubah/hapus -- lewat POST,
                dibedakan field "aksi". Alasan: PHP tidak mem-parsing
                $_FILES untuk method PUT/DELETE secara native, dan paket
                punya upload gambar, jadi disamakan semua pakai POST
                multipart/form-data seperti api/pembayaran/upload.php)
   Login      : WAJIB (cek_login())
   Dipakai di : admin/paket.html (aksi=hapus) dan admin/paket-form.html
                (aksi=tambah / aksi=ubah)

   [ASUMSI] Belum ada bagian API.md yang saya lihat untuk endpoint ini,
   jadi kontrak di bawah ini saya buat KONSISTEN dengan pola admin lain
   (pesanan.php, ubah-status.php). Kalau API.md punya aturan berbeda
   (nama field, kode status error, dll), beri tahu saya supaya disesuaikan.

   Body (semua lewat $_POST, FormData):
   - aksi         : "tambah" | "ubah" | "hapus"            (wajib)
   - id           : hanya untuk aksi "ubah" / "hapus"      (wajib untuk itu)
   - kategori_id  : untuk aksi "tambah" / "ubah"           (wajib)
   - nama         : untuk aksi "tambah" / "ubah"           (wajib)
   - deskripsi    : untuk aksi "tambah" / "ubah"           (wajib, dipisah koma)
   - harga        : untuk aksi "tambah" / "ubah"           (wajib, angka > 0)
   - gambar ($_FILES) : wajib untuk "tambah", OPSIONAL untuk "ubah"
                         (kalau "ubah" tidak kirim gambar baru, gambar lama dipakai lagi)
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';
require_once __DIR__ . '/../config/auth.php';

cek_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim_error('Method tidak diizinkan', 405);
}

$aksi = trim($_POST['aksi'] ?? '');
$aksiSah = ['tambah', 'ubah', 'hapus'];

if (!in_array($aksi, $aksiSah, true)) {
  kirim_error('Aksi tidak valid', 400);
}

$FOLDER_GAMBAR = __DIR__ . '/../../frontend/uploads/paket/';
$TIPE_GAMBAR_DIIZINKAN = [
  'image/jpeg' => 'jpg',
  'image/png' => 'png',
];
$UKURAN_GAMBAR_MAKS = 2 * 1024 * 1024; // 2 MB, samakan dengan KONFIG di frontend kalau ada aturan khusus gambar paket

/* ==========================================================================
   FUNGSI BANTU: validasi + simpan file gambar baru.
   Dipakai oleh aksi "tambah" (wajib) dan aksi "ubah" (opsional).
   Mengirim error langsung (kirim_error menghentikan skrip) kalau tidak sah.
   ========================================================================== */
function simpanGambarBaru(array $file, string $folderTujuan, array $tipeDiizinkan, int $ukuranMaks): string {
  if ($file['error'] !== UPLOAD_ERR_OK) {
    kirim_error('Gagal menyimpan gambar', 500);
  }
  if ($file['size'] > $ukuranMaks) {
    kirim_error('Ukuran gambar maksimal 2 MB', 400);
  }

  $info = new finfo(FILEINFO_MIME_TYPE);
  $tipeAsli = $info->file($file['tmp_name']);

  if (!isset($tipeDiizinkan[$tipeAsli])) {
    kirim_error('Tipe gambar tidak diizinkan, gunakan JPG atau PNG', 400);
  }

  $namaFileBaru = 'paket_' . bin2hex(random_bytes(5)) . '.' . $tipeDiizinkan[$tipeAsli];

  if (!is_dir($folderTujuan)) {
    mkdir($folderTujuan, 0775, true);
  }

  if (!move_uploaded_file($file['tmp_name'], $folderTujuan . $namaFileBaru)) {
    kirim_error('Gagal menyimpan gambar', 500);
  }

  return $namaFileBaru;
}

/* Hapus file gambar lama dari disk. Dibungkus try supaya kalau filenya
   sudah tidak ada (hilang manual, dll) tidak membuat seluruh request gagal. */
function hapusGambarLama(?string $namaFile, string $folder): void {
  $path = $folder . $namaFile;
  if ($namaFile && is_file($path)) {
    @unlink($path);
  }
}

try {
  /* ======================================================================
     AKSI: TAMBAH PAKET BARU
     ====================================================================== */
  if ($aksi === 'tambah') {
    $kategoriId = $_POST['kategori_id'] ?? null;
    $nama = trim($_POST['nama'] ?? '');
    $deskripsi = trim($_POST['deskripsi'] ?? '');
    $harga = $_POST['harga'] ?? null;

    if ($kategoriId === null || $kategoriId === '' || $nama === '' || $deskripsi === '' || $harga === null || $harga === '') {
      kirim_error('Field wajib belum lengkap', 400);
    }
    if (!ctype_digit((string) $kategoriId) || !is_numeric($harga) || (int) $harga <= 0) {
      kirim_error('Field wajib belum lengkap', 400);
    }
    if (!isset($_FILES['gambar']) || $_FILES['gambar']['error'] === UPLOAD_ERR_NO_FILE) {
      kirim_error('Gambar paket wajib diunggah', 400);
    }

    $stmtKategori = $pdo->prepare('SELECT id FROM kategori WHERE id = :id');
    $stmtKategori->execute(['id' => (int) $kategoriId]);
    if (!$stmtKategori->fetch()) {
      kirim_error('Kategori tidak ditemukan', 404);
    }

    $namaFileGambar = simpanGambarBaru($_FILES['gambar'], $FOLDER_GAMBAR, $TIPE_GAMBAR_DIIZINKAN, $UKURAN_GAMBAR_MAKS);

    $stmtInsert = $pdo->prepare(
      'INSERT INTO paket (kategori_id, nama, deskripsi, harga, gambar)
       VALUES (:kategori_id, :nama, :deskripsi, :harga, :gambar)'
    );
    $stmtInsert->execute([
      'kategori_id' => (int) $kategoriId,
      'nama' => $nama,
      'deskripsi' => $deskripsi,
      'harga' => (int) $harga,
      'gambar' => $namaFileGambar,
    ]);

    kirim_sukses([
      'id' => (int) $pdo->lastInsertId(),
      'kategori_id' => (int) $kategoriId,
      'nama' => $nama,
      'deskripsi' => $deskripsi,
      'harga' => (int) $harga,
      'gambar' => $namaFileGambar,
    ], 'Paket berhasil ditambahkan', 201);
  }

  /* ======================================================================
     AKSI: UBAH PAKET
     ====================================================================== */
  if ($aksi === 'ubah') {
    $id = $_POST['id'] ?? null;
    $kategoriId = $_POST['kategori_id'] ?? null;
    $nama = trim($_POST['nama'] ?? '');
    $deskripsi = trim($_POST['deskripsi'] ?? '');
    $harga = $_POST['harga'] ?? null;

    if ($id === null || $id === '' || !ctype_digit((string) $id)) {
      kirim_error('Field wajib belum lengkap', 400);
    }
    if ($kategoriId === null || $kategoriId === '' || $nama === '' || $deskripsi === '' || $harga === null || $harga === '') {
      kirim_error('Field wajib belum lengkap', 400);
    }
    if (!ctype_digit((string) $kategoriId) || !is_numeric($harga) || (int) $harga <= 0) {
      kirim_error('Field wajib belum lengkap', 400);
    }

    $stmtPaket = $pdo->prepare('SELECT id, gambar FROM paket WHERE id = :id');
    $stmtPaket->execute(['id' => (int) $id]);
    $paketLama = $stmtPaket->fetch();

    if (!$paketLama) {
      kirim_error('Paket tidak ditemukan', 404);
    }

    $stmtKategori = $pdo->prepare('SELECT id FROM kategori WHERE id = :id');
    $stmtKategori->execute(['id' => (int) $kategoriId]);
    if (!$stmtKategori->fetch()) {
      kirim_error('Kategori tidak ditemukan', 404);
    }

    // Gambar baru OPSIONAL -- kalau tidak dikirim, pakai nama file yang lama.
    $namaFileGambar = $paketLama['gambar'];
    $adaGambarBaru = isset($_FILES['gambar']) && $_FILES['gambar']['error'] !== UPLOAD_ERR_NO_FILE;

    if ($adaGambarBaru) {
      $namaFileGambar = simpanGambarBaru($_FILES['gambar'], $FOLDER_GAMBAR, $TIPE_GAMBAR_DIIZINKAN, $UKURAN_GAMBAR_MAKS);
    }

    $stmtUpdate = $pdo->prepare(
      'UPDATE paket SET kategori_id = :kategori_id, nama = :nama, deskripsi = :deskripsi,
       harga = :harga, gambar = :gambar WHERE id = :id'
    );
    $stmtUpdate->execute([
      'kategori_id' => (int) $kategoriId,
      'nama' => $nama,
      'deskripsi' => $deskripsi,
      'harga' => (int) $harga,
      'gambar' => $namaFileGambar,
      'id' => (int) $id,
    ]);

    // Gambar lama dihapus dari disk SETELAH update berhasil, dan HANYA
    // kalau memang ada gambar baru yang menggantikannya.
    if ($adaGambarBaru) {
      hapusGambarLama($paketLama['gambar'], $FOLDER_GAMBAR);
    }

    kirim_sukses([
      'id' => (int) $id,
      'kategori_id' => (int) $kategoriId,
      'nama' => $nama,
      'deskripsi' => $deskripsi,
      'harga' => (int) $harga,
      'gambar' => $namaFileGambar,
    ], 'Paket berhasil diubah', 200);
  }

  /* ======================================================================
     AKSI: HAPUS PAKET
     [ASUMSI] error 409 muncul kalau paket ini masih direferensikan oleh
     SETIDAKNYA SATU baris di tabel pesanan (apa pun statusnya) -- supaya
     riwayat pesanan lama tidak kehilangan rujukan paketnya. Kalau aturan
     yang disepakati kelompok berbeda (misalnya hanya pesanan yang belum
     selesai yang menghalangi hapus), beri tahu saya untuk disesuaikan.
     ====================================================================== */
  if ($aksi === 'hapus') {
    $id = $_POST['id'] ?? null;

    if ($id === null || $id === '' || !ctype_digit((string) $id)) {
      kirim_error('Field wajib belum lengkap', 400);
    }

    $stmtPaket = $pdo->prepare('SELECT id, gambar FROM paket WHERE id = :id');
    $stmtPaket->execute(['id' => (int) $id]);
    $paket = $stmtPaket->fetch();

    if (!$paket) {
      kirim_error('Paket tidak ditemukan', 404);
    }

    $stmtCekPesanan = $pdo->prepare('SELECT id FROM pesanan WHERE paket_id = :paket_id LIMIT 1');
    $stmtCekPesanan->execute(['paket_id' => (int) $id]);

    if ($stmtCekPesanan->fetch()) {
      kirim_error('Paket tidak dapat dihapus karena masih memiliki pesanan terkait', 409);
    }

    $stmtHapus = $pdo->prepare('DELETE FROM paket WHERE id = :id');
    $stmtHapus->execute(['id' => (int) $id]);

    hapusGambarLama($paket['gambar'], $FOLDER_GAMBAR);

    kirim_sukses(null, 'Paket berhasil dihapus', 200);
  }
} catch (PDOException $e) {
  error_log('admin/paket.php: ' . $e->getMessage());
  kirim_error('Gagal memproses data paket', 500);
}