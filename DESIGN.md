# Design System & Guidelines: Mobile Finance App

Dokumen ini adalah panduan desain resmi (_Design System & UX Guidelines_) untuk aplikasi **Mobile Finance App**. Panduan ini memastikan seluruh layar, komponen, interaksi, dan alur visual konsisten, modern, dan sesuai dengan target pengguna utama: **Milenial & Gen Z**.

---

## 1. Filosofi Desain & Persona Pengguna

### Target Pengguna: Milenial & Gen Z

- **Zero-Friction & Speed**: Menolak formulir panjang yang membosankan. Prioritas pada _Quick-Entry_ (catat dalam < 3 detik).
- **Visual-Driven**: Membaca ikon dan warna lebih cepat daripada membaca teks panjang.
- **Modern & Clean Aesthetics**: Gaya antarmuka minimalis, _soft shadows_, sudut membulat (_rounded corners_), palet warna pastel yang kontras dan elegan.
- **Clarity & Financial Confidence**: Tampilan saldo dan pengeluaran jelas, tegas, dan mudah dipahami dalam sekali pandang.

---

## 2. Palet Warna (Color Palette & Tokens)

### A. Core Neutral & Surfaces (Light & Dark Mode)

| Token              | Light Theme              | Dark Theme (OLED)     | Penggunaan                                     |
| :----------------- | :----------------------- | :-------------------- | :--------------------------------------------- |
| `background`       | `#F8FAFC`                | `#0B0F19`             | Latar belakang layar utama                     |
| `surface`          | `#FFFFFF`                | `#1E293B`             | Kartu konten, popup modal, input wrap          |
| `surfaceSecondary` | `#F1F5F9`                | `#334155`             | Chip shortcut, segmented toggle                |
| `border`           | `#E2E8F0`                | `#334155`             | Garis batas kartu, divider                     |
| `borderSubtle`     | `#CBD5E1`                | `#475569`             | Garis pemisah kontras tinggi                   |
| `overlayBackdrop`  | `rgba(15, 23, 42, 0.65)` | `rgba(0, 0, 0, 0.75)` | Latar belakang redup pada _Bottom Sheet Modal_ |

### B. Typography Colors

| Token           | Light Theme | Dark Theme | Penggunaan                                    |
| :-------------- | :---------- | :--------- | :-------------------------------------------- |
| `textPrimary`   | `#0F172A`   | `#F8FAFC`  | Judul utama, nominal uang, teks tebal         |
| `textSecondary` | `#64748B`   | `#94A3B8`  | Label subjudul, keterangan waktu, placeholder |
| `textMuted`     | `#94A3B8`   | `#64748B`  | Ikon pasif, hint text                         |

### C. Brand & Semantic Colors

| Token          | Light Theme | Dark Theme | Penggunaan                                       |
| :------------- | :---------- | :--------- | :----------------------------------------------- |
| `primary`      | `#2563EB`   | `#3B82F6`  | Tombol aksi utama, tab aktif (Electric Blue)     |
| `primaryLight` | `#EFF6FF`   | `#1E3A8A`  | Latar belakang chip shortcut aktif               |
| `positive`     | `#15803D`   | `#22C55E`  | Pemasukan (Income), saldo surplus, status sukses |
| `destructive`  | `#B42318`   | `#EF4444`  | Pengeluaran (Expense), tombol hapus, badge error |
| `warning`      | `#B54708`   | `#F59E0B`  | Status peringatan, klaim draft/pending           |

### D. Category Pastel System (`category-meta.ts`)

Setiap kategori pengeluaran/pemasukan memiliki pasangan warna ikon (solid) dan warna latar (pastel):

- **Makanan & Minuman**: `#EA580C` (Oranye) pada `#FFEDD5` (Soft Orange)
- **Transportasi**: `#0284C7` (Biru Langit) pada `#E0F2FE` (Soft Sky)
- **Belanja**: `#7C3AED` (Ungu) pada `#EDE9FE` (Soft Purple)
- **Tagihan & Utilitas**: `#DC2626` (Merah) pada `#FEE2E2` (Soft Red)
- **Hiburan & Hobi**: `#DB2777` (Pink) pada `#FCE7F3` (Soft Pink)
- **Gaji & Pemasukan**: `#16A34A` (Hijau) pada `#DCFCE7` (Soft Green)
- **Investasi**: `#0D9488` (Teal) pada `#CCFBF1` (Soft Teal)

---

## 3. Skala Tipografi (Typography Scale)

| Style Token    | Size / Line Height | Weight         | Penerapan                                          |
| :------------- | :----------------- | :------------- | :------------------------------------------------- |
| `displayHero`  | `34px / 40px`      | `900` (Black)  | Display nominal besar di Quick-Entry & Total Saldo |
| `pageTitle`    | `24px / 30px`      | `800` (Bold)   | Judul layar utama (Beranda, Riwayat, Pengaturan)   |
| `sectionTitle` | `18px / 24px`      | `700` (Bold)   | Judul bagian / section header                      |
| `body`         | `16px / 24px`      | `500` (Medium) | Teks isi, deskripsi kartu, nama transaksi          |
| `subtext`      | `14px / 20px`      | `500` (Medium) | Nilai sekunder, tanggal transaksi, opsi input      |
| `caption`      | `12px / 16px`      | `700` (Bold)   | Label chip, shortcut pill (+2k), badge kategori    |

