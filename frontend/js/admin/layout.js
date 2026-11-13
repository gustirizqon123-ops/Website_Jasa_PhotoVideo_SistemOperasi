/* ==========================================================================
   js/admin/layout.js   (milik C)
   Letak file : frontend/js/admin/layout.js
   Dimuat di  : SEMUA halaman admin KECUALI login.html (dashboard, pesanan,
                pesanan-detail, paket, paket-form)

   TUGAS FILE INI (meniru pola js/komponen.js milik A, tapi khusus admin):
   1. Memuat komponen/admin-sidebar.html ke dalam halaman
   2. Menandai menu sidebar yang sedang aktif, sesuai data-halaman di <body>
   3. Mengatur tombol hamburger (sidebar tersembunyi di layar sempit)
   4. Menyiapkan tombol "Keluar" supaya memanggil api/admin/logout.php

   CARA PAKAI di halaman HTML, contoh frontend/admin/dashboard.html:

     <body data-halaman="admin-dashboard">
       <div class="admin-tata-letak">
         <div data-muat="../komponen/admin-sidebar.html"></div>
         <main class="admin-konten"> ... isi halaman ... </main>
       </div>
       <script src="../js/admin/layout.js" defer></script>
     </body>

   [UBAH] atribut data-halaman WAJIB diawali "admin-", contoh:
     admin-dashboard, admin-pesanan, admin-paket
   supaya fungsi di bawah bisa mencocokkannya dengan data-menu="dashboard"
   dkk di admin-sidebar.html (awalan "admin-" dibuang sebelum dicocokkan).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  muatSidebarAdmin();
  isiNamaAdmin();
});

/* Mengisi nama dan huruf avatar di header (.admin-header-admin) dari nama
   yang disimpan login.js di sessionStorage saat login. Kalau tidak ada
   (misal halaman admin dibuka di tab baru), tulisan bawaan "Administrator"
   di HTML tetap dipakai. */
function isiNamaAdmin() {
  var nama = null;
  try {
    nama = sessionStorage.getItem('namaAdmin');
  } catch (e) {
    return;
  }
  if (!nama) { return; }

  document.querySelectorAll('.admin-header-admin').forEach(function (wadah) {
    var avatar = wadah.querySelector('.admin-avatar');
    var teksNama = wadah.querySelector('span');
    if (avatar) { avatar.textContent = nama.trim().charAt(0).toUpperCase(); }
    if (teksNama) { teksNama.textContent = nama; } // textContent -> aman tanpa escapeHtml
  });
}

/* Mencari elemen data-muat yang menunjuk ke admin-sidebar.html, lalu mengisinya.
   Dipisah dari js/komponen.js milik A supaya logika admin tidak bercampur
   dengan logika halaman publik (navbar/footer). */
function muatSidebarAdmin() {
  var wadah = document.querySelector('[data-muat*="admin-sidebar"]');

  if (!wadah) {
    /* Halaman ini mungkin tidak pakai sidebar (contoh: login.html).
       Bukan error, cukup berhenti di sini. */
    return;
  }

  var alamat = wadah.getAttribute('data-muat');

  fetch(alamat)
    .then(function (respons) {
      if (!respons.ok) { throw new Error('Gagal memuat ' + alamat); }
      return respons.text();
    })
    .then(function (html) {
      wadah.innerHTML = html;
      tandaiMenuAktif();
      siapkanTombolHamburger();
      siapkanTombolKeluar();
    })
    .catch(function (error) {
      console.error(error);
      wadah.innerHTML =
        '<p style="padding:16px;color:#C64444;font-size:14px;">' +
        'Sidebar gagal dimuat. Buka halaman lewat http://localhost/... (bukan file://).</p>';
    });
}

/* Menandai <a data-menu="..."> yang cocok dengan <body data-halaman="admin-...">
   Contoh: data-halaman="admin-pesanan" -> dicari <a data-menu="pesanan"> */
function tandaiMenuAktif() {
  var halaman = document.body.getAttribute('data-halaman') || '';
  var namaMenu = halaman.replace(/^admin-/, ''); // buang awalan "admin-"

  document.querySelectorAll('.admin-menu a[data-menu]').forEach(function (tautan) {
    if (tautan.getAttribute('data-menu') === namaMenu) {
      tautan.classList.add('aktif');
    }
  });
}

/* Tombol hamburger untuk layar sempit (<= 860px, lihat admin.css bagian 9),
   saat sidebar disembunyikan ke kiri layar. Tombolnya DIBUAT OTOMATIS di sini
   dan disisipkan ke awal .admin-header, supaya tidak perlu menulis markup yang
   sama di setiap halaman admin. Di layar lebar tombol ini disembunyikan CSS.

   Sidebar tertutup lagi kalau: tombol ditekan lagi, klik di luar sidebar,
   klik salah satu menu, atau tombol Escape. */
function siapkanTombolHamburger() {
  var header = document.querySelector('.admin-header');
  if (!header || document.getElementById('adminHamburger')) { return; }

  var tombol = document.createElement('button');
  tombol.type = 'button';
  tombol.id = 'adminHamburger';
  tombol.className = 'admin-hamburger';
  tombol.setAttribute('aria-label', 'Buka menu');
  tombol.setAttribute('aria-expanded', 'false');
  tombol.innerHTML = '&#9776;';
  header.insertBefore(tombol, header.firstChild);

  function aturSidebar(terbuka) {
    document.body.classList.toggle('admin-sidebar-terbuka', terbuka);
    tombol.setAttribute('aria-expanded', terbuka ? 'true' : 'false');
    tombol.setAttribute('aria-label', terbuka ? 'Tutup menu' : 'Buka menu');
  }

  tombol.addEventListener('click', function (e) {
    e.stopPropagation(); // supaya tidak dianggap "klik di luar sidebar" di bawah
    aturSidebar(!document.body.classList.contains('admin-sidebar-terbuka'));
  });

  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('admin-sidebar-terbuka')) { return; }
    var sidebar = document.querySelector('.admin-sidebar');
    var klikDiMenu = e.target.closest('.admin-menu-item');
    if (klikDiMenu || (sidebar && !sidebar.contains(e.target))) {
      aturSidebar(false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { aturSidebar(false); }
  });
}

/* Tombol Keluar di bawah sidebar. Memanggil api/admin/logout.php, lalu
   mengarahkan ke halaman login apa pun hasilnya -- supaya admin tidak
   pernah "terjebak" kalau sesi di server sudah habis duluan. */
function siapkanTombolKeluar() {
  var tombol = document.getElementById('tombolKeluarAdmin');
  if (!tombol) { return; }

  tombol.addEventListener('click', function () {
    /* Halaman admin ada di frontend/admin/, jadi API dipanggil dengan
       "../../api/..." (sama seperti panggilApi() di file admin lain). */
    fetch('../../api/admin/logout.php', { method: 'POST' })
      .catch(function (error) {
        /* Tidak masalah kalau gagal (misal sesi sudah habis) -- tetap lanjut
           ke login.html di bawah supaya admin tidak tersangkut di halaman
           yang butuh login. */
        console.error(error);
      })
      .finally(function () {
        try { sessionStorage.removeItem('namaAdmin'); } catch (e) { /* abaikan */ }
        window.location.href = 'login.html'; // [UBAH] sesuaikan path kalau beda folder
      });
  });
}