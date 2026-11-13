/* ==========================================================================
   js/bayar.js   (milik B)
   Letak file : frontend/js/bayar.js
   Dimuat di  : pembayaran.html SAJA, setelah config.js, util.js, api.js,
                ui.js, komponen.js

   [UBAH catatan penamaan] file HTML-nya bernama "pembayaran.html", tapi
   file JS ini bernama "bayar.js" (bukan "pembayaran.js") -- ini SENGAJA,
   sesuai nama yang sudah disepakati di ROADMAP.md ("B: Alur Pemesanan").
   Pastikan <script src="js/bayar.js" defer></script> di pembayaran.html
   cocok dengan nama file ini.

   TUGAS FILE INI
   1. Ambil data pesanan dari sessionStorage "pesananAktif" (disimpan oleh
      pemesanan.js). Kalau kosong, pelanggan membuka halaman ini langsung
      tanpa memesan dulu -> arahkan ke katalog.html.
   2. Isi ringkasan pesanan (kode, paket, tanggal, lokasi, total)
   3. Atur pilihan jenis bayar (DP/Lunas) dan kotak unggah bukti
   4. Submit form -> kirim FormData ke api/pembayaran/upload.php
   5. Kalau berhasil -> simpan status pembayaran, pindah ke konfirmasi.html
   ========================================================================== */

var PESANAN_AKTIF = null;

document.addEventListener('DOMContentLoaded', function () {
  PESANAN_AKTIF = ambilPesananAktif();

  if (!PESANAN_AKTIF) {
    tampilToast('Belum ada pesanan aktif, silakan pilih paket terlebih dahulu.', 'error');
    window.location.href = 'katalog.html';
    return;
  }

  gambarRingkasanPesanan(PESANAN_AKTIF);
  siapkanPilihanJenisBayar();
  siapkanKotakUnggah();
  siapkanFormPembayaran();
});

function ambilPesananAktif() {
  var mentah = sessionStorage.getItem('pesananAktif');
  if (!mentah) { return null; }

  try {
    return JSON.parse(mentah);
  } catch (e) {
    return null; // data rusak, dianggap sama seperti tidak ada
  }
}


/* ==========================================================================
   1 & 2. RINGKASAN PESANAN
   ========================================================================== */
function gambarRingkasanPesanan(pesanan) {
  document.getElementById('kodePesanan').textContent = pesanan.kode_pesanan;
  document.getElementById('namaPaket').textContent = pesanan.nama_paket;
  document.getElementById('tanggalAcara').textContent = formatTanggal(pesanan.tanggal_acara);
  document.getElementById('lokasiAcara').textContent = pesanan.lokasi;
  document.getElementById('totalHarga').textContent = formatRupiah(pesanan.total_harga);

  // Isi field tersembunyi yang akan ikut dikirim lewat FormData saat submit
  document.getElementById('kodePesananInput').value = pesanan.kode_pesanan;
}


/* ==========================================================================
   3. PILIHAN JENIS BAYAR (DP / Lunas)
   Radio-nya "hidden" (lihat pembayaran.html), yang terlihat pengguna
   adalah kartu .bayar-pilihan-kartu -- jadi kelas "aktif" dipindah manual
   lewat JS, mengikuti radio mana yang ter-checked.
   ========================================================================== */
function siapkanPilihanJenisBayar() {
  var kartuSemua = document.querySelectorAll('.bayar-pilihan-kartu');

  kartuSemua.forEach(function (kartu) {
    kartu.addEventListener('click', function () {
      kartuSemua.forEach(function (k) { k.classList.remove('aktif'); });
      kartu.classList.add('aktif');
      kartu.querySelector('input[type="radio"]').checked = true;
      aturJumlahSesuaiJenis();
    });
  });

  aturJumlahSesuaiJenis(); // isi awal, sesuai pilihan yang ter-checked (DP)
}

/* Batas jumlah untuk TAMPILAN saja. Angka yang sah dicek ulang di server
   (api/pembayaran/upload.php), dengan aturan yang sama:
   - DP    : minimal KONFIG.DP_MINIMAL_PERSEN% dari total, kurang dari total
   - Lunas : sama dengan total harga
   Halaman ini hanya dipakai tepat setelah memesan, jadi belum ada
   pembayaran lain dan sisa tagihan = total_harga. */
function hitungBatasJumlah() {
  var total = Number(PESANAN_AKTIF.total_harga) || 0;
  return {
    total: total,
    dpMinimal: Math.ceil(total * KONFIG.DP_MINIMAL_PERSEN / 100),
  };
}

function jenisTerpilih() {
  var radio = document.querySelector('input[name="jenis"]:checked');
  return radio ? radio.value : 'dp';
}