---

## 4. Spasi, Sudut & Elevasi (Spacing, Radius & Elevation)

### Spacing Grid (Kelipatan 4px/8px)

- `xs: 4px` — Jarak antar ikon dan teks kecil
- `sm: 8px` — Padding internal chip, gap elemen vertikal
- `md: 16px` — Padding horizontal standar layar & kartu
- `lg: 24px` — Margin antar-seksi konten
- `xl: 32px` — Jarak pemisah modul besar

### Radius Tokens

- `sm: 8px` — Sudut badge kecil & thumbnail foto
- `md: 12px` — Sudut input form & kotak dialog
- `lg: 18px` — Sudut kartu utama & container nominal
- `modal: 28px` — Sudut atas (_Top Radius_) Bottom Sheet Modal
- `pill: 999px` — Tombol chip, segmented toggle, FAB button

### Shadows & Elevation

- **Elevasi Kartu (Card)**: `shadowOffset: { width: 0, height: 2 }`, `shadowOpacity: 0.06`, `shadowRadius: 8`, `elevation: 2`
- **Elevasi Bottom Sheet**: `shadowOffset: { width: 0, height: -4 }`, `shadowOpacity: 0.15`, `shadowRadius: 16`, `elevation: 8`
- **Elevasi Primary Button**: `shadowColor: #2563EB`, `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.25`, `shadowRadius: 10`, `elevation: 4`

---

## 5. Standar Komponen (Component Specs)

### A. Quick-Entry Bottom Sheet Modal

- **Presentasi**: `presentation: 'transparentModal'` dengan animasi slide-up mulus di atas halaman aktif.
- **Drag Handle**: Lebar `44px`, tinggi `5px`, radius `pill`, warna `#E2E8F0`.
- **Segmented Toggle**: 2 opsi (`💸 Pengeluaran` merah & `💰 Pemasukan` hijau).
- **Hero Amount Display**: Angka besar terformat otomatis (`Rp 25.000`) dengan keyboard numpad otomatis.
- **Quick Cash Shortcuts**: Barisan horizontal `[ +2k ]` `[ +5k ]` `[ +10k ]` `[ +20k ]` `[ +50k ]` `[ +100k ]` `[ ⌫ Reset ]`.
- **1-Tap Category Grid**:
  - Lingkaran `52x52px` dengan ikon dari `getCategoryMeta`.
  - Status aktif: Border `2px` warna primary, shadow glowing, dan skala `1.05x`.
- **Payment Method Strip**: Chip horizontal cepat (`Tunai`, `QRIS`, `BCA/Bank`).
- **Lampiran Foto Cepat**: Chip `[ + Foto ]` untuk melampirkan bukti kamera/galeri tanpa OCR.
- **Hero Save Button**: Tombol full-width `56px` dengan label dinamis `✓ Simpan Pengeluaran • Rp ...`.

### B. Navigation Tab Bar

- **Tinggi**: `64px` + Safe Area Bottom Insets.
- **Latar Belakang**: Putih `#FFFFFF` dengan garis atas halus `#CBD5E1`.
- **Tombol Tambah Tengah (Action FAB)**:
  - Tombol lingkaran melayang `58x58px` dengan border putih tebal `4px` dan latar biru primer `#2563EB`.
  - Ikon plus putih besar `32px`.

### C. Kartu Transaksi (Transaction List Item)

- Ikon kategori di sebelah kiri dalam lingkaran pastel `44x44px`.
- Baris 1: Nama Toko / Keterangan (Bold 15px) di kiri, Nominal (Bold 16px) di kanan (`− Rp 45.000` merah atau `+ Rp 500.000` hijau).
- Baris 2: Nama Kategori · Tanggal transaksi · Badge `📎 Struk` (jika ada foto).

---

## 6. Pedoman Aksesibilitas & Interaksi

1. **Touch Target Size**: Seluruh tombol, chip, dan elemen yang dapat disentuh memiliki area sentuh minimum `48x48px` (menggunakan `hitSlop`).
2. **Feedback Sentuhan**:
   - `android_ripple={{ color: 'rgba(0, 0, 0, 0.08)' }}` pada Android.
   - `transform: [{ scale: 0.98 }]` dan `opacity: 0.8` saat ditekan.
3. **Dukungan Dua Bahasa (i18n)**:
   - Seluruh teks antarmuka menggunakan sistem lokalisasi terpusat di `src/lib/i18n/translations.ts` (`id` dan `en`).
   - Format mata uang konsisten menggunakan pemisah ribuan titik (`Rp 25.000`) sesuai standar Indonesia.
