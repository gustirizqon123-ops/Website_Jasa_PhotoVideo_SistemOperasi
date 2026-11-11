/* ==========================================================================
   js/admin/layout.js   (milik C)
   Letak file : frontend/js/admin/layout.js
   Dimuat di  : SEMUA halaman admin KECUALI login.html (dashboard, pesanan,
                paket, dan detail pesanan nanti di tahap berikutnya)

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

   CATATAN: logout.php BELUM dibuat (baru dibuat di Tahap 2: Login Admin).
   Tombol Keluar di bawah sudah disiapkan sekarang supaya C tidak perlu
   menulis ulang layout.js nanti; kalau endpoint-nya belum ada, tombol akan
   gagal diam-diam dan tetap mengarahkan ke login.html (lihat catch di bawah).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  muatSidebarAdmin();
});

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

/* [UBAH] Tombol hamburger belum ada markup-nya di admin-sidebar.html karena
   desain Figma untuk tampilan sempit belum terlihat jelas. Kalau sudah ada
   tombolnya (misal <button id="adminHamburger">), tambahkan id tersebut di
   admin-sidebar.html atau di header tiap halaman, fungsi ini akan langsung
   menyambungkannya. Selama tombolnya belum ada, fungsi ini tidak melakukan
   apa-apa (aman, tidak error). */
function siapkanTombolHamburger() {
  var tombol = document.getElementById('adminHamburger');
  if (!tombol) { return; }

  tombol.addEventListener('click', function () {
    document.body.classList.toggle('admin-sidebar-terbuka');
  });
}

/* Tombol Keluar di bawah sidebar. Memanggil api/admin/logout.php (dibuat di
   Tahap 2), lalu mengarahkan ke halaman login apa pun hasilnya -- supaya
   admin tidak pernah "terjebak" kalau sesi di server sudah habis duluan. */
function siapkanTombolKeluar() {
  var tombol = document.getElementById('tombolKeluarAdmin');
  if (!tombol) { return; }

  tombol.addEventListener('click', function () {
    /* [TAMBAH] path "../../api/admin/logout.php" disesuaikan nanti dengan
       letak pasti file halaman admin di folder frontend/admin/. Cocokkan
       dengan path yang dipakai fetch lain di halaman admin. */
    fetch('../../api/admin/logout.php', { method: 'POST' })
      .catch(function (error) {
        /* Tidak masalah kalau gagal (misal logout.php belum ada / sesi sudah
           habis) -- tetap lanjut ke login.html di bawah supaya admin tidak
           tersangkut di halaman yang butuh login. */
        console.error(error);
      })
      .finally(function () {
        window.location.href = 'login.html'; // [UBAH] sesuaikan path kalau beda folder
      });
  });
}