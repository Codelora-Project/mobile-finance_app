# Personal Finance Design System

> Panduan kanonis untuk desain produk dan implementasi antarmuka aplikasi Personal Finance.

| Metadata        | Nilai                             |
| --------------- | --------------------------------- |
| Status          | Aktif                             |
| Platform utama  | Android, React Native, Expo       |
| Bahasa          | Bahasa Indonesia dan Inggris      |
| Tema            | Light, dark, dan mengikuti sistem |
| Mode data       | Offline-first                     |
| Sumber token    | `src/theme/`                      |
| Komponen global | `src/components/ui/`              |
| Lebar maksimum  | `720px`                           |

Dokumen ini menjelaskan tampilan, perilaku, dan cara implementasi komponen. Nilai token di `src/theme/` tetap menjadi sumber kebenaran teknis. Jika implementasi dan dokumen tidak sinkron, perbarui keduanya dalam perubahan yang sama.

---

## 1. Tujuan

Design system ini memastikan aplikasi:

- mudah dipahami dalam sekali pindai;
- terasa aman dan dapat dipercaya untuk data keuangan;
- cepat digunakan untuk pencatatan sehari-hari;
- konsisten di seluruh fitur dan ukuran layar;
- tetap dapat digunakan dalam light mode, dark mode, Bahasa Indonesia, dan Inggris;
- memiliki implementasi yang dapat digunakan ulang dan mudah diuji.

Design system bukan hanya kumpulan warna. Ia mencakup hierarki informasi, komponen, bahasa, aksesibilitas, interaksi, dan aturan pengembangan.

---

## 2. Prinsip desain

### 2.1 Data first

Nominal, periode, status, dan tindakan berikutnya lebih penting daripada dekorasi. Informasi keuangan utama harus terlihat sebelum detail tambahan.

### 2.2 Cepat untuk tugas rutin

Pencatatan transaksi, pemilihan kategori, perpindahan periode, dan filter harus membutuhkan sesedikit mungkin langkah. Gunakan progressive disclosure untuk informasi lanjutan.

### 2.3 Kejelasan membangun kepercayaan

- Gunakan label yang spesifik.
- Jangan mengandalkan ikon atau warna saja.
- Tampilkan loading, kosong, error, sukses, dan disabled state secara eksplisit.
- Konfirmasi tindakan yang tidak dapat dipulihkan.

### 2.4 Hierarki yang tenang

Gunakan ukuran, weight, spacing, dan urutan konten untuk membentuk hierarki. Hindari terlalu banyak kartu, bayangan, badge, warna aksen, atau judul berulang.

### 2.5 Konsistensi lebih penting daripada variasi

Gunakan token dan komponen yang sudah tersedia. Variasi baru hanya dibuat ketika memiliki fungsi atau state yang benar-benar berbeda.

### 2.6 Privasi terlihat dalam pengalaman

Aplikasi bersifat offline-first. Bahasa antarmuka tidak boleh mengesankan bahwa data telah disinkronkan atau disimpan di cloud apabila proses tersebut tidak terjadi.

---

## 3. Fondasi visual

### 3.1 Warna semantik

Gunakan warna berdasarkan fungsi, bukan berdasarkan nama hex atau selera layar tertentu.

| Token               | Light     | Dark      | Penggunaan                                      |
| ------------------- | --------- | --------- | ----------------------------------------------- |
| `background`        | `#F8FAFC` | `#09090B` | Latar utama layar                               |
| `surface`           | `#FFFFFF` | `#18181B` | Kartu, input, dialog, dan tab aktif             |
| `surfaceSecondary`  | `#F1F5F9` | `#27272A` | Segmented control, chip, dan permukaan sekunder |
| `card`              | `#FFFFFF` | `#18181B` | Alias permukaan kartu                           |
| `border`            | `#E2E8F0` | `#303034` | Border kontrol dan kartu                        |
| `divider`           | `#E2E8F0` | `#303034` | Pemisah antarbaris                              |
| `textPrimary`       | `#0F172A` | `#FAFAFA` | Judul, nominal utama, dan isi penting           |
| `textSecondary`     | `#64748B` | `#A1A1AA` | Label, deskripsi, dan metadata                  |
| `textMuted`         | `#94A3B8` | `#71717A` | Placeholder dan ikon pasif                      |
| `positive`          | `#15803D` | `#4ADE80` | Pemasukan, surplus, dan sukses                  |
| `destructive`       | `#B42318` | `#FB7185` | Pengeluaran, error, dan hapus                   |
| `warning`           | `#B54708` | `#FBBF24` | Peringatan dan status yang perlu perhatian      |
| `incomeBackground`  | `#DCFCE7` | `#12351F` | Latar badge pemasukan atau sukses               |
| `expenseBackground` | `#FEE2E2` | `#3A171B` | Latar badge pengeluaran atau error              |
| `warningBackground` | `#FEF3C7` | `#3A2A0F` | Latar badge peringatan                          |
| `onPrimary`         | `#FFFFFF` | `#FFFFFF` | Konten di atas warna primary                    |
| `shadow`            | `#000000` | `#000000` | Warna dasar bayangan                            |

