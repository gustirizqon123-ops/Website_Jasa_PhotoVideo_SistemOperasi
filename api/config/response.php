<?php
header('Content-Type: application/json; charset=utf-8');
header_remove('X-Powered-By'); // jangan umumkan versi PHP (cadangan kalau .htaccess tidak bisa menghapusnya)

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

/**
 * Mengambil satu field teks dari input ($_POST, $_GET, atau body JSON),
 * sudah di-trim. Kosong / tidak ada -> ''.
 *
 * Ditambahkan 2026-11-25: dulu trim($_POST['x']) langsung dipakai, jadi
 * kalau seseorang mengirim field sebagai daftar (x[]=1) atau objek JSON,
 * PHP error dan server membalas 500. Sekarang ditolak rapi dengan 400.
 *
 *   $nama = ambil_teks($body, 'nama');
 *   $aksi = ambil_teks($_POST, 'aksi');
 */
function ambil_teks($sumber, $kunci) {
    if (!is_array($sumber) || !isset($sumber[$kunci])) {
        return '';
    }
    $nilai = $sumber[$kunci];
    if (!is_scalar($nilai)) {
        kirim_error('Field wajib belum lengkap', 400);
    }
    return trim((string) $nilai);
}

/**
 * Memeriksa hasil unggahan satu file dari $_FILES (ditambahkan 2026-11-27).
 * Dipakai upload.php, catat-pembayaran.php, dan paket.php.
 *
 * Dulu semua kegagalan unggah dibalas 500 "Gagal menyimpan file". Padahal
 * penyebab paling sering adalah file melebihi batas upload_max_filesize di
 * php.ini (di hosting sering hanya 2 MB), dan itu kesalahan pengguna (400),
 * bukan kerusakan server.
 *
 *   cek_file_unggahan($_FILES['bukti'], 'Ukuran file maksimal 2 MB');
 */
function cek_file_unggahan($file, $pesanUkuran) {
    // bukti[]=... membuat setiap kolom berisi daftar, bukan satu file
    if (!is_array($file) || !is_int($file['error'] ?? null)) {
        kirim_error('Field wajib belum lengkap', 400);
    }
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) {
        kirim_error($pesanUkuran, 400);
    }
    if ($file['error'] === UPLOAD_ERR_PARTIAL) {
        kirim_error('File tidak terkirim utuh, silakan coba unggah lagi', 400);
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        error_log('Unggah file gagal, kode error PHP: ' . $file['error']);
        kirim_error('Gagal menyimpan file', 500);
    }
}

/**
 * Kalau seluruh kiriman melebihi post_max_size di php.ini, PHP membuang
 * SEMUA isinya: $_POST dan $_FILES kosong, sehingga endpoint keliru
 * membalas "Field wajib belum lengkap". Fungsi ini membalas pesan ukuran
 * yang benar. Panggil sebelum membaca $_POST (ditambahkan 2026-11-27).
 */
function cek_kiriman_terlalu_besar($pesanUkuran) {
    $panjang = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($panjang > 0 && empty($_POST) && empty($_FILES)) {
        $batas = trim((string) ini_get('post_max_size'));
        $angka = (int) $batas;
        $satuan = strtoupper(substr($batas, -1));
        $kali = ['K' => 1024, 'M' => 1024 * 1024, 'G' => 1024 * 1024 * 1024][$satuan] ?? 1;
        if ($angka > 0 && $panjang > $angka * $kali) {
            kirim_error($pesanUkuran, 400);
        }
    }
}