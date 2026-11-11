# Website Jasa Foto & Video

Website pemesanan jasa foto dan video (wedding, wisuda, event). Pelanggan dapat melihat katalog paket, memesan, dan mengunggah bukti pembayaran. Admin dapat mengelola paket dan pesanan lewat panel admin.

Proyek mata kuliah Sistem Operasi.

## Teknologi

- **Backend:** PHP (PDO) dengan REST API yang mengembalikan JSON
- **Database:** MySQL / MariaDB
- **Frontend:** HTML, CSS, dan JavaScript biasa (tanpa framework)
- **Server lokal:** XAMPP (Apache + MySQL)

## Struktur Proyek

```
├── API.md          Kontrak API: endpoint, format respons, riwayat perubahan
├── api/            Backend PHP
│   ├── config/     koneksi.php, response.php, auth.php (dipakai bersama)
│   ├── kategori/   Daftar kategori
│   ├── paket/      Daftar dan detail paket
│   ├── pesanan/    Membuat pesanan
│   ├── pembayaran/ Unggah bukti bayar
│   └── admin/      Login, logout, kelola paket dan pesanan (perlu login)
├── database/       db_foto_video.sql (skema dan data awal)
├── frontend/       Antarmuka pengguna dan admin
│   ├── *.html      Halaman pelanggan
│   ├── admin/      Halaman admin
│   ├── komponen/   Navbar, footer, sidebar admin (dimuat ulang di tiap halaman)
│   ├── css/        style.css, form.css, admin.css, admin-paket.css
│   └── js/         Logika halaman; js/admin/ untuk halaman admin
└── uploads/        File unggahan (foto paket, bukti bayar)
```

### Backend (`api/`)

| File | Fungsi |
|---|---|
| `config/koneksi.php` | Membuka koneksi database |
| `config/response.php` | `kirim_sukses()` dan `kirim_error()` dengan format JSON baku |
| `config/auth.php` | `cek_login()`: mengembalikan 401 jika admin belum login |
| `ping.php` | Mengecek apakah API berjalan |
| `kategori/list.php` | Daftar kategori |
| `paket/list.php`, `paket/detail.php` | Daftar paket dan detail satu paket |
| `pesanan/buat.php` | Membuat pesanan baru |
| `pembayaran/upload.php` | Menerima unggahan bukti bayar |
| `admin/login.php`, `admin/logout.php` | Mengatur session admin |
| `admin/paket.php` | Mengelola paket (CRUD) |
| `admin/pesanan.php` | Melihat daftar dan detail pesanan |
| `admin/ubah-status.php` | Mengubah status pesanan |

Semua respons memakai format:

```json
{ "status": "success", "message": "OK", "data": {} }
```

Detail parameter dan contoh respons tiap endpoint ada di [API.md](API.md).

### Frontend (`frontend/`)

| Halaman | Fungsi | JS |
|---|---|---|
| `index.html` | Beranda | `komponen.js` |
| `katalog.html` | Daftar paket | `katalog.js` |
| `pemesanan.html` | Form pemesanan | `pemesanan.js` |
| `pembayaran.html` | Unggah bukti bayar | `bayar.js` |
| `konfirmasi.html` | Konfirmasi pesanan | `konfirmasi.js` |
| `admin/login.html` | Login admin | `admin/login.js` |
| `admin/dashboard.html` | Dashboard admin | `admin/dashboard.js` |
| `admin/paket.html`, `admin/paket-form.html` | Daftar dan form paket | `admin/paket.js`, `admin/paket-form.js` |
| `admin/pesanan.html`, `admin/pesanan-detail.html` | Daftar dan detail pesanan | `admin/pesanan.js`, `admin/pesanan-detail.js` |

File JS bersama, dimuat berurutan di setiap halaman:

1. `config.js`: konstanta (nomor WhatsApp admin, batas ukuran file, dll.)
2. `util.js`: fungsi bantu (format tanggal, rupiah, dll.)
3. `api.js`: satu pintu untuk semua `fetch` ke backend
4. `ui.js`: komponen tampilan umum (notifikasi, loading)
5. `komponen.js`: memuat navbar dan footer, menandai menu aktif, menu mobile

## Database

`database/db_foto_video.sql` membuat lima tabel: `admin`, `kategori`, `paket`, `pesanan`, dan `pembayaran`, lengkap dengan data awal (termasuk satu akun admin).

## Cara Menjalankan

1. Pasang [XAMPP](https://www.apachefriends.org/) lalu jalankan **Apache** dan **MySQL**.
2. Letakkan proyek di `C:\xampp\htdocs\Website_Jasa_PhotoVideo_SistemOperasi`.
3. Buka phpMyAdmin (`http://localhost/phpmyadmin`), buat database bernama `db_foto_video`, lalu impor `database/db_foto_video.sql`.
4. Jika kredensial MySQL berbeda dari bawaan XAMPP (`root` tanpa password), ubah `api/config/koneksi.php`.
5. Buka di browser:
   - Situs pelanggan: `http://localhost/Website_Jasa_PhotoVideo_SistemOperasi/frontend/`
   - Panel admin: `http://localhost/Website_Jasa_PhotoVideo_SistemOperasi/frontend/admin/login.html`
   - Cek API: `http://localhost/Website_Jasa_PhotoVideo_SistemOperasi/api/ping.php`

Username admin bawaan dari data awal adalah `admin`. Ganti password-nya sebelum situs dipakai di luar lingkungan pengembangan.

Folder `uploads/` harus dapat ditulis oleh Apache agar unggahan bukti bayar dan foto paket tersimpan. Isi `uploads/bukti-bayar/` tidak ikut di-commit (lihat `.gitignore`).

## Alur Penggunaan

1. Pelanggan membuka katalog, lalu memilih paket.
2. Pelanggan mengisi form pemesanan (`pesanan/buat.php`).
3. Pelanggan mengunggah bukti bayar (`pembayaran/upload.php`).
4. Admin login, memeriksa pesanan, dan mengubah statusnya (`admin/ubah-status.php`).

## Aturan Kerja Tim

- Setiap perubahan endpoint (nama, parameter, bentuk respons) harus dicatat di bagian **Riwayat Perubahan** pada [API.md](API.md).
- Fitur dikerjakan di branch terpisah (misalnya `fitur-katalog`, `fitur-pemesanan`) lalu digabung ke `main` lewat pull request.
