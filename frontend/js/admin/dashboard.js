/* ==========================================================================
   js/admin/dashboard.js   (milik C)
   Letak file : frontend/js/admin/dashboard.js
   Dimuat di  : frontend/admin/dashboard.html SAJA, setelah config.js,
                util.js, api.js, ui.js, dan js/admin/layout.js

   TUGAS FILE INI
   Mengambil data dari api/admin/pesanan.php (mode daftar, TANPA parameter
   "id") lalu mengisi:
   1. 4 kartu ringkasan status (dari field "ringkasan")
   2. Tabel 5 pesanan terbaru (dari field "pesanan", dipotong 5 teratas --
      API sudah mengirim terbaru lebih dulu, lihat API.md 5.3)

   Kalau sesi admin sudah habis, panggilApi() di api.js OTOMATIS
   mengarahkan ke login.html (lihat pengecekan window.location.pathname
   yang mengandung "/admin/" di api.js) -- file ini tidak perlu menangani
   401 secara manual.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  muatRingkasanDashboard();
});

function muatRingkasanDashboard() {
  panggilApi('../../api/admin/pesanan.php')
    .then(function (data) {
      isiKartuRingkasan(data.ringkasan);
      isiTabelPesananTerbaru(data.pesanan.slice(0, 5)); // 5 teratas saja
    })
    .catch(function (error) {
      tampilToast(error.message, 'error');
    });
}

/**
 * Mengisi 4 angka di kartu ringkasan. Struktur "ringkasan" dari API:
 * { menunggu: 3, dikonfirmasi: 5, selesai: 12, batal: 1 }
 */
function isiKartuRingkasan(ringkasan) {
  document.getElementById('jumlahMenunggu').textContent = ringkasan.menunggu;
  document.getElementById('jumlahDikonfirmasi').textContent = ringkasan.dikonfirmasi;
  document.getElementById('jumlahSelesai').textContent = ringkasan.selesai;
  document.getElementById('jumlahBatal').textContent = ringkasan.batal;
}

/**
 * Mengisi tabel "Pesanan Terbaru". Kalau daftarnya kosong, tabel
 * disembunyikan dan #kosongPesanan ditampilkan sebagai gantinya.
 */
function isiTabelPesananTerbaru(daftarPesanan) {
  var tbody = document.getElementById('tabelPesananTerbaru');
  var kosong = document.getElementById('kosongPesanan');

  if (daftarPesanan.length === 0) {
    tbody.closest('.admin-tabel-bungkus').style.display = 'none';
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
 * Mengubah teks status mentah ("dikonfirmasi") menjadi <span class="badge">
 * dengan label yang enak dibaca ("Dikonfirmasi") dan warna sesuai status
 * (kelas badge-... sudah ada di css/style.css bagian 8).
 *
 * [TAMBAH] kalau dipakai juga di halaman Daftar Pesanan / Detail Pesanan,
 * pertimbangkan pindahkan fungsi ini ke util.js supaya tidak disalin ulang.
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