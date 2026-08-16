export type Language = 'id' | 'en';

export type TranslationSchema = {
  tabs: {
    home: string;
    transactions: string;
    add: string;
    claims: string;
    settings: string;
  };
  home: {
    greeting: string;
    appTitle: string;
    net: string;
    income: string;
    expensesThisMonth: string;
    quickAddTransaction: string;
    quickScanReceipt: string;
    spendingByCategory: string;
    noExpensesThisMonth: string;
    recentTransactions: string;
    viewAll: string;
    noTransactionsYet: string;
    noTransactionsDesc: string;
    addFirstTransaction: string;
    receiptBadge: string;
    ofExpenses: string;
    overviewUnavailable: string;
    loadFailed: string;
    tryAgain: string;
    loading: string;
  };
  settings: {
    title: string;
    loading: string;
    themeSection: string;
    themeDesc: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    shortcutsSection: string;
    shortcutsDesc: string;
    editShortcuts: string;
    addShortcut: string;
    resetShortcuts: string;
    enterShortcutAmount: string;
    shortcutLimit: string;
    languageSection: string;
    languageDesc: string;
    langIndonesian: string;
    langEnglish: string;
    manageSection: string;
    categories: string;
    paymentMethods: string;
    currencySection: string;
    readOnly: string;
    dataSection: string;
    dataDesc: string;
    deleteAllData: string;
    aboutSection: string;
    version: string;
    aboutDesc: string;
    deleteDialogTitle: string;
    deleteDialogDesc: string;
    permanentDeleteTitle: string;
    permanentDeleteDesc: string;
    dataDeletedTitle: string;
    dataDeletedDesc: string;
    cancel: string;
    continue: string;
    done: string;
  };
  goals: {
    title: string;
    subtitle: string;
    newGoal: string;
    editGoal: string;
    goalName: string;
    targetAmount: string;
    initialDeposit: string;
    deposit: string;
    withdraw: string;
    saved: string;
    target: string;
    remaining: string;
    history: string;
    noGoalsYet: string;
    noGoalsDesc: string;
    createFirstGoal: string;
    completed: string;
    active: string;
    congratsCompleted: string;
    depositSuccess: string;
    withdrawSuccess: string;
    deleteGoal: string;
    deleteConfirm: string;
  };
  habits: {
    streakTitle: string;
    streakDays: string;
    noSpendTitle: string;
    noSpendDays: string;
    frugalBadge: string;
    streakBest: string;
    loggingDays: string;
    streakHelp: string;
  };
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    back: string;
    tryAgain: string;
  };
};

