/* ==========================================================================
   js/admin/pesanan-detail.js   (milik C)
   Letak file : frontend/js/admin/pesanan-detail.js
   Dimuat di  : frontend/admin/pesanan-detail.html SAJA

   TUGAS FILE INI
   1. Membaca ?id=... dari URL, ambil detail pesanan dari
      api/admin/pesanan.php?id=...
   2. Menampilkan info pesanan lengkap + daftar pembayarannya
   3. Tombol "Simpan" pada dropdown status -> api/admin/ubah-status.php
      (target: "pesanan")
   4. Tombol "Verifikasi"/"Tolak" per baris pembayaran -> endpoint yang
      sama (target: "pembayaran")

   Status enum HARUS SAMA dengan API.md bagian 2 ("Nilai yang Disepakati").
   ========================================================================== */

var ID_PESANAN = null; // diisi saat halaman dimuat, dipakai ulang oleh tombol Simpan

document.addEventListener('DOMContentLoaded', function () {
  ID_PESANAN = ambilIdDariUrl();

  if (!ID_PESANAN) {
    document.getElementById('isiDetailPesanan').innerHTML =
      '<p class="teks-redup">Parameter id tidak ditemukan di alamat halaman.</p>';
    return;
  }

  muatDetailPesanan();
});

function ambilIdDariUrl() {
  var parameter = new URLSearchParams(window.location.search);
  var nilai = parameter.get('id');
  return (nilai && /^[0-9]+$/.test(nilai)) ? nilai : null;
}

function muatDetailPesanan() {
  var wadah = document.getElementById('isiDetailPesanan');
  wadah.innerHTML = '<p class="teks-redup">Memuat detail pesanan...</p>';

  panggilApi('../api/admin/pesanan.php?id=' + ID_PESANAN)
    .then(function (pesanan) {
      gambarDetailPesanan(pesanan);
    })
    .catch(function (error) {
      wadah.innerHTML = '<p class="teks-redup">' + escapeHtml(error.message) + '</p>';
      tampilToast(error.message, 'error');
    });
}


/* ==========================================================================
   TAMPILAN UTAMA
   ========================================================================== */
function gambarDetailPesanan(pesanan) {
  var wadah = document.getElementById('isiDetailPesanan');

  var opsiStatus = ['menunggu', 'dikonfirmasi', 'selesai', 'batal'];
  var optionHtml = opsiStatus.map(function (nilai) {
    var terpilih = (nilai === pesanan.status) ? ' selected' : '';
    return '<option value="' + nilai + '"' + terpilih + '>' + labelStatus(nilai) + '</option>';
  }).join('');

  var tautanWa = pesanan.no_wa
    ? linkWhatsApp(pesanan.no_wa, 'Halo ' + pesanan.nama + ', kami dari For Us Picture terkait pesanan ' + pesanan.kode_pesanan + '.')
    : null;

  wadah.innerHTML =
    '<div class="card" style="padding: var(--jarak-4); margin-bottom: var(--jarak-5);">' +

      '<div class="flex-antar" style="margin-bottom: var(--jarak-3);">' +
        '<div>' +
          '<p class="teks-redup teks-kecil">Kode Pesanan</p>' +
          '<h2 style="font-size:28px; margin-top:4px;">' + escapeHtml(pesanan.kode_pesanan) + '</h2>' +
        '</div>' +
        '<span class="badge badge-' + pesanan.status + '" id="badgeStatusPesanan">' + labelStatus(pesanan.status) + '</span>' +
      '</div>' +

      '<hr class="garis" style="margin-bottom: var(--jarak-3);">' +

      barisInfo('Nama', escapeHtml(pesanan.nama)) +
      barisInfo('No. WhatsApp', escapeHtml(pesanan.no_wa) + (tautanWa ? ' &nbsp;<a class="btn-teks" href="' + tautanWa + '" target="_blank" rel="noopener">Hubungi</a>' : '')) +
      barisInfo('Email', pesanan.email ? escapeHtml(pesanan.email) : '<span class="teks-redup">-</span>') +
      barisInfo('Paket', escapeHtml(pesanan.nama_paket)) +
      barisInfo('Tanggal Acara', formatTanggal(pesanan.tanggal_acara) + (pesanan.jam ? ', ' + escapeHtml(pesanan.jam) : '')) +
      barisInfo('Lokasi', escapeHtml(pesanan.lokasi)) +
      barisInfo('Catatan', pesanan.catatan ? escapeHtml(pesanan.catatan) : '<span class="teks-redup">-</span>') +
      barisInfo('Total Harga', '<strong>' + formatRupiah(pesanan.total_harga) + '</strong>') +
      barisInfo('Dibuat Pada', formatTanggal(pesanan.dibuat_pada.split(' ')[0]) + ' ' + pesanan.dibuat_pada.split(' ')[1]) +

      '<hr class="garis" style="margin-block: var(--jarak-3);">' +

      '<div class="flex-antar">' +
        '<label class="label" for="selectStatusPesanan" style="margin-bottom:0;">Ubah Status Pesanan</label>' +
        '<div class="flex jarak-1">' +
          '<select class="select" id="selectStatusPesanan" style="width:auto; min-height:40px;">' + optionHtml + '</select>' +
          '<button type="button" class="btn btn-primary btn-kecil" id="tombolSimpanStatus">Simpan</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<h3 style="margin-bottom: var(--jarak-3);">Pembayaran</h3>' +
    '<div class="admin-tabel-bungkus" id="bungkusTabelBayar">' +
      '<table class="admin-tabel">' +
        '<thead><tr><th>Metode</th><th>Jenis</th><th>Jumlah</th><th>Status</th><th>Bukti</th><th></th></tr></thead>' +
        '<tbody id="tabelPembayaran"></tbody>' +
      '</table>' +
    '</div>' +
    '<div class="admin-kosong" id="kosongPembayaran" style="display:none;">' +
      '<p class="admin-kosong-judul">Belum ada pembayaran</p>' +
      '<p class="admin-kosong-teks">Pelanggan belum mengirim bukti pembayaran.</p>' +
    '</div>';

  gambarTabelPembayaran(pesanan.pembayaran);

  document.getElementById('tombolSimpanStatus').addEventListener('click', simpanStatusPesanan);
}