#### Aturan penggunaan warna

- Ambil warna melalui `useTheme()`. Jangan mengimpor palet light secara langsung ke komponen fitur.
- Gunakan `positive` hanya untuk makna positif, bukan sebagai dekorasi umum.
- Gunakan `destructive` untuk pengeluaran, error, dan tindakan destruktif.
- Transfer bersifat netral: gunakan `textPrimary` atau `textSecondary` dan simbol `⇄`.
- Warna primary menunjukkan aksi utama, pilihan aktif, atau fokus merek.
- Teks di atas warna primary wajib memakai `onPrimary`.
- Jangan menambahkan hex baru sebelum memastikan token yang tersedia tidak mencukupi.
- Warna bukan satu-satunya pembeda. Sertakan label, ikon, tanda `+`, `−`, atau status.

### 3.2 Tema merek

Pengguna dapat memilih aksen merek. Semua preset memakai token semantik yang sama.

| Tema    | Primary light | Primary dark | Primary light background |
| ------- | ------------- | ------------ | ------------------------ |
| Blue    | `#2563EB`     | `#3B82F6`    | `#EFF6FF`                |
| Emerald | `#059669`     | `#10B981`    | `#ECFDF5`                |
| Indigo  | `#4F46E5`     | `#6366F1`    | `#EEF2FF`                |
| Violet  | `#7C3AED`     | `#8B5CF6`    | `#F5F3FF`                |
| Amber   | `#D97706`     | `#F59E0B`    | `#FFFBEB`                |
| Slate   | `#0F172A`     | `#94A3B8`    | `#F1F5F9`                |

Jangan membuat logika komponen berdasarkan nama tema. Komponen hanya boleh bergantung pada token hasil palet aktif.

### 3.3 Tipografi

Font mengikuti font sistem perangkat. Gunakan token berikut sebagai dasar.

| Token           | Ukuran | Line height | Weight | Penggunaan                            |
| --------------- | -----: | ----------: | -----: | ------------------------------------- |
| `displayAmount` |   32px |        38px |    700 | Nominal utama dan angka hero          |
| `pageTitle`     |   24px |        30px |    700 | Judul halaman non-tab atau dashboard  |
| `sectionTitle`  |   18px |        24px |    600 | Judul bagian dan kartu utama          |
| `body`          |   16px |        24px |    400 | Isi, nama item, dan kontrol standar   |
| `secondary`     |   14px |        20px |    400 | Nilai sekunder dan deskripsi          |
| `metadata`      |   12px |        16px |    400 | Waktu, badge, hint, dan label ringkas |

#### Aturan tipografi

- Gunakan maksimal tiga tingkat tipografi yang dominan dalam satu viewport.
- Nominal utama harus lebih kuat daripada labelnya.
- Gunakan weight `700–900` secara terbatas untuk angka utama, pilihan aktif, atau judul.
- Jangan memakai huruf kapital penuh untuk paragraf atau judul halaman.
- Metadata boleh mengecil hingga `11px` pada area padat, tetapi tidak untuk aksi utama.
- Nominal tidak boleh terpotong. Gunakan `numberOfLines`, `adjustsFontSizeToFit`, atau tata letak responsif.
- Gunakan tabular alignment secara visual: nominal berada di kanan ketika ditampilkan dalam daftar.

### 3.4 Spacing

Semua jarak mengikuti grid 4px.

