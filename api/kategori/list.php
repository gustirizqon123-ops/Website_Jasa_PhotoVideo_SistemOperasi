<?php
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/koneksi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    kirim_error('Method tidak diizinkan', 405);
}

$stmt = $pdo->query('SELECT id, nama_kategori FROM kategori ORDER BY id');

$data = array_map(function ($baris) {
    return [
        'id'            => (int) $baris['id'],
        'nama_kategori' => $baris['nama_kategori'],
    ];
}, $stmt->fetchAll());

kirim_sukses($data);