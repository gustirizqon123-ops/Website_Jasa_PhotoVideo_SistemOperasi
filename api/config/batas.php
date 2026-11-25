<?php
/* ==========================================================================
   api/config/batas.php   (milik A, ditambahkan 2026-11-25)
   Letak file : api/config/batas.php
   Dipakai di : api/admin/login.php (percobaan login) dan
                api/pesanan/buat.php (jumlah pemesanan)

   TUGAS FILE INI
   Membatasi berapa kali satu alamat IP boleh melakukan sesuatu dalam
   rentang waktu tertentu, supaya:
   - password admin tidak bisa ditebak terus-menerus (brute force)
   - kalender tidak bisa dikunci dengan pesanan palsu (satu tanggal =
     satu pesanan, jadi pesanan palsu = tanggal tertutup untuk pelanggan asli)

   Catatan disimpan di tabel `batas_akses`. Tabel ini DIBUAT OTOMATIS kalau
   belum ada (CREATE TABLE IF NOT EXISTS), jadi database lama di laptop lain
   atau di hosting tidak perlu diimpor ulang.

   IP diambil dari REMOTE_ADDR saja. Header seperti X-Forwarded-For SENGAJA
   tidak dipakai karena bisa dipalsukan pengirim untuk lolos dari batas.
   ========================================================================== */

/* [UBAH] angka batas, kalau dirasa terlalu ketat / longgar */
const BATAS_LOGIN_GAGAL = 5;     // kali salah password ...
const BATAS_LOGIN_MENIT = 15;    // ... dalam sekian menit -> dikunci sekian menit
const BATAS_PESANAN = 3;         // pesanan dari satu IP ...
const BATAS_PESANAN_MENIT = 60;  // ... per sekian menit

function ip_pengunjung(): string {
  return substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'tidak-diketahui'), 0, 45);
}

/* Pengembangan di laptop (XAMPP): pemesanan dari komputer sendiri tidak
   dibatasi, supaya anggota kelompok bisa menguji berkali-kali. Di hosting,
   pengunjung tidak pernah ber-IP 127.0.0.1, jadi batas tetap berlaku. */
function ip_lokal(): bool {
  return in_array(ip_pengunjung(), ['127.0.0.1', '::1'], true);
}

function siapkan_tabel_batas(PDO $pdo): void {
  static $sudah = false;
  if ($sudah) { return; }
  $pdo->exec(
    "CREATE TABLE IF NOT EXISTS batas_akses (
       id int(11) NOT NULL AUTO_INCREMENT,
       jenis varchar(20) NOT NULL,
       ip varchar(45) NOT NULL,
       dibuat_pada datetime NOT NULL DEFAULT current_timestamp(),
       PRIMARY KEY (id),
       KEY jenis_ip_waktu (jenis, ip, dibuat_pada)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
  );
  $sudah = true;
}

/* Berapa kali IP ini tercatat untuk $jenis dalam $menit terakhir. */
function hitung_akses(PDO $pdo, string $jenis, int $menit): int {
  siapkan_tabel_batas($pdo);
  $stmt = $pdo->prepare(
    'SELECT COUNT(*) FROM batas_akses
      WHERE jenis = :jenis AND ip = :ip AND dibuat_pada > (NOW() - INTERVAL :menit MINUTE)'
  );
  $stmt->bindValue('jenis', $jenis);
  $stmt->bindValue('ip', ip_pengunjung());
  $stmt->bindValue('menit', $menit, PDO::PARAM_INT);
  $stmt->execute();
  return (int) $stmt->fetchColumn();
}

/* Mencatat satu akses, sekaligus membuang catatan yang sudah lebih dari
   sehari supaya tabel tidak terus membesar. */
function catat_akses(PDO $pdo, string $jenis): void {
  siapkan_tabel_batas($pdo);
  $pdo->prepare('INSERT INTO batas_akses (jenis, ip) VALUES (:jenis, :ip)')
      ->execute(['jenis' => $jenis, 'ip' => ip_pengunjung()]);
  $pdo->exec('DELETE FROM batas_akses WHERE dibuat_pada < (NOW() - INTERVAL 1 DAY)');
}

/* Menghapus catatan IP ini untuk $jenis (dipakai setelah login berhasil). */
function hapus_akses(PDO $pdo, string $jenis): void {
  siapkan_tabel_batas($pdo);
  $pdo->prepare('DELETE FROM batas_akses WHERE jenis = :jenis AND ip = :ip')
      ->execute(['jenis' => $jenis, 'ip' => ip_pengunjung()]);
}
