-- ==========================================================================
-- database/data_demo.sql
-- Data DEMO pesanan + pembayaran untuk presentasi (Dashboard, Daftar
-- Pesanan, Detail Pesanan terlihat "hidup" dengan semua status).
--
-- CARA PAKAI: impor file ini SETELAH db_foto_video.sql (phpMyAdmin ->
-- pilih database db_foto_video -> Import), atau lewat terminal:
--   C:\xampp\mysql\bin\mysql.exe -u root db_foto_video < database/data_demo.sql
--
-- AMAN DIJALANKAN ULANG: semua pesanan demo memakai email berakhiran
-- "@contoh.id". Bagian 0 menghapus data demo lama dulu, jadi tidak dobel.
-- Pesanan asli (email lain) TIDAK disentuh.
--
-- kode_pesanan dibuat dengan cara yang sama seperti api/pesanan/buat.php
-- (FV- + id 4 digit), jadi tidak bentrok dengan id yang sudah ada.
--
-- Berkas bukti bayar (bukti_demo_XX.jpg) harus ada di uploads/bukti-bayar/
-- supaya tombol "Lihat bukti" di admin tidak 404.
--
-- Ringkasan status:
--   menunggu     : 3 pesanan (1 belum bayar, 1 DP menunggu, 1 bukti ditolak lalu kirim ulang)
--   dikonfirmasi : 2 pesanan
--   selesai      : 2 pesanan
--   batal        : 1 pesanan
-- Nomor WhatsApp memakai pola 0812000000xx (fiktif).
-- ==========================================================================

-- 0. Hapus data demo lama ---------------------------------------------------
DELETE b FROM pembayaran b
  JOIN pesanan p ON p.id = b.pesanan_id
 WHERE p.email LIKE '%@contoh.id';
DELETE FROM pesanan WHERE email LIKE '%@contoh.id';

-- Kembalikan penghitung id ke (id terbesar yang tersisa + 1), supaya kode
-- pesanan demo berurutan setelah pesanan asli terakhir dan tidak "loncat"
-- tiap kali file ini dijalankan ulang. Nilai 1 otomatis dinaikkan MySQL.
ALTER TABLE pembayaran AUTO_INCREMENT = 1;
ALTER TABLE pesanan AUTO_INCREMENT = 1;

START TRANSACTION;


-- 1. MENUNGGU: DP sudah dikirim, belum diverifikasi admin --------------------
INSERT INTO pesanan (paket_id, nama, no_wa, email, tanggal_acara, jam, lokasi, catatan, total_harga, status, dibuat_pada)
VALUES (2, 'Rina Amalia', '081200000002', 'rina.amalia@contoh.id', '2026-12-20', '09:00:00',
        'Gedung Sultan Suriansyah, Banjarmasin', 'Akad pagi, resepsi siang. Tema rustic hijau.', 2500000, 'menunggu', '2026-11-10 19:24:00');
SET @id = LAST_INSERT_ID();
UPDATE pesanan SET kode_pesanan = CONCAT('FV-', LPAD(@id, 4, '0')) WHERE id = @id;
INSERT INTO pembayaran (pesanan_id, metode, jenis, jumlah, bukti_bayar, status, dibayar_pada)
VALUES (@id, 'transfer_bank', 'dp', 750000, 'bukti_demo_01.jpg', 'menunggu', '2026-11-10 19:41:00');


-- 2. MENUNGGU: pesanan baru, belum ada pembayaran ----------------------------
INSERT INTO pesanan (paket_id, nama, no_wa, email, tanggal_acara, jam, lokasi, catatan, total_harga, status, dibuat_pada)
VALUES (4, 'Ahmad Fauzi', '081200000003', 'ahmad.fauzi@contoh.id', '2026-11-28', '08:00:00',
        'Auditorium ULM, Banjarmasin', NULL, 500000, 'menunggu', '2026-11-12 08:15:00');
SET @id = LAST_INSERT_ID();
UPDATE pesanan SET kode_pesanan = CONCAT('FV-', LPAD(@id, 4, '0')) WHERE id = @id;


-- 3. MENUNGGU: bukti pertama ditolak (buram), pelanggan kirim ulang ----------
INSERT INTO pesanan (paket_id, nama, no_wa, email, tanggal_acara, jam, lokasi, catatan, total_harga, status, dibuat_pada)
VALUES (2, 'Dewi Lestari', '081200000004', 'dewi.lestari@contoh.id', '2027-01-24', '10:00:00',
        'Rumah mempelai, Jl. A. Yani Km 6, Banjarmasin', 'Mohon ada sesi foto keluarga besar.', 2500000, 'menunggu', '2026-11-08 13:02:00');
SET @id = LAST_INSERT_ID();
UPDATE pesanan SET kode_pesanan = CONCAT('FV-', LPAD(@id, 4, '0')) WHERE id = @id;
INSERT INTO pembayaran (pesanan_id, metode, jenis, jumlah, bukti_bayar, status, dibayar_pada) VALUES
  (@id, 'ewallet', 'dp', 750000, 'bukti_demo_02.jpg', 'ditolak',  '2026-11-08 13:20:00'),
  (@id, 'ewallet', 'dp', 750000, 'bukti_demo_03.jpg', 'menunggu', '2026-11-09 07:45:00');


