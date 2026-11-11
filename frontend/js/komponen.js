/* ==========================================================================
   js/komponen.js  (milik A)
   Tugas file ini:
   1. Memuat navbar dan footer dari folder komponen/ ke setiap halaman
   2. Menandai menu yang sedang aktif
   3. Mengatur tombol menu di mobile
   4. Menyembunyikan gambar yang gagal dimuat (supaya tidak tampil ikon rusak)

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
  sembunyikanGambarRusak();
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

/* Gambar yang belum ada filenya disembunyikan, jadi yang terlihat hanya warna latar kartu */
function sembunyikanGambarRusak() {
  document.querySelectorAll('img').forEach(function (gambar) {
    function sembunyikan() { gambar.style.visibility = 'hidden'; }
    if (gambar.complete && gambar.naturalWidth === 0) { sembunyikan(); }
    gambar.addEventListener('error', sembunyikan);
  });
}