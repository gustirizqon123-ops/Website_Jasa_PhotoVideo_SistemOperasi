# Sitemap — Website Pemesanan Jasa Foto & Video

Sama seperti `ERD.md`, diagram di sini ditulis dengan **Mermaid** sehingga tetap
berupa teks: bisa dibaca dan diperbarui Claude Code, masuk ke git, dan tampil
otomatis sebagai gambar di GitHub dan VS Code.

---

## 1. Peta Halaman

```mermaid
flowchart TD
    subgraph publik["Halaman Pelanggan — tanpa login"]
        beranda["index.html<br/><b>Beranda</b><br/>kartu kategori Wedding, Wisuda, Event"]
        katalog["katalog.html<br/><b>Katalog</b><br/>tab kategori + modal detail"]
        pemesanan["pemesanan.html?paket=ID<br/><b>Langkah 1 — Pemesanan</b><br/>data pemesan & acara"]
        bayar["pembayaran.html<br/><b>Langkah 2 — Pembayaran</b><br/>DP/lunas + unggah bukti"]
        selesai["konfirmasi.html<br/><b>Langkah 3 — Konfirmasi</b><br/>kode pesanan FV-xxxx"]
    end

    wa(["WhatsApp Admin<br/>wa.me — di luar website"])
    wapel(["WhatsApp Pelanggan<br/>wa.me — di luar website"])

    login["admin/login.html<br/><b>Login Admin</b>"]

    subgraph adminarea["Halaman Admin — wajib login"]
        sidebar[["Sidebar admin<br/>ada di semua halaman admin"]]
        dashboard["admin/dashboard.html<br/><b>Dashboard</b><br/>4 kartu ringkasan + 5 pesanan terbaru"]
        daftar["admin/pesanan.html<br/><b>Daftar Pesanan</b><br/>filter per status"]
        detail["admin/pesanan-detail.html?id=ID<br/><b>Detail Pesanan</b><br/>ubah status + verifikasi bayar"]
        paket["admin/paket.html<br/><b>Kelola Paket</b><br/>tabel + cari + hapus"]
        paketform["admin/paket-form.html<br/><b>Form Paket</b><br/>tambah (tanpa ?id=) / ubah (?id=ID)"]
    end

    %% Alur utama pelanggan
    beranda -->|"Temukan Paket /<br/>kartu kategori (?kategori=ID)"| katalog
    katalog -->|"Pesan (kartu / modal)"| pemesanan
    pemesanan -->|pesanan tersimpan| bayar
    bayar -->|bukti terkirim| selesai
    selesai -->|Hubungi Admin| wa
    katalog -->|Konsultasi via WhatsApp| wa

    %% Tautan balik pelanggan
    pemesanan -.->|Ganti paket| katalog
    selesai -.->|Kembali ke Beranda| beranda
    bayar -.->|"dibuka tanpa data pesanan<br/>(sessionStorage kosong)"| katalog
    selesai -.->|"dibuka tanpa data pesanan"| katalog

    %% Admin
    login -->|login berhasil| dashboard
    login -.->|Kembali ke Beranda| beranda
    sidebar --> dashboard
    sidebar --> daftar
    sidebar --> paket
    sidebar -->|Keluar| login
    adminarea -.->|"sesi habis (API membalas 401)"| login

    dashboard -->|Lihat semua| daftar
    dashboard -->|Lihat pesanan terbaru| detail
    daftar -->|Lihat| detail
    detail -->|Kembali| daftar
    detail -->|Hubungi pelanggan| wapel
    paket -->|Tambah / Ubah| paketform
    paketform -->|"tersimpan / Kembali"| paket
    paket -.->|perubahan paket tampil di| katalog
```

Keterangan:

- **Garis putus-putus** = tautan balik, pengalihan otomatis, atau efek tidak
  langsung (bukan alur utama).
- **Navbar** (Beranda, Katalog) ada di semua halaman pelanggan, jadi tidak
  digambar satu per satu.
- **Sidebar admin** dimuat oleh `js/admin/layout.js` di kelima halaman admin.
  Tombol "Keluar" di sidebar memanggil `logout.php` lalu kembali ke login.
- **Tidak ada halaman "Cek Status Pesanan" untuk pelanggan.** Ini keputusan
  kelompok sejak awal: setelah mengirim bukti bayar, pelanggan diarahkan
  menghubungi admin lewat WhatsApp, dan admin yang mengabari perkembangan
  pesanannya. *(Catatan: file `api/pesanan/status.php` masih ada di
  repository walau tidak dipakai halaman mana pun. Kalau kelompok memutuskan
  menghapusnya atau membuat halamannya, perbarui diagram ini.)*