| Token | Nilai | Penggunaan umum                              |
| ----- | ----: | -------------------------------------------- |
| `xs`  |   4px | Jarak ikon–label, metadata, dan elemen mikro |
| `sm`  |   8px | Gap internal kontrol dan antarelemen rapat   |
| `md`  |  16px | Padding layar dan kartu standar              |
| `lg`  |  24px | Pemisah bagian dan padding dialog            |
| `xl`  |  32px | Jarak modul besar                            |
| `xxl` |  48px | Empty state dan ruang akhir layar            |

Aturan dasar:

- Padding horizontal layar: `spacing.md`.
- Gap antarbagian: `spacing.md` atau `spacing.lg`.
- Gap dalam kontrol: `spacing.xs` atau `spacing.sm`.
- Jangan menambahkan nilai acak apabila kombinasi token sudah memadai.

### 3.5 Radius

| Token  | Nilai | Penggunaan                                     |
| ------ | ----: | ---------------------------------------------- |
| `sm`   |   8px | Badge, item kecil, dan bagian internal         |
| `md`   |  12px | Input, tombol, ikon kotak, dan kontrol         |
| `lg`   |  16px | Kartu, kelompok daftar, dan permukaan utama    |
| `pill` | 999px | Chip, segmented control, badge, dan toast pill |

Dialog utama boleh menggunakan `radius.lg + 8` atau `24px`. Jangan mencampur lebih dari dua tingkat radius dalam satu komponen.

### 3.6 Elevasi dan border

Gunakan border terlebih dahulu, kemudian bayangan bila elemen benar-benar mengambang.

| Level | Penggunaan              | Pedoman                                       |
| ----- | ----------------------- | --------------------------------------------- |
| 0     | Latar dan section biasa | Tanpa shadow                                  |
| 1     | Kartu daftar            | Border 1px, shadow opacity sekitar `0.04`     |
| 2     | FAB dan toast           | Elevation `3–8`, shadow opacity `0.12–0.16`   |
| 3     | Dialog modal            | Elevation `12`, shadow opacity sekitar `0.18` |

Hindari kartu bertumpuk di dalam kartu. Gunakan divider atau spacing untuk membentuk subkelompok.

### 3.7 Ikon

- Gunakan `MaterialCommunityIcons` sebagai pustaka ikon utama.
- Ukuran umum: `16px` untuk badge, `20px` untuk kontrol, `22–24px` untuk navigasi, dan `28px` untuk aksi dialog.
- Ikon dekoratif disembunyikan dari pembaca layar.
- Ikon tanpa label visual wajib memiliki `accessibilityLabel` pada tombolnya.
- Kategori memakai gaya monokrom saat ini: ikon slate di atas latar slate lembut. Transfer menggunakan `swap-horizontal`.
- Jangan memakai emoji sebagai ikon kontrol produksi.

### 3.8 Motion

- Motion harus menjelaskan perubahan state, bukan sekadar dekorasi.
- Tekan: opacity `0.65–0.8` atau scale `0.98`.
- Tab aktif dapat memakai spring ringan.
- Bottom navigation dan FAB dapat menghilang saat scroll menggunakan translasi vertikal.
- Modal pemilih menggunakan fade; bottom sheet menggunakan slide atau gesture vertikal.
- Hormati preferensi reduced motion apabila dukungan platform ditambahkan.

---

## 4. Layout dan responsivitas

### 4.1 Safe area

Semua layar root menggunakan komponen `Screen`, yang membungkus `SafeAreaView`. Jangan memberi padding status bar secara manual jika sudah berada di dalam `Screen`.

### 4.2 Lebar konten

- Konten utama memiliki `maxWidth: 720` dan berada di tengah.
- Pada ponsel, gunakan lebar penuh dengan padding horizontal `16px`.
- Dialog pemilih ringkas memiliki lebar maksimum `360px`.
- Daftar dan kartu tidak boleh menempel ke sisi layar.

### 4.3 Urutan vertikal

Urutan default layar data:

1. konteks atau kontrol utama;
2. ringkasan;
3. pencarian dan filter;
4. konten utama;
5. aksi mengambang jika dibutuhkan.

### 4.4 Kepadatan

- Gunakan tinggi kontrol standar minimal `48px`.
- Toolbar padat boleh memakai tinggi `44px`.
- Tombol ikon `40px` wajib memiliki `hitSlop` sehingga target efektif minimal `48px`.
- Baris transaksi memiliki tinggi minimum `62px`.

---

## 5. Hierarki halaman dan navigasi

