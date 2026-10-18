# Cash GO — Aplikasi Kasir UMKM (Android, Offline)

Aplikasi kasir 100% offline untuk UMKM Indonesia. Tampilan mengikuti UI Kit (gradasi oranye, kartu membulat, input pill, menu bawah),
mendukung **portrait & landscape** (HP dan tablet). Data disimpan di **penyimpanan internal** aplikasi (`filesDir/cashgo_db.json`).

## Cara membuat APK
**A. GitHub Actions (tanpa Android Studio)**
1. Upload seluruh isi folder ini ke repository GitHub (branch `main`).
2. Tab *Actions → Build Cash GO APK → Run workflow* (otomatis jalan saat push).
3. Unduh artifact `CashGO-debug-apk` → install `app-debug.apk` di HP.

**B. Android Studio**
Buka folder ini (File → Open), tunggu Gradle sync (Gradle 8.7, AGP 8.5.2, JDK 17), lalu *Build → Build APK(s)*.
Catatan: file `gradle-wrapper.jar` tidak disertakan; Android Studio/GitHub Actions menyediakan Gradle sendiri.

## Struktur
- `app/src/main/assets/www/` — seluruh aplikasi (HTML/CSS/JS): `core.js` (data, kategori usaha), `nota.js` (nota: preview / ESC-POS / PDF),
  `xls.js` (export-import .xls), `charts.js` (grafik), `ui.js` (login, navigasi), `screens.js` (transaksi, history, rekap), `settings.js` (setting & wizard).
- `app/src/main/java/id/cashgo/app/MainActivity.kt` — WebView + jembatan native: simpan database, simpan/bagikan file, WhatsApp, printer Bluetooth.
- `brand/` — logo & icon (SVG/PNG). Icon adaptif ada di `res/drawable` + `res/mipmap-*`.
- `docs/` — template import .xls dan contoh nota PDF 58 mm / 80 mm.

## Alur & hak akses
- Pertama dibuka: **Pengaturan Awal wajib** (password admin → profil & logo → bidang usaha → nota/sosmed → kasir).
- Login: username+password. Di bawah tombol **Masuk** ada *Masuk sebagai Administrator* (popup password).
- **Administrator**: Transaksi, History (Transaksi Customer + Transaksi Kasir), Rekap Penjualan, Setting.
- **Kasir**: Transaksi dan History *Transaksi Customer* (hanya transaksi miliknya).
- Kode pemulihan 8 karakter ditampilkan sekali saat password admin dibuat (untuk reset password, aplikasi offline).

## Format .xls (Export / Import)
Format Excel *XML Spreadsheet 2003* (.xls) — terbuka di Excel, WPS, LibreOffice. 1 baris = 1 item; kolom:
No Transaksi · Tanggal · Jam · Bidang Usaha · Nama Usaha · Kasir · Nama Customer · No HP · Nama Item · Qty · Satuan · Harga Satuan ·
Diskon Item · Subtotal · Keterangan Item · Metode Bayar · Catatan · Info Tambahan · Total Transaksi · Dibayar · Kembalian.
Detail petunjuk ada di sheet *Petunjuk Format* pada `docs/CashGO_Template_Import.xls`.
Import juga menerima .xml (XML Spreadsheet 2003) dan .csv. Format biner Excel 97-2003 dan .xlsx tidak dapat dibaca — simpan ulang sebagai
*XML Spreadsheet 2003* atau CSV.

## Nota
Thermal **58 mm** (32 kolom) dan **80 mm** (48 kolom). Satu model nota → pratinjau layar, cetak ESC/POS via printer Bluetooth (SPP) yang sudah di-pairing,
dan PDF (dikirim ke WhatsApp customer bersama ringkasan order).