/** Satu baris "label kiri - nilai kanan" di kartu info pesanan. */
function barisInfo(label, nilaiHtml) {
  return '<div class="flex-antar" style="margin-bottom: var(--jarak-2); font-size:14px;">' +
    '<span class="teks-redup">' + label + '</span>' +
    '<span>' + nilaiHtml + '</span>' +
  '</div>';
}

function labelStatus(status) {
  return {
    menunggu: 'Menunggu',
    dikonfirmasi: 'Dikonfirmasi',
    selesai: 'Selesai',
    batal: 'Batal',
    terverifikasi: 'Terverifikasi',
    ditolak: 'Ditolak',
  }[status] || status;
}


/* ==========================================================================
   TABEL PEMBAYARAN
   ========================================================================== */
function gambarTabelPembayaran(daftarBayar) {
  var tbody = document.getElementById('tabelPembayaran');
  var bungkus = document.getElementById('bungkusTabelBayar');
  var kosong = document.getElementById('kosongPembayaran');

  if (daftarBayar.length === 0) {
    bungkus.style.display = 'none';
    kosong.style.display = 'block';
    return;
  }

  bungkus.style.display = 'block';
  kosong.style.display = 'none';

  var html = '';
  daftarBayar.forEach(function (bayar) {
    var tombolAksi = (bayar.status === 'menunggu')
      ? '<button type="button" class="admin-tabel-aksi" data-verifikasi="' + bayar.id + '">Verifikasi</button>' +
        ' &nbsp;<button type="button" class="admin-tabel-aksi" style="color: var(--warna-error);" data-tolak="' + bayar.id + '">Tolak</button>'
      : '';

    html += '<tr>' +
      '<td>' + labelMetode(bayar.metode) + '</td>' +
      '<td>' + (bayar.jenis === 'dp' ? 'DP' : 'Lunas') + '</td>' +
      '<td>' + formatRupiah(bayar.jumlah) + '</td>' +
      '<td><span class="badge badge-' + bayar.status + '">' + labelStatus(bayar.status) + '</span></td>' +
      '<td><a href="../../uploads/bukti-bayar/' + encodeURIComponent(bayar.bukti_bayar) + '" target="_blank" rel="noopener">Lihat bukti</a></td>' +
      '<td>' + tombolAksi + '</td>' +
    '</tr>';
  });

  tbody.innerHTML = html;

  tbody.querySelectorAll('[data-verifikasi]').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      simpanStatusPembayaran(tombol.getAttribute('data-verifikasi'), 'terverifikasi');
    });
  });
  tbody.querySelectorAll('[data-tolak]').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      simpanStatusPembayaran(tombol.getAttribute('data-tolak'), 'ditolak');
    });
  });
}

function labelMetode(metode) {
  return {
    transfer_bank: 'Transfer Bank',
    ewallet: 'E-Wallet',
    qris: 'QRIS',
  }[metode] || metode;
}


/* ==========================================================================
   AKSI: UBAH STATUS
   ========================================================================== */
function simpanStatusPesanan() {
  var select = document.getElementById('selectStatusPesanan');
  var tombol = document.getElementById('tombolSimpanStatus');
  var statusBaru = select.value;

  setMemuat(tombol, true, 'Menyimpan...');

  panggilApi('../api/admin/ubah-status.php', {
    method: 'POST',
    body: { target: 'pesanan', id: ID_PESANAN, status: statusBaru }
  })
    .then(function () {
      tampilToast('Status pesanan diperbarui', 'sukses');
      var badge = document.getElementById('badgeStatusPesanan');
      badge.className = 'badge badge-' + statusBaru;
      badge.textContent = labelStatus(statusBaru);
    })
    .catch(function (error) {
      tampilToast(error.message, 'error');
    })
    .finally(function () {
      setMemuat(tombol, false);
    });
}

/**
 * Dipakai tombol "Verifikasi" dan "Tolak" di tabel pembayaran. Setelah
 * berhasil, seluruh detail dimuat ULANG (bukan hanya ganti 1 baris) --
 * lebih sederhana, dan sekalian memastikan data lain tetap sinkron.
 */
function simpanStatusPembayaran(idPembayaran, statusBaru) {
  panggilApi('../api/admin/ubah-status.php', {
    method: 'POST',
    body: { target: 'pembayaran', id: idPembayaran, status: statusBaru }
  })
    .then(function () {
      tampilToast('Status pembayaran diperbarui', 'sukses');
      muatDetailPesanan();
    })
    .catch(function (error) {
      tampilToast(error.message, 'error');
    });
}