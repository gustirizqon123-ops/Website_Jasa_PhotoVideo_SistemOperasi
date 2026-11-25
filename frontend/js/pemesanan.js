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
  batasiTanggalMulaiHariIni();
  siapkanPaketDariUrl();
  siapkanFormPemesanan();
});

/* Kalender "Tanggal Acara" hanya bisa memilih HARI INI ke depan (perbaikan
   2026-11-16). Dulu tanggal yang sudah lewat bisa dipilih, lalu baru ditolak
   server setelah form dikirim. Server tetap mengecek ulang (buat.php), ini
   hanya supaya pelanggan tidak salah pilih sejak awal.
   Dipakai tanggal lokal perangkat, BUKAN toISOString() (itu tanggal UTC,
   bisa mundur sehari sebelum pukul 08.00 WITA). */
function batasiTanggalMulaiHariIni() {
  var input = document.getElementById('tanggalAcara');
  if (!input) { return; }
  var hariIni = new Date();
  var bulan = String(hariIni.getMonth() + 1).padStart(2, '0');
  var tanggal = String(hariIni.getDate()).padStart(2, '0');
  input.min = hariIni.getFullYear() + '-' + bulan + '-' + tanggal;
}


/* ==========================================================================
   1 & 2. PAKET YANG DIPESAN
   ========================================================================== */
function siapkanPaketDariUrl() {
  var parameter = new URLSearchParams(window.location.search);
  var idDariUrl = parameter.get('paket');
  var inputPaketId = document.getElementById('paketId');

  // ?paket=ID wajib ada dan berupa angka. Kalau tidak (halaman dibuka langsung,
  // tautan rusak), pelanggan diarahkan ke Katalog untuk memilih paket. Dulu
  // dipakai paket contoh dari HTML, tapi paket itu bisa saja sudah dihapus
  // admin (perbaikan 2026-11-25).
  if (!idDariUrl || !/^[0-9]+$/.test(idDariUrl)) {
    kembaliKeKatalog('Pilih paket terlebih dahulu sebelum memesan.');
    return;
  }
  var idPaket = idDariUrl;
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
      // Paket sudah dihapus / id salah: kembali ke Katalog, bukan menampilkan
      // paket contoh. Gangguan lain (koneksi putus) cukup ditampilkan sebagai toast.
      if (/tidak ditemukan/i.test(error.message)) {
        kembaliKeKatalog('Paket tidak ditemukan atau sudah tidak tersedia, silakan pilih paket lain.');
      } else {
        tampilToast(error.message, 'error');
      }
    });
}

/* Pindah ke Katalog dan menampilkan pesan di sana (toast ikut pindah halaman,
   lihat tampilToastSetelahPindah di ui.js). */
function kembaliKeKatalog(pesan) {
  tampilToastSetelahPindah(pesan, 'error');
  window.location.href = 'katalog.html';
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
  // Foto latar buram di belakang foto utama (lihat .foto-utuh di style.css)
  var latar = wadah.querySelector('.foto-utuh-latar');
  if (latar) { latar.src = gambar.src; }
  label.textContent = paket.kategori;
  judul.textContent = paket.nama;
  harga.innerHTML = formatRupiah(paket.harga) + ' <small>/ acara</small>';

  // Durasi sesuai kategori (Wedding 8 jam, Wisuda 1 jam, Event maks. 8 jam
  // + tambah jam), aturannya di config.js -> teksDurasiPaket() di util.js
  var durasi = teksDurasiPaket(paket.kategori_id);
  var elDurasi = document.getElementById('durasiPaket');
  elDurasi.textContent = durasi;
  elDurasi.hidden = (durasi === '');

  // Paket Event: beri tahu cara meminta jam tambahan. HANYA informasi --
  // total harga di sistem tidak berubah (keputusan kelompok), admin yang
  // mengonfirmasi biaya tambahannya lewat WhatsApp.
  var bantuanJam = document.getElementById('bantuanTambahJam');
  if (paket.kategori_id === KONFIG.TAMBAH_JAM.kategori_id) {
    bantuanJam.textContent = 'Butuh jam tambahan? Tulis jumlah jam tambahan di catatan. Biaya ' +
      formatRupiah(KONFIG.TAMBAH_JAM.harga) + '/jam, dikonfirmasi admin lewat WhatsApp dan dibayar terpisah.';
    bantuanJam.hidden = false;
  } else if (/tambah jam/i.test(paket.deskripsi || '')) {
    // Prewedding, Aqiqah & Tasmiyah, Ulang Tahun: tarif tambah jam beda-beda
    // per paket dan sudah tertulis di fasilitas paket (kolom deskripsi), jadi
    // di sini cukup petunjuk caranya. Total di sistem tetap tidak berubah.
    bantuanJam.textContent = 'Butuh jam tambahan? Tulis jumlah jam tambahan di catatan. ' +
      'Biaya sesuai tarif tambah jam di fasilitas paket, dikonfirmasi admin lewat WhatsApp dan dibayar terpisah.';
    bantuanJam.hidden = false;
  } else {
    bantuanJam.hidden = true;
  }

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