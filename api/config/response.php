<?php
header('Content-Type: application/json; charset=utf-8');

/* ==========================================================================
   SEMBUNYIKAN ERROR PHP DARI RESPONS (Tahap 0.5 hosting, 2026-11-16)
   File ini di-require PALING PERTAMA oleh semua endpoint, jadi pengaturan
   di bawah berlaku untuk seluruh API, di XAMPP maupun di hosting.

   Tanpa ini (XAMPP: display_errors=On), peringatan/error PHP ikut tercetak
   ke respons: format JSON rusak (frontend menampilkan "Tidak bisa terhubung
   ke server") dan lokasi file di server ikut terlihat orang lain.

   Error TETAP dicatat ke log, tidak hilang:
   - XAMPP  : C:\xampp\apache\logs\error.log (cari "PHP Warning" / "Exception")
   - Hosting: menu "Error Logs" di panel hosting
   ========================================================================== */
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

/* Exception yang lolos dari try/catch di endpoint -> catat ke log, lalu kirim
   respons error JSON biasa (bukan halaman error PHP). */
set_exception_handler(function ($e) {
    error_log('Exception tak tertangani: ' . $e->getMessage() . ' di ' . $e->getFile() . ':' . $e->getLine());
    kirim_error('Terjadi kesalahan di server', 500);
});

/* Error fatal (misalnya fungsi tidak ada) tidak bisa ditangkap try/catch.
   Fungsi ini berjalan saat skrip berhenti: kalau penyebabnya error fatal,
   kirim JSON error supaya frontend tetap menerima format yang dikenalnya. */
register_shutdown_function(function () {
    $error = error_get_last();
    $fatal = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
    if ($error === null || !in_array($error['type'], $fatal, true)) {
        return;
    }
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(
        ['status' => 'error', 'message' => 'Terjadi kesalahan di server', 'data' => null],
        JSON_UNESCAPED_UNICODE
    );
});

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