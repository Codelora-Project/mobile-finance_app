import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  type SupportedCurrencyCode,
} from '@/features/settings/settings-repository';

type CurrencyContextValue = Readonly<{
  currencies: readonly SupportedCurrency[];
  currencyCode: SupportedCurrencyCode;
  currencyName: string;
  currencySymbol: string;
  setCurrency: (code: SupportedCurrencyCode) => Promise<void>;
}>;

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export type CurrencyProviderProps = {
  children: ReactNode;
  initialCurrency?: SupportedCurrencyCode;
  onCurrencyChange?: (currency: SupportedCurrencyCode) => void | Promise<void>;
};

export function CurrencyProvider({
  children,
  initialCurrency = 'IDR',
  onCurrencyChange,
}: CurrencyProviderProps) {
  const [currencyCode, setCurrencyCodeState] =
    useState<SupportedCurrencyCode>(initialCurrency);
  const [prevInitial, setPrevInitial] =
    useState<SupportedCurrencyCode>(initialCurrency);

  if (initialCurrency !== prevInitial) {
    setPrevInitial(initialCurrency);
    setCurrencyCodeState(initialCurrency);
  }

  const setCurrency = useCallback(
    async (nextCode: SupportedCurrencyCode) => {
      if (nextCode === currencyCode) return;
      await onCurrencyChange?.(nextCode);
      setCurrencyCodeState(nextCode);
    },
    [currencyCode, onCurrencyChange],
  );

  const matched = useMemo(() => {
    return (
      SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) ??
      SUPPORTED_CURRENCIES[0]!
    );
  }, [currencyCode]);

  const value: CurrencyContextValue = useMemo(
    () => ({
      currencies: SUPPORTED_CURRENCIES,
      currencyCode,
      currencyName: matched.name,
      currencySymbol: matched.symbol,
      setCurrency,
    }),
    [currencyCode, matched, setCurrency],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    return {
      currencies: SUPPORTED_CURRENCIES,
      currencyCode: 'IDR',
      currencyName: 'Indonesian Rupiah',
      currencySymbol: 'Rp',
      setCurrency: async () => {},
    };
  }
  return context;
}
