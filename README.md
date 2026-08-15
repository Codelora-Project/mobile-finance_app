# Personal Finance

Aplikasi pencatatan keuangan pribadi berbasis Android yang dibangun dengan Expo Development Build, React Native, TypeScript, Expo Router, dan SQLite. Proyek ini masih dalam tahap pengembangan; implementasi saat ini telah mencapai **Milestone 14** (edge-case hardening untuk interrupted OCR, rapid actions, Android Back, large amounts, long content, keyboard/font scaling, restart persistence, dan penggunaan offline).

`PRD.md` adalah **single source of truth** untuk requirement, arsitektur, urutan implementasi, dan acceptance criteria. Jangan mengimplementasikan phase berikutnya sebelum milestone sebelumnya selesai dan terverifikasi.

## Stack saat ini

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript strict
- Expo Router
- `expo-sqlite`
- `expo-image-picker`
- `expo-camera`
- `expo-file-system`
- `expo-print`
- `expo-sharing`
- `expo-splash-screen`
- `@infinitered/react-native-mlkit-text-recognition`
- Jest + `jest-expo` + Testing Library
- ESLint + Prettier
- npm

Target utama sesuai PRD adalah **Pixel 7 Android Emulator, Android 16 / API 36, Google Play image**. Expo Go tidak digunakan; aplikasi dijalankan sebagai Expo Development Build.

## Prasyarat

Siapkan:

1. Node.js yang memenuhi engine React Native 0.86: `^20.19.4 || ^22.13.0 || ^24.3.0 || >=25.0.0`. Proyek ini telah diverifikasi dengan Node `24.19.0`.
2. npm.
3. Android Studio beserta:
   - Android SDK Platform 36;
   - Android SDK Build-Tools;
   - Android SDK Platform-Tools (`adb`);
   - Android Emulator;
   - Pixel 7 AVD dengan Android 16 / API 36 Google Play image.
4. JDK 17. Toolchain Android proyek ini telah diverifikasi dengan Eclipse Temurin 17. JBR 25 bawaan Android Studio versi terbaru tidak kompatibel dengan native build yang digunakan proyek ini.

Pastikan perintah berikut dapat dijalankan dari terminal:

```powershell
node --version
npm --version
java -version
adb version
```

Jika `java` atau `adb` tidak ditemukan, atur `JAVA_HOME`, `ANDROID_HOME`, dan `Path` ke instalasi lokal Android Studio/SDK. Contoh untuk sesi PowerShell saat ini dengan lokasi instalasi Windows yang umum:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
```

Lokasi aktual dapat berbeda. Perintah di atas hanya berlaku pada terminal aktif; tambahkan nilai yang sama melalui Windows Environment Variables agar permanen, lalu buka terminal baru. Pastikan `java -version` menampilkan versi 17 sebelum menjalankan native build.

## Instalasi

Dari root proyek:

```powershell
npm ci
```

`npm ci` memasang dependency persis seperti `package-lock.json`. Saat sengaja menambah package Expo, gunakan `npx expo install <package>`; untuk package pihak ketiga gunakan `npm install <package>`, lalu commit perubahan lockfile.

## Menjalankan aplikasi di Android

### 1. Nyalakan emulator

Buka Android Studio > Device Manager, lalu jalankan Pixel 7 AVD. Verifikasi perangkat terdeteksi:

```powershell
adb devices
```

Status perangkat harus `device`, bukan `offline` atau `unauthorized`.

### 2. Build dan install development build

Untuk build pertama, atau setelah dependency/config native berubah:

```powershell
npm run android
```

Perintah tersebut menjalankan `expo run:android`, mengompilasi aplikasi native, memasangnya ke emulator, dan memulai Metro.

Jika port 8081 sedang dipakai proses lain, gunakan port berbeda:

```powershell
npx expo run:android --port 8082
```

### 3. Menjalankan sesi development berikutnya

Jika development build sudah terpasang dan tidak ada perubahan native:

```powershell
npm start
```

Perintah ini menjalankan Metro dengan target development client. Buka aplikasi **Personal Finance** di emulator bila tidak terbuka otomatis. Fast Refresh akan aktif selama aplikasi terhubung ke Metro.

Native rebuild diperlukan setelah perubahan pada:

- dependency yang memiliki kode native;
- Expo config atau config plugin;
- Expo SDK;
- konfigurasi native Android.

Setelah perubahan tersebut, jalankan:

```powershell
npx expo-doctor@latest
npm run android
```

## Quality gates dan automated tests

Jalankan seluruh gate sebelum menyatakan suatu task selesai:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
```

