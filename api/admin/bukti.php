<?php
/* ==========================================================================
   api/admin/bukti.php   (milik C)
   Letak file : api/admin/bukti.php
   Method     : GET
   Login      : WAJIB (cek_login())
   Dipakai di : tautan "Lihat bukti" di Detail Pesanan
                (frontend/js/admin/pesanan-detail.js)

   KENAPA ENDPOINT INI ADA (2026-11-16):
   Bukti bayar berisi data pribadi pelanggan. Folder uploads/bukti-bayar/
   sekarang diblokir untuk akses langsung lewat browser (lihat .htaccess di
   folder itu), jadi file bukti HANYA bisa dilihat lewat endpoint ini, yang
   mengecek login admin lebih dulu.

   Parameter (query, WAJIB): ?file=NAMA_FILE
     contoh: api/admin/bukti.php?file=bukti_9bafacfcae.jpg

   Hasil: isi file gambar/PDF-nya langsung (BUKAN JSON), supaya bisa dibuka
   di tab baru. Kalau gagal, respons error JSON seperti endpoint lain.

   Lihat API.md bagian 5.7.
   ========================================================================== */

require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/auth.php';

cek_login();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  kirim_error('Method tidak diizinkan', 405);
}

$namaFile = (string) ($_GET['file'] ?? '');

/* Nama file WAJIB berpola nama yang dibuat sistem: "bukti_" + huruf/angka/_
   + ekstensi yang diizinkan. Ini sekaligus mencegah alamat seperti
   "../../api/config/koneksi.php" (path traversal), karena "/" dan "."
   di tengah nama tidak lolos pola ini. */
if (!preg_match('/^bukti_[A-Za-z0-9_]+\.(jpg|jpeg|png|pdf)$/', $namaFile)) {
  kirim_error('Nama file tidak valid', 400);
}

$path = __DIR__ . '/../../uploads/bukti-bayar/' . $namaFile;

if (!is_file($path)) {
  kirim_error('File bukti tidak ditemukan', 404);
}

// Tipe file dibaca dari ISI file, sama seperti saat diunggah (upload.php)
$tipeDiizinkan = ['image/jpeg', 'image/png', 'application/pdf'];
$tipe = (new finfo(FILEINFO_MIME_TYPE))->file($path);

if (!in_array($tipe, $tipeDiizinkan, true)) {
  kirim_error('Tipe file tidak diizinkan', 400);
}

/* Kirim file apa adanya. header() di bawah MENGGANTI Content-Type JSON yang
   dipasang response.php (belum ada output apa pun, jadi masih bisa diganti). */
header('Content-Type: ' . $tipe);
header('Content-Length: ' . filesize($path));
header('Content-Disposition: inline; filename="' . $namaFile . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store'); // jangan disimpan di cache bersama
readfile($path);
exit;
