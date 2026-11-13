/* ==========================================================================
   js/katalog.js   (milik A)
   Letak file : frontend/js/katalog.js
   Dimuat di  : katalog.html SAJA, PALING TERAKHIR (setelah config.js,
                util.js, api.js, ui.js, komponen.js)

   TUGAS FILE INI
   Mengisi halaman Katalog dengan data ASLI dari server, menggantikan
   kartu paket dan tab kategori contoh yang sebelumnya ditulis langsung di
   katalog.html:
   1. Ambil daftar kategori (api/kategori/list.php) -> buat tombol tab
   2. Ambil daftar paket (api/paket/list.php), sesuai kategori yang aktif
      -> buat kartu paket di #daftar-paket
   3. Saat tombol "Lihat detail" diklik -> ambil api/paket/detail.php -> isi modal
   4. Baca parameter URL ?kategori=ID (dipakai tautan dari index.html,
      kartu "Wedding/Wisuda/Event") supaya tab yang sesuai
      langsung aktif saat halaman dibuka dari Beranda
   5. Isi tautan tombol "Konsultasi via WhatsApp" dari KONFIG.NOMOR_WA_ADMIN
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  siapkanSemuaModal();   // dari ui.js: tombol tutup, klik di luar, tombol Escape
  siapkanTombolKonsultasi();
  muatKategori();
});

/* Nomor diambil dari js/config.js, supaya nomor WhatsApp admin cukup
   diubah di satu tempat (sama seperti tombol WhatsApp di konfirmasi.js). */
function siapkanTombolKonsultasi() {
  var tombol = document.getElementById('tombolKonsultasiWa');
  if (!tombol) { return; }
  // Titik di akhir nama merek ("For Us Picture.") dibuang supaya tidak jadi "Picture.,"
  var namaStudio = KONFIG.NAMA_STUDIO.replace(/\.$/, '');
  tombol.href = linkWhatsApp(KONFIG.NOMOR_WA_ADMIN,
    'Halo ' + namaStudio + ', saya ingin konsultasi paket.');
}


/* ==========================================================================
   1. KATEGORI (TAB)
   ========================================================================== */
function muatKategori() {
  var kategoriAktif = ambilKategoriDariUrl(); // null kalau tidak ada di URL

  panggilApi('../api/kategori/list.php')
    .then(function (daftarKategori) {
      gambarTabKategori(daftarKategori, kategoriAktif);
      // Muat paket SETELAH tab selesai dibuat, supaya tab yang benar
      // sudah ditandai "aktif" sebelum data paket pertama tampil.
      muatPaket(kategoriAktif);
    })
    .catch(function (error) {
      tampilToast(error.message, 'error');
      // Tab gagal dimuat, tapi paket tetap dicoba dimuat (tanpa filter)
      // supaya halaman tidak kosong total.
      muatPaket(null);
    });
}

/**
 * Membaca ?kategori=ID dari alamat halaman, contoh:
 * katalog.html?kategori=2  ->  mengembalikan 2 (angka)
 * katalog.html (tanpa parameter)  ->  mengembalikan null
 */
function ambilKategoriDariUrl() {
  var parameter = new URLSearchParams(window.location.search);
  var nilai = parameter.get('kategori');
  if (!nilai) { return null; }

  var angka = parseInt(nilai, 10);
  return isNaN(angka) ? null : angka;
}

/**
 * Membuat tombol tab: "Semua" + satu tombol per kategori dari API.
 * Tab yang cocok dengan kategoriAktif diberi kelas "aktif"; kalau
 * kategoriAktif null (tidak ada di URL), tab "Semua" yang aktif.
 */
