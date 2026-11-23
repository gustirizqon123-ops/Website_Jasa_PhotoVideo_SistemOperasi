/* ==========================================================================
   js/admin/kategori.js   (milik A)
   Letak file : frontend/js/admin/kategori.js
   Dimuat di  : admin/kategori.html SAJA, setelah config.js, util.js, api.js,
                ui.js, admin/layout.js

   TUGAS FILE INI
   1. Tampilkan daftar kategori + jumlah paket di tiap kategori
      (api/kategori/list.php dan api/paket/list.php, keduanya publik)
   2. Tambah dan ubah kategori lewat satu modal (api/admin/kategori.php)
   3. Hapus kategori lewat modal konfirmasi. Kalau kategori masih punya paket,
      server membalas 409 dan pesannya ditampilkan apa adanya.
   ========================================================================== */

var ID_KATEGORI_AKAN_DIHAPUS = null;

document.addEventListener('DOMContentLoaded', function () {
  siapkanSemuaModal();
  muatDaftarKategori();

  document.getElementById('tombolTambahKategori').addEventListener('click', function () {
    bukaFormKategori(null, '');
  });
  document.getElementById('formKategori').addEventListener('submit', simpanKategori);
  document.getElementById('tombolKonfirmasiHapusKategori').addEventListener('click', hapusKategori);
});


/* ==========================================================================
   1. DAFTAR KATEGORI
   ========================================================================== */
function muatDaftarKategori() {
  Promise.all([
    panggilApi('../../api/kategori/list.php'),
    panggilApi('../../api/paket/list.php')
  ])
    .then(function (hasil) {
      var jumlahPerKategori = {};
      hasil[1].forEach(function (paket) {
        jumlahPerKategori[paket.kategori_id] = (jumlahPerKategori[paket.kategori_id] || 0) + 1;
      });
      gambarTabelKategori(hasil[0], jumlahPerKategori);
    })
    .catch(function (error) {
      tampilToast('Gagal memuat daftar kategori: ' + error.message, 'error');
    });
}

function gambarTabelKategori(daftar, jumlahPerKategori) {
  var tbody = document.getElementById('tabelKategori');
  var kosong = document.getElementById('kosongKategori');

  if (daftar.length === 0) {
    tbody.innerHTML = '';
    kosong.style.display = 'block';
    return;
  }
  kosong.style.display = 'none';

  var html = '';
  daftar.forEach(function (kategori) {
    html +=
      '<tr>' +
        '<td>' + escapeHtml(kategori.nama_kategori) + '</td>' +
        '<td>' + (jumlahPerKategori[kategori.id] || 0) + ' paket</td>' +
        '<td>' +
          '<button type="button" class="admin-tabel-aksi kategori-aksi-ubah" ' +
            'data-id="' + kategori.id + '" data-nama="' + escapeHtml(kategori.nama_kategori) + '">Ubah</button>' +
          ' &middot; ' +
          '<button type="button" class="admin-tabel-aksi paket-tabel-aksi-hapus kategori-aksi-hapus" ' +
            'data-id="' + kategori.id + '" data-nama="' + escapeHtml(kategori.nama_kategori) + '">Hapus</button>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;

  // Tombol dibuat ulang tiap render, jadi listener dipasang ulang di sini.
  tbody.querySelectorAll('.kategori-aksi-ubah').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      bukaFormKategori(tombol.getAttribute('data-id'), tombol.getAttribute('data-nama'));
    });
  });
  tbody.querySelectorAll('.kategori-aksi-hapus').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      ID_KATEGORI_AKAN_DIHAPUS = tombol.getAttribute('data-id');
      document.getElementById('namaKategoriDihapus').textContent = tombol.getAttribute('data-nama');
      bukaModal('modal-hapus-kategori');
    });
  });
}


/* ==========================================================================
   2. TAMBAH / UBAH
   ========================================================================== */
function bukaFormKategori(id, nama) {
  document.getElementById('idKategori').value = id || '';
  document.getElementById('namaKategori').value = nama;
  document.getElementById('judulFormKategori').textContent = id ? 'Ubah Kategori' : 'Tambah Kategori';
  bukaModal('modal-form-kategori');
  document.getElementById('namaKategori').focus();
}

function simpanKategori(event) {
  event.preventDefault();

  var id = document.getElementById('idKategori').value;
  var nama = document.getElementById('namaKategori').value.trim();
  var tombol = document.getElementById('tombolSimpanKategori');

  if (nama === '') {
    tampilToast('Nama kategori wajib diisi', 'error');
    return;
  }

  setMemuat(tombol, true, 'Menyimpan...');

  panggilApi('../../api/admin/kategori.php', {
    method: 'POST',
    body: { aksi: id ? 'ubah' : 'tambah', id: id || undefined, nama_kategori: nama }
  })
    .then(function () {
      tampilToast(id ? 'Kategori berhasil diubah' : 'Kategori berhasil ditambahkan', 'sukses');
      tutupModal('modal-form-kategori');
      muatDaftarKategori();
    })
    .catch(function (error) {
      tampilToast(error.message, 'error');
    })
    .finally(function () {
      setMemuat(tombol, false);
    });
}


/* ==========================================================================
   3. HAPUS
   ========================================================================== */
function hapusKategori() {
  if (!ID_KATEGORI_AKAN_DIHAPUS) { return; }

  var tombol = document.getElementById('tombolKonfirmasiHapusKategori');
  setMemuat(tombol, true, 'Menghapus...');

  panggilApi('../../api/admin/kategori.php', {
    method: 'POST',
    body: { aksi: 'hapus', id: ID_KATEGORI_AKAN_DIHAPUS }
  })
    .then(function () {
      tampilToast('Kategori berhasil dihapus', 'sukses');
      tutupModal('modal-hapus-kategori');
      ID_KATEGORI_AKAN_DIHAPUS = null;
      muatDaftarKategori();
    })
    .catch(function (error) {
      // Termasuk 409 "masih memiliki N paket": pesan dari server sudah jelas.
      tampilToast(error.message, 'error');
      tutupModal('modal-hapus-kategori');
    })
    .finally(function () {
      setMemuat(tombol, false);
    });
}
