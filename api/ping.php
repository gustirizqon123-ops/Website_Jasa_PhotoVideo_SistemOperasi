<?php
require_once __DIR__ . '/config/response.php';
require_once __DIR__ . '/config/koneksi.php';

$jumlah = $pdo->query('SELECT COUNT(*) FROM paket')->fetchColumn();
kirim_sukses(['jumlah_paket' => (int) $jumlah], 'API dan database terhubung');