### 5.1 Bottom navigation

Lima tujuan utama:

1. Beranda / Home
2. Dompet / Wallets
3. Riwayat / Transactions
4. Laporan / Reports
5. Lainnya / More

Spesifikasi:

- Tinggi dasar `64px` ditambah safe-area bawah.
- Ikon `22px` dan label `11px` selalu terlihat.
- Tab aktif memakai warna primary, weight lebih kuat, dan latar pill lembut.
- Tab tidak aktif memakai `textSecondary`.
- Bottom navigation dapat bersembunyi saat pengguna menggulir ke bawah.

### 5.2 Aksi Catat

FAB `Catat`/`Record` adalah aksi global utama:

- berada di kanan bawah di atas bottom navigation;
- tinggi `48px`;
- memakai warna primary dan label teks;
- membuka alur transaksi baru;
- tidak digandakan oleh CTA besar lain pada viewport yang sama tanpa alasan kuat.

### 5.3 Aturan header

Gunakan salah satu pola berikut.

#### A. Dashboard header

Untuk halaman yang memerlukan konteks ringkasan, misalnya Beranda:

- judul utama;
- konteks periode opsional;
- maksimal dua aksi sekunder.

#### B. Control-led header

Untuk root tab yang labelnya sudah jelas dari bottom navigation, judul generik boleh dihilangkan dan diganti kontrol utama. Halaman Riwayat menggunakan:

1. panah bulan sebelumnya;
2. label bulan dan tahun yang membuka pemilih bulan;
3. panah bulan berikutnya;
4. ekspor sebagai aksi sekunder;
5. segmented control Harian, Mingguan, dan Bulanan.

#### C. Detail header

Untuk detail, editor, dan halaman sekunder:

- tombol kembali;
- judul yang menjelaskan objek;
- satu aksi kontekstual bila diperlukan.

Jangan menampilkan judul halaman hanya karena setiap layar lain memilikinya. Judul dipakai untuk memberi konteks, bukan sebagai dekorasi wajib.

---

## 6. Komponen inti

### 6.1 `Screen`

Lokasi: `src/components/ui/screen.tsx`

- Root semua layar.
- Mengelola safe area atas dan warna background.
- Gunakan `edges` hanya ketika suatu layar membutuhkan perilaku safe area berbeda.

### 6.2 `AppButton`

Lokasi: `src/components/ui/app-button.tsx`

| Varian        | Fungsi                                             |
| ------------- | -------------------------------------------------- |
| `primary`     | Aksi utama dan penyelesaian alur                   |
| `secondary`   | Aksi alternatif                                    |
| `destructive` | Hapus atau tindakan berisiko                       |
| `ghost`       | Aksi tersier di area yang sudah memiliki permukaan |

Spesifikasi:

- Tinggi minimum `48px`.
- Radius `12px`.
- Label minimal weight `600`.
- Loading mengganti label dengan spinner.
- Disabled atau loading memakai opacity `0.45` dan tidak dapat ditekan.
- Satu section sebaiknya hanya memiliki satu tombol primary.

### 6.3 Tombol ikon

- Ukuran visual `40–44px`.
- Target sentuh efektif minimal `48px`.
- Wajib memiliki label aksesibilitas.
- Gunakan background surface untuk aksi sekunder yang berdiri sendiri.
- Jangan menampilkan lebih dari tiga ikon tanpa label pada satu baris.
- Aksi berfrekuensi rendah dapat dipindahkan ke overflow menu, selama menu tidak menutupi kontrol penting.

### 6.4 `AppInput`

Lokasi: `src/components/ui/app-input.tsx`

- Label selalu terlihat di atas input.
- Tinggi minimum `48px`.
- Radius `12px` dan border `1px`.
- Placeholder memakai warna sekunder atau muted.
- Error mengubah border dan pesan ke `destructive`.
- Pesan error memakai `accessibilityLiveRegion="polite"`.
- Jangan memakai placeholder sebagai pengganti label pada formulir penting.

### 6.5 Pencarian dan filter

- Search toolbar padat boleh setinggi `44px`.
- Input pencarian memakai ikon magnify, placeholder spesifik, dan tombol clear saat berisi.
- Filter aktif memakai warna primary serta jumlah filter aktif.
- Pencarian dan filter ditempatkan dekat daftar yang dikendalikan, bukan di header global.

### 6.6 Segmented control