function aturJumlahSesuaiJenis() {
  var input = document.getElementById('jumlah');
  var bantuan = document.getElementById('bantuanJumlah');
  var keteranganDp = document.getElementById('keteranganDp');
  var batas = hitungBatasJumlah();

  if (keteranganDp) {
    keteranganDp.textContent = 'Minimal ' + KONFIG.DP_MINIMAL_PERSEN + '% (' + formatRupiah(batas.dpMinimal) + ')';
  }

  if (jenisTerpilih() === 'lunas') {
    input.value = batas.total;
    input.min = batas.total;
    input.max = batas.total;
    input.readOnly = true; // lunas selalu sebesar total, tidak perlu diketik
    if (bantuan) { bantuan.textContent = 'Pembayaran lunas sebesar total harga ' + formatRupiah(batas.total) + '.'; }
  } else {
    input.value = batas.dpMinimal;
    input.min = batas.dpMinimal;
    input.max = batas.total - 1;
    input.readOnly = false;
    if (bantuan) {
      bantuan.textContent = 'Minimal ' + formatRupiah(batas.dpMinimal) + ' (' + KONFIG.DP_MINIMAL_PERSEN +
        '%) dan kurang dari ' + formatRupiah(batas.total) + '. Boleh diubah.';
    }
  }
}

/** Mengembalikan pesan error, atau null kalau jumlah sudah sesuai aturan. */
function cekJumlahBayar() {
  var jumlah = parseInt(document.getElementById('jumlah').value, 10);
  var batas = hitungBatasJumlah();

  if (!jumlah || jumlah <= 0) {
    return 'Mohon isi jumlah yang dibayar.';
  }
  if (jenisTerpilih() === 'lunas') {
    return jumlah === batas.total ? null : 'Pembayaran lunas harus sebesar ' + formatRupiah(batas.total) + '.';
  }
  if (jumlah >= batas.total) {
    return 'Jumlah DP harus kurang dari ' + formatRupiah(batas.total) + '. Pilih Lunas untuk membayar penuh.';
  }
  if (jumlah < batas.dpMinimal) {
    return 'DP minimal ' + KONFIG.DP_MINIMAL_PERSEN + '% dari total (' + formatRupiah(batas.dpMinimal) + ').';
  }
  return null;
}


/* ==========================================================================
   4. KOTAK UNGGAH BUKTI BAYAR
   ========================================================================== */
function siapkanKotakUnggah() {
  var inputFile = document.getElementById('inputBukti');
  var dropzone = document.getElementById('dropzoneBukti');
  var htmlDropzoneAsli = dropzone.innerHTML; // disimpan untuk tombol "Hapus"

  inputFile.addEventListener('change', function () {
    var file = inputFile.files[0];
    if (!file) { return; }

    // Validasi di sisi pengguna, memakai nilai dari KONFIG (config.js)
    // supaya aturannya SATU TEMPAT dengan validasi server.
    if (KONFIG.TIPE_FILE_DIIZINKAN.indexOf(file.type) === -1) {
      tampilToast('Tipe file tidak diizinkan. Gunakan JPG, PNG, atau PDF.', 'error');
      inputFile.value = '';
      return;
    }
    if (file.size > KONFIG.UKURAN_FILE_MAKS) {
      tampilToast('Ukuran file maksimal 2 MB.', 'error');
      inputFile.value = '';
      return;
    }

    gambarPratinjauFile(file, dropzone, inputFile, htmlDropzoneAsli);
  });
}

function gambarPratinjauFile(file, dropzone, inputFile, htmlDropzoneAsli) {
  dropzone.innerHTML =
    '<div class="upload-pratinjau" style="width:100%;">' +
      '<span class="upload-pratinjau-nama">' + escapeHtml(file.name) + '</span>' +
      '<button type="button" class="upload-pratinjau-hapus" id="hapusBukti">Hapus</button>' +
    '</div>';

  // dropzone adalah <label for="inputBukti">; klik di dalamnya BIASANYA
  // otomatis membuka file picker lagi -- tombol "Hapus" perlu
  // stopPropagation supaya klik "Hapus" tidak ikut membuka file picker.
  document.getElementById('hapusBukti').addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    inputFile.value = '';
    dropzone.innerHTML = htmlDropzoneAsli;
  });
}


/* ==========================================================================
   5. SUBMIT FORM PEMBAYARAN
   ========================================================================== */
function siapkanFormPembayaran() {
  var form = document.getElementById('formPembayaran');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var kotakError = document.getElementById('pesanErrorBayar');
    kotakError.style.display = 'none';

    var errorJumlah = cekJumlahBayar();
    if (errorJumlah) {
      kotakError.textContent = errorJumlah;
      kotakError.style.display = 'flex';
      return;
    }

    var inputFile = document.getElementById('inputBukti');
    if (!inputFile.files[0]) {
      kotakError.textContent = 'Mohon unggah bukti pembayaran terlebih dahulu.';
      kotakError.style.display = 'flex';
      return;
    }

    // FormData dibangun langsung dari <form>, otomatis mengambil SEMUA
    // field ber-"name" di dalamnya (kode_pesanan, jenis, metode, jumlah,
    // bukti) -- sesuai contoh di API.md bagian 6.
    var formData = new FormData(form);

    var tombol = document.getElementById('tombolKirimBukti');
    setMemuat(tombol, true, 'Mengirim...');

    panggilApi('../api/pembayaran/upload.php', {
      method: 'POST',
      body: formData
    })
      .then(function (hasilBayar) {
        // Gabungkan info pembayaran ke data pesanan yang sudah ada,
        // supaya konfirmasi.js bisa menampilkan status pembayaran juga.
        PESANAN_AKTIF.status_pembayaran = hasilBayar.status;
        sessionStorage.setItem('pesananAktif', JSON.stringify(PESANAN_AKTIF));
        window.location.href = 'konfirmasi.html';
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