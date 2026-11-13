/* ==========================================================================
   js/konfirmasi.js   (milik B)
   Letak file : frontend/js/konfirmasi.js
   Dimuat di  : konfirmasi.html SAJA, setelah config.js, util.js, api.js,
                ui.js, komponen.js

   TUGAS FILE INI
   Halaman ini TIDAK memanggil API sama sekali -- tidak ada endpoint
   "cek status pesanan" untuk pelanggan (keputusan kelompok, lihat
   API.md 4.4 "Catatan alur status"). Semua data yang ditampilkan di sini
   datang dari sessionStorage "pesananAktif", yang sudah diisi bertahap:
     - oleh pemesanan.js  -> data pesanan (kode, nama, paket, tanggal, dst)
     - lalu ditambah oleh bayar.js -> status_pembayaran

   Kalau sessionStorage kosong (pelanggan buka halaman ini langsung tanpa
   lewat alur pemesanan), arahkan ke katalog.html, sama seperti bayar.js.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  var pesanan = ambilPesananAktif();

  if (!pesanan) {
    tampilToastSetelahPindah('Belum ada pesanan aktif, silakan pilih paket terlebih dahulu.', 'error');
    window.location.href = 'katalog.html';
    return;
  }

  gambarKonfirmasi(pesanan);

  // Pesanan ini sudah sampai ke halaman terakhir -> sessionStorage boleh
  // dibersihkan, supaya kalau pelanggan menekan "pesan lagi" nanti, tidak
  // ada sisa data pesanan sebelumnya yang nyangkut.
  sessionStorage.removeItem('pesananAktif');
});

function ambilPesananAktif() {
  var mentah = sessionStorage.getItem('pesananAktif');
  if (!mentah) { return null; }

  try {
    return JSON.parse(mentah);
  } catch (e) {
    return null;
  }
}

function gambarKonfirmasi(pesanan) {
  document.getElementById('kodePesanan').textContent = pesanan.kode_pesanan;
  document.getElementById('namaPemesan').textContent = pesanan.nama;
  document.getElementById('namaPaket').textContent = pesanan.nama_paket;
  document.getElementById('tanggalAcara').textContent = formatTanggal(pesanan.tanggal_acara);

  gambarBadgeStatusBayar(pesanan.status_pembayaran);
  siapkanTombolWhatsApp(pesanan);
}

/* Badge status pembayaran, isinya mengikuti status yang dikirim balik oleh
   api/pembayaran/upload.php (lihat bayar.js) -- hanya ada satu kemungkinan
   di titik ini, yaitu "menunggu" (baru diverifikasi admin, lihat
   pesanan-detail.js), tapi ditulis lengkap supaya aman kalau nanti alurnya
   berubah. */
function gambarBadgeStatusBayar(status) {
  var elemen = document.getElementById('statusBayar');
  var labelPerStatus = {
    menunggu: 'Menunggu Verifikasi',
    terverifikasi: 'Terverifikasi',
    ditolak: 'Ditolak',
  };

  elemen.textContent = labelPerStatus[status] || 'Menunggu Verifikasi';
  elemen.className = 'badge badge-' + (status || 'menunggu');
}

/* Link WhatsApp dibuat dari KONFIG.NOMOR_WA_ADMIN + pesan otomatis yang
   sudah berisi kode pesanan, supaya admin langsung tahu pesanan mana yang
   dimaksud tanpa pelanggan perlu mengetik ulang. */
function siapkanTombolWhatsApp(pesanan) {
  var tombol = document.getElementById('tombolWhatsApp');
  if (!tombol) { return; }

  var pesanWa =
    'Halo, saya ' + pesanan.nama + ' sudah melakukan pemesanan dengan kode ' +
    pesanan.kode_pesanan + ' untuk paket ' + pesanan.nama_paket +
    ' pada tanggal ' + formatTanggal(pesanan.tanggal_acara) +
    '. Mohon bantu konfirmasi ya, terima kasih.';

  tombol.href = linkWhatsApp(KONFIG.NOMOR_WA_ADMIN, pesanWa);
}