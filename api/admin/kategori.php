<?php
/* ==========================================================================
   api/admin/kategori.php   (milik A)
   Letak file : api/admin/kategori.php
   Method     : POST SAJA (tambah/ubah/hapus lewat satu endpoint, dibedakan
                field "aksi" -- pola sama dengan api/admin/paket.php)
   Login      : WAJIB (cek_login())
   Dipakai di : admin/kategori.html

   Body JSON:
   - aksi          : "tambah" | "ubah" | "hapus"                 (wajib)
   - id            : untuk "ubah" / "hapus"                      (wajib untuk itu)
   - nama_kategori : untuk "tambah" / "ubah", maks. 50 karakter  (wajib untuk itu)

   Respons error:
   - 400 field kosong/tidak valid, 404 kategori tidak ditemukan
   - 409 nama sudah dipakai (tambah/ubah), atau kategori masih punya paket (hapus)
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';
require_once __DIR__ . '/../config/auth.php';

cek_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  kirim_error('Method tidak diizinkan', 405);
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
  kirim_error('Body harus berupa JSON', 400);
}

// ambil_teks() (response.php) menolak field berupa daftar/objek dengan 400.
// Dulu dipakai trim((string) ...), jadi nama_kategori ["x"] tersimpan
// sebagai teks "Array" (perbaikan 2026-11-27).
$aksi = ambil_teks($body, 'aksi');
if (!in_array($aksi, ['tambah', 'ubah', 'hapus'], true)) {
  kirim_error('Aksi tidak valid', 400);
}

$id = $body['id'] ?? null;
$nama = ambil_teks($body, 'nama_kategori');

if ($aksi !== 'tambah' && ($id === null || !is_scalar($id) || !ctype_digit((string) $id))) {
  kirim_error('Field wajib belum lengkap', 400);
}
if ($aksi !== 'hapus') {
  if ($nama === '') {
    kirim_error('Nama kategori wajib diisi', 400);
  }
  if (mb_strlen($nama) > 50) {
    kirim_error('Nama kategori maksimal 50 karakter', 400);
  }
}

try {
  if ($aksi === 'tambah') {
    // Collation utf8mb4_unicode_ci tidak membedakan huruf besar/kecil,
    // jadi "wedding" dan "Wedding" dianggap sama.
    $cek = $pdo->prepare('SELECT id FROM kategori WHERE nama_kategori = :nama');
    $cek->execute(['nama' => $nama]);
    if ($cek->fetch()) {
      kirim_error('Nama kategori sudah dipakai', 409);
    }

    $pdo->prepare('INSERT INTO kategori (nama_kategori) VALUES (:nama)')->execute(['nama' => $nama]);
    kirim_sukses([
      'id' => (int) $pdo->lastInsertId(),
      'nama_kategori' => $nama,
    ], 'Kategori berhasil ditambahkan', 201);
  }

  // "ubah" dan "hapus": kategorinya harus ada
  $stmt = $pdo->prepare('SELECT id FROM kategori WHERE id = :id');
  $stmt->execute(['id' => (int) $id]);
  if (!$stmt->fetch()) {
    kirim_error('Kategori tidak ditemukan', 404);
  }

  if ($aksi === 'ubah') {
    $cek = $pdo->prepare('SELECT id FROM kategori WHERE nama_kategori = :nama AND id <> :id');
    $cek->execute(['nama' => $nama, 'id' => (int) $id]);
    if ($cek->fetch()) {
      kirim_error('Nama kategori sudah dipakai', 409);
    }

    $pdo->prepare('UPDATE kategori SET nama_kategori = :nama WHERE id = :id')
        ->execute(['nama' => $nama, 'id' => (int) $id]);
    kirim_sukses([
      'id' => (int) $id,
      'nama_kategori' => $nama,
    ], 'Kategori berhasil diubah', 200);
  }

  // aksi "hapus": ditolak kalau masih ada paket di dalamnya (juga dijaga
  // foreign key paket_ibfk_1), supaya paket tidak "yatim" tanpa kategori.
  $hitung = $pdo->prepare('SELECT COUNT(*) FROM paket WHERE kategori_id = :id');
  $hitung->execute(['id' => (int) $id]);
  $jumlahPaket = (int) $hitung->fetchColumn();
  if ($jumlahPaket > 0) {
    kirim_error('Kategori tidak dapat dihapus karena masih memiliki ' . $jumlahPaket . ' paket. Hapus atau pindahkan paketnya dulu.', 409);
  }

  $pdo->prepare('DELETE FROM kategori WHERE id = :id')->execute(['id' => (int) $id]);
  kirim_sukses(null, 'Kategori berhasil dihapus', 200);

} catch (PDOException $e) {
  error_log('admin/kategori.php: ' . $e->getMessage());
  kirim_error('Gagal memproses data kategori', 500);
}
