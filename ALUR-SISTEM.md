# Alur Sistem — Website Pemesanan Jasa Foto & Video

> **Status: final (2026-11-12).** Disusun dari kode yang ada di repository.
> Dua keputusan kelompok sudah dimasukkan: pelunasan / bukti ulang dicatat
> admin (bagian 3), dan verifikasi pembayaran otomatis mengonfirmasi pesanan
> (bagian 5). Lihat bagian 6 untuk ringkasan keputusan dan batasan sistem.

Pelengkap `SITEMAP.md` (halaman apa saja) dan `ERD.md` (data apa saja).
Dokumen ini menjelaskan **urutan kejadian**: siapa melakukan apa, halaman
mana memanggil endpoint mana, dan data apa yang berubah di database.
Semua diagram ditulis dengan **Mermaid** (cara melihatnya ada di bagian bawah).

---

## 1. Gambaran Besar

```mermaid
flowchart LR
    subgraph pelanggan["Pelanggan"]
        p1["Pilih paket<br/>di Katalog"]
        p2["Isi data acara"]
        p3["Bayar DP / lunas<br/>+ unggah bukti"]
        p4["Dapat kode FV-xxxx<br/>+ chat admin via WA"]
    end

    subgraph sistem["Website + Database"]
        s1[("pesanan<br/>status: menunggu")]
        s2[("pembayaran<br/>status: menunggu")]
    end

    subgraph admin["Admin"]
        a1["Login"]
        a2["Cek pesanan baru<br/>di Dashboard"]
        a3["Lihat bukti bayar<br/>verifikasi / tolak"]
        a4["Ubah status pesanan<br/>selesai / batal"]
        a5["Kabari pelanggan<br/>via WhatsApp"]
        a6["Catat pelunasan /<br/>bukti ulang"]
    end

    p1 --> p2 --> p3 --> p4
    p2 -->|buat.php| s1
    p3 -->|upload.php| s2
    a1 --> a2 --> a3 --> a4 --> a5
    s1 -.-> a2
    s2 -.-> a3
    a3 -->|ubah-status.php| s2
    a3 -.->|"verifikasi: pesanan otomatis<br/>menjadi dikonfirmasi"| s1
    a4 -->|ubah-status.php| s1
    a5 -.->|pelanggan menunggu kabar| p4
    p4 -->|"kirim bukti pelunasan<br/>lewat WhatsApp"| a6
    a6 -->|catat-pembayaran.php| s2
```

Inti alurnya: **pelanggan membuat data, admin memeriksa dan mengubah
statusnya, dan komunikasi selanjutnya lewat WhatsApp** (tidak ada halaman
cek status untuk pelanggan). Pembayaran berikutnya (pelunasan, bukti ulang)
dikirim pelanggan lewat WhatsApp dan **dicatat admin** di Detail Pesanan.

---

## 2. Alur Pemesanan oleh Pelanggan

