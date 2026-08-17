# Personal Finance App 💰

Aplikasi pencatatan keuangan pribadi (_Personal Finance_) modern berbasis Android yang dibangun menggunakan **Expo Development Build**, **React Native**, **TypeScript**, **Expo Router**, dan **SQLite**.

Aplikasi dirancang dengan arsitektur **Offline-First**, di mana seluruh data transaksi, anggaran, target tabungan, lampiran foto struk, dan ekspor dokumen PDF disimpan dan diproses 100% secara lokal pada perangkat tanpa memerlukan koneksi internet maupun server eksternal.

---

## 📱 Fitur Utama

- **Pencatatan Transaksi Cepat**: Catat pemasukan (_Income_) dan pengeluaran (_Expense_) harian dengan nominal, kategori, metode pembayaran, catatan, dan tanggal/waktu.
- **Lampiran Bukti Struk Manual**: Lampirkan foto bukti struk transaksi langsung dari Kamera atau Galeri perangkat, tersimpan aman di direktori lokal.
- **Analitik & Grafik Finansial**: Visualisasi pengeluaran bulanan, grafik perbandingan mingguan, dan diagram breakdown kategori (_Donut Chart_).
- **Anggaran Kategori (_Category Budgets_)**: Tetapkan batas pengeluaran bulanan per kategori dengan indikator visual dan peringatan over-budget.
- **Target Tabungan (_Savings Goals_) & Habit Streak**: Pantau progres tabungan impian dan pertahankan streak pencatatan keuangan harian dengan lencana (_badges_).
- **Klaim Reimbursement & Ekspor PDF**: Kelompokkan transaksi yang dapat diklaim (_reimbursable_) ke dalam laporan klaim dan ekspor menjadi berkas PDF resmi lengkap dengan lampiran foto struk.
- **Kategori & Metode Pembayaran Dinamis**: Kelola kategori dan metode pembayaran kustom sesuai kebutuhan pribadi.
- **Tema & Bahasa**: Mendukung Dark Mode / Light Mode serta pilihan bahasa Indonesia dan Inggris.
- **Privasi & Keamanan**: Tanpa registrasi akun, tanpa cloud tracking, dan opsi _Delete All Data_ untuk reset total data lokal.

---

## 🛠️ Tech Stack

