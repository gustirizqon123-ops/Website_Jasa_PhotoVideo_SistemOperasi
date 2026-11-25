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

  tombol.href = linkWhatsApp(KONFIG.NOMOR_WA_ADMIN, susunPesanWhatsApp(pesanan));
}

/* Pesan WhatsApp ke admin berbentuk daftar (format disetujui kelompok
   2026-11-25). Kolom yang kosong ditulis "-". Baris Lokasi berisi apa yang
   pelanggan tulis sendiri (alamat + link Google Maps), tidak dipisah kolom.
   Baris terakhir menyesuaikan pilihan pembayaran pelanggan (DP / Lunas). */
function susunPesanWhatsApp(pesanan) {
  function isi(nilai) {
    var teks = (nilai === undefined || nilai === null) ? '' : String(nilai).trim();
    return teks === '' ? '-' : teks;
  }

  var barisBayar = 'Saya sudah melakukan pembayaran.';
  if (pesanan.jenis_pembayaran === 'dp') {
    barisBayar = 'Saya sudah melakukan pembayaran DP sebesar ' + formatRupiah(pesanan.jumlah_pembayaran) +
      ' (dari total ' + formatRupiah(pesanan.total_harga) + ') lewat QRIS.';
  } else if (pesanan.jenis_pembayaran === 'lunas') {
    barisBayar = 'Saya sudah melakukan pembayaran Lunas sebesar ' + formatRupiah(pesanan.jumlah_pembayaran) + ' lewat QRIS.';
  }

  return [
    'Halo For Us Picture.',
    'Berikut adalah detail pemesanan saya',
    '',
    'Kode Pesanan : ' + isi(pesanan.kode_pesanan),
    'Paket : ' + isi(pesanan.nama_paket),
    'Nama : ' + isi(pesanan.nama),
    'Nomor WhatsApp : ' + isi(pesanan.no_wa),
    'Email : ' + isi(pesanan.email),
    '',
    'Detail Acara',
    'Tanggal Acara : ' + isi(formatTanggal(pesanan.tanggal_acara)),
    'Jam : ' + isi(pesanan.jam),
    'Lokasi Acara : ' + isi(pesanan.lokasi),
    'Catatan : ' + isi(pesanan.catatan),
    '',
    barisBayar
  ].join('\n');
}