# API Contract: Website Pemesanan Jasa Foto & Video

> **Status:** DRAFT untuk ditinjau bertiga. Setelah disetujui, file ini menjadi acuan resmi.
> **Aturan:** setiap perubahan endpoint (nama, parameter, bentuk respons) harus diumumkan di grup dan dicatat di bagian **Riwayat Perubahan** di bawah.

## Daftar Isi

1. [Aturan Umum](#1-aturan-umum)
2. [Nilai yang Disepakati](#2-nilai-yang-disepakati)
3. [Ringkasan Endpoint](#3-ringkasan-endpoint)
4. [Endpoint Publik (A dan B)](#4-endpoint-publik)
5. [Endpoint Admin (C)](#5-endpoint-admin)
6. [Contoh Memanggil dari JavaScript](#6-contoh-memanggil-dari-javascript)
7. [Catatan untuk Pembuat API](#7-catatan-untuk-pembuat-api)
8. [Hal yang Perlu Diputuskan Bersama](#8-hal-yang-perlu-diputuskan-bersama)
9. [Riwayat Perubahan](#9-riwayat-perubahan)

---

## 1. Aturan Umum

### Alamat dasar

Frontend dan API berada dalam satu proyek di `htdocs`, jadi memakai alamat yang sama (`localhost`).

| Dari file | Alamat API |
|---|---|
| `frontend/*.html` | `../api/...` |
| `frontend/admin/*.html` | `../../api/...` |
| Uji lewat browser atau Thunder Client | `http://localhost/Website_Jasa_PhotoVideo_SistemOperasi/api/...` |

### Format respons (semua endpoint)

Sukses:

```json
{ "status": "success", "message": "OK", "data": { } }
```

Gagal:

```json
{ "status": "error", "message": "Penjelasan singkat dalam bahasa Indonesia", "data": null }
```

Frontend cukup memeriksa `status`. Jika `error`, tampilkan `message` ke pengguna.

### Kode HTTP

| Kode | Arti | Contoh |
|---|---|---|
| 200 | Berhasil | Data berhasil diambil |
| 201 | Berhasil dibuat | Pesanan baru tersimpan |
| 400 | Input tidak valid | Field wajib kosong, format salah |
| 401 | Belum login | Endpoint admin dipanggil tanpa session |
| 404 | Tidak ditemukan | Paket atau pesanan tidak ada |
| 405 | Method salah | GET dikirim ke endpoint yang meminta POST |
| 409 | Bentrok | Tanggal sudah dipesan, paket masih dipakai pesanan |
| 500 | Kesalahan server | Koneksi database gagal |

### Format data

| Jenis | Format | Contoh |
|---|---|---|
| Tanggal | `YYYY-MM-DD` | `2026-12-20` |
| Jam | `HH:MM` | `09:30` |
| Tanggal dan jam (dari server) | `YYYY-MM-DD HH:MM:SS` | `2026-11-09 14:30:00` |
| Harga dan jumlah | Angka bulat rupiah, **tanpa** titik atau teks "Rp" | `3500000` |
| Nama field | `snake_case` huruf kecil | `kode_pesanan` |
| Nomor WhatsApp | Angka saja, diawali `08` atau `62`, 9-15 digit | `081234567890` |
| Gambar | Hanya **nama file** (bukan path) | `wedding-silver.jpg` |

### Cara mengirim data

| Jenis endpoint | Cara kirim |
|---|---|
| GET | Parameter di URL: `?id=3` |
| POST biasa | JSON di body, header `Content-Type: application/json` |
| POST dengan file (upload) | `FormData`, **jangan** isi `Content-Type` manual |

### Autentikasi admin

Login memakai **session PHP**. Browser mengirim cookie session otomatis pada `fetch()` ke alamat yang sama. Semua endpoint admin (bagian 5, kecuali `login.php`) wajib mengecek login dan mengembalikan **401** jika belum login:

```json
{ "status": "error", "message": "Silakan login terlebih dahulu", "data": null }
```

Frontend admin yang menerima 401 harus mengarahkan pengguna ke halaman login.

---

## 2. Nilai yang Disepakati

Teks di bawah ditulis **persis seperti ini** (huruf kecil, tanpa spasi) di database, API, dan frontend.

| Field | Nilai yang diizinkan |
|---|---|
| `pesanan.status` | `menunggu`, `dikonfirmasi`, `selesai`, `batal` |
| `pembayaran.status` | `menunggu`, `terverifikasi`, `ditolak` |
| `pembayaran.jenis` | `dp`, `lunas` |
| `pembayaran.metode` | `transfer_bank`, `ewallet`, `qris` |

Tampilan teks untuk pengguna (misalnya `transfer_bank` menjadi "Transfer Bank") diatur di frontend.

---

## 3. Ringkasan Endpoint

| No | Endpoint | Method | Fungsi | Login | Pemilik |
|---|---|---|---|---|---|
| 1 | `api/paket/list.php` | GET | Daftar paket | Tidak | A |
| 2 | `api/paket/detail.php` | GET | Detail satu paket | Tidak | A |
| ~~3~~ | ~~`api/pesanan/status.php`~~ | ~~GET~~ | **Dihapus 2026-11-12** (tidak ada halaman Cek Status, lihat 4.3) | | |
| 4 | `api/pesanan/buat.php` | POST | Simpan pesanan baru | Tidak | B |
| 5 | `api/pembayaran/upload.php` | POST | Kirim bukti pembayaran | Tidak | B |
| 6 | `api/admin/login.php` | POST | Login admin | Tidak | C |
| 7 | `api/admin/logout.php` | POST | Keluar | Ya | C |
| 8 | `api/admin/pesanan.php` | GET | Daftar dan detail pesanan | Ya | C |
| 9 | `api/admin/ubah-status.php` | POST | Ubah status pesanan atau pembayaran | Ya | C |
| 10 | `api/admin/paket.php` | POST | Tambah, ubah, hapus paket | Ya | C |
| 11 | `api/kategori/list.php` | GET | Daftar kategori | Tidak | A |
| 12 | `api/admin/catat-pembayaran.php` | POST | Admin mencatat pembayaran (pelunasan / bukti ulang via WhatsApp) | Ya | C |

---

## 4. Endpoint Publik

### 4.1 GET `api/paket/list.php`

**Pemilik:** A | **Dipakai oleh:** halaman Katalog

Mengambil daftar paket, bisa difilter per kategori.

**Parameter (query):**

| Nama | Wajib | Tipe | Keterangan |
|---|---|---|---|
| `kategori` | Tidak | angka | `id` kategori. Jika kosong, semua paket ditampilkan |

**Contoh permintaan:** `api/paket/list.php?kategori=1`

**Respons sukses (200):**

```json
{
  "status": "success",
  "message": "OK",
  "data": [
    {
      "id": 1,
      "kategori_id": 1,
      "kategori": "Wedding",
      "nama": "Wedding Silver",
      "deskripsi": "Dokumentasi foto 6 jam, 1 fotografer, 100 foto edit",
      "harga": 3500000,
      "gambar": "wedding-silver.jpg"
    }
  ]
}
```

Jika tidak ada paket, `data` berupa array kosong `[]` (tetap `success`).

**Kemungkinan error:** 400 (`kategori` bukan angka), 405, 500.

---

### 4.2 GET `api/paket/detail.php`

**Pemilik:** A | **Dipakai oleh:** modal detail paket di Katalog, halaman Pemesanan (ringkasan paket)

**Parameter (query):**

| Nama | Wajib | Tipe | Keterangan |
|---|---|---|---|
| `id` | Ya | angka | `id` paket |

**Contoh permintaan:** `api/paket/detail.php?id=1`

**Respons sukses (200):**

```json
{
  "status": "success",
  "message": "OK",
  "data": {
    "id": 1,
    "kategori_id": 1,
    "kategori": "Wedding",
    "nama": "Wedding Silver",
    "deskripsi": "Dokumentasi foto 6 jam, 1 fotografer, 100 foto edit",
    "harga": 3500000,
    "gambar": "wedding-silver.jpg"
  }
}
```

**Kemungkinan error:**

| Kode | Pesan |
|---|---|
| 400 | `Parameter id wajib berupa angka` |
| 404 | `Paket tidak ditemukan` |

---

### 4.3 ~~GET `api/pesanan/status.php`~~ (dihapus)

> **Dihapus 2026-11-12.** Kelompok memutuskan tidak ada halaman Cek Status
> untuk pelanggan: perkembangan pesanan dikabarkan admin lewat WhatsApp, dan
> pelunasan / bukti ulang dicatat admin lewat `api/admin/catat-pembayaran.php`
> (5.6). Endpoint ini tidak pernah dipakai halaman mana pun. Kodenya masih
> bisa dilihat di riwayat Git kalau suatu saat dibutuhkan lagi.

---

### 4.4 POST `api/pesanan/buat.php`

**Pemilik:** B | **Dipakai oleh:** halaman Pemesanan

Menyimpan pesanan baru dengan status awal `menunggu`, lalu membuat kode pesanan (`FV-` diikuti `id` pesanan 4 digit).

**Body (JSON):**

| Field | Wajib | Tipe | Aturan |
|---|---|---|---|
| `paket_id` | Ya | angka | Harus ada di tabel `paket` |
| `nama` | Ya | teks | Maksimal 100 karakter |
| `no_wa` | Ya | teks | Format nomor WhatsApp (lihat bagian 1) |
| `email` | Tidak | teks | Jika diisi, harus format email valid |
| `tanggal_acara` | Ya | teks | `YYYY-MM-DD`, tidak boleh tanggal yang sudah lewat |
| `jam` | Tidak | teks | `HH:MM` |
| `lokasi` | Ya | teks | Maksimal 255 karakter |
| `catatan` | Tidak | teks | Teks bebas |

**Contoh body:**

```json
{
  "paket_id": 1,
  "nama": "Budi Santoso",
  "no_wa": "081234567890",
  "email": "budi@example.com",
  "tanggal_acara": "2026-12-20",
  "jam": "09:30",
  "lokasi": "Gedung Serbaguna, Banjarbaru",
  "catatan": "Tema putih dan emas"
}
```

**Respons sukses (201):**

```json
{
  "status": "success",
  "message": "Pesanan berhasil dibuat",
  "data": {
    "kode_pesanan": "FV-0012",
    "nama": "Budi Santoso",
    "no_wa": "081234567890",
    "paket_id": 1,
    "nama_paket": "Wedding Silver",
    "tanggal_acara": "2026-12-20",
    "jam": "09:30",
    "lokasi": "Gedung Serbaguna, Banjarbaru",
    "total_harga": 3500000,
    "status": "menunggu"
  }
}
```

`total_harga` disalin dari harga paket **pada saat pesanan dibuat**, bukan dikirim oleh frontend.

**Kemungkinan error:**

| Kode | Pesan |
|---|---|
| 400 | `Field wajib belum lengkap` / `Format nomor WhatsApp tidak valid` / `Tanggal acara tidak boleh di masa lalu` |
| 404 | `Paket tidak ditemukan` |
| 409 | `Tanggal tersebut sudah dipesan, silakan pilih tanggal lain` |
| 405, 500 | Standar |

**Aturan bentrok tanggal:** tanggal dianggap sudah dipesan jika ada pesanan lain dengan `tanggal_acara` yang sama **dan** status bukan `batal`.

**Catatan WhatsApp:** pesan otomatis ke WhatsApp admin disusun oleh **frontend** di halaman Konfirmasi memakai data respons ini. API tidak menyusun pesan.

---

### 4.5 POST `api/pembayaran/upload.php`

**Pemilik:** B | **Dipakai oleh:** halaman Pembayaran

Menyimpan data pembayaran beserta file bukti. Mengirim file, jadi memakai **`FormData`**, bukan JSON.

**Body (`multipart/form-data`):**

| Field | Wajib | Tipe | Aturan |
|---|---|---|---|
| `kode_pesanan` | Ya | teks | Harus ada di tabel `pesanan` |
| `metode` | Ya | teks | `transfer_bank`, `ewallet`, atau `qris` |
| `jenis` | Ya | teks | `dp` atau `lunas` |
| `jumlah` | Ya | angka | Lebih dari 0, lalu mengikuti aturan DP/Lunas di bawah |
| `bukti` | Ya | file | JPG, PNG, atau PDF, maksimal 2 MB |

**Aturan jumlah DP / Lunas** (ditambahkan 2026-11-14):

*Sisa tagihan* = `total_harga` dikurangi pembayaran yang sudah `terverifikasi`. Untuk pesanan baru, sisa tagihan sama dengan `total_harga`.

| Jenis | Aturan `jumlah` |
|---|---|
| `lunas` | Harus **sama dengan** sisa tagihan |
| `dp` | Minimal **50%** dari `total_harga` (dibulatkan ke atas) dan **kurang dari** sisa tagihan |

Persentase DP disimpan di `DP_MINIMAL_PERSEN` (`api/config/pesanan.php`) dan `KONFIG.DP_MINIMAL_PERSEN` (`frontend/js/config.js`). Kedua nilai itu harus sama. Aturan ini hanya berlaku untuk pembayaran dari pelanggan. Pembayaran yang dicatat admin (5.6) cukup tidak melebihi sisa tagihan.

**Aturan penyimpanan file:**

- Disimpan di `uploads/bukti-bayar/`
- Nama file diganti acak (misalnya `bukti_67a3f9c2e1.jpg`), nama asli dari pengguna tidak dipakai
- Tipe file dicek di server (bukan hanya dari ekstensi)
- Nama file yang disimpan di database hanya nama file, tanpa path

**Respons sukses (201):**

```json
{
  "status": "success",
  "message": "Bukti pembayaran berhasil dikirim",
  "data": {
    "pembayaran_id": 7,
    "kode_pesanan": "FV-0012",
    "jenis": "dp",
    "jumlah": 1000000,
    "status": "menunggu"
  }
}
```

**Kemungkinan error:**

| Kode | Pesan |
|---|---|
| 400 | `Field wajib belum lengkap` / `Metode atau jenis pembayaran tidak valid` / `Jumlah pembayaran tidak valid` / `Pembayaran lunas harus sebesar Rp...` / `DP minimal 50% dari total (Rp...)` / `Jumlah DP harus kurang dari Rp.... Pilih Lunas untuk membayar penuh` / `Tipe file tidak diizinkan` / `Ukuran file maksimal 2 MB` |
| 404 | `Pesanan tidak ditemukan` |
| 409 | `Pesanan sudah dibatalkan, pembayaran tidak bisa dikirim` / `Pesanan ini sudah lunas` |
| 500 | `Gagal menyimpan file` |

### 4.6 GET `api/kategori/list.php`

**Pemilik:** A | **Dipakai oleh:** tab kategori di Katalog, dropdown kategori di form Kelola Paket (admin)

Mengambil semua kategori, urut berdasarkan `id`.

**Parameter:** tidak ada.

**Respons sukses (200):**

```json
{
  "status": "success",
  "message": "OK",
  "data": [
    { "id": 1, "nama_kategori": "Wedding" },
    { "id": 2, "nama_kategori": "Wisuda" },
    { "id": 3, "nama_kategori": "Event" }
  ]
}
```

**Kemungkinan error:** 405, 500.

---

## 5. Endpoint Admin

Semua endpoint di bagian ini (kecuali `login.php`) mengembalikan **401** jika admin belum login.

### 5.1 POST `api/admin/login.php`

**Pemilik:** C | **Dipakai oleh:** halaman Login Admin

**Body (JSON):**

| Field | Wajib | Tipe |
|---|---|---|
| `username` | Ya | teks |
| `password` | Ya | teks |

**Contoh body:**

```json
{ "username": "admin", "password": "password_yang_diketik" }
```

**Respons sukses (200):**

```json
{
  "status": "success",
  "message": "Login berhasil",
  "data": { "nama": "Administrator" }
}
```

Server membuat session dan mencocokkan password dengan `password_verify()`.

**Kemungkinan error:**

| Kode | Pesan |
|---|---|
| 400 | `Username dan password wajib diisi` |
| 401 | `Username atau password salah` (pesan yang sama untuk username salah **maupun** password salah) |

---

### 5.2 POST `api/admin/logout.php`

**Pemilik:** C | **Dipakai oleh:** tombol "Keluar" di sidebar

**Body:** kosong.

**Respons sukses (200):**

```json
{ "status": "success", "message": "Berhasil keluar", "data": null }
```

Session dihapus di server. Frontend lalu mengarahkan pengguna ke halaman login.

---

### 5.3 GET `api/admin/pesanan.php`

**Pemilik:** C | **Dipakai oleh:** Dashboard, tabel pesanan, halaman detail pesanan

Satu endpoint dengan dua mode.

**Parameter (query):**

| Nama | Wajib | Keterangan |
|---|---|---|
| `status` | Tidak | Filter daftar: `menunggu`, `dikonfirmasi`, `selesai`, atau `batal` |
| `id` | Tidak | Jika diisi, mengembalikan **detail satu pesanan** (parameter `status` diabaikan) |

#### Mode 1: Daftar pesanan

**Contoh permintaan:** `api/admin/pesanan.php` atau `api/admin/pesanan.php?status=menunggu`

**Respons sukses (200):**

```json
{
  "status": "success",
  "message": "OK",
  "data": {
    "ringkasan": {
      "menunggu": 3,
      "dikonfirmasi": 5,
      "selesai": 12,
      "batal": 1
    },
    "pesanan": [
      {
        "id": 12,
        "kode_pesanan": "FV-0012",
        "nama": "Budi Santoso",
        "nama_paket": "Wedding Silver",
        "tanggal_acara": "2026-12-20",
        "total_harga": 3500000,
        "status": "menunggu",
        "dibuat_pada": "2026-11-09 14:30:00"
      }
    ]
  }
}
```

- `ringkasan` selalu menghitung **seluruh** pesanan, tidak terpengaruh filter `status`. Nilainya dipakai kartu ringkasan di Dashboard.
- Urutan `pesanan`: terbaru lebih dulu (`dibuat_pada` menurun).

#### Mode 2: Detail pesanan

**Contoh permintaan:** `api/admin/pesanan.php?id=12`

**Respons sukses (200):**

```json
{
  "status": "success",
  "message": "OK",
  "data": {
    "id": 12,
    "kode_pesanan": "FV-0012",
    "nama": "Budi Santoso",
    "no_wa": "081234567890",
    "email": "budi@example.com",
    "paket_id": 1,
    "nama_paket": "Wedding Silver",
    "tanggal_acara": "2026-12-20",
    "jam": "09:30",
    "lokasi": "Gedung Serbaguna, Banjarbaru",
    "catatan": "Tema putih dan emas",
    "total_harga": 3500000,
    "status": "menunggu",
    "dibuat_pada": "2026-11-09 14:30:00",
    "pembayaran": [
      {
        "id": 7,
        "metode": "transfer_bank",
        "jenis": "dp",
        "jumlah": 1000000,
        "bukti_bayar": "bukti_67a3f9c2e1.jpg",
        "status": "menunggu",
        "dibayar_pada": "2026-11-09 15:02:00"
      }
    ]
  }
}
```

Gambar bukti bayar dibuka di frontend lewat `../../uploads/bukti-bayar/<bukti_bayar>`.

**Kemungkinan error:** 400 (`status` atau `id` tidak valid), 401, 404 (`Pesanan tidak ditemukan`), 500.

---

### 5.4 POST `api/admin/ubah-status.php`

**Pemilik:** C | **Dipakai oleh:** dropdown "Ubah Status" di detail pesanan, tombol verifikasi bukti bayar

Mengubah status **pesanan** atau **pembayaran** (lewat field `target`).

**Body (JSON):**

| Field | Wajib | Keterangan |
|---|---|---|
| `target` | Ya | `pesanan` atau `pembayaran` |
| `id` | Ya | `id` pesanan atau `id` pembayaran, sesuai `target` |
| `status` | Ya | Harus sesuai `target` (lihat bagian 2) |

**Contoh 1, mengubah status pesanan:**

```json
{ "target": "pesanan", "id": 12, "status": "dikonfirmasi" }
```

**Contoh 2, memverifikasi bukti bayar:**

```json
{ "target": "pembayaran", "id": 7, "status": "terverifikasi" }
```

**Konfirmasi otomatis (sejak 2026-11-12):** kalau `target` = `pembayaran` dan
`status` = `terverifikasi`, pesanan pemilik pembayaran itu yang masih
`menunggu` otomatis menjadi `dikonfirmasi` (dalam satu transaksi). Pesanan
yang sudah `dikonfirmasi`, `selesai`, atau `batal` tidak diubah.

**Respons sukses (200):**

```json
{
  "status": "success",
  "message": "Status berhasil diperbarui",
  "data": { "target": "pesanan", "id": 12, "status": "dikonfirmasi" }
}
```

Untuk `target` = `pembayaran`, `data` juga memuat
`"status_pesanan_berubah": true|false` (true kalau pesanan barusan otomatis
dikonfirmasi), dipakai frontend untuk menampilkan pesan yang sesuai.

**Kemungkinan error:**

| Kode | Pesan |
|---|---|
| 400 | `Target tidak valid` / `Status tidak valid untuk target ini` |
| 401 | `Silakan login terlebih dahulu` |
| 404 | `Data tidak ditemukan` |

---

### 5.5 POST `api/admin/paket.php`

**Pemilik:** C | **Dipakai oleh:** halaman Kelola Paket

Satu endpoint untuk tambah, ubah, dan hapus, dibedakan oleh field `aksi`. Memakai **`FormData`** karena bisa membawa file gambar. Untuk melihat daftar paket, admin memakai `api/paket/list.php`.

**Body (`multipart/form-data`):**

| Field | `tambah` | `ubah` | `hapus` | Keterangan |
|---|---|---|---|---|
| `aksi` | Ya | Ya | Ya | `tambah`, `ubah`, atau `hapus` |
| `id` | - | Ya | Ya | `id` paket |
| `kategori_id` | Ya | Ya | - | Harus ada di tabel `kategori` |
| `nama` | Ya | Ya | - | Maksimal 100 karakter |
| `deskripsi` | Tidak | Tidak | - | Teks bebas |
| `harga` | Ya | Ya | - | Angka lebih dari 0 |
| `gambar` | Ya | Tidak | - | File JPG, PNG, atau WEBP, maksimal 2 MB |

Pada `ubah`, jika `gambar` tidak dikirim, gambar lama dipertahankan.

**Respons sukses:**

| Aksi | Kode | Pesan | `data` |
|---|---|---|---|
| `tambah` | 201 | `Paket berhasil ditambahkan` | Objek paket baru (bentuk sama dengan 4.2) |
| `ubah` | 200 | `Paket berhasil diperbarui` | Objek paket terbaru |
| `hapus` | 200 | `Paket berhasil dihapus` | `null` |

**Kemungkinan error:**

| Kode | Pesan |
|---|---|
| 400 | `Aksi tidak valid` / `Field wajib belum lengkap` / `Tipe file tidak diizinkan` / `Ukuran file maksimal 2 MB` |
| 401 | `Silakan login terlebih dahulu` |
| 404 | `Paket tidak ditemukan` |
| 409 | `Paket tidak dapat dihapus karena sudah dipakai pesanan` |

---

### 5.6 POST `api/admin/catat-pembayaran.php`

**Pemilik:** C | **Dipakai oleh:** form "Catat Pembayaran" di halaman Detail Pesanan

Admin mencatat pembayaran yang dikirim pelanggan **lewat WhatsApp**: pelunasan
setelah DP, atau bukti ulang setelah bukti pertama ditolak. Halaman
Pembayaran pelanggan hanya bisa dipakai tepat setelah memesan, jadi kedua
kasus ini dicatat admin (keputusan kelompok 2026-11-12).

Pembayaran yang dicatat di sini **langsung berstatus `terverifikasi`** (admin
sudah memeriksa buktinya sendiri), dan konfirmasi otomatis berlaku seperti
di 5.4.

**Body (`multipart/form-data`):**

| Field | Wajib | Keterangan |
|---|---|---|
| `pesanan_id` | Ya | `id` pesanan |
| `metode` | Ya | Lihat bagian 2 |
| `jenis` | Ya | `dp` atau `lunas` |
| `jumlah` | Ya | Bilangan bulat > 0, **tidak boleh melebihi sisa tagihan** |
| `bukti` | Tidak | File JPG, PNG, atau PDF, maks. 2 MB (aturan sama dengan 4.5). Boleh kosong, misalnya kalau admin sudah mengecek mutasi rekening langsung |

**Sisa tagihan** = `total_harga` dikurangi jumlah semua pembayaran
`terverifikasi` pesanan itu. Pembayaran `menunggu` dan `ditolak` tidak dihitung.

**Respons sukses (201):**

```json
{
  "status": "success",
  "message": "Pembayaran berhasil dicatat",
  "data": {
    "pembayaran_id": 15,
    "pesanan_id": 2,
    "kode_pesanan": "FV-0002",
    "jenis": "lunas",
    "jumlah": 1750000,
    "status": "terverifikasi",
    "bukti_bayar": "bukti_9f2c1a7b3e.jpg",
    "sisa_tagihan": 0,
    "status_pesanan": "dikonfirmasi",
    "status_pesanan_berubah": false
  }
}
```

`bukti_bayar` bernilai `null` kalau tidak ada file yang dilampirkan.

**Kemungkinan error:**

| Kode | Pesan |
|---|---|
| 400 | `Field wajib belum lengkap` / `Metode atau jenis pembayaran tidak valid` / `Jumlah pembayaran tidak valid` / `Jumlah melebihi sisa tagihan (RpX)` / `Tipe file tidak diizinkan` / `Ukuran file maksimal 2 MB` |
| 401 | `Silakan login terlebih dahulu` |
| 404 | `Pesanan tidak ditemukan` |
| 409 | `Pesanan sudah dibatalkan, pembayaran tidak bisa dicatat` / `Pesanan ini sudah lunas` |

---

## 6. Contoh Memanggil dari JavaScript

### GET

```js
async function ambilPaket(kategoriId) {
  const url = kategoriId
    ? `../api/paket/list.php?kategori=${kategoriId}`
    : '../api/paket/list.php';

  const res = await fetch(url);
  const hasil = await res.json();

  if (hasil.status !== 'success') {
    throw new Error(hasil.message);
  }
  return hasil.data;
}
```

### POST dengan JSON

```js
async function buatPesanan(dataForm) {
  const res = await fetch('../api/pesanan/buat.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataForm)
  });
  const hasil = await res.json();

  if (hasil.status !== 'success') {
    throw new Error(hasil.message);
  }
  return hasil.data;
}
```

### POST dengan file (FormData)

```js
async function kirimBukti(formElement) {
  const formData = new FormData(formElement);   // input file bernama "bukti"

  const res = await fetch('../api/pembayaran/upload.php', {
    method: 'POST',
    body: formData                              // jangan isi Content-Type
  });
  const hasil = await res.json();

  if (hasil.status !== 'success') {
    throw new Error(hasil.message);
  }
  return hasil.data;
}
```

### Menangani sesi habis di halaman admin

```js
if (res.status === 401) {
  window.location.href = 'login.html';
  return;
}
```

---

## 7. Catatan untuk Pembuat API

Berlaku untuk semua endpoint:

- [ ] Awali file dengan `require_once` untuk `config/response.php` dan `config/koneksi.php`
- [ ] Periksa method (GET atau POST). Jika salah, kirim error 405
- [ ] Endpoint admin: periksa session di baris-baris awal, sebelum memproses apa pun
- [ ] Semua query memakai **prepared statement**, tidak menggabungkan input langsung ke SQL
- [ ] Validasi input di server, jangan hanya mengandalkan validasi JavaScript
- [ ] Jangan menampilkan pesan error asli database ke pengguna
- [ ] Upload file: cek tipe dan ukuran, ganti nama file dengan nama acak
- [ ] Setiap respons keluar lewat `kirim_sukses()` atau `kirim_error()`
- [ ] Uji dengan Thunder Client (kasus berhasil **dan** kasus gagal) sebelum menyambungkan ke frontend

Membaca body JSON di PHP:

```php
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$nama = trim($input['nama'] ?? '');
```

Membaca data `FormData` memakai `$_POST` dan `$_FILES`.

---

## 8. Hal yang Perlu Diputuskan Bersama

Bagian ini berisi usulan yang perlu disepakati sebelum mulai koding. Setelah diputuskan, hapus atau tandai selesai.

| No | Pertanyaan | Usulan |
|---|---|---|
| 1 | **Daftar kategori untuk tab Katalog.** Tab kategori butuh daftar kategori, padahal belum ada endpoint-nya | Tambah endpoint ke-11: `GET api/kategori/list.php` (pemilik A), mengembalikan `[{ "id": 1, "nama_kategori": "Wedding" }]` |
| 2 | ~~**Cek Status memakai nomor WhatsApp.**~~ | **Selesai (2026-11-12):** tidak ada halaman Cek Status; `pesanan/status.php` dihapus. Pelunasan dan bukti ulang dicatat admin lewat 5.6 |
| 9 | **Pelunasan dan bukti ulang** tidak punya jalur di website (halaman Pembayaran hanya bisa dipakai tepat setelah memesan) | **Selesai (2026-11-12):** pelanggan mengirim lewat WhatsApp, admin mencatat lewat `api/admin/catat-pembayaran.php` (5.6) |
| 10 | **Status pesanan ikut verifikasi pembayaran?** | **Selesai (2026-11-12):** ya, verifikasi pembayaran otomatis mengubah pesanan `menunggu` menjadi `dikonfirmasi` (5.4, 5.6) |
| 3 | **Error per field.** Desain Figma punya state error pada form, sedangkan `kirim_error()` hanya mengirim satu pesan | Tambah parameter ketiga `$data` pada `kirim_error()` agar bisa mengirim `{ "nama": "Nama wajib diisi" }`. Diubah oleh A di `response.php` |
| 4 | **Nomor WhatsApp admin** untuk tombol konfirmasi | Simpan sebagai satu konstanta di `frontend/js/config.js`, format `62812xxxxxxx` (tanpa `+` dan `0` di depan) |
| 5 | **Alamat gambar paket di frontend** | `../uploads/paket/<gambar>` dari `frontend/`, dan `../../uploads/paket/<gambar>` dari `frontend/admin/` |
| 6 | **Batas ukuran upload** (2 MB) | Cek juga `upload_max_filesize` dan `post_max_size` di `php.ini` XAMPP. Nilai bawaannya biasanya cukup |
| 7 | **Aturan bentrok tanggal.** Satu tanggal hanya satu pesanan | Sudah ditulis di 4.4. Jika studio boleh melayani beberapa pesanan sehari, aturan ini diganti |
| 8 | **Admin lebih dari satu?** | Cukup satu akun admin untuk tugas ini. Tidak ada endpoint tambah admin |

---

## 9. Riwayat Perubahan

| Tanggal | Perubahan | Oleh |
|---|---|---|
| | Draf awal | |
| 2026-11-11 | `api/pesanan/status.php` (4.3) ditandai belum diimplementasi; spesifikasi tidak diubah | |
| 2026-11-11 | `api/pesanan/status.php` (4.3) selesai diimplementasi; ditambah catatan pencocokan `no_wa` (08/62), `kode` tidak peka huruf besar/kecil, dan format `jam` | |
| 2026-11-12 | `api/pesanan/status.php` (4.3) **dihapus**: tidak ada halaman Cek Status | |
| 2026-11-12 | Endpoint baru `api/admin/catat-pembayaran.php` (5.6): admin mencatat pelunasan / bukti ulang yang dikirim via WhatsApp | |
| 2026-11-12 | `api/admin/ubah-status.php` (5.4): verifikasi pembayaran otomatis mengubah pesanan `menunggu` menjadi `dikonfirmasi`; respons target `pembayaran` ditambah `status_pesanan_berubah` | |
| 2026-11-14 | `api/pembayaran/upload.php` (4.5): aturan jumlah DP (minimal 50%, kurang dari sisa tagihan) dan Lunas (sama dengan sisa tagihan); error 409 untuk pesanan batal / sudah lunas. Bagian 4.6 dipindah keluar dari tengah 4.5 | |