function gambarTabKategori(daftarKategori, kategoriAktif) {
  var wadahTab = document.getElementById('tab-kategori');
  if (!wadahTab) { return; }

  var html = '';

  html += '<button type="button" class="tab' + (kategoriAktif === null ? ' aktif' : '') +
          '" data-kategori="">Semua</button>';

  daftarKategori.forEach(function (kategori) {
    var aktif = (kategoriAktif === kategori.id) ? ' aktif' : '';
    html += '<button type="button" class="tab' + aktif + '" data-kategori="' +
            kategori.id + '">' + escapeHtml(kategori.nama_kategori) + '</button>';
  });

  wadahTab.innerHTML = html;

  // Klik tab -> pindahkan kelas "aktif" dan muat ulang paket sesuai kategori
  wadahTab.querySelectorAll('.tab').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      wadahTab.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('aktif'); });
      tombol.classList.add('aktif');

      var idKategori = tombol.getAttribute('data-kategori');
      muatPaket(idKategori === '' ? null : parseInt(idKategori, 10));
    });
  });
}


/* ==========================================================================
   2. DAFTAR PAKET
   ========================================================================== */
function muatPaket(idKategori) {
  var wadahDaftar = document.getElementById('daftar-paket');
  if (!wadahDaftar) { return; }

  // [UBAH] pesan sementara saat menunggu data, boleh diganti skeleton/spinner
  wadahDaftar.innerHTML = '<p class="teks-redup">Memuat paket...</p>';

  var alamat = idKategori ? ('../api/paket/list.php?kategori=' + idKategori) : '../api/paket/list.php';

  panggilApi(alamat)
    .then(function (daftarPaket) {
      gambarDaftarPaket(daftarPaket);
      perbaruiJumlahPaket(daftarPaket.length, idKategori);
    })
    .catch(function (error) {
      wadahDaftar.innerHTML = '<p class="teks-redup">Gagal memuat paket. Silakan muat ulang halaman.</p>';
      tampilToast(error.message, 'error');
    });
}

/**
 * Mengubah teks "X paket Nama" di atas daftar paket.
 * [TAMBAH] kalau mau menampilkan NAMA kategori (bukan cuma "Semua paket"),
 * simpan nama kategori saat gambarTabKategori() dipanggil, lalu pakai di sini.
 */
function perbaruiJumlahPaket(jumlah, idKategori) {
  var elemen = document.getElementById('jumlah-paket');
  if (!elemen) { return; }
  elemen.textContent = jumlah + (idKategori ? ' paket di kategori ini' : ' paket tersedia');
}

/**
 * Membuat kartu untuk setiap paket dan memasukkannya ke #daftar-paket.
 * Struktur kartu disalin dari markup .card-paket yang sudah ada di
 * css/style.css, hanya isinya diganti data asli dari API.
 */
function gambarDaftarPaket(daftarPaket) {
  var wadahDaftar = document.getElementById('daftar-paket');

  if (daftarPaket.length === 0) {
    wadahDaftar.innerHTML = '<p class="teks-redup">Belum ada paket untuk kategori ini.</p>';
    return;
  }

  var html = '';

  daftarPaket.forEach(function (paket) {
    html += '<article class="card card-paket" data-id="' + paket.id + '">' +
      '<img class="card-paket-gambar" src="../uploads/paket/' + escapeHtml(paket.gambar) + '" alt="' + escapeHtml(paket.nama) + '">' +
      '<div class="card-paket-isi">' +
        '<span class="badge-label">' + escapeHtml(paket.kategori) + '</span>' +
        '<div>' +
          '<h3>' + escapeHtml(paket.nama) + '</h3>' +
        '</div>' +
        '<p class="harga">' + formatRupiah(paket.harga) + ' <small>/ acara</small></p>' +
        '<hr class="garis">' +
        '<ul class="daftar-centang">' + gambarDaftarFasilitas(paket.deskripsi) + '</ul>' +
        '<div class="card-paket-aksi">' +
          '<a href="pemesanan.html?paket=' + paket.id + '" class="btn btn-primary btn-block">Pesan <span class="ikon ikon-panah" aria-hidden="true"></span></a>' +
          '<button type="button" class="btn btn-teks btn-block" data-detail="' + paket.id + '">Lihat detail</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  });

  wadahDaftar.innerHTML = html;

  // Pasang event klik "Lihat detail" SETELAH kartu masuk ke halaman
  // (elemen baru tidak otomatis punya event listener).
  wadahDaftar.querySelectorAll('[data-detail]').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      bukaModalDetail(tombol.getAttribute('data-detail'));
    });
  });
}