- Gunakan untuk 2–4 pilihan yang saling eksklusif.
- Semua opsi terlihat tanpa scroll horizontal.
- Pilihan aktif dibedakan melalui surface, weight, dan `accessibilityState.selected`.
- Label harus singkat dan setara, misalnya Harian, Mingguan, Bulanan.
- Jangan menggunakan segmented control untuk navigasi hierarki yang dalam.

### 6.7 Kartu

Spesifikasi default:

- background `surface`;
- border `border` setebal `1px`;
- radius `16px`;
- padding `16px`;
- shadow level 0 atau 1;
- lebar mengikuti container dan maksimal `720px`.

Satu kartu mewakili satu kelompok informasi. Untuk daftar, gunakan satu kartu kelompok dengan divider, bukan satu kartu bayangan untuk setiap baris kecil.

### 6.8 Kartu ringkasan keuangan

Urutan informasi:

1. label periode atau metrik;
2. nominal utama;
3. perbandingan atau status;
4. rincian pemasukan dan pengeluaran.

Metrik yang dapat ditekan harus terlihat interaktif dan memiliki label aksesibilitas yang menyebut nilai lengkapnya.

### 6.9 Baris transaksi

Struktur:

- ikon kategori di kiri;
- merchant atau rute transfer sebagai judul;
- kategori, dompet, dan waktu sebagai metadata;
- nominal rata kanan;
- badge bukti atau klaim hanya jika relevan.

Aturan nominal:

- pengeluaran: tanda `−` dan `destructive`;
- pemasukan: tanda `+` dan `positive`;
- transfer: tanda `⇄` dan warna netral.

Swipe kanan membuka Ubah dan swipe kiri membuka Hapus. Aksi swipe tetap harus dapat dikenali pembaca layar melalui tombol berlabel.

### 6.10 Empty, loading, dan error state

#### Empty state awal

- ikon netral;
- judul yang menjelaskan belum adanya data;
- deskripsi singkat;
- CTA untuk membuat data pertama.

#### Empty state karena filter

- jelaskan bahwa tidak ada hasil yang cocok;
- CTA mereset filter, bukan membuat data baru.

#### Loading

- spinner dan label proses untuk loading layar pertama;
- refresh indicator untuk pull-to-refresh;
- footer spinner untuk pagination.

#### Error

- bahasa manusia, bukan pesan database mentah;
- jelaskan dampak dan tindakan berikutnya;
- sediakan retry jika operasi dapat diulang.

### 6.11 Toast dan undo

- Toast tidak boleh menutupi bottom navigation atau CTA utama.
- Pesan singkat dan spesifik.
- Aksi Undo selalu berlabel.
- Status diumumkan dengan live region.
- Gunakan toast untuk feedback sementara, bukan keputusan penting.

### 6.12 Dialog dan modal

Pilih pola berdasarkan tugas:

| Pola          | Penggunaan                                    |
| ------------- | --------------------------------------------- |
| Dialog tengah | Pilihan ringkas seperti bulan/tahun           |
| Bottom sheet  | Form cepat dan pilihan yang berkaitan halaman |
| Full screen   | Editor kompleks dan alur dengan banyak input  |
| Alert native  | Konfirmasi destruktif yang singkat            |

Aturan umum:

- backdrop meredupkan halaman;
- menekan backdrop atau tombol kembali menutup modal non-destruktif;
- modal memiliki fokus konteks yang jelas;
- tindakan utama mudah dijangkau;
- modal tidak boleh membuka modal lain tanpa menutup modal pertama.

### 6.13 Pemilih bulan

Lokasi: `src/features/transactions/components/transaction-month-picker-modal.tsx`

- Dialog tengah dengan lebar `88%` dan maksimal `360px`.
- Header menampilkan tahun dan tombol tahun sebelumnya/berikutnya.
- Dua belas bulan memakai grid 3 × 4.
- Tombol bulan setinggi `48px`.
- Bulan aktif memakai primary dan `onPrimary`.
- Memilih bulan menutup dialog dan memperbarui ringkasan serta daftar.

---

## 7. Pola layar utama

### 7.1 Beranda

Urutan prioritas:

1. judul Ringkasan dan periode;
2. arus bersih serta pemasukan/pengeluaran;
3. Catat Cepat;
4. insight periode;
5. transaksi terakhir;
6. modul sekunder.

