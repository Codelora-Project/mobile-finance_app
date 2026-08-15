# Personal Finance

Aplikasi pencatatan keuangan pribadi berbasis Android yang dibangun dengan Expo Development Build, React Native, TypeScript, Expo Router, dan SQLite. Proyek ini masih dalam tahap pengembangan; implementasi saat ini telah mencapai **Milestone 3** (fondasi database/utilitas serta pengelolaan kategori dan metode pembayaran).

`PRD.md` adalah **single source of truth** untuk requirement, arsitektur, urutan implementasi, dan acceptance criteria. Jangan mengimplementasikan phase berikutnya sebelum milestone sebelumnya selesai dan terverifikasi.

## Stack saat ini

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript strict
- Expo Router
- `expo-sqlite`
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
4. JDK yang kompatibel dengan Android Gradle Plugin. JDK bawaan Android Studio (`jbr`) dapat digunakan.

Pastikan perintah berikut dapat dijalankan dari terminal:

```powershell
node --version
npm --version
java -version
adb version
```

Jika `java` atau `adb` tidak ditemukan, atur `JAVA_HOME`, `ANDROID_HOME`, dan `Path` ke instalasi lokal Android Studio/SDK. Contoh untuk sesi PowerShell saat ini dengan lokasi instalasi Windows yang umum:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
```

Lokasi aktual dapat berbeda. Perintah di atas hanya berlaku pada terminal aktif; tambahkan nilai yang sama melalui Windows Environment Variables agar permanen, lalu buka terminal baru.

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

Test yang tersedia saat ini mencakup bootstrap route, inisialisasi/migrasi database, utilitas money/date/text/error, serta repository kategori dan metode pembayaran.

## Verifikasi manual saat ini

Automated tests tidak menggantikan pengujian pada emulator. Untuk scope sampai Milestone 3, cek minimal:

1. Aplikasi terbuka tanpa error database atau crash.
2. Halaman Categories dan Payment Methods dapat dibuka dari halaman utama.
3. Custom expense dan income category dapat dibuat serta diedit.
4. Nama kategori duplikat tanpa membedakan kapitalisasi ditolak dalam tipe yang sama.
5. Nama kategori yang sama dapat digunakan pada tipe expense dan income yang berbeda.
6. Default/fallback category tidak dapat diedit atau dihapus.
7. Custom payment method dapat dibuat, diedit, dan dihapus.
8. Default payment method tidak dapat diedit atau dihapus.
9. Data custom tetap tersedia setelah aplikasi ditutup paksa lalu dibuka kembali.
10. Empty, loading, validation, confirmation, dan failure state yang relevan tampil dengan benar.

Untuk mengecek persistence melalui terminal:

```powershell
adb shell am force-stop com.personalfinance.app
adb shell am start -n com.personalfinance.app/.MainActivity
```

## Reset data lokal

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
  features/categories/    category management dan picker
  features/payment-methods/
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
