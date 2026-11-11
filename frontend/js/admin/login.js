/* ==========================================================================
   js/admin/login.js   (milik C)
   Letak file : frontend/js/admin/login.js
   Dimuat di  : frontend/admin/login.html SAJA, setelah config.js, util.js,
                api.js, ui.js (TIDAK pakai komponen.js/layout.js -- halaman
                login tidak punya navbar atau sidebar)

   TUGAS FILE INI
   Menangani submit form login: kirim username+password ke
   api/admin/login.php, tampilkan error kalau salah, atau arahkan ke
   dashboard.html kalau berhasil.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('formLoginAdmin');
  if (!form) { return; }

  form.addEventListener('submit', function (e) {
    e.preventDefault(); // cegah form reload halaman (perilaku default HTML)

    var tombol = document.getElementById('tombolMasuk');
    var kotakError = document.getElementById('pesanErrorLogin');
    kotakError.style.display = 'none'; // sembunyikan error dari percobaan sebelumnya

    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;

    if (username === '' || password === '') {
      kotakError.textContent = 'Username dan password wajib diisi.';
      kotakError.style.display = 'flex';
      return;
    }

    setMemuat(tombol, true, 'Memeriksa...'); // dari ui.js

    panggilApi('../../api/admin/login.php', {
      method: 'POST',
      body: { username: username, password: password }
    })
      .then(function () {
        // Login berhasil -> langsung ke dashboard. Tidak perlu simpan apa-apa
        // di JS: status login disimpan server lewat session (cookie),
        // bukan di localStorage/sessionStorage.
        window.location.href = 'dashboard.html';
      })
      .catch(function (error) {
        kotakError.textContent = error.message;
        kotakError.style.display = 'flex';
      })
      .finally(function () {
        setMemuat(tombol, false);
      });
  });
});