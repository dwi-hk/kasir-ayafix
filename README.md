# AYA GROUP – MULTY PAYMENT POS

Versi revisi untuk:
- DAPUR AYA SEMBAKO
- AYA SEBLAK DAN ANGKRINGAN

## Struktur
- index.html
- css/style.css
- js/firebase-config.js
- js/app.js
- js/script.js
- js/menu-data.js

## Prinsip database
Aplikasi ini bersifat additive. Tidak ada kode hard-delete untuk histori transaksi dari UI. Data lama berikut tetap digunakan:
- menu_tambahan
- transaksi
- pengeluaran
- pembelian
- barang_titipan
- pengaturan/modal_laci

Node tambahan hanya dipakai untuk modul yang belum ada/yang perlu struktur baru:
- cabang
- produk
- stok_cabang
- pelanggan
- supplier
- karyawan
- absensi
- inventaris
- transfer_stock
- pembayaran
- operasional
- users
- kontrak_kerja
- sop
- audit_log
- transaksi_ditahan

Jika node baru sudah ada di Firebase, aplikasi membaca dan melanjutkan node tersebut; tidak ada migrasi yang menghapus node lama.

## Jalankan
1. Upload folder ini ke GitHub Pages/hosting.
2. Pastikan index.html menjadi halaman utama.
3. Firebase Realtime Database harus tetap project kasir-aya-group-e6fb4.
4. Aktifkan Firebase Authentication Email/Password jika ingin Management User aktif.
5. Backup Firebase Rules sebelum melakukan perubahan rules.

## Printer thermal 58mm
Cetak memakai window.print() + CSS @page/width 58mm. Pada Android/PC, printer Bluetooth harus sudah dipasangkan ke sistem/driver printer terlebih dahulu. Browser tidak menjamin koneksi Bluetooth langsung ke semua printer.

## Catatan produksi
- Jangan menyimpan password user di Realtime Database.
- Gunakan Firebase Authentication untuk login.
- Security Rules harus membatasi write berdasarkan role Owner/Supervisor/Kasir sebelum aplikasi dipakai banyak user.
- Sebelum deploy produksi, lakukan uji transaksi dengan data dummy dan backup database.
