import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import { PaymentMethodManagementScreen } from '@/features/payment-methods/payment-method-management-screen';
import { CurrencyProvider } from '@/lib/currency/currency-context';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { ThemeProvider } from '@/lib/theme/theme-context';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => {
        callback();
      }, []);
    },
    useLocalSearchParams: () => ({}),
    useRouter: () => mockRouter,
  };
});

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
}));

const mockCreateWallet = jest.fn<(...args: any[]) => Promise<any>>();
const mockUpdateWallet = jest.fn<(...args: any[]) => Promise<any>>();
const mockArchiveWallet = jest.fn<(...args: any[]) => Promise<any>>();
const mockUnarchiveWallet = jest.fn<(...args: any[]) => Promise<any>>();
const mockReconcileWalletBalance = jest.fn<(...args: any[]) => Promise<any>>();
const mockGetWalletSummary = jest.fn<(...args: any[]) => Promise<any>>();
const mockGetWallets = jest.fn<(...args: any[]) => Promise<any>>();

jest.mock('@/features/accounts/account-repository', () => ({
  archiveWallet: (...args: unknown[]) => mockArchiveWallet(...args),
  createWallet: (...args: unknown[]) => mockCreateWallet(...args),
  getWalletSummary: (...args: unknown[]) => mockGetWalletSummary(...args),
  getWallets: (...args: unknown[]) => mockGetWallets(...args),
  reconcileWalletBalance: (...args: unknown[]) =>
    mockReconcileWalletBalance(...args),
  unarchiveWallet: (...args: unknown[]) => mockUnarchiveWallet(...args),
  updateWallet: (...args: unknown[]) => mockUpdateWallet(...args),
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return (props: { name: string }) => (
    <ReactNative.Text>{props.name}</ReactNative.Text>
  );
});

describe('Wallet & Account Management Screen', () => {
  const sampleSummary = {
    operationalCashMinor: 10500000,
    totalNetWorthMinor: 35500000,
    trackingAssetsMinor: 25000000,
    wallets: [
      {
        accountNumber: '1234567890',
        accountType: 'bank',
        color: '#2563EB',
        createdAt: 0,
        currentBalanceMinor: 10000000,
        iconKey: 'bank',
        id: 1,
        includeInCashflow: true,
        initialBalanceMinor: 10000000,
        isArchived: false,
        isDefault: true,
        isFallback: false,
        name: 'Bank BCA',
        sortOrder: 1,
        systemKey: 'bank_transfer',
        updatedAt: 0,
      },
      {
        accountNumber: null,
        accountType: 'cash',
        color: '#10B981',
        createdAt: 0,
        currentBalanceMinor: 500000,
        iconKey: 'cash',
        id: 2,
        includeInCashflow: true,
        initialBalanceMinor: 500000,
        isArchived: false,
        isDefault: false,
        isFallback: false,
        name: 'Dompet Tunai',
        sortOrder: 2,
        systemKey: 'cash',
        updatedAt: 0,
      },
    ],
  };

  const sampleAllWallets = [
    ...sampleSummary.wallets,
    {
      accountNumber: null,
      accountType: 'ewallet',
      color: '#8B5CF6',
      createdAt: 0,
      currentBalanceMinor: 0,
      iconKey: 'cellphone',
      id: 3,
      includeInCashflow: true,
      initialBalanceMinor: 0,
      isArchived: true,
      isDefault: false,
      isFallback: false,
      name: 'OVO Lama',
      sortOrder: 3,
      systemKey: null,
      updatedAt: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWalletSummary.mockResolvedValue(sampleSummary);
    mockGetWallets.mockResolvedValue(sampleAllWallets);
  });

  function renderScreen(language: 'id' | 'en' = 'id') {
    return render(
      <ThemeProvider>
        <LanguageProvider initialLanguage={language}>
          <CurrencyProvider initialCurrency="IDR">
            <PaymentMethodManagementScreen />
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>,
    );
  }

  it('renders active wallets and Net Worth breakdown in Indonesian', async () => {
    await renderScreen('id');

    await waitFor(() =>
      expect(screen.getAllByText('Bank BCA').length).toBeGreaterThanOrEqual(1),
    );
    expect(screen.getAllByText('Dompet & Rekening').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Dompet Tunai')).toBeOnTheScreen();
    expect(screen.getByText('OVO Lama')).toBeOnTheScreen();
  });

  it('opens Add Wallet modal and creates a new wallet', async () => {
    mockCreateWallet.mockResolvedValue({ id: 4, name: 'Bibit Reksadana' });

    await renderScreen('id');

    await waitFor(() =>
      expect(screen.getAllByText('Bank BCA').length).toBeGreaterThanOrEqual(1),
    );

    const addBtn = screen.getByLabelText('Tambah Dompet Baru');
    await fireEvent.press(addBtn);

    await waitFor(() =>
      expect(
        screen.getAllByText('Tambah Dompet Baru').length,
      ).toBeGreaterThanOrEqual(1),
    );

    // Input Name
    const nameInput = screen.getByLabelText('Nama Dompet / Rekening *');
    await fireEvent.changeText(nameInput, 'Bibit Reksadana');

    // Select Investment Type
    const investmentChip = screen.getByText('Investasi');
    await fireEvent.press(investmentChip);

    // Save
    const saveBtn = screen.getByText('Simpan');
    await fireEvent.press(saveBtn);

    await waitFor(() =>
      expect(mockCreateWallet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          accountType: 'investment',
          name: 'Bibit Reksadana',
        }),
      ),
    );
  });

  it('opens Reconcile modal and saves balance adjustment', async () => {
    mockReconcileWalletBalance.mockResolvedValue({
      id: 99,
      type: 'income',
    });

    await renderScreen('id');

    await waitFor(() =>
      expect(screen.getAllByText('Bank BCA').length).toBeGreaterThanOrEqual(1),
    );

    const reconcileBtn = screen.getByLabelText('Rekonsiliasi saldo Bank BCA');
    await fireEvent.press(reconcileBtn);

    await waitFor(() =>
      expect(
        screen.getAllByText('Rekonsiliasi / Sesuaikan Saldo').length,
      ).toBeGreaterThanOrEqual(1),
    );

    // Change actual balance
    const actualInput = screen.getByLabelText('Saldo Riil Saat Ini *');
    await fireEvent.changeText(actualInput, '10500000');

    // Save Reconciliation
    const saveReconcileBtn = screen.getByText('Simpan Penyesuaian Saldo');
    await fireEvent.press(saveReconcileBtn);

    await waitFor(() =>
      expect(mockReconcileWalletBalance).toHaveBeenCalledWith(
        expect.anything(),
        1,
        10500000,
        'IDR',
        undefined,
      ),
    );
  });

  it('unarchives wallet when unarchive button is pressed', async () => {
    mockUnarchiveWallet.mockResolvedValue(undefined);

    await renderScreen('id');

    await waitFor(() =>
      expect(screen.getAllByText('OVO Lama').length).toBeGreaterThanOrEqual(1),
    );

    const unarchiveBtn = screen.getByText('Buka Arsip');
    await fireEvent.press(unarchiveBtn);

    await waitFor(() =>
      expect(mockUnarchiveWallet).toHaveBeenCalledWith(expect.anything(), 3),
    );
  });

  it('renders correctly without crashing when wallets have negative balances', async () => {
    mockGetWalletSummary.mockResolvedValue({
      operationalCashMinor: -250000,
      totalNetWorthMinor: -250000,
      trackingAssetsMinor: 0,
      wallets: [
        {
          accountNumber: null,
          accountType: 'cash',
          color: '#10B981',
          createdAt: 0,
          currentBalanceMinor: -250000,
          iconKey: 'cash',
          id: 10,
          includeInCashflow: true,
          initialBalanceMinor: 0,
          isArchived: false,
          isDefault: true,
          isFallback: false,
          name: 'Dompet Minus',
          sortOrder: 1,
          systemKey: 'cash',
          updatedAt: 0,
        },
      ],
    });
    mockGetWallets.mockResolvedValue([
      {
        accountNumber: null,
        accountType: 'cash',
        color: '#10B981',
        createdAt: 0,
        currentBalanceMinor: -250000,
        iconKey: 'cash',
        id: 10,
        includeInCashflow: true,
        initialBalanceMinor: 0,
        isArchived: false,
        isDefault: true,
        isFallback: false,
        name: 'Dompet Minus',
        sortOrder: 1,
        systemKey: 'cash',
        updatedAt: 0,
      },
    ]);

    await renderScreen('id');

    await waitFor(() => {
      expect(screen.getByText('Dompet Minus')).toBeOnTheScreen();
    });
  });
});