Settings tetap sebagai aksi sekunder. Jangan menambahkan eyebrow generik di atas judul.

### 7.2 Dompet

Urutan prioritas:

1. judul Dompet & Rekening dan aksi Tambah;
2. total kekayaan;
3. dompet aktif;
4. aset yang dipantau;
5. aksi rekonsiliasi, ubah, dan arsip.

Aksi Tambah harus memiliki label teks; ikon plus saja kurang jelas untuk tindakan finansial utama.

### 7.3 Riwayat transaksi

Urutan prioritas:

1. navigasi bulan dan ekspor;
2. Harian, Mingguan, Bulanan;
3. ringkasan Pengeluaran, Pemasukan, Arus Bersih;
4. pencarian dan filter;
5. daftar transaksi per tanggal;
6. FAB Catat.

Judul “Transactions” tidak ditampilkan ulang karena tab aktif sudah memberi konteks halaman.

### 7.4 Laporan

Urutan prioritas:

1. navigasi bulan dan ekspor laporan;
2. Ringkasan, Arus Kas, dan Anggaran;
3. KPI Arus Bersih, Pemasukan, dan Pengeluaran;
4. insight utama;
5. grafik dan rincian pendukung.

Judul “Laporan” atau “Financial Insights” tidak ditampilkan ulang karena tab aktif sudah memberi konteks halaman. Header memakai pemilih bulan bersama yang juga digunakan Riwayat Transaksi. FAB Catat disembunyikan pada halaman ini agar tidak menutupi visualisasi; tindakan kontekstual utamanya adalah ekspor laporan.

Kartu KPI dibuat ringkas dan tidak mengulang periode yang sudah terlihat pada header. Grafik tren hanya ditampilkan jika tersedia data pada minimal dua bulan; jika belum, tampilkan empty state yang menjelaskan syarat data tersebut.

Grafik selalu memiliki label atau ringkasan tekstual. Jangan menjadikan warna grafik sebagai satu-satunya pembeda seri.

### 7.5 Lainnya dan Pengaturan

- Kelompokkan menu berdasarkan tujuan pengguna, bukan struktur kode.
- Gunakan satu container per kelompok dan divider antarbaris.
- Letakkan fitur yang sering digunakan lebih atas.
- Tindakan destruktif berada di bagian terpisah dan tidak berdekatan dengan kontrol rutin.

---

## 8. Semantik data keuangan

### 8.1 Uang

- Semua nominal dirender melalui formatter terpusat, misalnya `formatMoney`.
- Simpan nilai sebagai minor unit; jangan memakai floating point untuk perhitungan uang.
- Tampilkan kode atau simbol mata uang sesuai pengaturan pengguna.
- Gunakan pemisah lokal yang benar.
- Hindari singkatan seperti `1,2 jt` pada detail transaksi, ekspor, dan konfirmasi.

### 8.2 Tanda nominal

| Jenis       | Tanda | Warna         |
| ----------- | ----- | ------------- |
| Pemasukan   | `+`   | `positive`    |
| Pengeluaran | `−`   | `destructive` |
| Transfer    | `⇄`   | `textPrimary` |

### 8.3 Tanggal dan waktu

- Format mengikuti bahasa aktif.
- Periode bulanan selalu menampilkan bulan dan tahun.
- Data transaksi mempertahankan tanggal lokal dan timezone offset.
- Label Hari Ini/Kemarin boleh dipakai hanya jika tetap tidak ambigu.

### 8.4 Privasi nominal

Jika fitur sembunyikan saldo aktif, semua representasi saldo yang sensitif harus menggunakan state yang sama. Jangan menyembunyikan nominal hanya pada satu kartu.

---

## 9. Aksesibilitas

### 9.1 Target sentuh

- Target efektif minimum `48 × 48px`.
- Gunakan `hitSlop` untuk ikon visual berukuran `40–44px`.
- Jangan menempatkan dua target sentuh terlalu rapat tanpa jarak yang jelas.

### 9.2 Role, label, dan state

- Semua aksi memakai `accessibilityRole="button"`.
- Segmented control dan bottom navigation memakai role tab.
- Pilihan aktif memakai `accessibilityState.selected`.
- Loading memakai `busy`; disabled memakai `disabled`.
- Label ikon menjelaskan tindakan, bukan bentuk ikon. Gunakan “Ekspor CSV”, bukan “Ikon ekspor”.

