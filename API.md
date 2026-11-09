## GET api/paket/list.php

Pemilik: A

**Parameter (query):**
| Nama | Wajib | Keterangan |
|ALgit |---|---|
| kategori | Tidak | id kategori untuk memfilter |

**Respons sukses:**
{
  "status": "success",
  "message": "OK",
  "data": [
    { "id": 1, "kategori": "Wedding", "nama": "Wedding Silver",
      "deskripsi": "...", "harga": 3500000, "gambar": "wedding-silver.jpg" }
  ]
}

**Respons error:** format standar (status "error", data null)