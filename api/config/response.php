<?php
header('Content-Type: application/json; charset=utf-8');

function kirim_sukses($data = null, $pesan = 'OK', $kode = 200) {
    http_response_code($kode);
    echo json_encode(
        ['status' => 'success', 'message' => $pesan, 'data' => $data],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

function kirim_error($pesan, $kode = 400) {
    http_response_code($kode);
    echo json_encode(
        ['status' => 'error', 'message' => $pesan, 'data' => null],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}