/* ==========================================================================
   js/api.js   (milik A)
   Letak file : frontend/js/api.js
   Dimuat di  : SEMUA halaman yang memanggil API, SETELAH config.js dan
                util.js, SEBELUM ui.js dan file JS halaman
                (katalog.js, pemesanan.js, bayar.js, login.js, dst)

   TUGAS FILE INI
   Satu pintu untuk SEMUA panggilan ke backend (api/...), supaya file JS
   halaman tidak menulis ulang fetch() + pengecekan status.success setiap
   kali. Mengikuti format respons baku di API.md bagian "Aturan Umum":
     { "status": "success" | "error", "message": "...", "data": {...}|null }

   CARA PAKAI di file JS halaman, contoh katalog.js:

     panggilApi('../api/paket/list.php')
       .then(function (data) { ...pakai data... })
       .catch(function (error) { tampilToast(error.message, 'error'); });

   Untuk POST data biasa (JSON):

     panggilApi('../api/pesanan/buat.php', {
       method: 'POST',
       body: { paket_id: 1, nama: 'Budi', ... }   // objek biasa, JANGAN di-JSON.stringify sendiri
     })

   Untuk POST dengan file (FormData), contoh di halaman Pembayaran:

     var formData = new FormData(document.getElementById('formPembayaran'));
     panggilApi('../api/pembayaran/upload.php', {
       method: 'POST',
       body: formData   // kirim FormData LANGSUNG, jangan dibungkus objek
     })

   PENTING: path yang dikirim ("../api/...") HARUS relatif terhadap
   LOKASI FILE HTML yang memanggilnya, bukan terhadap file JS ini.
   - Halaman di frontend/ (index.html, katalog.html, pemesanan.html, dst)
     -> pakai "../api/..."
   - Halaman di frontend/admin/ (dashboard.html, login.html, dst)
     -> pakai "../../api/..."
   Ini sama seperti contoh kode di API.md bagian 6, sengaja tidak dibuatkan
   alamat dasar (base URL) otomatis supaya tetap sederhana.
   ========================================================================== */


/**
 * Memanggil satu endpoint API dan mengurus bagian yang berulang:
 * - Mengirim body sebagai JSON (kecuali body berupa FormData, dikirim apa adanya)
 * - Membaca respons sebagai JSON
 * - Melempar Error kalau status bukan "success", memakai pesan dari API
 * - Mengarahkan ke halaman login kalau server membalas 401 DAN halaman
 *   ini adalah halaman admin (supaya panggilApi aman dipakai di halaman
 *   publik juga, yang tidak punya login.html admin)
 *
 * @param {string} path   alamat endpoint, relatif dari file HTML pemanggil
 * @param {object} opsi   { method, body, header } -- semuanya opsional
 * @returns {Promise<any>} isi "data" dari respons kalau sukses
 */
function panggilApi(path, opsi) {
  opsi = opsi || {};

  var pengaturanFetch = {
    method: opsi.method || 'GET',
    headers: opsi.header || {}
  };

  if (opsi.body !== undefined) {
    if (opsi.body instanceof FormData) {
      // FormData (unggah file): kirim apa adanya, JANGAN set Content-Type,
      // browser yang mengisi otomatis beserta "boundary" yang benar.
      pengaturanFetch.body = opsi.body;
    } else {
      // Objek biasa: ubah ke JSON, beri tahu server lewat header.
      pengaturanFetch.headers['Content-Type'] = 'application/json';
      pengaturanFetch.body = JSON.stringify(opsi.body);
    }
  }

  return fetch(path, pengaturanFetch)
    .then(function (respons) {
      /* Sesi admin habis (lihat auth.php) -> arahkan ke login, TAPI hanya
         kalau memang sedang di halaman admin. Halaman publik (katalog,
         pemesanan) tidak pernah menerima 401, jadi aman untuk semua. */
      if (respons.status === 401 && window.location.pathname.indexOf('/admin/') !== -1) {
        window.location.href = 'login.html'; // [UBAH] sesuaikan kalau struktur folder admin berbeda
      }
      return respons.json();
    })
    .then(function (hasil) {
      if (hasil.status !== 'success') {
        // Pesan error dari server (lihat kolom "message") -- inilah yang
        // sebaiknya ditampilkan ke pengguna lewat tampilToast(), BUKAN
        // pesan teknis dari JavaScript.
        throw new Error(hasil.message || 'Terjadi kesalahan, silakan coba lagi');
      }
      return hasil.data;
    })
    .catch(function (error) {
      /* Kalau error BUKAN dari throw di atas (API.md), kemungkinan koneksi
         putus atau server tidak merespons sama sekali -- respons.json()
         gagal karena bukan JSON (misalnya halaman error PHP biasa). */
      if (error instanceof Error && error.message) {
        throw error;
      }
      throw new Error('Tidak bisa terhubung ke server. Periksa koneksi atau coba lagi.');
    });
}


/* [TAMBAH] kalau nanti butuh fungsi khusus (misal unduh file, atau
   endpoint yang butuh header tambahan di luar pola di atas), tambahkan
   fungsi baru di sini -- jangan menulis fetch() langsung di file JS
   halaman supaya format error tetap konsisten di semua tempat. */