- **Framework**: [Expo SDK 57](https://expo.dev) & [React Native 0.86](https://reactnative.dev)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Routing & Navigasi**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Database Lokal**: `expo-sqlite` (SQLite Storage)
- **Media & File**: `expo-camera`, `expo-image-picker`, `expo-file-system`
- **Dokumen & Berbagi**: `expo-print`, `expo-sharing`
- **Testing**: [Jest](https://jestjs.io/), `jest-expo`, `@testing-library/react-native`
- **Code Quality**: ESLint, Prettier, TypeScript Compiler

---

## 📋 Prasyarat Sistem (_Prerequisites_)

Sebelum menjalankan atau mem-build aplikasi, pastikan komputer Anda telah terpasang:

1. **Node.js**: Versi LTS (`^20.19.4`, `^22.13.0`, `^24.3.0`, atau `>=25.0.0`).
2. **Java Development Kit (JDK)**: **JDK 17** (disarankan [Eclipse Temurin 17](https://adoptium.net/temurin/releases/?version=17)).
3. **Android Studio**:
   - Android SDK Platform (API 34 / 35 / 36)
   - Android SDK Build-Tools & Platform-Tools (`adb`)
   - Android Emulator (misal: Pixel 7 dengan API 36 / Google Play image)
4. **Environment Variables** (Windows PowerShell):
   ```powershell
   # Contoh path umum di Windows:
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot"
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
   ```
   > Pastikan perintah `node --version`, `java -version`, dan `adb version` dapat dijalankan dari terminal.

---

## 🚀 Panduan Menjalankan Aplikasi (_Development_)

### 1. Install Dependencies

Buka terminal di direktori root proyek:

```bash
npm install
```

### 2. Nyalakan Emulator Android / Hubungkan Perangkat Fisik

- **Via Emulator**: Buka Android Studio > Device Manager > Jalankan Virtual Device.
- **Via HP Fisik**: Aktifkan **USB Debugging** di menu _Developer Options_ HP Anda dan sambungkan dengan kabel USB.
- Verifikasi koneksi:
  ```bash
  adb devices
  ```

### 3. Build & Jalankan Aplikasi Pertama Kali

Jalankan perintah berikut untuk mengompilasi kode native Android, menginstal aplikasi ke perangkat, dan menyalakan Metro Bundler:

```bash
npm run android
```

_(Atau `npx expo run:android`)_

> [!TIP]
> Jika port `8081` bentrok dengan aplikasi lain, tentukan port lain secara manual:
>
> ```bash
> npx expo run:android --port 8082
> ```

### 4. Menjalankan Sesi Harian Berikutnya

Jika aplikasi native sudah terinstal di emulator/HP dan Anda hanya mengubah kode React/TypeScript:

```bash
npm start
```

Buka aplikasi **Personal Finance** di perangkat, dan perubahan kode akan otomatis ter-update via _Fast Refresh_.

---

## 📦 Panduan Build Menjadi APK (_Production / Standalone_)

Ada dua cara mudah untuk menghasilkan file instalasi APK:

### Opsi A: Build APK Standalone Langsung (Gradle Lokal) — _Direkomendasikan_

Anda dapat mem-build APK Release langsung tanpa koneksi cloud Expo:

#### 1. Masuk ke folder `android` dan jalankan Gradle:

- **Windows (PowerShell / Command Prompt)**:
  ```powershell
  cd android
  .\gradlew assembleRelease
  cd ..
  ```
- **macOS / Linux**:
  ```bash
  cd android
  ./gradlew assembleRelease
  cd ..
  ```

#### 2. Lokasi Output File APK:

Setelah build sukses, file APK siap instal berada di:

```text
android/app/build/outputs/apk/release/app-release.apk
```

_(Atau untuk debug build: `android/app/build/outputs/apk/debug/app-debug.apk` via `.\gradlew assembleDebug`)_

#### 3. Instal APK ke Emulator / HP:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Atau langsung copy file `.apk` tersebut ke smartphone Android Anda dan install manual (_Sideload_).

---

### Opsi B: Build APK Menggunakan EAS CLI (_Expo Application Services_)

Jika Anda menggunakan EAS Build:

1. Pastikan EAS CLI terpasang:
   ```bash
   npm install -g eas-cli
   ```
2. Build APK untuk Android (Preview / Standalone APK):
   ```bash
   eas build -p android --profile preview
   ```
   _(Atau tambahkan flag `--local` jika ingin proses build dieksekusi di komputer lokal Anda)_.

---

## 🧪 Quality Gates & Pengujian (_Testing_)

Sebelum melakukan commit atau rilis kode baru, jalankan seluruh pipeline pemeriksaan:

```bash
# 1. Pengecekan tipe TypeScript
npm run typecheck

# 2. Menjalankan unit test Jest
npm test

# 3. Linter kode
npm run lint

# 4. Pengecekan formatting Prettier
npm run format:check
```

### Format Kode Otomatis:

```bash
npm run format
```

---

## 🔧 Troubleshooting & Solusi Umum

| Kendala                                            | Penyebab Umum                                                              | Solusi                                                                                                                 |
| :------------------------------------------------- | :------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Port 8081 already in use**                       | Ada proses Node/Metro lain yang masih berjalan.                            | Jalankan dengan port lain: `npx expo start --port 8082` atau kill proses di port 8081.                                 |
| **Gradle build error / Java Version mismatch**     | Menggunakan JDK 21/25 bawaan Android Studio terbaru yang belum kompatibel. | Pastikan `JAVA_HOME` mengarah ke **JDK 17** (`java -version`).                                                         |
| **Cache Metro / Expo bermasalah**                  | Cache bundler lama menumpuk.                                               | Jalankan Metro dengan flag reset: `npx expo start -c`.                                                                 |
| **Build Native Android Gagal setelah ubah config** | File build Gradle lama tidak sinkron.                                      | Masuk ke folder android dan bersihkan cache: `cd android && .\gradlew clean && cd ..` lalu jalankan `npm run android`. |
| **Perangkat tidak terdeteksi di adb**              | USB Debugging belum aktif / driver belum terpasang.                        | Cek status dengan `adb devices`, pastikan statusnya `device` (bukan `unauthorized`).                                   |

---

## 📄 Struktur Direktori Utama

```text
├── src/
│   ├── app/                 # Rute halaman Expo Router (Tabs, Modals, Detail)
│   ├── components/          # Komponen UI global (AppButton, AppInput, Screen)
│   ├── db/                  # Inisialisasi SQLite Database, Migrasi, dan Seeds
│   ├── features/            # Modul fitur terisolasi
│   │   ├── analytics/       # Grafik cashflow, perbandingan mingguan, breakdown
│   │   ├── budgets/         # Penganggaran kategori & modal budget
│   │   ├── categories/      # Manajemen kategori & picker
│   │   ├── claims/          # Manajemen klaim reimbursement & PDF generator
│   │   ├── goals/           # Target tabungan (Savings goals)
│   │   ├── habits/          # Habit tracker & streak badges
│   │   ├── home/            # Dashboard ringkasan keuangan
│   │   ├── payment-methods/ # Manajemen metode pembayaran
│   │   ├── receipts/        # Penyimpanan file struk & penampil gambar struk
│   │   ├── settings/        # Pengaturan tema, bahasa, & reset database
│   │   └── transactions/    # Input transaksi manual, riwayat, filter, & detail
│   ├── lib/                 # Utility tanggal, uang (IDR), format string, & error
│   └── theme/               # Token desain (warna, spacing, radius, tipografi)
├── tests/                   # 100% Automated Unit & Integration Test Suites
└── package.json             # Konfigurasi dependensi proyek
```

---

## 📜 Lisensi

Aplikasi ini bersifat privat untuk pencatatan keuangan pribadi offline-first.
