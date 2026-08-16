export type Language = 'id' | 'en';

export const translations = {
  id: {
    // Navigation Tabs
    tabs: {
      home: 'Beranda',
      transactions: 'Riwayat',
      add: 'Catat',
      claims: 'Klaim',
      settings: 'Pengaturan',
    },
    // Home Screen
    home: {
      greeting: 'RINGKASAN KEUANGAN',
      appTitle: 'Personal Finance',
      net: 'Sisa Saldo',
      income: 'Uang Masuk',
      expensesThisMonth: 'Uang Keluar',
      quickAddTransaction: '+ Catat Transaksi',
      quickScanReceipt: 'Pindai Struk',
      spendingByCategory: 'Pengeluaran per Kategori',
      noExpensesThisMonth: 'Belum ada pengeluaran bulan ini.',
      recentTransactions: 'Transaksi Terakhir',
      viewAll: 'Lihat Semua',
      noTransactionsYet: 'Belum Ada Transaksi',
      noTransactionsDesc:
        'Catat pemasukan atau pengeluaran untuk melihat ringkasan keuangan bulanan.',
      addFirstTransaction: 'Catat Transaksi Pertama',
      receiptBadge: 'Struk',
      ofExpenses: 'dari pengeluaran',
      overviewUnavailable: 'Ringkasan tidak tersedia',
      loadFailed: 'Gagal memuat ringkasan keuangan. Silakan coba lagi.',
      tryAgain: 'Coba lagi',
      loading: 'Memuat ringkasan…',
    },
    // Settings Screen
    settings: {
      title: 'Pengaturan',
      loading: 'Memuat pengaturan…',
      languageSection: 'Bahasa / Language',
      languageDesc: 'Pilih bahasa tampilan aplikasi.',
      langIndonesian: 'Bahasa Indonesia',
      langEnglish: 'English',
      manageSection: 'Kelola',
      categories: 'Kategori',
      paymentMethods: 'Metode Pembayaran',
      currencySection: 'Mata Uang',
      readOnly: 'Hanya baca',
      dataSection: 'Data',
      dataDesc:
        'Semua informasi tersimpan di perangkat ini. Tidak ada akun, cloud, atau telemetri.',
      deleteAllData: 'Hapus Semua Data',
      aboutSection: 'Tentang Aplikasi',
      version: 'Versi',
      aboutDesc:
        'Aplikasi keuangan pribadi offline untuk Android dengan pemindaian struk langsung di perangkat.',
      deleteDialogTitle: 'Hapus semua data?',
      deleteDialogDesc:
        'Transaksi, tanda terima, klaim, kategori kustom, metode pembayaran kustom, dan PDF yang dibuat akan dihapus.',
      permanentDeleteTitle: 'Hapus semua data secara permanen?',
      permanentDeleteDesc:
        'Tindakan ini tidak dapat dibatalkan. Kategori default, metode pembayaran, dan setelan IDR akan dipulihkan.',
      dataDeletedTitle: 'Data berhasil dihapus',
      dataDeletedDesc:
        'Transaksi, tanda terima, klaim, opsi kustom, dan ekspor cache telah dihapus. Setelan awal siap digunakan.',
      cancel: 'Batal',
      continue: 'Lanjutkan',
      done: 'Selesai',
    },
    // Common
    common: {
      save: 'Simpan',
      cancel: 'Batal',
      delete: 'Hapus',
      edit: 'Ubah',
      back: 'Kembali',
      tryAgain: 'Coba lagi',
    },
  },
  en: {
    // Navigation Tabs
    tabs: {
      home: 'Home',
      transactions: 'Transactions',
      add: 'Add',
      claims: 'Claims',
      settings: 'Settings',
    },
    // Home Screen
    home: {
      greeting: 'FINANCIAL OVERVIEW',
      appTitle: 'Personal Finance',
      net: 'Net',
      income: 'Income',
      expensesThisMonth: 'Expenses this month',
      quickAddTransaction: '+ Add Transaction',
      quickScanReceipt: 'Scan Receipt',
      spendingByCategory: 'Spending by category',
      noExpensesThisMonth: 'No expenses this month.',
      recentTransactions: 'Recent transactions',
      viewAll: 'View all',
      noTransactionsYet: 'No transactions yet',
      noTransactionsDesc:
        'Add an expense or income to see your monthly overview.',
      addFirstTransaction: 'Add your first transaction',
      receiptBadge: 'Receipt',
      ofExpenses: 'of expenses',
      overviewUnavailable: 'Overview unavailable',
      loadFailed: "We couldn't load your overview. Try again.",
      tryAgain: 'Try again',
      loading: 'Loading overview…',
    },
    // Settings Screen
    settings: {
      title: 'Settings',
      loading: 'Loading settings…',
      languageSection: 'Language / Bahasa',
      languageDesc: 'Choose the application display language.',
      langIndonesian: 'Bahasa Indonesia',
      langEnglish: 'English',
      manageSection: 'Manage',
      categories: 'Categories',
      paymentMethods: 'Payment Methods',
      currencySection: 'Currency',
      readOnly: 'Read-only',
      dataSection: 'Data',
      dataDesc:
        'All information stays on this device. No account, cloud, or telemetry is used.',
      deleteAllData: 'Delete All Data',
      aboutSection: 'About',
      version: 'Version',
      aboutDesc:
        'Offline-first personal finance for Android. Receipt OCR runs on-device.',
      deleteDialogTitle: 'Delete all data?',
      deleteDialogDesc:
        'Transactions, receipts, claims, custom categories, custom payment methods, and generated PDFs will be deleted.',
      permanentDeleteTitle: 'Permanently delete all data?',
      permanentDeleteDesc:
        'This cannot be undone. Default categories, payment methods, and IDR settings will be restored.',
      dataDeletedTitle: 'Data deleted',
      dataDeletedDesc:
        'Transactions, receipts, claims, custom options, and cached exports were removed. Defaults are ready to use.',
      cancel: 'Cancel',
      continue: 'Continue',
      done: 'Done',
    },
    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      tryAgain: 'Try again',
    },
  },
} as const;

type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>;
};

export type TranslationSchema = DeepStringRecord<typeof translations.id>;
