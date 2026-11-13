/* ==========================================================================
   js/admin/paket.js   (milik A)
   Letak file : frontend/js/admin/paket.js
   Dimuat di  : admin/paket.html SAJA, setelah config.js, util.js, api.js,
                ui.js, admin/layout.js

   TUGAS FILE INI
   1. Ambil daftar SEMUA paket (pakai endpoint PUBLIK api/paket/list.php --
      tidak perlu endpoint admin khusus untuk membaca, karena datanya sama
      dan tidak sensitif; endpoint admin baru dipakai untuk tambah/ubah/hapus)
   2. Tampilkan di tabel, dengan kolom gambar mini
   3. Filter pencarian SEDERHANA di sisi klien (tanpa ke server lagi),
      karena jumlah paket biasanya sedikit
   4. Tombol "Hapus" per baris -> modal konfirmasi -> panggil
      api/admin/paket.php (aksi=hapus)
   ========================================================================== */

var DAFTAR_PAKET_SEMUA = []; // disimpan di memori supaya filter pencarian tidak perlu fetch ulang
var ID_PAKET_AKAN_DIHAPUS = null;

document.addEventListener('DOMContentLoaded', function () {
  siapkanSemuaModal();
  muatDaftarPaket();
  siapkanPencarian();
  siapkanModalHapus();
});


/* ==========================================================================
   1 & 2. AMBIL DAN TAMPILKAN DAFTAR PAKET
   ========================================================================== */
function muatDaftarPaket() {
  panggilApi('../../api/paket/list.php')
    .then(function (daftar) {
      DAFTAR_PAKET_SEMUA = daftar;
      gambarTabelPaket(daftar);
    })
    .catch(function (error) {
      tampilToast('Gagal memuat daftar paket: ' + error.message, 'error');
    });
}

function gambarTabelPaket(daftarPaket) {
  var tbody = document.getElementById('tabelPaket');
  var kosong = document.getElementById('kosongPaket');

  if (daftarPaket.length === 0) {
    tbody.innerHTML = '';
    kosong.style.display = 'block';
    return;
  }
  kosong.style.display = 'none';

  var html = '';
  daftarPaket.forEach(function (paket) {
    html +=
      '<tr>' +
        '<td><img class="paket-tabel-gambar" src="../../uploads/paket/' + escapeHtml(paket.gambar) + '" alt=""></td>' +
        '<td>' + escapeHtml(paket.nama) + '</td>' +
        '<td>' + escapeHtml(paket.kategori) + '</td>' +
        '<td>' + formatRupiah(paket.harga) + '</td>' +
        '<td>' +
          '<a class="admin-tabel-aksi" href="paket-form.html?id=' + paket.id + '">Ubah</a>' +
          ' &middot; ' +
          '<button type="button" class="admin-tabel-aksi paket-tabel-aksi-hapus" ' +
            'data-id="' + paket.id + '" data-nama="' + escapeHtml(paket.nama) + '">Hapus</button>' +
        '</td>' +
      '</tr>';
  });
  tbody.innerHTML = html;

  // Tombol hapus dibuat ulang tiap render tabel, jadi event listener-nya
  // juga harus dipasang ulang di sini (bukan sekali saja di DOMContentLoaded).
  document.querySelectorAll('.paket-tabel-aksi-hapus').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      ID_PAKET_AKAN_DIHAPUS = tombol.getAttribute('data-id');
      document.getElementById('namaPaketDihapus').textContent = tombol.getAttribute('data-nama');
      bukaModal('modal-hapus-paket');
    });
  });
}


/* ==========================================================================
   3. PENCARIAN (FILTER DI SISI KLIEN)
   ========================================================================== */
function siapkanPencarian() {
  var inputCari = document.getElementById('cariPaket');

  inputCari.addEventListener('input', function () {
    var kataKunci = inputCari.value.trim().toLowerCase();

    if (kataKunci === '') {
      gambarTabelPaket(DAFTAR_PAKET_SEMUA);
      return;
    }

    var hasilFilter = DAFTAR_PAKET_SEMUA.filter(function (paket) {
      return paket.nama.toLowerCase().indexOf(kataKunci) !== -1
        || paket.kategori.toLowerCase().indexOf(kataKunci) !== -1;
    });
    gambarTabelPaket(hasilFilter);
  });
}


/* ==========================================================================
   4. MODAL KONFIRMASI HAPUS
   ========================================================================== */
function siapkanModalHapus() {
  var tombolKonfirmasi = document.getElementById('tombolKonfirmasiHapus');

  tombolKonfirmasi.addEventListener('click', function () {
    if (!ID_PAKET_AKAN_DIHAPUS) { return; }

    var formData = new FormData();
    formData.append('aksi', 'hapus');
    formData.append('id', ID_PAKET_AKAN_DIHAPUS);

    setMemuat(tombolKonfirmasi, true, 'Menghapus...');

    panggilApi('../../api/admin/paket.php', { method: 'POST', body: formData })
      .then(function () {
        tampilToast('Paket berhasil dihapus', 'sukses');
        tutupModal('modal-hapus-paket');
        ID_PAKET_AKAN_DIHAPUS = null;
        muatDaftarPaket();
      })
      .catch(function (error) {
        // Termasuk error 409 ("masih memiliki pesanan terkait") -- pesannya
        // dari server sudah jelas, cukup ditampilkan lewat toast.
        tampilToast(error.message, 'error');
      })
      .finally(function () {
        setMemuat(tombolKonfirmasi, false);
      });
  });
}