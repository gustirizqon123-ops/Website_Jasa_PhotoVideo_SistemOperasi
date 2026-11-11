/* ==========================================================================
   js/pemesanan.js   (milik B)
   Letak file : frontend/js/pemesanan.js
   Dimuat di  : pemesanan.html SAJA, setelah config.js, util.js, api.js,
                ui.js, komponen.js

   TUGAS FILE INI
   1. Membaca ?paket=ID dari URL, isi field tersembunyi "paket_id"
   2. Ambil detail paket itu (api/paket/detail.php) -> isi kartu ringkasan
      di kolom kanan, gantikan CONTOH yang ditulis manual di pemesanan.html
   3. Saat form disubmit: validasi dasar, kirim ke api/pesanan/buat.php
   4. Kalau berhasil: simpan hasilnya ke sessionStorage (kunci
      "pesananAktif"), lalu pindah ke pembayaran.html. Dipakai di sana
      karena TIDAK ADA endpoint "cek status" untuk pelanggan (keputusan
      kelompok, lihat API.md 4.4 "Catatan alur status").
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  siapkanPaketDariUrl();
  siapkanFormPemesanan();
});


/* ==========================================================================
   1 & 2. PAKET YANG DIPESAN
   ========================================================================== */
function siapkanPaketDariUrl() {
  var parameter = new URLSearchParams(window.location.search);
  var idDariUrl = parameter.get('paket');
  var inputPaketId = document.getElementById('paketId');

  // Kalau ?paket=ID ada di alamat, pakai itu. Kalau tidak ada, PAKAI nilai
  // CONTOH yang sudah tertulis di pemesanan.html (supaya halaman tetap
  // bisa dicoba langsung tanpa harus selalu datang dari katalog.html).
  var idPaket = (idDariUrl && /^[0-9]+$/.test(idDariUrl)) ? idDariUrl : inputPaketId.value;
  inputPaketId.value = idPaket;

  muatRingkasanPaket(idPaket);

  var tautanGanti = document.querySelector('.form-ringkasan-ganti');
  if (tautanGanti) {
    tautanGanti.href = 'katalog.html'; // [TAMBAH] bisa diarahkan ke kategori paket ini kalau mau
  }
}

function muatRingkasanPaket(idPaket) {
  panggilApi('../api/paket/detail.php?id=' + idPaket)
    .then(function (paket) {
      gambarRingkasanPaket(paket);
    })
    .catch(function (error) {
      tampilToast('Paket tidak ditemukan: ' + error.message, 'error');
    });
}

function gambarRingkasanPaket(paket) {
  var wadah = document.getElementById('ringkasanPaket');

  var gambar = wadah.querySelector('.form-ringkasan-gambar');
  var label = wadah.querySelector('.badge-label');
  var judul = wadah.querySelector('h3');
  var harga = wadah.querySelector('.harga');
  var daftar = wadah.querySelector('.daftar-centang');

  gambar.src = '../uploads/paket/' + paket.gambar;
  gambar.alt = paket.nama;
  label.textContent = paket.kategori;
  judul.textContent = paket.nama;
  harga.innerHTML = formatRupiah(paket.harga) + ' <small>/ acara</small>';

  // Pecah "deskripsi" jadi daftar centang, sama seperti di katalog.js
  // (lihat komentar lengkap di gambarDaftarFasilitas() pada katalog.js).
  var html = '';
  String(paket.deskripsi || '').split(',').forEach(function (satu) {
    var teks = satu.trim();
    if (teks !== '') { html += '<li>' + escapeHtml(teks) + '</li>'; }
  });
  daftar.innerHTML = html;
}


/* ==========================================================================
   3 & 4. SUBMIT FORM PEMESANAN
   ========================================================================== */
function siapkanFormPemesanan() {
  var form = document.getElementById('formPemesanan');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var kotakError = document.getElementById('pesanErrorUmum');
    kotakError.style.display = 'none';

    var dataForm = {
      paket_id: parseInt(document.getElementById('paketId').value, 10),
      nama: document.getElementById('nama').value.trim(),
      no_wa: document.getElementById('noWa').value.trim(),
      email: document.getElementById('email').value.trim(),
      tanggal_acara: document.getElementById('tanggalAcara').value,
      jam: document.getElementById('jam').value,
      lokasi: document.getElementById('lokasi').value.trim(),
      catatan: document.getElementById('catatan').value.trim(),
    };

    // Validasi dasar di sisi pengguna, supaya tidak perlu menunggu
    // balasan server untuk kesalahan yang jelas-jelas sepele. Validasi
    // LENGKAP tetap dilakukan server (lihat api/pesanan/buat.php) --
    // ini cuma mempercepat, BUKAN pengganti validasi server.
    if (!dataForm.nama || !dataForm.no_wa || !dataForm.tanggal_acara || !dataForm.lokasi) {
      kotakError.textContent = 'Mohon lengkapi semua field yang wajib diisi.';
      kotakError.style.display = 'flex'; // .alert aslinya display:flex (lihat style.css)
      return;
    }

    var tombol = document.getElementById('tombolLanjutBayar');
    setMemuat(tombol, true, 'Menyimpan pesanan...');

    panggilApi('../api/pesanan/buat.php', {
      method: 'POST',
      body: dataForm
    })
      .then(function (pesanan) {
        // Simpan HASIL dari server (bukan dataForm tadi) -- supaya
        // total_harga, kode_pesanan, nama_paket, dll datang resmi dari
        // database, bukan dugaan di sisi frontend.
        sessionStorage.setItem('pesananAktif', JSON.stringify(pesanan));
        window.location.href = 'pembayaran.html';
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