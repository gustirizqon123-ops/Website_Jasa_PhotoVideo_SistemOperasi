/* ==========================================================================
   js/komponen.js  (milik A)
   Tugas file ini:
   1. Memuat navbar dan footer dari folder komponen/ ke setiap halaman
   2. Menandai menu yang sedang aktif
   3. Mengatur tombol menu di mobile
   4. Mengganti gambar yang filenya belum ada dengan kotak PENANDA bertuliskan
      nama file yang harus diisi (pengingat, lihat tandaiGambarKosong())

   CARA PAKAI di halaman HTML:
   <body data-halaman="beranda">          <- nama halaman, cocok dengan data-menu di navbar.html
     <div data-muat="komponen/navbar.html"></div>
     ... isi halaman ...
     <div data-muat="komponen/footer.html"></div>
     <script src="js/komponen.js" defer></script>

   PENTING: file ini memakai fetch(), jadi halaman HARUS dibuka lewat server
   (http://localhost/...), bukan dengan klik dua kali file HTML (file:///...).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  muatSemuaKomponen();
  tandaiGambarKosong();
});

/* Mencari semua elemen yang punya atribut data-muat, lalu mengisinya */
function muatSemuaKomponen() {
  document.querySelectorAll('[data-muat]').forEach(function (wadah) {
    var alamat = wadah.getAttribute('data-muat');

    fetch(alamat)
      .then(function (respons) {
        if (!respons.ok) { throw new Error('Gagal memuat ' + alamat); }
        return respons.text();
      })
      .then(function (html) {
        wadah.innerHTML = html;
        /* Setelah navbar masuk ke halaman, aktifkan menu dan tombol mobile */
        if (alamat.indexOf('navbar') !== -1) { siapkanNavbar(); }
      })
      .catch(function (error) {
        console.error(error);
        wadah.innerHTML =
          '<p style="padding:16px;color:#C64444;font-size:14px;">' +
          'Komponen gagal dimuat. Buka halaman lewat http://localhost/... (bukan file://).</p>';
      });
  });
}

/* Menandai menu aktif dan mengatur menu mobile */
function siapkanNavbar() {
  /* Menu aktif: cocokkan <body data-halaman="..."> dengan <a data-menu="..."> */
  var halaman = document.body.getAttribute('data-halaman');
  document.querySelectorAll('.navbar-menu a[data-menu]').forEach(function (tautan) {
    if (tautan.getAttribute('data-menu') === halaman) {
      tautan.classList.add('aktif');
    }
  });

  /* Tombol tiga garis di mobile */
  var tombol = document.getElementById('navbarToggle');
  var menu = document.getElementById('navbarMenu');
  if (tombol && menu) {
    tombol.addEventListener('click', function () {
      var terbuka = menu.classList.toggle('terbuka');
      tombol.setAttribute('aria-expanded', terbuka ? 'true' : 'false');
    });
  }
}

/* PENANDA GAMBAR YANG BELUM DIISI
   Gambar yang filenya belum ada (contoh: 12 foto Beranda di assets/img/)
   diganti kotak bergaris bertuliskan nama file yang harus disimpan, supaya
   mudah tahu foto mana yang masih kurang dan di mana letaknya. Kotak ini
   otomatis hilang sendiri begitu filenya disimpan dengan nama yang sama.

   <img> yang SENGAJA belum punya src (gambar paket di modal Katalog dan
   ringkasan Pemesanan, src-nya baru diisi JS setelah data API datang)
   TIDAK disentuh. Dulu gambar seperti ini ikut disembunyikan permanen
   sehingga foto paket tidak pernah tampil di modal dan di Pemesanan.

   [UBAH] Kalau semua foto sudah diisi, fungsi ini boleh tetap dibiarkan:
   ia hanya bekerja untuk gambar yang gagal dimuat. */
function tandaiGambarKosong() {
  document.querySelectorAll('img').forEach(function (gambar) {
    gambar.addEventListener('error', function () { pasangPenandaGambar(gambar); });

    // Sudah selesai dimuat TAPI gagal (error terjadi sebelum listener di atas terpasang)
    if (gambar.getAttribute('src') && gambar.complete && gambar.naturalWidth === 0) {
      pasangPenandaGambar(gambar);
    }
  });
}

function pasangPenandaGambar(gambar) {
  var alamat = gambar.getAttribute('src') || '';
  if (!alamat || gambar.hasAttribute('data-gambar-kosong')) { return; } // cegah dobel

  // Alamat relatif dari halaman di frontend/, contoh "assets/img/hero.jpg"
  // -> ditulis lengkap "frontend/assets/img/hero.jpg" supaya jelas letak foldernya
  var lokasi = alamat.indexOf('../') === 0 ? alamat.replace(/^(\.\.\/)+/, '') : 'frontend/' + alamat;

  // Escape sendiri (bukan escapeHtml dari util.js) karena komponen.js juga
  // dipakai halaman yang tidak memuat util.js, contoh komponen.html
  var lokasiAman = lokasi.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // SVG tanpa width/height: ikut melebar mengisi ukuran <img> dari CSS halaman.
  // Garis tepi setebal 4: setengahnya terpotong tepi gambar, jadi tampak 2px.
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="100%" height="100%" fill="#EDF5EF" stroke="#7FA890" stroke-width="4" stroke-dasharray="10 7"/>' +
      '<text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" fill="#2F5D4A">' +
        '<tspan x="50%" dy="-0.4em" font-size="15" font-weight="700">Gambar belum diisi</tspan>' +
        '<tspan x="50%" dy="1.6em" font-size="13">' + lokasiAman + '</tspan>' +
      '</text>' +
    '</svg>';

  gambar.setAttribute('data-gambar-kosong', lokasi);
  gambar.title = 'Simpan foto di ' + lokasi;
  gambar.style.objectFit = 'fill';
  gambar.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}