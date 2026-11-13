<?php
/* ==========================================================================
   api/config/pesanan.php   (milik C)
   Letak file : api/config/pesanan.php
   Dipakai di : api/admin/ubah-status.php, api/admin/catat-pembayaran.php,
                api/pembayaran/upload.php (minimal_dp(), sisa_tagihan())

   Aturan bisnis pesanan yang dipakai lebih dari satu endpoint admin, supaya
   aturannya ditulis SATU KALI di sini dan tidak berbeda antar endpoint.
   ========================================================================== */

/**
 * KONFIRMASI OTOMATIS (keputusan kelompok 2026-11-12):
 * begitu ada pembayaran TERVERIFIKASI untuk sebuah pesanan, pesanan yang
 * masih "menunggu" otomatis menjadi "dikonfirmasi".
 *
 * - Hanya mengubah pesanan berstatus "menunggu". Pesanan yang sudah
 *   dikonfirmasi/selesai/batal TIDAK disentuh (admin tetap bisa mengubah
 *   status apa pun secara manual lewat dropdown di Detail Pesanan).
 * - Panggil di dalam transaksi yang sama dengan perubahan pembayarannya,
 *   supaya keduanya berhasil atau gagal bersama.
 *
 * @return bool true kalau status pesanan benar-benar berubah
 */
function konfirmasi_otomatis(PDO $pdo, int $pesananId): bool {
  $stmt = $pdo->prepare(
    "UPDATE pesanan SET status = 'dikonfirmasi'
      WHERE id = :id AND status = 'menunggu'"
  );
  $stmt->execute(['id' => $pesananId]);
  return $stmt->rowCount() > 0;
}

/**
 * ATURAN DP: minimal sekian persen dari total_harga.
 * HARUS SAMA dengan KONFIG.DP_MINIMAL_PERSEN di frontend/js/config.js.
 */
const DP_MINIMAL_PERSEN = 50;

/**
 * Jumlah DP minimal untuk sebuah total harga, dibulatkan ke atas ke rupiah
 * terdekat. Contoh: total 6.500.000 -> 3.250.000.
 * Hanya dipakai untuk pembayaran dari pelanggan (upload.php). Pembayaran
 * yang dicatat admin (catat-pembayaran.php) tidak dibatasi aturan ini.
 */
function minimal_dp(int $totalHarga): int {
  return intdiv($totalHarga * DP_MINIMAL_PERSEN + 99, 100);
}

/**
 * Sisa tagihan = total_harga dikurangi semua pembayaran yang sudah
 * TERVERIFIKASI. Pembayaran "menunggu" dan "ditolak" tidak dihitung.
 */
function sisa_tagihan(PDO $pdo, int $pesananId, int $totalHarga): int {
  $stmt = $pdo->prepare(
    "SELECT COALESCE(SUM(jumlah), 0) FROM pembayaran
      WHERE pesanan_id = :id AND status = 'terverifikasi'"
  );
  $stmt->execute(['id' => $pesananId]);
  return max(0, $totalHarga - (int) $stmt->fetchColumn());
}
