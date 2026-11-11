/* ==========================================================================
   js/admin/pesanan.js   (milik C)
   Letak file : frontend/js/admin/pesanan.js
   Dimuat di  : frontend/admin/pesanan.html SAJA, setelah config.js,
                util.js, api.js, ui.js, js/admin/layout.js

   TUGAS FILE INI
   Mengisi tabel Daftar Pesanan dari api/admin/pesanan.php (mode daftar),
   dan menangani klik tab filter status (Semua / Menunggu / Dikonfirmasi /
   Selesai / Batal) untuk memuat ulang tabel dengan parameter ?status=...

   Catatan: field "ringkasan" dari API juga ikut terkirim di sini, tapi
   TIDAK dipakai (kartu ringkasan hanya ada di Dashboard) -- diabaikan saja.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  siapkanFilterStatus();
  muatDaftarPesanan(''); // '' = semua status, sesuai tab "Semua" yang aktif di awal
});

/**
 * Memasang event klik ke setiap tombol tab filter. Klik tab -> pindahkan
 * kelas "aktif", lalu muat ulang tabel sesuai status tab itu.
 */
function siapkanFilterStatus() {
  var wadahTab = document.getElementById('filterStatus');

  wadahTab.querySelectorAll('.tab').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      wadahTab.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('aktif'); });
      tombol.classList.add('aktif');
      muatDaftarPesanan(tombol.getAttribute('data-status'));
    });
  });
}

/**
 * Memanggil api/admin/pesanan.php dengan filter status (atau tanpa filter
 * kalau status === ''), lalu mengisi tabel.
 */
function muatDaftarPesanan(status) {
  var tbody = document.getElementById('tabelPesanan');
  var kosong = document.getElementById('kosongPesanan');
  var bungkusTabel = tbody.closest('.admin-tabel-bungkus');

  bungkusTabel.style.display = 'block';
  kosong.style.display = 'none';
  tbody.innerHTML = '<tr><td colspan="7" class="teks-redup">Memuat data...</td></tr>';

  var alamat = status ? ('../api/admin/pesanan.php?status=' + status) : '../api/admin/pesanan.php';

  panggilApi(alamat)
    .then(function (data) {
      gambarTabelPesanan(data.pesanan, bungkusTabel, kosong, tbody);
    })
    .catch(function (error) {
      tbody.innerHTML = '<tr><td colspan="7" class="teks-redup">Gagal memuat data.</td></tr>';
      tampilToast(error.message, 'error');
    });
}

function gambarTabelPesanan(daftarPesanan, bungkusTabel, kosong, tbody) {
  if (daftarPesanan.length === 0) {
    bungkusTabel.style.display = 'none';
    kosong.style.display = 'block';
    return;
  }

  var html = '';
  daftarPesanan.forEach(function (pesanan) {
    html += '<tr>' +
      '<td>' + escapeHtml(pesanan.kode_pesanan) + '</td>' +
      '<td>' + escapeHtml(pesanan.nama) + '</td>' +
      '<td>' + escapeHtml(pesanan.nama_paket) + '</td>' +
      '<td>' + formatTanggal(pesanan.tanggal_acara, 'pendek') + '</td>' +
      '<td>' + formatRupiah(pesanan.total_harga) + '</td>' +
      '<td>' + gambarBadgeStatus(pesanan.status) + '</td>' +
      '<td><a class="admin-tabel-aksi" href="pesanan-detail.html?id=' + pesanan.id + '">Lihat</a></td>' +
    '</tr>';
  });

  tbody.innerHTML = html;
}

/**
 * Sama persis dengan fungsi di js/admin/dashboard.js. Sengaja disalin
 * (bukan dipanggil lintas file) supaya pesanan.html tidak perlu memuat
 * dashboard.js juga. [TAMBAH] kalau dipakai di halaman admin ketiga
 * (pesanan-detail.html), pertimbangkan pindahkan ke util.js supaya satu
 * fungsi dipakai bersama, tidak disalin tiga kali.
 */
function gambarBadgeStatus(status) {
  var label = {
    menunggu: 'Menunggu',
    dikonfirmasi: 'Dikonfirmasi',
    selesai: 'Selesai',
    batal: 'Batal',
  }[status] || status;

  return '<span class="badge badge-' + status + '">' + escapeHtml(label) + '</span>';
}