<?php
/* ==========================================================================
   api/config/kredensial.contoh.php   (CONTOH, aman masuk Git)

   CARA PAKAI DI HOSTING:
   1. Salin file ini menjadi  api/config/kredensial.php  (di server hosting)
   2. Isi dengan data MySQL dari panel hosting (menu "MySQL Databases")
   3. Simpan. koneksi.php otomatis memakai file itu.

   PENTING:
   - kredensial.php DIABAIKAN Git (.gitignore) -> password hosting tidak
     akan ikut ter-push ke GitHub. JANGAN isi password asli di file CONTOH ini.
   - Di laptop (XAMPP) file kredensial.php TIDAK perlu dibuat: koneksi.php
     sudah memakai bawaan XAMPP (localhost, root, tanpa password).
   - Folder api/config/ diblokir untuk akses browser (.htaccess), dan file
     ini hanya mengembalikan array tanpa mencetak apa pun, jadi isinya tidak
     bisa dibaca lewat browser.
   ========================================================================== */

return [
    'host' => 'sqlXXX.hosting-anda.com',   // MySQL hostname (biasanya BUKAN localhost)
    'db'   => 'akun_db_foto_video',        // nama database (biasanya berawalan nama akun)
    'user' => 'akun_hosting',              // username MySQL
    'pass' => 'PASSWORD_DARI_PANEL',       // password MySQL
];