- `frontend/komponen.html` sengaja tidak dimasukkan: itu halaman uji tampilan
  komponen untuk pengembang, bukan bagian dari website.

---

## 2. Halaman dan Endpoint yang Dipanggil

```mermaid
flowchart LR
    subgraph halaman["Halaman"]
        h0["index.html"]
        h1["katalog.html"]
        h2["pemesanan.html"]
        h3["pembayaran.html"]
        h4["konfirmasi.html"]
        h5["admin/login.html"]
        h6["admin/dashboard.html"]
        h7["admin/pesanan.html"]
        h8["admin/pesanan-detail.html"]
        h9["admin/paket.html"]
        h10["admin/paket-form.html"]
        hs[["Sidebar admin — tombol Keluar<br/>(di h6 sampai h10)"]]
    end

    subgraph api["Endpoint API"]
        e1["kategori/list.php"]
        e2["paket/list.php"]
        e3["paket/detail.php"]
        e4["pesanan/buat.php"]
        e5["pembayaran/upload.php"]
        e6["admin/login.php"]
        e7["admin/logout.php"]
        e8["admin/pesanan.php"]
        e9["admin/ubah-status.php"]
        e10["admin/paket.php"]
    end

    h0 -.->|tidak memanggil API<br/>isi ditulis langsung di HTML| api
    h1 --> e1
    h1 --> e2
    h1 --> e3
    h2 --> e3
    h2 --> e4
    h3 --> e5
    h4 -.->|tidak memanggil API<br/>baca sessionStorage| api
    h5 --> e6
    h6 --> e8
    h7 --> e8
    h8 --> e8
    h8 --> e9
    h9 --> e2
    h9 --> e10
    h10 --> e1
    h10 --> e3
    h10 --> e10
    hs --> e7
```

- `index.html` belum memanggil API: kartu kategori dan harga "Mulai Rp..."
  ditulis langsung di HTML, jadi harus disamakan manual dengan isi database
  (lihat komentar di bagian KATEGORI pada `index.html`).
- `konfirmasi.html` sengaja tidak memanggil API sama sekali — seluruh datanya
  diambil dari `sessionStorage` yang sudah diisi `pemesanan.js` dan `bayar.js`,
  karena memang tidak ada endpoint publik untuk membaca pesanan berdasarkan kode.
- Halaman di `frontend/` memanggil API dengan `../api/...`, sedangkan halaman di
  `frontend/admin/` memakai `../../api/...`.

---

## 3. Daftar Halaman

| Halaman | Berkas | Pemilik | Login |
|---|---|---|---|
| Beranda | `frontend/index.html` | A | — |
| Katalog | `frontend/katalog.html` | A | — |
| Pemesanan | `frontend/pemesanan.html` | B | — |
| Pembayaran | `frontend/pembayaran.html` | B | — |
| Konfirmasi | `frontend/konfirmasi.html` | B | — |
| Login Admin | `frontend/admin/login.html` | C | — |
| Dashboard | `frontend/admin/dashboard.html` | C | wajib |
| Daftar Pesanan | `frontend/admin/pesanan.html` | C | wajib |
| Detail Pesanan | `frontend/admin/pesanan-detail.html` | C | wajib |
| Kelola Paket | `frontend/admin/paket.html` | A | wajib |
| Form Paket | `frontend/admin/paket-form.html` | A | wajib |

Komponen yang dimuat ke banyak halaman (bukan halaman berdiri sendiri):

| Komponen | Berkas | Pemilik | Dimuat oleh |
|---|---|---|---|
| Navbar | `frontend/komponen/navbar.html` | A | `js/komponen.js` (halaman pelanggan) |
| Footer | `frontend/komponen/footer.html` | A | `js/komponen.js` (halaman pelanggan) |
| Sidebar admin | `frontend/komponen/admin-sidebar.html` | C | `js/admin/layout.js` (halaman admin kecuali login) |

Halaman admin dilindungi di sisi server: setiap endpoint di `api/admin/`
(kecuali `login.php`) memanggil `cek_login()` dari `api/config/auth.php`.
Kalau session tidak ada, API membalas HTTP 401 dan `js/api.js` otomatis
mengalihkan ke halaman login.

---

## Cara Melihat Diagramnya

**Di VS Code:** pasang ekstensi *Markdown Preview Mermaid Support*
(`bierner.markdown-mermaid`), buka file ini, tekan `Ctrl+Shift+V`.

**Di GitHub:** push file ini, lalu buka di GitHub — diagramnya langsung tampil.

**Untuk laporan atau slide:** buka <https://mermaid.live>, paste isi salah satu
blok ```mermaid``` di atas, unduh sebagai PNG atau SVG.