```mermaid
sequenceDiagram
    autonumber
    actor P as Pelanggan
    participant K as katalog.html
    participant F as pemesanan.html
    participant B as pembayaran.html
    participant C as konfirmasi.html
    participant S as sessionStorage
    participant API as API PHP
    participant DB as Database

    P->>K: Buka Katalog
    K->>API: GET kategori/list.php dan paket/list.php
    API->>DB: SELECT kategori, paket
    API-->>K: Daftar kategori + paket
    P->>K: Klik "Lihat detail" (opsional)
    K->>API: GET paket/detail.php?id=ID
    API-->>K: Detail paket (tampil di modal)
    P->>K: Klik "Pesan"
    K->>F: Buka pemesanan.html?paket=ID
    F->>API: GET paket/detail.php?id=ID
    API-->>F: Ringkasan paket (kolom kanan)

    P->>F: Isi nama, no. WA, tanggal, lokasi, lalu kirim
    F->>API: POST pesanan/buat.php (JSON)
    API->>API: Validasi field, format WA, tanggal tidak lewat
    API->>DB: Cek tanggal bentrok (status bukan batal)
    alt Tanggal sudah dipesan
        API-->>F: 409 "Tanggal tersebut sudah dipesan"
        F-->>P: Tampilkan pesan error, pilih tanggal lain
    else Tanggal kosong
        API->>DB: BEGIN, INSERT pesanan (kode NULL, status menunggu)
        API->>DB: UPDATE kode_pesanan = FV-id, COMMIT
        API-->>F: 201 + kode_pesanan, total_harga, dll
        F->>S: Simpan "pesananAktif"
        F->>B: Pindah ke pembayaran.html
    end

    B->>S: Baca "pesananAktif" (kalau kosong, kembali ke Katalog)
    P->>B: Pilih DP / lunas, metode, jumlah, unggah bukti
    B->>API: POST pembayaran/upload.php (FormData)
    API->>API: Validasi metode, jenis, jumlah tidak melebihi total
    API->>API: Cek isi file (JPG, PNG, PDF) dan ukuran maks. 2 MB
    API->>DB: INSERT pembayaran (status menunggu)
    API-->>B: 201 + status pembayaran
    B->>S: Tambahkan status_pembayaran
    B->>C: Pindah ke konfirmasi.html

    C->>S: Baca "pesananAktif", lalu HAPUS
    C-->>P: Tampilkan kode FV-xxxx + ringkasan
    P->>P: Klik "Hubungi Admin via WhatsApp"
    Note over P: Pesan WA otomatis berisi nama,<br/>kode pesanan, paket, dan tanggal acara
```

Catatan:

- `total_harga` **tidak dikirim** dari frontend. Server menyalinnya dari harga
  paket saat itu (lihat `ERD.md`, catatan perancangan nomor 1).
- Tanggal dianggap bentrok kalau ada pesanan lain di **tanggal yang sama**
  dengan status apa pun **selain batal**, berapa pun paketnya.
- Data di Pembayaran dan Konfirmasi diambil dari `sessionStorage`, bukan dari
  API, karena tidak ada endpoint publik untuk membaca pesanan.

---

## 3. Alur Pemeriksaan oleh Admin

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant L as admin/login.html
    participant D as Dashboard / Daftar Pesanan
    participant T as Detail Pesanan
    participant API as API PHP
    participant DB as Database
    actor P as Pelanggan (WhatsApp)

    A->>L: Isi username + password
    L->>API: POST admin/login.php
    API->>DB: SELECT admin WHERE username
    alt Username / password salah
        API-->>L: 401 "Username atau password salah"
    else Benar (password_verify)
        API->>API: session_regenerate_id, simpan admin_id di session
        API-->>L: 200 Login berhasil
        L->>D: Pindah ke dashboard.html
    end

    D->>API: GET admin/pesanan.php (opsional ?status=)
    API->>API: cek_login()
    API->>DB: SELECT pesanan + ringkasan per status
    API-->>D: 4 angka ringkasan + daftar pesanan
    A->>D: Klik "Lihat" pada satu pesanan
    D->>T: Buka pesanan-detail.html?id=ID
    T->>API: GET admin/pesanan.php?id=ID
    API-->>T: Data pesanan + semua pembayarannya

    A->>T: Klik "Lihat bukti" (file di uploads/bukti-bayar/)
    alt Bukti sah
        A->>T: Klik "Verifikasi"
        T->>API: POST admin/ubah-status.php (target pembayaran, terverifikasi)
    else Bukti tidak sah
        A->>T: Klik "Tolak"
        T->>API: POST admin/ubah-status.php (target pembayaran, ditolak)
    end
    API->>DB: UPDATE pembayaran SET status
    opt Diverifikasi dan pesanan masih menunggu
        API->>DB: UPDATE pesanan SET status dikonfirmasi (transaksi yang sama)
    end
    API-->>T: 200, detail dimuat ulang

    A->>T: Pilih status pesanan baru (misalnya selesai), klik "Simpan"
    T->>API: POST admin/ubah-status.php (target pesanan)
    API->>DB: UPDATE pesanan SET status
    API-->>T: 200, badge status diperbarui

    A->>P: Klik "Hubungi", kabari hasil lewat WhatsApp
    Note over A,P: Pelanggan tidak bisa melihat status di website.<br/>Semua kabar disampaikan admin lewat WhatsApp.

    rect rgba(149, 213, 178, 0.15)
    Note over A,P: Pelunasan, atau bukti ulang setelah ditolak
    P->>A: Kirim bukti transfer lewat WhatsApp
    A->>T: Isi form "Catat Pembayaran" (jenis, metode, jumlah, bukti opsional)
    T->>API: POST admin/catat-pembayaran.php (FormData)
    API->>DB: Kunci baris pesanan, hitung sisa tagihan
    alt Pesanan batal, sudah lunas, atau jumlah melebihi sisa
        API-->>T: 409 / 400 dengan pesan yang jelas
    else Sah
        API->>DB: INSERT pembayaran (langsung terverifikasi)
        API->>DB: Pesanan menunggu menjadi dikonfirmasi (kalau masih menunggu)
        API-->>T: 201 + sisa tagihan, detail dimuat ulang
    end
    end

    opt Sesi habis atau belum login
        API-->>D: 401 dari cek_login()
        D->>L: js/api.js mengalihkan ke login.html
    end
