/* ==========================================================================
   js/util.js   (milik A)
   Letak file : frontend/js/util.js
   Dimuat di  : SEMUA halaman, SETELAH config.js, SEBELUM api.js/ui.js

   TUGAS FILE INI
   Kumpulan fungsi kecil yang dipakai berulang-ulang di banyak halaman:
   format rupiah, format tanggal, format nomor WhatsApp, tautan WhatsApp,
   dan escape HTML (keamanan). File ini TIDAK menyentuh tampilan (DOM) --
   murni mengubah data dari satu bentuk ke bentuk lain. Fungsi yang
   berurusan dengan tampilan (toast, modal) ada di ui.js.

   Semua fungsi di sini ditulis sebagai "function namaFungsi() {}" biasa
   (bukan di dalam objek), supaya langsung bisa dipanggil dari file JS
   manapun yang dimuat setelah file ini, sama seperti komponen.js.
   ========================================================================== */


/**
 * Mengubah angka menjadi format Rupiah. Dipakai di mana saja harga
 * ditampilkan: kartu paket, ringkasan pemesanan, dashboard admin, dll.
 *
 * formatRupiah(4500000)  ->  "Rp4.500.000"
 * formatRupiah(0)        ->  "Rp0"
 */
function formatRupiah(angka) {
  var bilangan = Number(angka) || 0;
  var teks = Math.round(bilangan).toString();

  // Sisipkan titik setiap 3 digit dari belakang, contoh "4500000" -> "4.500.000"
  var hasil = '';
  var hitung = 0;
  for (var i = teks.length - 1; i >= 0; i--) {
    hasil = teks.charAt(i) + hasil;
    hitung++;
    if (hitung % 3 === 0 && i !== 0) {
      hasil = '.' + hasil;
    }
  }

  return 'Rp' + hasil;
}


/**
 * Mengubah tanggal format "YYYY-MM-DD" (format yang dipakai API, lihat
 * API.md bagian 1) menjadi format yang mudah dibaca dalam Bahasa
 * Indonesia.
 *
 * formatTanggal('2026-12-20')             -> "20 Desember 2026"
 * formatTanggal('2026-12-20', 'pendek')    -> "20 Des 2026"
 */
function formatTanggal(tanggalIso, gaya) {
  if (!tanggalIso) { return '-'; }

  var namaBulanPanjang = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  var namaBulanPendek = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  var bagian = tanggalIso.split('-'); // ["2026", "12", "20"]
  if (bagian.length !== 3) { return tanggalIso; } // format tak dikenal, tampilkan asli

  var tahun = bagian[0];
  var bulan = parseInt(bagian[1], 10) - 1; // index array dimulai dari 0
  var tanggal = parseInt(bagian[2], 10);

  var namaBulan = (gaya === 'pendek') ? namaBulanPendek[bulan] : namaBulanPanjang[bulan];
  if (namaBulan === undefined) { return tanggalIso; } // bulan di luar 1-12, data salah

  return tanggal + ' ' + namaBulan + ' ' + tahun;
}


/**
 * Mengubah nomor WhatsApp yang diketik pengguna (biasanya diawali "0")
 * menjadi format internasional yang dibutuhkan tautan wa.me (diawali "62").
 * Juga membuang spasi, tanda hubung, dan tanda kurung.
 *
 * normalisasiNoWa('0812-3456-7890')  -> "6281234567890"
 * normalisasiNoWa('+62 812 3456 7890') -> "6281234567890"
 */
function normalisasiNoWa(noWa) {
  var bersih = String(noWa || '').replace(/[^0-9+]/g, ''); // hanya sisakan angka dan "+"

  if (bersih.charAt(0) === '+') {
    bersih = bersih.substring(1);
  }
  if (bersih.charAt(0) === '0') {
    bersih = '62' + bersih.substring(1);
  }

  return bersih;
}


/**
 * Membuat tautan wa.me lengkap dengan pesan otomatis yang sudah di-encode.
 * Dipakai di halaman Konfirmasi untuk tombol "Hubungi Admin via WhatsApp".
 *
 * linkWhatsApp(KONFIG.NOMOR_WA_ADMIN, 'Halo, saya sudah memesan kode FV-0012')
 * -> "https://wa.me/6281234567890?text=Halo%2C%20saya%20sudah%20memesan..."
 *
 * [TAMBAH] kalau nanti perlu tautan WhatsApp ke NOMOR PELANGGAN (bukan ke
 * admin), dipakai di dashboard admin, fungsi ini tetap bisa dipakai --
 * tinggal kirim no_wa pelanggan sebagai argumen "nomor", lalu normalisasiNoWa()
 * di atas akan merapikan formatnya.
 */
function linkWhatsApp(nomor, pesan) {
  var nomorRapi = normalisasiNoWa(nomor);
  return 'https://wa.me/' + nomorRapi + '?text=' + encodeURIComponent(pesan || '');
}


/**
 * Mengubah karakter berbahaya (<, >, &, ", ') menjadi kode HTML aman,
 * supaya data dari pengguna/API yang dimasukkan lewat innerHTML tidak
 * bisa dipakai untuk menyuntik kode (XSS). WAJIB dipakai setiap kali
 * menaruh teks dari luar (nama pelanggan, catatan, dll) ke dalam HTML
 * lewat innerHTML/template string -- kalau hanya memakai .textContent,
 * fungsi ini tidak diperlukan karena .textContent sudah otomatis aman.
 *
 * Tanda kutip (" dan ') juga di-escape, supaya hasilnya aman dipakai di
 * dalam atribut HTML, contoh: alt="..." atau data-nama="...".
 *
 * escapeHtml('<script>alert(1)</script>')
 * -> "&lt;script&gt;alert(1)&lt;/script&gt;"
 * escapeHtml('Paket "Gold"')  ->  "Paket &quot;Gold&quot;"
 */
function escapeHtml(teks) {
  return String(teks === undefined || teks === null ? '' : teks)
    .replace(/&/g, '&amp;')   // & HARUS paling pertama, supaya hasil escape lain tidak ikut berubah
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/**
 * Teks durasi paket berdasarkan kategorinya, dari KONFIG.DURASI_PER_KATEGORI
 * dan KONFIG.TAMBAH_JAM (config.js). Dipakai modal detail Katalog dan
 * ringkasan paket di Pemesanan.
 *
 * teksDurasiPaket(1)  ->  "8 jam dokumentasi"
 * teksDurasiPaket(3)  ->  "Maksimal 8 jam dokumentasi · tambah jam Rp250.000/jam"
 * teksDurasiPaket(99) ->  ""   (kategori tanpa aturan -> tidak menampilkan apa-apa)
 */
function teksDurasiPaket(kategoriId) {
  var teks = KONFIG.DURASI_PER_KATEGORI[kategoriId] || '';
  if (teks && Number(kategoriId) === KONFIG.TAMBAH_JAM.kategori_id) {
    teks += ' · tambah jam ' + formatRupiah(KONFIG.TAMBAH_JAM.harga) + '/jam';
  }
  return teks;
}


/* [TAMBAH] fungsi bantu lain yang dipakai lebih dari satu halaman,
   taruh di sini -- bukan disalin-tempel ke tiap file JS halaman. */