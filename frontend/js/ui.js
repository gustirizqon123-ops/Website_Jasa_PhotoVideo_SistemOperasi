/* ==========================================================================
   js/ui.js   (milik A)
   Letak file : frontend/js/ui.js
   Dimuat di  : SEMUA halaman yang memakai toast/modal/state tombol
                (hampir semua), SETELAH config.js/util.js/api.js,
                SEBELUM komponen.js dan file JS halaman

   TUGAS FILE INI
   Kumpulan fungsi yang mengubah TAMPILAN (DOM): toast notifikasi, buka
   dan tutup modal, tombol dalam keadaan "memuat" (loading), serta
   menampilkan/menyembunyikan pesan error di bawah input form. Ini fungsi
   yang dipanggil file JS halaman seperti pemesanan.js, login.js, dst.

   Kelas HTML yang dipakai fungsi-fungsi ini sudah ada di css/style.css:
   .toast-wadah, .toast, .toast-sukses, .toast-error, .modal-lapisan,
   .input-error, .pesan-error.
   ========================================================================== */


/**
 * Menampilkan notifikasi kecil di pojok kanan bawah, hilang otomatis
 * setelah KONFIG.DURASI_TOAST milidetik.
 *
 * tampilToast('Pesanan berhasil dibuat')              -> toast netral (gelap)
 * tampilToast('Tersimpan!', 'sukses')                 -> toast hijau
 * tampilToast('Tanggal sudah dipesan', 'error')       -> toast merah
 *
 * Elemen wadah (<div class="toast-wadah" id="toastWadah">) dibuat otomatis
 * kalau belum ada di halaman -- jadi halaman HTML TIDAK WAJIB menaruhnya
 * sendiri, cukup panggil fungsi ini.
 */
function tampilToast(pesan, jenis) {
  var wadah = document.getElementById('toastWadah');

  if (!wadah) {
    wadah = document.createElement('div');
    wadah.className = 'toast-wadah';
    wadah.id = 'toastWadah';
    document.body.appendChild(wadah);
  }

  var toast = document.createElement('div');
  toast.className = 'toast';
  if (jenis === 'sukses') { toast.classList.add('toast-sukses'); }
  if (jenis === 'error') { toast.classList.add('toast-error'); }

  // .textContent (bukan innerHTML) -> otomatis aman dari suntikan HTML,
  // tidak perlu escapeHtml() di sini.
  toast.textContent = pesan;

  wadah.appendChild(toast);

  setTimeout(function () {
    toast.remove();
  }, KONFIG.DURASI_TOAST);
}


/**
 * Membuka modal. Menambahkan kelas "tampil" ke .modal-lapisan sesuai id
 * yang diberikan (lihat struktur modal di css/style.css bagian 10).
 *
 * bukaModal('modal-detail')
 */
function bukaModal(id) {
  var lapisan = document.getElementById(id);
  if (!lapisan) {
    console.error('bukaModal: elemen dengan id "' + id + '" tidak ditemukan');
    return;
  }
  lapisan.classList.add('tampil');
}


/**
 * Menutup modal. Kebalikan dari bukaModal().
 *
 * tutupModal('modal-detail')
 */
function tutupModal(id) {
  var lapisan = document.getElementById(id);
  if (!lapisan) { return; }
  lapisan.classList.remove('tampil');
}


/**
 * Menyiapkan SEMUA modal di halaman supaya bisa ditutup dengan cara wajar:
 * klik tombol ber-atribut data-tutup-modal, klik di luar kotak modal
 * (area gelap), atau menekan tombol Escape. Panggil sekali saja per
 * halaman, biasanya di dalam DOMContentLoaded file JS halaman.
 *
 * Markup yang dikenali:
 *   <div class="modal-lapisan" id="modal-detail"> ... </div>
 *   <button data-tutup-modal="modal-detail">Tutup</button>
 */
function siapkanSemuaModal() {
  document.querySelectorAll('.modal-lapisan').forEach(function (lapisan) {
    // klik di area gelap (bukan di dalam kotak .modal) -> tutup
    lapisan.addEventListener('click', function (e) {
      if (e.target === lapisan) { lapisan.classList.remove('tampil'); }
    });
  });

  document.querySelectorAll('[data-tutup-modal]').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      tutupModal(tombol.getAttribute('data-tutup-modal'));
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    document.querySelectorAll('.modal-lapisan.tampil').forEach(function (lapisan) {
      lapisan.classList.remove('tampil');
    });
  });
}


/**
 * Mengubah tombol menjadi keadaan "sedang memuat": dinonaktifkan dan
 * tulisannya diganti sementara, supaya pengguna tidak klik dua kali saat
 * menunggu respons API (contoh: submit form pemesanan).
 *
 * setMemuat(tombolSubmit, true, 'Menyimpan...')   -> nonaktif, teks berubah
 * setMemuat(tombolSubmit, false)                  -> aktif lagi, teks balik
 */
function setMemuat(tombol, aktif, teksSementara) {
  if (!tombol) { return; }

  if (aktif) {
    // Simpan teks asli di atribut data-*, supaya bisa dikembalikan nanti
    // tanpa file JS halaman perlu mengingat teks aslinya sendiri.
    if (!tombol.hasAttribute('data-teks-asli')) {
      tombol.setAttribute('data-teks-asli', tombol.textContent);
    }
    tombol.disabled = true;
    tombol.textContent = teksSementara || 'Memproses...';
  } else {
    tombol.disabled = false;
    if (tombol.hasAttribute('data-teks-asli')) {
      tombol.textContent = tombol.getAttribute('data-teks-asli');
      tombol.removeAttribute('data-teks-asli');
    }
  }
}


/**
 * Menampilkan pesan error di bawah satu field form, memakai kelas
 * .input-error dan .pesan-error yang sudah ada di css/style.css.
 * Dipakai untuk validasi (format WhatsApp salah, dll) maupun error dari
 * server yang menunjuk ke field tertentu.
 *
 * Markup yang dibutuhkan (WAJIB ada manual di HTML, fungsi ini tidak
 * membuat elemen baru -- hanya mengisi yang sudah ada):
 *   <input class="input" id="noWa" ...>
 *   <p class="pesan-error" id="errorNoWa" hidden></p>
 *
 * tampilErrorField('noWa', 'errorNoWa', 'Format nomor WhatsApp tidak valid')
 */
function tampilErrorField(idInput, idPesan, pesan) {
  var input = document.getElementById(idInput);
  var elemenPesan = document.getElementById(idPesan);

  if (input) { input.classList.add('input-error'); }
  if (elemenPesan) {
    elemenPesan.textContent = pesan;
    elemenPesan.hidden = false;
  }
}


/**
 * Membersihkan error pada satu field (kebalikan dari tampilErrorField()).
 * Panggil ini di awal validasi/submit, sebelum mengecek ulang semua field,
 * supaya error lama tidak menumpuk.
 *
 * sembunyikanErrorField('noWa', 'errorNoWa')
 */
function sembunyikanErrorField(idInput, idPesan) {
  var input = document.getElementById(idInput);
  var elemenPesan = document.getElementById(idPesan);

  if (input) { input.classList.remove('input-error'); }
  if (elemenPesan) { elemenPesan.hidden = true; }
}


/* [TAMBAH] fungsi tampilan lain yang dipakai lebih dari satu halaman,
   taruh di sini -- misalnya nanti dibutuhkan fungsi konfirmasi sebelum
   hapus (dipakai di Kelola Paket milik A dan Daftar Pesanan milik C). */