Kegunaan setiap command:

| Command                | Tujuan                                               |
| ---------------------- | ---------------------------------------------------- |
| `npm run format:check` | Memeriksa format tanpa mengubah file                 |
| `npm run format`       | Memformat file dengan Prettier                       |
| `npm run lint`         | Menjalankan aturan ESLint/Expo                       |
| `npm run typecheck`    | Memeriksa TypeScript strict tanpa menghasilkan build |
| `npm test`             | Menjalankan seluruh Jest test sekali                 |
| `npm run test:watch`   | Menjalankan Jest dalam watch mode saat development   |

Untuk menjalankan satu test suite:

```powershell
npm test -- tests/money.test.ts
```

Test yang tersedia saat ini mencakup bootstrap route, inisialisasi/migrasi database, utilitas money/date/text/error/HTML, repository kategori dan metode pembayaran, repository transaksi termasuk metadata OCR, pagination/read model, dan Claim locks, form transaksi manual, riwayat transaksi, filter, detail transaksi, Home, Camera/Gallery/OCR/Receipt flow, persistent receipt storage, repository dan layar Claims, ClaimPdfModel, escaped HTML renderer, receipt base64 embedding, Expo Print/Sharing boundary, Settings dan reset database/file dengan default re-seeding, serta hardening Milestone 14 untuk interrupted OCR, rapid actions, unsaved Claim Back, dan aggregate money overflow.

## Verifikasi manual saat ini

Automated tests tidak menggantikan pengujian pada emulator. Untuk scope sampai Milestone 14, cek minimal:

1. Aplikasi terbuka tanpa error database atau crash.
2. Halaman Transactions, Manual Transaction, Categories, dan Payment Methods dapat dibuka dari halaman utama.
3. Form transaksi baru default ke Expense; ketika Income dipilih, field Reimbursable dan Receipt tidak ditampilkan.
4. Amount dan Category wajib diisi, serta tanggal/waktu masa depan ditolak.
5. Expense dapat disimpan dengan Category, Payment Method opsional, Reimbursable, Merchant, Note, dan Receipt manual.
6. Receipt hanya menerima JPEG/PNG/WEBP dan tampil dengan status `OCR not processed`.
7. Income dapat disimpan, tetapi tidak dapat reimbursable atau memiliki Receipt.
8. Tombol save tidak menghasilkan transaksi ganda ketika ditekan berulang saat proses save berlangsung.
9. Tombol Back dan hardware Back menampilkan konfirmasi ketika ada perubahan yang belum disimpan.
10. Transaksi yang baru disimpan dapat dibuka melalui **Edit saved transaction**, diedit, dan dihapus dengan konfirmasi.
11. Transaksi dan receipt tetap tersedia setelah aplikasi ditutup paksa lalu dibuka kembali.
12. Delete transaksi juga menghapus row receipt terkait tanpa foreign-key violation.
13. Aturan custom/default/fallback category dan payment method dari Milestone 3 tetap berlaku.
14. Loading, validation, confirmation, success, dan failure state yang relevan tampil dengan benar.
15. Daftar Transactions menampilkan transaksi terbaru terlebih dahulu dan memuat halaman berikutnya saat mendekati akhir daftar.
16. Search menemukan transaksi berdasarkan Merchant/Source, Note, dan nama Category tanpa membedakan kapitalisasi.
17. Filter Type, Category, Date Range, Payment Method, Reimbursable, dan Has Receipt dapat diterapkan dan di-reset.
18. Kombinasi search/filter tanpa hasil menampilkan `No matching transactions`, bukan empty state data baru.
19. Transaction Detail menampilkan seluruh field yang relevan; Edit, Delete, dan Add mengembalikan pengguna ke daftar yang sudah ter-refetch.
20. Edit transaksi tanpa mengubah amount tidak mengubah nilai minor-unit yang tersimpan.
21. Home menampilkan bulan lokal saat ini serta total Expense, Income, dan Net dari data SQLite bulan tersebut.
22. Net menggunakan rumus Income dikurangi Expense dan tetap menampilkan tanda yang benar ketika hasilnya negatif.
23. Spending by category hanya menghitung Expense dalam currency Home, diurutkan berdasarkan jumlah terbesar, dan menampilkan maksimum lima bar horizontal beserta nominalnya.
24. Recent transactions menampilkan maksimum lima transaksi terbaru dan membuka Transaction Detail ketika ditekan.
25. Home menampilkan state kosong yang benar ketika belum ada transaksi atau belum ada Expense pada bulan berjalan.
26. Home melakukan refetch setelah kembali dari Add/Edit/Delete dan pull-to-refresh dapat digunakan tanpa menggandakan data.
27. Add Transaction menampilkan opsi Enter Manually, Scan Receipt, dan Import Receipt dalam urutan PRD; ketiganya membuka flow yang sesuai.
28. Import Receipt membuka Android Photo Picker untuk satu image JPEG/PNG/WEBP dan kembali normal ketika picker dibatalkan.
29. Image dengan MIME atau metadata yang tidak valid menghasilkan error yang recoverable dan dapat dipilih ulang.
30. Image diproses on-device dengan ML Kit tanpa request jaringan dan selalu masuk ke Receipt Review ketika teks ditemukan.
31. Receipt Review menampilkan thumbnail dan field Total, Merchant, Date & Time, Category, Payment Method, Reimbursable, dan Note yang dapat diedit.
32. Hasil OCR partial menampilkan peringatan; total yang tidak terdeteksi wajib diisi sebelum Save.
33. OCR kosong, native error, dan timeout menampilkan fallback yang recoverable; Enter Manually tetap mempertahankan receipt.
34. Transaction/Receipt baru dibuat hanya setelah final Save, dengan `processed`, `partial`, atau `failed` serta raw text/subtotal/tax yang sesuai.
35. Camera permission baru diminta setelah Scan Receipt dipilih; denial menampilkan Open Settings dan Import Receipt.
36. Camera membuka rear preview, flash dapat diubah, dan capture menampilkan preview dengan Retake serta Use Photo.
37. Retake kembali ke live camera; Use Photo masuk ke OCR/Review pipeline yang sama dengan Gallery.
38. Gallery shortcut dari Camera membuka single-image picker tanpa menjalankan parser lain.
39. Setelah Save, `receipts.storage_key` berisi key relatif `receipts/<file>`, bukan URI gallery/camera atau absolute path.
40. Receipt Viewer dari Transaction Detail menampilkan file yang disalin ke document storage.
41. Force-stop dan buka ulang aplikasi; receipt yang sama tetap dapat dilihat.
42. Mengganti receipt menampilkan file baru dan membersihkan file lama hanya setelah DB update berhasil.
43. Melepas receipt atau menghapus transaction membersihkan row receipt dan file persistent terkait.
44. Simulasi kegagalan DB setelah copy membersihkan file baru; kegagalan replace tidak menghilangkan file lama.
45. Claims hanya menawarkan Expense dengan `is_reimbursable = true` yang belum menjadi anggota Claim lain; receipt tidak wajib.
46. New Claim memvalidasi Title maksimum 100 karakter, Description maksimum 500 karakter, serta manual period yang valid.
47. IDR dapat digabung dengan IDR dan USD dengan USD; pemilihan currency berbeda menampilkan `This expense uses a different currency.`
48. Claim Review menampilkan expense rows, total derived dari transaksi, serta jumlah receipt attached/missing sebelum Save Draft.
49. Draft Claim dapat diedit, expense dapat ditambah/dihapus, dapat ditandai Submitted, dan dapat dihapus tanpa menghapus transaksi.
50. Submitted Claim terkunci, tetapi dapat dipindahkan kembali ke Draft, ditandai Reimbursed, atau ditandai Rejected.
51. Rejected Claim dapat dipindahkan kembali ke Draft; Reimbursed Claim bersifat terminal dan read-only.
52. Satu Transaction tidak dapat menjadi anggota dua Claims dan Income/non-reimbursable Expense ditolak oleh repository meskipun dipanggil di luar UI.
53. Edit amount/date pada transaction anggota Draft Claim memperbarui total/auto period secara derived; membuatnya tidak eligible ditolak sampai membership dilepas.
54. Delete transaction anggota Draft menampilkan warning dan melepas membership; delete/edit pada Submitted, Rejected, atau Reimbursed Claim diblokir.
55. Export PDF bekerja ketika koneksi jaringan emulator dimatikan dan tidak melakukan request HTTP.
56. PDF menampilkan title, period, generated date, expense table, currency-aware amount, dan total Claim yang benar.
57. Merchant, note, category, title, dan description dengan karakter HTML ditampilkan sebagai teks aman, bukan markup executable.
58. Receipt persistent muncul pada Receipt Attachments; expense tanpa receipt tetap muncul dengan `Receipt not attached`.
59. Nama file mengikuti `expense-claim-<slug-title>-<date>.pdf` dan hasil berada di `cache/exports`, bukan database atau document storage.
60. Export failure menampilkan error recoverable tanpa mengubah Claim atau membership.
61. Pada Reimbursed Claim, Share PDF membuka native share sheet dengan MIME `application/pdf` dan local `file://` URI.
62. Settings dapat dibuka dari Home dan menyediakan link menuju Categories serta Payment Methods.
63. Currency menampilkan `Indonesian Rupiah (IDR)` sebagai read-only dan tidak menyediakan kontrol perubahan currency.
64. About menampilkan nama aplikasi, versi, sifat offline-first/local-only, dan OCR on-device.
65. Menekan Delete All Data belum menghapus data pada dialog pertama; pengguna harus memilih Continue lalu Delete All Data pada dialog kedua.
66. Membatalkan salah satu dialog konfirmasi mempertahankan seluruh data.
67. Setelah konfirmasi final, Transactions, Receipts, Claims, Claim Items, custom Categories, custom Payment Methods, receipt files, dan `cache/exports` terhapus.
68. Setelah reset, default Categories, Payment Methods, `welcome_seen`, dan currency IDR tersedia kembali; Home terbuka dalam empty state yang valid.
69. Hasil OCR yang selesai setelah Import Receipt ditutup diabaikan dan tidak mengubah flow berikutnya.
70. Rapid tap pada save, capture, Claim status/delete/PDF, transaction delete, management save/delete, dan reset data tidak menjalankan operasi native/database ganda.
71. Total Claim yang melampaui safe integer ditolak secara recoverable di UI dan repository tanpa crash atau partial write.
72. Back/hardware Back pada Claim Form mundur satu step; pada step pertama dengan perubahan, tampil konfirmasi discard.
73. Merchant panjang membungkus maksimal dua baris tanpa mendorong amount keluar dari row; tombol tetap terbaca pada font scaling Android.
74. Drag pada form yang berisi input menutup keyboard dan tap pada kontrol tetap dapat diproses.
75. Empty history dan daftar berisi 100+ Transactions/Claims tetap memiliki state, urutan, dan pagination yang benar.
76. Force-stop/relaunch mempertahankan Transaction dan Receipt yang tersimpan; navigasi serta PDF lokal tetap bekerja ketika jaringan dimatikan.