export const translations: Record<Language, TranslationSchema> = {
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
      quickScanReceipt: 'Foto Struk',
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
      // Theme Section
      themeSection: 'Tema Tampilan',
      themeDesc: 'Pilih mode terang, gelap (OLED), atau ikuti setelan sistem.',
      themeLight: 'Terang',
      themeDark: 'Gelap',
      themeSystem: 'Ikuti Sistem',
      // Quick Shortcuts Customization Section
      shortcutsSection: 'Shortcut Nominal Cepat',
      shortcutsDesc:
        'Sesuaikan tombol nominal cepat (+2k, +5k, dll.) yang tampil di popup catat transaksi.',
      editShortcuts: 'Kustomisasi Shortcut',
      addShortcut: '+ Tambah Nominal',
      resetShortcuts: 'Reset ke Default',
      enterShortcutAmount: 'Masukkan nominal baru (misal: 15000):',
      shortcutLimit: 'Maksimal 8 tombol shortcut.',
      // Language Section
      languageSection: 'Bahasa / Language',
      languageDesc: 'Pilih bahasa tampilan aplikasi.',
      langIndonesian: 'Bahasa Indonesia',
      langEnglish: 'English',
      // Management
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
        'Aplikasi keuangan pribadi offline untuk Android dengan pencatatan instan dan lampiran foto struk langsung di perangkat.',
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
    // Goals / Celengan Impian
    goals: {
      title: 'Celengan Impian',
      subtitle:
        'Tetapkan target tabungan dan pantau progres pencapaian impianmu.',
      newGoal: '+ Target Baru',
      editGoal: 'Ubah Target',
      goalName: 'Nama Target',
      targetAmount: 'Target Nominal',
      initialDeposit: 'Setoran Awal (Opsional)',
      deposit: 'Nabung / Setor',
      withdraw: 'Tarik Dana',
      saved: 'Terkumpul',
      target: 'Target',
      remaining: 'Kurang',
      history: 'Riwayat Tabungan',
      noGoalsYet: 'Belum Ada Target Tabungan',
      noGoalsDesc:
        'Mulai buat celengan impian pertamamu untuk barang idaman atau dana darurat!',
      createFirstGoal: 'Buat Celengan Impian',
      completed: 'Tercapai 🎉',
      active: 'Berjalan',
      congratsCompleted: 'Selamat! Target tabungan ini sudah tercapai 🥳',
      depositSuccess: 'Berhasil menabung!',
      withdrawSuccess: 'Berhasil menarik tabungan!',
      deleteGoal: 'Hapus Target',
      deleteConfirm: 'Apakah kamu yakin ingin menghapus target tabungan ini?',
    },
    // Habits & Streaks
    habits: {
      streakTitle: 'Streak Pencatatan',
      streakDays: 'Hari Beruntun',
      noSpendTitle: 'Hari Bebas Jajan',
      noSpendDays: 'Hari Hemat',
      frugalBadge: 'Level Disiplin',
      streakBest: 'Rekor Terbaik',
      loggingDays: 'Hari Aktif Bulan Ini',
      streakHelp:
        'Catat minimal 1 transaksi setiap hari untuk mempertahankan streak apimu! 🔥',
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
      quickScanReceipt: 'Photo Receipt',
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
      // Theme Section
      themeSection: 'Appearance Theme',
      themeDesc: 'Choose light mode, dark mode (OLED), or follow system.',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'Follow System',
      // Quick Shortcuts Customization Section
      shortcutsSection: 'Quick Amount Shortcuts',
      shortcutsDesc:
        'Customize the quick increment buttons (+2k, +5k, etc.) shown on the quick-entry sheet.',
      editShortcuts: 'Customize Shortcuts',
      addShortcut: '+ Add Amount',
      resetShortcuts: 'Reset to Default',
      enterShortcutAmount: 'Enter new amount (e.g. 15000):',
      shortcutLimit: 'Maximum 8 shortcut chips.',
      // Language Section
      languageSection: 'Language',
      languageDesc: 'Choose the display language.',
      langIndonesian: 'Bahasa Indonesia',
      langEnglish: 'English',
      // Management
      manageSection: 'Manage',
      categories: 'Categories',
      paymentMethods: 'Payment Methods',
      currencySection: 'Currency',
      readOnly: 'Read-only',
      dataSection: 'Data',
      dataDesc:
        'All information stays on this device. No account, cloud, or telemetry is used.',
      deleteAllData: 'Delete All Data',
      aboutSection: 'About App',
      version: 'Version',
      aboutDesc:
        'Offline-first Android personal finance app with instant speed logging and receipt photo attachments.',
      deleteDialogTitle: 'Delete all data?',
      deleteDialogDesc:
        'Transactions, receipts, claims, custom categories, custom payment methods, and generated PDFs will be deleted.',
      permanentDeleteTitle: 'Delete all data permanently?',
      permanentDeleteDesc:
        'This action cannot be undone. Default categories, payment methods, and IDR settings will be restored.',
      dataDeletedTitle: 'Data deleted',
      dataDeletedDesc:
        'Transactions, receipts, claims, custom options, and cached exports have been deleted. Default settings are ready.',
      cancel: 'Cancel',
      continue: 'Continue',
      done: 'Done',
    },
    // Goals / Savings Goals
    goals: {
      title: 'Savings Goals',
      subtitle:
        'Set financial targets and track your progress to reach your dreams.',
      newGoal: '+ New Goal',
      editGoal: 'Edit Goal',
      goalName: 'Goal Name',
      targetAmount: 'Target Amount',
      initialDeposit: 'Initial Deposit (Optional)',
      deposit: 'Deposit / Save',
      withdraw: 'Withdraw',
      saved: 'Saved',
      target: 'Target',
      remaining: 'Remaining',
      history: 'Savings History',
      noGoalsYet: 'No Savings Goals Yet',
      noGoalsDesc:
        'Start your first savings goal for dream items or an emergency fund!',
      createFirstGoal: 'Create Savings Goal',
      completed: 'Completed 🎉',
      active: 'In Progress',
      congratsCompleted: 'Congratulations! You reached this savings goal 🥳',
      depositSuccess: 'Deposit successful!',
      withdrawSuccess: 'Withdrawal successful!',
      deleteGoal: 'Delete Goal',
      deleteConfirm: 'Are you sure you want to delete this savings goal?',
    },
    // Habits & Streaks
    habits: {
      streakTitle: 'Logging Streak',
      streakDays: 'Day Streak',
      noSpendTitle: 'No-Spend Days',
      noSpendDays: 'Frugal Days',
      frugalBadge: 'Discipline Level',
      streakBest: 'Best Streak',
      loggingDays: 'Active Days This Month',
      streakHelp:
        'Log at least 1 transaction every day to keep your fire streak burning! 🔥',
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
};