/**
 * `deskripsi` dari API berupa satu kalimat panjang dipisah koma, contoh:
 * "Dokumentasi foto 6 jam, 1 fotografer, 100 foto edit"
 * Fungsi ini memecahnya jadi beberapa <li> supaya tampil seperti daftar
 * centang, bukan satu paragraf panjang.
 *
 * [UBAH] kalau nanti format `deskripsi` di database diubah (misalnya
 * dipisah titik koma, atau dibuat kolom terpisah di tabel paket),
 * sesuaikan cara memecahnya di sini saja.
 */
function gambarDaftarFasilitas(deskripsi) {
  var bagian = String(deskripsi || '').split(',');
  var html = '';
  bagian.forEach(function (satu) {
    var teks = satu.trim();
    if (teks !== '') {
      html += '<li>' + escapeHtml(teks) + '</li>';
    }
  });
  return html;
}


/* ==========================================================================
   3. MODAL DETAIL PAKET
   ========================================================================== */
function bukaModalDetail(idPaket) {
  panggilApi('../api/paket/detail.php?id=' + idPaket)
    .then(function (paket) {
      isiModalDetail(paket);
      bukaModal('modal-detail'); // dari ui.js
    })
    .catch(function (error) {
      tampilToast(error.message, 'error');
    });
}

function isiModalDetail(paket) {
  var elGambar = document.getElementById('modal-gambar');
  var elJudul = document.getElementById('modal-judul');
  var elEyebrow = document.querySelector('#modal-detail .eyebrow');
  var elHarga = document.querySelector('#modal-detail .harga');
  var elDurasi = document.getElementById('modal-durasi');
  var elDeskripsi = document.getElementById('modal-deskripsi');
  var elDaftar = document.querySelector('#modal-detail .daftar-centang');
  var elTombolPesan = document.getElementById('modal-pesan');

  if (elDurasi) {
    // Durasi sesuai kategori, aturannya di config.js -> teksDurasiPaket() di util.js
    elDurasi.textContent = teksDurasiPaket(paket.kategori_id);
    elDurasi.hidden = (elDurasi.textContent === '');
  }

  if (elGambar) {
    elGambar.src = '../uploads/paket/' + paket.gambar;
    elGambar.alt = paket.nama;
  }
  if (elJudul) { elJudul.textContent = paket.nama; }
  if (elEyebrow) { elEyebrow.textContent = 'Detail paket · ' + paket.kategori; }
  if (elHarga) {
    // .harga pakai innerHTML karena ada <small> di dalamnya (lihat style.css)
    elHarga.innerHTML = formatRupiah(paket.harga) + ' <small>/ acara</small>';
  }
  if (elDeskripsi) { elDeskripsi.textContent = paket.deskripsi; }
  if (elDaftar) { elDaftar.innerHTML = gambarDaftarFasilitas(paket.deskripsi); }
  if (elTombolPesan) {
    elTombolPesan.href = 'pemesanan.html?paket=' + paket.id;
    elTombolPesan.textContent = ''; // kosongkan dulu supaya ikon panah tidak dobel
    elTombolPesan.appendChild(document.createTextNode('Pesan ' + paket.nama + ' '));
    var ikon = document.createElement('span');
    ikon.className = 'ikon ikon-panah';
    ikon.setAttribute('aria-hidden', 'true');
    elTombolPesan.appendChild(ikon);
  }
}