### 9.3 Pengumuman

- Error input dan feedback async memakai `accessibilityLiveRegion="polite"`.
- Modal menggunakan `accessibilityViewIsModal`.
- Ikon dekoratif disembunyikan dari accessibility tree.

### 9.4 Warna dan teks

- Makna tidak boleh bergantung pada warna saja.
- Gunakan tanda, label, ikon, atau status tambahan.
- Pastikan teks mendukung pembesaran font tanpa memotong nominal penting.
- Tab label menggunakan `adjustsFontSizeToFit` untuk menjaga dua bahasa.

---

## 10. Bahasa dan content design

### 10.1 Lokalisasi

- Semua teks pengguna berasal dari sistem i18n di `src/lib/i18n/`.
- Jangan menulis string Bahasa Indonesia atau Inggris langsung di komponen global kecuali menjadi fallback terkontrol.
- Setiap fitur baru harus menambahkan ID dan EN dalam perubahan yang sama.

### 10.2 Gaya bahasa

- Ringkas, langsung, dan tidak menghakimi.
- Gunakan kata kerja untuk aksi: Catat, Simpan, Ubah, Hapus, Ekspor.
- Hindari istilah teknis database atau filesystem.
- Gunakan sentence case untuk deskripsi dan title case secara konsisten untuk judul pendek.
- Pesan error menjelaskan masalah dan langkah berikutnya.

### 10.3 Istilah utama

| Indonesia   | Inggris      |
| ----------- | ------------ |
| Beranda     | Home         |
| Ringkasan   | Overview     |
| Dompet      | Wallets      |
| Riwayat     | Transactions |
| Laporan     | Reports      |
| Lainnya     | More         |
| Catat       | Record       |
| Pemasukan   | Income       |
| Pengeluaran | Expenses     |
| Arus Bersih | Net Flow     |
| Bukti Struk | Receipt      |
| Klaim       | Claim        |
| Target      | Goal         |

---

## 11. State interaksi

| State    | Visual                                      | Perilaku aksesibilitas                |
| -------- | ------------------------------------------- | ------------------------------------- |
| Default  | Token sesuai varian                         | Role dan label tersedia               |
| Pressed  | Opacity atau scale ringan                   | Tidak mengubah label                  |
| Selected | Primary/surface aktif dan weight lebih kuat | `selected: true`                      |
| Disabled | Opacity `0.45`                              | `disabled: true`, tidak dapat ditekan |
| Loading  | Spinner mengganti atau mendampingi label    | `busy: true`                          |
| Error    | Border dan teks destructive                 | Pesan diumumkan live region           |
| Success  | Positive dengan ikon/label                  | Feedback tetap terbaca tanpa warna    |

---

## 12. Aturan implementasi

### 12.1 Menggunakan token

```tsx
const { colors } = useTheme();

<View
  style={[
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
  ]}
/>;
```

```tsx
const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
});
```

### 12.2 Kapan membuat komponen global

Buat komponen di `src/components/ui/` jika:

- digunakan oleh dua fitur atau lebih;
- memiliki state dan aksesibilitas yang harus konsisten;
- merupakan primitive seperti button, input, toast, atau screen container.

Simpan komponen di folder fitur jika:

- bergantung pada domain keuangan tertentu;
- hanya relevan untuk satu alur;
- menerima data model fitur secara langsung.

### 12.3 Aturan styling

- Gunakan `StyleSheet.create`.
- Gunakan token untuk warna, spacing, radius, tipografi, dan layout.
- Inline style hanya untuk nilai dinamis dari theme, state, atau data.
- Hindari nested ternary yang panjang untuk memetakan state visual; buat helper jika perlu.
- Jangan menyalin komponen lalu mengubah beberapa angka. Tambahkan prop varian yang terkontrol.

### 12.4 Kualitas perubahan UI

Setiap perubahan UI harus:

1. lolos lint dan TypeScript;
2. memiliki tes perilaku untuk interaksi penting;
3. diperiksa dalam Bahasa Indonesia dan Inggris;
4. diperiksa pada light dan dark mode jika warna berubah;
5. diperiksa secara visual di emulator untuk perubahan layout;
6. tidak menghasilkan warning format atau whitespace.

Perintah validasi utama:

```bash
npm run check
npm run format:check
```

---

## 13. Do and don't

### Do