-- 4. DIKONFIRMASI: DP sudah terverifikasi -----------------------------------
INSERT INTO pesanan (paket_id, nama, no_wa, email, tanggal_acara, jam, lokasi, catatan, total_harga, status, dibuat_pada)
VALUES (3, 'Siti Rahmah', '081200000005', 'siti.rahmah@contoh.id', '2027-01-10', '08:30:00',
        'Hotel Galaxy, Banjarmasin', 'Album hardcover warna putih.', 3500000, 'dikonfirmasi', '2026-10-30 20:11:00');
SET @id = LAST_INSERT_ID();
UPDATE pesanan SET kode_pesanan = CONCAT('FV-', LPAD(@id, 4, '0')) WHERE id = @id;
INSERT INTO pembayaran (pesanan_id, metode, jenis, jumlah, bukti_bayar, status, dibayar_pada)
VALUES (@id, 'transfer_bank', 'dp', 1050000, 'bukti_demo_04.jpg', 'terverifikasi', '2026-10-30 20:35:00');


-- 5. DIKONFIRMASI: langsung lunas --------------------------------------------
INSERT INTO pesanan (paket_id, nama, no_wa, email, tanggal_acara, jam, lokasi, catatan, total_harga, status, dibuat_pada)
VALUES (6, 'Budi Santoso', '081200000006', 'budi.santoso@contoh.id', '2026-12-05', '13:00:00',
        'Aula Kantor Gubernur Kalsel, Banjarbaru', 'Acara seminar tahunan, perlu highlight untuk media sosial.', 3500000, 'dikonfirmasi', '2026-11-03 10:05:00');
SET @id = LAST_INSERT_ID();
UPDATE pesanan SET kode_pesanan = CONCAT('FV-', LPAD(@id, 4, '0')) WHERE id = @id;
INSERT INTO pembayaran (pesanan_id, metode, jenis, jumlah, bukti_bayar, status, dibayar_pada)
VALUES (@id, 'qris', 'lunas', 3500000, 'bukti_demo_05.jpg', 'terverifikasi', '2026-11-03 10:30:00');


-- 6. SELESAI: DP lalu pelunasan, keduanya terverifikasi ----------------------
INSERT INTO pesanan (paket_id, nama, no_wa, email, tanggal_acara, jam, lokasi, catatan, total_harga, status, dibuat_pada)
VALUES (5, 'Nadia Putri', '081200000007', 'nadia.putri@contoh.id', '2026-10-18', '07:30:00',
        'Kampus UIN Antasari, Banjarmasin', 'Grup 5 orang.', 900000, 'selesai', '2026-10-01 16:40:00');
SET @id = LAST_INSERT_ID();
UPDATE pesanan SET kode_pesanan = CONCAT('FV-', LPAD(@id, 4, '0')) WHERE id = @id;
INSERT INTO pembayaran (pesanan_id, metode, jenis, jumlah, bukti_bayar, status, dibayar_pada) VALUES
  (@id, 'transfer_bank', 'dp',    270000, 'bukti_demo_06.jpg', 'terverifikasi', '2026-10-01 17:02:00'),
  (@id, 'transfer_bank', 'lunas', 630000, 'bukti_demo_07.jpg', 'terverifikasi', '2026-10-18 15:10:00');


-- 7. SELESAI: lunas di awal ---------------------------------------------------
INSERT INTO pesanan (paket_id, nama, no_wa, email, tanggal_acara, jam, lokasi, catatan, total_harga, status, dibuat_pada)
VALUES (1, 'Fitri Handayani', '081200000008', 'fitri.handayani@contoh.id', '2026-09-27', '09:00:00',
        'Masjid Raya Sabilal Muhtadin, Banjarmasin', NULL, 1000000, 'selesai', '2026-09-05 11:18:00');
SET @id = LAST_INSERT_ID();
UPDATE pesanan SET kode_pesanan = CONCAT('FV-', LPAD(@id, 4, '0')) WHERE id = @id;
INSERT INTO pembayaran (pesanan_id, metode, jenis, jumlah, bukti_bayar, status, dibayar_pada)
VALUES (@id, 'ewallet', 'lunas', 1000000, 'bukti_demo_08.jpg', 'terverifikasi', '2026-09-05 11:40:00');


-- 8. BATAL: bukti DP ditolak, pelanggan membatalkan --------------------------
INSERT INTO pesanan (paket_id, nama, no_wa, email, tanggal_acara, jam, lokasi, catatan, total_harga, status, dibuat_pada)
VALUES (4, 'Rizky Pratama', '081200000009', 'rizky.pratama@contoh.id', '2026-12-12', '10:00:00',
        'Politeknik Negeri Banjarmasin', 'Batal karena jadwal wisuda diundur.', 500000, 'batal', '2026-11-05 21:00:00');
SET @id = LAST_INSERT_ID();
UPDATE pesanan SET kode_pesanan = CONCAT('FV-', LPAD(@id, 4, '0')) WHERE id = @id;
INSERT INTO pembayaran (pesanan_id, metode, jenis, jumlah, bukti_bayar, status, dibayar_pada)
VALUES (@id, 'transfer_bank', 'dp', 150000, 'bukti_demo_09.jpg', 'ditolak', '2026-11-05 21:15:00');

COMMIT;
