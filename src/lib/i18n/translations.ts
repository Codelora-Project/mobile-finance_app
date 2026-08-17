export type Language = 'id' | 'en';

export type TranslationSchema = {
  tabs: {
    home: string;
    transactions: string;
    goals: string;
    add: string;
    analytics: string;
    claims: string;
    settings: string;
  };
  home: {
    greeting: string;
    appTitle: string;
    net: string;
    income: string;
    expensesThisMonth: string;
    periodDaily: string;
    periodWeekly: string;
    periodMonthly: string;
    periodYearly: string;
    totalBalance: string;
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
  transactions: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    all: string;
    expense: string;
    income: string;
    withReceipt: string;
    reimbursable: string;
    nonCash: string;
    above100k: string;
    filters: string;
    filtersActive: string;
    today: string;
    yesterday: string;
    dailyTotal: string;
    loading: string;
    noTransactionsTitle: string;
    noTransactionsDesc: string;
    noMatchingTitle: string;
    noMatchingDesc: string;
    addTransaction: string;
    resetFilter: string;
    detailTitle: string;
    viewReceipt: string;
    editTransaction: string;
    deleteTransaction: string;
    deleteDialogTitle: string;
    deleteDialogDesc: string;
    deleteClaimWarning: string;
    deletedSuccess: string;
    notFound: string;
    notFoundDesc: string;
    backToList: string;
    merchant: string;
    source: string;
    category: string;
    dateTime: string;
    paymentMethod: string;
    note: string;
    receipt: string;
    reimbursementStatus: string;
    reimbursableBadge: string;
    notReimbursable: string;
    notApplicable: string;
    claim: string;
    lockedByClaim: string;
    noReceipt: string;
    none: string;
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
    // Shortcut validation messages
    errorShortcutInvalid: string;
    errorShortcutDuplicate: string;
    errorShortcutMinimum: string;
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
    all: string;
    congratsCompleted: string;
    depositSuccess: string;
    withdrawSuccess: string;
    deleteGoal: string;
    deleteConfirm: string;
    loadingGoals: string;
    thisMonth: string;
    totalSavingsCollected: string;
    targetNotFound: string;
    daysUnit: string;
    // Validation messages
    errorNameRequired: string;
    errorTargetRequired: string;
    errorDepositInvalid: string;
    errorAmountInvalid: string;
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
    badges: {
      starter: string;
      momentum: string;
      consistent: string;
      champion: string;
      master: string;
      legend: string;
    };
  };
  analytics: {
    title: string;
    subtitle: string;
    overviewTab: string;
    budgetsTab: string;
    trendsTab: string;
    totalExpense: string;
    totalIncome: string;
    dailyAverage: string;
    topCategory: string;
    categoryDistribution: string;
    weeklyComparison: string;
    thisWeek: string;
    lastWeek: string;
    spendingIncreased: string;
    spendingDecreased: string;
    spendingSame: string;
    cashFlowTrend: string;
    noDataYet: string;
    noDataDesc: string;
    viewAnalytics: string;
    ofTotal: string;
    last7DaysVsPrevious: string;
    cashFlowSubtitle: string;
    incomePrefix: string;
    expensePrefix: string;
    loadingAnalytics: string;
    /** Short day names, index 0=Sun…6=Sat */
    dayNames: readonly [string, string, string, string, string, string, string];
  };
  budgets: {
    title: string;
    subtitle: string;
    setBudget: string;
    editBudget: string;
    deleteBudget: string;
    budgetLimit: string;
    spent: string;
    remaining: string;
    dailyAllowance: string;
    dailyAllowanceDesc: string;
    statusSafe: string;
    statusWarning: string;
    statusDanger: string;
    statusOverbudget: string;
    overallProgress: string;
    categoriesBudgeted: string;
    noBudgetsYet: string;
    noBudgetsDesc: string;
    saveBudgetSuccess: string;
    deleteBudgetConfirm: string;
    manageBudgets: string;
    spentPrefix: string;
    limitPrefix: string;
    remainingPrefix: string;
    overbudgetPrefix: string;
    overbudgetNotice: string;
    dailyAllowancePill: string;
    perDayThisMonth: string;
    changeBudgetLimit: string;
    currentMonthSpent: string;
    invalidAmountError: string;
    categoryLabel: string;
    saveBudgetLimit: string;
    deleteBudgetBtn: string;
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
      goals: 'Target',
      add: 'Catat',
      analytics: 'Laporan',
      claims: 'Klaim',
      settings: 'Pengaturan',
    },
    // Home Screen
    home: {
      greeting: 'RINGKASAN KEUANGAN',
      appTitle: 'Personal Finance',
      net: 'Sisa Saldo',
      income: 'Uang Masuk',
      expensesThisMonth: 'Pengeluaran',
      periodDaily: 'Harian',
      periodWeekly: 'Mingguan',
      periodMonthly: 'Bulanan',
      periodYearly: 'Tahunan',
      totalBalance: 'Total',
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
    // Transactions Screen
    transactions: {
      title: 'Riwayat Transaksi',
      subtitle: 'Semua pencatatan pemasukan & pengeluaran',
      searchPlaceholder: 'Cari merchant, kategori, atau catatan…',
      all: 'Semua',
      expense: 'Pengeluaran',
      income: 'Pemasukan',
      withReceipt: 'Ada Struk',
      reimbursable: 'Klaim Kantor',
      nonCash: 'Non-Tunai',
      above100k: '> Rp 100k',
      filters: 'Filter',
      filtersActive: 'Filter',
      today: 'Hari Ini',
      yesterday: 'Kemarin',
      dailyTotal: 'Total',
      loading: 'Memuat riwayat transaksi…',
      noTransactionsTitle: 'Belum Ada Transaksi',
      noTransactionsDesc:
        'Mulai pantau keuanganmu dengan mencatat transaksi pertamamu.',
      noMatchingTitle: 'Tidak Ada Transaksi yang Cocok',
      noMatchingDesc:
        'Coba sesuaikan kata kunci pencarian atau filter yang dipilih.',
      addTransaction: 'Catat Transaksi',
      resetFilter: 'Reset Filter',
      detailTitle: 'Detail Transaksi',
      viewReceipt: 'Lihat Bukti Struk',
      editTransaction: 'Ubah Transaksi',
      deleteTransaction: 'Hapus Transaksi',
      deleteDialogTitle: 'Hapus transaksi?',
      deleteDialogDesc: 'Tindakan ini tidak dapat dibatalkan.',
      deleteClaimWarning:
        'Transaksi ini akan dihapus dari draf klaim dan dihapus permanen.',
      deletedSuccess: 'Transaksi berhasil dihapus.',
      notFound: 'Transaksi Tidak Ditemukan',
      notFoundDesc:
        'Transaksi yang diminta tidak ditemukan atau telah dihapus.',
      backToList: 'Kembali ke Riwayat',
      merchant: 'Merchant / Toko',
      source: 'Sumber Dana',
      category: 'Kategori',
      dateTime: 'Tanggal & Waktu',
      paymentMethod: 'Metode Pembayaran',
      note: 'Catatan',
      receipt: 'Bukti Struk',
      reimbursementStatus: 'Status Reimburse',
      reimbursableBadge: 'Dapat Diklaim',
      notReimbursable: 'Bukan Klaim',
      notApplicable: 'Tidak Berlaku',
      claim: 'Klaim Terkait',
      lockedByClaim:
        'Transaksi ini terkunci oleh klaim dan tidak dapat diubah.',
      noReceipt: 'Tanpa struk',
      none: 'Tidak ada',
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
      errorShortcutInvalid:
        'Masukkan nominal angka yang valid (contoh: 15000).',
      errorShortcutDuplicate: 'Nominal ini sudah ada di daftar shortcut.',
      errorShortcutMinimum:
        'Aplikasi membutuhkan minimal 1 tombol shortcut nominal.',
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
      all: 'Semua',
      congratsCompleted: 'Selamat! Target tabungan ini sudah tercapai 🥳',
      depositSuccess: 'Berhasil menabung!',
      withdrawSuccess: 'Berhasil menarik tabungan!',
      deleteGoal: 'Hapus Target',
      deleteConfirm: 'Apakah kamu yakin ingin menghapus target tabungan ini?',
      loadingGoals: 'Memuat Celengan Impian…',
      thisMonth: 'Bulan ini',
      totalSavingsCollected: 'Total Tabungan Terkumpul',
      targetNotFound: 'Target tabungan tidak ditemukan.',
      daysUnit: 'Hari',
      errorNameRequired: 'Nama target tabungan harus diisi.',
      errorTargetRequired: 'Target nominal harus lebih dari 0.',
      errorDepositInvalid: 'Masukkan nominal setoran yang valid.',
      errorAmountInvalid: 'Masukkan nominal angka yang valid.',
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
      badges: {
        starter: 'Langkah Awal',
        momentum: 'Mulai Konsisten',
        consistent: '1 Minggu Rutin',
        champion: 'Pejuang Hemat',
        master: 'Master Finansial',
        legend: 'Legenda Finansial',
      },
    },
    // Analytics & Visual Insights
    analytics: {
      title: 'Wawasan Finansial',
      subtitle: 'Analisis pengeluaran, anggaran, dan tren arus kas',
      overviewTab: 'Komposisi',
      budgetsTab: 'Anggaran',
      trendsTab: 'Tren Arus Kas',
      totalExpense: 'Total Pengeluaran',
      totalIncome: 'Total Pemasukan',
      dailyAverage: 'Rata-rata Harian',
      topCategory: 'Kategori Terbesar',
      categoryDistribution: 'Distribusi Pengeluaran',
      weeklyComparison: 'Perbandingan Mingguan',
      thisWeek: 'Minggu Ini',
      lastWeek: 'Minggu Lalu',
      spendingIncreased: 'Meningkat dari minggu lalu',
      spendingDecreased: 'Lebih hemat dari minggu lalu',
      spendingSame: 'Sama dengan minggu lalu',
      cashFlowTrend: 'Tren Arus Kas Bulanan',
      noDataYet: 'Belum ada data pengeluaran',
      noDataDesc: 'Catat transaksi pengeluaran untuk melihat grafik analitik.',
      viewAnalytics: 'Lihat Analisis & Grafik Lengkap',
      ofTotal: 'dari Total',
      last7DaysVsPrevious: '7 Hari Terakhir vs 7 Hari Sebelumnya',
      cashFlowSubtitle: 'Arus kas uang masuk vs uang keluar per bulan',
      incomePrefix: 'Masuk',
      expensePrefix: 'Keluar',
      loadingAnalytics: 'Memuat analisis finansial...',
      dayNames: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
    },
    // Budgets
    budgets: {
      title: 'Anggaran Bulanan',
      subtitle: 'Kontrol batas belanja bulanan per kategori',
      setBudget: 'Pasang Anggaran',
      editBudget: 'Ubah Anggaran',
      deleteBudget: 'Hapus Anggaran',
      budgetLimit: 'Batas Anggaran Bulanan',
      spent: 'Terpakai',
      remaining: 'Sisa Anggaran',
      dailyAllowance: 'Sisa Jajan / Hari',
      dailyAllowanceDesc: 'Batas aman pengeluaran per hari hingga akhir bulan',
      statusSafe: 'Aman',
      statusWarning: 'Waspada',
      statusDanger: 'Kritis',
      statusOverbudget: 'Overbudget!',
      overallProgress: 'Realisasi Anggaran Total',
      categoriesBudgeted: 'Kategori Beranggaran',
      noBudgetsYet: 'Belum ada anggaran kategori',
      noBudgetsDesc:
        'Pasang batas anggaran bulanan pada kategori agar keuanganmu tetap terkontrol.',
      saveBudgetSuccess: 'Anggaran berhasil disimpan!',
      deleteBudgetConfirm:
        'Apakah kamu yakin ingin menghapus anggaran kategori ini?',
      manageBudgets: 'Kelola Anggaran',
      spentPrefix: 'Terpakai:',
      limitPrefix: 'Limit:',
      remainingPrefix: 'Sisa:',
      overbudgetPrefix: 'Over:',
      overbudgetNotice: 'Anggaran kategori ini telah terlampaui!',
      dailyAllowancePill: 'Kamu masih bisa jajan',
      perDayThisMonth: '/hari bulan ini',
      changeBudgetLimit: 'Ubah Batas Anggaran ›',
      currentMonthSpent: 'Pengeluaran Bulan Ini',
      invalidAmountError: 'Masukkan nominal batas anggaran yang valid.',
      categoryLabel: 'Kategori:',
      saveBudgetLimit: 'Simpan Batas Anggaran',
      deleteBudgetBtn: 'Hapus Anggaran Kategori',
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
      goals: 'Goals',
      add: 'Add',
      analytics: 'Reports',
      claims: 'Claims',
      settings: 'Settings',
    },
    // Home Screen
    home: {
      greeting: 'FINANCIAL OVERVIEW',
      appTitle: 'Personal Finance',
      net: 'Net',
      income: 'Income',
      expensesThisMonth: 'Expenses',
      periodDaily: 'Daily',
      periodWeekly: 'Weekly',
      periodMonthly: 'Monthly',
      periodYearly: 'Yearly',
      totalBalance: 'Total',
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
    // Transactions Screen
    transactions: {
      title: 'Transactions',
      subtitle: 'All income & expense logs',
      searchPlaceholder: 'Search merchants, categories, or notes…',
      all: 'All',
      expense: 'Expenses',
      income: 'Income',
      withReceipt: 'With Receipt',
      reimbursable: 'Reimbursable',
      nonCash: 'Non-Cash',
      above100k: '> 100k',
      filters: 'Filters',
      filtersActive: 'Filters',
      today: 'Today',
      yesterday: 'Yesterday',
      dailyTotal: 'Total',
      loading: 'Loading transactions…',
      noTransactionsTitle: 'No Transactions Yet',
      noTransactionsDesc:
        'Start tracking your finances by adding your first transaction.',
      noMatchingTitle: 'No Matching Transactions',
      noMatchingDesc: 'Try adjusting your search query or active filters.',
      addTransaction: 'Add Transaction',
      resetFilter: 'Reset Filters',
      detailTitle: 'Transaction Detail',
      viewReceipt: 'View Receipt Image',
      editTransaction: 'Edit Transaction',
      deleteTransaction: 'Delete Transaction',
      deleteDialogTitle: 'Delete transaction?',
      deleteDialogDesc: 'This action cannot be undone.',
      deleteClaimWarning:
        'This will remove the transaction from the draft claim and delete it.',
      deletedSuccess: 'Transaction deleted.',
      notFound: 'Transaction Not Found',
      notFoundDesc:
        'The requested transaction could not be loaded or was removed.',
      backToList: 'Back to Transactions',
      merchant: 'Merchant / Store',
      source: 'Source',
      category: 'Category',
      dateTime: 'Date & Time',
      paymentMethod: 'Payment Method',
      note: 'Note',
      receipt: 'Receipt',
      reimbursementStatus: 'Reimbursement Status',
      reimbursableBadge: 'Reimbursable',
      notReimbursable: 'Not reimbursable',
      notApplicable: 'Not applicable',
      claim: 'Associated Claim',
      lockedByClaim:
        'This transaction is locked by a claim and cannot be modified.',
      noReceipt: 'No receipt',
      none: 'None',
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
      errorShortcutInvalid: 'Enter a valid amount (e.g. 15000).',
      errorShortcutDuplicate: 'This amount is already in your shortcuts list.',
      errorShortcutMinimum: 'At least 1 shortcut button is required.',
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
      all: 'All',
      congratsCompleted: 'Congratulations! You reached this savings goal 🥳',
      depositSuccess: 'Deposit successful!',
      withdrawSuccess: 'Withdrawal successful!',
      deleteGoal: 'Delete Goal',
      deleteConfirm: 'Are you sure you want to delete this savings goal?',
      loadingGoals: 'Loading Savings Goals…',
      thisMonth: 'This month',
      totalSavingsCollected: 'Total Savings Accumulated',
      targetNotFound: 'Savings goal not found.',
      daysUnit: 'Days',
      errorNameRequired: 'Goal name is required.',
      errorTargetRequired: 'Target amount must be greater than 0.',
      errorDepositInvalid: 'Enter a valid deposit amount.',
      errorAmountInvalid: 'Enter a valid amount.',
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
        'Log at least 1 transaction every day to keep your fire streak alive! 🔥',
      badges: {
        starter: 'First Step',
        momentum: 'Building Momentum',
        consistent: '1 Week Habit',
        champion: 'Frugal Champion',
        master: 'Financial Master',
        legend: 'Financial Legend',
      },
    },
    // Analytics & Visual Insights
    analytics: {
      title: 'Financial Insights',
      subtitle: 'Expense analytics, category budgets, and cash flow trends',
      overviewTab: 'Breakdown',
      budgetsTab: 'Budgets',
      trendsTab: 'Cash Flow',
      totalExpense: 'Total Expenses',
      totalIncome: 'Total Income',
      dailyAverage: 'Daily Average',
      topCategory: 'Top Category',
      categoryDistribution: 'Spending Distribution',
      weeklyComparison: 'Weekly Comparison',
      thisWeek: 'This Week',
      lastWeek: 'Last Week',
      spendingIncreased: 'Higher than last week',
      spendingDecreased: 'More frugal than last week',
      spendingSame: 'Same as last week',
      cashFlowTrend: 'Monthly Cash Flow',
      noDataYet: 'No expense data yet',
      noDataDesc: 'Log your expenses to see detailed visual analytics.',
      viewAnalytics: 'View Full Analytics & Charts',
      ofTotal: 'of Total',
      last7DaysVsPrevious: 'Last 7 Days vs Previous 7 Days',
      cashFlowSubtitle: 'Monthly cash flow: Money in vs Money out',
      incomePrefix: 'Income',
      expensePrefix: 'Expense',
      loadingAnalytics: 'Loading financial analytics...',
      dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
    // Budgets
    budgets: {
      title: 'Monthly Budgets',
      subtitle: 'Control category spending limits every month',
      setBudget: 'Set Budget',
      editBudget: 'Edit Budget',
      deleteBudget: 'Delete Budget',
      budgetLimit: 'Monthly Budget Limit',
      spent: 'Spent',
      remaining: 'Remaining',
      dailyAllowance: 'Daily Allowance',
      dailyAllowanceDesc:
        'Safe daily spending limit until the end of the month',
      statusSafe: 'Safe',
      statusWarning: 'Warning',
      statusDanger: 'Critical',
      statusOverbudget: 'Overbudget!',
      overallProgress: 'Overall Budget Progress',
      categoriesBudgeted: 'Budgeted Categories',
      noBudgetsYet: 'No category budgets set',
      noBudgetsDesc:
        'Set monthly limits on your categories to keep your spending disciplined.',
      saveBudgetSuccess: 'Budget saved successfully!',
      deleteBudgetConfirm:
        'Are you sure you want to delete this category budget?',
      manageBudgets: 'Manage Budgets',
      spentPrefix: 'Spent:',
      limitPrefix: 'Limit:',
      remainingPrefix: 'Remaining:',
      overbudgetPrefix: 'Over:',
      overbudgetNotice: 'Budget for this category has been exceeded!',
      dailyAllowancePill: 'You can safely spend',
      perDayThisMonth: '/day this month',
      changeBudgetLimit: 'Edit Budget Limit ›',
      currentMonthSpent: "This Month's Spending",
      invalidAmountError: 'Enter a valid monthly budget limit.',
      categoryLabel: 'Category:',
      saveBudgetLimit: 'Save Budget Limit',
      deleteBudgetBtn: 'Delete Category Budget',
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