- Gunakan satu CTA dominan per area.
- Susun informasi berdasarkan frekuensi dan dampak.
- Tampilkan nominal dengan tanda dan label yang jelas.
- Gunakan border lembut untuk membentuk kelompok.
- Berikan feedback setelah aksi async.
- Uji teks panjang dan dua bahasa.
- Gunakan modal hanya ketika fokus pengguna memang perlu dipindahkan.

### Don't

- Jangan mengulang judul yang tidak menambah konteks.
- Jangan memakai warna primary pada semua elemen interaktif.
- Jangan memakai kartu untuk setiap baris kecil.
- Jangan menaruh aksi berfrekuensi rendah lebih menonjol daripada tugas utama.
- Jangan menutupi kontrol penting dengan popup.
- Jangan menggunakan warna sebagai satu-satunya status.
- Jangan menampilkan pesan teknis mentah kepada pengguna.
- Jangan menambahkan token lokal yang seharusnya menjadi token global.

---

## 14. Checklist komponen baru

Sebelum komponen dianggap selesai:

- [ ] Menggunakan token theme dan mendukung light/dark mode.
- [ ] Mendukung Bahasa Indonesia dan Inggris.
- [ ] Target sentuh efektif minimal `48px`.
- [ ] Memiliki role, label, dan state aksesibilitas.
- [ ] Menangani default, pressed, disabled, loading, empty, atau error sesuai kebutuhan.
- [ ] Tidak memotong nominal atau label penting.
- [ ] Responsif hingga lebar konten maksimum `720px`.
- [ ] Tidak menduplikasi komponen global yang sudah ada.
- [ ] Memiliki tes untuk perilaku kritis.
- [ ] Telah diperiksa secara visual di emulator.

---

## 15. Tata kelola design system

### Menambahkan token

Token baru harus:

1. menyelesaikan kebutuhan yang berulang;
2. memiliki nama semantik, bukan nama warna atau layar;
3. tersedia untuk light dan dark mode jika berupa warna;
4. didokumentasikan di file ini;
5. dipakai oleh implementasi dalam perubahan yang sama.

### Mengubah komponen inti

Perubahan pada `AppButton`, `AppInput`, `Screen`, theme, atau bottom navigation harus diuji pada semua pemakai utamanya. Hindari perubahan global untuk menyelesaikan masalah satu layar.

### Review berkala

Audit design system ketika:

- navigasi utama berubah;
- theme atau brand preset bertambah;
- pola layar baru dipakai lebih dari sekali;
- terdapat tiga atau lebih variasi lokal dari primitive yang sama;
- dokumentasi tidak lagi sesuai dengan aplikasi di emulator.

---

## 16. Referensi implementasi

| Area                    | Lokasi                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| Warna dan brand         | `src/theme/colors.ts`                                                           |
| Tipografi               | `src/theme/typography.ts`                                                       |
| Spacing                 | `src/theme/spacing.ts`                                                          |
| Radius                  | `src/theme/radius.ts`                                                           |
| Layout responsif        | `src/theme/layout.ts`                                                           |
| Theme context           | `src/lib/theme/theme-context.tsx`                                               |
| Button                  | `src/components/ui/app-button.tsx`                                              |
| Input                   | `src/components/ui/app-input.tsx`                                               |
| Screen container        | `src/components/ui/screen.tsx`                                                  |
| Toast dan undo          | `src/components/ui/undo-toast-banner.tsx`                                       |
| Bottom navigation & FAB | `src/app/(tabs)/_layout.tsx`                                                    |
| Category icon style     | `src/features/categories/category-meta.ts`                                      |
| Header Riwayat          | `src/features/transactions/components/transaction-history-header.tsx`           |
| Pemilih bulan bersama   | `src/components/ui/month-picker-modal.tsx`                                      |
| Segmented period        | `src/features/transactions/components/transaction-period-segmented-control.tsx` |
| Transaction row         | `src/features/transactions/components/transaction-row-item.tsx`                 |
| Header Laporan          | `src/features/analytics/components/analytics-header.tsx`                        |
| KPI Laporan             | `src/features/analytics/components/analytics-period-summary.tsx`                |
| Insight Laporan         | `src/features/analytics/components/analytics-insights-card.tsx`                 |
| Lokalisasi              | `src/lib/i18n/locales/id.ts` dan `src/lib/i18n/locales/en.ts`                   |
