/* ==========================================================================
   js/admin/paket-form.js   (milik A)
   Letak file : frontend/js/admin/paket-form.js
   Dimuat di  : admin/paket-form.html SAJA, setelah config.js, util.js,
                api.js, ui.js, admin/layout.js

   Satu halaman untuk DUA mode, dibedakan dari ada tidaknya ?id= di URL:
   - TAMBAH : paket-form.html                  (gambar WAJIB diunggah)
   - UBAH   : paket-form.html?id=3             (gambar OPSIONAL, kalau
                                                  tidak diganti, gambar lama
                                                  tetap dipakai -- lihat
                                                  api/admin/paket.php)

   TUGAS FILE INI
   1. Isi pilihan dropdown Kategori dari api/kategori/list.php
   2. Kalau mode UBAH: ambil data paket (api/paket/detail.php?id=) dan isi
      semua field + pratinjau gambar yang sudah ada
   3. Pratinjau gambar baru begitu pengguna memilih file (FileReader,
      di sisi klien saja, BELUM diunggah ke server)
   4. Submit form -> kirim FormData ke api/admin/paket.php (aksi
      "tambah" atau "ubah", tergantung mode)
   ========================================================================== */

var MODE_ID_PAKET = null; // null = mode tambah, angka = mode ubah
var TIPE_GAMBAR_DIIZINKAN = ['image/jpeg', 'image/png']; // [UBAH] khusus gambar paket, beda dari KONFIG.TIPE_FILE_DIIZINKAN (yang itu untuk bukti bayar, termasuk PDF)
var UKURAN_GAMBAR_MAKS = 2 * 1024 * 1024; // 2 MB

document.addEventListener('DOMContentLoaded', function () {
  MODE_ID_PAKET = ambilIdDariUrl();

  muatPilihanKategori().then(function () {
    if (MODE_ID_PAKET) {
      siapkanModeUbah();
    }
  });

  siapkanPratinjauGambar();
  siapkanFormPaket();
});

function ambilIdDariUrl() {
  var parameter = new URLSearchParams(window.location.search);
  var id = parameter.get('id');
  return (id && /^[0-9]+$/.test(id)) ? id : null;
}


/* ==========================================================================
   1. PILIHAN KATEGORI
   Dikembalikan sebagai Promise supaya kode yang memanggilnya (DOMContentLoaded)
   bisa menunggu dropdown siap SEBELUM mengisi nilai terpilih di mode ubah.
   ========================================================================== */
function muatPilihanKategori() {
  return panggilApi('../../api/kategori/list.php')
    .then(function (daftarKategori) {
      var select = document.getElementById('kategoriId');
      var html = '<option value="">Pilih kategori</option>';
      daftarKategori.forEach(function (kategori) {
        html += '<option value="' + kategori.id + '">' + escapeHtml(kategori.nama_kategori) + '</option>';
      });
      select.innerHTML = html;
    })
    .catch(function (error) {
      tampilToast('Gagal memuat daftar kategori: ' + error.message, 'error');
    });
}


/* ==========================================================================
   2. MODE UBAH: AMBIL DATA PAKET YANG SUDAH ADA
   ========================================================================== */
function siapkanModeUbah() {
  document.getElementById('judulHalamanForm').textContent = 'Ubah Paket';
  document.getElementById('tombolSimpanPaket').textContent = 'Simpan Perubahan';
  document.getElementById('idPaket').value = MODE_ID_PAKET;

  // Mode ubah: gambar baru OPSIONAL, bukan wajib seperti mode tambah.
  document.getElementById('inputGambarPaket').required = false;

  panggilApi('../../api/paket/detail.php?id=' + MODE_ID_PAKET)
    .then(function (paket) {
      document.getElementById('nama').value = paket.nama;
      document.getElementById('kategoriId').value = paket.kategori_id;
      document.getElementById('harga').value = paket.harga;
      document.getElementById('deskripsi').value = paket.deskripsi;

      tampilkanGambar('../../uploads/paket/' + paket.gambar);
    })
    .catch(function (error) {
      tampilToast('Gagal memuat data paket: ' + error.message, 'error');
    });
}


/* ==========================================================================
   3. PRATINJAU GAMBAR
   ========================================================================== */
function siapkanPratinjauGambar() {
  var inputFile = document.getElementById('inputGambarPaket');

  inputFile.addEventListener('change', function () {
    var file = inputFile.files[0];
    if (!file) { return; }

    if (TIPE_GAMBAR_DIIZINKAN.indexOf(file.type) === -1) {
      tampilToast('Tipe gambar tidak diizinkan. Gunakan JPG atau PNG.', 'error');
      inputFile.value = '';
      return;
    }
    if (file.size > UKURAN_GAMBAR_MAKS) {
      tampilToast('Ukuran gambar maksimal 2 MB.', 'error');
      inputFile.value = '';
      return;
    }

    // FileReader membaca file jadi data URL, supaya bisa dipratinjau
    // LANGSUNG di sisi klien -- belum diunggah ke server, cuma pratinjau.
    var pembaca = new FileReader();
    pembaca.onload = function (e) {
      tampilkanGambar(e.target.result);
    };
    pembaca.readAsDataURL(file);
  });
}

function tampilkanGambar(sumberGambar) {
  var gambar = document.getElementById('pratinjauGambarPaket');
  var placeholder = document.getElementById('placeholderGambarPaket');

  gambar.src = sumberGambar;
  gambar.hidden = false;
  placeholder.hidden = true;
}


/* ==========================================================================
   4. SUBMIT FORM
   ========================================================================== */
function siapkanFormPaket() {
  var form = document.getElementById('formPaket');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var kotakError = document.getElementById('pesanErrorForm');
    kotakError.style.display = 'none';

    var nama = document.getElementById('nama').value.trim();
    var kategoriId = document.getElementById('kategoriId').value;
    var harga = document.getElementById('harga').value;
    var deskripsi = document.getElementById('deskripsi').value.trim();
    var adaGambarBaru = document.getElementById('inputGambarPaket').files.length > 0;

    if (!nama || !kategoriId || !harga || !deskripsi) {
      kotakError.textContent = 'Mohon lengkapi semua field yang wajib diisi.';
      kotakError.style.display = 'flex';
      return;
    }
    // Mode tambah WAJIB ada gambar; mode ubah boleh tidak ganti gambar.
    if (!MODE_ID_PAKET && !adaGambarBaru) {
      kotakError.textContent = 'Mohon unggah gambar paket terlebih dahulu.';
      kotakError.style.display = 'flex';
      return;
    }

    // FormData dibangun dari <form> -> otomatis ambil nama, kategori_id,
    // harga, deskripsi, dan file gambar (kalau ada) lewat atribut "name".
    var formData = new FormData(form);
    formData.set('aksi', MODE_ID_PAKET ? 'ubah' : 'tambah');
    if (MODE_ID_PAKET) {
      formData.set('id', MODE_ID_PAKET);
    }

    var tombol = document.getElementById('tombolSimpanPaket');
    setMemuat(tombol, true, 'Menyimpan...');

    panggilApi('../../api/admin/paket.php', { method: 'POST', body: formData })
      .then(function () {
        tampilToast(MODE_ID_PAKET ? 'Paket berhasil diubah' : 'Paket berhasil ditambahkan', 'sukses');
        window.location.href = 'paket.html';
      })
      .catch(function (error) {
        kotakError.textContent = error.message;
        kotakError.style.display = 'flex';
        tampilToast(error.message, 'error');
      })
      .finally(function () {
        setMemuat(tombol, false);
      });
  });
}