```

Catatan:

- **Konfirmasi otomatis:** begitu ada pembayaran terverifikasi (lewat tombol
  Verifikasi atau form Catat Pembayaran), pesanan yang masih "menunggu"
  langsung menjadi "dikonfirmasi". Pesanan yang sudah dikonfirmasi, selesai,
  atau batal tidak diubah. Status "selesai" dan "batal" tetap diatur admin
  lewat dropdown.
- **Pembayaran yang dicatat admin langsung terverifikasi**, karena admin sudah
  memeriksa buktinya sendiri. Bukti boleh tidak dilampirkan (misalnya admin
  sudah mengecek mutasi rekening). Jumlahnya dibatasi sisa tagihan.
- Semua endpoint di `api/admin/` (kecuali `login.php`) memanggil `cek_login()`
  dulu. Tombol "Keluar" di sidebar memanggil `logout.php`, lalu kembali ke login.

---

## 4. Alur Kelola Paket oleh Admin

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant KP as admin/paket.html
    participant FP as admin/paket-form.html
    participant API as API PHP
    participant DB as Database
    participant U as uploads/paket/

    KP->>API: GET paket/list.php
    API-->>KP: Tabel paket (thumbnail, kategori, harga)

    rect rgba(149, 213, 178, 0.15)
    Note over A,U: Tambah atau ubah paket
    A->>FP: Klik "Tambah Paket" atau "Ubah"
    FP->>API: GET kategori/list.php (dropdown)
    opt Mode ubah (?id=ID)
        FP->>API: GET paket/detail.php?id=ID
        API-->>FP: Isi form + pratinjau gambar lama
    end
    A->>FP: Isi data + pilih gambar, klik "Simpan"
    FP->>API: POST admin/paket.php (aksi tambah / ubah, FormData)
    API->>API: cek_login(), validasi field, cek gambar (JPG/PNG, maks. 2 MB)
    API->>U: Simpan gambar dengan nama acak paket_xxxx
    API->>DB: INSERT / UPDATE paket
    opt Ubah dengan gambar baru
        API->>U: Hapus file gambar lama
    end
    API-->>FP: 200 / 201
    FP->>KP: Kembali ke Kelola Paket
    end

    rect rgba(198, 68, 68, 0.08)
    Note over A,U: Hapus paket
    A->>KP: Klik "Hapus", konfirmasi di modal
    KP->>API: POST admin/paket.php (aksi hapus)
    API->>DB: Cek apakah paket punya pesanan
    alt Masih punya pesanan
        API-->>KP: 409 "masih memiliki pesanan terkait"
    else Tidak punya pesanan
        API->>DB: DELETE paket
        API->>U: Hapus file gambar
        API-->>KP: 200, baris hilang dari tabel
    end
    end

    Note over KP,DB: Perubahan langsung terlihat di Katalog pelanggan<br/>karena Katalog selalu membaca paket/list.php
```

---

## 5. Perubahan Status