Untuk mengecek persistence melalui terminal:

```powershell
adb shell am force-stop com.personalfinance.app
adb shell am start -n com.personalfinance.app/.MainActivity
```

## Reset data lokal

Reset yang sesuai flow aplikasi tersedia melalui **Home > Settings > Delete All Data**. Flow ini memakai dua tahap konfirmasi, membersihkan database dan file yang dikelola aplikasi, menanam ulang default, lalu kembali ke Home.

Untuk reset tingkat package ketika debugging bootstrap/migration:

Untuk mengulang pengujian dari database bersih:

```powershell
adb shell pm clear com.personalfinance.app
```

**Peringatan:** command ini menghapus seluruh data aplikasi pada emulator/perangkat Android yang sedang dipilih. Saat aplikasi dibuka kembali, migrasi akan berjalan dan default categories, payment methods, serta app settings akan dibuat ulang.

Jika lebih dari satu device terhubung, tentukan target secara eksplisit:

```powershell
adb -s <device-id> shell pm clear com.personalfinance.app
```

## Troubleshooting

### Development build belum terpasang

Jika Metro menampilkan pesan bahwa development build tidak ditemukan, pastikan emulator aktif lalu jalankan:

```powershell
npm run android
```

### `Unknown command: "expo"`

`expo` bukan subcommand npm, jadi jangan menjalankan `npm expo start`. Gunakan salah satu command berikut:

```powershell
npm start
# atau
npx expo start --dev-client
```

### Native build gagal dengan Java 25

Jika output Gradle/CMake menyebut Java 25 atau restricted `System` method, hentikan proses, arahkan `JAVA_HOME` ke JDK 17, lalu jalankan kembali `npm run android`.

### Metro cache bermasalah

Hentikan Metro dengan `Ctrl+C`, lalu:

```powershell
npx expo start --dev-client --clear
```

### Emulator tidak terdeteksi

```powershell
adb devices
adb kill-server
adb start-server
```

Lalu restart emulator jika status masih `offline`.

### Aplikasi tidak dapat terhubung ke Metro

Pastikan Metro berjalan dan port development diteruskan ke emulator:

```powershell
adb reverse tcp:8081 tcp:8081
```

Kemudian buka kembali aplikasi.

### Pemeriksaan dependency/config Expo

```powershell
npx expo-doctor@latest
```

Jangan menjalankan auto-fix dependency atau upgrade major secara membabi buta. Cocokkan setiap perubahan dengan Expo SDK 57, PRD, dan `package-lock.json`.

## Struktur proyek

```text
src/
  app/                    Expo Router routes
  components/ui/          shared UI primitives
  db/                     SQLite provider, migrations, dan seeds
  features/home/          targeted SQL aggregation dan Home screen
  features/receipts/      Camera/Gallery, ML Kit boundary, parser, flow Context, dan Receipt Review
  features/claims/        Claims domain/UI serta offline PDF generation dan sharing
  features/settings/      Settings overview, read-only currency, dan transactional data reset
  features/categories/    category management dan picker
  features/payment-methods/
  features/transactions/  manual form, history, filters, detail, receipt picker, repository
  lib/                    pure TypeScript utilities
  theme/                  design tokens
tests/                    Jest unit/component/integration tests
assets/                   app icons dan static assets
PRD.md                    product dan engineering specification
```

Database bersifat local-first dan disimpan di application sandbox. Jangan menambahkan backend, cloud sync, global state library, ORM, atau dependency lain yang ditolak PRD tanpa requirement nyata dan persetujuan scope.

## Checklist sebelum melanjutkan phase

- Baca requirement dan acceptance criteria phase dari `PRD.md`.
- Pastikan milestone sebelumnya sudah selesai dan terverifikasi.
- Tambahkan test yang relevan dengan perubahan.
- Jalankan seluruh quality gates.
- Uji related screen dan failure path pada Pixel 7 emulator.
- Jika ada perubahan native, jalankan Expo Doctor dan Android build.
- Dokumentasikan blocker atau penyimpangan secara eksplisit.