```mermaid
stateDiagram-v2
    direction LR

    state "Status Pesanan" as SP {
        [*] --> menunggu : pelanggan memesan
        menunggu --> dikonfirmasi : otomatis saat pembayaran terverifikasi
        menunggu --> batal : admin / pelanggan membatalkan
        dikonfirmasi --> selesai : acara selesai, hasil dikirim
        dikonfirmasi --> batal : dibatalkan
        selesai --> [*]
        batal --> [*]
    }

    state "Status Pembayaran" as SB {
        state "menunggu" as tunggu
        [*] --> tunggu : pelanggan unggah bukti
        [*] --> terverifikasi : admin mencatat pembayaran
        tunggu --> terverifikasi : admin klik Verifikasi
        tunggu --> ditolak : admin klik Tolak
        terverifikasi --> [*]
        ditolak --> [*]
    }
```

Diagram di atas adalah **alur yang dimaksudkan**. Di kode sekarang:

- Perpindahan **menunggu → dikonfirmasi terjadi otomatis** saat pembayaran
  pertama terverifikasi (lewat tombol Verifikasi atau form Catat Pembayaran).
  Admin tetap bisa mengubahnya manual kalau perlu.
- `ubah-status.php` **tidak membatasi urutan**: admin bisa memilih status apa
  saja dari dropdown, termasuk mengembalikan "selesai" ke "menunggu".
- Tombol Verifikasi/Tolak hanya muncul untuk pembayaran berstatus "menunggu",
  jadi pembayaran yang sudah diverifikasi/ditolak tidak bisa diubah lagi
  lewat tampilan (tapi API-nya tetap mengizinkan).
- Pesanan berstatus **batal** membuat tanggalnya bisa dipesan orang lain lagi.

---

## 6. Keputusan Alur dan Batasan Sistem

### Keputusan kelompok (2026-11-12)

1. **Pelunasan dan bukti ulang dicatat admin.** Halaman Pembayaran pelanggan
   hanya bisa dipakai tepat setelah memesan (datanya dari `sessionStorage`,
   dan dihapus di halaman Konfirmasi). Karena itu pelunasan setelah DP, dan
   bukti ulang setelah bukti pertama ditolak, dikirim pelanggan **lewat
   WhatsApp**, lalu admin mencatatnya lewat form **"Catat Pembayaran"** di
   Detail Pesanan (`api/admin/catat-pembayaran.php`). Pilihan lain yang
   dipertimbangkan: hanya lewat WhatsApp tanpa dicatat di sistem, atau
   halaman "Bayar Pelunasan" untuk pelanggan.

2. **Verifikasi pembayaran otomatis mengonfirmasi pesanan.** Pesanan
   "menunggu" langsung menjadi "dikonfirmasi" begitu ada pembayaran
   terverifikasi, dalam satu transaksi database.

3. **Tidak ada halaman Cek Status untuk pelanggan.** Endpoint
   `api/pesanan/status.php` yang sempat dibuat sudah dihapus.

### Batasan sistem (disadari, tidak diperbaiki dalam lingkup tugas ini)

1. **Urutan status tidak dibatasi** (lihat bagian 5). Admin bisa memilih
   status apa saja dari dropdown.
2. **Pembayaran dari pelanggan tidak dicek terhadap sisa tagihan.**
   `upload.php` hanya memastikan *satu* kiriman tidak melebihi `total_harga`.
   Pembayaran yang dicatat admin sudah dibatasi sisa tagihan.
3. **Pelanggan tidak bisa mengunggah sendiri setelah meninggalkan halaman
   Pembayaran**, sehingga bergantung pada admin untuk mencatat pembayaran
   berikutnya (lihat keputusan 1).

---

## Cara Melihat Diagramnya

**Di VS Code:** pasang ekstensi *Markdown Preview Mermaid Support*
(`bierner.markdown-mermaid`), buka file ini, tekan `Ctrl+Shift+V`.

**Di GitHub:** push file ini, lalu buka di GitHub — diagramnya langsung tampil.

**Untuk laporan atau slide:** buka <https://mermaid.live>, paste isi salah satu
blok ```mermaid``` di atas, unduh sebagai PNG atau SVG.
